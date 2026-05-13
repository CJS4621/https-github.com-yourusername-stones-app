import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Linking, Platform } from 'react-native';
import { useFonts, Lora_400Regular, Lora_700Bold } from '@expo-google-fonts/lora';
import { DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/lib/supabase';
import { setFocusStone } from './src/lib/wallFocus';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

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

// Route a notification payload to the right place in the app
function handleNotificationPayload(data, navigationRef) {
  if (!data) return;
  const { stone_id, screen } = data;

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
  }
}

export default function App() {
  const navigationRef = useRef(null);

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
        // Small delay so navigator is mounted before we navigate
        setTimeout(() => handleNotificationPayload(data, navigationRef), 600);
      }
    });

    // Handle deep link when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (url) supabase.auth.getSession();
    });

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then((url) => {
      if (url) supabase.auth.getSession();
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
