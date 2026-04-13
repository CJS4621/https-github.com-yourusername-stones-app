import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, type, spacing, radius, shadow, CATEGORY_LABELS } from '../theme';
import { editStone, deleteStone } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function StoneDetailScreen({ route, navigation }) {
  const { stone } = route.params;
  const { user } = useAuth();
  const [currentStone, setCurrentStone] = useState(stone);
  const [showEdit, setShowEdit]         = useState(false);
  const [editText, setEditText]         = useState(stone.text);
  const [editCategory, setEditCategory] = useState(stone.category);
  const [saving, setSaving]             = useState(false);

  const isOwner = user?.id === stone.user_id;
  const yearAgo = new Date(currentStone.created_at).getFullYear() < new Date().getFullYear();
  const remaining = 500 - editText.length;

  async function handleSave() {
    if (!editText.trim()) {
      Alert.alert('Required', 'Please enter some text for your stone.');
      return;
    }
    setSaving(true);
    try {
      await editStone(currentStone.id, editText.trim(), editCategory);
      setCurrentStone(prev => ({ ...prev, text: editText.trim(), category: editCategory }));
      setShowEdit(false);
      Alert.alert('Updated! 🪨', 'Your stone has been updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update stone.');
    } finally {
      setSaving(false);
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

      {/* Edit Modal */}
      <Modal
        visible={showEdit}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEdit(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Edit Stone ✏️</Text>

              <View style={s.inputWrapper}>
                <TextInput
                  style={s.input}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  maxLength={500}
                  placeholder="What did God do..."
                  placeholderTextColor={colors.inkLight}
                  autoFocus
                />
                <Text style={[s.charCount, remaining < 50 && { color: '#E53E3E' }]}>
                  {remaining}
                </Text>
              </View>

              {/* Category selector */}
              <Text style={s.categoryLabel}>Category</Text>
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
                    <Text style={[
                      s.categoryChipText,
                      editCategory === key && { color: '#FFF' }
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={s.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowEdit(false)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity onPress={() => {
            setEditText(currentStone.text);
            setEditCategory(currentStone.category);
            setShowEdit(true);
          }}>
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
        <Text style={s.date}>
          {new Date(currentStone.created_at).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
          })}
        </Text>
        <View style={s.author}>
          <Text style={s.authorName}>— {currentStone.display_name}</Text>
        </View>

        {/* Delete button — only for owner */}
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
  backText: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: colors.gold,
  },
  editBtn: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: colors.gold,
  },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  anniversary: {
    backgroundColor: colors.prayGlow,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  anniversaryText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: colors.gold,
    textAlign: 'center',
  },
  category: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 22,
    color: colors.inkDark,
    lineHeight: 34,
    marginBottom: spacing.lg,
  },
  date: {
    fontFamily: fonts.caption,
    fontSize: 13,
    color: colors.inkLight,
    marginBottom: spacing.sm,
  },
  author: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginBottom: spacing.xl,
  },
  authorName: {
    fontFamily: fonts.body,
    fontStyle: 'italic',
    fontSize: 15,
    color: colors.inkMid,
  },
  deleteBtn: {
    padding: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#E53E3E',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  deleteBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#E53E3E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: 40,
    ...shadow.gold,
  },
  modalTitle: {
    fontFamily: type.displayFont,
    fontSize: 24,
    color: colors.inkDark,
    marginBottom: spacing.md,
  },
  inputWrapper: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 120,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.inkDark,
    lineHeight: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: fonts.caption,
    fontSize: 11,
    color: colors.inkLight,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  categoryLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: colors.inkMid,
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
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  categoryChipText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: colors.inkMid,
  },
  saveBtn: {
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadow.gold,
  },
  saveBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: type.uiSize,
    color: '#FFF',
  },
  cancelBtn: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: fonts.ui,
    fontSize: type.uiSize,
    color: colors.inkLight,
  },
});