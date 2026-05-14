import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import StoneCard from '../components/StoneCard';
import { getWall } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { consumeFocusStone, subscribeFocus } from '../lib/wallFocus';
import { colors, fonts, type, spacing, radius } from '../theme';
import { CATEGORY_LABELS } from '../theme';

const TYPE_FILTERS = [
  { key: 'all',             label: '✨ All' },
  { key: 'stone',           label: '🪨 Stones' },
  { key: 'prayer_request',  label: '🙏 Prayer' },
];
const CATEGORIES = Object.keys(CATEGORY_LABELS);

export default function WallScreen({ navigation }) {
  const { user } = useAuth();
  const [stones, setStones]         = useState([]);
  const [prayedIds, setPrayedIds]   = useState(new Set());
  const [category, setCategory]     = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [focusedStoneId, setFocusedStoneId] = useState(null);
  const fetchingRef                 = useRef(false);
  const listRef                     = useRef(null);

  // Group stones by year-month with current month always expanded
  const groupedItems = React.useMemo(() => {
    if (!stones.length) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const groups = {};
    stones.forEach(stone => {
      const date = new Date(stone.created_at);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      if (!groups[key]) groups[key] = { year, month, stones: [], key };
      groups[key].stones.push(stone);
    });

    const sortedGroups = Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    const items = [];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    const pastYears = {};
    sortedGroups.forEach(g => {
      if (g.year < currentYear) {
        if (!pastYears[g.year]) pastYears[g.year] = [];
        pastYears[g.year].push(g);
      }
    });

    sortedGroups.forEach(g => {
      const isCurrentMonth = g.year === currentYear && g.month === currentMonth;
      const isCurrentYear = g.year === currentYear;
      const isExpanded = isCurrentMonth || expandedGroups.has(g.key);

      if (isCurrentYear) {
        items.push({
          type: 'header',
          key: `header-${g.key}`,
          label: `${monthNames[g.month]} ${g.year}`,
          count: g.stones.length,
          groupKey: g.key,
          isCurrentMonth,
          isExpanded,
        });
        if (isExpanded) {
          g.stones.forEach(s => items.push({ type: 'stone', stone: s, key: s.id }));
        }
      }
    });

    Object.keys(pastYears).sort((a, b) => b - a).forEach(year => {
      const yearKey = `year-${year}`;
      const yearGroups = pastYears[year];
      const totalCount = yearGroups.reduce((sum, g) => sum + g.stones.length, 0);
      const isYearExpanded = expandedGroups.has(yearKey);

      items.push({
        type: 'yearHeader',
        key: yearKey,
        label: `${year}`,
        count: totalCount,
        groupKey: yearKey,
        isExpanded: isYearExpanded,
      });

      if (isYearExpanded) {
        yearGroups.forEach(g => {
          const isExpanded = expandedGroups.has(g.key);
          items.push({
            type: 'header',
            key: `header-${g.key}`,
            label: `${monthNames[g.month]} ${g.year}`,
            count: g.stones.length,
            groupKey: g.key,
            isCurrentMonth: false,
            isExpanded,
            indent: true,
          });
          if (isExpanded) {
            g.stones.forEach(s => items.push({ type: 'stone', stone: s, key: s.id }));
          }
        });
      }
    });

    return items;
  }, [stones, expandedGroups]);

  function toggleGroup(groupKey) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  }

  async function fetchPrayedIds() {
    if (!user) return;
    const { data } = await supabase
      .from('prayers')
      .select('stone_id')
      .eq('user_id', user.id);
    if (data) setPrayedIds(new Set(data.map(p => p.stone_id)));
  }

  const fetchStones = useCallback(async (nextPage = 1, cat = category, replace = false, typeFil = typeFilter) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await getWall(nextPage, cat === 'all' ? null : cat, typeFil === 'all' ? null : typeFil);
      setStones(prev => replace ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
      setPage(nextPage);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, typeFilter]);

  // Scroll to a specific stone + trigger glow (from notification deep-link)
  const focusOnStone = useCallback((stoneId) => {
    if (!stoneId || !listRef.current) return;
    setCategory('all');
    setTypeFilter('all');
    setTimeout(() => {
      const idx = groupedItems.findIndex(it => it.type === 'stone' && it.stone.id === stoneId);
      if (idx >= 0) {
        try {
          listRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 });
        } catch (e) {
          setTimeout(() => {
            try { listRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.2 }); }
            catch (_) {}
          }, 350);
        }
      }
      setFocusedStoneId(stoneId);
      setTimeout(() => setFocusedStoneId(null), 6000);
    }, 250);
  }, [groupedItems]);

  useEffect(() => {
    const pending = consumeFocusStone();
    if (pending) focusOnStone(pending);
    const unsubscribe = subscribeFocus(id => {
      consumeFocusStone();
      focusOnStone(id);
    });
    return unsubscribe;
  }, [focusOnStone]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setStones([]);
      fetchPrayedIds();
      fetchStones(1, category, true, typeFilter);

      const pending = consumeFocusStone();
      if (pending) setTimeout(() => focusOnStone(pending), 600);
    }, [category, typeFilter])
  );

  function handleRefresh() {
    setRefreshing(true);
    fetchPrayedIds();
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

      {/* Merged single-row filter strip — type filters + divider + categories */}
      <View style={styles.chipStripWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipStrip}
        >
          {/* Type filters */}
          {TYPE_FILTERS.map(({ key, label }) => (
            <TouchableOpacity
              key={`type-${key}`}
              style={[styles.chip, typeFilter === key && styles.chipActive]}
              onPress={() => setTypeFilter(key)}
            >
              <Text style={[styles.chipText, typeFilter === key && styles.chipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Visual divider between type filters and category filters */}
          <View style={styles.chipDivider} />

          {/* Category filters */}
          <TouchableOpacity
            key="cat-all"
            style={[styles.chip, category === 'all' && styles.chipActive]}
            onPress={() => setCategory('all')}
          >
            <Text style={[styles.chipText, category === 'all' && styles.chipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={`cat-${cat}`}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {CATEGORY_LABELS[cat]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />
      ) : (
        <FlatList
          ref={listRef}
          data={groupedItems}
          keyExtractor={item => item.key}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            }, 100);
          }}
          renderItem={({ item }) => {
            if (item.type === 'yearHeader') {
              return (
                <TouchableOpacity
                  style={styles.yearHeader}
                  onPress={() => toggleGroup(item.groupKey)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.yearHeaderText}>
                    {item.isExpanded ? '📂' : '📅'} {item.label}
                  </Text>
                  <Text style={styles.yearHeaderCount}>
                    {item.count} {item.count === 1 ? 'item' : 'items'}
                  </Text>
                  <Text style={styles.yearHeaderArrow}>{item.isExpanded ? '⌄' : '›'}</Text>
                </TouchableOpacity>
              );
            }
            if (item.type === 'header') {
              return (
                <TouchableOpacity
                  style={[styles.monthHeader, item.indent && styles.monthHeaderIndent, item.isCurrentMonth && styles.monthHeaderCurrent]}
                  onPress={() => !item.isCurrentMonth && toggleGroup(item.groupKey)}
                  activeOpacity={item.isCurrentMonth ? 1 : 0.7}
                  disabled={item.isCurrentMonth}
                >
                  <Text style={[styles.monthHeaderText, item.isCurrentMonth && styles.monthHeaderTextCurrent]}>
                    {item.label}
                  </Text>
                  <Text style={styles.monthHeaderCount}>
                    {item.count} {item.count === 1 ? 'item' : 'items'}
                  </Text>
                  {!item.isCurrentMonth && (
                    <Text style={styles.monthHeaderArrow}>{item.isExpanded ? '⌄' : '›'}</Text>
                  )}
                </TouchableOpacity>
              );
            }
            return (
              <StoneCard
                stone={item.stone}
                initialPrayed={prayedIds.has(item.stone.id)}
                glowing={focusedStoneId === item.stone.id}
                onPress={() => navigation.navigate('StoneDetail', { stone: item.stone })}
                onPressUser={(userId) => navigation.navigate('PublicProfile', { userId })}
              />
            );
          }}
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
    textAlign: 'center',
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
    textAlign: 'center',
  },

  // Merged single-row filter strip
  chipStripWrap: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipStrip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.xs + 2,
  },
  chipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  chipText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: colors.inkMid,
  },
  chipTextActive: { color: '#FFF' },

  // Vertical divider between type filters and category filters
  chipDivider: {
    width: 3,
    height: 26,
    borderRadius: 2,
    backgroundColor: colors.inkLight,
    marginHorizontal: spacing.md,
    alignSelf: 'center',
  },

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
  yearHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gold + '40',
  },
  yearHeaderText: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.inkDark,
  },
  yearHeaderCount: {
    fontFamily: fonts.caption,
    fontSize: 12,
    color: colors.inkLight,
    marginRight: 8,
  },
  yearHeaderArrow: {
    fontFamily: fonts.uiBold,
    fontSize: 18,
    color: colors.gold,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthHeaderIndent: { marginLeft: spacing.lg },
  monthHeaderCurrent: {
    backgroundColor: colors.gold + '08',
    borderColor: colors.gold + '30',
  },
  monthHeaderText: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: colors.inkDark,
  },
  monthHeaderTextCurrent: { color: colors.gold },
  monthHeaderCount: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.inkLight,
    marginRight: 6,
  },
  monthHeaderArrow: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.inkLight,
  },
});
