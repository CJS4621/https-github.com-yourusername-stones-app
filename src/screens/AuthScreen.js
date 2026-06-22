import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Modal, Linking
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import ProfileSetupScreen from './ProfileSetupScreen';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

export default function AuthScreen() {
  const [mode, setMode]               = useState('signin');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [name, setName]               = useState('');
  const [loading, setLoading]         = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeSource, setWelcomeSource] = useState('email');  // 'email' or 'apple'
  const [resetSent, setResetSent]     = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Profile Setup modal — shown after Apple sign-in when name is missing
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [setupUser, setSetupUser] = useState(null);

  // Check if Sign in with Apple is available on this device.
  // Returns true on iOS 13+ devices and current Apple ID configured.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  async function handleAppleSignIn() {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Apple returns identityToken (JWT). We hand this to Supabase.
      if (!credential.identityToken) {
        throw new Error('Apple sign-in did not return an identity token.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      if (!data?.user?.id) throw new Error('Sign-in succeeded but no user ID returned.');

      const userId = data.user.id;

      // Apple returns fullName ONLY on the very first sign-in per Apple ID per app.
      // Subsequent sign-ins (or sign-ins after a "Stop using Apple ID" reset) won't.
      const givenName = credential.fullName?.givenName?.trim() || '';
      const familyName = credential.fullName?.familyName?.trim() || '';
      const appleProvidedName = !!(givenName || familyName);

      // Check what's already in the users table for this Supabase user.
      // Could be a brand new row (Apple signup) OR existing row (email user linking).
      let existingProfile = null;
      try {
        const { data: existing } = await supabase
          .from('users')
          .select('first_name, last_name, display_name, display_format')
          .eq('id', userId)
          .single();
        existingProfile = existing;
      } catch (_) {
        // No row yet — Supabase trigger creates it shortly; we'll write to it below
      }

      // CASE 1 — Apple gave us a name AND no first_name exists yet → save it.
      if (appleProvidedName && !existingProfile?.first_name) {
        try {
          // Default to 'first_initial' for privacy-by-default
          await supabase
            .from('users')
            .update({
              first_name: givenName || null,
              last_name: familyName || null,
              display_format: 'first_initial',
              display_name: familyName
                ? `${givenName} ${familyName.charAt(0).toUpperCase()}.`
                : givenName,
            })
            .eq('id', userId);
        } catch (_) {
          // Non-fatal — Profile Settings will let user re-enter later
        }
        // Show Welcome modal (first-time Apple signups get the same brand intro as email signups)
        setWelcomeSource('apple');
        setShowWelcome(true);
        return;
      }

      // CASE 2 — Apple did NOT give us a name AND no first_name exists in DB → force Setup
      if (!appleProvidedName && !existingProfile?.first_name) {
        setSetupUser(data.user);
        setShowProfileSetup(true);
        return;
      }

      // CASE 3 — Existing user (has first_name OR display_name from email signup)
      // → just sign in, no modal, AuthContext routes to Wall naturally
      // No action needed here.
    } catch (err) {
      // User cancelled the Apple sheet — silent, not an error
      if (err.code === 'ERR_REQUEST_CANCELED') return;

      Alert.alert('Sign in with Apple Error', err.message || 'Could not complete sign-in.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address above first.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://stonesapp.ca/reset-password.html',
      });
      if (error) throw error;
      setResetSent(true);
      Alert.alert(
        'Password Reset Sent 📧',
        `We sent a password reset link to ${email}. Check your inbox!`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && !agreedToTerms) {
      Alert.alert('Agreement Required', 'Please agree to the Terms of Use and Privacy Policy to continue.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name || email.split('@')[0] },
            emailRedirectTo: 'https://stonesapp.ca/email-confirmed.html',
          }
        });
        if (error) throw error;
        setWelcomeSource('email');
        setShowWelcome(true);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            Alert.alert(
              'Credentials Not Recognised',
              "We don't recognize those credentials.\n\nNew to Stones? Tap \"Don't have an account? Sign up\" below to join our faith community!\n\nForgotten your password? Tap \"Forgot Password?\" below.",
              [{ text: 'OK' }]
            );
            return;
          }
          throw error;
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleWelcomeDone() {
    setShowWelcome(false);

    // Apple signups are already authenticated — just dismiss and let auth listener route them
    if (welcomeSource === 'apple') {
      return;
    }

    // Email signups need to confirm via emailed link before they can sign in
    setMode('signin');
    Alert.alert(
      'Check your email! 📧',
      'We sent a confirmation link to ' + email + '. Please tap it to activate your account, then come back and sign in.',
      [{ text: 'OK' }]
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* Profile Setup Modal — required when Apple sign-in did not return a name */}
      <Modal
        visible={showProfileSetup}
        animationType="slide"
        // No transparent backdrop — ProfileSetupScreen takes the full screen
        // No onRequestClose — this is a REQUIRED setup, user must complete it
      >
        {setupUser && (
          <ProfileSetupScreen
            user={setupUser}
            mode="setup"
            onComplete={() => {
              setShowProfileSetup(false);
              setSetupUser(null);
              // Show the brand Welcome modal next, mirroring the Apple-with-name path
              setWelcomeSource('apple');
              setShowWelcome(true);
            }}
          />
        )}
      </Modal>

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

            {mode === 'signup' && (
              <TouchableOpacity
                style={s.termsRow}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, agreedToTerms && s.checkboxChecked]}>
                  {agreedToTerms && <Text style={s.checkboxMark}>✓</Text>}
                </View>
                <Text style={s.termsText}>
                  I agree to the{' '}
                  <Text
                    style={s.termsLink}
                    onPress={() => Linking.openURL('https://stonesapp.ca/terms.html')}
                  >
                    Terms of Use
                  </Text>
                  {' '}and{' '}
                  <Text
                    style={s.termsLink}
                    onPress={() => Linking.openURL('https://stonesapp.ca/privacy-policy.html')}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[s.btn, mode === 'signup' && !agreedToTerms && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading || (mode === 'signup' && !agreedToTerms)}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.btnText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setAgreedToTerms(false);
            }}>
              <Text style={s.toggle}>
                {mode === 'signin'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'
                }
              </Text>
            </TouchableOpacity>

            {mode === 'signin' && (
              <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                <Text style={s.forgotPassword}>Forgot your password?</Text>
              </TouchableOpacity>
            )}

            {/* Apple Sign-In — iOS only, only when device supports it */}
            {appleAvailable && (
              <View style={s.appleSection}>
                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>or</Text>
                  <View style={s.dividerLine} />
                </View>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={radius.full}
                  style={s.appleButton}
                  onPress={handleAppleSignIn}
                />
              </View>
            )}
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
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: 'transparent',
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.gold,
  },
  checkboxMark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: type.captionSize,
    color: colors.inkMid,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.gold,
    fontFamily: fonts.uiBold,
    textDecorationLine: 'underline',
  },
  toggle: {
    fontFamily: fonts.ui,
    fontSize: type.captionSize,
    color: colors.gold,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  forgotPassword: {
    fontFamily: fonts.ui,
    fontSize: type.captionSize,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing.sm,
    textDecorationLine: 'underline',
  },
  appleSection: {
    width: '100%',
    marginTop: spacing.lg,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.ui,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginHorizontal: spacing.md,
  },
  appleButton: {
    width: '100%',
    height: 52,
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