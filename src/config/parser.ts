export type TimelineRecord = {
  timestamp: number;
  latitude: number;
  longitude: number;
  activity: string;
  durationMinutes: number;
  placeId?: string | null;
};

function detectFormat(data: any): 'old' | 'new' | 'unknown' {
  if (data.locations && Array.isArray(data.locations)) {
    return 'old';
  }
  if (data.semanticSegments) {
    return 'new';
  }
  return 'unknown';
}

function parseActivity(activity: any[]): string {
  if (!activity || activity.length === 0) return 'UNKNOWN';
  const sorted = [...activity].sort(
    (a, b) => (b.confidence || 0) - (a.confidence || 0)
  );
  return sorted[0]?.type || 'UNKNOWN';
}

function mapActivityToCategory(activity: string): string {
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
  return map[activity] || activity;
}

function parseLatLng(latLng: any): { lat: number; lng: number } {
  if (!latLng) return { lat: 0, lng: 0 };
  if (typeof latLng === 'string') {
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

export function parseOldFormat(data: any): TimelineRecord[] {
  const records: TimelineRecord[] = [];
  const locations = data.locations || [];

  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    const timestamp = parseInt(loc.timestampMs || '0');
    const latitude = (loc.latitudeE7 || 0) / 1e7;
    const longitude = (loc.longitudeE7 || 0) / 1e7;

    const nextLoc = locations[i + 1];
    const nextTimestamp = nextLoc
      ? parseInt(nextLoc.timestampMs || '0')
      : timestamp;
    const durationMinutes = Math.round(
      Math.abs(nextTimestamp - timestamp) / 60000
    );

    const activityType = loc.activity?.[0]?.activity
      ? parseActivity(loc.activity[0].activity)
      : 'UNKNOWN';

    records.push({
      timestamp,
      latitude,
      longitude,
      activity: mapActivityToCategory(activityType),
      durationMinutes: Math.min(durationMinutes, 1440),
    });
  }

  return records;
}

export function parseNewFormat(data: any): TimelineRecord[] {
  const records: TimelineRecord[] = [];
  const segments = data.semanticSegments || [];

  for (const segment of segments) {
    const start = new Date(segment.startTime).getTime();
    const end = new Date(segment.endTime).getTime();
    const durationMinutes = Math.min(
      Math.round((end - start) / 60000),
      1440
    );

    if (segment.visit) {
      const latLng = segment.visit.topCandidate?.placeLocation?.latLng;
      const { lat, lng } = parseLatLng(latLng);
      const placeId = segment.visit.topCandidate?.placeId || null;

      records.push({
        timestamp: start,
        latitude: lat,
        longitude: lng,
        activity: 'Visit',
        durationMinutes,
        placeId,
      });

    } else if (segment.activity) {
      const act = segment.activity;
      const latLng = act.start?.latLng;
      const { lat, lng } = parseLatLng(latLng);

      records.push({
        timestamp: start,
        latitude: lat,
        longitude: lng,
        activity: mapActivityToCategory(act.topCandidate?.type || 'UNKNOWN'),
        durationMinutes,
      });

    } else if (segment.timelinePath && segment.timelinePath.length > 0) {
      const point = segment.timelinePath[0].point || '';
      const { lat, lng } = parsePoint(point);

      if (lat !== 0 && lng !== 0) {
        records.push({
          timestamp: start,
          latitude: lat,
          longitude: lng,
          activity: 'Driving',
          durationMinutes,
        });
      }
    }
  }

  return records;
}

export function parseTimelineFile(jsonString: string): {
  records: TimelineRecord[];
  format: string;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);
    const format = detectFormat(data);

    if (format === 'old') {
      return { records: parseOldFormat(data), format: 'old' };
    } else if (format === 'new') {
      return { records: parseNewFormat(data), format: 'new' };
    } else {
      return {
        records: [],
        format: 'unknown',
        error:
          'Unrecognized file format. Please make sure you selected the correct Google Timeline export file.',
      };
    }
  } catch (e) {
    return {
      records: [],
      format: 'unknown',
      error: 'Could not read the file. It may be corrupted or not a valid JSON file.',
    };
  }
}