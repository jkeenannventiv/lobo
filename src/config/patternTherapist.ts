// patternTherapist.ts
// Chat orchestration for the "Pattern Therapist" feature.
//
// Architecture: the app holds all of the user's data locally in SQLite.
// Rather than sending raw visit history to an LLM, we give Claude a set of
// *tools* that map to the existing aggregate query functions in database.ts
// (top places, time-of-day patterns, segments, etc). When Claude wants data
// it asks for a tool call; we run that query locally against SQLite and send
// back only the aggregated result. Raw GPS coordinates never leave the
// device — only summarized patterns do, the same privacy tier as the
// existing segment engine.
//
// The Cloudflare Worker (lobo-chat-worker.js) is a thin proxy that holds the
// Anthropic API key server-side. It doesn't know about tools or the loop
// below — it just forwards whatever messages/tools payload the app sends.

import {
  getTopPlaces,
  getTopCategories,
  getVisitsByDayOfWeek,
  getVisitsByTimeOfDay,
  getMonthlyVisits,
  getMonthlyDistance,
  getTotalStats,
  getNightsAwayFromHome,
  getFunStats,
  getWeekInReview,
  computeSegments,
  searchPlaces,
  getVisitsForPlace,
  getCategoryVisits,
  getTopPlacesByDuration,
  getRecentActivity,
  getPlaceCoordinates,
} from './database';
import { getHomeLocation } from './storage';

// TODO: replace with your real Worker URL once deployed
// (same pattern as WORKER_URL in poi.ts)
const WORKER_URL = 'https://lobo-chat.jkeenan.workers.dev';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  // Simplified text for display. Tool-use turns are hidden from the UI.
  text: string;
};

// Full Anthropic-format message history (includes tool_use / tool_result
// blocks) — this is what actually gets sent to the API. Kept separate from
// the display-only ChatMessage list above.
type ApiMessage = { role: 'user' | 'assistant'; content: any };

const DAY_RANGES: Record<string, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
  all: 36500,
};

function daysFromRange(range?: string): number {
  return DAY_RANGES[range || 'quarter'] ?? 90;
}

// ── Distance-from-home enrichment ───────────────────────────────────────────
// Tool results only ever included place names/counts, never location — so
// Claude had nothing to compare against and couldn't tell a routine spot
// from a one-off visit on the other side of the world. This adds a
// milesFromHome figure (city-level precision, not exact coordinates) to
// place-level tool results so Claude can actually notice geographic outliers.

function haversineMiles(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

async function distanceFromHomeMiles(placeName: string): Promise<number | null> {
  const [home, place] = await Promise.all([getHomeLocation(), getPlaceCoordinates(placeName)]);
  if (!home || !place) return null;
  return Math.round(haversineMiles({ lat: home.lat, lon: home.lon }, place));
}

async function enrichWithDistance<T extends { name: string }>(items: T[]): Promise<(T & { milesFromHome: number | null })[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      milesFromHome: await distanceFromHomeMiles(item.name),
    }))
  );
}

// ── Tool definitions (Anthropic tool-use schema) ───────────────────────────

const RANGE_PARAM = {
  type: 'string',
  enum: ['week', 'month', 'quarter', 'year', 'all'],
  description: "Time window: 'week' (7d), 'month' (30d), 'quarter' (90d, default), 'year' (365d), or 'all' (entire history).",
};

export const PATTERN_THERAPIST_TOOLS = [
  {
    name: 'get_top_places',
    description: "The user's most-visited places, ranked by visit count, with category.",
    input_schema: { type: 'object', properties: { range: RANGE_PARAM }, required: [] },
  },
  {
    name: 'get_top_places_by_duration',
    description: 'Places ranked by total time spent there, not just visit count — useful for "where do I spend the most time" questions.',
    input_schema: { type: 'object', properties: { range: RANGE_PARAM }, required: [] },
  },
  {
    name: 'get_top_categories',
    description: "Breakdown of the user's visits by category (Restaurants, Grocery, Gym, etc.) with counts.",
    input_schema: { type: 'object', properties: { range: RANGE_PARAM }, required: [] },
  },
  {
    name: 'get_visits_by_day_of_week',
    description: 'Visit counts grouped by day of week — reveals weekly rhythm (e.g. busiest on Fridays).',
    input_schema: { type: 'object', properties: { range: RANGE_PARAM }, required: [] },
  },
  {
    name: 'get_visits_by_time_of_day',
    description: 'Visit counts grouped by time of day (morning/afternoon/evening/night).',
    input_schema: { type: 'object', properties: { range: RANGE_PARAM }, required: [] },
  },
  {
    name: 'get_monthly_trend',
    description: 'Visit count and driving distance by month — reveals longer-term trends (getting busier/quieter, driving more/less over time).',
    input_schema: { type: 'object', properties: { range: RANGE_PARAM }, required: [] },
  },
  {
    name: 'get_total_stats',
    description: 'Overall totals: total miles driven, total visits, total hours driving, longest trip, average trip length.',
    input_schema: { type: 'object', properties: { range: RANGE_PARAM }, required: [] },
  },
  {
    name: 'get_nights_away_from_home',
    description: "How many nights the user appears to have spent away from their detected home location — useful for travel-pattern questions.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_fun_stats',
    description: 'Headline stats: hours in car, days of data, unique places visited, most common visit day/time, average trips per week.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_week_in_review',
    description: "Summary of the user's most recent week: top place, unique places, trip count, and how it compares to their average week.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_behavioral_segments',
    description: "The user's own behavioral pattern segments (e.g. Homebody, Commuter, Gym Regular, Weekend Wanderer) with a level (High/Medium/Low) — the richest single source for 'what patterns do you see in me' questions.",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'search_places',
    description: "Search the user's visit history for places matching a name (partial match) — use this when the user mentions a specific place by name.",
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Place name or partial name to search for' } },
      required: ['query'],
    },
  },
  {
    name: 'get_place_visit_history',
    description: 'Full visit history (timestamps, durations) for one specific, exact place name — use after search_places to look at the detail for a place.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Exact place name, as returned by search_places' } },
      required: ['name'],
    },
  },
  {
    name: 'get_category_breakdown',
    description: 'All places visited within one specific category (e.g. "Restaurants", "Grocery"), each with visit count and last-visit date.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category name, e.g. Restaurants, Grocery, Gas Station, Health & Fitness, Travel, Retail' },
        range: RANGE_PARAM,
      },
      required: ['category'],
    },
  },
  {
    name: 'get_recent_activity',
    description: "The user's most recent raw activity log (places and trips in chronological order) — use for 'what did I do recently' or 'what was my last visit' questions.",
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'How many recent entries to return (default 20, max 50)' } },
      required: [],
    },
  },
] as const;

// ── Tool executor ───────────────────────────────────────────────────────────

export async function runPatternTherapistTool(name: string, input: any): Promise<any> {
  const days = daysFromRange(input?.range);
  switch (name) {
    case 'get_top_places':
      return await enrichWithDistance(await getTopPlaces(days));
    case 'get_top_places_by_duration':
      return await enrichWithDistance(await getTopPlacesByDuration(days));
    case 'get_top_categories':
      return await getTopCategories(days);
    case 'get_visits_by_day_of_week':
      return await getVisitsByDayOfWeek(days);
    case 'get_visits_by_time_of_day':
      return await getVisitsByTimeOfDay(days);
    case 'get_monthly_trend': {
      const [visits, distance] = await Promise.all([getMonthlyVisits(days), getMonthlyDistance(days)]);
      return { visitsByMonth: visits, distanceByMonth: distance };
    }
    case 'get_total_stats':
      return await getTotalStats(days);
    case 'get_nights_away_from_home': {
      const home = await getHomeLocation();
      return await getNightsAwayFromHome(home?.lat, home?.lon);
    }
    case 'get_fun_stats':
      return await getFunStats();
    case 'get_week_in_review':
      return await getWeekInReview();
    case 'get_behavioral_segments': {
      const home = await getHomeLocation();
      const coords = home ? { lat: home.lat, lon: home.lon } : null;
      return await computeSegments(coords);
    }
    case 'search_places':
      return await enrichWithDistance(await searchPlaces(input?.query || ''));
    case 'get_place_visit_history': {
      const [visits, milesFromHome] = await Promise.all([
        getVisitsForPlace(input?.name || ''),
        distanceFromHomeMiles(input?.name || ''),
      ]);
      return { milesFromHome, visits };
    }
    case 'get_category_breakdown':
      return await enrichWithDistance(await getCategoryVisits(input?.category || '', days));
    case 'get_recent_activity': {
      const activity = await getRecentActivity(Math.min(input?.limit || 20, 50));
      return await enrichWithDistance(activity.map((a) => ({ ...a, name: a.name || '' })));
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── System prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(homeLabel: string | null): string {
  const homeContext = homeLabel
    ? `The user's home area is approximately: ${homeLabel}. You know this only at a city/area level, not an exact address.`
    : `The user hasn't set a home location in the app, so you don't know their home area — don't assume one.`;

  return `You are the "Pattern Therapist" inside Lobo, an app that turns a user's Google Timeline location history into personal insights.

Your job: have a warm, curious, conversational chat with the user about their own behavioral patterns — where they go, when, how often, and what that might say about their routines and lifestyle. Think "insightful friend looking at your data with you," not a clinical or medical professional.

${homeContext}

Rules:
- You have tools that query the user's real local data. Use them — don't guess or make up numbers. If you don't have a tool for something, say so honestly rather than fabricating a stat.
- Ground every specific claim (counts, places, trends) in a tool result you actually called this turn or earlier in the conversation.
- Keep responses conversational and concise — a few sentences, not a report. This is a chat, not a dashboard.
- Pay attention to things that don't fit the pattern. Place-related tool results include a "milesFromHome" figure — when it's large (say, over ~200 miles, and especially if it implies a different state or country), that place is very likely a one-off trip, not a routine spot. Say so explicitly rather than presenting it as an ordinary favorite. Don't rely on guessing a place's location from its name — use the milesFromHome value.
- You are not a therapist, doctor, or counselor, and this app does not diagnose anything. Stick to observations about places and routines (e.g. "you're a creature of habit on weekday mornings"), never mental health, medical, or psychological diagnoses or labels.
- If the data is sparse (new user, short history), say so plainly rather than overinterpreting a handful of data points.
- It's fine to ask the user a clarifying or follow-up question occasionally, the way a good conversation does — but don't interrogate them turn after turn.`;
}

// ── Chat orchestration ──────────────────────────────────────────────────────

async function callWorker(system: string, messages: ApiMessage[]): Promise<any> {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system,
      messages,
      tools: PATTERN_THERAPIST_TOOLS,
    }),
  });
  if (!response.ok) {
    throw new Error(`Chat request failed (${response.status})`);
  }
  return await response.json();
}

function extractDisplayText(content: any[]): string {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

// Runs one user turn to completion, including any tool-use round trips.
// apiHistory is mutated in place (mirrors how the caller should persist it).
// onStatus lets the UI show "checking your visit history..." while tools run.
export async function sendPatternTherapistMessage(
  apiHistory: ApiMessage[],
  userText: string,
  onStatus?: (status: string) => void
): Promise<{ replyText: string; apiHistory: ApiMessage[] }> {
  const history = [...apiHistory, { role: 'user' as const, content: userText }];
  const home = await getHomeLocation();
  const systemPrompt = buildSystemPrompt(home?.label || null);

  // Tool loop — keep going as long as Claude asks for tool calls, capped to
  // avoid a runaway loop burning API calls if something goes wrong.
  for (let round = 0; round < 6; round++) {
    onStatus?.(round === 0 ? 'Thinking...' : 'Checking your visit history...');
    const data = await callWorker(systemPrompt, history);

    if (data.error) {
      throw new Error(data.error.message || 'Chat request failed');
    }

    const content = data.content || [];
    history.push({ role: 'assistant', content });

    const toolUses = content.filter((block: any) => block.type === 'tool_use');
    if (toolUses.length === 0) {
      return { replyText: extractDisplayText(content), apiHistory: history };
    }

    const toolResults = await Promise.all(
      toolUses.map(async (block: any) => {
        const result = await runPatternTherapistTool(block.name, block.input);
        return {
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        };
      })
    );
    history.push({ role: 'user', content: toolResults });
  }

  throw new Error('Chat got stuck checking your data — please try rephrasing your question.');
}
