import { Platform } from 'react-native';

const MAX_READ = 2 * 1024 * 1024; // 2MB from end of file
const MONTHS_24 = 24 * 30 * 24 * 60 * 60 * 1000;

export type StreamedRecord = {
  timestamp: number;
  latitude: number;
  longitude: number;
  activity: string;
  durationMinutes: number;
  distanceMeters?: number | null;
  placeId?: string | null;
};

export type ParseFormat = 'new_android' | 'new_ios' | 'old_raw' | 'unknown';

export type ParseResult = {
  records: StreamedRecord[];
  format: ParseFormat;
  error?: string;
};

function detectFormat(data: any): { format: ParseFormat; segments: any[]; error?: string } {
  if (Array.isArray(data)) {
    if (data.length === 0) return { format: 'unknown', segments: [], error: 'The file appears to be empty.' };
    const first = data[0];
    if (first.visit || first.activity || first.startTime) {
      return { format: 'new_ios', segments: data };
    }
    return { format: 'unknown', segments: [], error: 'Unrecognized file format. Please export your Timeline from Google Maps and try again.' };
  }

  if (data.semanticSegments) {
    if (data.semanticSegments.length === 0) return { format: 'unknown', segments: [], error: 'No timeline data found in this file.' };
    return { format: 'new_android', segments: data.semanticSegments };
  }

  if (data.locations && Array.isArray(data.locations)) {
    return {
      format: 'old_raw',
      segments: [],
      error: 'This appears to be an older Google Timeline format. For the best experience, please export a fresh Timeline from Google Maps (Settings → Your Timeline → Export). The new format includes visit and activity data that Lobo needs to generate insights.',
    };
  }

  if (data.timelineObjects && Array.isArray(data.timelineObjects)) {
    return {
      format: 'unknown',
      segments: [],
      error: 'This looks like a per-month Timeline file. Please export your full Timeline from Google Maps instead of individual month files.',
    };
  }

  return {
    format: 'unknown',
    segments: [],
    error: 'Unrecognized file format. Please export your Timeline from Google Maps and try again.',
  };
}

function parseLatLng(latLng: any): { lat: number; lng: number } {
  if (!latLng) return { lat: 0, lng: 0 };
  if (typeof latLng === 'string') {
    const geoMatch = latLng.match(/^geo:([-\d.]+),([-\d.]+)/);
    if (geoMatch) {
      return { lat: parseFloat(geoMatch[1]), lng: parseFloat(geoMatch[2]) };
    }
    const cleaned = latLng.replace(/°/g, '');
    const parts = cleaned.split(',');
    return {
      lat: parseFloat(parts[0]?.trim() || '0'),
      lng: parseFloat(parts[1]?.trim() || '0'),
    };
  }
  return {
    lat: latLng.latitude || latLng.lat || 0,
    lng: latLng.longitude || latLng.lng || latLng.lon || 0,
  };
}

function parsePoint(point: string): { lat: number; lng: number } {
  const cleaned = point.replace(/°/g, '');
  const parts = cleaned.split(',');
  return {
    lat: parseFloat(parts[0]?.trim() || '0'),
    lng: parseFloat(parts[1]?.trim() || '0'),
  };
}

function mapActivityToCategory(activity: string): string {
  const normalized = activity.toUpperCase().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    IN_VEHICLE: 'Driving',
    IN_CAR: 'Driving',
    IN_PASSENGER_VEHICLE: 'Driving',
    IN_TAXI: 'Taxi / Rideshare',
    ON_BICYCLE: 'Cycling',
    WALKING: 'Walking',
    RUNNING: 'Running',
    STILL: 'Stationary',
    ON_FOOT: 'Walking',
    IN_TRAIN: 'Train',
    IN_SUBWAY: 'Subway',
    IN_BUS: 'Bus',
    IN_FERRY: 'Ferry',
    FLYING: 'Flying',
    SAILING: 'Sailing',
    UNKNOWN: 'Unknown',
  };
  return map[normalized] || 'Driving';
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseSegment(segment: any): StreamedRecord | null {
  try {
    const start = new Date(segment.startTime).getTime();
    if (isNaN(start)) return null;

    const end = new Date(segment.endTime).getTime();
    const rawMinutes = Math.round((end - start) / 60000);

    if (segment.visit) {
      const durationMinutes = Math.min(rawMinutes, 1080);
      const tc = segment.visit.topCandidate;
      const placeLocation = tc?.placeLocation;
      const latLng = typeof placeLocation === 'string' ? placeLocation : placeLocation?.latLng;
      const { lat, lng } = parseLatLng(latLng);
      const placeId = tc?.placeID || tc?.placeId || null;
      return { timestamp: start, latitude: lat, longitude: lng, activity: 'Visit', durationMinutes, placeId };
    }

    if (segment.activity) {
      const act = segment.activity;
      const segProbability = parseFloat(String(act.probability ?? '1'));
      if (segProbability < 0.6) return null;
      const durationMinutes = Math.min(rawMinutes, 90);
      const startCoord = act.start?.latLng || act.start;
      const { lat, lng } = parseLatLng(startCoord);
      const actType = act.topCandidate?.type || 'UNKNOWN';
      const MAX_SEGMENT_MILES = 50;
      const rawDistance = act.distanceMeters ? parseFloat(String(act.distanceMeters)) : null;
      const distanceMeters = rawDistance ? Math.min(rawDistance, MAX_SEGMENT_MILES * 1609.34) : null;
      return { timestamp: start, latitude: lat, longitude: lng, activity: mapActivityToCategory(actType), durationMinutes, distanceMeters };
    }

    if (segment.timelinePath && segment.timelinePath.length > 0) {
      const point = segment.timelinePath[0].point || '';
      const { lat, lng } = parsePoint(point);
      if (lat !== 0 && lng !== 0) {
        let distanceMeters = 0;
        const path = segment.timelinePath;
        for (let i = 1; i < path.length; i++) {
          const p1 = parsePoint(path[i-1].point || '');
          const p2 = parsePoint(path[i].point || '');
          if (p1.lat !== 0 && p2.lat !== 0) {
            distanceMeters += haversineMeters(p1.lat, p1.lng, p2.lat, p2.lng);
          }
        }
        const MAX_METERS = 50 * 1609.34;
        const cappedDistance = Math.min(distanceMeters, MAX_METERS);
        const miles = cappedDistance / 1609.34;
        const mph = miles < 3 ? 15 : miles < 10 ? 20 : miles <= 30 ? 35 : 55;
        const durationMinutes = miles > 0
          ? Math.min(Math.round((miles / mph) * 60), 75)
          : Math.min(rawMinutes, 45);
        return { timestamp: start, latitude: lat, longitude: lng, activity: 'Driving', durationMinutes, distanceMeters: cappedDistance > 0 ? cappedDistance : null };
      }
    }
  } catch (e) {
    // Skip malformed segments
  }
  return null;
}

function extractSegmentsFromChunk(text: string): any[] {
  const segments: any[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const obj = JSON.parse(text.substring(start, i + 1));
          if (obj.startTime) segments.push(obj);
        } catch (e) {
          // Skip malformed
        }
        start = -1;
      }
    }
  }

  return segments;
}

function trimDrivingOutliers(records: StreamedRecord[]): StreamedRecord[] {
  const drivingDurations = records
    .filter(r => r.activity === 'Driving')
    .map(r => r.durationMinutes)
    .sort((a, b) => a - b);

  if (drivingDurations.length < 20) return records;

  const p95Index = Math.floor(drivingDurations.length * 0.95);
  const p95Cap = drivingDurations[p95Index];

  return records.map(r => {
    if (r.activity !== 'Driving' || r.durationMinutes <= p95Cap) return r;
    return { ...r, durationMinutes: p95Cap };
  });
}

// Copy a content:// URI to the app cache directory so fetch() can read it
async function resolveToFileUri(uri: string): Promise<string> {
  if (!uri.startsWith('content://')) return uri;
  const FileSystem = await import('expo-file-system/legacy');
  const cacheUri = FileSystem.cacheDirectory + 'timeline_import.json';
  await FileSystem.copyAsync({ from: uri, to: cacheUri });
  return cacheUri;
}

export async function streamParseTimeline(
  fileUri: string,
  onProgress: (parsed: number, total: number) => void,
  sinceTimestamp?: number
): Promise<ParseResult> {
  const cutoff = sinceTimestamp || (Date.now() - MONTHS_24);

  if (Platform.OS === 'web') {
    onProgress(0, 100);
    const response = await fetch(fileUri);
    const text = await response.text();
    onProgress(50, 100);
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { records: [], format: 'unknown', error: 'Could not read the file. Please make sure it is a valid Google Timeline JSON export.' };
    }
    const { format, segments, error } = detectFormat(data);
    if (error) return { records: [], format, error };

    const records: StreamedRecord[] = [];
    for (const segment of segments) {
      const record = parseSegment(segment);
      if (record) records.push(record);
    }
    onProgress(100, 100);
    return { records: trimDrivingOutliers(records), format };
  }

  // Native: resolve content:// URIs first, then use fetch()
  try {
    onProgress(0, 100);

    // Convert content:// URI to a local file:// URI if needed
    const resolvedUri = await resolveToFileUri(fileUri);

    const response = await fetch(resolvedUri);
    if (!response.ok) throw new Error('fetch failed');

    const text = await response.text();
    onProgress(50, 100);

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      onProgress(75, 100);
      const segments = extractSegmentsFromChunk(text);
      if (segments.length === 0) {
        return { records: [], format: 'unknown', error: 'No timeline segments found. Please make sure you are using a Google Timeline JSON export.' };
      }
      const records: StreamedRecord[] = [];
      for (const segment of segments) {
        const record = parseSegment(segment);
        if (record && record.timestamp >= cutoff) records.push(record);
      }
      records.sort((a, b) => a.timestamp - b.timestamp);
      onProgress(100, 100);
      return { records: trimDrivingOutliers(records), format: 'new_android' };
    }

    const { format, segments, error } = detectFormat(data);
    if (error) return { records: [], format, error };

    onProgress(75, 100);
    const records: StreamedRecord[] = [];
    for (const segment of segments) {
      const record = parseSegment(segment);
      if (record && record.timestamp >= cutoff) records.push(record);
    }
    records.sort((a, b) => a.timestamp - b.timestamp);
    onProgress(100, 100);
    return { records: trimDrivingOutliers(records), format };

  } catch (fetchError) {
    // fetch() failed — fall back to FileSystem for compatibility
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? (fileInfo as any).size : 0;

      if (fileSize === 0) return { records: [], format: 'unknown', error: 'The file appears to be empty.' };

      onProgress(0, fileSize);
      const readStart = Math.max(0, fileSize - MAX_READ);
      const readLength = fileSize - readStart;

      const chunk = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
        position: readStart,
        length: readLength,
      });

      onProgress(fileSize, fileSize);
      const segments = extractSegmentsFromChunk(chunk);
      if (segments.length === 0) {
        return { records: [], format: 'unknown', error: 'No timeline segments found. Please make sure you are using a Google Timeline JSON export.' };
      }

      const records: StreamedRecord[] = [];
      for (const segment of segments) {
        const record = parseSegment(segment);
        if (record && record.timestamp >= cutoff) records.push(record);
      }
      records.sort((a, b) => a.timestamp - b.timestamp);
      return { records: trimDrivingOutliers(records), format: 'new_android' };

    } catch (fsError: any) {
      return { records: [], format: 'unknown', error: fsError.message || 'Failed to read the file. Please try again.' };
    }
  }
}
