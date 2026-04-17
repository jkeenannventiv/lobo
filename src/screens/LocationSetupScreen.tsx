import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LogoHeader from '../components/LogoHeader';
import {
  saveHomeLocation,
  saveWorkLocation,
  getHomeLocation,
  getWorkLocation,
  clearHomeLocation,
  clearWorkLocation,
  savePendingHomeLocation,
  getPendingHomeLocation,
  clearPendingHomeLocation,
  SavedLocation,
} from '../config/storage';
import { lookupByCoords } from '../config/poi';
import { getAllVisits } from '../config/database';

type LocationType = 'home' | 'work';

type Cluster = {
  lat: number;
  lon: number;
  label: string;
  count: number;
};

type Props = {
  navigation: any;
  route: { params?: { type?: LocationType } };
};

export default function LocationSetupScreen({ navigation, route }: Props) {
  const type: LocationType = route.params?.type || 'home';
  const isHome = type === 'home';

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [current, setCurrent] = useState<SavedLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const existing = isHome ? await getHomeLocation() : await getWorkLocation();
    setCurrent(existing);

    // If pending exists (user tapped Change from banner) — show picker directly
    if (isHome && !existing) {
      const pending = await getPendingHomeLocation();
      if (pending) {
        await buildClusters();
        setShowPicker(true);
        setLoading(false);
        return;
      }
    }

    // Auto-detect top cluster and either save pending (home, no existing)
    // or show the screen normally (work, or home with existing)
    await buildClusters();

    if (isHome && !existing) {
      // Save top cluster as pending and return to HomeScreen banner
      const topCluster = await getTopCluster(true);
      if (topCluster) {
        await savePendingHomeLocation(topCluster);
        navigation.goBack();
        return;
      }
    }

    setLoading(false);
  };

  // Build top-5 location clusters from visit data for the picker
  const buildClusters = async () => {
    try {
      const visits = await getAllVisits();
      if (visits.length === 0) return;

      const now = Date.now();
      const cutoff90 = now - (90 * 24 * 60 * 60 * 1000);
      const recentVisits = visits.filter(v => v.timestamp >= cutoff90);
      const source = recentVisits.length >= 10 ? recentVisits : visits;

      // For home: use overnight visits only. For work: weekday business hours.
      const filtered = source.filter(v => {
        const h = new Date(v.timestamp).getHours();
        const dow = new Date(v.timestamp).getDay();
        if (isHome) return v.activity === 'Visit' && 
           (h >= 22 || h <= 4) && (v.duration_minutes || 0) >= 240;
      });

      // Use filtered visits if we have any — don't fall back to all visits
      // which would return daytime/high-frequency locations instead
      const sourceVisits = filtered.length > 0 ? filtered : source;
      const clusterMap: Record<string, { lat: number; lon: number; count: number }> = {};
      for (const v of sourceVisits) {
        const key = `${v.latitude.toFixed(1)},${v.longitude.toFixed(1)}`;
        if (!clusterMap[key]) clusterMap[key] = { lat: v.latitude, lon: v.longitude, count: 0 };
        clusterMap[key].count++;
      }

      // Take top 5 clusters and reverse geocode each for a readable label
      const top5 = Object.values(clusterMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const labeled: Cluster[] = await Promise.all(
        top5.map(async (c) => {
          const poi = await lookupByCoords(c.lat, c.lon);
          const label = poi.address
            ? poi.address.split(',').slice(-3).join(',').trim()
            : `${c.lat.toFixed(3)}, ${c.lon.toFixed(3)}`;
          return { lat: c.lat, lon: c.lon, label, count: c.count };
        })
      );

      setClusters(labeled);
    } catch {}
  };

  const getTopCluster = async (isHomeType: boolean): Promise<Cluster | null> => {
    try {
      const visits = await getAllVisits();
      if (visits.length === 0) return null;

      const now = Date.now();
      const cutoff90 = now - (90 * 24 * 60 * 60 * 1000);
      const recentVisits = visits.filter(v => v.timestamp >= cutoff90);
      const source = recentVisits.length >= 10 ? recentVisits : visits;

      const filtered = source.filter(v => {
        const h = new Date(v.timestamp).getHours();
        const dow = new Date(v.timestamp).getDay();
        if (isHomeType) return v.activity === 'Visit' && 
           (h >= 22 || h <= 4) && 
           (v.duration_minutes || 0) >= 240;
        return dow >= 1 && dow <= 5 && h >= 8 && h < 18;
      });

      const sourceVisits = filtered.length > 0 ? filtered : source;
      const clusterMap: Record<string, { lat: number; lon: number; count: number }> = {};
      for (const v of sourceVisits) {
        const key = `${v.latitude.toFixed(1)},${v.longitude.toFixed(1)}`;
        if (!clusterMap[key]) clusterMap[key] = { lat: v.latitude, lon: v.longitude, count: 0 };
        clusterMap[key].count++;
      }

      const top = Object.values(clusterMap).sort((a, b) => b.count - a.count)[0];
      if (!top) return null;

      const poi = await lookupByCoords(top.lat, top.lon);
      const label = poi.address
        ? poi.address.split(',').slice(-3).join(',').trim()
        : `${top.lat.toFixed(3)}, ${top.lon.toFixed(3)}`;
      return { lat: top.lat, lon: top.lon, label, count: top.count };
    } catch {
      return null;
    }
  };

  const handleSelectCluster = async (cluster: Cluster) => {
    const loc = { lat: cluster.lat, lon: cluster.lon, label: cluster.label };
    if (isHome) {
      await saveHomeLocation(loc);
      await clearPendingHomeLocation();
    } else {
      await saveWorkLocation(loc);
    }
    setSaved(true);
    setTimeout(() => navigation.goBack(), 800);
  };

  const handleConfirmCurrent = async () => {
    if (!current) return;
    setSaved(true);
    setTimeout(() => navigation.goBack(), 800);
  };

  const handleClear = async () => {
    if (isHome) await clearHomeLocation();
    else await clearWorkLocation();
    setCurrent(null);
    setShowPicker(true);
  };

  const emoji = isHome ? '🏠' : '💼';
  const title = isHome ? 'Home Location' : 'Work / School Location';
  const desc = isHome
    ? 'Helps Lobo accurately identify nights away and how much time you spend at home.'
    : 'Helps Lobo identify your work or school and calculate time spent there.';

  if (loading) {
    return (
      <View style={styles.container}>
        <LogoHeader />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1a3a5c" />
          <Text style={styles.loadingText}>Detecting your {isHome ? 'home' : 'work'} location...</Text>
        </View>
      </View>
    );
  }

  if (saved) {
    return (
      <View style={styles.container}>
        <LogoHeader />
        <View style={styles.centered}>
          <Text style={styles.savedEmoji}>✅</Text>
          <Text style={styles.savedText}>Location saved!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LogoHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{desc}</Text>

          {/* Currently saved location */}
          {current && !showPicker && (
            <View style={styles.currentCard}>
              <View style={styles.currentHeader}>
                <Text style={styles.currentLabel}>Currently set to:</Text>
                <TouchableOpacity onPress={handleClear}>
                  <Text style={styles.clearBtn}>Clear</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.currentLocation}>{current.label}</Text>
              <View style={styles.currentActions}>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmCurrent}>
                  <Text style={styles.confirmBtnText}>✓ Keep This</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeBtn} onPress={() => setShowPicker(true)}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Cluster picker */}
          {(showPicker || !current) && (
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>
                {isHome
                  ? 'Where do you sleep most nights?'
                  : 'Where do you spend weekday mornings?'}
              </Text>
              <Text style={styles.pickerSubtitle}>
                Based on your location history — tap the one that matches
              </Text>

              {clusters.length === 0 ? (
                <View style={styles.noClusters}>
                  <Text style={styles.noClustersText}>
                    Not enough location data to suggest places yet. Import your Timeline first.
                  </Text>
                </View>
              ) : (
                clusters.map((cluster, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.clusterRow}
                    onPress={() => handleSelectCluster(cluster)}
                  >
                    <View style={styles.clusterRank}>
                      <Text style={styles.clusterRankText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.clusterInfo}>
                      <Text style={styles.clusterLabel}>{cluster.label}</Text>
                      <Text style={styles.clusterCount}>{cluster.count} {isHome ? 'overnight' : 'weekday'} visits</Text>
                    </View>
                    <Text style={styles.clusterChevron}>›</Text>
                  </TouchableOpacity>
                ))
              )}

              <Text style={styles.pickerNote}>
                Don't see the right place? Make sure you've imported recent Timeline data.
              </Text>
            </View>
          )}

          {!isHome && (
            <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.skipText}>Skip — I work from home or multiple locations</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 24, paddingTop: 8, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#555570', textAlign: 'center' },
  savedEmoji: { fontSize: 56, marginBottom: 16 },
  savedText: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#555570' },
  emoji: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  desc: { fontSize: 14, color: '#555570', lineHeight: 21, marginBottom: 24 },
  currentCard: {
    backgroundColor: '#f0f4f8', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  currentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  currentLabel: { fontSize: 12, color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  clearBtn: { fontSize: 13, color: '#e94560', fontWeight: '600' },
  currentLocation: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 14 },
  currentActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1, backgroundColor: '#1a3a5c', padding: 12,
    borderRadius: 10, alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  changeBtn: {
    flex: 1, backgroundColor: '#f0f4f8', padding: 12, borderRadius: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#ddd',
  },
  changeBtnText: { color: '#1a1a2e', fontWeight: '600', fontSize: 14 },
  pickerCard: {
    backgroundColor: '#f0f4f8', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  pickerTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 4 },
  pickerSubtitle: { fontSize: 13, color: '#888', marginBottom: 16 },
  noClusters: { padding: 16, alignItems: 'center' },
  noClustersText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21 },
  clusterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#e8edf2',
  },
  clusterRank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1a3a5c', alignItems: 'center', justifyContent: 'center',
  },
  clusterRankText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  clusterInfo: { flex: 1 },
  clusterLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 2 },
  clusterCount: { fontSize: 12, color: '#888' },
  clusterChevron: { fontSize: 20, color: '#aaa' },
  pickerNote: {
    fontSize: 12, color: '#aaa', textAlign: 'center',
    marginTop: 8, lineHeight: 18,
  },
  skipBtn: { alignItems: 'center', padding: 16 },
  skipText: { fontSize: 13, color: '#888', textDecorationLine: 'underline' },
});
