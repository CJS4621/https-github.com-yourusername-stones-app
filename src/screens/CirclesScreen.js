import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { getMyCircles, createCircle, uploadPhoto } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow } from '../theme';

export default function CirclesScreen({ navigation }) {
  const { user } = useAuth();
  const [circles, setCircles]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [circleName, setCircleName]   = useState('');
  const [circleLogo, setCircleLogo]   = useState(null);
  const [creating, setCreating]       = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCircles();
    }, [user])
  );

  async function loadCircles() {
    setLoading(true);
    try {
      const data = await getMyCircles(user.id);
      setCircles(data);
    } catch (err) {
      console.log('Error loading circles:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access.');
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
    setLogoUploading(true);
    try {
      const base64Uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const url = await uploadPhoto(base64Uri);
      setCircleLogo(url);
    } catch (err) {
      Alert.alert('Error', 'Could not upload photo.');
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleCreateCircle() {
    if (!circleName.trim()) {
      Alert.alert('Required', 'Please enter a circle name.');
      return;
    }
    setCreating(true);
    try {
      await createCircle(user.id, circleName.trim(), circleLogo);
      setShowCreate(false);
      setCircleName('');
      setCircleLogo(null);
      loadCircles();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not create circle.');
    } finally {
      setCreating(false);
    }
  }

  function renderCircle({ item }) {
    const circle = item.circles || item;
    const memberCount = 0;
    return (
      <TouchableOpacity
        style={s.circleCard}
        onPress={() => navigation.navigate('CircleDetail', { circle, role: item.role })}
        activeOpacity={0.85}
      >
        {circle.logo_url
          ? <Image source={{ uri: circle.logo_url }} style={s.circleLogo} />
          : (
            <View style={s.circleLogoPlaceholder}>
              <Text style={s.circleLogoText}>{(circle.name || '?')[0].toUpperCase()}</Text>
            </View>
          )
        }
        <View style={s.circleInfo}>
          <Text style={s.circleName}>{circle.name}</Text>
          <Text style={s.circleRole}>
            {item.role === 'admin' ? '👑 Admin' : '👤 Member'}
          </Text>
        </View>
        <Text style={s.circleArrow}>›</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>

      {/* Create Circle Modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Create a Circle 🫂</Text>
            <Text style={s.modalSubtitle}>A private space for your community</Text>

            <TouchableOpacity style={s.logoPickerBtn} onPress={handlePickLogo}>
              {logoUploading
                ? <ActivityIndicator color={colors.gold} />
                : circleLogo
                  ? <Image source={{ uri: circleLogo }} style={s.logoPreview} />
                  : <Text style={s.logoPickerText}>📷 Add Circle Photo</Text>
              }
            </TouchableOpacity>

            <TextInput
              style={s.modalInput}
              placeholder="Circle name (e.g. Life Group, Family)"
              placeholderTextColor={colors.inkLight}
              value={circleName}
              onChangeText={setCircleName}
              autoCapitalize="words"
              maxLength={50}
            />

            <TouchableOpacity
              style={[s.modalBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreateCircle}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color="#FFF" />
                : <Text style={s.modalBtnText}>Create Circle</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={s.modalCancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Circles</Text>
          <Text style={s.subtitle}>Your private faith communities</Text>
        </View>
        <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.createBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator style={{ flex: 1 }} color={colors.gold} />
        : (
          <FlatList
            data={circles}
            keyExtractor={item => item.circle_id || item.id}
            renderItem={renderCircle}
            contentContainerStyle={{ paddingBottom: spacing.xxl }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyIcon}>🫂</Text>
                <Text style={s.emptyTitle}>No Circles yet</Text>
                <Text style={s.emptyText}>
                  Create a circle to share testimony privately with your life group, family or close friends.
                </Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                  <Text style={s.emptyBtnText}>Create your first Circle</Text>
                </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  createBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    ...shadow.gold,
  },
  createBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  circleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  circleLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: spacing.md,
  },
  circleLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    ...shadow.gold,
  },
  circleLogoText: {
    fontFamily: fonts.uiBold,
    fontSize: 24,
    color: '#FFF',
  },
  circleInfo: { flex: 1 },
  circleName: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.inkDark,
    marginBottom: 4,
  },
  circleRole: {
    fontFamily: fonts.caption,
    fontSize: type.captionSize,
    color: colors.inkLight,
  },
  circleArrow: {
    fontFamily: fonts.uiBold,
    fontSize: 24,
    color: colors.inkLight,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: {
    fontFamily: type.displayFont,
    fontSize: 24,
    color: colors.inkDark,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: type.uiSize,
    color: colors.inkLight,
    textAlign: 'center',
    lineHeight: type.uiSize * 1.7,
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadow.gold,
  },
  emptyBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
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
  logoPickerBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bgCard,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  logoPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  logoPickerText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkLight,
    textAlign: 'center',
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
  modalCancelBtn: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  modalCancelText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkLight,
  },
});