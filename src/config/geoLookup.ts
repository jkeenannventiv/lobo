// geoLookup.ts
// Bundled ZIP3 → MSA lookup for US and Canada.
// Uses a simplified centroid-based approach — finds the closest
// major metro area from home coordinates without any API call.
// Accuracy is metro-level (not street level) which is intentional for privacy.

export type GeoResult = {
  zip3: string;        // First 3 digits of nearest ZIP, e.g. "370"
  msa: string;         // Metro area name, e.g. "Nashville, TN"
  country: 'US' | 'CA';
};

// Major US metro centroids with ZIP3 prefix and MSA name
// Format: [lat, lon, zip3, msa_name]
// ~100 largest US metros + major Canadian cities
const METRO_CENTROIDS: [number, number, string, string, 'US' | 'CA'][] = [
  // US Metro Areas
  [40.7128, -74.0060, '100', 'New York, NY', 'US'],
  [34.0522, -118.2437, '900', 'Los Angeles, CA', 'US'],
  [41.8781, -87.6298, '606', 'Chicago, IL', 'US'],
  [29.7604, -95.3698, '770', 'Houston, TX', 'US'],
  [33.4484, -112.0740, '850', 'Phoenix, AZ', 'US'],
  [39.9526, -75.1652, '191', 'Philadelphia, PA', 'US'],
  [29.4241, -98.4936, '782', 'San Antonio, TX', 'US'],
  [32.7767, -96.7970, '752', 'Dallas, TX', 'US'],
  [30.3322, -81.6557, '322', 'Jacksonville, FL', 'US'],
  [30.2672, -97.7431, '787', 'Austin, TX', 'US'],
  [30.3935, -86.4958, '325', 'Fort Worth, TX', 'US'],
  [37.3382, -121.8863, '951', 'San Jose, CA', 'US'],
  [30.2241, -92.0198, '705', 'Columbus, OH', 'US'],
  [39.9612, -82.9988, '432', 'Columbus, OH', 'US'],
  [35.2271, -80.8431, '282', 'Charlotte, NC', 'US'],
  [39.7392, -104.9903, '802', 'Denver, CO', 'US'],
  [32.7157, -117.1611, '921', 'San Diego, CA', 'US'],
  [35.4676, -97.5164, '731', 'Oklahoma City, OK', 'US'],
  [36.1627, -86.7816, '372', 'Nashville, TN', 'US'],
  [36.1540, -95.9928, '741', 'Tulsa, OK', 'US'],
  [35.1495, -90.0490, '381', 'Memphis, TN', 'US'],
  [38.2527, -85.7585, '402', 'Louisville, KY', 'US'],
  [43.0481, -76.1474, '132', 'Syracuse, NY', 'US'],
  [42.3601, -71.0589, '021', 'Boston, MA', 'US'],
  [47.6062, -122.3321, '981', 'Seattle, WA', 'US'],
  [45.5051, -122.6750, '972', 'Portland, OR', 'US'],
  [37.7749, -122.4194, '941', 'San Francisco, CA', 'US'],
  [25.7617, -80.1918, '331', 'Miami, FL', 'US'],
  [28.5383, -81.3792, '328', 'Orlando, FL', 'US'],
  [27.9506, -82.4572, '336', 'Tampa, FL', 'US'],
  [26.7153, -80.0534, '334', 'West Palm Beach, FL', 'US'],
  [30.3322, -89.3301, '395', 'Biloxi, MS', 'US'],
  [30.6954, -88.0399, '366', 'Mobile, AL', 'US'],
  [33.5207, -86.8025, '352', 'Birmingham, AL', 'US'],
  [32.3668, -86.3000, '361', 'Montgomery, AL', 'US'],
  [30.3960, -88.8853, '395', 'Gulfport, MS', 'US'],
  [32.2988, -90.1848, '392', 'Jackson, MS', 'US'],
  [29.9511, -90.0715, '701', 'New Orleans, LA', 'US'],
  [30.4515, -91.1871, '708', 'Baton Rouge, LA', 'US'],
  [32.5252, -92.1193, '712', 'Monroe, LA', 'US'],
  [32.4687, -93.7902, '711', 'Shreveport, LA', 'US'],
  [33.5779, -101.8552, '794', 'Lubbock, TX', 'US'],
  [31.5493, -97.1467, '767', 'Waco, TX', 'US'],
  [31.7619, -106.4850, '799', 'El Paso, TX', 'US'],
  [35.6870, -105.9378, '875', 'Santa Fe, NM', 'US'],
  [35.0844, -106.6504, '871', 'Albuquerque, NM', 'US'],
  [36.1716, -115.1391, '891', 'Las Vegas, NV', 'US'],
  [43.6150, -116.2023, '837', 'Boise, ID', 'US'],
  [47.6588, -117.4260, '992', 'Spokane, WA', 'US'],
  [46.8772, -96.7898, '581', 'Fargo, ND', 'US'],
  [44.9778, -93.2650, '554', 'Minneapolis, MN', 'US'],
  [44.5192, -88.0198, '543', 'Green Bay, WI', 'US'],
  [43.0489, -76.1522, '430', 'Milwaukee, WI', 'US'],
  [43.0731, -89.4012, '537', 'Madison, WI', 'US'],
  [41.5868, -93.6250, '503', 'Des Moines, IA', 'US'],
  [41.2565, -95.9345, '681', 'Omaha, NE', 'US'],
  [39.0997, -94.5786, '641', 'Kansas City, MO', 'US'],
  [38.6270, -90.1994, '631', 'St. Louis, MO', 'US'],
  [37.6879, -97.3392, '672', 'Wichita, KS', 'US'],
  [38.9517, -92.3341, '652', 'Columbia, MO', 'US'],
  [39.7684, -86.1581, '462', 'Indianapolis, IN', 'US'],
  [41.0534, -85.1440, '468', 'Fort Wayne, IN', 'US'],
  [42.9634, -85.6681, '495', 'Grand Rapids, MI', 'US'],
  [42.3314, -83.0458, '482', 'Detroit, MI', 'US'],
  [41.4993, -81.6944, '441', 'Cleveland, OH', 'US'],
  [41.0814, -81.5190, '442', 'Akron, OH', 'US'],
  [39.1031, -84.5120, '452', 'Cincinnati, OH', 'US'],
  [38.0406, -84.5037, '405', 'Lexington, KY', 'US'],
  [36.8529, -75.9780, '234', 'Virginia Beach, VA', 'US'],
  [37.5407, -77.4360, '232', 'Richmond, VA', 'US'],
  [38.9072, -77.0369, '200', 'Washington, DC', 'US'],
  [39.2904, -76.6122, '212', 'Baltimore, MD', 'US'],
  [39.9526, -75.1652, '190', 'Philadelphia, PA', 'US'],
  [40.4406, -79.9959, '152', 'Pittsburgh, PA', 'US'],
  [43.1610, -77.6109, '146', 'Rochester, NY', 'US'],
  [42.8864, -78.8784, '142', 'Buffalo, NY', 'US'],
  [42.6526, -73.7562, '122', 'Albany, NY', 'US'],
  [41.7658, -72.6851, '060', 'Hartford, CT', 'US'],
  [41.3083, -72.9279, '065', 'New Haven, CT', 'US'],
  [41.8240, -71.4128, '029', 'Providence, RI', 'US'],
  [43.6615, -70.2553, '041', 'Portland, ME', 'US'],
  [44.0001, -71.5489, '038', 'Manchester, NH', 'US'],
  [44.4759, -73.2121, '054', 'Burlington, VT', 'US'],
  [35.7796, -78.6382, '276', 'Raleigh, NC', 'US'],
  [36.0726, -79.7920, '274', 'Greensboro, NC', 'US'],
  [34.0007, -81.0348, '292', 'Columbia, SC', 'US'],
  [32.7765, -79.9311, '294', 'Charleston, SC', 'US'],
  [33.7490, -84.3880, '303', 'Atlanta, GA', 'US'],
  [31.5085, -83.0458, '317', 'Macon, GA', 'US'],
  [32.0809, -81.0912, '314', 'Savannah, GA', 'US'],
  [30.4383, -84.2807, '323', 'Tallahassee, FL', 'US'],
  [26.1420, -81.7948, '341', 'Naples, FL', 'US'],
  [24.5557, -81.7826, '330', 'Key West, FL', 'US'],
  [21.3069, -157.8583, '968', 'Honolulu, HI', 'US'],
  [61.2181, -149.9003, '995', 'Anchorage, AK', 'US'],
  [47.0379, -122.9007, '984', 'Olympia, WA', 'US'],
  [37.2296, -80.4139, '240', 'Roanoke, VA', 'US'],
  [36.6681, -88.3142, '420', 'Clarksville, TN', 'US'],
  [35.0456, -85.3097, '374', 'Chattanooga, TN', 'US'],
  [35.9606, -83.9207, '379', 'Knoxville, TN', 'US'],

  // Canadian Cities
  [43.6532, -79.3832, 'M5V', 'Toronto, ON', 'CA'],
  [45.5017, -73.5673, 'H3A', 'Montreal, QC', 'CA'],
  [51.0447, -114.0719, 'T2P', 'Calgary, AB', 'CA'],
  [53.5461, -113.4938, 'T5J', 'Edmonton, AB', 'CA'],
  [49.2827, -123.1207, 'V6B', 'Vancouver, BC', 'CA'],
  [45.4215, -75.6972, 'K1A', 'Ottawa, ON', 'CA'],
  [49.8951, -97.1384, 'R3C', 'Winnipeg, MB', 'CA'],
  [46.8139, -71.2080, 'G1R', 'Quebec City, QC', 'CA'],
  [43.2557, -79.8711, 'L8P', 'Hamilton, ON', 'CA'],
  [43.5890, -79.6441, 'L4Z', 'Mississauga, ON', 'CA'],
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function lookupGeo(lat: number, lon: number): GeoResult | null {
  if (!lat || !lon || lat === 0 || lon === 0) return null;

  let closest: [number, number, string, string, 'US' | 'CA'] | null = null;
  let minDist = Infinity;

  for (const metro of METRO_CENTROIDS) {
    const dist = haversineKm(lat, lon, metro[0], metro[1]);
    if (dist < minDist) {
      minDist = dist;
      closest = metro;
    }
  }

  // If nearest metro is more than 300km away, location is likely outside US/Canada
  if (!closest || minDist > 300) return null;

  return {
    zip3: closest[2],
    msa: closest[3],
    country: closest[4],
  };
}
