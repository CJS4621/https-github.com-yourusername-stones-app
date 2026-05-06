import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, Alert, Linking, AppState,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { createCustomDonation } from '../lib/api';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

const DONATION_LINKS = {
  5:   'https://buy.stripe.com/00w28jeSqctf0fa0ho9IQ01',
  10:  'https://buy.stripe.com/aFa3cnh0y8cZ6Dy0ho9IQ00',
  25:  'https://buy.stripe.com/fZu3cn6lU50Nge8fci9IQ02',
  other: 'https://buy.stripe.com/fZu3cn6lU50Nge8fci9IQ02',
};

export default function SettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCustomDonate, setShowCustomDonate] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [donating, setDonating] = useState(false);

  async function handleCustomDonate() {
    const amount = parseFloat(customAmount);
    if (!amount || amount < 1) {
      Alert.alert('Invalid Amount', 'Please enter an amount of at least $1.');
      return;
    }
    setDonating(true);
    try {
      const result = await createCustomDonation(amount);
      if (result.url) {
        setShowCustomDonate(false);
        setCustomAmount('');
        Linking.openURL(result.url);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not create donation. Please try again.');
    } finally {
      setDonating(false);
    }
  }

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        console.log('App came to foreground - checking notifications');
        checkNotificationStatus();
      }
    });
    return () => subscription.remove();
  }, []);

  async function checkNotificationStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  }

  async function handleNotificationToggle(value) {
    if (value) {
      // User wants to enable — request permission directly
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
      if (status === 'denied') {
        Alert.alert(
          'Enable Notifications',
          'Notifications were previously denied. Please enable them in iPhone Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } else {
      // iOS doesn't allow apps to revoke — go straight to Settings
      Linking.openSettings();
    }
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
          }
        }
      ]
    );
  }

  function handleDonate(amount) {
    Linking.openURL(DONATION_LINKS[amount]);
  }

  function SettingRow({ icon, label, onPress, value, isSwitch, isDestructive, chevron = true }) {
    return (
      <TouchableOpacity
        style={s.row}
        onPress={onPress}
        disabled={isSwitch}
        activeOpacity={isSwitch ? 1 : 0.7}
      >
        <Text style={s.rowIcon}>{icon}</Text>
        <Text style={[s.rowLabel, isDestructive && { color: '#E53E3E' }]}>{label}</Text>
        {isSwitch && (
          <Switch
            value={value}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: colors.border, true: colors.gold }}
            thumbColor="#FFF"
          />
        )}
        {!isSwitch && chevron && (
          <Text style={s.chevron}>›</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Custom Donation Modal */}
      <Modal visible={showCustomDonate} animationType="slide" transparent onRequestClose={() => setShowCustomDonate(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalIcon}>💝</Text>
              <Text style={s.modalTitle}>Choose Your Amount</Text>
              <Text style={s.modalSubtitle}>Thus far the Lord has helped us. Thank you for supporting Stones! 🪨</Text>

              <View style={s.amountWrapper}>
                <Text style={s.dollarSign}>$</Text>
                <TextInput
                  style={s.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={colors.inkLight}
                  value={customAmount}
                  onChangeText={setCustomAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={s.cadLabel}>CAD</Text>
              </View>

              <TouchableOpacity
                style={[s.modalDonateBtn, donating && { opacity: 0.6 }]}
                onPress={handleCustomDonate}
                disabled={donating}
              >
                {donating
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={s.modalDonateBtnText}>💳 Donate ${customAmount || '0'} CAD</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowCustomDonate(false)}>
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Notifications */}
        <Text style={s.sectionLabel}>Notifications</Text>
        <View style={s.section}>
          <SettingRow
            icon="🔔"
            label="Push Notifications"
            isSwitch
            value={notificationsEnabled}
          />
        </View>

        {/* Support */}
        <Text style={s.sectionLabel}>Support the Ministry</Text>
        <View style={s.section}>
          <View style={s.donateContainer}>
            <Text style={s.donateText}>
              Thus far the Lord has helped us. Help keep Stones running! 🪨
            </Text>
            <View style={s.donateGrid}>
              <TouchableOpacity style={s.donateBtn} onPress={() => handleDonate(5)}>
                <Text style={s.donateBtnText}>☕ $5</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.donateBtn} onPress={() => handleDonate(10)}>
                <Text style={s.donateBtnText}>🪨 $10</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.donateBtn} onPress={() => handleDonate(25)}>
                <Text style={s.donateBtnText}>🙏 $25</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.donateBtn} onPress={() => setShowCustomDonate(true)}>
                <Text style={s.donateBtnText}>💝 Other</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* About */}
        <Text style={s.sectionLabel}>About</Text>
        <View style={s.section}>
          <SettingRow
            icon="📖"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://stonesapp.ca/privacy-policy.html')}
          />
          <SettingRow
            icon="📋"
            label="How To Use"
            onPress={() => navigation.navigate('HowTo')}
          />
          <SettingRow
            icon="ℹ️"
            label="Version 1.0.1"
            chevron={false}
            onPress={() => {}}
          />
        </View>

        {/* Account */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.section}>
          <SettingRow
            icon="🚪"
            label="Sign Out"
            onPress={handleSignOut}
            isDestructive
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.gold,
    width: 60,
  },
  title: {
    fontFamily: type.displayFont,
    fontSize: 22,
    color: colors.inkDark,
  },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  sectionLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    marginLeft: spacing.xs,
  },
  section: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 28,
    textAlign: 'center',
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  chevron: {
    fontFamily: fonts.uiBold,
    fontSize: 20,
    color: colors.inkLight,
  },
  donateContainer: {
    padding: spacing.md,
  },
  donateText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkLight,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  donateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  donateBtn: {
    width: '48%',
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  donateBtnText: {
    color: '#fff',
    fontFamily: fonts.uiBold,
    fontSize: 13,
  },
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
  modalIcon: { fontSize: 48, marginBottom: spacing.sm },
  modalTitle: {
    fontFamily: type.displayFont,
    fontSize: 22,
    color: colors.inkDark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 13,
    color: colors.inkLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  amountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
  },
  dollarSign: {
    fontFamily: fonts.uiBold,
    fontSize: 28,
    color: colors.gold,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: 28,
    color: colors.inkDark,
    paddingVertical: 4,
  },
  cadLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.inkLight,
    marginLeft: 4,
  },
  modalDonateBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
    ...shadow.gold,
  },
  modalDonateBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  modalCancelBtn: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalCancelText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkLight,
  },
});
