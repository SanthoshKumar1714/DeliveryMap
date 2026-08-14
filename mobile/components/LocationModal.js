import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../theme';
import Input from './ui/Input';
import Button from './ui/Button';

export default function LocationModal({ visible, onClose, onSave, formData, setFormData }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
     <View style={[styles.sheet, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scrollArea}>
            <Text style={styles.title}>Add Location</Text>
            <Text style={styles.coord}>📍 {formData.lat?.toFixed(5)}, {formData.lng?.toFixed(5)}</Text>

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              {['home', 'flat', 'hotel', 'building'].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setFormData({ ...formData, type: t })}
                  style={[styles.typeBtn, formData.type === t && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeText, formData.type === t && styles.typeTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input placeholder="Location name" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} />

           {formData.type !== 'flat' && (
              <>
                <Text style={styles.label}>
                  Customer phone {formData.type === 'home' ? '(required)' : '(optional)'}
                </Text>
                <Input
                  placeholder={formData.type === 'home' ? 'Required' : 'Optional'}
                  value={formData.customerPhones}
                  onChangeText={(text) => setFormData({ ...formData, customerPhones: text })}
                  keyboardType="phone-pad"
                />
              </>
            )}

            {formData.type === 'home' && (
              <Input placeholder="House / Unit number" value={formData.unitNumber} onChangeText={(text) => setFormData({ ...formData, unitNumber: text })} />
            )}

            <Input placeholder="Notes (optional)" value={formData.notes} onChangeText={(text) => setFormData({ ...formData, notes: text })} />
          </ScrollView>

          <View style={styles.actionsRow}>
            <Button variant="outline" onPress={onClose} style={{ flex: 1, marginRight: theme.spacing.sm }}>
              Cancel
            </Button>
            <Button onPress={onSave} style={{ flex: 1 }}>
              Save
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.background, padding: theme.spacing.lg, borderTopLeftRadius: theme.radii.md, borderTopRightRadius: theme.radii.md, maxHeight: '80%' },
  scrollArea: { flexGrow: 0 },
  title: { fontSize: theme.fontSizes.heading, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  coord: { fontSize: theme.fontSizes.small, color: theme.colors.muted, marginBottom: theme.spacing.md },
  label: { fontSize: theme.fontSizes.small, color: theme.colors.muted, marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  typeBtn: { flex: 1, minWidth: 70, padding: theme.spacing.sm, borderRadius: theme.radii.sm, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', backgroundColor: '#FFF' },
  typeBtnActive: { backgroundColor: theme.colors.primary },
  typeText: { color: theme.colors.text },
  typeTextActive: { color: '#FFF' },
  actionsRow: { flexDirection: 'row', marginTop: theme.spacing.md },
});