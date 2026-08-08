import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useToast } from '../components/ui/ToastProvider';
import { partnerAPI } from '../utils/api';
import { saveToken, savePartner } from '../utils/auth';
import theme from '../theme';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async () => {
    if (!phone || !pin) {
      showToast('Enter your phone number and PIN.');
      return;
    }

    setLoading(true);
    try {
      const res = await partnerAPI.login({ phone, pin });
      await saveToken(res.data.token);
      await savePartner(res.data.partner);
      onLoginSuccess(res.data.partner);
      showToast('Signed in');
    } catch (err) {
      showToast(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DropMap</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <Input placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input placeholder="PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />

      <Button onPress={handleLogin} disabled={loading} style={{ marginTop: theme.spacing.sm }}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>

      <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
        New partner? Register here
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.xl, justifyContent: 'center' },
  title: { fontSize: theme.fontSizes.title, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: theme.fontSizes.small, color: theme.colors.muted, textAlign: 'center', marginBottom: theme.spacing.xl },
  link: { color: theme.colors.muted, fontSize: theme.fontSizes.body, textAlign: 'center', marginTop: theme.spacing.lg },
});