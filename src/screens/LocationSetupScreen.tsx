import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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

type Props = {
  navigation: any;
  route: { params?: { type?: LocationType } };
};

export default function LocationSetupScreen({ navigation, route }: Props) {
  const type: LocationType = route.params?.type || 'home';
  const isHome = type === 'home';

  const [detected, setDetected] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [current, setCurrent] = useState<SavedLocation | null>(null);
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ lat: number; lon: number; label: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    // Load existing saved location
    const existing = isHome ? await getHomeLocation() : await getWorkLocation();
    setCurrent(existing);

    // If there's already a pending detection (user tapped Change from banner),
    // just show the editing UI — don't re-detect and navigate back
    if (isHome && !existing) {
      const pending = await getPendingHomeLocation();
      if (pending) {
        setDetected(pending);
        setEditing(true);
        setLoading(false);
        return;
      }
    }

    // Auto-detect from visit data
    try {
      const visits = await getAllVisits();
      if (visits.length > 0) {
        // Weight detection to recent 90 days first, fall back to all-time
        const now = Date.now();
        const cutoff90 = now - (90 * 24 * 60 * 60 * 1000);
        const recentVisits = visits.filter(v => v.timestamp >= cutoff90);
        const source90 = recentVisits.length >= 10 ? recentVisits : visits;

        const filtered = source90.filter(v => {
          const h = new Date(v.timestamp).getHours();
          const dow = new Date(v.timestamp).getDay();
          if (isHome) return h >= 22 || h <= 5;
          return dow >= 1 && dow <= 5 && h >= 8 && h < 18;
        });

        const source = filtered.length >= 5 ? filtered : source90;
        const clusters: Record<string, { lat: number; lon: number; count: number }> = {};
        for (const v of source) {
          const key = `${v.latitude.toFixed(1)},${v.longitude.toFixed(1)}`;
          if (!clusters[key]) clusters[key] = { lat: v.latitude, lon: v.longitude, count: 0 };
          clusters[key].count++;
        }
        const top = Object.values(clusters).sort((a, b) => b.count - a.count)[0];
        if (top) {
          const poi = await lookupByCoords(top.lat, top.lon);
          const label = poi.address
            ? poi.address.split(',').slice(-3).join(',').trim()
            : `${top.lat.toFixed(3)}, ${top.lon.toFixed(3)}`;
          const detectedLoc = { lat: top.lat, lon: top.lon, label };
          setDetected(detectedLoc);

          // For home with no existing location: save as pending and go back
          // so HomeScreen shows the inline confirmation banner
          if (isHome && !existing) {
            await savePendingHomeLocation(detectedLoc);
            navigation.goBack();
            return;
          }
        }
      }
    } catch {}
    setLoading(false);
  };

  const handleConfirmDetected = async () => {
    if (!detected) return;
    if (isHome) {
      await saveHomeLocation(detected);
    } else {
      await saveWorkLocation(detected);
    }
    setSaved(true);
    setTimeout(() => navigation.goBack(), 1000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      // Bias search toward the user's known location (detected home/work or current)
      const biasLat = detected?.lat ?? current?.lat;
      const biasLon = detected?.lon ?? current?.lon;
      const biasParams = biasLat && biasLon
        ? `&lat=${biasLat}&lon=${biasLon}`
        : '';

      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery.trim())}&limit=5&lang=en${biasParams}`
      );
      if (response.ok) {
        const data = await response.json();
        // Pick the best result — prefer results in the same country/state as bias location
        const features = data?.features ?? [];
        let feature = features[0];

        // If we have a bias location, prefer results within ~100 miles
        if (biasLat && biasLon && features.length > 1) {
          const nearby = features.find((f: any) => {
            const [fLon, fLat] = f.geometry.coordinates;
            const dLat = (fLat - biasLat) * Math.PI / 180;
            const dLon = (fLon - biasLon) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(biasLat * Math.PI/180) * Math.cos(fLat * Math.PI/180) * Math.sin(dLon/2)**2;
            const distMiles = 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return distMiles < 200;
          });
          if (nearby) feature = nearby;
        }

        if (feature) {
          const [lon, lat] = feature.geometry.coordinates;
          const p = feature.properties;
          const parts = [
            p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street,
            p.city || p.town || p.village,
            p.state,
          ].filter(Boolean);
          const label = parts.length > 0 ? parts.join(', ') : (p.name || searchQuery.trim());
          setSearchResult({ lat, lon, label });
        } else {
          setSearchResult({ lat: 0, lon: 0, label: '' });
        }
      } else {
        setSearchResult({ lat: 0, lon: 0, label: '' });
      }
    } catch {
      setSearchResult({ lat: 0, lon: 0, label: '' });
    }
    setSearching(false);
  };

  const handleSaveSearch = async () => {
    if (!searchResult || searchResult.lat === 0) return;
    const loc = searchResult;
    if (isHome) {
      await saveHomeLocation(loc);
      await clearPendingHomeLocation();
    } else {
      await saveWorkLocation(loc);
    }
    setSaved(true);
    setTimeout(() => navigation.goBack(), 1000);
  };

  const handleClear = async () => {
    if (isHome) await clearHomeLocation();
    else await clearWorkLocation();
    setCurrent(null);
    setDetected(null);
    setSaved(false);
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.desc}>{desc}</Text>

        {/* Current saved location */}
        {current && !editing && (
          <View style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <Text style={styles.currentLabel}>Currently set to:</Text>
              <TouchableOpacity onPress={handleClear}>
                <Text style={styles.clearBtn}>Clear</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.currentLocation}>{current.label}</Text>
            <TouchableOpacity style={styles.changeBtn} onPress={() => setEditing(true)}>
              <Text style={styles.changeBtnText}>Change Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Detected location — show if no current or editing */}
        {(!current || editing) && detected && !editing && (
          <View style={styles.detectedCard}>
            <Text style={styles.detectedTitle}>We detected your {isHome ? 'home' : 'work'} near:</Text>
            <Text style={styles.detectedLocation}>{detected.label}</Text>
            <View style={styles.detectedActions}>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmDetected}>
                <Text style={styles.confirmBtnText}>✓ Looks Right</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                <Text style={styles.editBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* No detection and not editing */}
        {(!current && !detected && !editing) && (
          <View style={styles.noDetectCard}>
            <Text style={styles.noDetectText}>
              We couldn't auto-detect your {isHome ? 'home' : 'work'} location yet — you may need to import data first. You can search for your address below.
            </Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>Search for Address</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search / manual entry */}
        {(editing || (!current && !detected)) && (
          <View style={styles.searchCard}>
            <Text style={styles.searchTitle}>Search for an address or place:</Text>
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrapper}>
                <TextInput
                  style={styles.searchInput}
                  placeholder={isHome ? 'e.g. 123 Main St, Nashville' : 'e.g. Acme Corp, Nashville'}
                  placeholderTextColor="#aaa"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    if (!text) setSearchResult(null);
                  }}
                  onSubmitEditing={handleSearch}
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.searchClear}
                    onPress={() => { setSearchQuery(''); setSearchResult(null); }}
                  >
                    <Text style={styles.searchClearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
                {searching
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <Text style={styles.searchBtnText}>Search</Text>
                }
              </TouchableOpacity>
            </View>

            {searchResult && searchResult.lat !== 0 && (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Found:</Text>
                <Text style={styles.resultAddress}>{searchResult.label}</Text>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveSearch}>
                  <Text style={styles.confirmBtnText}>✓ Save This Location</Text>
                </TouchableOpacity>
              </View>
            )}
            {searchResult && searchResult.lat === 0 && (
              <View style={[styles.resultCard, { borderColor: '#e94560' }]}>
                <Text style={{ color: '#e94560', fontSize: 14 }}>
                  Address not found. Try being more specific — include city and state.
                </Text>
              </View>
            )}
          </View>
        )}

        {(!isHome) && (
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
  currentLocation: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 12 },
  changeBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#1a3a5c', borderRadius: 8 },
  changeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  detectedCard: {
    backgroundColor: '#eef4fb', borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: '#1a3a5c', marginBottom: 16,
  },
  detectedTitle: { fontSize: 13, color: '#555570', marginBottom: 6 },
  detectedLocation: { fontSize: 16, fontWeight: '600', color: '#1a1a2e', marginBottom: 14 },
  detectedActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: { flex: 1, backgroundColor: '#1a3a5c', padding: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  editBtn: { flex: 1, backgroundColor: '#f0f4f8', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  editBtnText: { color: '#1a1a2e', fontWeight: '600', fontSize: 14 },
  noDetectCard: { backgroundColor: '#f0f4f8', borderRadius: 14, padding: 16, marginBottom: 16 },
  noDetectText: { fontSize: 14, color: '#555570', lineHeight: 21, marginBottom: 12 },
  searchCard: { backgroundColor: '#f0f4f8', borderRadius: 14, padding: 16, marginBottom: 16 },
  searchTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', marginBottom: 10 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInputWrapper: { flex: 1, position: 'relative', justifyContent: 'center' },
  searchInput: {
    flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14, color: '#1a1a2e',
    borderWidth: 1, borderColor: '#ddd', paddingRight: 36,
  },
  searchClear: {
    position: 'absolute', right: 10, top: 0, bottom: 0,
    justifyContent: 'center', paddingHorizontal: 4,
  },
  searchClearText: { fontSize: 14, color: '#999', fontWeight: '600' },
  searchBtn: { backgroundColor: '#1a3a5c', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  resultCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#ddd' },
  resultLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  resultAddress: { fontSize: 15, fontWeight: '600', color: '#1a1a2e', marginBottom: 10 },
  skipBtn: { alignItems: 'center', padding: 16 },
  skipText: { fontSize: 13, color: '#888', textDecorationLine: 'underline' },
});
