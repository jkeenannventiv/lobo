import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SESSION: 'lobo_session',
  LAST_IMPORT: 'lobo_last_import',
};

export async function saveSession(phone: string, email: string) {
  await AsyncStorage.setItem(KEYS.SESSION, JSON.stringify({ phone, email }));
}

export async function getSession() {
  const val = await AsyncStorage.getItem(KEYS.SESSION);
  return val ? JSON.parse(val) : null;
}

export async function clearSession() {
  await AsyncStorage.removeItem(KEYS.SESSION);
}

export async function saveLastImport() {
  await AsyncStorage.setItem(KEYS.LAST_IMPORT, new Date().toISOString());
}

export async function getLastImport() {
  const val = await AsyncStorage.getItem(KEYS.LAST_IMPORT);
  return val ? new Date(val) : null;
}

export async function isRefreshDue() {
  const last = await getLastImport();
  if (!last) return false;
  const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 30;
}