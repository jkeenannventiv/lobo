const WORKER_URL = 'https://lobo-poi.jkeenan.workers.dev';

export type PoiResult = {
  name: string | null;
  category: string | null;
  address: string | null;
};

export async function lookupByPlaceId(placeId: string): Promise<PoiResult> {
  try {
    const response = await fetch(
      `${WORKER_URL}/?placeId=${encodeURIComponent(placeId)}`
    );
    if (!response.ok) throw new Error('POI lookup failed');
    return await response.json();
  } catch (e) {
    return { name: null, category: null, address: null };
  }
}

export async function lookupByCoords(
  latitude: number,
  longitude: number
): Promise<PoiResult> {
  try {
    const response = await fetch(
      `${WORKER_URL}/?lat=${latitude}&lng=${longitude}`
    );
    if (!response.ok) throw new Error('POI lookup failed');
    return await response.json();
  } catch (e) {
    return { name: null, category: null, address: null };
  }
}

export async function lookupPoi(
  latitude: number,
  longitude: number,
  placeId?: string | null
): Promise<PoiResult> {
  if (placeId) {
    return lookupByPlaceId(placeId);
  }
  return lookupByCoords(latitude, longitude);
}