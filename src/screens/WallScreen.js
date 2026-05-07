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
import { colors, fonts, type, spacing, radius } from '../theme';
import { CATEGORY_LABELS } from '../theme';

const CATEGORIES = ['all', ...Object.keys(CATEGORY_LABELS)];

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
  const fetchingRef                 = useRef(false);

  // Group stones by year-month with current month always expanded
  const groupedItems = React.useMemo(() => {
    if (!stones.length) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Group stones by year-month
    const groups = {};
    stones.forEach(stone => {
      const date = new Date(stone.created_at);
      const year = date.getFullYear();
      const month = date.getMonth();
      const key = `${year}-${month}`;
      if (!groups[key]) {
        groups[key] = { year, month, stones: [], key };
      }
      groups[key].stones.push(stone);
    });

    // Sort groups: current month first, then descending
    const sortedGroups = Object.values(groups).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    // Build flat list with headers and stones
    const items = [];
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Track years that need year-level rollup
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
        // Show month headers individually for current year
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

    // Add past years as collapsed year groups
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

  // Batch fetch all prayed stone IDs once — no per-card queries
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

  // Refresh wall and prayed IDs every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setStones([]);
      fetchPrayedIds();
      fetchStones(1, category, true, typeFilter);
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
      {/* Type Filter */}
      <View style={styles.typeFilterRow}>
        {[
          { key: 'all', label: '✨ All' },
          { key: 'stone', label: '🪨 Stones' },
          { key: 'prayer_request', label: '🙏 Prayer Requests' },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.typeChip, typeFilter === key && styles.typeChipActive]}
            onPress={() => setTypeFilter(key)}
          >
            <Text style={[styles.typeChipText, typeFilter === key && styles.typeChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category chips */}
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
          data={groupedItems}
          keyExtractor={item => item.key}
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
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  typeFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  typeChipText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: colors.inkMid,
    textAlign: 'center',
    width: '100%',
  },
  typeChipTextActive: { color: '#FFF' },
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
  monthHeaderIndent: {
    marginLeft: spacing.lg,
  },
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
  monthHeaderTextCurrent: {
    color: colors.gold,
  },
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
