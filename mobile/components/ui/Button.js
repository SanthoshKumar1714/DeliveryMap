import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../../theme';

export default function Button({ children, onPress, style, variant = 'primary', disabled = false }) {
  const styles = getStyles(variant, disabled);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]} disabled={disabled}>
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

function getStyles(variant, disabled) {
  const base = {
    button: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    text: { fontSize: theme.fontSizes.body, fontWeight: '600' },
  };

  if (variant === 'outline') {
    return {
      ...base,
      button: {
        ...base.button,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: theme.colors.primary,
      },
      text: { ...base.text, color: theme.colors.primary },
    };
  }

  // primary
  return {
    ...base,
    button: {
      ...base.button,
      backgroundColor: disabled ? theme.colors.border : theme.colors.primary,
    },
    text: { ...base.text, color: '#FFF' },
  };
}
