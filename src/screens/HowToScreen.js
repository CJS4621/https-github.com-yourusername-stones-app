import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, useState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { colors, fonts, type, spacing } from '../theme';

export default function HowToScreen({ navigation }) {
  const [loading, setLoading] = React.useState(true);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>How To Use</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading && (
        <ActivityIndicator
          color={colors.gold}
          style={s.loader}
        />
      )}

      <WebView
        source={{ uri: 'https://stonesapp.ca/how-to.html?v=2' }}
        onLoadEnd={() => setLoading(false)}
        style={{ flex: 1 }}
      />
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.gold,
    width: 60,
  },
  title: {
    fontFamily: type.displayFont,
    fontSize: 22,
    color: colors.inkDark,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 10,
  },
});