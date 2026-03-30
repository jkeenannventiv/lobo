import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { streamParseTimeline } from '../config/streamParser';
import { initDatabase, clearVisits, insertVisits, logImport } from '../config/database';
import { saveLastImport } from '../config/storage';
import LogoHeader from '../components/LogoHeader';

const isWeb = Platform.OS === 'web';

export default function ProcessingScreen({ navigation, route }: any) {
  const { fileUri, fileName } = route.params;
  const [status, setStatus] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    processFile();
  }, []);

  const processFile = async () => {
    try {
      setStatus('Setting up database...');
      await initDatabase();

      setStatus('Reading file...');

      const result = await streamParseTimeline(
        fileUri,
        (parsed, total) => {
          const pct = total > 0 ? Math.round((parsed / total) * 100) : 0;
          setProgress(pct);
          setStatus(`Reading data... ${pct}%`);
        }
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      const records = result.records;

      if (records.length === 0) {
        setError('No records found in this file. Please make sure you are exporting your Timeline from Google Maps.');
        return;
      }

      setStatus(`Found ${records.length.toLocaleString()} records (${result.format === 'new_ios' ? 'iOS format' : 'Android/Web format'})...`);
      await clearVisits();

      const batchSize = 500;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize).map((r: any) => ({
          timestamp: r.timestamp,
          latitude: r.latitude,
          longitude: r.longitude,
          activity: r.activity,
          duration_minutes: r.durationMinutes,
          distance_meters: r.distanceMeters || null,
          place_name: null,
          category: null,
          place_id: r.placeId || null,
        }));
        await insertVisits(batch);
        const pct = Math.round(((i + batchSize) / records.length) * 100);
        setStatus(`Storing records... ${Math.min(pct, 100)}%`);
      }

      await logImport(records.length, 'new');
      await saveLastImport();
           // Log to Supabase in background
      import('../config/userService').then(async ({ getUserId, logImportToSupabase, pushBasicImportFlagsToSupabase }) => {
        const userId = await getUserId();
        if (userId) logImportToSupabase(userId, records.length, 'new');
        // Push basic import flags anonymously
        const { getSession, getConsent } = await import('../config/storage');
        const session = await getSession();
        const consent = await getConsent();
        if (session?.phone && consent?.dataSharingOptIn) {
          await pushBasicImportFlagsToSupabase(session.phone, records.length, true);
        }
      });


      setStatus('Done!');
      setTimeout(() => {
        navigation.replace('Enrichment');
      }, 1000);

    } catch (e: any) {
      setError(e.message || 'Something went wrong processing your file.');
    }
  };

  return (
    <View style={styles.container}>
      <LogoHeader />
      <View style={styles.inner}>
        {!error ? (
          <>
            <ActivityIndicator size="large" color="#1a3a5c" style={styles.spinner} />
            <Text style={styles.title}>Processing Your Data</Text>
            <Text style={styles.status}>{status}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.hint}>
              This may take a minute for large files.{'\n'}
              Please keep the app open.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.title}>Something Went Wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  spinner: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
    textAlign: 'center',
  },
  status: {
    fontSize: 16,
    color: '#555570',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#1a3a5c',
    borderRadius: 4,
  },
  hint: {
    fontSize: 13,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#e94560',
    textAlign: 'center',
    lineHeight: 22,
  },
});