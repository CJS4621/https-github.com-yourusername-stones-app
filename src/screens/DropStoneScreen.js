import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { dropStone } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius, shadow, CATEGORY_LABELS } from '../theme';

const CHAR_LIMIT = 500;

export default function DropStoneScreen({ navigation }) {
  const { user } = useAuth();
  const [text, setText]         = useState('');
  const [category, setCategory] = useState('faith');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [saving, setSaving]     = useState(false);

  const remaining = CHAR_LIMIT - text.length;

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to add a photo to your stone.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled) {
      setPhotoUrl(result.assets[0].uri);
    }
  }

  async function handleDrop() {
    if (!text.trim()) {
      Alert.alert('Empty stone', 'Write something before dropping your stone.');
      return;
    }
    setSaving(true);
    try {
      await dropStone({
        user_id:   user.id,
        text:      text.trim(),
        category,
        photo_url: null,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not drop stone. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Drop a Stone</Text>
          <TouchableOpacity
            style={[styles.dropBtn, (!text.trim() || saving) && styles.dropBtnDisabled]}
            onPress={handleDrop}
            disabled={!text.trim() || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.dropBtnText}>Drop 🪨</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {/* Prompt */}
          <Text style={styles.prompt}>
            "Thus far the Lord has helped us." — 1 Sam 7:12
          </Text>

          {/* Text input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Where did you see God move today..."
              placeholderTextColor={colors.inkLight}
              multiline
              maxLength={CHAR_LIMIT}
              value={text}
              onChangeText={setText}
              autoFocus
            />
            <Text style={[styles.charCount, remaining < 50 && styles.charCountWarn]}>
              {remaining}
            </Text>
          </View>

          {/* Category selector */}
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.categoryChip,
                  category === key && { backgroundColor: colors[key] || colors.gold, borderColor: 'transparent' }
                ]}
                onPress={() => setCategory(key)}
              >
                <Text style={[
                  styles.categoryChipText,
                  category === key && { color: '#FFF' }
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photo — coming soon */}
          <Text style={styles.sectionLabel}>Photo (optional)</Text>
          <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
            <Text style={styles.photoBtnText}>
              {photoUrl ? '✓ Photo selected — tap to change' : '+ Add a photo'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.inkMid,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.inkDark,
  },
  dropBtn: {
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 72,
    alignItems: 'center',
    ...shadow.gold,
  },
  dropBtnDisabled: { opacity: 0.4 },
  dropBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#FFF',
  },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  prompt: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.inkLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  inputWrapper: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 140,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkDark,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.inkLight,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  charCountWarn: { color: colors.error },
  sectionLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: colors.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  categoryChipText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkMid,
  },
  photoBtn: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  photoBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.gold,
  },
});