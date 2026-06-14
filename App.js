import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Linking, Platform } from 'react-native';
import { useFonts, Lora_400Regular, Lora_700Bold } from '@expo-google-fonts/lora';
import { DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import CinematicSplash from './src/screens/CinematicSplash';
import { supabase } from './src/lib/supabase';
import { setFocusStone } from './src/lib/wallFocus';
import { acceptInvitation } from './src/lib/api';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// V32 — Pending invitation token (set by deep-link handler, consumed when user is signed in)
let pendingInvitationToken = null;
function setPendingInvitationToken(t) { pendingInvitationToken = t; }
function takePendingInvitationToken() {
  const t = pendingInvitationToken;
  pendingInvitationToken = null;
  return t;
}

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({
    projectId: '196c95f1-da05-476c-b4fc-2f2d1a791edb',
  })).data;

  return token;
}

// V32 — Parse a deep link URL and extract an invitation token if present.
// Handles both `stones://accept-invitation?token=XXX` and
// `https://stonesapp.ca/accept-invitation.html?token=XXX` (universal link future).
function parseInvitationToken(url) {
  if (!url) return null;
  try {
    // Accept several URL patterns
    const isInvitation = url.includes('accept-invitation') || url.includes('accept_invitation');
    if (!isInvitation) return null;
    const queryIdx = url.indexOf('?');
    if (queryIdx === -1) return null;
    const params = new URLSearchParams(url.substring(queryIdx + 1));
    const token = params.get('token');
    return token && token.length >= 8 ? token : null;
  } catch (e) {
    console.warn('parseInvitationToken error:', e.message);
    return null;
  }
}

// V32 — Attempt to redeem a pending invitation. Called once the user is signed in.
// Silently no-ops if there's no pending token. Shows alert on result.
async function tryAcceptPendingInvitation(navigationRef) {
  const token = takePendingInvitationToken();
  if (!token) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      // User not signed in — put it back, will retry on next auth event
      setPendingInvitationToken(token);
      return;
    }

    console.log('🫂 Attempting to accept pending invitation...');
    const result = await acceptInvitation(token, session.user.id);

    if (result?.success) {
      const circleName = result.circle_name || 'the circle';
      console.log(`✅ Joined ${circleName}`);
      // Navigate to the circle
      setTimeout(() => {
        try {
          navigationRef.current?.navigate?.('CircleDetail', {
            circle: { id: result.circle_id, _isStub: true },
            role: 'member',
          });
        } catch (e) {
          // Fallback to Circles tab
          try {
            navigationRef.current?.navigate?.('Main', { screen: 'Circles' });
          } catch (_) {}
        }
      }, 600);
    }
  } catch (err) {
    console.warn('Pending invitation accept failed:', err.message);
    // Don't surface to user — they may not have known about the invitation.
    // Log only; if it failed because email doesn't match etc, silent fail is correct.
  }
}

// Route a notification payload to the right place in the app
function handleNotificationPayload(data, navigationRef) {
  if (!data) return;
  const { stone_id, circle_id, screen } = data;

  // Encouragement → focus a stone on the Wall
  if (stone_id && (screen === 'Wall' || screen === 'StoneDetail')) {
    // Signal the Wall to focus this stone
    setFocusStone(stone_id);
    // Jump to the Wall tab. Navigator is wrapped in a NavigationContainer
    // ref so we can navigate from outside the component tree.
    try {
      // Try to navigate — tab name 'Main' wraps the tab navigator
      navigationRef.current?.navigate?.('Main', { screen: 'Wall' });
    } catch (e) {
      // Fallback: just navigate to Wall directly
      try { navigationRef.current?.navigate?.('Wall'); } catch (_) {}
    }
    return;
  }

  // Circle request / approval / denial → open that specific circle.
  // The notification only carries circle_id, so we pass a "stub" circle
  // object marked with _isStub. CircleDetailScreen detects the stub and
  // hydrates the full circle record before rendering.
  if (circle_id && screen === 'CircleDetail') {
    try {
      navigationRef.current?.navigate?.('CircleDetail', {
        circle: { id: circle_id, _isStub: true },
        // Request notifications are sent to the circle admin. Approve/deny
        // notifications go to a member. CircleDetailScreen re-derives the
        // true admin status after hydration, so this is just an initial hint.
        role: data.role || 'member',
      });
    } catch (e) {
      // Fallback: open the Circles tab so the user can find it manually
      try {
        navigationRef.current?.navigate?.('Main', { screen: 'Circles' });
      } catch (_) {}
    }
    return;
  }
}

export default function App() {
  const navigationRef = useRef(null);
  // V32 — Cinematic splash on cold launch (skipped if notification cold-start)
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_700Bold,
    DMSans_400Regular,
    DMSans_700Bold,
  });

  useEffect(() => {
    // Handle invalid/expired session — auto sign out
    supabase.auth.getSession().then(({ data, error }) => {
      if (
        error?.message?.includes('Refresh Token Not Found') ||
        error?.message?.includes('Invalid Refresh Token')
      ) {
        supabase.auth.signOut();
      }
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      if (event === 'SIGNED_OUT') return;
      if (event === 'INITIAL_SESSION' && !session) {
        supabase.auth.signOut();
        return;
      }

      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        try {
          const token = await registerForPushNotifications();
          if (token) {
            await supabase
              .from('users')
              .update({ push_token: token })
              .eq('id', session.user.id);
            console.log('Push token saved:', token);
          }
        } catch (err) {
          console.log('Push token error:', err);
        }

        // V32 — If a deep-link invitation token is queued, redeem it now
        tryAcceptPendingInvitation(navigationRef);
      }
    });

    // ── Notification listeners ──────────────────────────────

    // FOREGROUND: a push arrives while the app is open and visible
    const fgSub = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request?.content?.data;
      console.log('🔔 Foreground push received:', data);
      // Auto-scroll silently (per design choice) — no banner, no interrupt
      handleNotificationPayload(data, navigationRef);
    });

    // TAPPED: user tapped a notification (works whether app was bg or killed)
    const tapSub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification?.request?.content?.data;
      console.log('🔔 Notification tapped:', data);
      handleNotificationPayload(data, navigationRef);
    });

    // COLD-START: app was launched by tapping a notification
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        const data = response.notification?.request?.content?.data;
        console.log('🔔 Cold-start notification:', data);
        // V32 — Skip cinematic splash; user wants their notification, not 7.9s of animation
        setSplashDone(true);
        // Small delay so navigator is mounted before we navigate
        setTimeout(() => handleNotificationPayload(data, navigationRef), 600);
      }
    });

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!url) return;

      // V32 — Check for invitation token first
      const inviteToken = parseInvitationToken(url);
      if (inviteToken) {
        console.log('🫂 Invitation deep link detected (warm)');
        setPendingInvitationToken(inviteToken);
        tryAcceptPendingInvitation(navigationRef);
        return;
      }

      // Otherwise, treat as Supabase magic-link
      supabase.auth.getSession();
    });

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (!url) return;

      // V32 — Check for invitation token first
      const inviteToken = parseInvitationToken(url);
      if (inviteToken) {
        console.log('🫂 Invitation deep link detected (cold-start)');
        setPendingInvitationToken(inviteToken);
        // Will be redeemed when auth settles (see SIGNED_IN handler above)
        return;
      }

      // Otherwise, treat as Supabase magic-link
      supabase.auth.getSession();
    });

    return () => {
      subscription.remove();
      authListener?.subscription?.unsubscribe();
      fgSub.remove();
      tapSub.remove();
    };
  }, []);

  if (fontError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Font error: {fontError.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  // V32 — Cinematic splash plays once fonts are loaded, before the main app mounts.
  // splashDone is also set to true when a notification cold-start is detected.
  if (!splashDone) {
    return (
      <SafeAreaProvider>
        <CinematicSplash onFinish={() => setSplashDone(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <NavigationContainer ref={navigationRef}>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}