import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyPrayers, markPrayerAnswered } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow, CATEGORY_LABELS, getCategoryBg } from '../theme';

export default function PrayerQueueScreen({ navigation }) {
  const { user } = useAuth();
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);

  useEffect(() => { loadPrayers(); }, [user]);

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

async function loadPrayers() {
  if (!user) return;
  setLoading(true);
  try {
    const data = await getMyPrayers(user.id);
    console.log('Prayers loaded:', JSON.stringify(data));
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
              setPrayers(p => p.filter(pr => pr.stone_id !== prayer.stone_id));
              Alert.alert('Praise God! 🙌', 'This prayer has been marked as answered!');
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
    const catBg = getCategoryBg(stone?.category);
    const isMarking = marking === item.stone_id;
    const isOwner = user?.id === stone?.user_id;   // ← THE FIX
    const daysAgo = item.created_at
      ? Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)
      : 0;

    return (
      <View style={[s.card, { backgroundColor: catBg }]}>
        <View style={[s.stripe, { backgroundColor: catColor }]} />
        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            {owner?.avatar_url
              ? <Image source={{ uri: owner.avatar_url }} style={[s.avatar, { borderColor: catColor }]} />
              : (
                <View style={[s.avatarPlaceholder, { backgroundColor: catColor }]}>
                  <Text style={s.avatarText}>
                    {(owner?.display_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )
            }
            <View style={s.cardHeaderText}>
              <Text style={s.ownerName}>{owner?.display_name || 'Someone'}</Text>
              <Text style={[s.cardMeta, { color: catColor }]}>
                {CATEGORY_LABELS[stone?.category] || 'Faith'} · Praying {daysAgo === 0 ? 'today' : `${daysAgo}d`}
              </Text>
            </View>
          </View>
          <Text style={s.stoneText} numberOfLines={3}>{stone?.text}</Text>

          {/* Only show answered button to the stone creator */}
          {isOwner && (
            <TouchableOpacity
              style={[s.answeredBtn, { borderColor: catColor }]}
              onPress={() => handleMarkAnswered(item)}
              disabled={isMarking}
            >
              {isMarking
                ? <ActivityIndicator size="small" color={catColor} />
                : <Text style={[s.answeredBtnText, { color: catColor }]}>🕊️ God Answered This</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
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
                  <Text style={s.sectionSub}>Stones you are praying for</Text>
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
    fontSize: 22,
    color: colors.inkDark,
  },
  sub: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.inkDark,
    marginBottom: 4,
  },
  sectionSub: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  stripe: { width: 6 },
  cardContent: { flex: 1, padding: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: '#FFF',
  },
  cardHeaderText: { flex: 1 },
  ownerName: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: colors.inkDark,
  },
  cardMeta: {
    fontFamily: fonts.uiBold,
    fontSize: type.captionSize,
    marginTop: 2,
  },
  stoneText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkMid,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  answeredBtn: {
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  answeredBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: type.displayFont,
    fontSize: 22,
    color: colors.inkDark,
    marginBottom: spacing.sm,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  answeredSectionSub: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkMid,
    textAlign: 'center',
  },
});
