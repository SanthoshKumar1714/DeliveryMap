import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import theme from '../../theme';

export default function Input({ value, onChangeText, placeholder, keyboardType, secureTextEntry, style, label, ...props }) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.md },
  label: { fontSize: theme.fontSizes.small, color: theme.colors.muted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.text,
    fontSize: theme.fontSizes.body,
  },
});
