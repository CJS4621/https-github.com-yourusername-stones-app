import * as Haptics from 'expo-haptics';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Alert, Linking } from 'react-native';
import { colors, fonts, spacing, radius, shadow, CATEGORY_LABELS, getCategoryBg } from '../theme';
import { togglePrayer, markStoneAnswered } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function StoneCard({ stone, onPress, onPressUser, initialPrayed = false, glowing = false }) {
  const { user } = useAuth();
  const [prayCount, setPrayCount]                     = useState(stone.pray_count || 0);
  const [encouragementCount, setEncouragementCount]   = useState(stone.encouragement_count || 0);
  const [prayed, setPrayed]                           = useState(initialPrayed);
  const [answered, setAnswered]                       = useState(stone.answered || false);
  const [scale]                                       = useState(new Animated.Value(1));
  const glowAnim                                      = useRef(new Animated.Value(0)).current;

  const categoryColor = colors[stone.category] || colors.other;
  const categoryBg    = getCategoryBg(stone.category);
  const daysAgo       = getDaysAgo(stone.created_at);
  const isOwner       = user?.id === stone.user_id;
  const isPrayerRequest = stone.type === 'prayer_request';

  // Trigger pulsing gold glow when this card becomes "glowing"
  useEffect(() => {
    if (!glowing) return;
    glowAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
      { iterations: 3 }
    ).start();
    // also haptic so the user feels the highlight
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [glowing]);

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

  // Interpolate glow → border color + shadow opacity
  const borderColorAnim = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(200, 149, 42, 0)', 'rgba(200, 149, 42, 1)'], // gold
  });
  const shadowOpacityAnim = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.glowWrap,
        glowing && {
          borderColor: borderColorAnim,
          shadowColor: colors.gold,
          shadowOpacity: shadowOpacityAnim,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.card, { backgroundColor: categoryBg }]}
        onPress={onPress}
        activeOpacity={0.92}
      >
        {/* Category stripe */}
        <View style={[styles.categoryStripe, { backgroundColor: categoryColor }]} />

        <View style={styles.content}>
          {/* Header row */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerLeft}
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
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{stone.display_name || 'Anonymous'}</Text>
                  {isPrayerRequest && (
                    <View style={styles.prayerTag}>
                      <Text style={styles.prayerTagText}>🙏 Prayer Request</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.meta, { color: categoryColor }]}>
                  {CATEGORY_LABELS[stone.category]}  ·  {daysAgo}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
              <Text style={[styles.viewHint, { color: categoryColor }]}>View ›</Text>
            </TouchableOpacity>
          </View>

          {/* Stone text */}
          <Text style={styles.stoneText}>{stone.text}</Text>

          {/* Scripture Reference */}
          {stone.scripture_ref && (
            <TouchableOpacity
              style={styles.scriptureBtn}
              onPress={() => Linking.openURL(
                `https://www.bible.com/search/bible?q=${encodeURIComponent(stone.scripture_ref)}`
              )}
              activeOpacity={0.7}
            >
              <Text style={[styles.scriptureBtnText, { color: categoryColor }]}>
                📖 {stone.scripture_ref}
              </Text>
            </TouchableOpacity>
          )}

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

            {/* ❤️ Encouragement counter — only when > 0 */}
            {encouragementCount > 0 && (
              <View style={styles.heartBadge}>
                <Text style={styles.heartIcon}>❤️</Text>
                <Text style={styles.heartCount}>{encouragementCount}</Text>
              </View>
            )}

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
    </Animated.View>
  );
}

function getDaysAgo(dateStr) {
  const now = new Date();
  const created = new Date(dateStr);

  // Compare by calendar date in local timezone — not raw milliseconds
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const createdDate = new Date(created.getFullYear(), created.getMonth(), created.getDate());

  const diffMs = nowDate - createdDate;
  const days = Math.round(diffMs / 86400000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  glowWrap: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  card: {
    borderRadius: radius.md,
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerText: { flex: 1 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.inkDark,
  },
  prayerTag: {
    backgroundColor: '#EBF8FF',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#90CDF4',
  },
  prayerTagText: {
    fontFamily: fonts.uiBold,
    fontSize: 9,
    color: '#2B6CB0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  heartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: '#FFE5EC',
    borderWidth: 1,
    borderColor: '#FFB3C1',
  },
  heartIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  heartCount: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#C0392B',
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
  scriptureBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  scriptureBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
  },
});
