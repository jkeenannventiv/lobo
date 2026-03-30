import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SESSION: 'lobo_session',
  LAST_IMPORT: 'lobo_last_import',
  CONSENT: 'lobo_consent',
};

export const CURRENT_CONSENT_VERSION = '1.0';

export type ConsentRecord = {
  version: string;
  agreedToTerms: boolean;
  dataSharingOptIn: boolean;
  consentedAt: string;
};

export async function saveConsent(dataSharingOptIn: boolean): Promise<ConsentRecord> {
  const record: ConsentRecord = {
    version: CURRENT_CONSENT_VERSION,
    agreedToTerms: true,
    dataSharingOptIn,
    consentedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEYS.CONSENT, JSON.stringify(record));
  return record;
}

export async function getConsent(): Promise<ConsentRecord | null> {
  const val = await AsyncStorage.getItem(KEYS.CONSENT);
  return val ? JSON.parse(val) : null;
}

export async function isConsentCurrent(): Promise<boolean> {
  const consent = await getConsent();
  return consent?.version === CURRENT_CONSENT_VERSION && consent?.agreedToTerms === true;
}

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

export async function isRefreshDue(mostRecentDataTs?: number) {
  // Prefer most recent data timestamp over import date —
  // catches users who keep re-uploading the same old file
  if (mostRecentDataTs && mostRecentDataTs > 0) {
    const diffDays = (Date.now() - mostRecentDataTs) / (1000 * 60 * 60 * 24);
    return diffDays >= 7;
  }
  const last = await getLastImport();
  if (!last) return false;
  const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 7;
}
export type SavedLocation = {
  lat: number;
  lon: number;
  label: string;       // e.g. "Nashville, TN" or "123 Main St"
  confirmedAt: string;
};

const LOCATION_KEYS = {
  HOME: 'lobo_home_location',
  WORK: 'lobo_work_location',
};

export async function saveHomeLocation(loc: Omit<SavedLocation, 'confirmedAt'>): Promise<void> {
  const record: SavedLocation = { ...loc, confirmedAt: new Date().toISOString() };
  await AsyncStorage.setItem(LOCATION_KEYS.HOME, JSON.stringify(record));
}

export async function getHomeLocation(): Promise<SavedLocation | null> {
  const val = await AsyncStorage.getItem(LOCATION_KEYS.HOME);
  return val ? JSON.parse(val) : null;
}

export async function saveWorkLocation(loc: Omit<SavedLocation, 'confirmedAt'>): Promise<void> {
  const record: SavedLocation = { ...loc, confirmedAt: new Date().toISOString() };
  await AsyncStorage.setItem(LOCATION_KEYS.WORK, JSON.stringify(record));
}

export async function getWorkLocation(): Promise<SavedLocation | null> {
  const val = await AsyncStorage.getItem(LOCATION_KEYS.WORK);
  return val ? JSON.parse(val) : null;
}

export async function clearHomeLocation(): Promise<void> {
  await AsyncStorage.removeItem(LOCATION_KEYS.HOME);
}

export async function clearWorkLocation(): Promise<void> {
  await AsyncStorage.removeItem(LOCATION_KEYS.WORK);
}
