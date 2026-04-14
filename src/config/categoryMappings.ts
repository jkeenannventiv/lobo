// categoryMappings.ts
// Bundled category correction table for common chains.
// match_type:
//   'prefix' — matches any place name that starts with this string (case-insensitive)
//   'exact'  — only matches the exact string (case-insensitive)
//
// To extend: add rows following the same format.
// category and subcategory override whatever Google Places returned.

export type CategoryMapping = {
  name: string;
  match_type: 'prefix' | 'exact';
  category: string;
  subcategory: string | null;
};

export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  // ── Fast Food ──────────────────────────────────────────────────────────────
  { name: "McDonald's",         match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Mcdonalds',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Chick-fil-A',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Chick-Fil-A',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Wendy's",            match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Burger King',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Taco Bell',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Popeyes',            match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Popeye's",           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'KFC',                match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Arby's",             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Sonic',              match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Sonic Drive-In",     match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Jack in the Box',    match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Hardee',             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Carl's Jr",          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Whataburger',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Five Guys',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Shake Shack',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Raising Cane's",     match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Zaxby',              match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Culver's",           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'In-N-Out',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Steak n Shake',      match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Steak 'n Shake",     match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Del Taco',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Checkers",           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Rally's",            match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Bojangles',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Church's Chicken",   match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Dairy Queen',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Wingstop',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Buffalo Wild Wings', match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Domino's",           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Papa John',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Papa Murphy's",      match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Little Caesars',     match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Pizza Hut',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Subway',             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Jersey Mike',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: "Jimmy John's",       match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Firehouse Subs',     match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Potbelly',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Panda Express',      match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Chipotle',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Qdoba',              match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Moe\'s',             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Panera',             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Jason\'s Deli',      match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },
  { name: 'Freddy\'s',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Fast Food' },

  // ── Cafes / Coffee ─────────────────────────────────────────────────────────
  { name: 'Starbucks',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Dunkin',             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Dutch Bros',         match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Caribou Coffee',     match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Peet\'s Coffee',     match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Tim Hortons',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Biggby',             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Scooter\'s Coffee',  match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Black Rock Coffee',  match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: '7 Brew',             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Human Bean',         match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Coffee Bean',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Philz Coffee',       match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Blue Bottle',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },
  { name: 'Panera',             match_type: 'prefix', category: 'Restaurants',       subcategory: 'Cafe' },

  // ── Casual Dining ──────────────────────────────────────────────────────────
  { name: 'Applebee',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Chili\'s',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Olive Garden',       match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Red Lobster',        match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'TGI Friday',         match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Outback',            match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Texas Roadhouse',    match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'LongHorn',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Cracker Barrel',     match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'IHOP',               match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Denny\'s',           match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Waffle House',       match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Bob Evans',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Golden Corral',      match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Red Robin',          match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Hooters',            match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'O\'Charley\'s',      match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },
  { name: 'Logan\'s Roadhouse', match_type: 'prefix', category: 'Restaurants',       subcategory: 'Casual Dining' },

  // ── Grocery ────────────────────────────────────────────────────────────────
  { name: 'Publix',             match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Kroger',             match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Walmart',            match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Whole Foods',        match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Trader Joe\'s',      match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Aldi',               match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Lidl',               match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Safeway',            match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Albertsons',         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'H-E-B',              match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Meijer',             match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Harris Teeter',      match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Food Lion',          match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Giant',              match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Stop & Shop',        match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Wegmans',            match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Sprouts',            match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Natural Grocers',    match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Fresh Market',       match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Winn-Dixie',         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Piggly Wiggly',      match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Food City',          match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Ingles',             match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Hy-Vee',             match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'WinCo',              match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Stater Bros',        match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Brookshire',         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Dillons',            match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: "Fry's Food",         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Pick n Save',        match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: "Pick 'n Save",       match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: "Mariano's",          match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Tom Thumb',          match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Randalls',           match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Acme',               match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'ShopRite',           match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Price Chopper',      match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Market Basket',      match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Hannaford',          match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Jewel-Osco',         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Jewel Osco',         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: "Raley's",            match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Vons',               match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Pavilions',          match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Lucky',              match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: "Fred Meyer",         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'QFC',                match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Bashas',             match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: "Fry's Marketplace",  match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Smart & Final',      match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Grocery Outlet',     match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Save-A-Lot',         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Save A Lot',         match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Fiesta Mart',        match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Cardenas',           match_type: 'prefix', category: 'Grocery',           subcategory: null },
  { name: 'Northgate',          match_type: 'prefix', category: 'Grocery',           subcategory: null },

  // ── Pharmacy ───────────────────────────────────────────────────────────────
  { name: 'Walgreen',           match_type: 'prefix', category: 'Pharmacy',          subcategory: null },
  { name: 'CVS',                match_type: 'prefix', category: 'Pharmacy',          subcategory: null },
  { name: 'Rite Aid',           match_type: 'prefix', category: 'Pharmacy',          subcategory: null },
  { name: 'Duane Reade',        match_type: 'prefix', category: 'Pharmacy',          subcategory: null },

  // ── Gas Station ────────────────────────────────────────────────────────────
  { name: 'Shell',              match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'BP',                 match_type: 'exact',  category: 'Gas Station',       subcategory: null },
  { name: 'Exxon',              match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Mobil',              match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Chevron',            match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Marathon',           match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Sunoco',             match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'QuikTrip',           match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Wawa',               match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Sheetz',             match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Casey\'s',           match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Kwik Trip',          match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Circle K',           match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Speedway',           match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Murphy USA',         match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Murphy Express',     match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'RaceTrac',           match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Pilot',              match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Love\'s',            match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Flying J',           match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Valero',             match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Costco Gas',         match_type: 'prefix', category: 'Gas Station',       subcategory: null },
  { name: 'Sam\'s Club Gas',    match_type: 'prefix', category: 'Gas Station',       subcategory: null },

  // ── Retail ─────────────────────────────────────────────────────────────────
  { name: 'Target',             match_type: 'prefix', category: 'Retail',            subcategory: null },
  { name: 'Costco',             match_type: 'prefix', category: 'Retail',            subcategory: null },
  { name: 'Sam\'s Club',        match_type: 'prefix', category: 'Retail',            subcategory: null },
  { name: 'BJ\'s Wholesale',    match_type: 'prefix', category: 'Retail',            subcategory: null },
  { name: 'BJ\'s',              match_type: 'prefix', category: 'Retail',            subcategory: null },
  { name: 'Home Depot',         match_type: 'prefix', category: 'Retail',            subcategory: 'Home Improvement' },
  { name: 'Lowe\'s',            match_type: 'prefix', category: 'Retail',            subcategory: 'Home Improvement' },
  { name: 'Menards',            match_type: 'prefix', category: 'Retail',            subcategory: 'Home Improvement' },
  { name: 'Ace Hardware',       match_type: 'prefix', category: 'Retail',            subcategory: 'Home Improvement' },
  { name: 'True Value',         match_type: 'prefix', category: 'Retail',            subcategory: 'Home Improvement' },
  { name: 'Best Buy',           match_type: 'prefix', category: 'Retail',            subcategory: 'Electronics' },
  { name: 'Apple Store',        match_type: 'prefix', category: 'Retail',            subcategory: 'Electronics' },
  { name: 'GameStop',           match_type: 'prefix', category: 'Retail',            subcategory: 'Electronics' },
  { name: 'Nordstrom',          match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Macy\'s',            match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Macys',              match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'JCPenney',           match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Kohl\'s',            match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'TJ Maxx',            match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Marshalls',          match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Ross',               match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Burlington',         match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Old Navy',           match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Gap',                match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'H&M',                match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Zara',               match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Forever 21',         match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Express',            match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'American Eagle',     match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Hollister',          match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Abercrombie',        match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Victoria\'s Secret', match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Lane Bryant',        match_type: 'prefix', category: 'Retail',            subcategory: 'Clothing' },
  { name: 'Dick\'s Sporting',   match_type: 'prefix', category: 'Retail',            subcategory: 'Sporting Goods' },
  { name: 'Academy Sports',     match_type: 'prefix', category: 'Retail',            subcategory: 'Sporting Goods' },
  { name: 'REI',                match_type: 'exact',  category: 'Retail',            subcategory: 'Sporting Goods' },
  { name: 'Bass Pro',           match_type: 'prefix', category: 'Retail',            subcategory: 'Sporting Goods' },
  { name: 'Cabela\'s',          match_type: 'prefix', category: 'Retail',            subcategory: 'Sporting Goods' },
  { name: 'Bath & Body Works',  match_type: 'prefix', category: 'Retail',            subcategory: 'Health & Beauty' },
  { name: 'Ulta',               match_type: 'prefix', category: 'Retail',            subcategory: 'Health & Beauty' },
  { name: 'Sephora',            match_type: 'prefix', category: 'Retail',            subcategory: 'Health & Beauty' },
  { name: 'Sally Beauty',       match_type: 'prefix', category: 'Retail',            subcategory: 'Health & Beauty' },
  { name: 'Dollar Tree',        match_type: 'prefix', category: 'Retail',            subcategory: 'Dollar Store' },
  { name: 'Dollar General',     match_type: 'prefix', category: 'Retail',            subcategory: 'Dollar Store' },
  { name: 'Family Dollar',      match_type: 'prefix', category: 'Retail',            subcategory: 'Dollar Store' },
  { name: 'Five Below',         match_type: 'prefix', category: 'Retail',            subcategory: 'Dollar Store' },
  { name: 'IKEA',               match_type: 'prefix', category: 'Retail',            subcategory: 'Home Goods' },
  { name: 'Bed Bath',           match_type: 'prefix', category: 'Retail',            subcategory: 'Home Goods' },
  { name: 'Crate & Barrel',     match_type: 'prefix', category: 'Retail',            subcategory: 'Home Goods' },
  { name: 'West Elm',           match_type: 'prefix', category: 'Retail',            subcategory: 'Home Goods' },
  { name: 'HomeGoods',          match_type: 'prefix', category: 'Retail',            subcategory: 'Home Goods' },
  { name: 'At Home',            match_type: 'prefix', category: 'Retail',            subcategory: 'Home Goods' },
  { name: 'Tuesday Morning',    match_type: 'prefix', category: 'Retail',            subcategory: 'Home Goods' },
  { name: 'PetSmart',           match_type: 'prefix', category: 'Retail',            subcategory: 'Pet' },
  { name: 'Petco',              match_type: 'prefix', category: 'Retail',            subcategory: 'Pet' },
  { name: 'Pet Supplies Plus',  match_type: 'prefix', category: 'Retail',            subcategory: 'Pet' },
  { name: 'AutoZone',           match_type: 'prefix', category: 'Retail',            subcategory: 'Auto Parts' },
  { name: "O'Reilly Auto",      match_type: 'prefix', category: 'Retail',            subcategory: 'Auto Parts' },
  { name: 'Advance Auto',       match_type: 'prefix', category: 'Retail',            subcategory: 'Auto Parts' },
  { name: 'Napa Auto',          match_type: 'prefix', category: 'Retail',            subcategory: 'Auto Parts' },

  // ── Health & Fitness ───────────────────────────────────────────────────────
  { name: 'Planet Fitness',     match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'LA Fitness',         match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Anytime Fitness',    match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Gold\'s Gym',        match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Crunch',             match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'CrossFit',           match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Orange Theory',      match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Orangetheory',       match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'F45',                match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'YMCA',               match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Lifetime Fitness',   match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Life Time',          match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Equinox',            match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: '24 Hour Fitness',    match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Blink Fitness',      match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'EōS Fitness',        match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'EOS Fitness',        match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Snap Fitness',       match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'UFC Gym',            match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Pure Barre',         match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'SoulCycle',          match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'Barry\'s',           match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Gym' },
  { name: 'MinuteClinic',       match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Medical' },
  { name: 'Minute Clinic',      match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Medical' },
  { name: 'FastMed',            match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Medical' },
  { name: 'CareNow',            match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Medical' },
  { name: 'GoHealth',           match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Medical' },
  { name: 'AFC Urgent Care',    match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Medical' },
  { name: 'Concentra',          match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Medical' },
  { name: 'NextCare',           match_type: 'prefix', category: 'Health & Fitness',  subcategory: 'Medical' },

  // ── Entertainment ──────────────────────────────────────────────────────────
  { name: 'AMC',                match_type: 'prefix', category: 'Entertainment',     subcategory: 'Movie Theater' },
  { name: 'Regal',              match_type: 'prefix', category: 'Entertainment',     subcategory: 'Movie Theater' },
  { name: 'Cinemark',           match_type: 'prefix', category: 'Entertainment',     subcategory: 'Movie Theater' },
  { name: 'Dave & Buster\'s',   match_type: 'prefix', category: 'Entertainment',     subcategory: 'Arcade' },
  { name: 'Main Event',         match_type: 'prefix', category: 'Entertainment',     subcategory: 'Arcade' },
  { name: 'Round1',             match_type: 'prefix', category: 'Entertainment',     subcategory: 'Arcade' },
  { name: 'Topgolf',            match_type: 'prefix', category: 'Entertainment',     subcategory: 'Sports & Recreation' },
  { name: 'Bowlero',            match_type: 'prefix', category: 'Entertainment',     subcategory: 'Sports & Recreation' },
  { name: 'Brunswick Zone',     match_type: 'prefix', category: 'Entertainment',     subcategory: 'Sports & Recreation' },
  { name: 'Sky Zone',           match_type: 'prefix', category: 'Entertainment',     subcategory: 'Sports & Recreation' },
  { name: 'Altitude Trampoline',match_type: 'prefix', category: 'Entertainment',     subcategory: 'Sports & Recreation' },

  // ── Travel ─────────────────────────────────────────────────────────────────
  { name: 'Marriott',           match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Hilton',             match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Hyatt',              match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Hampton Inn',        match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Holiday Inn',        match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Courtyard',          match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Sheraton',           match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Westin',             match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Embassy Suites',     match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Best Western',       match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Comfort Inn',        match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Comfort Suites',     match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'La Quinta',          match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Motel 6',            match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },
  { name: 'Super 8',            match_type: 'prefix', category: 'Travel',            subcategory: 'Hotel' },

  // ── Services ───────────────────────────────────────────────────────────────
  { name: 'Chase',              match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Bank of America',    match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Wells Fargo',        match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Regions',            match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'SunTrust',           match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Truist',             match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'TD Bank',            match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'US Bank',            match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Fifth Third',        match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'PNC',                match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Citibank',           match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Capital One',        match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'KeyBank',            match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Huntington',         match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Citizens Bank',      match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Ally Bank',          match_type: 'prefix', category: 'Services',          subcategory: 'Bank' },
  { name: 'Great Clips',        match_type: 'prefix', category: 'Services',          subcategory: 'Salon' },
  { name: 'Sport Clips',        match_type: 'prefix', category: 'Services',          subcategory: 'Salon' },
  { name: 'Supercuts',          match_type: 'prefix', category: 'Services',          subcategory: 'Salon' },
  { name: 'Cost Cutters',       match_type: 'prefix', category: 'Services',          subcategory: 'Salon' },
  { name: 'Fantastic Sams',     match_type: 'prefix', category: 'Services',          subcategory: 'Salon' },
  { name: 'Hair Cuttery',       match_type: 'prefix', category: 'Services',          subcategory: 'Salon' },
  { name: 'Regis',              match_type: 'prefix', category: 'Services',          subcategory: 'Salon' },
  { name: 'Floyd\'s',           match_type: 'prefix', category: 'Services',          subcategory: 'Salon' },
  { name: 'Jiffy Lube',         match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Firestone',          match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Valvoline',          match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Midas',              match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Pep Boys',           match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Mavis',              match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Christian Brothers', match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'NTB',                match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Discount Tire',      match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: "America's Tire",     match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Goodyear',           match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Bridgestone',        match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Monro',              match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Tuffy',              match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Meineke',            match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Take 5 Oil',         match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'Grease Monkey',      match_type: 'prefix', category: 'Services',          subcategory: 'Auto Service' },
  { name: 'UPS Store',          match_type: 'prefix', category: 'Services',          subcategory: 'Shipping' },
  { name: 'FedEx',              match_type: 'prefix', category: 'Services',          subcategory: 'Shipping' },
  { name: 'The UPS Store',      match_type: 'prefix', category: 'Services',          subcategory: 'Shipping' },
  { name: 'United States Post', match_type: 'prefix', category: 'Services',          subcategory: 'Shipping' },
  { name: 'USPS',               match_type: 'prefix', category: 'Services',          subcategory: 'Shipping' },
];

// Pre-build lowercased index at module load time for fast matching
const _prefixMappings = CATEGORY_MAPPINGS
  .filter(m => m.match_type === 'prefix')
  .map(m => ({ ...m, nameLower: m.name.toLowerCase() }));

const _exactMappings = CATEGORY_MAPPINGS
  .filter(m => m.match_type === 'exact')
  .map(m => ({ ...m, nameLower: m.name.toLowerCase() }));

export function lookupCategory(placeName: string): { category: string; subcategory: string | null } | null {
  if (!placeName) return null;
  const lower = placeName.toLowerCase();

  // Exact matches take priority
  for (const m of _exactMappings) {
    if (lower === m.nameLower) {
      return { category: m.category, subcategory: m.subcategory };
    }
  }

  // Then prefix matches
  for (const m of _prefixMappings) {
    if (lower.startsWith(m.nameLower)) {
      return { category: m.category, subcategory: m.subcategory };
    }
  }

  return null;
}
// ── Name keyword heuristics ────────────────────────────────────────────────
// Applied when chain lookup returns nothing. Scans the place name for
// strongly indicative words to infer category. Order matters — more specific
// patterns are checked first.

type KeywordRule = {
  keywords: string[];       // any of these words in the name triggers the rule
  category: string;
  subcategory: string | null;
};

const NAME_KEYWORD_RULES: KeywordRule[] = [
  // Restaurants — food-type words that almost always mean a restaurant
  {
    keywords: [
      'restaurant', 'ristorante', 'trattoria', 'osteria',     // Italian
      'steakhouse', 'steak house',
      'pizzeria', 'pizza',
      'sushi', 'ramen', 'pho', 'noodle', 'dumpling',
      'taqueria', 'tacos', 'burrito',
      'bbq', 'barbeque', 'barbecue', 'smokehouse',
      'seafood', 'oyster bar', 'fish house',
      'chophouse', 'chop house',
      'brasserie', 'bistro',
      'grill', 'grille',
      'kitchen', 'eatery', 'cuisine', 'dining',
      'diner', 'deli', 'delicatessen',
      'buffet', 'cafeteria',
      'food hall', 'food court',
    ],
    category: 'Restaurants',
    subcategory: null,
  },

  // Fast Food — names that clearly signal counter service
  {
    keywords: ['burger', 'wings', 'chicken express', 'hot dog', 'drive-thru', 'drive thru'],
    category: 'Restaurants',
    subcategory: 'Fast Food',
  },

  // Cafe / Coffee
  {
    keywords: ['cafe', 'café', 'coffee', 'espresso', 'roastery', 'tea house', 'boba', 'bubble tea'],
    category: 'Restaurants',
    subcategory: 'Cafe',
  },

  // Bar — only if no restaurant keyword already matched
  {
    keywords: ['bar & grill', 'bar and grill', 'pub & grill', 'pub and grill', 'sports bar'],
    category: 'Restaurants',
    subcategory: 'Casual Dining',
  },
  {
    keywords: ['bar', 'pub', 'tavern', 'lounge', 'saloon', 'brewery', 'brewpub', 'taproom', 'wine bar', 'cocktail'],
    category: 'Bar',
    subcategory: null,
  },

  // Grocery
  {
    keywords: ['market', 'grocery', 'supermarket', 'food mart', 'farm stand', 'farmers market'],
    category: 'Grocery',
    subcategory: null,
  },

  // Pharmacy / Health
  {
    keywords: ['pharmacy', 'drug store', 'drugstore', 'apothecary'],
    category: 'Pharmacy',
    subcategory: null,
  },
  {
    keywords: ['urgent care', 'emergency room', 'er ', 'hospital', 'medical center', 'health center', 'clinic', 'doctor', 'dentist', 'orthodontist', 'optometrist', 'eye care', 'vision center', 'chiropractor', 'pediatric', 'ob-gyn', 'dermatology', 'dermatologist'],
    category: 'Health & Fitness',
    subcategory: 'Medical',
  },
  {
    keywords: ['gym', 'fitness', 'yoga', 'pilates', 'crossfit', 'martial arts', 'karate', 'boxing', 'cycling studio', 'spin class', 'barre'],
    category: 'Health & Fitness',
    subcategory: 'Gym',
  },

  // Gas / Auto
  {
    keywords: ['gas station', 'fuel', 'service station', 'filling station'],
    category: 'Gas Station',
    subcategory: null,
  },
  {
    keywords: ['auto repair', 'auto service', 'car wash', 'oil change', 'tire', 'transmission', 'body shop', 'muffler', 'brake'],
    category: 'Services',
    subcategory: 'Auto Service',
  },

  // Hotel / Travel
  {
    keywords: ['hotel', 'inn', 'suites', 'resort', 'lodge', 'motel', 'hostel', 'bed and breakfast', 'b&b', 'airbnb'],
    category: 'Travel',
    subcategory: 'Hotel',
  },
  {
    keywords: ['airport', 'terminal', 'concourse'],
    category: 'Travel',
    subcategory: 'Airport',
  },

  // Entertainment
  {
    keywords: ['cinema', 'theater', 'theatre', 'movie', 'imax', 'drive-in'],
    category: 'Entertainment',
    subcategory: 'Movie Theater',
  },
  {
    keywords: ['bowling', 'mini golf', 'escape room', 'trampoline', 'arcade', 'laser tag', 'go-kart', 'go kart', 'ice arena', 'skating rink', 'ice rink', 'roller rink', 'skate park', 'batting cage', 'golf course', 'country club', 'tennis', 'pickleball', 'soccer complex', 'sports complex', 'recreation center', 'rec center', 'aquatic center', 'swimming pool', 'natatorium'],
    category: 'Entertainment',
    subcategory: 'Sports & Recreation',
  },
  {
    keywords: ['museum', 'gallery', 'art center', 'aquarium', 'zoo', 'botanical garden'],
    category: 'Entertainment',
    subcategory: 'Attractions',
  },

  // Services
  {
    keywords: ['bank', 'credit union', 'financial', 'mortgage', 'atm'],
    category: 'Services',
    subcategory: 'Bank',
  },
  {
    keywords: ['salon', 'hair', 'barbershop', 'barber', 'nail ', 'spa ', 'massage'],
    category: 'Services',
    subcategory: 'Salon',
  },
  {
    keywords: ['school', 'academy', 'university', 'college', 'preschool', 'daycare', 'day care', 'learning center'],
    category: 'Education',
    subcategory: null,
  },
  {
    keywords: ['church', 'chapel', 'cathedral', 'synagogue', 'mosque', 'temple', 'worship'],
    category: 'Religious',
    subcategory: null,
  },
];

// Pre-build for fast lookup
const _keywordRules = NAME_KEYWORD_RULES.map(rule => ({
  ...rule,
  keywordsLower: rule.keywords.map(k => k.toLowerCase()),
}));

// Keywords that are short/common enough to cause false positives with simple includes().
// These are tested with word boundaries instead.
const WORD_BOUNDARY_KEYWORDS = new Set([
  'bar', 'pub', 'inn', 'spa', 'gym', 'zoo', 'deli', 'fuel',
  'bank', 'atm', 'hair', 'nail', 'er',
]);

export function applyNameHeuristics(placeName: string): { category: string; subcategory: string | null } | null {
  if (!placeName) return null;
  const lower = placeName.toLowerCase();

  for (const rule of _keywordRules) {
    for (const kw of rule.keywordsLower) {
      let matched = false;
      if (WORD_BOUNDARY_KEYWORDS.has(kw)) {
        // Word-boundary test: must be preceded and followed by non-word chars
        matched = new RegExp(`(?<![a-z])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`).test(lower);
      } else {
        matched = lower.includes(kw);
      }
      if (matched) {
        return { category: rule.category, subcategory: rule.subcategory };
      }
    }
  }

  return null;
}

// ── Google category normalization ─────────────────────────────────────────
// Google Places returns inconsistent and sometimes wrong top-level types.
// This maps known raw Google categories to our clean taxonomy before
// heuristics or chain lookup run.

const GOOGLE_CATEGORY_MAP: Record<string, { category: string; subcategory: string | null }> = {
  // Merge variants of the same thing
  'school':                  { category: 'Education',        subcategory: null },
  'primary school':          { category: 'Education',        subcategory: null },
  'secondary school':        { category: 'Education',        subcategory: null },
  'high school':             { category: 'Education',        subcategory: null },
  'university':              { category: 'Education',        subcategory: null },
  'college':                 { category: 'Education',        subcategory: null },
  'preschool':               { category: 'Education',        subcategory: null },
  'cafe':                    { category: 'Restaurants',      subcategory: 'Cafe' },
  'coffee shop':             { category: 'Restaurants',      subcategory: 'Cafe' },
  'bakery':                  { category: 'Restaurants',      subcategory: 'Cafe' },
  'meal takeaway':           { category: 'Restaurants',      subcategory: 'Fast Food' },
  'fast food restaurant':    { category: 'Restaurants',      subcategory: 'Fast Food' },
  'meal delivery':           { category: 'Restaurants',      subcategory: 'Fast Food' },
  'bar':                     { category: 'Bar',              subcategory: null },
  'night club':              { category: 'Bar',              subcategory: null },
  'liquor store':            { category: 'Retail',           subcategory: null },
  'supermarket':             { category: 'Grocery',          subcategory: null },
  'grocery or supermarket':  { category: 'Grocery',          subcategory: null },
  'convenience store':       { category: 'Retail',           subcategory: null },
  'gas station':             { category: 'Gas Station',      subcategory: null },
  'pharmacy':                { category: 'Pharmacy',         subcategory: null },
  'drugstore':               { category: 'Pharmacy',         subcategory: null },
  'hospital':                { category: 'Health & Fitness', subcategory: 'Medical' },
  'doctor':                  { category: 'Health & Fitness', subcategory: 'Medical' },
  'dentist':                 { category: 'Health & Fitness', subcategory: 'Medical' },
  'gym':                     { category: 'Health & Fitness', subcategory: 'Gym' },
  'movie theater':           { category: 'Entertainment',    subcategory: 'Movie Theater' },
  'museum':                  { category: 'Entertainment',    subcategory: 'Attractions' },
  'bank':                    { category: 'Services',         subcategory: 'Bank' },
  'atm':                     { category: 'Services',         subcategory: 'Bank' },
  'lodging':                 { category: 'Travel',           subcategory: 'Hotel' },
  'airport':                 { category: 'Travel',           subcategory: 'Airport' },
  'place of worship':        { category: 'Religious',        subcategory: null },
  'church':                  { category: 'Religious',        subcategory: null },
};

export function normalizeGoogleCategory(googleCategory: string | null): { category: string; subcategory: string | null } | null {
  if (!googleCategory) return null;
  const lower = googleCategory.toLowerCase().trim();
  return GOOGLE_CATEGORY_MAP[lower] || null;
}
