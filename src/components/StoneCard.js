import * as Haptics from 'expo-haptics';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Alert } from 'react-native';
import { colors, fonts, spacing, radius, shadow, CATEGORY_LABELS, getCategoryBg } from '../theme';
import { togglePrayer, markStoneAnswered } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function StoneCard({ stone, onPress, onPressUser }) {
  const { user } = useAuth();
  const [prayCount, setPrayCount] = useState(stone.pray_count || 0);
  const [prayed, setPrayed]       = useState(false);
  const [answered, setAnswered]   = useState(stone.answered || false);
  const [scale]                   = useState(new Animated.Value(1));

  const categoryColor = colors[stone.category] || colors.other;
  const categoryBg    = getCategoryBg(stone.category);
  const daysAgo       = getDaysAgo(stone.created_at);
  const isOwner       = user?.id === stone.user_id;

  // Bug 3 Fix — check if user has already prayed for this stone on mount
  useEffect(() => {
    if (!user) return;
    async function checkPrayed() {
      const { data } = await supabase
        .from('prayers')
        .select('stone_id')
        .eq('user_id', user.id)
        .eq('stone_id', stone.id)
        .maybeSingle();
      if (data) setPrayed(true);
    }
    checkPrayed();
  }, [user, stone.id]);

  async function handlePray() {
    if (!user) return;
    const next = prayed ? prayCount - 1 : prayCount + 1;
    setPrayed(!prayed);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPrayCount(next);

    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();

    try {
      const res = await togglePrayer(stone.id, user.id);
      setPrayCount(res.pray_count);
    } catch {
      setPrayed(prayed);
      setPrayCount(prayCount);
    }
  }

  async function handleMarkAnswered() {
    Alert.alert(
      '🕊️ Mark as Answered?',
      'Has God answered this prayer? This stone will move to the Answered Prayer Wall.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, God Answered!',
          onPress: async () => {
            try {
              await markStoneAnswered(stone.id, user.id);
              setAnswered(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Praise God! 🙌', 'This stone has been moved to the Answered Prayer Wall!');
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not mark as answered.');
            }
          }
        }
      ]
    );
  }

  if (answered) return null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: categoryBg }]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Category stripe */}
      <View style={[styles.categoryStripe, { backgroundColor: categoryColor }]} />

      <View style={styles.content}>
        {/* Header — tapping name/avatar goes to user profile */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => onPressUser && onPressUser(stone.user_id)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { borderColor: categoryColor }]}>
            {stone.avatar_url
              ? <Image source={{ uri: stone.avatar_url }} style={styles.avatarImg} />
              : <Text style={[styles.avatarInitial, { color: categoryColor }]}>
                  {(stone.display_name || '?')[0].toUpperCase()}
                </Text>
            }
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{stone.display_name || 'Anonymous'}</Text>
            <Text style={[styles.meta, { color: categoryColor }]}>
              {CATEGORY_LABELS[stone.category]}  ·  {daysAgo}
            </Text>
          </View>
          {/* Bug 2 Fix — subtle hint that card is tappable to view/edit */}
          <Text style={[styles.viewHint, { color: categoryColor }]}>View ›</Text>
        </TouchableOpacity>

        {/* Stone text */}
        <Text style={styles.stoneText}>{stone.text}</Text>

        {/* Photo */}
        {stone.photo_url && (
          <Image source={{ uri: stone.photo_url }} style={styles.photo} resizeMode="cover" />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handlePray}
            style={[styles.prayBtn, prayed && { backgroundColor: categoryColor + '22' }]}
            activeOpacity={0.7}
          >
            <Animated.Text style={[styles.prayIcon, { transform: [{ scale }] }]}>
              {prayed ? '🙏' : '🤲'}
            </Animated.Text>
            <Text style={[styles.prayCount, prayed && { color: categoryColor }]}>
              {prayCount > 0 ? prayCount : 'Pray'}
            </Text>
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity
              onPress={handleMarkAnswered}
              style={[styles.answeredBtn, { borderColor: categoryColor }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.answeredBtnText, { color: categoryColor }]}>🕊️ Answered</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getDaysAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadow.card,
  },
  categoryStripe: {
    width: 6,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    borderWidth: 2,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarInitial: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
  },
  headerText: { flex: 1 },
  name: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.inkDark,
  },
  meta: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    marginTop: 1,
  },
  viewHint: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    opacity: 0.6,
    marginLeft: spacing.sm,
  },
  stoneText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkDark,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  prayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.prayGlow,
  },
  prayIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  prayCount: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: colors.inkMid,
  },
  answeredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  answeredBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
  },
});
