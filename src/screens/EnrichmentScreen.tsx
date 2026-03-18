import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import LogoHeader from '../components/LogoHeader';
import { getAllVisits, updateVisitPoi } from '../config/database';
import { lookupPoi } from '../config/poi';

export default function EnrichmentScreen({ navigation }: any) {
  const [status, setStatus] = useState('Starting enrichment...');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    runEnrichment();
  }, []);

  const runEnrichment = async () => {
    try {
      const visits = await getAllVisits();
      const toEnrich = visits.filter(v => v.activity === 'Visit' && !v.place_name && !v.category);
      setTotal(toEnrich.length);

      if (toEnrich.length === 0) {
        setStatus('All visits already enriched!');
        setDone(true);
        return;
      }

      setStatus(`Looking up ${toEnrich.length} visit locations...`);

      const seen = new Map<string, { name: string | null; category: string | null }>();
      let processed = 0;

      for (const visit of toEnrich) {
        const key = visit.place_id || `${visit.latitude.toFixed(4)},${visit.longitude.toFixed(4)}`;

        let poi: { name: string | null; category: string | null };

        if (seen.has(key)) {
          poi = seen.get(key)!;
        } else {
          const result = await lookupPoi(visit.latitude, visit.longitude, visit.place_id);
          poi = { name: result.name, category: result.category };
          seen.set(key, poi);
          await new Promise(r => setTimeout(r, 200));
        }

        await updateVisitPoi(visit.latitude, visit.longitude, poi.name, poi.category);
        processed++;
        setCurrent(processed);
        setStatus(
          `Enriching visits... ${processed} of ${toEnrich.length}\n${seen.size} unique locations looked up`
        );
      }

      setStatus(`Done! Enriched ${toEnrich.length} visits across ${seen.size} unique locations.`);
      setDone(true);

    } catch (e: any) {
      setError(e.message || 'Something went wrong during enrichment.');
    }
  };

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={styles.container}>
      <LogoHeader />
      <View style={styles.inner}>
        <Text style={styles.title}>
          {done ? '✅ Enrichment Complete!' : '🔍 Enriching Your Data'}
        </Text>
        <Text style={styles.subtitle}>
          {done
            ? 'Lobo has identified the places you visited.'
            : 'Lobo is identifying the places behind your location history.'}
        </Text>

        {!done && !error && (
          <>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </>
        )}

        <Text style={styles.status}>{status}</Text>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {done && (
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.replace('Home')}
          >
            <Text style={styles.buttonText}>View My Dashboard →</Text>
          </TouchableOpacity>
        )}

        {!done && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => navigation.replace('Home')}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
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
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#555570',
    marginBottom: 32,
    lineHeight: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f4f8',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#1a3a5c',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#555570',
    textAlign: 'right',
    marginBottom: 24,
  },
  status: {
    fontSize: 14,
    color: '#555570',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorText: {
    fontSize: 14,
    color: '#e94560',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#1a3a5c',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  skipButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  skipText: {
    color: '#555570',
    fontSize: 16,
  },
});