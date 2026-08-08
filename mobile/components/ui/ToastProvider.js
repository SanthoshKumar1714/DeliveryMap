import React, { createContext, useContext, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import theme from '../../theme';

const ToastContext = createContext(null);

export const useToast = () => {
  return useContext(ToastContext);
};

export default function ToastProvider({ children }) {
  const [message, setMessage] = useState('');
  const timerRef = useRef(null);
  const anim = useRef(new Animated.Value(0)).current;

  const showToast = (msg, duration = 2600) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setMessage(''));
    }, duration);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message !== '' && (
        <Animated.View style={[styles.toast, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [12,0] }) }] }]} pointerEvents="none">
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 40,
    padding: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    elevation: 6,
  },
  toastText: { color: '#FFF', fontWeight: '600' },
});
