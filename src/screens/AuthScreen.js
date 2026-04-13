import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signIn, signUp } from '../lib/supabase';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

export default function AuthScreen() {
  const [mode, setMode]               = useState('signin');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [name, setName]               = useState('');
  const [loading, setLoading]         = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password, name || email.split('@')[0]);
        setShowWelcome(true);
        return;
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleWelcomeDone() {
    setShowWelcome(false);
    setMode('signin');
    Alert.alert(
      'Check your email',
      'We sent a confirmation link to ' + email + '. Please click it to activate your account, then sign in.',
      [{ text: 'OK' }]
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* Welcome Modal */}
      <Modal
        visible={showWelcome}
        animationType="slide"
        transparent
        onRequestClose={handleWelcomeDone}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalLogo}>🪨</Text>
            <Text style={s.modalTitle}>Welcome to Stones!</Text>
            <Text style={s.modalVerse}>
              "Thus far the Lord has helped us."
            </Text>
            <Text style={s.modalVerseRef}>— 1 Samuel 7:12</Text>

            <View style={s.modalDivider} />

            <Text style={s.modalBody}>
              Stones is a place to remember and share God's faithfulness.
            </Text>
            <Text style={s.modalBody}>
              Every time you experience His goodness — drop a stone. An answered prayer, a moment of peace, a door He opened — mark it here so you never forget.
            </Text>
            <Text style={s.modalBody}>
              As your stones grow, so does your testimony. And as others see your stones, their faith grows too.
            </Text>

            <View style={s.modalDivider} />

            <Text style={s.modalCta}>
              Drop your first stone and encourage someone today. 🪨
            </Text>

            <TouchableOpacity style={s.modalBtn} onPress={handleWelcomeDone}>
              <Text style={s.modalBtnText}>Let's Go!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.brand}>
            <Text style={s.logo}>🪨</Text>
            <Text style={s.title}>Stones</Text>
            <Text style={s.tagline}>
              "Then Samuel took a <Text style={s.bold}>stone</Text> and set it up between Mizpah and Shen. He named it Ebenezer, saying, 'Thus far the Lord has helped us.'"
            </Text>
            <Text style={s.reference}>— 1 Samuel 7:12 ESV</Text>
          </View>

          <View style={s.form}>
            {mode === 'signup' && (
              <TextInput
                style={s.input}
                placeholder="Your name"
                placeholderTextColor={colors.inkLight}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            )}
            <TextInput
              style={s.input}
              placeholder="Email address"
              placeholderTextColor={colors.inkLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={s.input}
              placeholder="Password"
              placeholderTextColor={colors.inkLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.btnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              <Text style={s.toggle}>
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'
                }
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={s.footer}>A place to remember God's faithfulness</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: type.displayFont,
    fontSize: 42,
    color: colors.inkDark,
    marginBottom: spacing.md,
  },
  tagline: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.uiSize,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: type.uiSize * 1.7,
    marginBottom: 4,
  },
  bold: {
    fontFamily: fonts.uiBold,
    fontStyle: 'normal',
    color: colors.inkDark,
  },
  reference: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.gold,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  form: {
    width: '100%',
  },
  input: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  btn: {
    width: '100%',
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.gold,
  },
  btnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  toggle: {
    fontFamily: fonts.ui,
    fontSize: type.captionSize,
    color: colors.gold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    ...shadow.gold,
  },
  modalLogo: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: type.displayFont,
    fontSize: 28,
    color: colors.inkDark,
    marginBottom: spacing.sm,
  },
  modalVerse: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.uiSize,
    color: colors.inkMid,
    textAlign: 'center',
  },
  modalVerseRef: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.gold,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  modalBody: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: type.uiSize * 1.7,
    marginBottom: spacing.sm,
  },
  modalCta: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    ...shadow.gold,
  },
  modalBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
});