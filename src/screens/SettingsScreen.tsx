import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import LogoHeader from '../components/LogoHeader';
import { getSession, clearSession, getConsent, saveConsent, ConsentRecord, getHomeLocation, getWorkLocation, clearHomeLocation, clearWorkLocation, clearPendingHomeLocation, SavedLocation } from '../config/storage';
import { getUserId, syncConsentToSupabase } from '../config/userService';
import { clearVisits } from '../config/database';
import AsyncStorage from '@react-native-async-storage/async-storage';


const requestTrackingPermissionsAsync = async () => {
  if (Platform.OS !== 'ios') return { status: 'granted' };
  const mod = await import('expo-tracking-transparency');
  return mod.requestTrackingPermissionsAsync();
};

export default function SettingsScreen({ navigation }: any) {
  const [phone, setPhone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [homeLocation, setHomeLocation] = useState<SavedLocation | null>(null);
  const [workLocation, setWorkLocation] = useState<SavedLocation | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const session = await getSession();
    if (session) {
      setPhone(session.phone);
      setEmail(session.email);
    }
    const { getVisitCount } = await import('../config/database');
    const count = await getVisitCount();
    setVisitCount(count);
    const consentRecord = await getConsent();
    setConsent(consentRecord);
    const home = await getHomeLocation();
    setHomeLocation(home);
    const work = await getWorkLocation();
    setWorkLocation(work);
  };

  const handleClearData = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('This will delete all your imported Timeline data. Your account will remain active. Are you sure?')
      : await new Promise<boolean>(resolve =>
          Alert.alert(
            'Clear All Data',
            'This will delete all your imported Timeline data. Your account will remain active. Are you sure?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Clear Data', style: 'destructive', onPress: () => resolve(true) },
            ]
          )
        );
    if (!confirmed) return;
    await clearVisits();
    await AsyncStorage.removeItem('lobo_last_import');
    await AsyncStorage.removeItem('lobo_import_log');
    await clearHomeLocation();
    await clearWorkLocation();
    await clearPendingHomeLocation();
    setVisitCount(0);
    setHomeLocation(null);
    setWorkLocation(null);
    if (Platform.OS === 'web') {
      window.alert('Done — your data has been cleared.');
    } else {
      Alert.alert('Done', 'Your data has been cleared.');
    }
  };

  const handleToggleDataSharing = async () => {
  const currentValue = consent?.dataSharingOptIn ?? false;
  const newValue = !currentValue;

  if (newValue && Platform.OS === 'ios') {
    const { status } = await requestTrackingPermissionsAsync();
    if (status !== 'granted') {
      // ATT denied — leave toggle off silently
      return;
    }
  }

  const record = await saveConsent(newValue);
  setConsent(record);
  getUserId().then(userId => {
    if (userId) syncConsentToSupabase(userId, record.version, record.dataSharingOptIn, record.consentedAt);
  });
};

  const handleForceReload = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('This will clear all your data and take you to the import screen for a fresh load. Are you sure?')
      : await new Promise<boolean>(resolve =>
          Alert.alert(
            'Force Full Reload',
            'This will clear all your data and take you to the import screen for a fresh load. Are you sure?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Reload', style: 'destructive', onPress: () => resolve(true) },
            ]
          )
        );
    if (!confirmed) return;
    await clearVisits();
    await AsyncStorage.removeItem('lobo_last_import');
    await AsyncStorage.removeItem('lobo_import_log');
    await clearHomeLocation();
    await clearWorkLocation();
    await clearPendingHomeLocation();
    navigation.navigate('ExportGuide');
  };

  const handleSignOut = async () => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to sign out? Your imported data will be cleared.')
      : await new Promise<boolean>(resolve =>
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out? Your imported data will be cleared.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Sign Out', style: 'destructive', onPress: () => resolve(true) },
            ]
          )
        );
    if (!confirmed) return;
    await clearSession();
    await clearVisits();
    await AsyncStorage.clear();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Splash' }],
    });
  };

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Phone</Text>
            <Text style={styles.rowValue}>{phone || '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{email || '—'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PRIVACY & DATA</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Records stored</Text>
            <Text style={styles.rowValue}>{visitCount.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Anonymous data sharing</Text>
              <Text style={styles.rowHint}>Share behavioral segment flags to support Lobo</Text>
            </View>
            <Switch
              value={consent?.dataSharingOptIn ?? false}
              onValueChange={handleToggleDataSharing}
              trackColor={{ false: '#e0e0e0', true: '#1a3a5c' }}
              thumbColor="#ffffff"
            />
          </View>
          <TouchableOpacity style={styles.row} onPress={handleClearData}>
            <Text style={styles.rowLabel}>Clear all data</Text>
            <Text style={styles.rowArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={handleForceReload}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Force full reload</Text>
              <Text style={styles.rowHint}>Clear data and re-import from scratch</Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MY LOCATIONS</Text>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('LocationSetup', { type: 'home' })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Home Location</Text>
              <Text style={styles.rowHint}>{homeLocation ? homeLocation.label : 'Not set — tap to configure'}</Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('LocationSetup', { type: 'work' })}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Work / School Location</Text>
              <Text style={styles.rowHint}>{workLocation ? workLocation.label : 'Not set — tap to configure'}</Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.1.2</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Website</Text>
            <Text style={styles.rowValue}>getlobo.app</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555570',
    letterSpacing: 1,
    padding: 16,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  rowLabel: {
    fontSize: 15,
    color: '#1a1a2e',
  },
  rowValue: {
    fontSize: 15,
    color: '#555570',
  },
  rowArrow: {
    fontSize: 15,
    color: '#e94560',
  },
  rowHint: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: '#fff0f0',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffcccc',
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e94560',
  },
  back: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#555570',
  },
});