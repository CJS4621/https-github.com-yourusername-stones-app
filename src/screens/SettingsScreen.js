import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Switch, Alert, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

export default function SettingsScreen({ navigation }) {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  async function checkNotificationStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  }

  async function handleNotificationToggle(value) {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotificationsEnabled(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications for Stones in your iPhone Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } else {
      Alert.alert(
        'Disable Notifications',
        'To disable notifications go to iPhone Settings → Stones → Notifications.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
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

  async function handleDonate() {
    Linking.openURL('https://buy.stripe.com/your-stripe-link');
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
          <SettingRow
            icon="💝"
            label="Donate to Stones"
            onPress={handleDonate}
          />
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
});