import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet } from 'react-native';
import theme from '../theme';
import Input from './ui/Input';
import Button from './ui/Button';

export default function EditRequestModal({ visible, target, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (target) {
      setName(target.name || '');
      setNotes(target.notes || '');
    }
  }, [target]);

  const handleSubmit = () => {
    const changes = {};
    if (name && name !== target?.name) changes.name = name;
    if (notes !== undefined) changes.notes = notes;

    onSubmit(reason, changes);
    setReason('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Request Edit</Text>

          <Text style={styles.smallLabel}>Location name</Text>
          <Input value={name} onChangeText={setName} />

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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.colors.background, padding: theme.spacing.lg, borderTopLeftRadius: theme.radii.lg, borderTopRightRadius: theme.radii.lg },
  title: { fontSize: theme.fontSizes.heading, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  smallLabel: { fontSize: theme.fontSizes.small, color: theme.colors.muted, marginBottom: 6 },
  actionsRow: { flexDirection: 'row', marginTop: theme.spacing.md },
});