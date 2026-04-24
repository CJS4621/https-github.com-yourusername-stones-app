import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Linking, Platform } from 'react-native';
import { useFonts, Lora_400Regular, Lora_700Bold } from '@expo-google-fonts/lora';
import { DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/lib/supabase';
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

export default function App() {
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

      // Register push token when user signs in
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
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}