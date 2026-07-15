import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { streamParseTimeline } from '../config/streamParser';
import { initDatabase, clearVisits, insertVisits, logImport, getMostRecentVisitTimestamp } from '../config/database';
import { saveLastImport } from '../config/storage';
import { FEATURES } from '../config/featureFlags';
import LogoHeader from '../components/LogoHeader';

const isWeb = Platform.OS === 'web';

// Lobo's DocumentPicker call uses copyToCacheDirectory: true, so fileUri here
// points at a copy inside the app's own sandbox — not the original file in
// Downloads. Once we've read it into SQLite we don't need that copy anymore,
// and deleting it needs no special permission since the app owns the path.
async function cleanupCachedSourceFile(fileUri?: string) {
  if (!fileUri || isWeb) return;
  try {
    const FileSystem = await import('expo-file-system/legacy');
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
  } catch {
    // Best-effort — a failed cleanup shouldn't block the user.
  }
}

export default function ProcessingScreen({ navigation, route }: any) {
  const { fileUri, fileName, forceFullReload } = route.params ?? {};
  const [status, setStatus] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [isLargeFile, setIsLargeFile] = useState(false);
  const [isIncremental, setIsIncremental] = useState(false);

  useEffect(() => {
    processFile();
  }, []);

  const processFile = async () => {
    try {
      setStatus('Setting up database...');
      await initDatabase();

      setStatus('Reading file...');

      // Detect large files and warn the user before processing starts
      try {
        const FileSystem = await import('expo-file-system/legacy');
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        const fileSizeBytes = fileInfo.exists && 'size' in fileInfo ? (fileInfo as any).size : 0;
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        if (fileSizeMB > 20) {
          setIsLargeFile(true);
        }
      } catch {}

      // Determine cutoff timestamp for incremental import
      // forceFullReload=true clears everything and reimports from scratch
      // Otherwise, only parse records newer than the most recent visit in the DB
      let sinceTimestamp: number | undefined = undefined;
      let incrementalFlag = false;

      if (!forceFullReload) {
        const mostRecent = await getMostRecentVisitTimestamp();
        if (mostRecent > 0) {
          // Subtract 24 hours to catch any records that may have been
          // missed or updated near the boundary of the last import
          sinceTimestamp = mostRecent - (24 * 60 * 60 * 1000);
          incrementalFlag = true;
          setIsIncremental(true);
          setStatus('Checking for new records...');
        }
      }

      if (!incrementalFlag) {
        // Full reload — clear existing data first
        setStatus('Clearing existing data...');
        await clearVisits();
      }

      const result = await streamParseTimeline(
        fileUri,
        (parsed, total) => {
          const pct = total > 0 ? Math.round((parsed / total) * 100) : 0;
          setProgress(pct);
          setStatus(incrementalFlag
            ? `Scanning for new records... ${pct}%`
            : `Reading data... ${pct}%`
          );
        },
        sinceTimestamp
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      const records = result.records;

      if (records.length === 0 && incrementalFlag) {
        // No new records — that's fine, just navigate forward
        setStatus('Already up to date!');
        await saveLastImport();
        await cleanupCachedSourceFile(fileUri);
        setTimeout(() => {
          navigation.replace('Enrichment');
        }, 1500);
        return;
      }

      if (records.length === 0) {
        setError('No records found in this file. Please make sure you are exporting your Timeline from Google Maps.');
        return;
      }

      setStatus(`Found ${records.length.toLocaleString()} ${incrementalFlag ? 'new' : ''} records (${result.format === 'new_ios' ? 'iOS format' : 'Android/Web format'})...`);

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
      await cleanupCachedSourceFile(fileUri);

      // Log to Supabase in background — only when feature is enabled
      if (FEATURES.SUPABASE_LOGGING_ENABLED) {
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
      }

      // Check if data is sparse — few visits might mean Timeline was recently enabled
      const visitCount = records.filter((r: any) => r.activity === 'Visit').length;
      const totalCount = records.length;
      if (!incrementalFlag) {
        if (visitCount === 0 && totalCount > 0) {
          setWarning('We imported your data but found no place visits — this can happen if Google Timeline was recently enabled or if your export only contains driving data. Your insights will improve as Google captures more visits over time.');
        } else if (visitCount < 10 && totalCount > 50) {
          setWarning(`We found ${visitCount} place visits out of ${totalCount} records. For best results, make sure Google Timeline has been active for at least a few weeks.`);
        }
      }

      setStatus('Done!');
      setTimeout(() => {
        navigation.replace('Enrichment');
      }, 1500);

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
            {warning ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ) : isLargeFile && !isIncremental ? (
              <View style={styles.largeFileBox}>
                <Text style={styles.largeFileTitle}>⏳ Large file detected</Text>
                <Text style={styles.largeFileText}>
                  Your Timeline file is large — this initial import may take 30–60 minutes.
                  This is a one-time process. Future refreshes will only import new data and complete in minutes.
                </Text>
                <Text style={styles.largeFileText} style={{ marginTop: 8, fontWeight: '600', color: '#1a3a5c' } as any}>
                  Keep the app open and screen on — processing pauses if the screen goes dark.
                </Text>
              </View>
            ) : (
              <Text style={styles.hint}>
                This may take a minute for large files.{'\n'}
                Please keep the app open.
              </Text>
            )}
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
  warningBox: {
    backgroundColor: '#fff8ee',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f5a623',
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#555570',
    lineHeight: 20,
    textAlign: 'center',
  },
  largeFileBox: {
    backgroundColor: '#eef4fb',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1a3a5c',
    marginTop: 8,
    width: '100%',
  },
  largeFileTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  largeFileText: {
    fontSize: 13,
    color: '#555570',
    lineHeight: 20,
  },
});
