import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DeliveryMap from './screens/DeliveryMap';
import { getToken, getPartner, logout } from './utils/auth';
import ToastProvider from './components/ui/ToastProvider';

const Stack = createNativeStackNavigator();

export default function App() {
  const [checking, setChecking] = useState(true);
  const [partner, setPartner] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await getToken();
    const savedPartner = await getPartner();
    if (token && savedPartner) {
      setPartner(savedPartner);
    }
    setChecking(false);
  };

  const handleLoginSuccess = (partnerData) => {
    setPartner(partnerData);
  };

  const handleLogout = async () => {
    await logout();
    setPartner(null);
  };

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <ToastProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
        {partner ? (
          <Stack.Screen name="DeliveryMap">
            {(props) => <DeliveryMap {...props} partner={partner} onLogout={handleLogout} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
            </Stack.Screen>
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
        </Stack.Navigator>
      </ToastProvider>
    </NavigationContainer>
  );
}