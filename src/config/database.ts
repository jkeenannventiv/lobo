import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SQLite: any = null;
if (!isWeb) {
  try {
    SQLite = require('expo-sqlite');
  } catch (e) {
    // SQLite not available on web
  }
}

let db: any = null;

async function getDb(): Promise<any> {
  if (isWeb) return null;
  if (!db && SQLite) {
    db = await SQLite.openDatabaseAsync('lobo.db');
  }
  return db;
}

export type Visit = {
  id: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  activity: string;
  duration_minutes: number;
  distance_meters: number | null;
  place_name: string | null;
  category: string | null;
  place_id: string | null;
};

// Derive driving duration from distance using speed tiers
// Much more accurate than timestamp-based duration which includes parked time
export function deriveDrivingMinutes(distanceMeters: number | null | undefined): number | null {
  if (!distanceMeters || distanceMeters <= 0) return null;
  const miles = distanceMeters / 1609.34;
  let mph: number;
  if (miles < 3) mph = 15;        // Very short — parking lots, neighborhoods, traffic
  else if (miles < 10) mph = 20;  // City driving with lights
  else if (miles <= 30) mph = 35; // Mixed city/highway
  else mph = 55;                  // Predominantly highway
  // Cap at 75 minutes
  return Math.min(Math.round((miles / mph) * 60), 75);
}

export async function initDatabase() {
  if (isWeb) return true;
  const database = await getDb();
  if (!database) return false;
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      activity TEXT,
      duration_minutes INTEGER,
      distance_meters REAL,
      place_name TEXT,
      category TEXT,
      place_id TEXT
    );
    -- Add distance_meters to existing tables if upgrading
    CREATE TABLE IF NOT EXISTS visits_migration_done (id INTEGER PRIMARY KEY);`);
  // Migrate existing databases to add distance_meters column
  try {
    await database.execAsync('ALTER TABLE visits ADD COLUMN distance_meters REAL;');
  } catch {}
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS import_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imported_at INTEGER NOT NULL,
      record_count INTEGER NOT NULL,
      format TEXT NOT NULL
    );
  `);
  return true;
}

export async function clearVisits() {
  if (isWeb) {
    await AsyncStorage.removeItem('lobo_visits');
    return;
  }
  const database = await getDb();
  await database?.execAsync('DELETE FROM visits;');
}

export async function insertVisits(visits: Omit<Visit, 'id'>[]) {
  if (isWeb) {
    const existing = await getAllVisits();
    const withIds = visits.map((v, i) => ({ ...v, id: existing.length + i + 1, distance_meters: v.distance_meters ?? null }));
    const all = [...existing, ...withIds];
    await AsyncStorage.setItem('lobo_visits', JSON.stringify(all));
    return;
  }
  const database = await getDb();
  if (!database) return;
  await database.withTransactionAsync(async () => {
    for (const v of visits) {
      await database.runAsync(
        `INSERT INTO visits (timestamp, latitude, longitude, activity, duration_minutes, distance_meters, place_name, category, place_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [v.timestamp, v.latitude, v.longitude, v.activity, v.duration_minutes, v.distance_meters ?? null, v.place_name, v.category, v.place_id]
      );
    }
  });
}

export async function updateVisitPoi(
  latitude: number,
  longitude: number,
  place_name: string | null,
  category: string | null
) {
  if (isWeb) {
    const visits = await getAllVisits();
    const keyToMatch = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const updated = visits.map(v => {
      const visitKey = `${v.latitude.toFixed(4)},${v.longitude.toFixed(4)}`;
      if (visitKey === keyToMatch) {
        return { ...v, place_name, category };
      }
      return v;
    });
    await AsyncStorage.setItem('lobo_visits', JSON.stringify(updated));
    return;
  }
  const database = await getDb();
  await database?.runAsync(
    `UPDATE visits SET place_name = ?, category = ?
     WHERE ROUND(latitude, 4) = ROUND(?, 4) AND ROUND(longitude, 4) = ROUND(?, 4);`,
    [place_name, category, latitude, longitude]
  );
}

export async function updateVisitPoiByPlaceId(
  place_id: string,
  place_name: string | null,
  category: string | null
) {
  if (isWeb) {
    const visits = await getAllVisits();
    const updated = visits.map(v => {
      if (v.place_id === place_id) {
        return { ...v, place_name, category };
      }
      return v;
    });
    await AsyncStorage.setItem('lobo_visits', JSON.stringify(updated));
    return;
  }
  const database = await getDb();
  await database?.runAsync(
    `UPDATE visits SET place_name = ?, category = ? WHERE place_id = ?;`,
    [place_name, category, place_id]
  );
}

export async function getAllVisits(): Promise<Visit[]> {
  if (isWeb) {
    try {
      const val = await AsyncStorage.getItem('lobo_visits');
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync('SELECT * FROM visits ORDER BY timestamp DESC;');
  return results as Visit[];
}

export async function logImport(recordCount: number, format: string) {
  if (isWeb) {
    const log = { importedAt: Date.now(), recordCount, format };
    await AsyncStorage.setItem('lobo_import_log', JSON.stringify(log));
    return;
  }
  const database = await getDb();
  await database?.runAsync(
    `INSERT INTO import_log (imported_at, record_count, format) VALUES (?, ?, ?);`,
    [Date.now(), recordCount, format]
  );
}

export async function getLastImportTimestamp(): Promise<number> {
  if (isWeb) {
    try {
      const val = await AsyncStorage.getItem('lobo_import_log');
      if (val) {
        const log = JSON.parse(val);
        return log.importedAt || Date.now();
      }
    } catch {}
    return Date.now();
  }
  const database = await getDb();
  if (!database) return Date.now();
  const result = await database.getFirstAsync(
    'SELECT imported_at FROM import_log ORDER BY imported_at DESC LIMIT 1;'
  ) as any;
  return result?.imported_at || Date.now();
}

export async function getVisitCount(): Promise<number> {
  if (isWeb) {
    const visits = await getAllVisits();
    return visits.length;
  }
  const database = await getDb();
  if (!database) return 0;
  const result = await database.getFirstAsync('SELECT COUNT(*) as count FROM visits;');
  return (result as any)?.count ?? 0;
}

export async function getTopActivities(days = 36500, importTimestamp?: number): Promise<{ activity: string; count: number; hours: number }[]> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  const MAX_SEGMENT_MINUTES = 60; // cap single segment at 1 hour
  if (isWeb) {
    const visits = await getAllVisits();
    const totals: Record<string, { count: number; minutes: number }> = {};
    for (const v of visits) {
      if (v.timestamp >= cutoff) {
        const key = v.activity || 'Unknown';
        if (!totals[key]) totals[key] = { count: 0, minutes: 0 };
        totals[key].count++;
        // Use distance-derived duration for Driving, capped duration for others
        const mins = v.activity === 'Driving'
          ? effectiveDrivingMinutes(v)
          : Math.min(v.duration_minutes || 0, MAX_SEGMENT_MINUTES);
        totals[key].minutes += mins;
      }
    }
    return Object.entries(totals)
      .map(([activity, { count, minutes }]) => ({ activity, count, hours: Math.round(minutes / 60) }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6);
  }
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT activity,
       COUNT(*) as count,
       ROUND(SUM(CASE
         WHEN activity = 'Driving' AND distance_meters > 0 THEN
           distance_meters / 1609.34 /
             CASE
               WHEN distance_meters / 1609.34 < 5 THEN 25.0
               WHEN distance_meters / 1609.34 <= 30 THEN 47.0
               ELSE 60.0
             END * 60
         ELSE MIN(duration_minutes, 45)
       END) / 60.0) as hours
     FROM visits
     WHERE timestamp >= ?
     GROUP BY activity ORDER BY hours DESC LIMIT 6;`,
    [MAX_SEGMENT_MINUTES, cutoff]
  );
  return results as { activity: string; count: number; hours: number }[];
}

export async function getTopCategories(days = 36500, importTimestamp?: number): Promise<{ category: string; count: number }[]> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  if (isWeb) {
    const visits = await getAllVisits();
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
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT category, COUNT(*) as count FROM visits
     WHERE timestamp >= ? AND category IS NOT NULL
     GROUP BY category ORDER BY count DESC LIMIT 8;`,
    [cutoff]
  );
  return results as { category: string; count: number }[];
}

export async function getTopPlaces(days = 36500, importTimestamp?: number): Promise<{ name: string; count: number; category: string }[]> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  if (isWeb) {
    const visits = await getAllVisits();
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
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT place_name as name, category, COUNT(*) as count FROM visits
     WHERE timestamp >= ? AND place_name IS NOT NULL
     GROUP BY place_name ORDER BY count DESC LIMIT 10;`,
    [cutoff]
  );
  return results as { name: string; count: number; category: string }[];
}

export async function getRecentVisits(limit = 20): Promise<Visit[]> {
  if (isWeb) {
    const visits = await getAllVisits();
    return visits
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT * FROM visits ORDER BY timestamp DESC LIMIT ?;`,
    [limit]
  );
  return results as Visit[];
}

export async function getEnrichedCount(): Promise<number> {
  if (isWeb) {
    const visits = await getAllVisits();
    return visits.filter(v => v.place_name !== null || v.category !== null).length;
  }
  const database = await getDb();
  if (!database) return 0;
  const result = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM visits WHERE place_name IS NOT NULL OR category IS NOT NULL;`
  );
  return (result as any)?.count ?? 0;
}

export async function getVisitsByDayOfWeek(days = 36500, importTimestamp?: number): Promise<{ day: string; count: number }[]> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (isWeb) {
    const visits = await getAllVisits();
    const counts = new Array(7).fill(0);
    for (const v of visits) {
      if (v.activity === 'Visit' && v.timestamp >= cutoff) {
        const day = new Date(v.timestamp).getDay();
        counts[day]++;
      }
    }
    return dayNames.map((day, i) => ({ day, count: counts[i] }));
  }
  const database = await getDb();
  if (!database) return dayNames.map(day => ({ day, count: 0 }));
  const results = await database.getAllAsync(
    `SELECT CAST(strftime('%w', datetime(timestamp/1000, 'unixepoch')) AS INTEGER) as dow,
     COUNT(*) as count FROM visits WHERE activity = 'Visit' AND timestamp >= ?
     GROUP BY dow ORDER BY dow;`,
    [cutoff]
  );
  const counts = new Array(7).fill(0);
  for (const r of results as any[]) {
    counts[r.dow] = r.count;
  }
  return dayNames.map((day, i) => ({ day, count: counts[i] }));
}

export async function getVisitsByTimeOfDay(days = 36500, importTimestamp?: number): Promise<{ period: string; count: number }[]> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  const periods = ['Morning', 'Afternoon', 'Evening', 'Night'];
  if (isWeb) {
    const visits = await getAllVisits();
    const counts = [0, 0, 0, 0];
    for (const v of visits) {
      if (v.activity === 'Visit' && v.timestamp >= cutoff) {
        const hour = new Date(v.timestamp).getHours();
        if (hour >= 5 && hour < 12) counts[0]++;
        else if (hour >= 12 && hour < 17) counts[1]++;
        else if (hour >= 17 && hour < 21) counts[2]++;
        else counts[3]++;
      }
    }
    return periods.map((period, i) => ({ period, count: counts[i] }));
  }
  const database = await getDb();
  if (!database) return periods.map(period => ({ period, count: 0 }));
  const results = await database.getAllAsync(
    `SELECT CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch')) AS INTEGER) as hour,
     COUNT(*) as count FROM visits WHERE activity = 'Visit' AND timestamp >= ?
     GROUP BY hour ORDER BY hour;`,
    [cutoff]
  );
  const counts = [0, 0, 0, 0];
  for (const r of results as any[]) {
    const hour = r.hour;
    if (hour >= 5 && hour < 12) counts[0] += r.count;
    else if (hour >= 12 && hour < 17) counts[1] += r.count;
    else if (hour >= 17 && hour < 21) counts[2] += r.count;
    else counts[3] += r.count;
  }
  return periods.map((period, i) => ({ period, count: counts[i] }));
}

export async function getMonthlyVisits(days = 36500): Promise<{ month: string; count: number }[]> {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (isWeb) {
    const visits = await getAllVisits();
    const counts: Record<string, number> = {};
    for (const v of visits) {
      if (v.activity === 'Visit' && v.timestamp >= cutoff) {
        const d = new Date(v.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({
        month: monthNames[parseInt(month.substring(5)) - 1] + ' ' + month.substring(2, 4),
        count,
      }));
  }
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT strftime('%Y-%m', datetime(timestamp/1000, 'unixepoch')) as month,
     COUNT(*) as count FROM visits WHERE activity = 'Visit' AND timestamp >= ?
     GROUP BY month ORDER BY month DESC LIMIT 12;`,
    [cutoff]
  );
  return (results as any[])
    .reverse()
    .map(r => ({
      month: monthNames[parseInt(r.month.substring(5)) - 1] + ' ' + r.month.substring(2, 4),
      count: r.count,
    }));
}
export async function getMonthlyDistance(days = 36500, importTimestamp?: number): Promise<{ month: string; miles: number }[]> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (isWeb) {
    const visits = await getAllVisits();
    const driving = visits
      .filter(v => v.activity === 'Driving' && v.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);

    const monthlyMiles: Record<string, number> = {};

    for (let i = 1; i < driving.length; i++) {
      const prev = driving[i - 1];
      const curr = driving[i];
      const miles = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      if (miles < 200) { // filter out teleports/bad data
        const d = new Date(curr.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMiles[key] = (monthlyMiles[key] || 0) + miles;
      }
    }

    return Object.entries(monthlyMiles)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, miles]) => ({
        month: monthNames[parseInt(month.substring(5)) - 1] + ' ' + month.substring(2, 4),
        miles: Math.round(miles),
      }));
  }

  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT 
      strftime('%Y-%m', datetime(timestamp/1000, 'unixepoch')) as month,
      SUM(CASE
        WHEN distance_meters > 0 THEN distance_meters / 1609.34
        ELSE MIN(duration_minutes, 45) / 60.0 * 30
      END) as total_miles
     FROM visits 
     WHERE activity = 'Driving' AND timestamp >= ?
     GROUP BY month ORDER BY month DESC LIMIT 12;`,
    [cutoff]
  );

  return (results as any[])
    .reverse()
    .map(r => ({
      month: monthNames[parseInt(r.month.substring(5)) - 1] + ' ' + r.month.substring(2, 4),
      miles: Math.round(r.total_miles || 0),
    }));
}


// Compute effective driving minutes — use distance-derived duration when available
function effectiveDrivingMinutes(v: Visit): number {
  if (v.activity !== 'Driving') return Math.min(v.duration_minutes || 0, 60);
  if (v.distance_meters && v.distance_meters > 0) {
    const derived = deriveDrivingMinutes(v.distance_meters);
    if (derived !== null) return Math.min(derived, 75);
  }
  // No distance data — use 45-minute cap
  return Math.min(v.duration_minutes || 0, 45);
}

export async function getTotalStats(days = 36500, importTimestamp?: number): Promise<{ totalMiles: number; totalVisits: number; totalHoursDriving: number; longestTrip: number; avgMilesPerTrip: number }> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  if (isWeb) {
    const visits = await getAllVisits();
    const driving = visits
      .filter(v => v.activity === 'Driving' && v.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);

    let totalMiles = 0;
    for (let i = 1; i < driving.length; i++) {
      const miles = haversineDistance(
        driving[i-1].latitude, driving[i-1].longitude,
        driving[i].latitude, driving[i].longitude
      );
      if (miles < 200) totalMiles += miles;
    }

    const totalVisits = visits.filter(v => v.activity === 'Visit' && v.timestamp >= cutoff).length;
    const totalHoursDriving = Math.round(
      driving.reduce((sum, v) => sum + effectiveDrivingMinutes(v), 0) / 60
    );
    const longestTrip = driving.length > 0 ? Math.max(...driving.map(v => effectiveDrivingMinutes(v))) : 0;
    const avgMilesPerTrip = driving.length > 0 ? Math.round(totalMiles / driving.length) : 0;

    return {
      totalMiles: Math.round(totalMiles),
      totalVisits,
      totalHoursDriving,
      longestTrip,
      avgMilesPerTrip,
    };
  }

  const database = await getDb();
  if (!database) return { totalMiles: 0, totalVisits: 0, totalHoursDriving: 0, longestTrip: 0, avgMilesPerTrip: 0 };

  const drivingStats = await database.getFirstAsync(
    `SELECT
      SUM(CASE
        WHEN distance_meters > 0 THEN
          ROUND(distance_meters / 1609.34 /
            CASE
              WHEN distance_meters / 1609.34 < 5 THEN 25.0
              WHEN distance_meters / 1609.34 <= 30 THEN 47.0
              ELSE 60.0
            END * 60)
        ELSE MIN(duration_minutes, 45)
      END) as total_minutes,
      MAX(duration_minutes) as longest_trip,
      COUNT(*) as trip_count
     FROM visits WHERE activity = 'Driving' AND timestamp >= ?;`,
    [cutoff]
  ) as any;

  const visitCount = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM visits WHERE activity = 'Visit' AND timestamp >= ?;`,
    [cutoff]
  ) as any;

  const totalMiles = Math.round(((drivingStats?.total_minutes || 0) / 60) * 30);
  const tripCount = drivingStats?.trip_count || 1;

  return {
    totalMiles,
    totalVisits: visitCount?.count || 0,
    totalHoursDriving: Math.round((drivingStats?.total_minutes || 0) / 60),
    longestTrip: drivingStats?.longest_trip > 0 ? drivingStats.longest_trip : 0,
    avgMilesPerTrip: tripCount > 0 ? Math.round(totalMiles / tripCount) : 0,
  };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getNightsAwayFromHome(storedHomeLat?: number, storedHomeLon?: number): Promise<{
  nightsAway: number;
  homeLat: number | null;
  homeLon: number | null;
}> {
  const HOME_AWAY_MILES = 25;
  // Overnight hours: 10pm (22) through 5am (5 inclusive)
  const isOvernightHour = (hour: number) => hour >= 22 || hour <= 5;

  if (isWeb) {
    const visits = await getAllVisits();
    if (visits.length === 0) return { nightsAway: 0, homeLat: null, homeLon: null };

    // Step 1: find home — most frequent overnight location cluster (1-decimal grid ≈ ~7mi)
    const overnightVisits = visits.filter(v => {
      const hour = new Date(v.timestamp).getHours();
      return isOvernightHour(hour);
    });

    const clusterCounts: Record<string, { lat: number; lon: number; count: number }> = {};
    for (const v of overnightVisits) {
      const key = `${v.latitude.toFixed(1)},${v.longitude.toFixed(1)}`;
      if (!clusterCounts[key]) clusterCounts[key] = { lat: v.latitude, lon: v.longitude, count: 0 };
      clusterCounts[key].count++;
    }

    const clusters = Object.values(clusterCounts).sort((a, b) => b.count - a.count);
    if (clusters.length === 0) return { nightsAway: 0, homeLat: null, homeLon: null };

    const { lat: homeLat, lon: homeLon } = (storedHomeLat && storedHomeLon)
      ? { lat: storedHomeLat, lon: storedHomeLon }
      : clusters[0];

    // Step 2: use overnight records (10pm-4am) to find where user actually slept
    const overnightRecs = visits.filter(v => {
      const h = new Date(v.timestamp).getHours();
      return h >= 22 || h <= 4;
    });
    const sleepByDay: Record<string, { lat: number; lon: number }> = {};
    for (const v of overnightRecs) {
      const dk = new Date(v.timestamp).toISOString().slice(0, 10);
      if (!sleepByDay[dk]) {
        sleepByDay[dk] = { lat: v.latitude, lon: v.longitude };
      }
    }

    const nightsAway = Object.values(sleepByDay).filter(
      loc => haversineDistance(loc.lat, loc.lon, homeLat, homeLon) > HOME_AWAY_MILES
    ).length;

    return { nightsAway, homeLat, homeLon };
  }

  // SQLite path
  const database = await getDb();
  if (!database) return { nightsAway: 0, homeLat: null, homeLon: null };

  // Step 1: find home cluster from overnight visits
  const overnightRows = await database.getAllAsync(
    `SELECT latitude, longitude,
       ROUND(latitude, 1) as clat,
       ROUND(longitude, 1) as clon,
       COUNT(*) as cnt
     FROM visits
     WHERE CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) >= 22
        OR CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) <= 5
     GROUP BY clat, clon
     ORDER BY cnt DESC
     LIMIT 1;`
  ) as any[];

  if (overnightRows.length === 0 && !storedHomeLat) return { nightsAway: 0, homeLat: null, homeLon: null };

  const homeLat = storedHomeLat ?? (overnightRows[0]?.clat as number);
  const homeLon = storedHomeLon ?? (overnightRows[0]?.clon as number);

  // Step 2: use overnight records (10pm-4am) to find where user actually slept
  const lastPerDay = await database.getAllAsync(
    `SELECT latitude, longitude
     FROM visits
     WHERE CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) >= 22
        OR CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) <= 4
     GROUP BY date(timestamp/1000, 'unixepoch', 'localtime')
     ORDER BY timestamp ASC;`
  ) as any[];

  // Haversine in JS on the small result set
  const nightsAway = lastPerDay.filter(
    (row: any) => haversineDistance(row.latitude, row.longitude, homeLat, homeLon) > HOME_AWAY_MILES
  ).length;

  return { nightsAway, homeLat, homeLon };
}

export async function getFunStats(): Promise<{
  hoursInCar: number;
  daysDataSpans: number;
  uniquePlaces: number;
  mostVisitedDay: string;
  mostVisitedTime: string;
  avgTripsPerWeek: number;
}> {
  if (isWeb) {
    const visits = await getAllVisits();
    if (visits.length === 0) return { hoursInCar: 0, daysDataSpans: 0, uniquePlaces: 0, mostVisitedDay: '', mostVisitedTime: '', avgTripsPerWeek: 0 };

    const driving = visits.filter(v => v.activity === 'Driving');
    // Cap per-segment at 480min AND cap total to something plausible
    // Use full history for daysDataSpans context but reasonable avg for display
    const rawHours = Math.round(driving.reduce((s, v) => s + effectiveDrivingMinutes(v), 0) / 60);
    const hoursInCar = rawHours;

    const timestamps = visits.map(v => v.timestamp);
    const daysDataSpans = Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / (24 * 60 * 60 * 1000));

    const placeNames = new Set(visits.filter(v => v.place_name).map(v => v.place_name));
    const uniquePlaces = placeNames.size;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);
    const placeVisits = visits.filter(v => v.activity === 'Visit');
    placeVisits.forEach(v => dayCounts[new Date(v.timestamp).getDay()]++);
    const mostVisitedDay = dayNames[dayCounts.indexOf(Math.max(...dayCounts))];

    const timeCounts = [0, 0, 0, 0];
    placeVisits.forEach(v => {
      const h = new Date(v.timestamp).getHours();
      if (h >= 5 && h < 12) timeCounts[0]++;
      else if (h >= 12 && h < 17) timeCounts[1]++;
      else if (h >= 17 && h < 21) timeCounts[2]++;
      else timeCounts[3]++;
    });
    const timeLabels = ['morning person', 'afternoon person', 'evening person', 'night owl'];
    const mostVisitedTime = timeLabels[timeCounts.indexOf(Math.max(...timeCounts))];

    const weeksSpanned = Math.max(daysDataSpans / 7, 1);
    const avgTripsPerWeek = Math.round(placeVisits.length / weeksSpanned);

    return { hoursInCar, daysDataSpans, uniquePlaces, mostVisitedDay, mostVisitedTime, avgTripsPerWeek };
  }

  const database = await getDb();
  if (!database) return { hoursInCar: 0, daysDataSpans: 0, uniquePlaces: 0, mostVisitedDay: '', mostVisitedTime: '', avgTripsPerWeek: 0 };

  const drivingResult = await database.getFirstAsync(
    `SELECT SUM(CASE
        WHEN distance_meters > 0 THEN
          ROUND(distance_meters / 1609.34 /
            CASE
              WHEN distance_meters / 1609.34 < 5 THEN 25.0
              WHEN distance_meters / 1609.34 <= 30 THEN 47.0
              ELSE 60.0
            END * 60)
        ELSE MIN(duration_minutes, 45)
      END) as total FROM visits WHERE activity = 'Driving';`
  ) as any;

  const spanResult = await database.getFirstAsync(
    `SELECT MIN(timestamp) as min_ts, MAX(timestamp) as max_ts FROM visits;`
  ) as any;

  const uniqueResult = await database.getFirstAsync(
    `SELECT COUNT(DISTINCT place_name) as count FROM visits WHERE place_name IS NOT NULL;`
  ) as any;

  const dayResult = await database.getAllAsync(
    `SELECT CAST(strftime('%w', datetime(timestamp/1000, 'unixepoch')) AS INTEGER) as dow,
     COUNT(*) as count FROM visits WHERE activity = 'Visit'
     GROUP BY dow ORDER BY count DESC LIMIT 1;`
  ) as any[];

  const timeResult = await database.getAllAsync(
    `SELECT CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch')) AS INTEGER) as hour,
     COUNT(*) as count FROM visits WHERE activity = 'Visit'
     GROUP BY hour ORDER BY count DESC;`
  ) as any[];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hoursInCar = Math.round((drivingResult?.total || 0) / 60);
  const daysDataSpans = Math.round(((spanResult?.max_ts || 0) - (spanResult?.min_ts || 0)) / (24 * 60 * 60 * 1000));
  const uniquePlaces = uniqueResult?.count || 0;
  const mostVisitedDay = dayResult.length > 0 ? dayNames[dayResult[0].dow] : '';

  const timeCounts = [0, 0, 0, 0];
  timeResult.forEach((r: any) => {
    const h = r.hour;
    if (h >= 5 && h < 12) timeCounts[0] += r.count;
    else if (h >= 12 && h < 17) timeCounts[1] += r.count;
    else if (h >= 17 && h < 21) timeCounts[2] += r.count;
    else timeCounts[3] += r.count;
  });
  const timeLabels = ['morning person', 'afternoon person', 'evening person', 'night owl'];
  const mostVisitedTime = timeLabels[timeCounts.indexOf(Math.max(...timeCounts))];

  const visitCountResult = await database.getFirstAsync(
    `SELECT COUNT(*) as count FROM visits WHERE activity = 'Visit';`
  ) as any;
  const avgTripsPerWeek = Math.round((visitCountResult?.count || 0) / Math.max(daysDataSpans / 7, 1));

  return { hoursInCar, daysDataSpans, uniquePlaces, mostVisitedDay, mostVisitedTime, avgTripsPerWeek };
}

export async function getTopPlacesByDuration(days = 36500, importTimestamp?: number): Promise<{ name: string; totalMinutes: number; visits: number; avgMinutes: number }[]> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  if (isWeb) {
    const visits = await getAllVisits();
    const counts: Record<string, { totalMinutes: number; visits: number }> = {};
    for (const v of visits) {
      if (v.activity === 'Visit' && v.place_name && v.category && v.timestamp >= cutoff) {
        if (!counts[v.place_name]) counts[v.place_name] = { totalMinutes: 0, visits: 0 };
        counts[v.place_name].totalMinutes += v.duration_minutes || 0;
        counts[v.place_name].visits++;
      }
    }
    return Object.entries(counts)
      .map(([name, { totalMinutes, visits }]) => ({
        name,
        totalMinutes,
        visits,
        avgMinutes: Math.round(totalMinutes / visits),
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, 10);
  }
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT place_name as name,
      SUM(duration_minutes) as totalMinutes,
      COUNT(*) as visits,
      ROUND(AVG(duration_minutes)) as avgMinutes
     FROM visits
     WHERE activity = 'Visit' AND place_name IS NOT NULL AND category IS NOT NULL AND timestamp >= ?
     GROUP BY place_name
     ORDER BY totalMinutes DESC LIMIT 10;`,
    [cutoff]
  );
  return results as any[];
}
export async function getCategoryVisits(category: string, days = 36500, importTimestamp?: number): Promise<{ name: string; count: number; totalMinutes: number; lastVisit: number }[]> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  if (isWeb) {
    const visits = await getAllVisits();
    const counts: Record<string, { count: number; totalMinutes: number; lastVisit: number }> = {};
    for (const v of visits) {
      if (v.category === category && v.place_name && v.timestamp >= cutoff) {
        if (!counts[v.place_name]) counts[v.place_name] = { count: 0, totalMinutes: 0, lastVisit: 0 };
        counts[v.place_name].count++;
        counts[v.place_name].totalMinutes += v.duration_minutes || 0;
        counts[v.place_name].lastVisit = Math.max(counts[v.place_name].lastVisit, v.timestamp);
      }
    }
    return Object.entries(counts)
      .map(([name, { count, totalMinutes, lastVisit }]) => ({ name, count, totalMinutes, lastVisit }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT place_name as name,
      COUNT(*) as count,
      SUM(duration_minutes) as totalMinutes,
      MAX(timestamp) as lastVisit
     FROM visits
     WHERE category = ? AND place_name IS NOT NULL AND timestamp >= ?
     GROUP BY place_name
     ORDER BY count DESC LIMIT 20;`,
    [category, cutoff]
  );
  return results as any[];
  }

const HIDDEN_HISTORY_CATEGORIES = ['Road', 'Unknown', 'Business', 'Point of Interest'];

export async function getRecentActivity(limit = 50): Promise<{ name: string | null; category: string | null; timestamp: number; duration_minutes: number; activity: string }[]> {
  if (isWeb) {
    const visits = await getAllVisits();
    return visits
      .filter(v =>
        v.activity === 'Visit' &&
        v.place_name != null &&
        v.place_name.trim() !== '' &&
        v.category != null &&
        !HIDDEN_HISTORY_CATEGORIES.includes(v.category)
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
      .map(v => ({
        name: v.place_name,
        category: v.category,
        timestamp: v.timestamp,
        duration_minutes: v.duration_minutes,
        activity: v.activity,
      }));
  }
  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT place_name as name, category, timestamp, duration_minutes, activity
     FROM visits
     WHERE activity = 'Visit'
       AND place_name IS NOT NULL
       AND place_name != ''
       AND category IS NOT NULL
       AND category NOT IN ('Road', 'Unknown', 'Business', 'Point of Interest')
     ORDER BY timestamp DESC LIMIT ?;`,
    [limit]
  );
  return results as any[];
}

export async function searchPlaces(query: string): Promise<{
  name: string;
  category: string;
  visitCount: number;
  lastVisit: number;
  totalMinutes: number;
}[]> {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();

  if (isWeb) {
    const visits = await getAllVisits();
    const counts: Record<string, { category: string; visitCount: number; lastVisit: number; totalMinutes: number }> = {};
    for (const v of visits) {
      if (
        v.activity === 'Visit' &&
        v.place_name &&
        v.place_name.toLowerCase().includes(q)
      ) {
        if (!counts[v.place_name]) {
          counts[v.place_name] = { category: v.category || '', visitCount: 0, lastVisit: 0, totalMinutes: 0 };
        }
        counts[v.place_name].visitCount++;
        counts[v.place_name].totalMinutes += v.duration_minutes || 0;
        if (v.timestamp > counts[v.place_name].lastVisit) {
          counts[v.place_name].lastVisit = v.timestamp;
          counts[v.place_name].category = v.category || counts[v.place_name].category;
        }
      }
    }
    return Object.entries(counts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 30);
  }

  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT place_name as name,
       category,
       COUNT(*) as visitCount,
       MAX(timestamp) as lastVisit,
       SUM(duration_minutes) as totalMinutes
     FROM visits
     WHERE activity = 'Visit'
       AND place_name IS NOT NULL
       AND LOWER(place_name) LIKE ?
     GROUP BY place_name
     ORDER BY visitCount DESC
     LIMIT 30;`,
    [`%${q}%`]
  );
  return results as any[];
}

export async function getVisitsForPlace(name: string): Promise<{
  timestamp: number;
  duration_minutes: number;
  category: string;
}[]> {
  if (isWeb) {
    const visits = await getAllVisits();
    return visits
      .filter(v => v.activity === 'Visit' && v.place_name === name)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
      .map(v => ({
        timestamp: v.timestamp,
        duration_minutes: v.duration_minutes,
        category: v.category || '',
      }));
  }

  const database = await getDb();
  if (!database) return [];
  const results = await database.getAllAsync(
    `SELECT timestamp, duration_minutes, category
     FROM visits
     WHERE activity = 'Visit' AND place_name = ?
     ORDER BY timestamp DESC LIMIT 50;`,
    [name]
  );
  return results as any[];
}

export async function remapCategories(
  mappings: { placeName: string; category: string; subcategory: string | null }[]
): Promise<void> {
  if (mappings.length === 0) return;

  if (isWeb) {
    const visits = await getAllVisits();
    const updated = visits.map(v => {
      if (!v.place_name) return v;
      const match = mappings.find(m => m.placeName === v.place_name);
      if (!match) return v;
      return {
        ...v,
        category: match.subcategory || match.category,
      };
    });
    await AsyncStorage.setItem('lobo_visits', JSON.stringify(updated));
    return;
  }

  const database = await getDb();
  if (!database) return;

  await database.withTransactionAsync(async () => {
    for (const m of mappings) {
      const cat = m.subcategory || m.category;
      await database.runAsync(
        `UPDATE visits SET category = ? WHERE place_name = ?;`,
        [cat, m.placeName]
      );
    }
  });
}

// ── Segment Engine ────────────────────────────────────────────────────────────

export type SegmentLevel = 'H' | 'M' | 'L' | 'Y' | 'N';

export type Segment = {
  id: string;
  label: string;
  level: SegmentLevel;
  description: string;
  emoji: string;
};

export async function computeSegments(): Promise<Segment[]> {
  const visits = await getAllVisits();
  if (visits.length === 0) return [];

  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;
  const days7 = 7 * 24 * 60 * 60 * 1000;
  const cutoff30 = now - days30;
  const cutoff7 = now - days7;

  const recent = visits.filter(v => v.timestamp >= cutoff30);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const isWeekday = (ts: number) => {
    const d = new Date(ts).getDay();
    return d >= 1 && d <= 5;
  };
  const isWeekend = (ts: number) => {
    const d = new Date(ts).getDay();
    return d === 0 || d === 6;
  };
  const hour = (ts: number) => new Date(ts).getHours();
  const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

  const visitsByCategory = (cat: string, since = cutoff30) =>
    visits.filter(v => v.timestamp >= since && v.category === cat);

  const visitsByCategories = (cats: string[], since = cutoff30) =>
    visits.filter(v => v.timestamp >= since && cats.includes(v.category || ''));

  // ── 1. Out-of-home dining ────────────────────────────────────────────────
  const diningCats = ['Restaurants', 'Fast Food', 'Casual Dining', 'Cafe', 'Bar'];
  const diningCount = visitsByCategories(diningCats).length;
  const outofhome_dining: Segment = {
    id: 'outofhome_dining',
    label: 'Out-of-Home Dining',
    emoji: '🍽️',
    level: diningCount >= 20 ? 'H' : diningCount >= 8 ? 'M' : 'L',
    description: diningCount >= 20
      ? `Heavy diner — ${diningCount} restaurant visits this month`
      : diningCount >= 8
      ? `Moderate diner — ${diningCount} restaurant visits this month`
      : `Light diner — ${diningCount} restaurant visits this month`,
  };

  // ── 2. Fast food user ────────────────────────────────────────────────────
  const ffVisits = recent.filter(v => v.category === 'Fast Food');
  const ffCount = ffVisits.length;
  const fastfood_user: Segment = {
    id: 'fastfood_user',
    label: 'Fast Food User',
    emoji: '🍔',
    level: ffCount >= 15 ? 'H' : ffCount >= 6 ? 'M' : 'L',
    description: ffCount >= 15
      ? `Heavy — ${ffCount} fast food visits this month`
      : ffCount >= 6
      ? `Moderate — ${ffCount} fast food visits this month`
      : `Light — ${ffCount} fast food visits this month`,
  };

  // ── 3. Drive-thru loyal ──────────────────────────────────────────────────
  const ffTotal = ffVisits.length;
  const ffQuick = ffVisits.filter(v => (v.duration_minutes || 0) < 7).length;
  const dtPct = ffTotal > 0 ? ffQuick / ffTotal : 0;
  const drive_thru_loyal: Segment = {
    id: 'drive_thru_loyal',
    label: 'Drive-Thru Loyal',
    emoji: '🚗',
    level: ffTotal >= 3 && dtPct >= 0.5 ? 'Y' : 'N',
    description: ffTotal >= 3 && dtPct >= 0.5
      ? `${Math.round(dtPct * 100)}% of fast food visits are drive-thru speed`
      : 'Prefers dining in over drive-thru',
  };

  // ── 4. OOH Coffee ────────────────────────────────────────────────────────
  const coffeeCount = visitsByCategory('Cafe').length;
  const ooh_coffee: Segment = {
    id: 'ooh_coffee',
    label: 'Coffee Shop Visitor',
    emoji: '☕',
    level: coffeeCount >= 12 ? 'H' : coffeeCount >= 8 ? 'M' : 'L',
    description: coffeeCount >= 12
      ? `Heavy — ${coffeeCount} café visits this month`
      : coffeeCount >= 8
      ? `Moderate — ${coffeeCount} café visits this month`
      : `Light — ${coffeeCount} café visits this month`,
  };

  // ── 5. Late night diner ──────────────────────────────────────────────────
  const allDining = visitsByCategories(diningCats);
  const lateNight = allDining.filter(v => hour(v.timestamp) >= 21).length;
  const lateNightPct = allDining.length > 0 ? lateNight / allDining.length : 0;
  const late_night_diner: Segment = {
    id: 'late_night_diner',
    label: 'Late Night Diner',
    emoji: '🌙',
    level: allDining.length >= 3 && lateNightPct >= 0.3 ? 'Y' : 'N',
    description: allDining.length >= 3 && lateNightPct >= 0.3
      ? `${Math.round(lateNightPct * 100)}% of dining visits are after 9pm`
      : 'Mostly dines during normal hours',
  };

  // ── 6. Lunch out ─────────────────────────────────────────────────────────
  const lunchVisits = allDining.filter(v => hour(v.timestamp) >= 11 && hour(v.timestamp) < 15);
  const lunchPerWeek = lunchVisits.length / 4.3;
  const lunch_out: Segment = {
    id: 'lunch_out',
    label: 'Lunch Out',
    emoji: '🥗',
    level: lunchPerWeek >= 3 ? 'Y' : 'N',
    description: lunchPerWeek >= 3
      ? `Eats out for lunch ~${Math.round(lunchPerWeek)}x per week`
      : 'Rarely eats out for lunch',
  };

  // ── 7. Grocery loyal ─────────────────────────────────────────────────────
  const groceryVisits = visitsByCategory('Grocery');
  const groceryByBrand: Record<string, number> = {};
  for (const v of groceryVisits) {
    const brand = v.place_name || 'Unknown';
    groceryByBrand[brand] = (groceryByBrand[brand] || 0) + 1;
  }
  const topGroceryCount = Math.max(0, ...Object.values(groceryByBrand));
  const groceryLoyalPct = groceryVisits.length > 0 ? topGroceryCount / groceryVisits.length : 0;
  const topGroceryBrand = Object.entries(groceryByBrand).sort((a, b) => b[1] - a[1])[0]?.[0];
  const grocery_loyal: Segment = {
    id: 'grocery_loyal',
    label: 'Grocery Loyal',
    emoji: '🛒',
    level: groceryVisits.length >= 3 && groceryLoyalPct >= 0.6 ? 'Y' : 'N',
    description: groceryVisits.length >= 3 && groceryLoyalPct >= 0.6
      ? `${Math.round(groceryLoyalPct * 100)}% of grocery trips to ${topGroceryBrand}`
      : 'Shops at multiple grocery stores',
  };

  // ── 8. Grocery top-up ────────────────────────────────────────────────────
  const groceryPerWeek = groceryVisits.length / 4.3;
  const grocery_topup: Segment = {
    id: 'grocery_topup',
    label: 'Frequent Grocery Shopper',
    emoji: '🥦',
    level: groceryPerWeek >= 3 ? 'Y' : 'N',
    description: groceryPerWeek >= 3
      ? `Shops for groceries ~${Math.round(groceryPerWeek)}x per week`
      : 'Weekly or less grocery shopping',
  };

  // ── 9. Gym regular ───────────────────────────────────────────────────────
  const gymVisits = visitsByCategories(['Health & Fitness', 'Gym', 'Sports & Recreation']);
  const gymPerWeek = gymVisits.length / 4.3;
  const gym_regular: Segment = {
    id: 'gym_regular',
    label: 'Gym Regular',
    emoji: '💪',
    level: gymPerWeek >= 3 ? 'Y' : 'N',
    description: gymPerWeek >= 3
      ? `Works out ~${Math.round(gymPerWeek)}x per week`
      : 'Infrequent gym visits',
  };

  // ── 10. Pharmacy frequent ────────────────────────────────────────────────
  const pharmacyVisits = visitsByCategory('Pharmacy');
  const pharmacyPerWeek = pharmacyVisits.length / 4.3;
  const pharmacy_frequent: Segment = {
    id: 'pharmacy_frequent',
    label: 'Pharmacy Frequent',
    emoji: '💊',
    level: pharmacyPerWeek >= 2 ? 'Y' : 'N',
    description: pharmacyPerWeek >= 2
      ? `Visits pharmacy ~${Math.round(pharmacyPerWeek)}x per week`
      : 'Occasional pharmacy visits',
  };

  // ── 11. Retail browser ───────────────────────────────────────────────────
  const retailVisits = visitsByCategory('Retail');
  const uniqueRetailStores = new Set(retailVisits.map(v => v.place_name)).size;
  const retail_browser: Segment = {
    id: 'retail_browser',
    label: 'Retail Browser',
    emoji: '🛍️',
    level: retailVisits.length >= 8 && uniqueRetailStores >= 4 ? 'Y' : 'N',
    description: retailVisits.length >= 8 && uniqueRetailStores >= 4
      ? `${retailVisits.length} retail visits across ${uniqueRetailStores} stores this month`
      : 'Selective retail shopper',
  };

  // ── 12. Homebody ─────────────────────────────────────────────────────────
  // Find home coords from overnight visits
  const overnightVisits30 = visits.filter(v => {
    const h = hour(v.timestamp);
    return (h >= 22 || h <= 5) && v.timestamp >= cutoff30;
  });
  const homeClusterCounts: Record<string, { lat: number; lon: number; count: number }> = {};
  for (const v of overnightVisits30) {
    const key = `${v.latitude.toFixed(1)},${v.longitude.toFixed(1)}`;
    if (!homeClusterCounts[key]) homeClusterCounts[key] = { lat: v.latitude, lon: v.longitude, count: 0 };
    homeClusterCounts[key].count++;
  }
  const homeCluster = Object.values(homeClusterCounts).sort((a, b) => b.count - a.count)[0];

  // Homebody = on 50%+ of days, max distance from home during daytime (8am-8pm) was < 5 miles
  const recentDaytime = visits.filter(v => {
    const h = hour(v.timestamp);
    return v.timestamp >= cutoff30 && h >= 8 && h < 20;
  });
  const maxDistByDay: Record<string, number> = {};
  if (homeCluster) {
    for (const v of recentDaytime) {
      const dk = dayKey(v.timestamp);
      const dist = haversineDistance(v.latitude, v.longitude, homeCluster.lat, homeCluster.lon);
      if (!maxDistByDay[dk] || dist > maxDistByDay[dk]) maxDistByDay[dk] = dist;
    }
  }
  const totalDays = Object.keys(maxDistByDay).length;
  const homebodyDays = Object.values(maxDistByDay).filter(d => d <= 5).length;
  const homebodyPct = totalDays > 0 ? homebodyDays / totalDays : 0;
  const homebody: Segment = {
    id: 'homebody',
    label: 'Homebody',
    emoji: '🏠',
    level: homebodyPct >= 0.5 ? 'Y' : 'N',
    description: homebodyPct >= 0.5
      ? `Stays within 5 miles of home on ${Math.round(homebodyPct * 100)}% of days`
      : 'Regularly ventures more than 5 miles from home',
  };

  // ── 13. Multi-errand runner ──────────────────────────────────────────────
  const visitsByDay: Record<string, Set<string>> = {};
  for (const v of recent) {
    if (!v.category) continue;
    const dk = dayKey(v.timestamp);
    if (!visitsByDay[dk]) visitsByDay[dk] = new Set();
    visitsByDay[dk].add(v.category);
  }
  const errandDays = Object.values(visitsByDay).filter(cats => cats.size >= 3).length;
  const errandDaysPerWeek = errandDays / 4.3;
  const multi_errand_runner: Segment = {
    id: 'multi_errand_runner',
    label: 'Multi-Errand Runner',
    emoji: '📋',
    level: errandDaysPerWeek >= 2 ? 'Y' : 'N',
    description: errandDaysPerWeek >= 2
      ? `Runs errands across 3+ categories ~${Math.round(errandDaysPerWeek)}x per week`
      : 'Focused, single-purpose trips',
  };

  // ── 14. Commuter ─────────────────────────────────────────────────────────
  const drivingVisits30 = visits.filter(v => v.activity === 'Driving' && v.timestamp >= cutoff30);
  const commuterTrips = drivingVisits30.filter(v => {
    const h = hour(v.timestamp);
    const isMorning = h >= 6 && h < 9;
    const isEvening = h >= 16 && h < 19;
    return isWeekday(v.timestamp) && (isMorning || isEvening);
  });

  // Estimate distance using duration * avg speed (30mph in city)
  const commuterLongTrips = commuterTrips.filter(v => (v.duration_minutes || 0) >= 10); // ~5 miles at 30mph
  const commuter: Segment = {
    id: 'commuter',
    label: 'Commuter',
    emoji: '🚙',
    level: commuterLongTrips.length >= 20 ? 'Y' : 'N',
    description: commuterLongTrips.length >= 20
      ? `${commuterLongTrips.length} qualifying commute trips this month`
      : 'No strong commute pattern detected',
  };

  // ── 15. Weekend wanderer ─────────────────────────────────────────────────
  const weekdayDriving = drivingVisits30.filter(v => isWeekday(v.timestamp));
  const weekendDriving = drivingVisits30.filter(v => isWeekend(v.timestamp));
  const weekdayDays = new Set(weekdayDriving.map(v => dayKey(v.timestamp))).size || 1;
  const weekendDays = new Set(weekendDriving.map(v => dayKey(v.timestamp))).size || 1;
  const avgWeekdayMins = weekdayDriving.reduce((s, v) => s + (v.duration_minutes || 0), 0) / weekdayDays;
  const avgWeekendMins = weekendDriving.reduce((s, v) => s + (v.duration_minutes || 0), 0) / weekendDays;
  const wandererRatio = avgWeekdayMins > 0 ? avgWeekendMins / avgWeekdayMins : 0;
  const weekend_wanderer: Segment = {
    id: 'weekend_wanderer',
    label: 'Weekend Wanderer',
    emoji: '🗺️',
    level: wandererRatio >= 1.5 ? 'Y' : 'N',
    description: wandererRatio >= 1.5
      ? `Travels ${Math.round(wandererRatio * 10) / 10}x more on weekends than weekdays`
      : 'Similar travel patterns on weekdays and weekends',
  };

  // ── 16. Road warrior ─────────────────────────────────────────────────────
  // Reuse nights away logic — count nights away in last 30 days
  const nightsData = await getNightsAwayFromHome();
  const road_warrior: Segment = {
    id: 'road_warrior',
    label: 'Road Warrior',
    emoji: '✈️',
    level: nightsData.nightsAway >= 3 ? 'Y' : 'N',
    description: nightsData.nightsAway >= 3
      ? `${nightsData.nightsAway} nights away from home this month`
      : 'Mostly sleeps at home',
  };

  return [
    outofhome_dining,
    fastfood_user,
    drive_thru_loyal,
    ooh_coffee,
    late_night_diner,
    lunch_out,
    grocery_loyal,
    grocery_topup,
    gym_regular,
    pharmacy_frequent,
    retail_browser,
    homebody,
    multi_errand_runner,
    commuter,
    weekend_wanderer,
    road_warrior,
  ];
}

// ── Time Allocation ───────────────────────────────────────────────────────────

export type TimeAllocation = {
  homeHours: number;
  workSchoolHours: number;
  transitHours: number;
  thirdPlaceHours: number;
  totalHours: number;
};

export async function getTimeAllocation(
  days: number,
  importTimestamp?: number
): Promise<TimeAllocation> {
  const base = importTimestamp || Date.now();
  const cutoff = base - (days * 24 * 60 * 60 * 1000);
  const MAX_VISIT_MINS = 1080; // 18hr cap for visits
  const MAX_DRIVE_MINS = 90;   // 90min cap for transit

  const TRANSIT_ACTIVITIES = ['Driving', 'Walking', 'Cycling', 'Running', 'Train', 'Subway', 'Bus', 'Ferry', 'Flying'];
  const THIRD_PLACE_CATEGORIES = [
    'Restaurants', 'Fast Food', 'Casual Dining', 'Cafe', 'Bar',
    'Grocery', 'Retail', 'Health & Fitness', 'Gym', 'Sports & Recreation',
    'Entertainment', 'Services', 'Pharmacy', 'Education', 'Religious', 'Travel',
  ];

  if (isWeb) {
    const visits = await getAllVisits();
    const inWindow = visits.filter(v => v.timestamp >= cutoff);
    if (inWindow.length === 0) return { homeHours: 0, workSchoolHours: 0, transitHours: 0, thirdPlaceHours: 0, totalHours: 0 };

    // Find home cluster — try overnight first, fall back to most frequent location
    const overnight = visits.filter(v => { const h = new Date(v.timestamp).getHours(); return h >= 22 || h <= 5; });
    const sourceVisits = overnight.length >= 5 ? overnight : visits;
    const homeClusters: Record<string, { lat: number; lon: number; count: number }> = {};
    for (const v of sourceVisits) {
      const key = `${v.latitude.toFixed(1)},${v.longitude.toFixed(1)}`;
      if (!homeClusters[key]) homeClusters[key] = { lat: v.latitude, lon: v.longitude, count: 0 };
      homeClusters[key].count++;
    }
    const homeCluster = Object.values(homeClusters).sort((a, b) => b.count - a.count)[0];
    const homeLat = homeCluster?.lat ?? 0;
    const homeLon = homeCluster?.lon ?? 0;

    // Find work/school: most frequent visit location during weekday 8am-6pm that isn't home
    const weekdayDay = inWindow.filter(v => {
      const d = new Date(v.timestamp);
      const h = d.getHours();
      const dow = d.getDay();
      return v.activity === 'Visit' && dow >= 1 && dow <= 5 && h >= 8 && h < 18;
    });
    const workClusters: Record<string, { lat: number; lon: number; count: number }> = {};
    for (const v of weekdayDay) {
      const key = `${v.latitude.toFixed(1)},${v.longitude.toFixed(1)}`;
      if (!workClusters[key]) workClusters[key] = { lat: v.latitude, lon: v.longitude, count: 0 };
      workClusters[key].count++;
    }
    const workCluster = Object.values(workClusters)
      .filter(c => homeCluster ? haversineDistance(c.lat, c.lon, homeLat, homeLon) > 1 : true)
      .sort((a, b) => b.count - a.count)[0];

    let homeHours = 0, workSchoolHours = 0, transitHours = 0, thirdPlaceHours = 0;

    for (const v of inWindow) {
      const mins = v.duration_minutes || 0;
      if (TRANSIT_ACTIVITIES.includes(v.activity)) {
        transitHours += Math.min(mins, MAX_DRIVE_MINS);
      } else if (v.activity === 'Visit') {
        const cappedMins = Math.min(mins, MAX_VISIT_MINS);
        const dist = haversineDistance(v.latitude, v.longitude, homeLat, homeLon);
        if (dist <= 0.5) {
          homeHours += cappedMins;
        } else if (workCluster && haversineDistance(v.latitude, v.longitude, workCluster.lat, workCluster.lon) <= 0.5) {
          workSchoolHours += cappedMins;
        } else if (THIRD_PLACE_CATEGORIES.includes(v.category || '')) {
          thirdPlaceHours += cappedMins;
        } else {
          // uncategorized visits — split between home and third place
          if (dist <= 2) homeHours += cappedMins;
          else thirdPlaceHours += cappedMins;
        }
      }
    }

    const toHours = (m: number) => Math.round(m / 60);
    return {
      homeHours: toHours(homeHours),
      workSchoolHours: toHours(workSchoolHours),
      transitHours: toHours(transitHours),
      thirdPlaceHours: toHours(thirdPlaceHours),
      totalHours: toHours(homeHours + workSchoolHours + transitHours + thirdPlaceHours),
    };
  }

  // SQLite path
  const database = await getDb();
  if (!database) return { homeHours: 0, workSchoolHours: 0, transitHours: 0, thirdPlaceHours: 0, totalHours: 0 };

  // Get home cluster — try overnight first, fall back to most frequent location
  let overnightRows = await database.getAllAsync(
    `SELECT ROUND(latitude, 1) as clat, ROUND(longitude, 1) as clon, COUNT(*) as cnt
     FROM visits
     WHERE CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) >= 22
        OR CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) <= 5
     GROUP BY clat, clon ORDER BY cnt DESC LIMIT 1;`
  ) as any[];
  if (overnightRows.length === 0) {
    overnightRows = await database.getAllAsync(
      `SELECT ROUND(latitude, 1) as clat, ROUND(longitude, 1) as clon, COUNT(*) as cnt
       FROM visits GROUP BY clat, clon ORDER BY cnt DESC LIMIT 1;`
    ) as any[];
  }
  const homeLat = overnightRows[0]?.clat ?? 0;
  const homeLon = overnightRows[0]?.clon ?? 0;

  // Get work cluster — most frequent weekday daytime visit not near home
  const workRows = await database.getAllAsync(
    `SELECT ROUND(latitude, 1) as clat, ROUND(longitude, 1) as clon, COUNT(*) as cnt
     FROM visits
     WHERE activity = 'Visit'
       AND timestamp >= ?
       AND CAST(strftime('%w', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) BETWEEN 1 AND 5
       AND CAST(strftime('%H', datetime(timestamp/1000, 'unixepoch', 'localtime')) AS INTEGER) BETWEEN 8 AND 18
     GROUP BY clat, clon ORDER BY cnt DESC LIMIT 5;`,
    [cutoff]
  ) as any[];
  const workRow = workRows.find((r: any) => haversineDistance(r.clat, r.clon, homeLat, homeLon) > 1);
  const workLat = workRow?.clat ?? null;
  const workLon = workRow?.clon ?? null;

  // Get all visits in window
  const rows = await database.getAllAsync(
    `SELECT activity, category, latitude, longitude, duration_minutes
     FROM visits WHERE timestamp >= ?;`,
    [cutoff]
  ) as any[];

  let homeMin = 0, workMin = 0, transitMin = 0, thirdMin = 0;
  for (const v of rows) {
    const mins = v.duration_minutes || 0;
    if (TRANSIT_ACTIVITIES.includes(v.activity)) {
      transitMin += Math.min(mins, MAX_DRIVE_MINS);
    } else if (v.activity === 'Visit') {
      const cappedMins = Math.min(mins, MAX_VISIT_MINS);
      const distHome = haversineDistance(v.latitude, v.longitude, homeLat, homeLon);
      if (distHome <= 0.5) {
        homeMin += cappedMins;
      } else if (workLat !== null && haversineDistance(v.latitude, v.longitude, workLat, workLon) <= 0.5) {
        workMin += cappedMins;
      } else if (THIRD_PLACE_CATEGORIES.includes(v.category || '')) {
        thirdMin += cappedMins;
      } else {
        if (distHome <= 2) homeMin += cappedMins;
        else thirdMin += cappedMins;
      }
    }
  }

  const toHours = (m: number) => Math.round(m / 60);
  return {
    homeHours: toHours(homeMin),
    workSchoolHours: toHours(workMin),
    transitHours: toHours(transitMin),
    thirdPlaceHours: toHours(thirdMin),
    totalHours: toHours(homeMin + workMin + transitMin + thirdMin),
  };
}

export async function getMostRecentVisitTimestamp(): Promise<number> {
  if (isWeb) {
    const visits = await getAllVisits();
    if (visits.length === 0) return 0;
    return Math.max(...visits.map(v => v.timestamp));
  }
  const database = await getDb();
  if (!database) return 0;
  const result = await database.getFirstAsync(
    'SELECT MAX(timestamp) as max_ts FROM visits;'
  ) as any;
  return result?.max_ts || 0;
}

// ── Week in Review ────────────────────────────────────────────────────────────

export type WeekInReview = {
  topPlace: string | null;
  topPlaceCount: number;
  uniquePlaces: number;
  totalTrips: number;
  activityVsAvg: 'more' | 'less' | 'similar' | 'insufficient';
  weekVisits: number;
  avgWeeklyVisits: number;
};

export async function getWeekInReview(importTimestamp?: number): Promise<WeekInReview> {
  const base = importTimestamp || Date.now();
  const cutoff7 = base - (7 * 24 * 60 * 60 * 1000);
  const cutoff180 = base - (180 * 24 * 60 * 60 * 1000);

  if (isWeb) {
    const visits = await getAllVisits();

    const week = visits.filter(v => v.activity === 'Visit' && v.timestamp >= cutoff7 && v.place_name);
    const allVisits = visits.filter(v => v.activity === 'Visit' && v.timestamp >= cutoff180 && v.place_name);
    const weekTrips = visits.filter(v => v.activity === 'Driving' && v.timestamp >= cutoff7);

    // Top place this week
    const placeCounts: Record<string, number> = {};
    for (const v of week) {
      const n = v.place_name!;
      placeCounts[n] = (placeCounts[n] || 0) + 1;
    }
    const topEntry = Object.entries(placeCounts).sort((a, b) => b[1] - a[1])[0];

    // Unique places
    const uniquePlaces = new Set(week.map(v => v.place_name)).size;

    // Avg weekly visits over last 6 months
    const weeksSpanned = Math.max((base - cutoff180) / (7 * 24 * 60 * 60 * 1000), 1);
    const avgWeeklyVisits = Math.round(allVisits.length / weeksSpanned);
    const weekVisits = week.length;

    let activityVsAvg: WeekInReview['activityVsAvg'] = 'insufficient';
    if (allVisits.length >= 20) {
      const ratio = avgWeeklyVisits > 0 ? weekVisits / avgWeeklyVisits : 0;
      if (ratio >= 1.2) activityVsAvg = 'more';
      else if (ratio <= 0.8) activityVsAvg = 'less';
      else activityVsAvg = 'similar';
    }

    return {
      topPlace: topEntry?.[0] || null,
      topPlaceCount: topEntry?.[1] || 0,
      uniquePlaces,
      totalTrips: weekTrips.length,
      activityVsAvg,
      weekVisits,
      avgWeeklyVisits,
    };
  }

  const database = await getDb();
  if (!database) return { topPlace: null, topPlaceCount: 0, uniquePlaces: 0, totalTrips: 0, activityVsAvg: 'insufficient', weekVisits: 0, avgWeeklyVisits: 0 };

  const topPlaceRow = await database.getFirstAsync(
    `SELECT place_name, COUNT(*) as cnt FROM visits
     WHERE activity = 'Visit' AND place_name IS NOT NULL AND timestamp >= ?
     GROUP BY place_name ORDER BY cnt DESC LIMIT 1;`,
    [cutoff7]
  ) as any;

  const uniqueRow = await database.getFirstAsync(
    `SELECT COUNT(DISTINCT place_name) as cnt FROM visits
     WHERE activity = 'Visit' AND place_name IS NOT NULL AND timestamp >= ?;`,
    [cutoff7]
  ) as any;

  const tripsRow = await database.getFirstAsync(
    `SELECT COUNT(*) as cnt FROM visits
     WHERE activity = 'Driving' AND timestamp >= ?;`,
    [cutoff7]
  ) as any;

  const weekVisitsRow = await database.getFirstAsync(
    `SELECT COUNT(*) as cnt FROM visits
     WHERE activity = 'Visit' AND place_name IS NOT NULL AND timestamp >= ?;`,
    [cutoff7]
  ) as any;

  const allVisitsRow = await database.getFirstAsync(
    `SELECT COUNT(*) as cnt FROM visits
     WHERE activity = 'Visit' AND place_name IS NOT NULL AND timestamp >= ?;`,
    [cutoff180]
  ) as any;

  const weekVisits = weekVisitsRow?.cnt || 0;
  const allVisits180 = allVisitsRow?.cnt || 0;
  const weeksSpanned = Math.max((base - cutoff180) / (7 * 24 * 60 * 60 * 1000), 1);
  const avgWeeklyVisits = Math.round(allVisits180 / weeksSpanned);

  let activityVsAvg: WeekInReview['activityVsAvg'] = 'insufficient';
  if (allVisits180 >= 20) {
    const ratio = avgWeeklyVisits > 0 ? weekVisits / avgWeeklyVisits : 0;
    if (ratio >= 1.2) activityVsAvg = 'more';
    else if (ratio <= 0.8) activityVsAvg = 'less';
    else activityVsAvg = 'similar';
  }

  return {
    topPlace: topPlaceRow?.place_name || null,
    topPlaceCount: topPlaceRow?.cnt || 0,
    uniquePlaces: uniqueRow?.cnt || 0,
    totalTrips: tripsRow?.cnt || 0,
    activityVsAvg,
    weekVisits,
    avgWeeklyVisits,
  };
}
