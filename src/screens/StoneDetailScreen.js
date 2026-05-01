import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, FlatList, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { colors, fonts, type, spacing, radius, shadow, CATEGORY_LABELS } from '../theme';
import { editStone, deleteStone, uploadPhoto, sendEncouragement } from '../lib/api';
import { useAuth } from '../context/AuthContext';

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
  { topic: 'Answered Prayer', verses: [
    { ref: '1 Samuel 7:12', text: 'Thus far the Lord has helped us.' },
    { ref: 'Psalm 34:6', text: 'This poor man called, and the Lord heard him; he saved him out of all his troubles.' },
    { ref: 'Matthew 21:22', text: 'If you believe, you will receive whatever you ask for in prayer.' },
  ]},
];

export default function StoneDetailScreen({ route, navigation }) {
  const { stone } = route.params;
  const { user } = useAuth();

  // ── ALL hooks declared at top — never conditionally ──
  const [currentStone, setCurrentStone]         = useState(stone);
  const [showEdit, setShowEdit]                 = useState(false);
  const [showVersePicker, setShowVersePicker]   = useState(false);
  const [selectedTopic, setSelectedTopic]       = useState(null);
  const [editText, setEditText]                 = useState(stone.text);
  const [editCategory, setEditCategory]         = useState(stone.category);
  const [editScriptureRef, setEditScriptureRef] = useState(stone.scripture_ref || '');
  const [editScriptureText, setEditScriptureText] = useState('');
  const [editPhotoUri, setEditPhotoUri]           = useState(null);
  const [uploadingPhoto, setUploadingPhoto]       = useState(false);
  const [encouraged, setEncouraged]               = useState(false);
  const [encouraging, setEncouraging]             = useState(false);
  const [saving, setSaving]                       = useState(false);

  const isOwner  = user?.id === stone.user_id;
  const yearAgo  = new Date(currentStone.created_at).getFullYear() < new Date().getFullYear();
  const remaining = 500 - editText.length;

  function handleOpenEdit() {
    setEditText(currentStone.text);
    setEditCategory(currentStone.category);
    setEditScriptureRef(currentStone.scripture_ref || '');
    setEditScriptureText('');
    setEditPhotoUri(null);
    setShowEdit(true);
  }

  function handleSelectVerse(verse) {
    setEditScriptureRef(verse.ref);
    setEditScriptureText(verse.text);
    setShowVersePicker(false);
    setSelectedTopic(null);
  }

  function handleClearScripture() {
    setEditScriptureRef('');
    setEditScriptureText('');
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow photo access to add a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled) setEditPhotoUri(result.assets[0].uri);
  }

  async function handleSave() {
    if (!editText.trim()) {
      Alert.alert('Required', 'Please enter some text for your stone.');
      return;
    }
    setSaving(true);
    try {
      // Upload new photo if selected
      let finalPhotoUrl = currentStone.photo_url || null;
      if (editPhotoUri) {
        setUploadingPhoto(true);
        const base64 = await readAsStringAsync(editPhotoUri, { encoding: 'base64' });
        const base64Uri = `data:image/jpeg;base64,${base64}`;
        finalPhotoUrl = await uploadPhoto(base64Uri);
        setUploadingPhoto(false);
      }

      await editStone(currentStone.id, editText.trim(), editCategory, editScriptureRef || null, finalPhotoUrl);
      setCurrentStone(prev => ({
        ...prev,
        text: editText.trim(),
        category: editCategory,
        scripture_ref: editScriptureRef || null,
        photo_url: finalPhotoUrl,
      }));
      setShowEdit(false);
      Alert.alert('Updated! 🪨', 'Your stone has been updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update stone.');
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
    }
  }

  async function handleEncourage() {
    if (!user) return;
    setEncouraging(true);
    try {
      await sendEncouragement(currentStone.id, user.id);
      setEncouraged(true);
      Alert.alert('💌 Encouragement Sent!', 'The stone owner has been notified!');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not send encouragement.');
    } finally {
      setEncouraging(false);
    }
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Stone',
      'Are you sure you want to delete this stone? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStone(currentStone.id);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', err.message || 'Could not delete stone.');
            }
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>

      {/* ── FULL SCREEN EDIT MODAL ── */}
      <Modal
        visible={showEdit}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowEdit(false)}
      >
        <SafeAreaView style={s.container} edges={['top', 'bottom']}>

          {/* Verse Picker Modal — sits on top of edit screen */}
          <Modal
            visible={showVersePicker}
            animationType="slide"
            transparent
            onRequestClose={() => { setShowVersePicker(false); setSelectedTopic(null); }}
          >
            <View style={s.pickerOverlay}>
              <View style={s.pickerCard}>
                <View style={s.pickerHeader}>
                  <Text style={s.pickerTitle}>
                    {selectedTopic ? selectedTopic.topic : '📖 Find a Verse'}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    if (selectedTopic) setSelectedTopic(null);
                    else setShowVersePicker(false);
                  }}>
                    <Text style={s.pickerBack}>
                      {selectedTopic ? '← Back' : '✕ Close'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {!selectedTopic ? (
                  <>
                    <Text style={s.pickerSubtitle}>What is this stone about?</Text>
                    <FlatList
                      data={VERSE_TOPICS}
                      keyExtractor={item => item.topic}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={s.topicChip}
                          onPress={() => setSelectedTopic(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={s.topicChipText}>{item.topic}</Text>
                          <Text style={s.topicArrow}>›</Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ paddingBottom: 20 }}
                    />
                  </>
                ) : (
                  <>
                    <Text style={s.pickerSubtitle}>Choose a verse</Text>
                    {selectedTopic.verses.map((verse, i) => (
                      <TouchableOpacity
                        key={i}
                        style={s.verseOption}
                        onPress={() => handleSelectVerse(verse)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.verseOptionRef}>{verse.ref}</Text>
                        <Text style={s.verseOptionText}>"{verse.text}"</Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </View>
            </View>
          </Modal>

          {/* Edit Screen Header */}
          <View style={s.editHeader}>
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Text style={s.backText}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={s.editTitle}>Edit Stone ✏️</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color={colors.gold} />
                : <Text style={s.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={s.editBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Text */}
              <Text style={s.fieldLabel}>Your Stone</Text>
              <View style={s.inputWrapper}>
                <TextInput
                  style={s.input}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  scrollEnabled
                  maxLength={500}
                  placeholder="What did God do..."
                  placeholderTextColor={colors.inkLight}
                  autoFocus
                />
                <Text style={[s.charCount, remaining < 50 && { color: '#E53E3E' }]}>
                  {remaining}
                </Text>
              </View>

              {/* Category */}
              <Text style={s.fieldLabel}>Category</Text>
              <View style={s.categoryGrid}>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      s.categoryChip,
                      editCategory === key && { backgroundColor: colors[key] || colors.gold, borderColor: 'transparent' }
                    ]}
                    onPress={() => setEditCategory(key)}
                  >
                    <Text style={[s.categoryChipText, editCategory === key && { color: '#FFF' }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Scripture */}
              <Text style={s.fieldLabel}>Scripture Verse (Optional)</Text>
              {editScriptureRef ? (
                <View style={s.selectedVerse}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.selectedVerseRef}>📖 {editScriptureRef}</Text>
                    {editScriptureText ? (
                      <Text style={s.selectedVerseText} numberOfLines={2}>"{editScriptureText}"</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={handleClearScripture} style={s.clearBtn}>
                    <Text style={s.clearBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.versePickerBtn}
                  onPress={() => setShowVersePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={s.versePickerBtnText}>📖 Find a verse by topic...</Text>
                  <Text style={s.versePickerArrow}>›</Text>
                </TouchableOpacity>
              )}
              {/* Photo */}
              <Text style={s.fieldLabel}>Photo (Optional)</Text>
              {editPhotoUri ? (
                <View style={s.photoPreviewWrapper}>
                  <Image source={{ uri: editPhotoUri }} style={s.photoPreview} resizeMode="cover" />
                  <TouchableOpacity style={s.photoChangeBtn} onPress={handlePickPhoto}>
                    <Text style={s.photoChangeBtnText}>📷 Change Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.photoRemoveBtn} onPress={() => setEditPhotoUri(null)}>
                    <Text style={s.photoRemoveBtnText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : currentStone.photo_url ? (
                <View style={s.photoPreviewWrapper}>
                  <Image source={{ uri: currentStone.photo_url }} style={s.photoPreview} resizeMode="cover" />
                  <TouchableOpacity style={s.photoChangeBtn} onPress={handlePickPhoto}>
                    <Text style={s.photoChangeBtnText}>📷 Change Photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={s.photoPickerBtn}
                  onPress={handlePickPhoto}
                  activeOpacity={0.7}
                >
                  <Text style={s.photoPickerBtnText}>📷 Add a Photo</Text>
                </TouchableOpacity>
              )}

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── DETAIL VIEW ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity onPress={handleOpenEdit}>
            <Text style={s.editBtn}>✏️ Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={s.body}>
        {yearAgo && (
          <View style={s.anniversary}>
            <Text style={s.anniversaryText}>
              🪨 A Stone from {new Date(currentStone.created_at).getFullYear()}
            </Text>
          </View>
        )}

        <Text style={s.category}>{CATEGORY_LABELS[currentStone.category]}</Text>
        <Text style={s.text}>{currentStone.text}</Text>

        {currentStone.scripture_ref && (
          <TouchableOpacity
            style={s.scriptureBlock}
            onPress={() => Linking.openURL(`https://www.bible.com/search/bible?q=${encodeURIComponent(currentStone.scripture_ref)}`)}
            activeOpacity={0.7}
          >
            <Text style={s.scriptureRef}>📖 {currentStone.scripture_ref}</Text>
            <Text style={s.scriptureHint}>Tap to open in YouVersion</Text>
          </TouchableOpacity>
        )}

        <Text style={s.date}>
          {new Date(currentStone.created_at).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
          })}
        </Text>
        <View style={s.author}>
          <Text style={s.authorName}>— {currentStone.display_name}</Text>
        </View>

        {/* Encourage button — only for non-owners */}
        {!isOwner && (
          <TouchableOpacity
            style={[s.encourageBtn, encouraged && s.encourageBtnDone]}
            onPress={handleEncourage}
            disabled={encouraged || encouraging}
            activeOpacity={0.7}
          >
            {encouraging
              ? <ActivityIndicator color={colors.gold} />
              : <Text style={s.encourageBtnText}>
                  {encouraged ? '💌 Encouraged!' : '💌 Encourage'}
                </Text>
            }
          </TouchableOpacity>
        )}

        {isOwner && (
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
            <Text style={s.deleteBtnText}>Delete Stone</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backText: { fontFamily: fonts.ui, fontSize: 15, color: colors.gold, width: 70 },
  editBtn: { fontFamily: fonts.uiBold, fontSize: type.uiSize, color: colors.gold },
  editTitle: { fontFamily: type.displayFont, fontSize: 18, color: colors.inkDark },
  saveText: { fontFamily: fonts.uiBold, fontSize: type.uiSize, color: colors.gold, width: 70, textAlign: 'right' },

  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  editBody: { padding: spacing.lg, paddingBottom: spacing.xxl },

  anniversary: { backgroundColor: colors.prayGlow, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  anniversaryText: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.gold, textAlign: 'center' },
  category: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.gold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  text: { fontFamily: fonts.body, fontSize: 22, color: colors.inkDark, lineHeight: 34, marginBottom: spacing.lg },
  scriptureBlock: { backgroundColor: colors.prayGlow, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.gold },
  scriptureRef: { fontFamily: fonts.uiBold, fontSize: 14, color: colors.gold, marginBottom: 4 },
  scriptureHint: { fontFamily: fonts.caption, fontSize: 11, color: colors.inkLight, fontStyle: 'italic' },
  date: { fontFamily: fonts.caption, fontSize: 13, color: colors.inkLight, marginBottom: spacing.sm },
  author: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginBottom: spacing.xl },
  authorName: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 15, color: colors.inkMid },
  deleteBtn: { padding: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: '#E53E3E', alignItems: 'center', marginTop: spacing.md },
  deleteBtnText: { fontFamily: fonts.uiBold, fontSize: type.uiSize, color: '#E53E3E' },
  encourageBtn: { borderWidth: 1.5, borderColor: colors.gold, borderRadius: radius.full, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  encourageBtnDone: { backgroundColor: colors.prayGlow },
  encourageBtnText: { fontFamily: fonts.uiBold, fontSize: type.uiSize, color: colors.gold },

  fieldLabel: { fontFamily: fonts.uiBold, fontSize: 12, color: colors.inkMid, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 52,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputWrapper: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, height: 160, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  input: { fontFamily: fonts.body, fontSize: 16, color: colors.inkDark, lineHeight: 24, flex: 1, textAlignVertical: 'top' },
  charCount: { fontFamily: fonts.caption, fontSize: 11, color: colors.inkLight, textAlign: 'right', marginTop: spacing.sm },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  categoryChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgCard },
  categoryChipText: { fontFamily: fonts.ui, fontSize: 12, color: colors.inkMid },

  versePickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.bgCard, marginBottom: spacing.lg },
  versePickerBtnText: { fontFamily: fonts.ui, fontSize: 14, color: colors.inkMid },
  versePickerArrow: { fontFamily: fonts.uiBold, fontSize: 20, color: colors.inkLight },
  selectedVerse: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, borderColor: colors.gold + '60', borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.prayGlow, marginBottom: spacing.lg, gap: spacing.sm },
  selectedVerseRef: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.gold, marginBottom: 4 },
  selectedVerseText: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 12, color: colors.inkMid, lineHeight: 18 },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 16, fontWeight: '700', color: colors.inkLight },

  photoPreviewWrapper: { marginBottom: spacing.lg },
  photoPreview: { width: '100%', height: 180, borderRadius: radius.md, marginBottom: spacing.sm },
  photoChangeBtn: { borderWidth: 1.5, borderColor: colors.gold, borderRadius: radius.full, padding: spacing.sm, alignItems: 'center', marginBottom: spacing.sm },
  photoChangeBtnText: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.gold },
  photoRemoveBtn: { padding: spacing.sm, alignItems: 'center' },
  photoRemoveBtnText: { fontFamily: fonts.ui, fontSize: 13, color: colors.inkLight },
  photoPickerBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', backgroundColor: colors.bgCard, marginBottom: spacing.lg },
  photoPickerBtnText: { fontFamily: fonts.ui, fontSize: 14, color: colors.inkMid },
  pickerCard: { backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40, maxHeight: '80%', ...shadow.gold },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  pickerTitle: { fontFamily: fonts.uiBold, fontSize: 20, color: colors.inkDark },
  pickerBack: { fontFamily: fonts.ui, fontSize: 14, color: colors.gold },
  pickerSubtitle: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 13, color: colors.inkLight, marginBottom: spacing.md },
  topicChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: spacing.sm, backgroundColor: colors.bgCard },
  topicChipText: { fontFamily: fonts.uiBold, fontSize: 14, color: colors.gold },
  topicArrow: { fontFamily: fonts.uiBold, fontSize: 20, color: colors.inkLight },
  verseOption: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.bgCard },
  verseOptionRef: { fontFamily: fonts.uiBold, fontSize: 13, color: colors.gold, marginBottom: 6 },
  verseOptionText: { fontFamily: fonts.body, fontStyle: 'italic', fontSize: 13, color: colors.inkMid, lineHeight: 20 },
});
