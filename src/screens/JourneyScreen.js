import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJourney } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow, CATEGORY_LABELS } from '../theme';

export default function JourneyScreen({ navigation }) {
  const { user } = useAuth();
  const [stones, setStones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) getJourney(user.id).then(setStones).finally(() => setLoading(false));
  }, [user]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.title}>My Journey</Text>
          <Text style={s.sub}>{stones.length} stone{stones.length !== 1 ? 's' : ''} placed</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {loading
        ? <ActivityIndicator color={colors.gold} style={{ flex: 1 }} />
        : stones.length === 0
          ? <View style={s.emptyContainer}>
              <Text style={s.emptyIcon}>🗺️</Text>
              <Text style={s.emptyTitle}>No Stones Yet</Text>
              <Text style={s.emptyText}>Drop your first stone to begin your journey.</Text>
            </View>
          : <FlatList
              data={stones}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
              renderItem={({ item, index }) => {
                const catColor = colors[item.category] || colors.gold;
                return (
                  <View style={s.row}>
                    <View style={s.timeline}>
                      <View style={[s.dot, { backgroundColor: catColor, borderColor: catColor + '40' }]} />
                      {index < stones.length - 1 && <View style={s.line} />}
                    </View>
                    <View style={[s.card, { borderLeftColor: catColor }]}>
                      <Text style={s.cardDate}>
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric'
                        })}
                      </Text>
                      <Text style={[s.cardCat, { color: catColor }]}>{CATEGORY_LABELS[item.category]}</Text>
                      <Text style={s.cardText}>{item.text}</Text>
                    </View>
                  </View>
                );
              }}
            />
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
  row: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  timeline: {
    width: 28,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginLeft: spacing.sm,
    borderLeftWidth: 3,
    ...shadow.card,
  },
  cardDate: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginBottom: 4,
  },
  cardCat: {
    fontFamily: fonts.uiBold,
    fontSize: type.captionSize,
    marginBottom: spacing.xs,
  },
  cardText: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkDark,
    lineHeight: type.uiSize * 1.6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: type.titleFont,
    fontSize: type.titleSize,
    color: colors.inkDark,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.bodySize,
    color: colors.inkLight,
    textAlign: 'center',
  },
});