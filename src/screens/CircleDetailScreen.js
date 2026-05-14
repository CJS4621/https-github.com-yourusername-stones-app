import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, Alert, Image, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCircleMembers, inviteToCircle, leaveCircle, deleteCircle, editCircle, uploadPhoto, getPendingRequests, approveJoinRequest, denyJoinRequest } from '../lib/api';
import * as ImagePicker from 'expo-image-picker';
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
  const { circle: initialCircle, role: initialRole } = route.params;
  const { user } = useAuth();

  // When opened from a push notification, only { id, _isStub: true } is passed.
  // In that case we hydrate the full circle record before rendering.
  const isStub = !!initialCircle?._isStub;

  const [currentCircle, setCurrentCircle] = useState(initialCircle);
  const [hydrating, setHydrating]         = useState(isStub);
  const [members, setMembers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showInvite, setShowInvite]       = useState(false);
  const [showEdit, setShowEdit]           = useState(false);
  const [editName, setEditName]           = useState(initialCircle.name || '');
  const [editLogo, setEditLogo]           = useState(initialCircle.logo_url || null);
  const [editIsPublic, setEditIsPublic]   = useState(initialCircle.is_public || false);
  const [editLogoUploading, setEditLogoUploading] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviting, setInviting]           = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [processingRequest, setProcessingRequest] = useState(null);

  // isAdmin is stateful: from a notification the role hint may be wrong, so
  // after hydration we re-derive it from the circle's owner_id.
  const [isAdmin, setIsAdmin] = useState(initialRole === 'admin');

  // Hydrate a stub circle (opened via push notification) into a full record.
  useEffect(() => {
    if (!isStub) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('circles')
          .select('*')
          .eq('id', initialCircle.id)
          .single();
        if (error) throw error;
        if (cancelled) return;
        if (data) {
          setCurrentCircle(data);
          setEditName(data.name || '');
          setEditLogo(data.logo_url || null);
          setEditIsPublic(data.is_public || false);
          // Re-derive admin status from the real owner_id
          setIsAdmin(data.owner_id === user?.id);
        }
      } catch (err) {
        console.log('Error hydrating circle from notification:', err);
        Alert.alert(
          'Circle Unavailable',
          'This circle could not be opened. It may have been deleted.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isStub]);

  // Load members + pending requests. For a stub, wait until hydration finishes
  // (and isAdmin has been re-derived) before loading.
  useEffect(() => {
    if (hydrating) return;
    loadMembers();
    if (isAdmin) loadPendingRequests();
  }, [hydrating, isAdmin]);

  async function loadPendingRequests() {
    try {
      const data = await getPendingRequests(currentCircle.id);
      setPendingRequests(data || []);
    } catch (err) {
      console.log('Error loading pending requests:', err);
    }
  }

  async function handleApprove(userId, displayName) {
    setProcessingRequest(userId);
    try {
      await approveJoinRequest(currentCircle.id, userId);
      Alert.alert('Approved! 🫂', `${displayName} has been added to ${currentCircle.name}.`);
      loadMembers();
      loadPendingRequests();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not approve request.');
    } finally {
      setProcessingRequest(null);
    }
  }

  async function handleDeny(userId, displayName) {
    Alert.alert(
      'Deny Request',
      `Deny ${displayName}'s request to join ${currentCircle.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequest(userId);
            try {
              await denyJoinRequest(currentCircle.id, userId);
              loadPendingRequests();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not deny request.');
            } finally {
              setProcessingRequest(null);
            }
          }
        }
      ]
    );
  }

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await getCircleMembers(currentCircle.id);
      setMembers(data);
    } catch (err) {
      console.log('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickEditLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    if (result.canceled) return;
    setEditLogoUploading(true);
    try {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const url = await uploadPhoto(base64Uri);
      setEditLogo(url);
    } catch (err) {
      Alert.alert('Error', 'Could not upload photo.');
    } finally {
      setEditLogoUploading(false);
    }
  }

  async function handleSaveEdit() {
    if (!editName.trim()) { Alert.alert('Required', 'Please enter a circle name.'); return; }
    setSaving(true);
    try {
      await editCircle(currentCircle.id, editName.trim(), editLogo, editIsPublic);
      setCurrentCircle(prev => ({ ...prev, name: editName.trim(), logo_url: editLogo, is_public: editIsPublic }));
      setShowEdit(false);
      Alert.alert('Updated! 🫂', 'Circle details have been updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update circle.');
    } finally {
      setSaving(false);
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
      await inviteToCircle(currentCircle.id, targetUser.id);
      setShowInvite(false);
      setSearchQuery('');
      setSearchResults([]);
      setTimeout(() => loadMembers(), 500);
      Alert.alert('Member Added! 🫂', `${targetUser.display_name} has been added to ${currentCircle.name}.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add member.');
    } finally {
      setInviting(null);
    }
  }

  async function handleLeave() {
    Alert.alert(
      'Leave Circle',
      `Are you sure you want to leave ${currentCircle.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveCircle(currentCircle.id, user.id);
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
      `Are you sure you want to permanently delete "${currentCircle.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCircle(currentCircle.id);
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

  // While hydrating a stub circle (opened from a push notification),
  // show a loading state so we never render with incomplete data.
  if (hydrating) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Circle</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text style={{
            fontFamily: fonts.body,
            fontSize: type.bodySize,
            color: colors.inkLight,
            marginTop: spacing.md,
          }}>
            Opening circle…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Edit Circle Modal */}
      <Modal visible={showEdit} animationType="slide" transparent onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Edit Circle ✏️</Text>

              <View style={{ height: spacing.md }} />

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={s.logoPickerBtn} onPress={handlePickEditLogo}>
                  {editLogoUploading
                    ? <ActivityIndicator color={colors.gold} />
                    : editLogo
                      ? <>
                          <Image source={{ uri: editLogo }} style={s.logoPreview} />
                          <View style={s.logoEditOverlay}>
                            <Text style={s.logoEditOverlayText}>✏️ Edit</Text>
                          </View>
                        </>
                      : <Text style={s.logoPickerText}>📷 Add Photo</Text>
                  }
                </TouchableOpacity>

                <Text style={s.editFieldLabel}>Circle Name</Text>
                <TextInput
                  style={s.editNameInput}
                  placeholder="Circle name"
                  placeholderTextColor={colors.inkLight}
                  value={editName}
                  onChangeText={setEditName}
                  autoCapitalize="words"
                  maxLength={50}
                  autoFocus
                />

                <View style={s.privacyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.privacyTitle}>
                      {editIsPublic ? '🔓 Public Circle' : '🔒 Private Circle'}
                    </Text>
                    <Text style={s.privacyDesc}>
                      {editIsPublic
                        ? 'Anyone can discover and request to join.'
                        : 'Only people you invite can join. Others see a lock icon.'}
                    </Text>
                  </View>
                  <Switch
                    value={editIsPublic}
                    onValueChange={setEditIsPublic}
                    trackColor={{ false: colors.border, true: colors.gold }}
                    thumbColor="#FFF"
                  />
                </View>

                <View style={{ height: spacing.lg }} />

                <TouchableOpacity
                  style={[s.modalBtn, saving && { opacity: 0.6 }]}
                  onPress={handleSaveEdit}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={s.modalBtnText}>💾 Save Changes</Text>
                  }
                </TouchableOpacity>

                <View style={{ height: spacing.md }} />

                <TouchableOpacity style={s.modalCancelBtnFull} onPress={() => setShowEdit(false)}>
                  <Text style={s.modalCancelBtnFullText}>Cancel</Text>
                </TouchableOpacity>

                <View style={{ height: spacing.md }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {isAdmin && (
              <TouchableOpacity style={s.editCircleBtn} onPress={() => setShowEdit(true)}>
                <Text style={s.editCircleBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}
            {isAdmin && members.length < 12 && (
              <TouchableOpacity style={s.addMemberBtn} onPress={() => setShowInvite(true)}>
                <Text style={s.addMemberBtnText}>+ Add Member</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={s.headerTitle}>{currentCircle.name}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Circle Hero */}
        <View style={s.hero}>
          {currentCircle.logo_url
            ? <Image source={{ uri: currentCircle.logo_url }} style={s.heroLogo} />
            : (
              <View style={s.heroLogoPlaceholder}>
                <Text style={s.heroLogoText}>{(currentCircle.name || '?')[0].toUpperCase()}</Text>
              </View>
            )
          }
          <Text style={s.heroName}>{currentCircle.name}</Text>
          <Text style={s.heroMeta}>{members.length} of 12 Members</Text>
        </View>

        {/* Pending Requests (Admin Only) */}
        {isAdmin && pendingRequests.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📥 Pending Requests ({pendingRequests.length})</Text>
            {pendingRequests.map(req => {
              const reqUser = req.users;
              return (
                <View key={req.user_id} style={s.pendingRow}>
                  {reqUser?.avatar_url
                    ? <Image source={{ uri: reqUser.avatar_url }} style={s.memberAvatar} />
                    : (
                      <View style={s.memberAvatarPlaceholder}>
                        <Text style={s.memberAvatarText}>{(reqUser?.display_name || '?')[0].toUpperCase()}</Text>
                      </View>
                    )
                  }
                  <View style={s.memberInfo}>
                    <Text style={s.memberName}>{reqUser?.display_name || 'Unknown'}</Text>
                    <Text style={s.memberRole}>Wants to join</Text>
                  </View>
                  {processingRequest === req.user_id ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={s.approveBtn} onPress={() => handleApprove(req.user_id, reqUser?.display_name || 'User')}>
                        <Text style={s.approveBtnText}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.denyBtn} onPress={() => handleDeny(req.user_id, reqUser?.display_name || 'User')}>
                        <Text style={s.denyBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

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
  editFieldLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: colors.inkLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  editNameInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkDark,
    borderWidth: 2,
    borderColor: colors.gold,
    marginBottom: spacing.lg,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  privacyTitle: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginBottom: 2,
  },
  privacyDesc: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkLight,
    lineHeight: 16,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  approveBtn: {
    backgroundColor: '#2E8B57',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    color: '#FFF',
    fontFamily: fonts.uiBold,
    fontSize: 18,
  },
  denyBtn: {
    backgroundColor: '#E53E3E',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denyBtnText: {
    color: '#FFF',
    fontFamily: fonts.uiBold,
    fontSize: 18,
  },
  modalCancelBtnFull: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalCancelBtnFullText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkMid,
  },
  editCircleBtn: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
  },
  editCircleBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: colors.gold,
  },
  logoPickerBtn: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.bgCard, borderWidth: 2,
    borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.lg, overflow: 'hidden',
  },
  logoEditOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  logoEditOverlayText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: '#FFF',
  },
  logoPreview: { width: 88, height: 88, borderRadius: 44 },
  logoPickerText: {
    fontFamily: fonts.ui, fontSize: 12,
    color: colors.inkLight, textAlign: 'center',
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
    marginTop: 60,
    ...shadow.gold,
  },
  modalTitle: {
    fontFamily: type.displayFont,
    fontSize: 22,
    color: colors.inkDark,
    marginBottom: 4,
    textAlign: 'center',
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
  modalBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
    ...shadow.gold,
  },
  modalBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  modalCancelBtnFull: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  modalCancelBtnFullText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkMid,
  },
});