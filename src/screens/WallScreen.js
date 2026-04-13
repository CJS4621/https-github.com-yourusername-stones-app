import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StoneCard from '../components/StoneCard';
import { getWall } from '../lib/api';
import { colors, fonts, type, spacing, radius } from '../theme';
import { CATEGORY_LABELS } from '../theme';

const CATEGORIES = ['all', ...Object.keys(CATEGORY_LABELS)];

export default function WallScreen({ navigation }) {
  const [stones, setStones]         = useState([]);
  const [category, setCategory]     = useState('all');
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const fetchingRef                 = useRef(false);

  const fetchStones = useCallback(async (nextPage = 1, cat = category, replace = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await getWall(nextPage, cat === 'all' ? null : cat);
      setStones(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
      setPage(nextPage);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => {
    setLoading(true);
    setStones([]);
    fetchStones(1, category, true);
  }, [category]);

  function handleRefresh() {
    setRefreshing(true);
    fetchStones(1, category, true);
  }

  function handleLoadMore() {
    if (hasMore && !fetchingRef.current) fetchStones(page + 1);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.logo}>Stones</Text>
        <Text style={styles.tagline}>"Thus far the Lord has helped us" — 1 Sam 7:12</Text>
      </View>
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />
      ) : (
        <FlatList
          data={stones}
          keyExtractor={item => item.id}
			renderItem={({ item }) => (
			  <StoneCard
				stone={item}
				onPress={() => navigation.navigate('StoneDetail', { stone: item })}
				onPressUser={(userId) => navigation.navigate('PublicProfile', { userId })}
			  />
			)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.gold} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={hasMore
            ? <ActivityIndicator style={{ padding: spacing.lg }} color={colors.gold} />
            : <Text style={styles.endText}>— End of Wall —</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🪨</Text>
              <Text style={styles.emptyTitle}>No stones yet</Text>
              <Text style={styles.emptyText}>Be the first to drop one.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    fontFamily: type.displayFont,
    fontSize: type.displaySize,
    color: colors.inkDark,
    lineHeight: type.displaySize * type.displayLine,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  chipsWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chips: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipText: {
    fontFamily: fonts.uiBold,
    fontSize: type.captionSize,
    color: colors.inkMid,
  },
  chipTextActive: { color: '#FFF' },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: type.titleFont,
    fontSize: type.titleSize,
    color: colors.inkDark,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: type.bodySize,
    color: colors.inkLight,
    textAlign: 'center',
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