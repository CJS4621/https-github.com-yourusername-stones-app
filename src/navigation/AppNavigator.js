import React, { useState } from 'react';
import {
  TouchableOpacity, Text, View, StyleSheet, Modal, Pressable, Linking
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import HowToScreen from '../screens/HowToScreen';
import WallScreen          from '../screens/WallScreen';
import JourneyScreen       from '../screens/JourneyScreen';
import DiscoverScreen      from '../screens/DiscoverScreen';
import DropStoneScreen     from '../screens/DropStoneScreen';
import PrayerQueueScreen   from '../screens/PrayerQueueScreen';
import ProfileScreen       from '../screens/ProfileScreen';
import StoneDetailScreen   from '../screens/StoneDetailScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import CirclesScreen       from '../screens/CirclesScreen';
import CircleDetailScreen  from '../screens/CircleDetailScreen';
import DiscoverCirclesScreen from '../screens/DiscoverCirclesScreen';
import AnsweredWallScreen  from '../screens/AnsweredWallScreen';
import AuthScreen          from '../screens/AuthScreen';
import { useAuth }         from '../context/AuthContext';
import SettingsScreen from '../screens/SettingsScreen';
import BadgesScreen from '../screens/BadgesScreen';
import { useHeartbeat } from '../lib/useHeartbeat';

const Tab       = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function TabIcon({ label, emoji, focused }) {
  return (
    <View style={{ alignItems: 'center', width: 60 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MoreModal({ visible, onClose, navigation }) {
  const items = [
    { emoji: '🕊️', label: 'Answered Prayers', screen: 'AnsweredWall' },
    { emoji: '🗺️', label: 'Journey',           screen: 'Journey' },
    { emoji: '🙏', label: 'Prayer Queue',      screen: 'PrayerQueue' },
    { emoji: '📖', label: 'How To Use', screen: 'HowTo' },
	{ emoji: '⚙️', label: 'Settings', screen: 'Settings' },
	];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={moreStyles.overlay} onPress={onClose}>
        <View style={moreStyles.sheet}>
          <View style={moreStyles.handle} />
          <Text style={moreStyles.title}>More</Text>
          {items.map(item => (
            <TouchableOpacity
              key={item.label}
              style={moreStyles.item}
              onPress={() => {
                onClose();
                if (item.screen) navigation.navigate(item.screen);
                if (item.url) Linking.openURL(item.url);
              }}
            >
              <Text style={moreStyles.itemEmoji}>{item.emoji}</Text>
              <Text style={moreStyles.itemLabel}>{item.label}</Text>
              <Text style={moreStyles.itemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function MainTabs({ navigation }) {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <MoreModal
        visible={showMore}
        onClose={() => setShowMore(false)}
        navigation={navigation}
      />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: tabStyles.bar,
          tabBarShowLabel: false,
          tabBarItemStyle: { flex: 1 },
        }}
      >
        {/* 1 — Wall */}
        <Tab.Screen
          name="Wall"
          component={WallScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Wall" focused={focused} /> }}
        />

        {/* 2 — Circles */}
        <Tab.Screen
          name="Circles"
          component={CirclesScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💛" label="Circles" focused={focused} /> }}
        />

        {/* 3 — Drop Stone FAB */}
        <Tab.Screen
          name="DropTab"
          component={View}
          options={{
            tabBarButton: () => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <TouchableOpacity
                  style={tabStyles.dropFab}
                  onPress={() => navigation.navigate('DropStone')}
                >
                  <Text style={tabStyles.dropFabText}>🪨</Text>
                </TouchableOpacity>
              </View>
            ),
          }}
        />

        {/* 4 — Discover */}
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="Discover" focused={focused} /> }}
        />

        {/* 5 — Me */}
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🙋" label="Me" focused={focused} /> }}
        />

        {/* 6 — More */}
        <Tab.Screen
          name="MoreTab"
          component={View}
          options={{
            tabBarButton: () => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <TouchableOpacity
                  style={{ alignItems: 'center' }}
                  onPress={() => setShowMore(true)}
                >
                  <Text style={{ fontSize: 20, opacity: 0.6 }}>⋯</Text>
                  <Text style={tabStyles.label}>More</Text>
                </TouchableOpacity>
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
}

export default function AppNavigator() {
	useHeartbeat();   // 🔥 daily streak tracking
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
			<RootStack.Screen name="Badges" component={BadgesScreen} options={{ title: 'Badges' }} />
			
            <RootStack.Screen
              name="DropStone"
              component={DropStoneScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="StoneDetail"
              component={StoneDetailScreen}
              options={{ presentation: 'card' }}
            />
            <RootStack.Screen
              name="PublicProfile"
              component={PublicProfileScreen}
              options={{ presentation: 'card' }}
            />
            <RootStack.Screen
              name="CircleDetail"
              component={CircleDetailScreen}
              options={{ presentation: 'card' }}
            />
            <RootStack.Screen
              name="DiscoverCircles"
              component={DiscoverCirclesScreen}
              options={{ presentation: 'card' }}
            />
            <RootStack.Screen
              name="Journey"
              component={JourneyScreen}
              options={{ presentation: 'card' }}
            />
            <RootStack.Screen
              name="PrayerQueue"
              component={PrayerQueueScreen}
              options={{ presentation: 'card' }}
            />
            <RootStack.Screen
              name="AnsweredWall"
              component={AnsweredWallScreen}
              options={{ presentation: 'card' }}
            />
			<RootStack.Screen
			  name="HowTo"
			  component={HowToScreen}
			  options={{ presentation: 'card' }}
			/>
			<RootStack.Screen
			  name="Settings"
			  component={SettingsScreen}
			  options={{ presentation: 'card' }}
			/>
          </>
        ) : (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bgCard,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
  },
  label: {
    fontFamily: fonts.caption,
    fontSize: 10,
    color: colors.inkLight,
    marginTop: 2,
  },
  labelActive: {
    color: colors.gold,
    fontFamily: fonts.uiBold,
  },
  dropFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  dropFabText: { fontSize: 22 },
});

const moreStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.uiBold,
    fontSize: 18,
    color: colors.inkDark,
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemEmoji: { fontSize: 24, marginRight: 16 },
  itemLabel: {
    flex: 1,
    fontFamily: fonts.uiBold,
    fontSize: 16,
    color: colors.inkDark,
  },
  itemArrow: {
    fontFamily: fonts.uiBold,
    fontSize: 24,
    color: colors.inkLight,
  },
});