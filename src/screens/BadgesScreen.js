import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getBadges } from '../lib/api';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

export default function BadgesScreen() {
  const navigation = useNavigation();
  const { user }   = useAuth();
  const [data, setData]          = useState(null);
  const [loading, setLoading]    = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [selected, setSelected]  = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const d = await getBadges(user.id);
      setData(d);
    } catch (e) {
      console.error('Failed to load badges:', e);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefresh(true); load(); };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />
      </SafeAreaView>
    );
  }
  if (!data) return null;

  const { badges, stats } = data;
  const pct = stats.total_badges > 0
    ? (stats.total_earned / stats.total_badges) * 100
    : 0;

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header with back button */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Badges</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
          />
        }
      >

        {/* Hero — Title, count, progress bar, streak chip */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>Your Journey</Text>
          <Text style={s.heroCount}>
            <Text style={s.heroCountNum}>{stats.total_earned}</Text>
            <Text style={s.heroCountTotal}> of {stats.total_badges} badges earned</Text>
          </Text>

          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${pct}%` }]} />
          </View>

          {/* Daily streak chip */}
          <View style={s.streakChip}>
            <Text style={s.streakFlame}>🔥</Text>
            <View>
              <Text style={s.streakValue}>
                {stats.current_daily_streak} day{stats.current_daily_streak === 1 ? '' : 's'} in a row
              </Text>
              {stats.longest_daily_streak > 0 && (
                <Text style={s.streakBest}>
                  Best: {stats.longest_daily_streak} day{stats.longest_daily_streak === 1 ? '' : 's'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* This-month activity */}
        <View style={s.monthCard}>
          <View style={s.monthItem}>
            <Text style={s.monthValue}>{stats.sent_this_month}</Text>
            <Text style={s.monthLabel}>Encouragements{'\n'}sent this month</Text>
          </View>
          <View style={s.monthDivider} />
          <View style={s.monthItem}>
            <Text style={s.monthValue}>{stats.received_this_month}</Text>
            <Text style={s.monthLabel}>Encouragements{'\n'}received this month</Text>
          </View>
        </View>

        {/* Badge grid */}
        <View style={s.grid}>
          {badges.map(b => (
            <BadgeCard key={b.key} badge={b} onPress={() => setSelected(b)} />
          ))}
        </View>
      </ScrollView>

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={s.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        >
          {selected && <BadgeDetail badge={selected} />}
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function BadgeCard({ badge, onPress }) {
  const earned = badge.earned;
  const sub    = badge.progress || badge.streak;
  const pct    = sub ? (sub.current / sub.target) * 100 : 0;

  let suffix = '';
  if (badge.is_streak)            suffix = ' mo';
  else if (badge.is_daily_streak) suffix = ' d';

  return (
    <TouchableOpacity
      style={[s.card, !earned && s.cardLocked]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[s.emoji, !earned && s.emojiLocked]}>{badge.emoji}</Text>
      <Text style={[s.name, !earned && s.nameLocked]} numberOfLines={1}>
        {badge.name}
      </Text>

      {sub && !earned && (
        <View style={s.cardProgressWrap}>
          <View style={s.cardProgressBar}>
            <View style={[s.cardProgressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={s.cardProgressText}>
            {sub.raw_current}/{sub.target}{suffix}
          </Text>
        </View>
      )}

      {earned && badge.is_monthly && (
        <Text style={s.earnedTag}>
          {badge.earned_this_month ? '✨ This month' : `${badge.earned_count}× earned`}
        </Text>
      )}

      {earned && !badge.is_monthly && (
        <Text style={s.earnedTag}>✓ Earned</Text>
      )}
    </TouchableOpacity>
  );
}

function BadgeDetail({ badge }) {
  return (
    <TouchableOpacity activeOpacity={1} style={s.detailCard}>
      <Text style={s.detailEmoji}>{badge.emoji}</Text>
      <Text style={s.detailName}>{badge.name}</Text>
      <Text style={s.detailDesc}>{badge.description}</Text>

      {badge.is_monthly && badge.progress && (
        <View style={s.detailMeta}>
          <Text style={s.detailMetaText}>
            This month: {badge.progress.raw_current}/{badge.progress.target}
          </Text>
          {badge.earned_count > 0 && (
            <Text style={s.detailMetaText}>
              Earned {badge.earned_count} time{badge.earned_count !== 1 ? 's' : ''} total
            </Text>
          )}
        </View>
      )}

      {badge.is_streak && badge.streak && (
        <View style={s.detailMeta}>
          <Text style={s.detailMetaText}>
            🔥 {badge.streak.raw_current} month{badge.streak.raw_current !== 1 ? 's' : ''} running
          </Text>
          <Text style={s.detailMetaText}>
            Need {badge.streak.target} consecutive
          </Text>
        </View>
      )}

      {badge.is_daily_streak && badge.progress && (
        <View style={s.detailMeta}>
          <Text style={s.detailMetaText}>
            🔥 {badge.progress.raw_current} day{badge.progress.raw_current !== 1 ? 's' : ''} in a row
          </Text>
          <Text style={s.detailMetaText}>
            Goal: {badge.progress.target} consecutive days
          </Text>
        </View>
      )}

      {badge.earned_at && (
        <Text style={s.detailEarned}>
          First earned {new Date(badge.earned_at).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { minWidth: 70, paddingVertical: spacing.xs },
  backText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.gold,
  },
  headerTitle: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },

  scroll: { paddingBottom: spacing.xxl },

  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: type.displayFont,
    fontSize: 30,
    color: colors.inkDark,
    marginBottom: spacing.xs,
  },
  heroCount: { marginBottom: spacing.md },
  heroCountNum: {
    fontFamily: fonts.uiBold,
    fontSize: 18,
    color: colors.gold,
  },
  heroCountTotal: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkLight,
  },
  progressTrack: {
    width: '100%',
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 6,
  },

  streakChip: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    ...shadow.card,
  },
  streakFlame: { fontSize: 24, marginRight: spacing.sm },
  streakValue: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  streakBest: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 1,
  },

  monthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    ...shadow.card,
  },
  monthItem: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  monthValue: {
    fontFamily: fonts.uiBold,
    fontSize: 22,
    color: colors.gold,
  },
  monthLabel: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  monthDivider: { width: 1, height: 36, backgroundColor: colors.border },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },

  card: {
    width: '31%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
    minHeight: 105,
    borderWidth: 1,
    borderColor: colors.gold,
    ...shadow.card,
  },
  cardLocked: { borderColor: colors.border, opacity: 0.55 },
  emoji: { fontSize: 30, marginBottom: 4 },
  emojiLocked: { opacity: 0.35 },
  name: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: colors.inkDark,
    textAlign: 'center',
    marginBottom: 2,
  },
  nameLocked: { color: colors.inkLight },

  cardProgressWrap: { width: '100%', marginTop: 4 },
  cardProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  cardProgressFill: { height: '100%', backgroundColor: colors.gold },
  cardProgressText: {
    fontFamily: fonts.caption,
    fontSize: 9,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: 2,
  },
  earnedTag: {
    fontFamily: fonts.uiBold,
    fontSize: 9,
    color: colors.gold,
    marginTop: 4,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  detailCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '90%',
    ...shadow.gold,
  },
  detailEmoji: { fontSize: 64, marginBottom: spacing.sm },
  detailName: {
    fontFamily: type.displayFont,
    fontSize: 22,
    color: colors.inkDark,
    marginBottom: spacing.sm,
  },
  detailDesc: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkMid,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: type.uiSize * 1.5,
  },
  detailMeta: { marginVertical: spacing.sm, alignItems: 'center' },
  detailMetaText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginVertical: 2,
  },
  detailEarned: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
