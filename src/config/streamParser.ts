/**
 * streamParser.ts — streaming JSON parser for Google Timeline exports
 *
 * WHY THIS EXISTS:
 *   Large timeline files (50–100MB+) caused OOM crashes on production Android.
 *   The old readAsStringAsync approach loaded the entire file as a JS string.
 *   The new expo-file-system SDK 54 File API reads as Uint8Array chunks that
 *   stay in native memory and never materialize as a full JS string.
 *
 * HOW IT WORKS:
 *   1. expo-file-system File.readableStream() yields Uint8Array chunks with
 *      backpressure — the OS controls memory, not JS.
 *   2. TextDecoder with { stream: true } converts chunks to strings safely,
 *      handling multi-byte UTF-8 characters (e.g. place names) that might
 *      split across chunk boundaries.
 *   3. clarinet is a SAX-style streaming JSON parser — fed strings
 *      incrementally, it fires events without ever buffering the full document.
 *   4. A lightweight state machine extracts only timelineObjects entries.
 *   5. Peak JS heap stays ~constant regardless of file size.
 *
 * DEPENDENCIES:
 *   expo-file-system (SDK 54+ — uses new File API, not legacy readAsStringAsync)
 *   clarinet: npm install clarinet
 *
 * USAGE:
 *   import { parseTimelineFile } from './streamParser';
 *   const entries = await parseTimelineFile(fileUri, (pct) => setProgress(pct));
 */

import { File } from 'expo-file-system';
import clarinet from 'clarinet';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlaceVisit {
  type: 'placeVisit';
  location: {
    latitudeE7?: number;
    longitudeE7?: number;
    name?: string;
    address?: string;
    placeId?: string;
  };
  duration: {
    startTimestamp: string;
    endTimestamp: string;
  };
  visitConfidence?: number;
}

export interface ActivitySegment {
  type: 'activitySegment';
  startLocation?: { latitudeE7?: number; longitudeE7?: number };
  endLocation?: { latitudeE7?: number; longitudeE7?: number };
  duration: {
    startTimestamp: string;
    endTimestamp: string;
  };
  distance?: number;
  activityType?: string;
  confidence?: string;
}

export type TimelineEntry = PlaceVisit | ActivitySegment;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse a Google Timeline JSON export from a file:// URI.
 *
 * @param fileUri     A file:// URI. DocumentPicker with copyToCacheDirectory:true
 *                    already gives you this — no conversion needed.
 * @param onProgress  Optional callback receiving 0–100. Requires file size to be
 *                    readable; silently skipped if size is unavailable.
 * @returns           Parsed TimelineEntry array (placeVisit | activitySegment).
 */
export async function parseTimelineFile(
  fileUri: string,
  onProgress?: (percent: number) => void,
): Promise<TimelineEntry[]> {
  // SDK 54 File constructor accepts file:// and content:// URIs directly
  const file = new File(fileUri);

  // Get file size for progress reporting (best-effort — not required for parsing)
  let fileSize = 0;
  try {
    fileSize = file.size ?? 0;
  } catch {
    // size unavailable — progress reporting will be skipped
  }

  return new Promise<TimelineEntry[]>((resolve, reject) => {
    const entries: TimelineEntry[] = [];

    // ── State machine ──────────────────────────────────────────────────────
    // Google Timeline JSON structure (legacy format):
    // {
    //   "timelineObjects": [
    //     { "placeVisit": { ... } },
    //     { "activitySegment": { ... } },
    //   ]
    // }
    //
    // Depth tracking:
    //   depth 0 → root
    //   depth 1 → inside root object (key: "timelineObjects")
    //   depth 2 → inside timelineObjects array
    //   depth 3 → inside a single array element { "placeVisit": ... }
    //   depth 4+ → inside the placeVisit/activitySegment object itself

    let depth = 0;
    let inTimelineObjects = false;
    let currentKey: string | null = null;

    // Build stack: accumulates the current timelineObjects array element
    let buildStack: Array<Record<string, any> | any[]> = [];
    let buildDepth = 0;
    let isBuilding = false;

    // ── clarinet parser setup ──────────────────────────────────────────────
    const parser = clarinet.createStream();

    parser.onerror = (err: Error) => {
      reject(new Error(`JSON parse error: ${err.message}`));
    };

    parser.onopenobject = (key?: string) => {
      depth++;
      if (isBuilding) {
        const obj: Record<string, any> = {};
        attachToParent(obj);
        buildStack.push(obj);
        if (key !== undefined) currentKey = key;
      } else if (inTimelineObjects && depth === 3) {
        // Opening a timelineObjects array element
        isBuilding = true;
        buildDepth = depth;
        const obj: Record<string, any> = {};
        buildStack = [obj];
        if (key !== undefined) currentKey = key;
      }
    };

    parser.onkey = (key: string) => {
      currentKey = key;
      if (!isBuilding && depth === 1 && key === 'timelineObjects') {
        inTimelineObjects = true;
      }
    };

    parser.onvalue = (value: any) => {
      if (isBuilding) {
        attachToParent(value);
      }
    };

    parser.onopenarray = () => {
      depth++;
      if (isBuilding) {
        const arr: any[] = [];
        attachToParent(arr);
        buildStack.push(arr);
      }
    };

    parser.onclosearray = () => {
      depth--;
      if (isBuilding) {
        buildStack.pop();
      } else if (inTimelineObjects && depth === 1) {
        inTimelineObjects = false;
      }
    };

    parser.oncloseobject = () => {
      if (isBuilding) {
        if (depth === buildDepth) {
          // Finished one complete timelineObjects array element
          const raw = buildStack[0] as Record<string, any>;
          const entry = normalizeEntry(raw);
          if (entry) entries.push(entry);
          isBuilding = false;
          buildStack = [];
        } else {
          buildStack.pop();
        }
      }
      depth--;
    };

    parser.onend = () => {
      resolve(entries);
    };

    // ── Streaming read loop ────────────────────────────────────────────────
    // TextDecoder with stream:true correctly handles multi-byte UTF-8
    // characters (Japanese/Chinese place names, accented chars, etc.)
    // that might be split across chunk boundaries.
    const decoder = new TextDecoder('utf-8');
    let bytesRead = 0;

    async function streamFile() {
      try {
        const stream = file.readableStream();

        for await (const chunk of stream) {
          // chunk is Uint8Array — lives in native memory, not JS heap
          const text = decoder.decode(chunk, { stream: true });
          parser.write(text);

          // Progress reporting
          if (onProgress && fileSize > 0) {
            bytesRead += chunk.length;
            onProgress(Math.min(99, Math.round((bytesRead / fileSize) * 100)));
          }
        }

        // Flush any remaining bytes held in the TextDecoder's internal buffer
        // (handles a multi-byte char split right at the very end of file)
        const remaining = decoder.decode();
        if (remaining) parser.write(remaining);

        // Signal end-of-input to clarinet
        parser.end();

        if (onProgress) onProgress(100);
      } catch (err) {
        reject(err);
      }
    }

    streamFile().catch(reject);

    // ── Helper: attach a value to the top of the build stack ──────────────
    function attachToParent(value: any) {
      if (buildStack.length === 0) return;
      const top = buildStack[buildStack.length - 1];
      if (Array.isArray(top)) {
        top.push(value);
      } else if (top && typeof top === 'object') {
        if (currentKey !== null) {
          (top as Record<string, any>)[currentKey] = value;
          currentKey = null;
        }
      }
    }
  });
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Convert a raw timelineObjects element into a typed TimelineEntry.
 * Returns null for unknown or malformed entries.
 */
function normalizeEntry(raw: Record<string, any>): TimelineEntry | null {
  if (raw.placeVisit) {
    const pv = raw.placeVisit;
    if (!pv.duration?.startTimestamp) return null;
    return {
      type: 'placeVisit',
      location: {
        latitudeE7: pv.location?.latitudeE7,
        longitudeE7: pv.location?.longitudeE7,
        name: pv.location?.name,
        address: pv.location?.address,
        placeId: pv.location?.placeId,
      },
      duration: {
        startTimestamp: pv.duration.startTimestamp,
        endTimestamp: pv.duration.endTimestamp,
      },
      visitConfidence: pv.visitConfidence,
    };
  }

  if (raw.activitySegment) {
    const as_ = raw.activitySegment;
    if (!as_.duration?.startTimestamp) return null;
    return {
      type: 'activitySegment',
      startLocation: as_.startLocation
        ? {
            latitudeE7: as_.startLocation.latitudeE7,
            longitudeE7: as_.startLocation.longitudeE7,
          }
        : undefined,
      endLocation: as_.endLocation
        ? {
            latitudeE7: as_.endLocation.latitudeE7,
            longitudeE7: as_.endLocation.longitudeE7,
          }
        : undefined,
      duration: {
        startTimestamp: as_.duration.startTimestamp,
        endTimestamp: as_.duration.endTimestamp,
      },
      distance: as_.distance,
      activityType: as_.activityType,
      confidence: as_.confidence,
    };
  }

  return null;
}
