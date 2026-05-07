import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Image, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { discoverCircles, requestToJoinCircle, getMyCircles } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

export default function DiscoverCirclesScreen({ navigation }) {
  const { user } = useAuth();
  const [circles, setCircles]       = useState([]);
  const [myCircleIds, setMyCircleIds] = useState(new Set());
  const [loading, setLoading]       = useState(true);
  const [requesting, setRequesting] = useState(null);
  const [requested, setRequested]   = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCircles = circles.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [user])
  );

  async function loadAll() {
    setLoading(true);
    try {
      const [allCircles, myCircles] = await Promise.all([
        discoverCircles(),
        getMyCircles(user.id),
      ]);
      const myIds = new Set(myCircles.map(c => c.circle_id || c.id));
      setMyCircleIds(myIds);
      setCircles(allCircles);
    } catch (err) {
      console.log('Error loading discover:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(circle) {
    if (circle.member_count >= 12) {
      Alert.alert('Circle Full', 'This circle has reached the 12 member limit.');
      return;
    }
    setRequesting(circle.id);
    try {
      await requestToJoinCircle(circle.id, user.id);
      setRequested(prev => new Set([...prev, circle.id]));
      Alert.alert(
        'Request Sent! 🫂',
        `Your request to join "${circle.name}" has been sent. The admin will be notified.`
      );
    } catch (err) {
      if (err.message?.includes('duplicate')) {
        Alert.alert('Already Requested', 'You have already requested to join this circle.');
      } else {
        Alert.alert('Error', err.message || 'Could not send request.');
      }
    } finally {
      setRequesting(null);
    }
  }

  function renderCircle({ item }) {
    const isMember = myCircleIds.has(item.id);
    const isFull = item.member_count >= 12;
    const hasRequested = requested.has(item.id);
    const isPrivate = !item.is_public;

    return (
      <View style={s.circleCard}>
        {item.logo_url
          ? <Image source={{ uri: item.logo_url }} style={s.circleLogo} />
          : (
            <View style={s.circleLogoPlaceholder}>
              <Text style={s.circleLogoText}>{(item.name || '?')[0].toUpperCase()}</Text>
            </View>
          )
        }
        <View style={s.circleInfo}>
          <View style={s.circleNameRow}>
            <Text style={s.circleName} numberOfLines={1}>{item.name}</Text>
            {isPrivate && <Text style={s.lockIcon}>🔒</Text>}
          </View>
          <Text style={s.circleMeta}>
            {item.member_count}/12{isFull ? ' · Full' : ''}
          </Text>
        </View>
        {isMember ? (
          <View style={[s.actionBtn, s.memberBtn]}>
            <Text style={s.memberBtnText}>✓ Member</Text>
          </View>
        ) : hasRequested ? (
          <View style={[s.actionBtn, s.requestedBtn]}>
            <Text style={s.requestedBtnText}>Pending</Text>
          </View>
        ) : requesting === item.id ? (
          <View style={s.actionBtn}>
            <ActivityIndicator size="small" color={colors.gold} />
          </View>
        ) : (
          <TouchableOpacity
            style={[s.actionBtn, s.joinBtn, isFull && s.joinBtnDisabled]}
            onPress={() => handleRequest(item)}
            disabled={isFull}
          >
            <Text style={s.joinBtnText}>{isFull ? 'Full' : 'Request'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Discover Circles</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={s.subtitle}>Find faith communities to join 🫂</Text>

      {/* Search Bar */}
      <View style={s.searchWrapper}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Search circles by name..."
          placeholderTextColor={colors.inkLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={s.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading
        ? <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />
        : (
          <FlatList
            data={filteredCircles}
            keyExtractor={item => item.id}
            renderItem={renderCircle}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>{searchQuery ? '🔍' : '🫂'}</Text>
                <Text style={s.emptyTitle}>
                  {searchQuery ? 'No matches' : 'No Circles Yet'}
                </Text>
                <Text style={s.emptyText}>
                  {searchQuery
                    ? `No circles match "${searchQuery}". Try a different search.`
                    : 'Be the first to create one from the Circles tab!'}
                </Text>
              </View>
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
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontFamily: fonts.ui, fontSize: type.uiSize, color: colors.gold, width: 60 },
  title: { fontFamily: type.displayFont, fontSize: 22, color: colors.inkDark },
  subtitle: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkLight,
    textAlign: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: colors.inkDark,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.inkLight,
    paddingHorizontal: 4,
  },
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.md,
    marginTop: 6,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  circleLogo: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  circleLogoPlaceholder: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  circleLogoText: { fontFamily: fonts.uiBold, fontSize: 16, color: '#FFF' },
  circleInfo: { flex: 1 },
  circleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  circleName: { fontFamily: fonts.uiBold, fontSize: 14, color: colors.inkDark, flexShrink: 1 },
  lockIcon: { fontSize: 12 },
  circleMeta: { fontFamily: fonts.caption, fontSize: 11, color: colors.inkLight, marginTop: 1 },
  actionBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    minWidth: 64,
    alignItems: 'center',
  },
  joinBtn: { backgroundColor: colors.gold },
  joinBtnDisabled: { backgroundColor: colors.inkLight, opacity: 0.5 },
  joinBtnText: { color: '#FFF', fontFamily: fonts.uiBold, fontSize: 11 },
  memberBtn: { backgroundColor: '#2E8B57' },
  memberBtnText: { color: '#FFF', fontFamily: fonts.uiBold, fontSize: 11 },
  requestedBtn: { backgroundColor: colors.bgCard, borderWidth: 1.5, borderColor: colors.gold },
  requestedBtnText: { color: colors.gold, fontFamily: fonts.uiBold, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { fontFamily: type.displayFont, fontSize: 24, color: colors.inkDark, marginBottom: spacing.sm },
  emptyText: { fontFamily: fonts.body, fontSize: type.uiSize, color: colors.inkLight, textAlign: 'center', lineHeight: type.uiSize * 1.7 },
});
