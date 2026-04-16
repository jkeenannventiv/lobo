const WORKER_URL = 'https://lobo-poi.jkeenan.workers.dev';

export type PoiResult = {
  name: string | null;
  category: string | null;
  address: string | null;
};

// ── Category translation ───────────────────────────────────────────────────
// The worker returns simple strings like 'Park', 'Hospital', 'Gym'.
// These must be translated to Lobo's internal taxonomy before storage.
const WORKER_CATEGORY_MAP: Record<string, string> = {
  'Fast Food':         'Restaurants',
  'Restaurant':        'Restaurants',
  'Cafe':              'Restaurants',
  'Bar':               'Bar',
  'Grocery':           'Grocery',
  'Convenience Store': 'Retail',
  'Shopping Mall':     'Retail',
  'Retail':            'Retail',
  'Home Improvement':  'Retail',
  'Gas Station':       'Gas Station',
  'Car Wash':          'Services',
  'Auto':              'Services',
  'Pharmacy':          'Pharmacy',
  'Hospital':          'Health & Fitness',
  'Medical':           'Health & Fitness',
  'Gym':               'Health & Fitness',
  'Park':              'Entertainment',
  'School':            'Education',
  'University':        'Education',
  'Library':           'Education',
  'Bank':              'Services',
  'Hotel':             'Travel',
  'Entertainment':     'Entertainment',
  'Cultural':          'Entertainment',
  'Place of Worship':  'Religious',
  'Airport':           'Travel',
  'Transit':           'Travel',
  'Post Office':       'Services',
  'Government':        'Services',
  'Salon':             'Services',
  'Laundry':           'Services',
  'Storage':           'Services',
  'Business':          'Business',
  'Point of Interest': 'Point of Interest',
};

function translateCategory(workerCategory: string | null): string | null {
  if (!workerCategory) return null;
  return WORKER_CATEGORY_MAP[workerCategory] ?? workerCategory;
}

// ── Name normalization ─────────────────────────────────────────────────────
// Consolidates chain name variants to a canonical form so "Starbucks Coffee
// Company", "Starbucks - Drive Thru", "Starbucks Georges Court" etc. all
// appear as a single place in analytics.
const NAME_NORMALIZATIONS: { pattern: RegExp; canonical: string }[] = [
  { pattern: /^starbucks\b.*/i,            canonical: 'Starbucks' },
  { pattern: /^mcdonald'?s\b.*/i,          canonical: "McDonald's" },
  { pattern: /^chick-fil-a\b.*/i,          canonical: 'Chick-fil-A' },
  { pattern: /^walgreen\w*\b.*/i,          canonical: 'Walgreens' },
  { pattern: /^cvs\b.*/i,                  canonical: 'CVS Pharmacy' },
  { pattern: /^walmart\b.*/i,              canonical: 'Walmart' },
  { pattern: /^target\b.*/i,               canonical: 'Target' },
  { pattern: /^kroger\b.*/i,               canonical: 'Kroger' },
  { pattern: /^publix\b.*/i,               canonical: 'Publix' },
  { pattern: /^(the )?home depot\b.*/i,    canonical: 'The Home Depot' },
  { pattern: /^costco\b.*/i,               canonical: 'Costco' },
  { pattern: /^sam'?s club\b.*/i,          canonical: "Sam's Club" },
  { pattern: /^lowe'?s\b.*/i,              canonical: "Lowe's" },
  { pattern: /^best buy\b.*/i,             canonical: 'Best Buy' },
  { pattern: /^dunkin'?\b.*/i,             canonical: 'Dunkin' },
  { pattern: /^taco bell\b.*/i,            canonical: 'Taco Bell' },
  { pattern: /^burger king\b.*/i,          canonical: 'Burger King' },
  { pattern: /^wendy'?s\b.*/i,             canonical: "Wendy's" },
  { pattern: /^chipotle\b.*/i,             canonical: 'Chipotle' },
  { pattern: /^panera\b.*/i,               canonical: 'Panera Bread' },
  { pattern: /^subway\b.*/i,               canonical: 'Subway' },
  { pattern: /^chili'?s\b.*/i,             canonical: "Chili's" },
  { pattern: /^olive garden\b.*/i,         canonical: 'Olive Garden' },
  { pattern: /^texas roadhouse\b.*/i,      canonical: 'Texas Roadhouse' },
  { pattern: /^cracker barrel\b.*/i,       canonical: 'Cracker Barrel' },
  { pattern: /^waffle house\b.*/i,         canonical: 'Waffle House' },
];

function normalizeName(name: string | null): string | null {
  if (!name) return null;
  for (const { pattern, canonical } of NAME_NORMALIZATIONS) {
    if (pattern.test(name)) return canonical;
  }
  return name;
}

// ── Apply both transforms to a raw worker result ───────────────────────────
function normalizeResult(raw: PoiResult): PoiResult {
  return {
    name: normalizeName(raw.name),
    category: translateCategory(raw.category),
    address: raw.address,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function lookupByPlaceId(placeId: string): Promise<PoiResult> {
  try {
    const response = await fetch(
      `${WORKER_URL}/?placeId=${encodeURIComponent(placeId)}`
    );
    if (!response.ok) throw new Error('POI lookup failed');
    const raw: PoiResult = await response.json();
    return normalizeResult(raw);
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
    const raw: PoiResult = await response.json();
    return normalizeResult(raw);
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
