import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  VISITS: 'lobo_visits',
  IMPORT_LOG: 'lobo_import_log',
};

export type Visit = {
  id: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  activity: string;
  duration_minutes: number;
  place_name: string | null;
  category: string | null;
  place_id: string | null;
};

export async function initDatabase() {
  return true;
}

export async function clearVisits() {
  await AsyncStorage.removeItem(KEYS.VISITS);
}

export async function insertVisits(visits: Omit<Visit, 'id'>[]) {
  const existing = await getAllVisits();
  const withIds = visits.map((v, i) => ({ ...v, id: existing.length + i + 1 }));
  const all = [...existing, ...withIds];
  await AsyncStorage.setItem(KEYS.VISITS, JSON.stringify(all));
}

export async function updateVisitPoi(
  latitude: number,
  longitude: number,
  place_name: string | null,
  category: string | null
) {
  const visits = await getAllVisits();
  const keyToMatch = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const updated = visits.map(v => {
    const visitKey = `${v.latitude.toFixed(4)},${v.longitude.toFixed(4)}`;
    if (visitKey === keyToMatch) {
      return { ...v, place_name, category };
    }
    return v;
  });
  await AsyncStorage.setItem(KEYS.VISITS, JSON.stringify(updated));
}

export async function getAllVisits(): Promise<Visit[]> {
  try {
    const val = await AsyncStorage.getItem(KEYS.VISITS);
    return val ? JSON.parse(val) : [];
  } catch {
    return [];
  }
}

export async function logImport(recordCount: number, format: string) {
  const log = { importedAt: Date.now(), recordCount, format };
  await AsyncStorage.setItem(KEYS.IMPORT_LOG, JSON.stringify(log));
}

export async function getVisitCount(): Promise<number> {
  const visits = await getAllVisits();
  return visits.length;
}

export async function getTopActivities(): Promise<{ activity: string; count: number }[]> {
  const visits = await getAllVisits();
  const counts: Record<string, number> = {};
  for (const v of visits) {
    const key = v.activity || 'Unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([activity, count]) => ({ activity, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export async function getTopCategories(days = 36500): Promise<{ category: string; count: number }[]> {  const visits = await getAllVisits();
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const counts: Record<string, number> = {};
  for (const v of visits) {
    if (v.timestamp >= cutoff && v.category) {
      counts[v.category] = (counts[v.category] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export async function getTopPlaces(days = 36500): Promise<{ name: string; count: number; category: string }[]> {  const visits = await getAllVisits();
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const counts: Record<string, { count: number; category: string }> = {};
  for (const v of visits) {
    if (v.timestamp >= cutoff && v.place_name) {
      if (!counts[v.place_name]) {
        counts[v.place_name] = { count: 0, category: v.category || 'Unknown' };
      }
      counts[v.place_name].count++;
    }
  }
  return Object.entries(counts)
    .map(([name, { count, category }]) => ({ name, count, category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function getRecentVisits(limit = 20): Promise<Visit[]> {
  const visits = await getAllVisits();
  return visits
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export async function getEnrichedCount(): Promise<number> {
  const visits = await getAllVisits();
  return visits.filter(v => v.place_name !== null || v.category !== null).length;
}