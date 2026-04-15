import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAnsweredWall } from '../lib/api';
import { colors, fonts, type, spacing, radius, CATEGORY_LABELS } from '../theme';

export default function AnsweredWallScreen({ navigation }) {
  const [stones, setStones]         = useState([]);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const fetchingRef                 = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setStones([]);
      fetchStones(1, true);
    }, [])
  );

  async function fetchStones(nextPage = 1, replace = false) {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await getAnsweredWall(nextPage);
      setStones(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
      setPage(nextPage);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    fetchStones(1, true);
  }

  function handleLoadMore() {
    if (hasMore && !fetchingRef.current) fetchStones(page + 1);
  }

  function renderStone({ item }) {
    const catColor = colors[item.category] || colors.gold;
    const date = new Date(item.answered_at || item.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('StoneDetail', { stone: item })}
        activeOpacity={0.85}
      >
        <View style={[styles.stripe, { backgroundColor: catColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.dove}>🕊️</Text>
            <View style={styles.cardHeaderText}>
              <Text style={styles.ownerName}>{item.display_name}</Text>
              <Text style={styles.cardMeta}>
                {CATEGORY_LABELS[item.category]} · Answered {date}
              </Text>
            </View>
          </View>
          <Text style={styles.stoneText} numberOfLines={4}>{item.text}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.prayCount}>🙏 {item.pray_count || 0} prayed for this</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Answered Prayers</Text>
          <Text style={styles.tagline}>Testimonies of God's faithfulness 🕊️</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {loading
        ? <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />
        : (
          <FlatList
            data={stones}
            keyExtractor={item => item.id}
            renderItem={renderStone}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            ListFooterComponent={hasMore
              ? <ActivityIndicator style={{ padding: spacing.lg }} color={colors.gold} />
              : <Text style={styles.endText}>— End of Answered Prayers —</Text>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🕊️</Text>
                <Text style={styles.emptyTitle}>No Answered Prayers Yet</Text>
                <Text style={styles.emptyText}>
                  When God answers a prayer mark it as answered and it will appear here as a testimony!
                </Text>
              </View>
            }
          />
        )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.gold,
    width: 60,
  },
  headerText: { alignItems: 'center', flex: 1 },
  title: {
    fontFamily: type.displayFont,
    fontSize: type.displaySize,
    color: colors.inkDark,
  },
  tagline: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stripe: { width: 4 },
  cardContent: { flex: 1, padding: spacing.md },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dove: { fontSize: 24, marginRight: spacing.sm },
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
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayCount: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
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
  endText: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    textAlign: 'center',
    padding: spacing.xl,
    letterSpacing: 1,
  },
});