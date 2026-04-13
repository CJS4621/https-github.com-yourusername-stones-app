import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { followUser, unfollowUser } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';



async function getUsers(search = '') {
  let query = supabase
    .from('users')
    .select('id, display_name, avatar_url, bio')
    .order('created_at', { ascending: false })
    .limit(50);

  if (search.trim()) {
    query = query.ilike('display_name', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getMyFollowing(userId) {
  const { data } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  return data?.map(f => f.following_id) || [];
}

export default function DiscoverScreen({ navigation }) {
  const { user } = useAuth();
  const [users, setUsers]           = useState([]);
  const [following, setFollowing]   = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const [u, f] = await Promise.all([
        getUsers(search),
        getMyFollowing(user.id),
      ]);
      setUsers(u.filter(u => u.id !== user.id));
      setFollowing(f);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(text) {
    setSearch(text);
    const u = await getUsers(text);
    setUsers(u.filter(u => u.id !== user.id));
  }

		async function handleFollowToggle(targetId) {
		  const isFollowing = following.includes(targetId);
		  // Optimistic update
		  if (isFollowing) {
			setFollowing(f => f.filter(id => id !== targetId));
		  } else {
			setFollowing(f => [...f, targetId]);
		  }
		  try {
			if (isFollowing) {
			  await unfollowUser(user.id, targetId);
			} else {
			  await followUser(user.id, targetId);
			}
		  } catch (err) {
			// Revert on failure
			if (isFollowing) {
			  setFollowing(f => [...f, targetId]);
			} else {
			  setFollowing(f => f.filter(id => id !== targetId));
			}
			Alert.alert('Error', 'Could not update follow. Try again.');
		  }
		}

  function renderUser({ item }) {
    const isFollowing = following.includes(item.id);
    return (
      <TouchableOpacity
        style={s.userRow}
        onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
        activeOpacity={0.8}
      >
        {item.avatar_url
          ? <Image source={{ uri: item.avatar_url }} style={s.avatar} />
          : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>{(item.display_name || '?')[0].toUpperCase()}</Text>
            </View>
          )
        }
        <View style={s.userInfo}>
          <Text style={s.userName}>{item.display_name}</Text>
          {item.bio ? <Text style={s.userBio} numberOfLines={1}>{item.bio}</Text> : null}
        </View>
        <TouchableOpacity
          style={[s.followBtn, isFollowing && s.followingBtn]}
          onPress={() => handleFollowToggle(item.id)}
        >
          <Text style={[s.followBtnText, isFollowing && s.followingBtnText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Discover</Text>
        <Text style={s.subtitle}>Find and follow others on their faith journey</Text>
      </View>

      <View style={s.searchWrapper}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by name..."
          placeholderTextColor={colors.inkLight}
          value={search}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      {loading
        ? <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />
        : (
          <FlatList
            data={users}
            keyExtractor={item => item.id}
            renderItem={renderUser}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🔍</Text>
                <Text style={s.emptyText}>No users found</Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontFamily: type.displayFont,
    fontSize: type.displaySize,
    color: colors.inkDark,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  searchWrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkDark,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    ...shadow.gold,
  },
  avatarInitial: {
    fontFamily: fonts.uiBold,
    fontSize: 20,
    color: '#FFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
  },
  userBio: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    ...shadow.gold,
  },
  followingBtn: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  followBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#FFF',
  },
  followingBtnText: {
    color: colors.gold,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkLight,
  },
});