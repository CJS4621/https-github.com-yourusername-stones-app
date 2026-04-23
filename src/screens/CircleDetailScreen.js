import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Alert, Image, ScrollView, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCircleMembers, inviteToCircle, leaveCircle, deleteCircle } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

async function searchUsers(query) {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${query}%`)
    .limit(20);
  if (error) throw error;
  return data || [];
}

export default function CircleDetailScreen({ route, navigation }) {
  const { circle, role } = route.params;
  const { user } = useAuth();
  const [members, setMembers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showInvite, setShowInvite]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviting, setInviting]           = useState(null);

  const isAdmin = role === 'admin';

  useEffect(() => {
    loadMembers();
  }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await getCircleMembers(circle.id);
      setMembers(data);
    } catch (err) {
      console.log('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(text) {
    setSearchQuery(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const results = await searchUsers(text);
    const memberIds = members.map(m => m.user_id);
    setSearchResults(results.filter(u => !memberIds.includes(u.id) && u.id !== user.id));
  }

  async function handleInvite(targetUser) {
    setInviting(targetUser.id);
    try {
      await inviteToCircle(circle.id, targetUser.id);
      setShowInvite(false);
      setSearchQuery('');
      setSearchResults([]);
      setTimeout(() => loadMembers(), 500);
      Alert.alert('Member Added! 🫂', `${targetUser.display_name} has been added to ${circle.name}.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add member.');
    } finally {
      setInviting(null);
    }
  }

  async function handleLeave() {
    Alert.alert(
      'Leave Circle',
      `Are you sure you want to leave ${circle.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCircle(circle.id, user.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not leave circle.');
            }
          }
        }
      ]
    );
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Circle',
      `Are you sure you want to permanently delete "${circle.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCircle(circle.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete circle.');
            }
          }
        }
      ]
    );
  }

  function renderMember({ item }) {
    const memberUser = item.users;
    return (
      <View style={s.memberRow}>
        {memberUser?.avatar_url
          ? <Image source={{ uri: memberUser.avatar_url }} style={s.memberAvatar} />
          : (
            <View style={s.memberAvatarPlaceholder}>
              <Text style={s.memberAvatarText}>
                {(memberUser?.display_name || '?')[0].toUpperCase()}
              </Text>
            </View>
          )
        }
        <View style={s.memberInfo}>
          <Text style={s.memberName}>{memberUser?.display_name || 'Unknown'}</Text>
          <Text style={s.memberRole}>
            {item.role === 'admin' ? '👑 Admin' : '👤 Member'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Invite Modal */}
      <Modal visible={showInvite} animationType="slide" transparent onRequestClose={() => setShowInvite(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Add Member 🫂</Text>
            <Text style={s.modalSubtitle}>
              {members.length} of 12 Members · {12 - members.length} Spots Remaining
            </Text>

            <View style={s.searchWrapper}>
              <Text style={s.searchIcon}>🔍</Text>
              <TextInput
                style={s.searchField}
                placeholder="Search by name..."
                placeholderTextColor={colors.inkLight}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoFocus
              />
            </View>

            {searchResults.map(u => (
              <TouchableOpacity
                key={u.id}
                style={s.searchResult}
                onPress={() => handleInvite(u)}
                disabled={inviting === u.id}
              >
                {u.avatar_url
                  ? <Image source={{ uri: u.avatar_url }} style={s.searchAvatar} />
                  : (
                    <View style={s.searchAvatarPlaceholder}>
                      <Text style={s.searchAvatarText}>{(u.display_name || '?')[0].toUpperCase()}</Text>
                    </View>
                  )
                }
                <Text style={s.searchName}>{u.display_name}</Text>
                {inviting === u.id
                  ? <ActivityIndicator color={colors.gold} />
                  : <Text style={s.addBtn}>+ Add</Text>
                }
              </TouchableOpacity>
            ))}

            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <Text style={s.noResults}>No Users Found</Text>
            )}

            <TouchableOpacity
              style={s.modalCancelBtn}
              onPress={() => {
                setShowInvite(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Text style={s.modalCancelText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header — two rows */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          {isAdmin && members.length < 12 && (
            <TouchableOpacity style={s.addMemberBtn} onPress={() => setShowInvite(true)}>
              <Text style={s.addMemberBtnText}>+ Add Member</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.headerTitle}>{circle.name}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Circle Hero */}
        <View style={s.hero}>
          {circle.logo_url
            ? <Image source={{ uri: circle.logo_url }} style={s.heroLogo} />
            : (
              <View style={s.heroLogoPlaceholder}>
                <Text style={s.heroLogoText}>{(circle.name || '?')[0].toUpperCase()}</Text>
              </View>
            )
          }
          <Text style={s.heroName}>{circle.name}</Text>
          <Text style={s.heroMeta}>{members.length} of 12 Members</Text>
        </View>

        {/* Members */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Members</Text>
          {loading
            ? <ActivityIndicator color={colors.gold} />
            : members.map(item => (
              <View key={item.user_id}>
                {renderMember({ item })}
              </View>
            ))
          }
        </View>

        {/* Actions */}
        <View style={s.actions}>
          {!isAdmin && (
            <TouchableOpacity style={s.leaveBtn} onPress={handleLeave}>
              <Text style={s.leaveBtnText}>Leave Circle</Text>
            </TouchableOpacity>
          )}
          {isAdmin && (
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteBtnText}>Delete Circle</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  back: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.gold,
  },
  headerTitle: {
    fontFamily: type.displayFont,
    fontSize: 22,
    color: colors.inkDark,
  },
  addMemberBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    ...shadow.gold,
  },
  addMemberBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#FFF',
  },
  scroll: { paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroLogo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: spacing.md,
    ...shadow.gold,
  },
  heroLogoPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.gold,
  },
  heroLogoText: {
    fontFamily: fonts.uiBold,
    fontSize: 36,
    color: '#FFF',
  },
  heroName: {
    fontFamily: type.displayFont,
    fontSize: 26,
    color: colors.inkDark,
    marginBottom: 4,
  },
  heroMeta: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: spacing.md,
  },
  memberAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberAvatarText: {
    fontFamily: fonts.uiBold,
    fontSize: 18,
    color: '#FFF',
  },
  memberInfo: { flex: 1 },
  memberName: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  memberRole: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  actions: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  leaveBtn: {
    padding: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E53E3E',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leaveBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#E53E3E',
  },
  deleteBtn: {
    padding: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E53E3E',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#E53E3E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    ...shadow.gold,
  },
  modalTitle: {
    fontFamily: type.displayFont,
    fontSize: 24,
    color: colors.inkDark,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginBottom: spacing.lg,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchField: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.md,
  },
  searchAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  searchAvatarText: {
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: '#FFF',
  },
  searchName: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  addBtn: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.gold,
  },
  noResults: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkLight,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  modalCancelBtn: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalCancelText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkLight,
  },
});