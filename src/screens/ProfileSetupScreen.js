import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { previewAllFormats, formatDisplayName } from '../lib/displayName';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

/**
 * ProfileSetupScreen
 *
 * Required after Apple sign-in when Apple didn't return fullName
 * (Hide My Email + relay handle scenario, or returning Apple user
 * whose first-time name was previously consumed).
 *
 * Also reachable from Profile settings as an OPTIONAL edit.
 *
 * Saves first_name, last_name, display_format to the users table
 * and syncs the computed display_name for backward compatibility.
 *
 * Props:
 *   user — Supabase user (auth.user) — must include id
 *   onComplete — callback fired after save succeeds, optional
 *   onCancel — callback fired when user taps X to back out (edit mode only); optional
 *   mode — 'setup' (default, required) or 'edit' (from Profile)
 *   existingData — { first_name, last_name, display_format } pre-fill values for edit mode
 */
export default function ProfileSetupScreen({ user, onComplete, onCancel, mode = 'setup', existingData = {} }) {
  const [firstName, setFirstName] = useState(existingData.first_name || '');
  const [lastName, setLastName]   = useState(existingData.last_name || '');
  const [format, setFormat]       = useState(existingData.display_format || 'first_initial');
  const [saving, setSaving]       = useState(false);

  // Live preview of all 3 formats based on current name input
  const previews = previewAllFormats({ first_name: firstName, last_name: lastName });

  async function handleSave() {
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst) {
      Alert.alert('First name required', 'Please enter at least a first name.');
      return;
    }

    setSaving(true);
    try {
      // Compute the display_name to sync to the legacy field
      const userObj = {
        first_name: trimmedFirst,
        last_name: trimmedLast || null,
        display_format: format,
      };
      const computedDisplayName = formatDisplayName(userObj);

      const { error } = await supabase
        .from('users')
        .update({
          first_name: trimmedFirst,
          last_name: trimmedLast || null,
          display_format: format,
          display_name: computedDisplayName,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Success — fire the callback so parent can route forward
      onComplete?.();
    } catch (err) {
      Alert.alert('Could not save', err.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      {/* Close (X) — only in edit mode; setup mode requires completion */}
      {mode === 'edit' && (
        <TouchableOpacity
          style={s.closeBtn}
          onPress={() => onCancel?.()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={s.closeBtnText}>✕</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.brand}>
            <Text style={s.logo}>🪨</Text>
            <Text style={s.title}>
              {mode === 'edit' ? 'Edit your name' : "Let's set up your name"}
            </Text>
            <Text style={s.subtitle}>
              {mode === 'edit'
                ? 'Choose how others will see you on the Wall.'
                : 'Stones is a place to share testimony. Choose how others will see you.'}
            </Text>
          </View>

          <View style={s.form}>
            <Text style={s.fieldLabel}>First name</Text>
            <TextInput
              style={s.input}
              placeholder="Your first name"
              placeholderTextColor={colors.inkLight}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
            />

            <Text style={s.fieldLabel}>Last name <Text style={s.optional}>(optional)</Text></Text>
            <TextInput
              style={s.input}
              placeholder="Your last name"
              placeholderTextColor={colors.inkLight}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
            />

            <Text style={s.sectionLabel}>How others will see you:</Text>

            <PrivacyOption
              selected={format === 'full'}
              onPress={() => setFormat('full')}
              preview={previews.full}
              label="Full name"
              hint="Most personal"
            />
            <PrivacyOption
              selected={format === 'first_initial'}
              onPress={() => setFormat('first_initial')}
              preview={previews.first_initial}
              label="First name + initial"
              hint="More private"
            />
            <PrivacyOption
              selected={format === 'first_only'}
              onPress={() => setFormat('first_only')}
              preview={previews.first_only}
              label="First name only"
              hint="Most private"
            />

            <TouchableOpacity
              style={[s.btn, (!firstName.trim() || saving) && s.btnDisabled]}
              onPress={handleSave}
              disabled={!firstName.trim() || saving}
            >
              {saving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.btnText}>{mode === 'edit' ? 'Save Changes' : 'Continue'}</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={s.footer}>"Thus far the Lord has helped us." — 1 Samuel 7:12</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Privacy preset option row.
 * Shows the live-computed preview of the user's name in that format.
 */
function PrivacyOption({ selected, onPress, preview, label, hint }) {
  return (
    <TouchableOpacity onPress={onPress} style={[s.option, selected && s.optionSelected]} activeOpacity={0.7}>
      <View style={s.radioOuter}>
        {selected && <View style={s.radioInner} />}
      </View>
      <View style={s.optionContent}>
        <Text style={s.optionPreview}>{preview}</Text>
        <Text style={s.optionLabel}>{label} · <Text style={s.optionHint}>{hint}</Text></Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md + 40,  // below safe area top
    left: spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.inkMid,
    fontFamily: fonts.uiBold,
    lineHeight: 20,
  },
  inner: {
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: type.displayFont,
    fontSize: 28,
    color: colors.inkDark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: type.uiSize * 1.6,
    paddingHorizontal: spacing.md,
  },
  form: {
    width: '100%',
  },
  fieldLabel: {
    fontFamily: fonts.uiBold,
    fontSize: type.captionSize,
    color: colors.inkMid,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  optional: {
    fontFamily: fonts.ui,
    color: colors.inkLight,
    fontWeight: 'normal',
  },
  input: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkDark,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  sectionLabel: {
    fontFamily: fonts.uiBold,
    fontSize: type.captionSize,
    color: colors.inkMid,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.gold,
    backgroundColor: '#FFFEF7',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gold,
  },
  optionContent: {
    flex: 1,
  },
  optionPreview: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginBottom: 2,
  },
  optionLabel: {
    fontFamily: fonts.ui,
    fontSize: type.captionSize,
    color: colors.inkMid,
  },
  optionHint: {
    color: colors.inkLight,
    fontStyle: 'italic',
  },
  btn: {
    width: '100%',
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    ...shadow.gold,
  },
  btnDisabled: {
    backgroundColor: colors.inkLight,
    opacity: 0.6,
  },
  btnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  footer: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});