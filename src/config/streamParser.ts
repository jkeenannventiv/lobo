import { Platform } from 'react-native';

const MAX_READ = 2 * 1024 * 1024; // 2MB from end of file

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
  // New iOS format — top-level array with visit/activity objects
  if (Array.isArray(data)) {
    if (data.length === 0) return { format: 'unknown', segments: [], error: 'The file appears to be empty.' };
    const first = data[0];
    if (first.visit || first.activity || first.startTime) {
      return { format: 'new_ios', segments: data };
    }
    return { format: 'unknown', segments: [], error: 'Unrecognized file format. Please export your Timeline from Google Maps and try again.' };
  }

  // New Android/Web format — object with semanticSegments array
  if (data.semanticSegments) {
    if (data.semanticSegments.length === 0) return { format: 'unknown', segments: [], error: 'No timeline data found in this file.' };
    return { format: 'new_android', segments: data.semanticSegments };
  }

  // Old raw format — object with locations array of GPS points
  if (data.locations && Array.isArray(data.locations)) {
    return {
      format: 'old_raw',
      segments: [],
      error: 'This appears to be an older Google Timeline format. For the best experience, please export a fresh Timeline from Google Maps (Settings → Your Timeline → Export). The new format includes visit and activity data that Lobo needs to generate insights.',
    };
  }

  // Semantic Location History (per-month files)
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
    // Handle geo:lat,lon format
    const geoMatch = latLng.match(/^geo:([-\d.]+),([-\d.]+)/);
    if (geoMatch) {
      return { lat: parseFloat(geoMatch[1]), lng: parseFloat(geoMatch[2]) };
    }
    // Handle "lat°, lon°" format
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
  return map[normalized] || 'Driving'; // default unknown movement to Driving
}


function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
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
      // Visits: cap at 18 hours (overnight stays are valid)
      const durationMinutes = Math.min(rawMinutes, 1080);
      const tc = segment.visit.topCandidate;
      // placeLocation can be "geo:lat,lon" string (iOS) or {latLng: "..."} object (Android/web)
      const placeLocation = tc?.placeLocation;
      const latLng = typeof placeLocation === 'string' ? placeLocation : placeLocation?.latLng;
      const { lat, lng } = parseLatLng(latLng);
      // placeID (iOS format) or placeId (Android/web format)
      const placeId = tc?.placeID || tc?.placeId || null;
      return { timestamp: start, latitude: lat, longitude: lng, activity: 'Visit', durationMinutes, placeId };
    }

    if (segment.activity) {
      const act = segment.activity;
      // Drop very low confidence segments — usually artifacts
      const segProbability = parseFloat(String(act.probability ?? '1'));
      if (segProbability < 0.6) return null;
      // Driving/walking: cap at 90 minutes
      const durationMinutes = Math.min(rawMinutes, 90);
      // start can be "geo:lat,lon" string (iOS) or {latLng: "..."} object (Android)
      const startCoord = act.start?.latLng || act.start;
      const { lat, lng } = parseLatLng(startCoord);
      const actType = act.topCandidate?.type || 'UNKNOWN';
      // distanceMeters may be a string (iOS) or number (Android)
      // Cap at 50 miles (80467m) per segment — longer values are almost always GPS artifacts
      const MAX_SEGMENT_MILES = 50;
      const rawDistance = act.distanceMeters ? parseFloat(String(act.distanceMeters)) : null;
      const distanceMeters = rawDistance ? Math.min(rawDistance, MAX_SEGMENT_MILES * 1609.34) : null;
      return { timestamp: start, latitude: lat, longitude: lng, activity: mapActivityToCategory(actType), durationMinutes, distanceMeters };
    }

    if (segment.timelinePath && segment.timelinePath.length > 0) {
      const point = segment.timelinePath[0].point || '';
      const { lat, lng } = parsePoint(point);
      if (lat !== 0 && lng !== 0) {
        // Calculate distance from waypoints using haversine
        let distanceMeters = 0;
        const path = segment.timelinePath;
        for (let i = 1; i < path.length; i++) {
          const p1 = parsePoint(path[i-1].point || '');
          const p2 = parsePoint(path[i].point || '');
          if (p1.lat !== 0 && p2.lat !== 0) {
            distanceMeters += haversineMeters(p1.lat, p1.lng, p2.lat, p2.lng);
          }
        }
        // Cap at 50 miles
        const MAX_METERS = 50 * 1609.34;
        const cappedDistance = Math.min(distanceMeters, MAX_METERS);
        // Derive duration from distance
        const miles = cappedDistance / 1609.34;
        const mph = miles < 3 ? 15 : miles < 10 ? 20 : miles <= 30 ? 35 : 55;
        const durationMinutes = miles > 0
          ? Math.min(Math.round((miles / mph) * 60), 75)
          : Math.min(rawMinutes, 45); // no waypoints → cap at 45min
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
  let segStart = -1;
  let segDepth = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      depth++;
      // Look ahead to check if this object has startTime nearby
      // Only start tracking if we haven't found a segment start yet
      if (segStart === -1) {
        // Check if "startTime" appears within the next 200 chars
        const lookahead = text.substring(i, Math.min(i + 200, text.length));
        if (lookahead.includes('"startTime"')) {
          segStart = i;
          segDepth = depth;
        }
      }
    } else if (ch === '}') {
      if (segStart !== -1 && depth === segDepth) {
        // We've closed back to the depth where we opened this segment
        try {
          const obj = JSON.parse(text.substring(segStart, i + 1));
          if (obj.startTime) segments.push(obj);
        } catch (e) {
          // Skip malformed
        }
        segStart = -1;
        segDepth = -1;
      }
      depth--;
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

export async function streamParseTimeline(
  fileUri: string,
  onProgress: (parsed: number, total: number) => void,
  sinceTimestamp?: number
): Promise<ParseResult> {
  const cutoff = sinceTimestamp || 0; // No cutoff on first import — process all history

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

    // Web: no cutoff — process all available history
    const records: StreamedRecord[] = [];
    for (const segment of segments) {
      const record = parseSegment(segment);
      if (record) records.push(record);
    }
    onProgress(100, 100);
    return { records: trimDrivingOutliers(records), format };
  }

  // Native: small files read entirely, large files use SDK 54+ streaming
  try {
    onProgress(0, 100);

    // Check file size using legacy API (most reliable for size check)
    const FileSystem = await import('expo-file-system/legacy');
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    const fileSize = fileInfo.exists && 'size' in fileInfo ? (fileInfo as any).size : 0;

    if (fileSize === 0) {
      return { records: [], format: 'unknown', error: 'The file appears to be empty.' };
    }

    // Small files (< 15MB): read entirely and parse as JSON
    if (fileSize < 15 * 1024 * 1024) {
      onProgress(20, 100);
      const text = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      onProgress(60, 100);
      try {
        const data = JSON.parse(text);
        const { format, segments, error } = detectFormat(data);
        if (error) return { records: [], format, error };
        const records: StreamedRecord[] = [];
        for (const segment of segments) {
          const record = parseSegment(segment);
          if (record && record.timestamp >= cutoff) records.push(record);
        }
        records.sort((a, b) => a.timestamp - b.timestamp);
        onProgress(100, 100);
        return { records: trimDrivingOutliers(records), format };
      } catch {
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
    }

    // Large files: use SDK 54+ streaming API
    const { File } = await import('expo-file-system');
    const file = new File(fileUri);

    let bytesRead = 0;
    let leftover = '';
    const allSegments: any[] = [];
    const decoder = new TextDecoder('utf-8');

    const processChunk = (bytes: Uint8Array) => {
      const text = decoder.decode(bytes, { stream: true });
      const combined = leftover + text;
      const segs = extractSegmentsFromChunk(combined);
      allSegments.push(...segs);
      leftover = combined.slice(-5000);
      bytesRead += bytes.length;
      if (fileSize > 0) {
        onProgress(Math.min(85, Math.round((bytesRead / fileSize) * 85)), 100);
      }
    };

    let streamed = false;

    // Try 1: readableStream (most memory efficient)
    try {
      const stream = (file as any).readableStream();
      for await (const chunk of stream) {
        processChunk(chunk);
      }
      streamed = true;
    } catch {}

    // Try 2: FileHandle chunked reads
    if (!streamed) {
      try {
        const handle = (file as any).open();
        const CHUNK = 128 * 1024;
        let offset = 0;
        while (true) {
          handle.offset = offset;
          const chunk = await handle.readBytes(CHUNK);
          if (!chunk || chunk.length === 0) break;
          processChunk(chunk);
          offset += chunk.length;
        }
        handle.close();
        streamed = true;
      } catch {}
    }

    // Try 3: legacy readAsStringAsync (small files only)
    if (!streamed) {
      if (fileSize > 30 * 1024 * 1024) {
        return {
          records: [],
          format: 'unknown',
          error: 'Your Timeline file is too large for Android. Please use the web version at lobo-app-v2.pages.dev — it handles files of any size.',
        };
      }
      const text = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const segs = extractSegmentsFromChunk(text);
      allSegments.push(...segs);
      onProgress(85, 100);
    }

    onProgress(90, 100);

    if (allSegments.length === 0) {
      return { records: [], format: 'unknown', error: 'No timeline segments found. Please make sure you are using a Google Timeline JSON export.' };
    }

    // Deduplicate segments by startTime to prevent duplicate records
    // from chunk overlap in the streaming path
    const seenStartTimes = new Set<string>();
    const uniqueSegments = allSegments.filter(s => {
      if (!s.startTime || seenStartTimes.has(s.startTime)) return false;
      seenStartTimes.add(s.startTime);
      return true;
    });

    const records: StreamedRecord[] = [];
    for (const segment of uniqueSegments) {
      const record = parseSegment(segment);
      if (record && record.timestamp >= cutoff) records.push(record);
    }
    records.sort((a, b) => a.timestamp - b.timestamp);
    onProgress(100, 100);
    if (records.length === 0 && allSegments.length > 0) {
      return { records: [], format: 'unknown', error: 'No records found within the selected date range. Try a Force Full Reload from Settings to clear the date filter.' };
    } else if (records.length === 0) {
      return { records: [], format: 'unknown', error: 'No timeline segments found. Please make sure you are using a Google Timeline JSON export.' };
    }
    return { records: trimDrivingOutliers(records), format: 'new_android' };

  } catch (err: any) {
    return { records: [], format: 'unknown', error: err.message || 'Failed to read the file. Please try again.' };
  }
}