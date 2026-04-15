import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { dropStone } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, spacing, radius, shadow, CATEGORY_LABELS, getCategoryBg } from '../theme';

const CHAR_LIMIT = 500;

const CATEGORY_VERSES = {
  'faith':           { verse: 'Thus far the Lord has helped us.', ref: '1 Samuel 7:12' },
  'health':          { verse: 'He heals the brokenhearted and binds up their wounds.', ref: 'Psalm 147:3' },
  'finances':        { verse: 'My God will supply every need of yours.', ref: 'Philippians 4:19' },
  'relationships':   { verse: 'Love one another as I have loved you.', ref: 'John 15:12' },
  'family':          { verse: 'As for me and my house, we will serve the Lord.', ref: 'Joshua 24:15' },
  'work':            { verse: 'Whatever you do, work at it with all your heart.', ref: 'Colossians 3:23' },
  'answered-prayer': { verse: 'Call to me and I will answer you.', ref: 'Jeremiah 33:3' },
  'other':           { verse: 'Give thanks to the Lord, for He is good.', ref: 'Psalm 107:1' },
};

export default function DropStoneScreen({ navigation }) {
  const { user } = useAuth();
  const [text, setText]         = useState('');
  const [category, setCategory] = useState('faith');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [saving, setSaving]     = useState(false);

  const stoneScale   = useRef(new Animated.Value(1)).current;
  const stoneOpacity = useRef(new Animated.Value(1)).current;
  const verseOpacity = useRef(new Animated.Value(1)).current;

  const remaining     = CHAR_LIMIT - text.length;
  const categoryColor = colors[category] || colors.gold;
  const categoryBg    = getCategoryBg(category);

  function handleCategoryChange(key) {
    Animated.sequence([
      Animated.timing(verseOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(verseOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    setCategory(key);
    Haptics.selectionAsync();
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow photo access to add a photo to your stone.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled) setPhotoUrl(result.assets[0].uri);
  }

  async function handleDrop() {
    if (!text.trim()) {
      Alert.alert('Empty Stone', 'Write something before dropping your stone.');
      return;
    }
    setSaving(true);

    Animated.sequence([
      Animated.timing(stoneScale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
      Animated.timing(stoneScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(stoneScale,   { toValue: 3, duration: 400, useNativeDriver: true }),
        Animated.timing(stoneOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await dropStone({
        user_id:   user.id,
        text:      text.trim(),
        category,
        photo_url: null,
      });
      setTimeout(() => navigation.goBack(), 400);
    } catch (err) {
      stoneScale.setValue(1);
      stoneOpacity.setValue(1);
      Alert.alert('Error', err.message || 'Could not drop stone. Try again.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: categoryBg }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: categoryColor + '30' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.cancel, { color: categoryColor }]}>Cancel</Text>
          </TouchableOpacity>

          <Animated.Text style={[
            styles.stoneIcon,
            { transform: [{ scale: stoneScale }], opacity: stoneOpacity }
          ]}>
            🪨
          </Animated.Text>

          <TouchableOpacity
            style={[
              styles.dropBtn,
              { backgroundColor: categoryColor },
              (!text.trim() || saving) && styles.dropBtnDisabled
            ]}
            onPress={handleDrop}
            disabled={!text.trim() || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.dropBtnText}>Drop</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Animated verse */}
          <Animated.View style={[styles.verseContainer, { opacity: verseOpacity }]}>
            <Text style={[styles.verse, { color: categoryColor }]}>
              "{CATEGORY_VERSES[category].verse}"
            </Text>
            <Text style={[styles.verseRef, { color: categoryColor }]}>
              {CATEGORY_VERSES[category].ref}
            </Text>
          </Animated.View>

          {/* Text input */}
          <View style={[styles.inputWrapper, { borderColor: categoryColor + '40' }]}>
            <TextInput
              style={styles.input}
              placeholder="Where did you see God move..."
              placeholderTextColor={categoryColor + '60'}
              multiline
              maxLength={CHAR_LIMIT}
              value={text}
              onChangeText={setText}
              autoFocus
            />
            <Text style={[
              styles.charCount,
              { color: categoryColor + '80' },
              remaining < 50 && { color: colors.error }
            ]}>
              {remaining}
            </Text>
          </View>

          {/* Category selector */}
          <Text style={[styles.sectionLabel, { color: categoryColor }]}>Category</Text>
          <View style={styles.categoryGrid}>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
              const isSelected = category === key;
              const catColor = colors[key] || colors.gold;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryChip,
                    { borderColor: catColor + '60' },
                    isSelected && {
                      backgroundColor: catColor,
                      borderColor: catColor,
                      ...shadow.card,
                    }
                  ]}
                  onPress={() => handleCategoryChange(key)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: isSelected ? '#FFF' : catColor }
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Photo */}
          <Text style={[styles.sectionLabel, { color: categoryColor }]}>Photo (Optional)</Text>
          <TouchableOpacity
            style={[styles.photoBtn, { borderColor: categoryColor + '60' }]}
            onPress={handlePickPhoto}
          >
            <Text style={[styles.photoBtnText, { color: categoryColor }]}>
              {photoUrl ? '✓ Photo Selected — Tap to Change' : '+ Add a Photo'}
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cancel: {
    fontFamily: fonts.ui,
    fontSize: 15,
    width: 70,
    textAlign: 'left',
  },
  stoneIcon: { fontSize: 32 },
  dropBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    minWidth: 72,
    alignItems: 'center',
    ...shadow.gold,
  },
  dropBtnDisabled: { opacity: 0.4 },
  dropBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#FFF',
  },
  body: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  verseContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    width: '100%',
  },
  verse: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  verseRef: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    textAlign: 'center',
  },
  inputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 140,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkDark,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: fonts.caption,
    fontSize: 11,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  categoryChipText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
  },
  photoBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  photoBtnText: {
    fontFamily: fonts.ui,
    fontSize: 14,
  },
});