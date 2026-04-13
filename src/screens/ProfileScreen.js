import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Modal, TextInput, Share, Alert, Image, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getProfile, getFollowCounts, getJourney, sendInvite, uploadPhoto, updateProfile } from '../lib/api';
import { signOut, supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

async function getUserBadges(userId) {
  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_key, earned_at, badges(name, emoji, description)')
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
}

async function getInviteCount(userId) {
  const { count, error } = await supabase
    .from('invites')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', userId);
  if (error) throw error;
  return count || 0;
}

const ALL_BADGES = [
  { key: 'first_stone',      emoji: '🪨', name: 'First Stone' },
  { key: 'altar_of_fire',    emoji: '🔥', name: 'Altar of Fire' },
  { key: 'intercessor',      emoji: '🙏', name: 'Intercessor' },
  { key: 'ebenezer',         emoji: '✨', name: 'Ebenezer' },
  { key: 'faithful_witness', emoji: '📅', name: 'Faithful Witness' },
  { key: 'answered_prayer',  emoji: '🕊️', name: 'Answered Prayer' },
  { key: 'community_pillar', emoji: '👥', name: 'Community Pillar' },
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile]               = useState(null);
  const [counts, setCounts]                 = useState({ followers: 0, following: 0 });
  const [stoneCount, setStoneCount]         = useState(0);
  const [badges, setBadges]                 = useState([]);
  const [inviteCount, setInviteCount]       = useState(0);
  const [loading, setLoading]               = useState(true);
  const [showInvite, setShowInvite]         = useState(false);
  const [showEdit, setShowEdit]             = useState(false);
  const [inviteEmail, setInviteEmail]       = useState('');
  const [inviteMsg, setInviteMsg]           = useState('');
  const [inviteSending, setInviteSending]   = useState(false);
  const [editName, setEditName]             = useState('');
  const [editBio, setEditBio]               = useState('');
  const [editSaving, setEditSaving]         = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setLoading(true);
      Promise.all([
        getProfile(user.id),
        getFollowCounts(user.id),
        getJourney(user.id),
        getUserBadges(user.id),
        getInviteCount(user.id),
      ])
        .then(([p, c, stones, b, ic]) => {
          setProfile(p);
          setCounts(c);
          setStoneCount(stones.length);
          setBadges(b.map(b => b.badge_key));
          setInviteCount(ic);
        })
        .finally(() => setLoading(false));
    }, [user])
  );

  function openEdit() {
    setEditName(profile?.display_name || '');
    setEditBio(profile?.bio || '');
    setShowEdit(true);
  }

  async function handleSaveProfile() {
    setEditSaving(true);
    try {
      const updated = await updateProfile(user.id, {
        display_name: editName.trim(),
        bio: editBio.trim(),
      });
      setProfile(p => ({ ...p, ...updated }));
      setShowEdit(false);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save profile.');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleAvatarPress() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to update your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    if (result.canceled) return;
    setAvatarUploading(true);
    try {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const url = await uploadPhoto(base64Uri);
      const updated = await updateProfile(user.id, { avatar_url: url });
      setProfile(p => ({ ...p, ...updated }));
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not upload photo.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleEmailInvite() {
    if (!inviteEmail.trim()) {
      Alert.alert('Required', 'Please enter an email address.');
      return;
    }
    if (inviteCount >= 5) {
      Alert.alert('Limit Reached', 'You have used all 5 free invites. Upgrade to Stones+ for unlimited invites.');
      return;
    }
    setInviteSending(true);
    try {
      await sendInvite(user.id, profile?.display_name, inviteEmail.trim(), inviteMsg.trim());
      setShowInvite(false);
      setInviteEmail('');
      setInviteMsg('');
      setInviteCount(c => c + 1);
      Alert.alert('Invite Sent! 🪨', `Your invitation has been sent to ${inviteEmail.trim()}.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not send invite. Try again.');
    } finally {
      setInviteSending(false);
    }
  }

  async function handleShareInvite() {
    try {
      await Share.share({
        message: `Hey! I've been using Stones — a faith app where we drop testimonies and encourage each other in God's faithfulness.\n\nCome join me! Download it here: https://stonesapp.ca\n\n— ${profile?.display_name}`,
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';

  const earnedCount = badges.length;
  const altarsBuilt = Math.floor(earnedCount / 5);
  const invitesLeft = Math.max(0, 5 - inviteCount);

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Email Invite Modal */}
      <Modal visible={showInvite} animationType="slide" transparent onRequestClose={() => setShowInvite(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Invite a Friend 🪨</Text>
            <Text style={s.modalSubtitle}>{invitesLeft} of 5 free invites remaining</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Friend's email address"
              placeholderTextColor={colors.inkLight}
              value={inviteEmail}
              onChangeText={setInviteEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[s.modalInput, s.modalInputMulti]}
              placeholder="Add a personal message (optional)"
              placeholderTextColor={colors.inkLight}
              value={inviteMsg}
              onChangeText={setInviteMsg}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[s.modalBtn, inviteSending && { opacity: 0.6 }]}
              onPress={handleEmailInvite}
              disabled={inviteSending}
            >
              {inviteSending
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.modalBtnText}>Send Invite</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowInvite(false)}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEdit} animationType="slide" transparent onRequestClose={() => setShowEdit(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Edit Profile</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Display name"
              placeholderTextColor={colors.inkLight}
              value={editName}
              onChangeText={setEditName}
              autoCapitalize="words"
            />
            <TextInput
              style={[s.modalInput, s.modalInputMulti]}
              placeholder="Bio (optional)"
              placeholderTextColor={colors.inkLight}
              value={editBio}
              onChangeText={setEditBio}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[s.modalBtn, editSaving && { opacity: 0.6 }]}
              onPress={handleSaveProfile}
              disabled={editSaving}
            >
              {editSaving
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.modalBtnText}>Save Profile</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowEdit(false)}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.scroll}>

        {/* Hero */}
        <View style={s.hero}>
          <TouchableOpacity onPress={handleAvatarPress} style={s.avatarWrapper}>
            {avatarUploading ? (
              <View style={s.avatar}>
                <ActivityIndicator color="#FFF" />
              </View>
            ) : profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(profile?.display_name || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={s.avatarEdit}>
              <Text style={s.avatarEditText}>✏️</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={openEdit}>
            <Text style={s.name}>{profile?.display_name}</Text>
          </TouchableOpacity>
          {memberSince ? <Text style={s.since}>Member since {memberSince}</Text> : null}
          {profile?.bio
            ? <Text style={s.bio}>{profile.bio}</Text>
            : <Text style={s.bioEmpty}>Tap your name or photo to edit profile</Text>
          }
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statNum}>{stoneCount}</Text>
            <Text style={s.statLabel}>Stones</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>{counts.followers}</Text>
            <Text style={s.statLabel}>Followers</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>{counts.following}</Text>
            <Text style={s.statLabel}>Following</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={s.badgesSection}>
          <View style={s.badgesHeader}>
            <Text style={s.badgesTitle}>Badges</Text>
            {altarsBuilt > 0 && (
              <Text style={s.altarBadge}>🏛️ {altarsBuilt} Altar{altarsBuilt > 1 ? 's' : ''} Built</Text>
            )}
          </View>
          <Text style={s.badgesSubtitle}>{earnedCount} of {ALL_BADGES.length} earned</Text>
          <View style={s.badgesGrid}>
            {ALL_BADGES.map(badge => {
              const earned = badges.includes(badge.key);
              return (
                <View key={badge.key} style={[s.badgeItem, !earned && s.badgeLocked]}>
                  <Text style={[s.badgeEmoji, !earned && s.badgeEmojiLocked]}>
                    {earned ? badge.emoji : '🔒'}
                  </Text>
                  <Text style={[s.badgeName, !earned && s.badgeNameLocked]}>
                    {badge.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Scripture */}
        <View style={s.scripture}>
          <Text style={s.scriptureText}>
            "Then Samuel took a stone and set it up... He named it Ebenezer, saying, 'Thus far the Lord has helped us.'"
          </Text>
          <Text style={s.scriptureRef}>— 1 Samuel 7:12</Text>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <View style={s.inviteRow}>
            <TouchableOpacity
              style={[s.inviteBtn, inviteCount >= 5 && s.inviteBtnDisabled]}
              onPress={() => setShowInvite(true)}
              disabled={inviteCount >= 5}
            >
              <Text style={s.inviteBtnText}>📨 Invite</Text>
              <Text style={s.inviteBtnSub}>{invitesLeft} left</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.shareBtn} onPress={handleShareInvite}>
              <Text style={s.inviteBtnText}>📱 Share</Text>
              <Text style={s.inviteBtnSub}>Unlimited</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={s.helpBtn}
            onPress={() => Linking.openURL('https://stonesapp.ca/how-to.html')}
          >
            <Text style={s.helpBtnText}>📖 How to Use Stones</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
            <Text style={s.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatarWrapper: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.gold,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    ...shadow.gold,
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarEditText: { fontSize: 12 },
  avatarText: {
    fontFamily: fonts.heading,
    fontSize: 36,
    color: '#FFF',
  },
  name: {
    fontFamily: type.displayFont,
    fontSize: 26,
    color: colors.inkDark,
    marginBottom: spacing.xs,
  },
  since: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginBottom: spacing.sm,
  },
  bio: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkMid,
    textAlign: 'center',
    lineHeight: type.uiSize * 1.6,
    marginTop: spacing.sm,
  },
  bioEmpty: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: { alignItems: 'center', flex: 1 },
  statNum: {
    fontFamily: fonts.uiBold,
    fontSize: 24,
    color: colors.inkDark,
  },
  statLabel: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  statDivider: { width: 1, height: 36, backgroundColor: colors.border },
  badgesSection: { marginHorizontal: spacing.xl, marginTop: spacing.xl },
  badgesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  badgesTitle: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  altarBadge: {
    fontFamily: fonts.uiBold,
    fontSize: type.captionSize,
    color: colors.gold,
  },
  badgesSubtitle: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginBottom: spacing.md,
  },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgeItem: {
    width: '30%',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    ...shadow.card,
  },
  badgeLocked: { borderColor: colors.border, opacity: 0.5 },
  badgeEmoji: { fontSize: 28, marginBottom: 4 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeName: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: colors.inkDark,
    textAlign: 'center',
  },
  badgeNameLocked: { color: colors.inkLight },
  scripture: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.prayGlow,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  scriptureText: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkMid,
    lineHeight: type.uiSize * 1.7,
  },
  scriptureRef: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.gold,
    marginTop: spacing.sm,
    textAlign: 'right',
  },
  actions: { marginHorizontal: spacing.xl, marginTop: spacing.xl },
  inviteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  inviteBtn: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    ...shadow.card,
  },
  inviteBtnDisabled: { opacity: 0.4, borderColor: colors.border },
  shareBtn: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    ...shadow.card,
  },
  inviteBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  inviteBtnSub: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  helpBtn: {
    padding: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  helpBtnText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkMid,
  },
  signOutBtn: {
    padding: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkMid,
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
  modalInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkDark,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  modalInputMulti: { minHeight: 80, textAlignVertical: 'top' },
  modalBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadow.gold,
  },
  modalBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  modalCancelBtn: { padding: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  modalCancelText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkLight,
  },
});