import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import LogoHeader from '../components/LogoHeader';
import { getAllVisits, updateVisitPoi, updateVisitPoiByPlaceId, getWeekInReview, WeekInReview, computeSegments, getNightsAwayFromHome } from '../config/database';
import { getLastImportTimestamp } from '../config/database';
import { lookupPoi } from '../config/poi';
import { lookupCategory, applyNameHeuristics, normalizeGoogleCategory } from '../config/categoryMappings';

export default function EnrichmentScreen({ navigation }: any) {
  const [status, setStatus] = useState('Starting enrichment...');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [weekReview, setWeekReview] = useState<WeekInReview | null>(null);

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
          // Apply category corrections in priority order:
          // 1. Chain lookup (exact brand match) — highest confidence
          // 2. Name keyword heuristics — beats Google even if Google has a category
          // 3. Google category normalization — only if name gives us nothing
          let correctedCategory = result.category;
          if (result.name) {
            const nameMatch = lookupCategory(result.name) || applyNameHeuristics(result.name);
            if (nameMatch) {
              // Name-based match always wins — overrides whatever Google said
              correctedCategory = nameMatch.subcategory || nameMatch.category;
            } else {
              // No name match — normalize Google's raw category if possible
              const normalized = normalizeGoogleCategory(result.category);
              if (normalized) {
                correctedCategory = normalized.subcategory || normalized.category;
              }
            }
          }
          poi = { name: result.name, category: correctedCategory };
          seen.set(key, poi);
          await new Promise(r => setTimeout(r, 200));
        }

        if (visit.place_id) {
          await updateVisitPoiByPlaceId(visit.place_id, poi.name, poi.category);
        } else {
          await updateVisitPoi(visit.latitude, visit.longitude, poi.name, poi.category);
        }
        processed++;
        setCurrent(processed);
        setStatus(
          `Enriching visits... ${processed} of ${toEnrich.length}\n${seen.size} unique locations looked up`
        );
      }

      setStatus(`Done! Enriched ${toEnrich.length} visits across ${seen.size} unique locations.`);

      // Compute week in review
      try {
        const importTs = await getLastImportTimestamp();
        const review = await getWeekInReview(importTs);
        setWeekReview(review);
      } catch {}

      // Push full segment flags to Supabase in background
      import('../config/userService').then(async ({ pushSegmentsToSupabase }) => {
        try {
          const { getSession, getConsent, getHomeLocation } = await import('../config/storage');
          const session = await getSession();
          const consent = await getConsent();
          if (session?.phone && consent?.dataSharingOptIn) {
            const segs = await computeSegments();
            const nightsData = await getNightsAwayFromHome();
            const homeLoc = await getHomeLocation();
            await pushSegmentsToSupabase(
              session.phone,
              segs.map(s => ({ id: s.id, level: s.level })),
              homeLoc?.lat ?? nightsData.homeLat,
              homeLoc?.lon ?? nightsData.homeLon,
              true
            );
          }
        } catch (e) {
          console.error('Segment push error:', e);
        }
      });

      setDone(true);

    } catch (e: any) {
      setError(e.message || 'Something went wrong during enrichment.');
    }
  };

  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
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

        {done && weekReview && (
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>🏆 Your Week in Review</Text>
            {weekReview.topPlace && (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewEmoji}>📍</Text>
                <Text style={styles.reviewText}>
                  Most visited: <Text style={styles.reviewHighlight}>{weekReview.topPlace}</Text>
                  {weekReview.topPlaceCount > 1 ? ` (${weekReview.topPlaceCount}x)` : ''}
                </Text>
              </View>
            )}
            {weekReview.uniquePlaces > 0 && (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewEmoji}>🗺️</Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewHighlight}>{weekReview.uniquePlaces} unique places</Text> visited this week
                </Text>
              </View>
            )}
            {weekReview.totalTrips > 0 && (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewEmoji}>🚗</Text>
                <Text style={styles.reviewText}>
                  <Text style={styles.reviewHighlight}>{weekReview.totalTrips} trips</Text> recorded
                </Text>
              </View>
            )}
            {weekReview.activityVsAvg !== 'insufficient' && (
              <View style={styles.reviewRow}>
                <Text style={styles.reviewEmoji}>
                  {weekReview.activityVsAvg === 'more' ? '⬆️' : weekReview.activityVsAvg === 'less' ? '⬇️' : '➡️'}
                </Text>
                <Text style={styles.reviewText}>
                  {weekReview.activityVsAvg === 'more'
                    ? `More active than usual — ${weekReview.weekVisits} visits vs your avg of ${weekReview.avgWeeklyVisits}`
                    : weekReview.activityVsAvg === 'less'
                    ? `Quieter week than usual — ${weekReview.weekVisits} visits vs your avg of ${weekReview.avgWeeklyVisits}`
                    : `About average this week — ${weekReview.weekVisits} visits`}
                </Text>
              </View>
            )}
          </View>
        )}

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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  inner: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 40,
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
  reviewCard: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  reviewEmoji: {
    fontSize: 16,
    width: 24,
  },
  reviewText: {
    flex: 1,
    fontSize: 14,
    color: '#555570',
    lineHeight: 20,
  },
  reviewHighlight: {
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
});