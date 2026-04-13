import { NODE_RED_URL } from '@env';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { dropStone } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius, shadow, CATEGORY_LABELS } from '../theme';

const CHAR_LIMIT = 500;

export default function DropStoneScreen({ navigation }) {
  const { user } = useAuth();
  const [text, setText]         = useState('');
  const [category, setCategory] = useState('faith');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [saving, setSaving]     = useState(false);

  const remaining = CHAR_LIMIT - text.length;

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    Alert.alert('Debug 1', `Permission: ${status}`);
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to add a photo to your stone.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 9],
      base64: true,
    });
    Alert.alert('Debug 2', `Canceled: ${result.canceled}`);
    if (!result.canceled) {
      Alert.alert('Debug 3', `Keys: ${JSON.stringify(Object.keys(result.assets[0]))}`);
    }
  }

  async function handleDrop() {
    if (!text.trim()) {
      Alert.alert('Empty stone', 'Write something before dropping your stone.');
      return;
    }
    setSaving(true);
    try {
      await dropStone({
        user_id:   user.id,
        text:      text.trim(),
        category,
        photo_url: photoUrl,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not drop stone. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Drop a Stone</Text>
          <TouchableOpacity
            style={[styles.dropBtn, (!text.trim() || saving) && styles.dropBtnDisabled]}
            onPress={handleDrop}
            disabled={!text.trim() || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.dropBtnText}>Drop 🪨</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.prompt}>
            "Thus far the Lord has helped us." — 1 Sam 7:12
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput