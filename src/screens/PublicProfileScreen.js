import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Image, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile, getFollowCounts, getJourney, followUser, unfollowUser } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

const ALL_BADGES = [
  { key: 'first_stone',      emoji: '🪨', name: 'First Stone' },
  { key: 'altar_of_fire',    emoji: '🔥', name: 'Altar of Fire' },
  { key: 'intercessor',      emoji: '🙏', name: 'Intercessor' },
  { key: 'ebenezer',         emoji: '✨', name: 'Ebenezer' },
  { key: 'faithful_witness', emoji: '📅', name: 'Faithful Witness' },
  { key: 'answered_prayer',  emoji: '🕊️', name: 'Answered Prayer' },
  { key: 'community_pillar', emoji: '👥', name: 'Community Pillar' },
];

async function getUserBadges(userId) {
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_key')
    .eq('user_id', userId);
  if (error) throw error;
  return data?.map(b => b.badge_key) || [];
}

async function isFollowing(followerId, followingId) {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .single();
  return !!data;
}

export default function PublicProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user } = useAuth();
  const [profile, setProfile]       = useState(null);
  const [counts, setCounts]         = useState({ followers: 0, following: 0 });
  const [stones, setStones]         = useState([]);
  const [badges, setBadges]         = useState([]);
  const [following, setFollowing]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    async function load() {
      try {
        const [p, c, s, b, f] = await Promise.all([
          getProfile(userId),
          getFollowCounts(userId),
          getJourney(userId),
          getUserBadges(userId),
          isOwnProfile ? Promise.resolve(false) : isFollowing(user.id, userId),
        ]);
        setProfile(p);
        setCounts(c);
        setStones(s);
        setBadges(b);
        setFollowing(f);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  async function handleFollowToggle() {
    setFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(user.id, userId);
        setFollowing(false);
        setCounts(c => ({ ...c, followers: c.followers - 1 }));
      } else {
        await followUser(user.id, userId);
        setFollowing(true);
        setCounts(c => ({ ...c, followers: c.followers + 1 }));
      }
    } catch (err) {
      console.log('Follow error:', err);
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const earnedBadges = ALL_BADGES.filter(b => badges.includes(b.key));

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <View style={s.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Hero */}
        <View style={s.hero}>
          {profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} />
            : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(profile?.display_name || '?')[0].toUpperCase()}</Text>
              </View>
            )
          }
          <Text style={s.name}>{profile?.display_name}</Text>
          {memberSince ? <Text style={s.since}>Member since {memberSince}</Text> : null}
          {profile?.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}

          {/* Follow button */}
          {!isOwnProfile && (
            <TouchableOpacity
              style={[s.followBtn, following && s.followingBtn]}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading
                ? <ActivityIndicator color={following ? colors.gold : '#FFF'} />
                : <Text style={[s.followBtnText, following && s.followingBtnText]}>
                    {following ? 'Following ✓' : 'Follow'}
                  </Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>{stones.length}</Text>
            <Text style={s.statLabel}>Stones</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>{counts.followers}</Text>
            <Text style={s.statLabel}>Followers</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>{counts.following}</Text>
            <Text style={s.statLabel}>Following</Text>
          </View>
        </View>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <View style={s.badgesSection}>
            <Text style={s.sectionTitle}>Badges</Text>
            <View style={s.badgesGrid}>
              {earnedBadges.map(badge => (
                <View key={badge.key} style={s.badgeItem}>
                  <Text style={s.badgeEmoji}>{badge.emoji}</Text>
                  <Text style={s.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Recent Stones */}
        <View style={s.stonesSection}>
          <Text style={s.sectionTitle}>Stones</Text>
          {stones.length === 0
            ? <Text style={s.emptyText}>No stones dropped yet.</Text>
            : stones.slice(0, 10).map(stone => (
              <View key={stone.id} style={s.stoneItem}>
                <View style={[s.stoneStripe, { backgroundColor: colors[stone.category] || colors.other }]} />
                <View style={s.stoneContent}>
                  <Text style={s.stoneText}>{stone.text}</Text>
                  <Text style={s.stoneMeta}>{new Date(stone.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                </View>
              </View>
            ))
          }
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  navHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.gold,
  },
  scroll: { paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.gold,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: spacing.md,
    ...shadow.gold,
  },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: '#FFF',
  },
  name: {
    fontFamily: type.displayFont,
    fontSize: 26,
    color: colors.inkDark,
    marginBottom: spacing.xs,
  },
  since: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginBottom: spacing.sm,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: type.uiSize * 1.6,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  followBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
    minWidth: 120,
    alignItems: 'center',
    ...shadow.gold,
  },
  followingBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  followBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  followingBtnText: {
    color: colors.gold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: { alignItems: 'center', flex: 1 },
  statNum: {
    fontFamily: fonts.uiBold,
    fontSize: 24,
    color: colors.inkDark,
  },
  statLabel: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },
  badgesSection: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginBottom: spacing.md,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeItem: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    minWidth: 80,
    ...shadow.card,
  },
  badgeEmoji: { fontSize: 24, marginBottom: 4 },
  badgeName: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: colors.inkDark,
    textAlign: 'center',
  },
  stonesSection: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  stoneItem: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadow.card,
  },
  stoneStripe: { width: 4 },
  stoneContent: { flex: 1, padding: spacing.md },
  stoneText: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkDark,
    lineHeight: type.uiSize * 1.6,
    marginBottom: 4,
  },
  stoneMeta: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkLight,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});