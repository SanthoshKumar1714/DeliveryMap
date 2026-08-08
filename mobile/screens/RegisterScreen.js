import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useToast } from '../components/ui/ToastProvider';
import { partnerAPI } from '../utils/api';
import theme from '../theme';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleRegister = async () => {
    if (!name || !phone || !pin) {
      showToast('All fields are required.');
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      showToast('PIN must be 4-6 digits.');
      return;
    }

    setLoading(true);
    try {
      await partnerAPI.register({ name, phone, pin });
      showToast('Registration submitted');
      setTimeout(() => navigation.navigate('Login'), 900);
    } catch (err) {
      showToast(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join DropMap</Text>
      <Text style={styles.subtitle}>Register as a delivery partner</Text>

      <Input placeholder="Full name" value={name} onChangeText={setName} />
      <Input placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Input placeholder="Choose a 4-6 digit PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={6} />

      <Button onPress={handleRegister} disabled={loading} style={{ marginTop: theme.spacing.sm }}>
        {loading ? 'Submitting...' : 'Register'}
      </Button>

      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
        Already approved? Sign in
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.xl, justifyContent: 'center' },
  title: { fontSize: theme.fontSizes.heading, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: theme.fontSizes.small, color: theme.colors.muted, textAlign: 'center', marginBottom: theme.spacing.xl },
  link: { color: theme.colors.muted, fontSize: theme.fontSizes.body, textAlign: 'center', marginTop: theme.spacing.lg },
});