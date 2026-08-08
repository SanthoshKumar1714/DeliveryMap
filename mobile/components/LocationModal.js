import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../theme';
import Input from './ui/Input';
import Button from './ui/Button';

export default function LocationModal({ visible, onClose, onSave, formData, setFormData }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView>
            <Text style={styles.title}>Add Location</Text>
            <Text style={styles.coord}>📍 {formData.lat?.toFixed(5)}, {formData.lng?.toFixed(5)}</Text>

            <Text style={styles.label}>Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, type: 'home' })}
                style={[styles.typeBtn, formData.type === 'home' && styles.typeBtnActive]}
              >
                <Text style={[styles.typeText, formData.type === 'home' && styles.typeTextActive]}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, type: 'building' })}
                style={[styles.typeBtn, formData.type === 'building' && styles.typeBtnActive]}
              >
                <Text style={[styles.typeText, formData.type === 'building' && styles.typeTextActive]}>Building</Text>
              </TouchableOpacity>
            </View>

            <Input placeholder="Location name" value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} />

            <Text style={styles.label}>Customer phone {formData.type === 'building' ? '(optional)' : '(required)'}</Text>
            <Input placeholder={formData.type === 'building' ? 'Optional for buildings' : 'Required'} value={formData.customerPhones} onChangeText={(text) => setFormData({ ...formData, customerPhones: text })} keyboardType="phone-pad" />

            {formData.type === 'home' && (
              <Input placeholder="House / Unit number" value={formData.unitNumber} onChangeText={(text) => setFormData({ ...formData, unitNumber: text })} />
            )}

            <Input placeholder="Notes (optional)" value={formData.notes} onChangeText={(text) => setFormData({ ...formData, notes: text })} />

            <View style={styles.actionsRow}>
              <Button variant="outline" onPress={onClose} style={{ flex: 1, marginRight: theme.spacing.sm }}>
                Cancel
              </Button>
              <Button onPress={onSave} style={{ flex: 1 }}>
                Save
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.background, padding: theme.spacing.lg, borderTopLeftRadius: theme.radii.md, borderTopRightRadius: theme.radii.md, maxHeight: '80%' },
  title: { fontSize: theme.fontSizes.heading, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  coord: { fontSize: theme.fontSizes.small, color: theme.colors.muted, marginBottom: theme.spacing.md },
  label: { fontSize: theme.fontSizes.small, color: theme.colors.muted, marginBottom: 6 },
  typeRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  typeBtn: { flex: 1, padding: theme.spacing.sm, borderRadius: theme.radii.sm, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', backgroundColor: '#FFF' },
  typeBtnActive: { backgroundColor: theme.colors.primary },
  typeText: { color: theme.colors.text },
  typeTextActive: { color: '#FFF' },
  actionsRow: { flexDirection: 'row', marginTop: theme.spacing.md },
});