import * as SecureStore from 'expo-secure-store';

export const saveToken = async (token) => {
  try {
    await SecureStore.setItemAsync('authToken', token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync('authToken');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

export const savePartner = async (partner) => {
  try {
    await SecureStore.setItemAsync('partnerInfo', JSON.stringify(partner));
  } catch (error) {
    console.error('Error saving partner info:', error);
  }
};

export const getPartner = async () => {
  try {
    const data = await SecureStore.getItemAsync('partnerInfo');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

export const logout = async () => {
  await removeToken();
  await SecureStore.deleteItemAsync('partnerInfo');
};