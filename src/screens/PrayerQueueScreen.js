import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyPrayers, markPrayerAnswered } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow, CATEGORY_LABELS } from '../theme';

export default function PrayerQueueScreen({ navigation }) {
  const { user } = useAuth();
  const [prayers, setPrayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [marking, setMarking]   = useState(null);

  useEffect(() => {
    loadPrayers();
  }, [user]);

  async function loadPrayers() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getMyPrayers(user.id);
      setPrayers(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAnswered(prayer) {
    Alert.alert(
      '🕊️ Mark as Answered?',
      `Mark this prayer for ${prayer.stones?.users?.display_name || 'Someone'} as answered by God?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, God Answered!',
          onPress: async () => {
            setMarking(prayer.stone_id);
            try {
              await markPrayerAnswered(user.id, prayer.stone_id);
              // Remove from list
              setPrayers(p => p.filter(pr => pr.stone_id !== prayer.stone_id));
              Alert.alert(
                'Praise God! 🙌',
                'This prayer has been marked as answered. Keep praying faithfully!',
              );
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not mark as answered.');
            } finally {
              setMarking(null);
            }
          }
        }
      ]
    );
  }

  const activePrayers = prayers.filter(p => !p.answered);
  const answeredPrayers = prayers.filter(p => p.answered);

  function renderPrayer({ item }) {
    const stone = item.stones;
    const owner = stone?.users;
    const catColor = colors[stone?.category] || colors.gold;
    const isMarking = marking === item.stone_id;
    const daysAgo = item.created_at
      ? Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)
      : 0;

    return (
      <View style={s.card}>
        {/* Category stripe */}
        <View style={[s.stripe, { backgroundColor: catColor }]} />

        <View style={s.cardContent}>
          {/* Header */}
          <View style={s.cardHeader}>
            {owner?.avatar_url
              ? <Image source={{ uri: owner.avatar_url }} style={s.avatar} />
              : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarText}>
                    {(owner?.display_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )
            }
            <View style={s.cardHeaderText}>
              <Text style={s.ownerName}>{owner?.display_name || 'Someone'}</Text>
              <Text style={s.cardMeta}>
                {CATEGORY_LABELS[stone?.category] || 'Faith'} · Praying {daysAgo === 0 ? 'today' : `${daysAgo}d`}
              </Text>
            </View>
          </View>

          {/* Stone text */}
          <Text style={s.stoneText} numberOfLines={3}>{stone?.text}</Text>

          {/* Mark as answered button */}
          <TouchableOpacity
            style={s.answeredBtn}
            onPress={() => handleMarkAnswered(item)}
            disabled={isMarking}
          >
            {isMarking
              ? <ActivityIndicator size="small" color={colors.gold} />
              : <Text style={s.answeredBtnText}>🕊️ God Answered This</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>Prayer Queue</Text>
          <Text style={s.sub}>{activePrayers.length} active · {answeredPrayers.length} answered</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {loading
        ? <ActivityIndicator color={colors.gold} style={{ flex: 1 }} />
        : (
          <FlatList
            data={activePrayers}
            keyExtractor={i => i.stone_id}
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
            renderItem={renderPrayer}
            ListHeaderComponent={
              activePrayers.length > 0 ? (
                <View style={s.sectionHeader}>
                  <Text style={s.sectionTitle}>🙏 Active Prayers</Text>
                  <Text style={s.sectionSub}>Tap "God Answered This" when you see Him move</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={s.emptyContainer}>
                <Text style={s.emptyIcon}>🙏</Text>
                <Text style={s.emptyTitle}>No Active Prayers</Text>
                <Text style={s.emptyText}>
                  Tap 🤲 on any stone in the Wall to commit to praying for someone.
                </Text>
                {answeredPrayers.length > 0 && (
                  <View style={s.answeredSection}>
                    <Text style={s.answeredSectionTitle}>✅ {answeredPrayers.length} Answered Prayer{answeredPrayers.length > 1 ? 's' : ''}</Text>
                    <Text style={s.answeredSectionSub}>Praise God for His faithfulness! 🙌</Text>
                  </View>
                )}
              </View>
            }
            ListFooterComponent={
              answeredPrayers.length > 0 && activePrayers.length > 0 ? (
                <View style={s.answeredSection}>
                  <Text style={s.answeredSectionTitle}>✅ {answeredPrayers.length} Answered Prayer{answeredPrayers.length > 1 ? 's' : ''}</Text>
                  <Text style={s.answeredSectionSub}>Praise God for His faithfulness! 🙌</Text>
                </View>
              ) : null
            }
          />
        )
      }
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
  headerText: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontFamily: type.displayFont,
    fontSize: type.displaySize,
    color: colors.inkDark,
  },
  sub: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginBottom: 4,
  },
  sectionSub: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    fontStyle: 'italic',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  stripe: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    ...shadow.gold,
  },
  avatarText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#FFF',
  },
  cardHeaderText: { flex: 1 },
  ownerName: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  cardMeta: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  stoneText: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkMid,
    lineHeight: type.uiSize * 1.6,
    marginBottom: spacing.md,
  },
  answeredBtn: {
    backgroundColor: colors.prayGlow,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  answeredBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: colors.gold,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: type.displayFont,
    fontSize: 24,
    color: colors.inkDark,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.uiSize,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: type.uiSize * 1.7,
  },
  answeredSection: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.prayGlow,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    alignItems: 'center',
  },
  answeredSectionTitle: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginBottom: 4,
  },
  answeredSectionSub: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkMid,
  },
});