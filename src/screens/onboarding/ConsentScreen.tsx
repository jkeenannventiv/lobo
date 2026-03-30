import React, { useState } from 'react';
import LogoHeader from '../../components/LogoHeader';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { saveConsent } from '../../config/storage';
import { getUserId, syncConsentToSupabase } from '../../config/userService';

export default function ConsentScreen({ navigation }: any) {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [dataSharingOptIn, setDataSharingOptIn] = useState(true);

  const handleContinue = async () => {
    if (!termsAgreed) return;

    // Save consent locally
    const record = await saveConsent(dataSharingOptIn);

    // Push to Supabase in background
    getUserId().then(userId => {
      if (userId) {
        syncConsentToSupabase(
          userId,
          record.version,
          record.dataSharingOptIn,
          record.consentedAt
        );
      }
    });

    navigation.navigate('Location');
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={styles.title}>Your Privacy</Text>
          <Text style={styles.subtitle}>
            Before we get started, here's how Lobo works with your data.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.factRow}>
            <Text style={styles.factIcon}>📱</Text>
            <View style={styles.factText}>
              <Text style={styles.factTitle}>Your location data stays on your device</Text>
              <Text style={styles.factDesc}>
                Raw GPS coordinates and place history are stored locally and never transmitted to our servers.
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.factRow}>
            <Text style={styles.factIcon}>🔍</Text>
            <View style={styles.factText}>
              <Text style={styles.factTitle}>We enrich your data with place names</Text>
              <Text style={styles.factDesc}>
                Location coordinates are sent to Google Places to identify the name and type of each place you visited. No other data leaves your device during this step.
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.factRow}>
            <Text style={styles.factIcon}>📊</Text>
            <View style={styles.factText}>
              <Text style={styles.factTitle}>Insights are computed on your device</Text>
              <Text style={styles.factDesc}>
                All charts, stats, and behavioral profiles are calculated locally. Only anonymous, aggregated segment flags can optionally be shared — never your actual location history.
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.factRow}>
            <Text style={styles.factIcon}>🗑️</Text>
            <View style={styles.factText}>
              <Text style={styles.factTitle}>Delete anytime</Text>
              <Text style={styles.factDesc}>
                One tap in Settings removes all your data from your device and our servers permanently.
              </Text>
            </View>
          </View>
        </View>

        {/* Terms agreement */}
        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setTermsAgreed(!termsAgreed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, termsAgreed && styles.checkboxChecked]}>
            {termsAgreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>
            I have read and agree to the{' '}
            <Text style={styles.link} onPress={() => openLink('https://getlobo.app/terms')}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.link} onPress={() => openLink('https://getlobo.app/privacy')}>
              Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Data sharing opt-in */}
        <View style={styles.optInCard}>
          <View style={styles.optInHeader}>
            <View style={styles.optInText}>
              <Text style={styles.optInTitle}>Anonymous data sharing</Text>
              <Text style={styles.optInDesc}>
                You're opted in to sharing anonymous behavioral segment flags (e.g. "frequent restaurant visitor") to help us build audience insights. Your identity and location history are never shared. You can turn this off anytime in Settings.
              </Text>
            </View>
            <Switch
              value={dataSharingOptIn}
              onValueChange={setDataSharingOptIn}
              trackColor={{ false: '#e0e0e0', true: '#1a3a5c' }}
              thumbColor={dataSharingOptIn ? '#ffffff' : '#ffffff'}
            />
          </View>
          {dataSharingOptIn && (
            <View style={styles.optInConfirm}>
              <Text style={styles.optInConfirmText}>
                ✓ Only anonymous segment labels are shared — never your name, phone, or location history. US and Canada only.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, !termsAgreed && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!termsAgreed}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Lobo is CCPA and GDPR compliant. We never sell your personal data.
        </Text>

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
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#555570',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  factRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  factIcon: {
    fontSize: 22,
    width: 32,
    marginTop: 1,
  },
  factText: {
    flex: 1,
  },
  factTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 3,
  },
  factDesc: {
    fontSize: 13,
    color: '#555570',
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e8f0',
    marginVertical: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cccccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#1a3a5c',
    borderColor: '#1a3a5c',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    lineHeight: 21,
  },
  link: {
    color: '#1a3a5c',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  optInCard: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  optInHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  optInText: {
    flex: 1,
  },
  optInTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  optInDesc: {
    fontSize: 13,
    color: '#555570',
    lineHeight: 19,
  },
  optInConfirm: {
    marginTop: 12,
    backgroundColor: '#e8f4e8',
    borderRadius: 8,
    padding: 10,
  },
  optInConfirmText: {
    fontSize: 12,
    color: '#2d6a4f',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#1a3a5c',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#aaaaaa',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: 12,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 18,
  },
});
