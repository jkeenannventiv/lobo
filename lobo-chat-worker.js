// Lobo Chat Worker — Pattern Therapist backend
//
// Same pattern as your lobo-poi and nventiv-chat workers: this Worker holds
// the ANTHROPIC_API_KEY as a secret and proxies requests from the app to
// the Anthropic API. The app builds the full messages/tools payload
// (including the tool-use loop for querying the local database) and this
// Worker just adds authentication and forwards it. The API key never ships
// inside the app.
//
// Setup (same steps you used for nventiv-chat):
//   1. Cloudflare dashboard → Workers & Pages → Create → Start with "Hello World"
//   2. Name it lobo-chat (or similar) → Deploy
//   3. Edit code → paste this file in → Save and Deploy
//   4. Settings → Variables and Secrets → Add Secret
//        Name: ANTHROPIC_API_KEY
//        Value: your sk-ant-... key
//   5. Note the Worker URL (e.g. lobo-chat.jkeenan.workers.dev) and put it
//      into src/config/patternTherapist.ts as WORKER_URL

const ALLOWED_MODELS = new Set([
  'claude-sonnet-5',
  'claude-haiku-4-5-20251001',
]);

export default {
  async fetch(request, env) {
    // CORS preflight (harmless to include even though React Native fetch
    // doesn't enforce CORS — keeps this testable from a browser too)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { model, system, messages, tools, max_tokens } = body;

    if (!messages || !Array.isArray(messages)) {
      return jsonResponse({ error: 'messages array is required' }, 400);
    }

    // Pin to an allowed model regardless of what the client sends — keeps
    // cost/behavior predictable even if the app is compromised or buggy.
    const safeModel = ALLOWED_MODELS.has(model) ? model : 'claude-sonnet-5';

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: safeModel,
        max_tokens: Math.min(max_tokens || 1024, 2048),
        system,
        messages,
        tools,
      }),
    });

    const data = await anthropicRes.json();
    return jsonResponse(data, anthropicRes.status);
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
