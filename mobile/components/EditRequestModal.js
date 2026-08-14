import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../theme';
import Input from './ui/Input';
import Button from './ui/Button';

export default function EditRequestModal({ visible, target, onClose, onSubmit }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState('home');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (target) {
      setName(target.name || '');
      setNotes(target.notes || '');
      setPhone(target.customerPhones?.[0] || '');
      setType(target.type || 'home');
    }
  }, [target]);

  const handleSubmit = () => {
    const changes = {};
    if (name && name !== target?.name) changes.name = name;
    if (notes !== undefined) changes.notes = notes;
    if (phone !== (target?.customerPhones?.[0] || '')) {
      changes.customerPhones = phone ? [phone] : [];
    }
    if (type !== target?.type) changes.type = type;

    onSubmit(reason, changes);
    setReason('');
  };
return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { paddingBottom: theme.spacing.lg + insets.bottom }]}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Request Edit</Text>

            <Text style={styles.smallLabel}>Type</Text>
            <View style={styles.typeRow}>
              {['home', 'flat', 'hotel', 'building'].map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                >
                  <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.smallLabel}>Location name</Text>
            <Input value={name} onChangeText={setName} />

            <Text style={styles.smallLabel}>Phone number</Text>
            <Input placeholder="Customer phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            <Text style={styles.smallLabel}>Notes</Text>
            <Input placeholder="Additional notes" value={notes} onChangeText={setNotes} />

            <Text style={styles.smallLabel}>Reason for change</Text>
            <Input placeholder="Why does this need to change?" value={reason} onChangeText={setReason} />

            <View style={styles.actionsRow}>
              <Button variant="outline" onPress={onClose} style={{ flex: 1, marginRight: theme.spacing.sm }}>
                Cancel
              </Button>
              <Button onPress={handleSubmit} style={{ flex: 1 }}>
                Submit
              </Button>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.background, padding: theme.spacing.lg, borderTopLeftRadius: theme.radii.lg, borderTopRightRadius: theme.radii.lg },
  title: { fontSize: theme.fontSizes.heading, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  smallLabel: { fontSize: theme.fontSizes.small, color: theme.colors.muted, marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  typeBtn: { flex: 1, minWidth: 70, padding: theme.spacing.sm, borderRadius: theme.radii.sm, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', backgroundColor: '#FFF' },
  typeBtnActive: { backgroundColor: theme.colors.primary },
  typeText: { color: theme.colors.text },
  typeTextActive: { color: '#FFF' },
  actionsRow: { flexDirection: 'row', marginTop: theme.spacing.md },
});