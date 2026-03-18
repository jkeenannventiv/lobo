import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Platform } from 'react-native';
import { parseTimelineFile } from '../config/parser';
import { initDatabase, clearVisits, insertVisits, logImport } from '../config/database';
import { saveLastImport } from '../config/storage';
import LogoHeader from '../components/LogoHeader';

export default function ProcessingScreen({ navigation, route }: any) {
  const { fileUri, fileName } = route.params;
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState('');

  useEffect(() => {
    processFile();
  }, []);

  const processFile = async () => {
    try {
      setStatus('Setting up database...');
      await initDatabase();

      setStatus('Reading file...');
      let jsonString: string;
      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        jsonString = await response.text();
      } else {
        const FileSystem = await import('expo-file-system/legacy');
        jsonString = await FileSystem.readAsStringAsync(fileUri);
      }

      setStatus('Parsing Timeline data...');
      const { records, format, error: parseError } = parseTimelineFile(jsonString);

      if (parseError) {
        setError(parseError);
        return;
      }

      const MAX_RECORDS = 5000;
      const trimmedRecords = records.slice(-MAX_RECORDS);
      setStatus(`Processing ${trimmedRecords.length.toLocaleString()} of ${records.length.toLocaleString()} records...`);
      await clearVisits();

      const batchSize = 500;
      for (let i = 0; i < trimmedRecords.length; i += batchSize) {
        const batch = trimmedRecords.slice(i, i + batchSize).map(r => ({
          timestamp: r.timestamp,
          latitude: r.latitude,
          longitude: r.longitude,
          activity: r.activity,
          duration_minutes: r.durationMinutes,
          place_name: null,
          category: null,
          place_id: r.placeId || null,
        }));
        await insertVisits(batch);
        const progress = Math.round(((i + batchSize) / records.length) * 100);
        setStatus(`Processing records... ${Math.min(progress, 100)}%`);
      }

      await logImport(trimmedRecords.length, format);
      await saveLastImport();

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
            <Text style={styles.hint}>
              This may take a few minutes for large files.{'\n'}
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
    marginBottom: 24,
    textAlign: 'center',
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