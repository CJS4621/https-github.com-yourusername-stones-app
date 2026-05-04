import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Animated, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { dropStone, uploadPhoto } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { colors, fonts, type, spacing, radius, shadow, CATEGORY_LABELS, getCategoryBg } from '../theme';

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

// Topic-based verse map — zero API cost, works offline
const VERSE_TOPICS = [
  { topic: "God's Promise", verses: [
    { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, plans to prosper you and not to harm you.' },
    { ref: 'Romans 8:28', text: 'All things work together for good to those who love God.' },
    { ref: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid; do not be discouraged.' },
  ]},
  { topic: 'Healing', verses: [
    { ref: 'Psalm 147:3', text: 'He heals the brokenhearted and binds up their wounds.' },
    { ref: 'Jeremiah 17:14', text: 'Heal me, Lord, and I will be healed; save me and I will be saved.' },
    { ref: 'Isaiah 53:5', text: 'By his wounds we are healed.' },
  ]},
  { topic: 'Strength', verses: [
    { ref: 'Philippians 4:13', text: 'I can do all things through Christ who strengthens me.' },
    { ref: 'Isaiah 40:31', text: 'Those who hope in the Lord will renew their strength.' },
    { ref: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
  ]},
  { topic: 'Peace', verses: [
    { ref: 'Philippians 4:7', text: 'The peace of God, which transcends all understanding, will guard your hearts.' },
    { ref: 'John 14:27', text: 'Peace I leave with you; my peace I give you.' },
    { ref: 'Isaiah 26:3', text: 'You will keep in perfect peace those whose minds are steadfast.' },
  ]},
  { topic: 'Provision', verses: [
    { ref: 'Philippians 4:19', text: 'My God will supply every need of yours according to his riches in glory.' },
    { ref: 'Matthew 6:33', text: 'Seek first his kingdom and his righteousness, and all these things will be given to you.' },
    { ref: 'Psalm 23:1', text: 'The Lord is my shepherd; I lack nothing.' },
  ]},
  { topic: 'Fear & Anxiety', verses: [
    { ref: '2 Timothy 1:7', text: 'God has not given us a spirit of fear, but of power, love and self-discipline.' },
    { ref: 'Psalm 34:4', text: 'I sought the Lord, and he answered me; he delivered me from all my fears.' },
    { ref: '1 Peter 5:7', text: 'Cast all your anxiety on him because he cares for you.' },
  ]},
  { topic: 'Hope', verses: [
    { ref: 'Romans 15:13', text: 'May the God of hope fill you with all joy and peace as you trust in him.' },
    { ref: 'Lamentations 3:22-23', text: 'His compassions never fail. They are new every morning; great is your faithfulness.' },
    { ref: 'Psalm 31:24', text: 'Be strong and take heart, all you who hope in the Lord.' },
  ]},
  { topic: 'Forgiveness', verses: [
    { ref: '1 John 1:9', text: 'If we confess our sins, he is faithful and just to forgive us our sins.' },
    { ref: 'Psalm 103:12', text: 'As far as the east is from the west, so far has he removed our transgressions.' },
    { ref: 'Ephesians 1:7', text: 'In him we have redemption through his blood, the forgiveness of sins.' },
  ]},
  { topic: 'Guidance', verses: [
    { ref: 'Proverbs 3:5-6', text: 'Trust in the Lord with all your heart and lean not on your own understanding.' },
    { ref: 'Psalm 32:8', text: 'I will instruct you and teach you in the way you should go.' },
    { ref: 'John 16:13', text: 'When the Spirit of truth comes, he will guide you into all the truth.' },
  ]},
  { topic: 'Faith', verses: [
    { ref: 'Hebrews 11:1', text: 'Faith is confidence in what we hope for and assurance about what we do not see.' },
    { ref: 'Matthew 17:20', text: 'If you have faith as small as a mustard seed, nothing will be impossible for you.' },
    { ref: '1 Samuel 7:12', text: 'Thus far the Lord has helped us.' },
  ]},
  { topic: 'Love', verses: [
    { ref: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son.' },
    { ref: 'Romans 8:38-39', text: 'Nothing will be able to separate us from the love of God.' },
    { ref: '1 Corinthians 13:4', text: 'Love is patient, love is kind. It does not envy, it does not boast.' },
  ]},
  { topic: 'Prayer', verses: [
    { ref: 'Jeremiah 33:3', text: 'Call to me and I will answer you and tell you great and unsearchable things.' },
    { ref: 'Matthew 7:7', text: 'Ask and it will be given to you; seek and you will find.' },
    { ref: 'Philippians 4:6', text: 'In every situation, by prayer and petition, present your requests to God.' },
  ]},
  { topic: 'Gratitude', verses: [
    { ref: 'Psalm 107:1', text: 'Give thanks to the Lord, for he is good; his love endures forever.' },
    { ref: '1 Thessalonians 5:18', text: 'Give thanks in all circumstances; for this is God\'s will for you.' },
    { ref: 'Psalm 103:2', text: 'Praise the Lord, my soul, and forget not all his benefits.' },
  ]},
  { topic: 'Perseverance', verses: [
    { ref: 'Romans 5:3-4', text: 'Suffering produces perseverance; perseverance, character; and character, hope.' },
    { ref: 'Galatians 6:9', text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest.' },
    { ref: 'James 1:12', text: 'Blessed is the one who perseveres under trial.' },
  ]},
  { topic: 'Family', verses: [
    { ref: 'Joshua 24:15', text: 'As for me and my house, we will serve the Lord.' },
    { ref: 'Psalm 127:3', text: 'Children are a heritage from the Lord, offspring a reward from him.' },
    { ref: 'Proverbs 22:6', text: 'Start children off on the way they should go.' },
  ]},
  { topic: 'Work & Purpose', verses: [
    { ref: 'Colossians 3:23', text: 'Whatever you do, work at it with all your heart, as working for the Lord.' },
    { ref: 'Ephesians 2:10', text: 'We are God\'s handiwork, created in Christ Jesus to do good works.' },
    { ref: 'Proverbs 16:3', text: 'Commit to the Lord whatever you do, and he will establish your plans.' },
  ]},
  { topic: 'Salvation', verses: [
    { ref: 'Romans 10:9', text: 'If you declare with your mouth, "Jesus is Lord," and believe in your heart, you will be saved.' },
    { ref: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son.' },
    { ref: 'Ephesians 2:8', text: 'For it is by grace you have been saved, through faith.' },
  ]},
  { topic: 'Answered Prayer', verses: [
    { ref: '1 Samuel 7:12', text: 'Thus far the Lord has helped us.' },
    { ref: 'Psalm 34:6', text: 'This poor man called, and the Lord heard him; he saved him out of all his troubles.' },
    { ref: 'Matthew 21:22', text: 'If you believe, you will receive whatever you ask for in prayer.' },
  ]},
];

export default function DropStoneScreen({ navigation }) {
  const { user } = useAuth();
  const [text, setText]                     = useState('');
  const [stoneType, setStoneType]           = useState('stone');
  const [category, setCategory]             = useState('faith');
  const [photoUri, setPhotoUri]             = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [scriptureRef, setScriptureRef]     = useState('');
  const [scriptureText, setScriptureText]   = useState('');
  const [saving, setSaving]                 = useState(false);
  const [showVersePicker, setShowVersePicker] = useState(false);
  const [selectedTopic, setSelectedTopic]   = useState(null);

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
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  function handleSelectVerse(verse) {
    setScriptureRef(verse.ref);
    setScriptureText(verse.text);
    setShowVersePicker(false);
    setSelectedTopic(null);
    Haptics.selectionAsync();
  }

  function handleClearScripture() {
    setScriptureRef('');
    setScriptureText('');
  }

  async function handleDrop() {
    if (!text.trim()) {
      Alert.alert('Empty Stone', 'Write something before dropping your stone.');
      return;
    }
    setSaving(true);

    try {
      // Convert local file URI to base64 then upload to Cloudinary
      let finalPhotoUrl = null;
      if (photoUri) {
        setUploadingPhoto(true);
        const base64 = await readAsStringAsync(photoUri, {
          encoding: 'base64',
        });
        const base64Uri = `data:image/jpeg;base64,${base64}`;
        finalPhotoUrl = await uploadPhoto(base64Uri);
        setUploadingPhoto(false);
      }

      // Only animate and submit after photo is ready
      Animated.sequence([
        Animated.timing(stoneScale, { toValue: 1.4, duration: 150, useNativeDriver: true }),
        Animated.timing(stoneScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(stoneScale,   { toValue: 3, duration: 400, useNativeDriver: true }),
          Animated.timing(stoneOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]).start();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await dropStone({
        user_id:       user.id,
        text:          text.trim(),
        category,
        photo_url:     finalPhotoUrl,
        scripture_ref: scriptureRef || null,
        type:          stoneType,
      });
      setTimeout(() => navigation.goBack(), 400);
    } catch (err) {
      stoneScale.setValue(1);
      stoneOpacity.setValue(1);
      Alert.alert('Error', err.message || 'Could not drop stone. Try again.');
      setSaving(false);
      setUploadingPhoto(false);
    }
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: categoryBg }]}
      edges={['top', 'bottom']}
    >
      {/* Verse Picker Modal */}
      <Modal
        visible={showVersePicker}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowVersePicker(false); setSelectedTopic(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTopic ? selectedTopic.topic : '📖 Find a Verse'}
              </Text>
              <TouchableOpacity onPress={() => {
                if (selectedTopic) setSelectedTopic(null);
                else setShowVersePicker(false);
              }}>
                <Text style={[styles.modalBack, { color: categoryColor }]}>
                  {selectedTopic ? '← Back' : '✕ Close'}
                </Text>
              </TouchableOpacity>
            </View>

            {!selectedTopic ? (
              <>
                <Text style={styles.modalSubtitle}>What is this stone about?</Text>
                <FlatList
                  data={VERSE_TOPICS}
                  keyExtractor={item => item.topic}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.topicChip, { borderColor: categoryColor + '40' }]}
                      onPress={() => setSelectedTopic(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.topicChipText, { color: categoryColor }]}>
                        {item.topic}
                      </Text>
                      <Text style={styles.topicChipArrow}>›</Text>
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>Choose a verse</Text>
                {selectedTopic.verses.map((verse, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.verseOption, { borderColor: categoryColor + '30' }]}
                    onPress={() => handleSelectVerse(verse)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.verseOptionRef, { color: categoryColor }]}>
                      {verse.ref}
                    </Text>
                    <Text style={styles.verseOptionText}>"{verse.text}"</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </View>
      </Modal>

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
          ]}>{stoneType === 'prayer_request' ? '🙏' : '🪨'}</Animated.Text>
          <TouchableOpacity
            style={[styles.dropBtn, { backgroundColor: categoryColor }, (!text.trim() || saving) && styles.dropBtnDisabled]}
            onPress={handleDrop}
            disabled={!text.trim() || saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.dropBtnText}>{stoneType === 'prayer_request' ? 'Post' : 'Drop'}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Type Toggle */}
        <View style={[styles.typeToggle, { borderBottomColor: categoryColor + '30' }]}>
          <TouchableOpacity
            style={[styles.typeBtn, stoneType === 'stone' && { backgroundColor: categoryColor }]}
            onPress={() => setStoneType('stone')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeBtnText, stoneType === 'stone' && { color: '#FFF' }]}>
              🪨 Stone
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, stoneType === 'prayer_request' && { backgroundColor: categoryColor }]}
            onPress={() => setStoneType('prayer_request')}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeBtnText, stoneType === 'prayer_request' && { color: '#FFF' }]}>
              🙏 Prayer Request
            </Text>
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
              placeholder={stoneType === 'prayer_request' ? 'What do you need prayer for...' : 'Where did you see God move...'}
              placeholderTextColor={categoryColor + '60'}
              multiline
              maxLength={CHAR_LIMIT}
              value={text}
              onChangeText={setText}
              autoFocus
            />
            <Text style={[styles.charCount, { color: categoryColor + '80' }, remaining < 50 && { color: colors.error }]}>
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
                    isSelected && { backgroundColor: catColor, borderColor: catColor, ...shadow.card }
                  ]}
                  onPress={() => handleCategoryChange(key)}
                >
                  <Text style={[styles.categoryChipText, { color: isSelected ? '#FFF' : catColor }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Scripture Verse Picker */}
          <Text style={[styles.sectionLabel, { color: categoryColor }]}>
            Scripture Verse (Optional)
          </Text>
          {scriptureRef ? (
            <View style={[styles.selectedVerse, { borderColor: categoryColor + '40', backgroundColor: categoryColor + '12' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedVerseRef, { color: categoryColor }]}>📖 {scriptureRef}</Text>
                <Text style={styles.selectedVerseText} numberOfLines={2}>"{scriptureText}"</Text>
              </View>
              <TouchableOpacity onPress={handleClearScripture} style={styles.clearBtn}>
                <Text style={[styles.clearBtnText, { color: categoryColor }]}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.versePickerBtn,
                  { borderColor: categoryColor + '60' },
                  !text.trim() && styles.versePickerBtnDisabled
                ]}
                onPress={() => text.trim() ? setShowVersePicker(true) : null}
                activeOpacity={text.trim() ? 0.7 : 1}
              >
                <Text style={[
                  styles.versePickerBtnText,
                  { color: text.trim() ? categoryColor : colors.inkLight }
                ]}>
                  📖 Find a verse by topic...
                </Text>
                <Text style={[styles.versePickerArrow, { color: text.trim() ? categoryColor : colors.inkLight }]}>›</Text>
              </TouchableOpacity>
              {!text.trim() && (
                <Text style={styles.verseRequiredHint}>
                  ✏️ Write your stone first before adding a verse
                </Text>
              )}
            </>
          )}
          <Text style={[styles.verseHint, { color: categoryColor + '80' }]}>
            Readers can tap to open this verse in YouVersion
          </Text>

          {/* Photo */}
          <Text style={[styles.sectionLabel, { color: categoryColor }]}>Photo (Optional)</Text>
          <TouchableOpacity
            style={[styles.photoBtn, { borderColor: categoryColor + '60' }]}
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
          >
            <Text style={[styles.photoBtnText, { color: categoryColor }]}>
              {uploadingPhoto ? '⏳ Uploading...' : photoUri ? '✓ Photo Selected — Tap to Change' : '+ Add a Photo'}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1,
  },
  cancel: { fontFamily: fonts.ui, fontSize: 15, width: 70, textAlign: 'left' },
  stoneIcon: { fontSize: 32 },
  dropBtn: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, minWidth: 72, alignItems: 'center', ...shadow.gold },
  dropBtnDisabled: { opacity: 0.4 },
  dropBtnText: { fontFamily: fonts.uiBold, fontSize: 14, color: '#FFF' },
  body: { padding: spacing.md, paddingBottom: spacing.xxl },
  typeToggle: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  typeBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: colors.inkMid,
  },
  verseContainer: { alignItems: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.md, width: '100%' },
  verse: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 4 },
  verseRef: { fontFamily: fonts.uiBold, fontSize: 12, textAlign: 'center' },
  inputWrapper: { backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: radius.md, padding: spacing.md, minHeight: 140, marginBottom: spacing.lg, borderWidth: 1.5 },
  input: { fontFamily: fonts.body, fontSize: 16, color: colors.inkDark, lineHeight: 24, minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontFamily: fonts.caption, fontSize: 11, textAlign: 'right', marginTop: spacing.sm },
  sectionLabel: { fontFamily: fonts.uiBold, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  categoryChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.6)', marginRight: spacing.xs, marginBottom: spacing.xs },
  categoryChipText: { fontFamily: fonts.uiBold, fontSize: 12 },
  versePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.6)', marginBottom: spacing.xs },
  versePickerBtnText: { fontFamily: fonts.ui, fontSize: 14 },
  versePickerArrow: { fontFamily: fonts.uiBold, fontSize: 20 },
  selectedVerse: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xs, gap: spacing.sm },
  selectedVerseRef: { fontFamily: fonts.uiBold, fontSize: 13, marginBottom: 4 },
  selectedVerseText: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 12, color: colors.inkMid, lineHeight: 18 },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 16, fontWeight: '700' },
  versePickerBtnDisabled: {
    opacity: 0.4,
  },
  verseRequiredHint: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: type.captionSize,
    color: colors.inkLight,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  verseHint: { fontFamily: fonts.caption, fontSize: 11, fontStyle: 'italic', marginBottom: spacing.lg, marginLeft: 2 },
  photoBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.4)' },
  photoBtnText: { fontFamily: fonts.ui, fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40, maxHeight: '80%', ...shadow.gold },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  modalTitle: { fontFamily: fonts.uiBold, fontSize: 20, color: colors.inkDark },
  modalBack: { fontFamily: fonts.ui, fontSize: 14 },
  modalSubtitle: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 13, color: colors.inkLight, marginBottom: spacing.md },
  topicChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.sm, backgroundColor: colors.bgCard },
  topicChipText: { fontFamily: fonts.uiBold, fontSize: 14 },
  topicChipArrow: { fontFamily: fonts.uiBold, fontSize: 20, color: colors.inkLight },
  verseOption: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.bgCard },
  verseOptionRef: { fontFamily: fonts.uiBold, fontSize: 13, marginBottom: 6 },
  verseOptionText: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 13, color: colors.inkMid, lineHeight: 20 },
});
