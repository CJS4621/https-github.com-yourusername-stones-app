const NODE_RED_URL = process.env.NODE_RED_URL;
import { supabase } from './supabase';

// ── Authenticated fetch wrapper ─────────────────────────────

async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const res = await fetch(`${NODE_RED_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Stones ──────────────────────────────────────────────────

/**
 * Fetch paginated public wall feed
 * @param {number} page - 1-indexed page number
 * @param {string|null} category - optional category filter
 */
export async function getWall(page = 1, category = null) {
  const params = new URLSearchParams({ page, limit: 20 });
  if (category) params.append('category', category);
  return apiFetch(`/stones/wall?${params}`);
}

/**
 * Fetch a user's journey timeline (oldest → newest)
 * @param {string} userId
 */
export async function getJourney(userId) {
  return apiFetch(`/stones/journey/${userId}`);
}

/**
 * Drop a new stone
 * @param {object} stone - { user_id, text, category, photo_url? }
 */
export async function dropStone(stone) {
  return apiFetch('/stones', { method: 'POST', body: stone });
}

/**
 * Upload a photo to Cloudinary via Node-RED
 * @param {string} base64Uri - local image URI from expo-image-picker
 */
export async function uploadPhoto(base64Uri) {
  const res = await apiFetch('/upload', {
    method: 'POST',
    body: { image: base64Uri },
  });
  if (!res.success) throw new Error(res.error || 'Upload failed');
  return res.url;
}


/**
 * Delete own stone
 * @param {string} stoneId
 */
export async function deleteStone(stoneId) {
  return apiFetch(`/stones/${stoneId}`, { method: 'DELETE' });
}

// ── Prayers ─────────────────────────────────────────────────

/**
 * Toggle prayer for a stone — returns updated pray_count
 * @param {string} stoneId
 * @param {string} userId
 */
export async function togglePrayer(stoneId, userId) {
  return apiFetch(`/pray/${stoneId}`, { method: 'POST', body: { user_id: userId } });
}

/**
 * Get all stones the user has prayed for (stored locally via Supabase)
 * @param {string} userId
 */
export async function getMyPrayers(userId) {
  // Step 1: get prayer records
  const { data: prayerData, error: prayerError } = await supabase
    .from('prayers')
    .select('stone_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (prayerError) throw prayerError;
  if (!prayerData || prayerData.length === 0) return [];

  // Step 2: get the stones for those prayer records
  const stoneIds = prayerData.map(p => p.stone_id);
  const { data: stonesData, error: stonesError } = await supabase
    .from('stones')
    .select('id, text, category, created_at, user_id')
    .in('id', stoneIds);

  if (stonesError) throw stonesError;

  // Step 3: get display names for those stones
  const userIds = [...new Set(stonesData.map(s => s.user_id))];
  const { data: usersData } = await supabase
    .from('users')
    .select('id, display_name')
    .in('id', userIds);

  // Combine everything
  return prayerData.map(p => {
    const stone = stonesData.find(s => s.id === p.stone_id);
    const user = usersData?.find(u => u.id === stone?.user_id);
    return {
      stone_id: p.stone_id,
      created_at: p.created_at,
      stones: {
        ...stone,
        users: { display_name: user?.display_name || 'Someone' }
      }
    };
  });
}


// ── Users / Profile ─────────────────────────────────────────

/**
 * Get a user's public profile
 * @param {string} userId
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, bio, created_at')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update own profile
 * @param {string} userId
 * @param {object} updates - { display_name?, bio?, avatar_url? }
 */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Follows ─────────────────────────────────────────────────

export async function followUser(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });
  if (error) throw error;
}

export async function unfollowUser(followerId, followingId) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function getFollowCounts(userId) {
  const [{ count: followers }, { count: following }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers, following };
}

export async function sendInvite(senderId, senderName, recipientEmail, message) {
  return apiFetch('/invite', {
    method: 'POST',
    body: {
      sender_id:       senderId,
      sender_name:     senderName,
      recipient_email: recipientEmail,
      message,
    },
  });
}

// ── Circles ─────────────────────────────────────────────────

export async function getMyCircles(userId) {
  return apiFetch(`/circles?user_id=${userId}`);
}

export async function createCircle(ownerId, name, logoUrl = null) {
  return apiFetch('/circles', {
    method: 'POST',
    body: { owner_id: ownerId, name, logo_url: logoUrl },
  });
}

export async function inviteToCircle(circleId, userId) {
  return apiFetch(`/circles/${circleId}/invite`, {
    method: 'POST',
    body: { user_id: userId },
  });
}

export async function deleteCircle(circleId) {
  return apiFetch(`/circles/${circleId}`, { method: 'DELETE' });
}

export async function leaveCircle(circleId, userId) {
  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getCircleMembers(circleId) {
  return apiFetch(`/circles/${circleId}/members`);
}

export async function markPrayerAnswered(userId, stoneId) {
  const { error } = await supabase.rpc('mark_prayer_answered', {
    p_user_id: userId,
    p_stone_id: stoneId,
  });
  if (error) throw error;
}

export async function editStone(stoneId, text, category, scriptureRef = null, photoUrl = null) {
  const body = { text, category };
  if (scriptureRef !== undefined) body.scripture_ref = scriptureRef;
  if (photoUrl !== undefined) body.photo_url = photoUrl;
  return apiFetch(`/stones/${stoneId}`, {
    method: 'PATCH',
    body,
  });
}

export async function markStoneAnswered(stoneId, answeredBy) {
  return apiFetch(`/stones/${stoneId}/answered`, {
    method: 'PATCH',
    body: { answered_by: answeredBy },
  });
}

export async function getAnsweredWall(page = 1) {
  const params = new URLSearchParams({ page, limit: 20 });
  return apiFetch(`/stones/answered?${params}`);
}

export async function sendEncouragement(stoneId, userId) {
  return apiFetch(`/encourage/${stoneId}`, {
    method: 'POST',
    body: { user_id: userId },
  });
}

export async function editCircle(circleId, name, logoUrl = null) {
  return apiFetch(`/circles/${circleId}`, {
    method: 'PATCH',
    body: { name, logo_url: logoUrl },
  });
}