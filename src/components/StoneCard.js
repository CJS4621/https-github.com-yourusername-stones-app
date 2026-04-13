
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated } from 'react-native';
import { colors, fonts, spacing, radius, shadow, CATEGORY_LABELS } from '../theme';
import { togglePrayer } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function StoneCard({ stone, onPress, onPressUser }) {
  const { user } = useAuth();
  const [prayCount, setPrayCount] = useState(stone.pray_count || 0);
  const [prayed, setPrayed]       = useState(false);
  const [scale]                   = useState(new Animated.Value(1));

  const categoryColor = colors[stone.category] || colors.other;
  const daysAgo = getDaysAgo(stone.created_at);

  async function handlePray() {
    if (!user) return;
    // Optimistic update
    const next = prayed ? prayCount - 1 : prayCount + 1;
    setPrayed(!prayed);
	Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPrayCount(next);

    // Bounce animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,   duration: 120, useNativeDriver: true }),
    ]).start();

    try {
      const res = await togglePrayer(stone.id, user.id);
      setPrayCount(res.pray_count);
    } catch {
      // Revert on failure
      setPrayed(prayed);
      setPrayCount(prayCount);
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Category stripe */}
      <View style={[styles.categoryStripe, { backgroundColor: categoryColor }]} />

      <View style={styles.content}>
        {/* Header */}
		<TouchableOpacity
			  style={styles.header}
			  onPress={() => onPressUser && onPressUser(stone.user_id)}
			  activeOpacity={0.7}
	>
		  <View style={styles.avatar}>
			{stone.avatar_url
			  ? <Image source={{ uri: stone.avatar_url }} style={styles.avatarImg} />
			  : <Text style={styles.avatarInitial}>{(stone.display_name || '?')[0].toUpperCase()}</Text>
			}
		  </View>
		  <View style={styles.headerText}>
			<Text style={styles.name}>{stone.display_name || 'Anonymous'}</Text>
			<Text style={styles.meta}>{CATEGORY_LABELS[stone.category]}  ·  {daysAgo}</Text>
		  </View>
		</TouchableOpacity>

        {/* Stone text */}
        <Text style={styles.stoneText}>{stone.text}</Text>

        {/* Photo */}
        {stone.photo_url && (
          <Image source={{ uri: stone.photo_url }} style={styles.photo} resizeMode="cover" />
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handlePray} style={styles.prayBtn} activeOpacity={0.7}>
            <Animated.Text style={[styles.prayIcon, { transform: [{ scale }] }]}>
              {prayed ? '🙏' : '🤲'}
            </Animated.Text>
            <Text style={[styles.prayCount, prayed && styles.prayCountActive]}>
              {prayCount > 0 ? prayCount : 'Pray'}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadow.card,
  },
  categoryStripe: {
    width: 4,
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
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarInitial: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.inkMid,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.inkDark,
  },
  meta: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.inkLight,
    marginTop: 1,
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
  prayCountActive: {
    color: colors.gold,
  },
});
