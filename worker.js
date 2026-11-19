function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// ULTIMATE CLOUDFLARE AI AGENT (V8.0 PRO - OPENCODE & CHERRY STUDIO EDITION)
// Features: Web Onboarding & Auto-Webhook | Multi-Provider Engine (Custom Provider, Groq, OpenRouter, Gemini)
// Smart Base URL Normalization & Auto-Probe | Free Model Classifier & Live Latency Tester
// ============================================================================

const CONFIG = {
  BOT_TOKEN: "YOUR_TELEGRAM_BOT_TOKEN",
  DEFAULT_BASE_URL: "https://generativelanguage.googleapis.com/v1beta/openai",
  FALLBACK_MODELS: [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemma-3-27b-it",
    "gemini-2.0-flash"
  ],
  DEFAULT_CHAT_SOUL: `تو یک دستیار هوش مصنوعی ساده، صمیمی و دقیق هستی. به سوالات عادی و روزمره کاربر به زبان فارسی روان، کوتاه، مستقیم و بدون حاشیه پاسخ بده.`,
  DEFAULT_WORK_SOUL: `تو یک کارمند ارشد، برنامه‌نویس حرفه‌ای و تحلیلگر دقیق هستی. با نهایت جدیت، نظم و دقت فنی به امور کاری، کدنویسی، تحلیل بازار، بررسی فایل‌ها و پروژه‌ها رسیدگی کن و خروجی کامل و بدون نقص تحویل بده.`,
  DEFAULT_CUSTOM_SOUL: `تو یک هم‌صحبت گرم، مهربان و صمیمی هستی که به فارسی محاوره‌ای و کوتاه گفتگو می‌کنی. (می‌توانید جزئیات کامل این شخصیت را در پنل مینی‌اپ وارد کنید).`,
  DEFAULT_GUEST_SOUL: `تو یک دستیار هوش مصنوعی بسیار مودب، رسمی، حرفه‌ای و مفید هستی. پاسخ‌هایت دقیق، محترمانه و کاربردی است.`
};

const ACTIVE_USER_LOCKS = new Map();
const PROCESSED_UPDATES = new Set();
const GLOBAL_MEMORY_STORE = new Map();
const RATE_LIMITED_MODELS = new Map(); // modelId -> cooldownUntilTimestampMs

function markModelRateLimited(modelId, durationMs = 60000) {
  if (!modelId) return;
  RATE_LIMITED_MODELS.set(modelId, Date.now() + durationMs);
}

function isModelRateLimited(modelId) {
  if (!modelId) return false;
  const exp = RATE_LIMITED_MODELS.get(modelId);
  if (!exp) return false;
  if (Date.now() > exp) {
    RATE_LIMITED_MODELS.delete(modelId);
    return false;
  }
  return true;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = url.origin;
    let sys = await getSystemState(env);
    const botToken = env.BOT_TOKEN || sys.botToken || (CONFIG.BOT_TOKEN !== "YOUR_TELEGRAM_BOT_TOKEN" ? CONFIG.BOT_TOKEN : null);

    // API Setup: اتصال اولیه ربات تلگرام از طریق وب بدون نیاز به کد
    if (url.pathname === "/api/setup" && request.method === "POST") {
      return handleSetupAPI(request, env, origin);
    }

    // API Admin: پنل مدیریت، ارائه‌دهنده‌ها، تست مدل‌ها، مینی‌اپ
    if (url.pathname.startsWith("/api/admin")) {
      return handleAdminAPI(request, env, botToken, origin);
    }

    // صفحات وب (Setup یا Dashboard)
    if (request.method === "GET") {
      if (url.pathname === "/setup" || !botToken) {
        return new Response(renderSetupHTML(sys, botToken, origin, Boolean(env.BOT_KV)), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
      if (url.pathname === "/app" || url.pathname === "/") {
        return new Response(renderMiniAppHTML(sys, botToken, origin), {
          headers: { "Content-Type": "text/html; charset=utf-8" }
        });
      }
    }

    // وب‌هوک پیام‌های تلگرام
    if (request.method === "POST") {
      if (!botToken) {
        return new Response("Bot Token Not Configured. Please visit /setup in your browser.", { status: 400 });
      }
      try {
        const update = await request.json();
        ctx.waitUntil(processTelegramUpdate(update, env, ctx, botToken, origin));
        return new Response("OK", { status: 200 });
      } catch (e) {
        return new Response("Error", { status: 200 });
      }
    }

    return new Response("Agent V8.0 PRO is Online & Ready.", { status: 200 });
  },

  async scheduled(event, env, ctx) {
    let sys = await getSystemState(env);
    const botToken = env.BOT_TOKEN || sys.botToken || (CONFIG.BOT_TOKEN !== "YOUR_TELEGRAM_BOT_TOKEN" ? CONFIG.BOT_TOKEN : null);
    if (botToken) {
      ctx.waitUntil(runCronTasks(env, botToken));
    }
  }
};

// ============================================================================
// موتور تشخیص فوق هوشمند Base URL و اعتبارسنجی خودکار (بدون ارور و تغییر دستی)
// ============================================================================
function smartNormalizeBaseUrl(rawUrl) {
  if (!rawUrl) return "";
  let url = rawUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  url = url.replace(/\/+$/, "");
  url = url.replace(/\?.*$/, "");
  url = url.replace(/\/(chat\/completions|completions|models)$/i, "");
  url = url.replace(/\/+$/, "");

  const lower = url.toLowerCase();
  if (lower.includes("generativelanguage.googleapis.com") && !lower.includes("openai")) {
    return "https://generativelanguage.googleapis.com/v1beta/openai";
  }
  if (lower.includes("api.groq.com") && !lower.includes("/openai")) {
    return "https://api.groq.com/openai/v1";
  }
  if (lower.includes("openrouter.ai") && !lower.includes("/api")) {
    return "https://openrouter.ai/api/v1";
  }
  if (lower.includes("api.deepseek.com") && !lower.includes("/v1")) {
    return "https://api.deepseek.com/v1";
  }
  if (lower.includes("tokenharbor.ai") && !lower.includes("/v1")) {
    return "https://tokenharbor.ai/v1";
  }
  if (lower.includes("api.openai.com") && !lower.includes("/v1")) {
    return "https://api.openai.com/v1";
  }
  if (lower.includes("api.together.xyz") && !lower.includes("/v1")) {
    return "https://api.together.xyz/v1";
  }
  if (lower.includes("api.mistral.ai") && !lower.includes("/v1")) {
    return "https://api.mistral.ai/v1";
  }

  return url;
}

async function autoDetectAndTestBaseUrl(rawUrl, apiKey) {
  const normalized = smartNormalizeBaseUrl(rawUrl);
  const candidates = [normalized];

  if (!normalized.endsWith("/v1") && !normalized.includes("/openai") && !normalized.includes("/v1beta/openai")) {
    candidates.push(`${normalized}/v1`);
    candidates.push(`${normalized}/openai/v1`);
  }

  let lastStatus = null;
  let lastError = "";

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "EdgePulseAgent/8.0 (OpenAI-Probe)"
  };
  if (apiKey && apiKey.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  // Phase 1: Test GET /models
  for (const cand of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`${cand}/models`, {
        method: "GET",
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      lastStatus = res.status;
      if (res.status === 200 || res.status === 401 || res.status === 403) {
        return { success: true, workingUrl: cand, status: res.status, endpoint: "models" };
      }
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e.message;
    }
  }

  // Phase 2: Probe POST /chat/completions (for minimal proxies without /models endpoint)
  for (const cand of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${cand}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: "test-probe", messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Any response code other than 404 or 502 means the completions endpoint exists!
      if (res.status === 200 || res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) {
        return { success: true, workingUrl: cand, status: res.status, endpoint: "chat/completions" };
      }
      lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = e.message;
    }
  }

  return { success: false, workingUrl: normalized, error: lastError || "پاسخی از سرور دریافت نشد" };
}

// ============================================================================
// تفکیک هوشمند مدل‌های رایگان از استاندارد (Free Model Classifier)
// ============================================================================
function classifyModel(modelId, baseUrl = "", rawItem = null) {
  const mLower = modelId.toLowerCase();
  const bLower = (baseUrl || "").toLowerCase();

  // 1. بررسی سهمیه رایگان در پاسخ OpenRouter
  if (rawItem && rawItem.pricing) {
    const pPrompt = parseFloat(rawItem.pricing.prompt || 0);
    const pComp = parseFloat(rawItem.pricing.completion || 0);
    if (pPrompt === 0 && pComp === 0) {
      return { isFree: true, tag: "رایگان (OpenRouter Free Tier)" };
    }
  }

  // 2. تگ :free در انتهای مدل
  if (mLower.includes(":free") || mLower.includes("-free") || mLower.includes("/free")) {
    return { isFree: true, tag: "رایگان (Free Tier)" };
  }

  // 3. مدل‌های رایگان Google AI Studio
  if (bLower.includes("generativelanguage.googleapis.com") || mLower.includes("gemini")) {
    const freeGemini = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemma"];
    if (freeGemini.some(fg => mLower.includes(fg)) && !mLower.includes("pro")) {
      return { isFree: true, tag: "رایگان (Google AI Studio)" };
    }
  }

  // 4. سهمیه رایگان پرسرعت Groq
  if (bLower.includes("groq.com")) {
    return { isFree: true, tag: "رایگان با سهمیه بالا (Groq)" };
  }

  // 5. مدل‌های TokenHarbor / Github Models
  if (bLower.includes("tokenharbor") || bLower.includes("github")) {
    if (mLower.includes("free") || mLower.includes("flash") || mLower.includes("mini")) {
      return { isFree: true, tag: "سهمیه رایگان" };
    }
  }

  return { isFree: false, tag: "استاندارد" };
}

// تست زنده سلامت و سرعت پاسخ‌دهی هر مدل (Latency & Health Ping)
async function testModelLatencyAndHealth(baseUrl, apiKey, modelId) {
  const normBase = smartNormalizeBaseUrl(baseUrl);
  const start = Date.now();
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "EdgePulseAgent/8.0 (HealthCheck)",
    "HTTP-Referer": "https://github.com/edgepulse/agent",
    "X-Title": "EdgePulse Agent"
  };
  if (apiKey && apiKey.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  const isReasoning = /^(o1|o3|deepseek-r1|deepseek-reasoner)/i.test(modelId);
  const payload = {
    model: modelId,
    messages: [{ role: "user", content: "سلام" }]
  };
  if (isReasoning) {
    payload.max_completion_tokens = 5;
  } else {
    payload.max_tokens = 5;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000);
    let res = await fetch(`${normBase}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    let latency = Date.now() - start;

    // Auto-heal on 400: try switching parameter types if rejected by proxy
    if (res.status === 400) {
      const errTxt = await res.text().catch(() => "");
      if (errTxt.includes("max_tokens") || errTxt.includes("max_completion_tokens") || errTxt.includes("temperature")) {
        delete payload.max_tokens;
        delete payload.max_completion_tokens;
        delete payload.temperature;
        const retryController = new AbortController();
        const retryTimer = setTimeout(() => retryController.abort(), 12000);
        res = await fetch(`${normBase}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: retryController.signal
        });
        clearTimeout(retryTimer);
        latency = Date.now() - start;
      }
    }

    if (res.ok) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "OK";
      return { ok: true, latencyMs: latency, reply: cleanModelOutput(reply) };
    } else {
      const errBody = await res.text().catch(() => "");
      const is429 = res.status === 429;
      if (is429) {
        markModelRateLimited(modelId, 60000);
      }
      return {
        ok: false,
        latencyMs: latency,
        status: res.status,
        isRateLimit: is429,
        error: is429 ? "محدودیت نرخ (429 Rate Limit): سهمیه موقتاً پر است" : `کد ${res.status}: ${errBody.slice(0, 160)}`
      };
    }
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: e.message };
  }
}


// ============================================================================
// لایه ذخیره‌سازی دوگانه (Cloudflare KV و Upstash Redis)
// ============================================================================
async function storageGet(env, key) {
  if (env.UPSTASH_URL && env.UPSTASH_TOKEN) {
    try {
      const res = await fetch(env.UPSTASH_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(["GET", key])
      });
      const data = await res.json();
      return data.result !== undefined && data.result !== null ? String(data.result) : null;
    } catch (e) {}
  }
  if (env.BOT_KV) {
    const val = await env.BOT_KV.get(key);
    if (val !== null && val !== undefined) return val;
  }
  return GLOBAL_MEMORY_STORE.get(key) || null;
}

async function storagePut(env, key, value, options = {}) {
  const strVal = typeof value === "string" ? value : JSON.stringify(value);
  GLOBAL_MEMORY_STORE.set(key, strVal);
  if (env.UPSTASH_URL && env.UPSTASH_TOKEN) {
    try {
      const cmd = options.expirationTtl ? ["SET", key, strVal, "EX", options.expirationTtl] : ["SET", key, strVal];
      await fetch(env.UPSTASH_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(cmd)
      });
      return;
    } catch (e) {}
  }
  if (env.BOT_KV) {
    await env.BOT_KV.put(key, strVal, options);
  }
}

async function storageDelete(env, key) {
  GLOBAL_MEMORY_STORE.delete(key);
  if (env.UPSTASH_URL && env.UPSTASH_TOKEN) {
    try {
      await fetch(env.UPSTASH_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.UPSTASH_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(["DEL", key])
      });
      return;
    } catch (e) {}
  }
  if (env.BOT_KV) {
    await env.BOT_KV.delete(key);
  }
}

function cleanModelOutput(text) {
  if (!text) return "";
  let cleaned = String(text);

  // 1. حذف بلوک‌های کامل تفکر <think>...</think> و <thought>...</thought>
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, "");

  // 2. اگر تگ بسته تفکر تنها مانده باشد
  cleaned = cleaned.replace(/[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/[\s\S]*?<\/thought>/gi, "");

  // 3. اگر تگ تفکر باز شده اما هرگز بسته نشده (مدل وسط استدلال بریده شده و جوابی تولید نکرده)
  // در این حالت متن خالی می‌شود تا سیستم پاسخ ناقص را ارسال نکرده و به مدل سالم بعدی سوئیچ کند
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*/gi, "");

  return cleaned.trim();
}

async function syncMenuButtons(botToken, adminChatId, workerOrigin) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu_button: { type: "default" } })
    });
    if (adminChatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: adminChatId,
          menu_button: {
            type: "web_app",
            text: "Panel",
            web_app: { url: `${workerOrigin}/app` }
          }
        })
      });
    }
  } catch (e) {}
}

async function verifyAdminWebApp(initData, botToken, adminId) {
  if (!initData || !adminId) return false;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;
    params.delete("hash");

    // Replay attack protection (auth_date must be within 24 hours)
    const authDate = parseInt(params.get("auth_date") || "0");
    if (authDate > 0 && Math.abs((Date.now() / 1000) - authDate) > 86400) {
      return false;
    }

    const entries = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    const encoder = new TextEncoder();
    const webAppKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKeyBytes = await crypto.subtle.sign("HMAC", webAppKey, encoder.encode(botToken));
    const secretKey = await crypto.subtle.importKey(
      "raw",
      secretKeyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(dataCheckString));
    const calculatedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    if (calculatedHash !== hash) return false;

    const userRaw = params.get("user");
    if (!userRaw) return false;
    const user = JSON.parse(userRaw);
    return String(user.id) === String(adminId);
  } catch (e) {
    return false;
  }
}

async function checkSponsorJoin(botToken, sys, userId) {
  const channels = sys.sponsorChannels || [];
  if (channels.length === 0) return { ok: true, unjoined: [] };
  const unjoined = [];
  for (const ch of channels) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: ch, user_id: userId })
      });
      const data = await res.json();
      // If channel is inaccessible or bot is not admin, do not falsely lock innocent users!
      if (!data.ok) {
        continue;
      }
      const status = data.result?.status;
      if (["left", "kicked"].includes(status)) {
        unjoined.push(ch);
      }
    } catch (e) {}
  }
  return { ok: unjoined.length === 0, unjoined };
}


// ============================================================================
// استخراج خودکار مدل‌ها، دسته‌بندی رایگان و نرمال‌سازی
// ============================================================================
async function fetchLiveModelsFromProvider(env, sys, forceRefresh = false, customUserConfig = null) {
  const rawBaseUrl = customUserConfig?.baseUrl || sys.baseUrl || CONFIG.DEFAULT_BASE_URL;
  const baseUrl = smartNormalizeBaseUrl(rawBaseUrl);
  const activeKey = customUserConfig?.apiKey ? { key: customUserConfig.apiKey } : getOrderedKeys(sys)[0];

  if (!customUserConfig && !forceRefresh && sys.cachedModels && sys.cachedModels.length > 0 && sys.cachedBaseUrl === baseUrl) {
    const hasDirtyBlacklist = sys.cachedModels.some(m =>
      /^(absolutereality|albedobase|amponyt|anything-v|bge-|sdxl|diffusion|cyberrealistic)/i.test(m)
    );
    if (!hasDirtyBlacklist) {
      return {
        models: sys.cachedModels,
        freeModels: sys.cachedFreeModels || [],
        error: null
      };
    }
    // اگر کش حاوی مدل‌های سیاه بود، کش را نامعتبر کن تا دوباره با فیلتر استخراج شوند
    sys.cachedModels = [];
    sys.cachedFreeModels = [];
  }

  if (!activeKey) {
    return { models: [], freeModels: [], error: "هنوز هیچ کلید API فعالی ثبت نشده است." };
  }

  const isGoogle = baseUrl.includes("generativelanguage.googleapis.com");
  let lastFetchError = "";
  let rawList = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${activeKey.key}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      rawList = Array.isArray(data.data) ? data.data : (Array.isArray(data.models) ? data.models : (Array.isArray(data) ? data : []));
    } else {
      const errBody = await res.text().catch(() => "");
      lastFetchError = `کد ${res.status}: ${errBody.slice(0, 120)}`;
    }
  } catch (e) {
    lastFetchError = e.message;
  }

  if (rawList.length === 0 && isGoogle) {
    try {
      const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(activeKey.key)}`;
      const res = await fetch(nativeUrl);
      if (res.ok) {
        const data = await res.json();
        rawList = Array.isArray(data.models) ? data.models : [];
      } else {
        const errBody = await res.text().catch(() => "");
        lastFetchError = `Google Native کد ${res.status}: ${errBody.slice(0, 140)}`;
      }
    } catch (e) {
      lastFetchError = e.message;
    }
  }

  if (rawList.length > 0) {
    const modelObjs = normalizeModelList(rawList, isGoogle, baseUrl);
    const modelIds = modelObjs.map(m => m.id);
    const freeIds = modelObjs.filter(m => m.isFree).map(m => m.id);

    if (modelIds.length > 0) {
      if (!customUserConfig) {
        sys.cachedModels = modelIds;
        sys.cachedFreeModels = freeIds;
        sys.cachedBaseUrl = baseUrl;
        await storagePut(env, "SYS_STATE", sys);
      }
      return { models: modelIds, freeModels: freeIds, classified: modelObjs, error: null };
    }
  }

  return {
    models: (!customUserConfig && sys.cachedModels && sys.cachedModels.length > 0) ? sys.cachedModels : [],
    freeModels: (!customUserConfig && sys.cachedFreeModels && sys.cachedFreeModels.length > 0) ? sys.cachedFreeModels : [],
    error: lastFetchError || "سرور لیست مدل‌ها را برنگرداند."
  };
}

function getModelScore(id) {
  const m = id.toLowerCase();
  let score = 0;
  // Free tier bonus
  if (m.includes(":free") || m.includes("-free") || m.includes("/free")) score += 25;

  // Top modern chat LLM families
  if (m.includes("deepseek-r1") || m.includes("deepseek-reasoner")) score += 100;
  else if (m.includes("deepseek-chat") || m.includes("deepseek-v3") || m.includes("deepseek")) score += 95;
  else if (m.includes("gemini-2.5") || m.includes("gemini-2.0") || m.includes("gemini-exp")) score += 92;
  else if (m.includes("gemini-1.5-flash") || m.includes("gemini-1.5-pro")) score += 88;
  else if (m.includes("llama-3.3") || m.includes("llama-3.2") || m.includes("llama-3.1")) score += 85;
  else if (m.includes("qwen-2.5") || m.includes("qwq")) score += 82;
  else if (m.includes("claude-3-7") || m.includes("claude-3-5") || m.includes("claude-3")) score += 80;
  else if (m.includes("gpt-4o") || m.includes("o1") || m.includes("o3")) score += 78;
  else if (m.includes("mistral") || m.includes("codestral") || m.includes("mixtral")) score += 75;
  else if (m.includes("gemma-2") || m.includes("phi-4") || m.includes("phi-3")) score += 70;
  else if (m.includes("llama")) score += 65;
  else score += 10;

  return score;
}

function normalizeModelList(rawList, isGoogle, baseUrl = "") {
  const blacklist = [
    // Embeddings
    "embed", "bge-", "bge:", "bge/", "rerank", "sentence-transformers", "text-embedding", "cohere-embed",
    // Image generation & vision checkpoint models
    "sdxl", "diffusion", "stable-diffusion", "dall-e", "flux", "imagen", "veo", "midjourney",
    "albedobase", "anything-v", "absolutereality", "amponyt", "cyberrealistic", "pony",
    "realvis", "dreamshaper", "deliberate", "rev-animated", "epicrealism", "juggernaut",
    "playground-v", "sd-", "svd", "animagine", "image-2.", "image-2-", "image-3.", "image-generation",
    // Audio, Speech & TTS
    "tts", "whisper", "voice", "speech", "audio", "music", "aura-", "aura:", "beam:",
    // Evaluation, Moderation & Internal
    "moderation", "guard", "reward", "aqa", "bisociate", "learnlm", "classifier"
  ];
  const list = [];
  const seen = new Set();

  for (const item of rawList) {
    let rawId = typeof item === "string" ? item : (item.id || item.name || "");
    if (!rawId) continue;
    if (isGoogle && Array.isArray(item.supportedGenerationMethods) && !item.supportedGenerationMethods.includes("generateContent")) {
      continue;
    }
    const cleanId = rawId.replace(/^models\//, "").trim();
    if (!cleanId || seen.has(cleanId)) continue;

    // Check OpenRouter / aggregator modality if present (reject non-text models)
    if (item && typeof item === "object" && item.architecture && typeof item.architecture.modality === "string") {
      const modality = item.architecture.modality.toLowerCase();
      if (modality.includes("image") && !modality.endsWith("->text")) continue;
      if (modality.includes("embedding")) continue;
    }

    const lowerId = cleanId.toLowerCase();
    if (blacklist.some(bad => lowerId.includes(bad))) continue;

    seen.add(cleanId);
    const info = classifyModel(cleanId, baseUrl, typeof item === "object" ? item : null);
    list.push({
      id: cleanId,
      name: (item && item.name) || cleanId,
      isFree: info.isFree,
      tag: info.tag
    });
  }

  // Sort models: highest quality chat models and free models first
  list.sort((a, b) => getModelScore(b.id) - getModelScore(a.id));

  return list;
}

function getModelFamily(modelId) {
  const m = (modelId || "").toLowerCase();
  if (m.includes("deepseek")) return "deepseek";
  if (m.includes("llama")) return "llama";
  if (m.includes("gemini")) return "gemini";
  if (m.includes("qwen") || m.includes("qwq")) return "qwen";
  if (m.includes("mistral") || m.includes("codestral") || m.includes("mixtral")) return "mistral";
  if (m.includes("claude")) return "claude";
  if (m.includes("gpt") || m.includes("o1") || m.includes("o3") || m.includes("chatgpt")) return "openai";
  if (m.includes("gemma")) return "gemma";
  if (m.includes("glm") || m.includes("chatglm")) return "glm";
  if (m.includes("phi")) return "phi";
  return "other";
}

function buildDiverseModelQueue(preferredModel, liveModels, freeModels = []) {
  const isAutoFree = preferredModel === "auto_free";
  const isAutoAll = preferredModel === "auto" || !preferredModel;
  const isExplicit = !isAutoFree && !isAutoAll;

  // انتخاب مخزن مدل‌ها بر اساس حالت انتخابی
  let basePool = [];
  if (isAutoFree) {
    basePool = (Array.isArray(freeModels) && freeModels.length > 0)
      ? [...freeModels]
      : (liveModels || []).filter(m => m.includes(":free") || m.includes("-free") || m.includes("/free"));
    if (basePool.length === 0) basePool = [...(liveModels || [])];
  } else if (isExplicit) {
    basePool = [preferredModel];
    const candidateFallbacks = (Array.isArray(freeModels) && freeModels.length > 0) ? freeModels : (liveModels || []);
    for (const m of candidateFallbacks) {
      if (!basePool.includes(m)) basePool.push(m);
    }
    for (const m of (liveModels || [])) {
      if (!basePool.includes(m)) basePool.push(m);
    }
  } else {
    basePool = [...(liveModels || [])];
  }

  // حذف موارد تکراری با حفظ تقدم اولیه
  const pool = Array.from(new Set(basePool));

  // جداسازی مدل‌های در حال استراحت (429 Rate Limited Cooldown) از مدل‌های آماده
  const healthy = [];
  const coolingDown = [];
  for (const m of pool) {
    if (isModelRateLimited(m)) {
      coolingDown.push(m);
    } else {
      healthy.push(m);
    }
  }

  // دسته‌بندی مدل‌های سالم بر اساس خانواده ارائه‌دهنده (Provider Family Bucketing)
  const familyOrder = ["deepseek", "llama", "gemini", "qwen", "mistral", "claude", "openai", "gemma", "glm", "phi", "other"];
  const buckets = {};
  for (const fam of familyOrder) buckets[fam] = [];

  for (const m of healthy) {
    const fam = getModelFamily(m);
    if (!buckets[fam]) buckets[fam] = [];
    buckets[fam].push(m);
  }

  const queue = [];
  let prefFam = null;

  // اگر مدل مشخصی انتخاب شده باشد، دقیقاً در رتبه اول قرار می‌گیرد
  if (isExplicit) {
    queue.push(preferredModel);
    prefFam = getModelFamily(preferredModel);
    if (buckets[prefFam]) {
      buckets[prefFam] = buckets[prefFam].filter(m => m !== preferredModel);
    }
  }

  // در صورت انتخاب مدل دستی، گردش خانواده‌ها از خانواده بعدی آغاز می‌شود تا در صورت بروز ۴۲۹ فوراً به شرکتی دیگر سوئیچ شود
  let activeFamilyOrder = familyOrder;
  if (prefFam && familyOrder.includes(prefFam)) {
    const idx = familyOrder.indexOf(prefFam);
    activeFamilyOrder = familyOrder.slice(idx + 1).concat(familyOrder.slice(0, idx + 1));
  }

  // تنیدن خانواده‌ها به صورت نوبتی (Interleaving across distinct model families)
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (const fam of activeFamilyOrder) {
      if (buckets[fam] && buckets[fam].length > 0) {
        queue.push(buckets[fam].shift());
        remaining = true;
      }
    }
  }

  // اضافه کردن مدل‌های دارای لیمیت در انتهای صف برای موارد اضطراری
  for (const m of coolingDown) {
    if (!queue.includes(m)) queue.push(m);
  }

  return queue;
}

function getOrderedKeys(sys) {
  let orderedKeys = [...(sys.apiKeys || [])];
  if (typeof sys.activeKeyIndex === "number" && orderedKeys[sys.activeKeyIndex]) {
    const selected = orderedKeys.splice(sys.activeKeyIndex, 1)[0];
    orderedKeys.unshift(selected);
  }
  const activeKeys = orderedKeys.filter(k => k.status !== "exhausted");
  return activeKeys.length > 0 ? activeKeys : orderedKeys;
}

// ============================================================================
// وضعیت سیستم و ارائه‌دهندگان (getSystemState)
// ============================================================================
async function getSystemState(env) {
  const raw = await storageGet(env, "SYS_STATE");
  if (raw) {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!parsed.baseUrl) parsed.baseUrl = CONFIG.DEFAULT_BASE_URL;
    if (!parsed.chatSoul) parsed.chatSoul = CONFIG.DEFAULT_CHAT_SOUL;
    if (!parsed.workSoul) parsed.workSoul = CONFIG.DEFAULT_WORK_SOUL;
    if (!parsed.customSoul) parsed.customSoul = CONFIG.DEFAULT_CUSTOM_SOUL;
    if (!parsed.soul) parsed.soul = CONFIG.DEFAULT_GUEST_SOUL;
    if (!Array.isArray(parsed.cachedModels)) parsed.cachedModels = [];
    if (!Array.isArray(parsed.cachedFreeModels)) parsed.cachedFreeModels = [];
    if (!Array.isArray(parsed.providers) || parsed.providers.length === 0) {
      parsed.providers = [
        {
          id: "google",
          name: "Google Gemini (پیش‌فرض)",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
          apiKey: (parsed.apiKeys && parsed.apiKeys[0]?.key) || "",
          enabled: true,
          isDefault: true
        },
        {
          id: "groq",
          name: "Groq Cloud (فوق‌العاده سریع)",
          baseUrl: "https://api.groq.com/openai/v1",
          apiKey: "",
          enabled: false,
          isDefault: false
        },
        {
          id: "openrouter",
          name: "OpenRouter (مدل‌های متنوع و رایگان)",
          baseUrl: "https://openrouter.ai/api/v1",
          apiKey: "",
          enabled: false,
          isDefault: false
        },
        {
          id: "deepseek",
          name: "DeepSeek Official",
          baseUrl: "https://api.deepseek.com/v1",
          apiKey: "",
          enabled: false,
          isDefault: false
        }
      ];
    }
    if (!parsed.stats) parsed.stats = { totalUsers: {}, totalRequests: 0 };
    if (!parsed.sponsorChannels) parsed.sponsorChannels = [];
    if (!parsed.photoGallery) parsed.photoGallery = [];
    if (parsed.publicMode === undefined) parsed.publicMode = true;
    if (parsed.sponsorLock === undefined) parsed.sponsorLock = (parsed.sponsorChannels.length > 0);
    if (parsed.providers && Array.isArray(parsed.providers)) {
      parsed.providers.forEach(p => {
        if (p.name && (p.name.includes("CCR") || p.name.includes("ccr"))) {
          p.name = p.name.replace(/CCR/gi, "Custom Provider").replace(/سرور اختصاصی Custom Provider/, "ارائه‌دهنده اختصاصی (Custom Provider)").trim();
        }
      });
    }
    return parsed;
  }

  const initial = {
    botToken: "",
    adminId: null,
    webSecret: "",
    baseUrl: CONFIG.DEFAULT_BASE_URL,
    cachedBaseUrl: "",
    cachedModels: [],
    cachedFreeModels: [],
    chatSoul: CONFIG.DEFAULT_CHAT_SOUL,
    workSoul: CONFIG.DEFAULT_WORK_SOUL,
    customSoul: CONFIG.DEFAULT_CUSTOM_SOUL,
    soul: CONFIG.DEFAULT_GUEST_SOUL,
    selectedModel: "auto_free",
    activeKeyIndex: 0,
    apiKeys: [],
    providers: [
      {
        id: "google",
        name: "Google Gemini (پیش‌فرض)",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        apiKey: "",
        enabled: true,
        isDefault: true
      },
      {
        id: "groq",
        name: "Groq Cloud (فوق‌العاده سریع)",
        baseUrl: "https://api.groq.com/openai/v1",
        apiKey: "",
        enabled: false,
        isDefault: false
      },
      {
        id: "openrouter",
        name: "OpenRouter (مدل‌های متنوع و رایگان)",
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: "",
        enabled: false,
        isDefault: false
      },
      {
        id: "deepseek",
        name: "DeepSeek Official",
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: "",
        enabled: false,
        isDefault: false
      }
    ],
    members: {},
    crons: [],
    photoGallery: [],
    sponsorChannels: [],
    publicMode: true,
    defaultDailyLimit: 20,
    stats: { totalUsers: {}, totalRequests: 0 },
    linuxBridgeUrl: "",
    bridgeSecret: ""
  };
  await storagePut(env, "SYS_STATE", initial);
  return initial;
}

// ============================================================================
// صفحه شروع اصلی خلوت و مدرن (sendStartMenu) برای ادمین و کلاینت‌ها
// ============================================================================
// ============================================================================
// ارسال یا ویرایش هوشمند درجا پیام تلگرام جهت جلوگیری از اسپم (editOrSendMessage)
// ============================================================================
async function editOrSendMessage(botToken, chatId, text, buttons = [], messageIdToEdit = null) {
  if (messageIdToEdit) {
    try {
      const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageIdToEdit,
          text: text,
          parse_mode: "Markdown",
          reply_markup: buttons && buttons.length > 0 ? { inline_keyboard: buttons } : undefined
        })
      });
      const data = await editRes.json();
      if (data.ok) return data;
    } catch (e) {}
  }
  return sendTelegramMessage(botToken, chatId, text, buttons);
}

async function sendStartMenu(botToken, chatId, env, sys, isAdmin, firstName, workerOrigin, messageIdToEdit = null) {
  if (isAdmin) {
    const activeProv = (sys.providers || []).find(p => p.isDefault) || sys.providers?.[0] || { name: "پیش‌فرض" };
    let modelDisplay = sys.selectedModel || "auto_free";
    if (modelDisplay === "auto_free") modelDisplay = "🎁 خودکار (فقط رایگان‌ها)";
    else if (modelDisplay === "auto") modelDisplay = "💎 خودکار (تمام مدل‌ها)";

    const isSponsorOn = sys.sponsorLock !== false && (sys.sponsorChannels || []).length > 0;
    const isPublicOn = sys.publicMode !== false;
    const origin = workerOrigin || sys.workerOrigin || "";

    const welcomeText = `سلام مدیر گرامی! دستیار هوشمند آماده است. 🤖\n\n` +
      `🌐 **سرور فعال:** **${activeProv.name}**\n` +
      `🤖 **مدل فعال:** \`${modelDisplay}\`\n` +
      `📢 **قفل جوین اجباری:** ${isSponsorOn ? "🟢 فعال" : "⚪ غیرفعال"}\n` +
      `🌍 **دسترسی عمومی (کلاینت‌ها):** ${isPublicOn ? "🟢 آزاد برای همه" : "🔒 فقط مدیر"}\n\n` +
      `💡 *هر پیام، سوال، کد یا فایلی بفرستید هوش مصنوعی پاسخ می‌دهد. برای مدیریت از گزینه‌های زیر استفاده کنید:*`;

    const buttons = [];
    if (origin) {
      buttons.push([{ text: "🎛 پنل وب و مینی‌اپ", web_app: { url: `${origin}/app` } }]);
    }
    buttons.push([
      { text: "🌐 سرورها", callback_data: "menu_providers" },
      { text: "🤖 مدل‌ها", callback_data: "menu_models" },
      { text: "📊 وضعیت", callback_data: "menu_status" }
    ]);
    buttons.push([
      { text: "📢 قفل جوین اجباری", callback_data: "menu_sponsor" },
      { text: isPublicOn ? "🌍 دسترسی: عمومی 🟢" : "🔒 دسترسی: فقط ادمین", callback_data: "toggle_public_mode" }
    ]);
    buttons.push([
      { text: "➕ گفتگوی جدید", callback_data: "new_chat" },
      { text: "📜 تاریخچه", callback_data: "history_menu" }
    ]);

    if (messageIdToEdit) {
      const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageIdToEdit,
          text: welcomeText,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: buttons }
        })
      }).then(r => r.json()).catch(() => null);
      if (editRes && editRes.ok) return;
    }
    return sendTelegramMessage(botToken, chatId, welcomeText, buttons);
  } else {
    // برای کلاینت‌ها / عموم کاربران: خلوت، صمیمی و بدون دکمه‌های سردرگم‌کننده
    const clientText = `👋 سلام ${firstName || "کاربر"} عزیز! به دستیار هوش مصنوعی خوش آمدید.\n\n` +
      `من آماده‌ام تا به سوالات شما پاسخ دهم، متن‌ها و مقالات بنویسم، کدهای برنامه‌نویسی را تحلیل کنم و در کارهای روزمره کمکتان کنم.\n\n` +
      `💬 **کافیست هر سوال یا درخواستی دارید همینجا تایپ و ارسال کنید!**`;

    const clientButtons = [
      [
        { text: "➕ شروع گفتگوی جدید", callback_data: "new_chat" },
        { text: "📜 تاریخچه چت‌های من", callback_data: "history_menu" }
      ]
    ];

    if (messageIdToEdit) {
      const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageIdToEdit,
          text: clientText,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: clientButtons }
        })
      }).then(r => r.json()).catch(() => null);
      if (editRes && editRes.ok) return;
    }
    return sendTelegramMessage(botToken, chatId, clientText, clientButtons);
  }
}

// ============================================================================
// مدیریت قفل جوین اجباری (sendSponsorMenu)
// ============================================================================
async function sendSponsorMenu(botToken, chatId, sys, messageIdToEdit = null) {
  const channels = sys.sponsorChannels || [];
  const isLockActive = sys.sponsorLock !== false && channels.length > 0;

  let text = `📢 **مدیریت قفل جوین اجباری کانال (Sponsor Channels):**\n\n` +
    `🔒 **وضعیت قفل جوین:** ${isLockActive ? "🟢 فعال (کاربران عادی ملزم به عضویت)" : "⚪ غیرفعال (استفاده آزاد بدون قفل)"}\n` +
    `👥 **تعداد کانال‌های ثبت‌شده:** **${channels.length}** کانال\n\n` +
    `📋 **لیست کانال‌های فعلی:**\n` +
    (channels.length > 0 ? channels.map((c, i) => `  ${i + 1}. \`${c}\``).join("\n") : "  _هنوز هیچ کانالی ثبت نشده است._") + `\n\n` +
    `💡 **نکته بسیار مهم:** حتماً ربات را در کانال(های) خود به عنوان **مدیر (Admin)** با دسترسی مشاهده اعضا اضافه کنید تا بتواند عضویت کاربران را بررسی نماید.`;

  const buttons = [
    [
      {
        text: sys.sponsorLock ? "🔴 غیرفعال‌سازی قفل جوین" : "🟢 فعال‌سازی قفل جوین",
        callback_data: "toggle_sponsor_lock"
      }
    ],
    [
      { text: "➕ افزودن کانال جدید", callback_data: "wz_add_channel" }
    ]
  ];

  if (channels.length > 0) {
    const delButtons = channels.map((c, idx) => ({
      text: `🗑 حذف ${c}`,
      callback_data: `del_channel:${idx}`
    }));
    for (let i = 0; i < delButtons.length; i += 2) {
      buttons.push(delButtons.slice(i, i + 2));
    }
  }

  buttons.push([
    { text: "🔙 بازگشت به منوی اصلی", callback_data: "menu_start" }
  ]);

  if (messageIdToEdit) {
    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageIdToEdit,
        text,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      })
    }).then(r => r.json()).catch(() => null);
    if (editRes && editRes.ok) return;
  }

  return sendTelegramMessage(botToken, chatId, text, buttons);
}

// ============================================================================
// منوی مدیریت ارائه‌دهنده‌ها و ویزارد تعاملی قدم‌به‌قدم تلگرام (Interactive Wizard)
// ============================================================================
async function sendProvidersMenu(botToken, chatId, sys, messageIdToEdit = null) {
  const provs = sys.providers || [];
  const activeProv = provs.find(p => p.isDefault) || provs[0];

  const buttons = provs.map(p => [{
    text: `${p.isDefault ? "🟢 " : "⚪ "}${p.name} (${p.baseUrl.replace(/^https?:\/\//, "").split("/")[0]})`,
    callback_data: `view_prov:${p.id}`
  }]);

  buttons.push([
    { text: "➕ افزودن سرور جدید (مرحله به مرحله)", callback_data: "wz_start_prov" }
  ]);
  buttons.push([
    { text: "🔄 واکشی مجدد مدل‌ها از API", callback_data: "refresh_models" }
  ]);
  buttons.push([
    { text: "🔙 بازگشت به منوی اصلی", callback_data: "menu_start" }
  ]);

  const text = `🌐 **مدیریت ارائه‌دهنده‌ها (AI Providers):**\n\n` +
    `📌 **سرور فعال ربات:** **${activeProv?.name || "پیش‌فرض"}**\n` +
    `🔗 **آدرس:** \`${activeProv?.baseUrl || "ثبت نشده"}\`\n` +
    `🔑 **کلید:** ${activeProv?.apiKey ? "✅ ثبت شده (" + activeProv.apiKey.slice(0, 5) + "...)" : "🔓 بدون کلید / عمومی"}\n\n` +
    `برای مشاهده جزئیات، تست پینگ یا سوییچ سرور روی هر گزینه بزنید، یا با دکمه **«➕ افزودن سرور جدید»** سرور دلخواهتان را متصل کنید:`;

  if (messageIdToEdit) {
    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageIdToEdit,
        text,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      })
    }).then(r => r.json()).catch(() => null);
    if (editRes && editRes.ok) return;
  }

  return sendTelegramMessage(botToken, chatId, text, buttons);
}

async function sendProviderDetailCard(botToken, chatId, p, isDefault, totalProvs, messageIdToEdit = null) {
  const buttons = [];
  if (!isDefault) {
    buttons.push([{ text: "⭐ فعال‌سازی و سوییچ به این سرور", callback_data: `set_provider:${p.id}` }]);
  }
  buttons.push([
    { text: "⚡ تست پینگ این سرور", callback_data: `test_prov_ping:${p.id}` },
    { text: "🤖 مشاهده مدل‌های این سرور", callback_data: `view_prov_models:${p.id}` }
  ]);
  if (totalProvs > 1) {
    buttons.push([{ text: "🗑 حذف این سرور", callback_data: `del_prov:${p.id}` }]);
  }
  buttons.push([{ text: "🔙 بازگشت به لیست سرورها", callback_data: "menu_providers" }]);

  const text = `🌐 **اطلاعات و تنظیمات سرور هوش مصنوعی:**\n\n` +
    `📌 **نام:** **${p.name}**\n` +
    `🔗 **آدرس Base URL:** \`${p.baseUrl}\`\n` +
    `🔑 **کلید API:** ${p.apiKey ? "✅ ثبت شده (" + p.apiKey.slice(0, 5) + "...)" : "🔓 بدون کلید"}\n` +
    `📡 **وضعیت فعالیت:** ${isDefault ? "🟢 فعال (پیش‌فرض ربات)" : "⚪ غیرفعال"}\n\n` +
    `عملیات مورد نظر خود را انتخاب کنید:`;

  return editOrSendMessage(botToken, chatId, text, buttons, messageIdToEdit);
}

async function sendModelDetailCard(botToken, chatId, m, sys, isFree, messageIdToEdit = null) {
  const isSelected = sys.selectedModel === m;
  const activeProv = (sys.providers || []).find(p => p.isDefault) || sys.providers?.[0];
  const buttons = [
    [
      { text: isSelected ? "✅ در حال حاضر فعال است" : "⭐ انتخاب و فعال‌سازی این مدل روی ربات", callback_data: `apply_model:${m}` }
    ],
    [
      { text: "🧪 تست زنده پینگ و سرعت (Latency)", callback_data: `test_model_tg:${m}` }
    ],
    [
      { text: "🔙 بازگشت به لیست مدل‌ها", callback_data: "menu_models" }
    ]
  ];

  const text = `🤖 **اطلاعات و تست اختصاصی مدل:**\n\n` +
    `📌 **شناسه مدل:** \`${m}\`\n` +
    `🏷 **وضعیت هزینه:** ${isFree ? "🟢 کاملاً رایگان (Free Tier 🎁)" : "💎 استاندارد"}\n` +
    `🌐 **سرور متصل:** ${activeProv?.name || "پیش‌فرض"}\n` +
    `📡 **وضعیت در ربات:** ${isSelected ? "🟢 مدل کنونی فعال" : "⚪ آماده انتخاب"}\n\n` +
    `می‌توانید با دکمه زیر تاخیر میلی‌ثانیه‌ای و سلامت این مدل را قبل از فعال‌سازی تست کنید:`;

  return editOrSendMessage(botToken, chatId, text, buttons, messageIdToEdit);
}

async function sendWizardStep1(botToken, chatId) {
  const text = `✨ **افزودن ارائه‌دهنده جدید هوش مصنوعی (گام ۱ از ۳)**\n\n` +
    `لطفاً **نام سرور یا ارائه‌دهنده** را بفرستید.\n` +
    `*(می‌توانید از گزینه‌های آماده زیر بزنید یا نام دلخواه تایپ فرمایید)*:`;

  const buttons = [
    [
      { text: "⚡ Groq Cloud", callback_data: "wz_name:Groq Cloud" },
      { text: "🔮 OpenRouter", callback_data: "wz_name:OpenRouter" }
    ],
    [
      { text: "💎 Google Gemini", callback_data: "wz_name:Google Gemini" },
      { text: "🤖 DeepSeek Official", callback_data: "wz_name:DeepSeek" }
    ],
    [
      { text: "🌐 ارائه‌دهنده اختصاصی (Custom Provider)", callback_data: "wz_name:Custom Provider" }
    ],
    [
      { text: "❌ انصراف", callback_data: "wz_cancel" }
    ]
  ];
  return sendTelegramMessage(botToken, chatId, text, buttons);
}

async function sendWizardStep2(botToken, chatId, name) {
  const text = `🔗 **تنظیم آدرس سرور (Base URL) — (گام ۲ از ۳)**\n\n` +
    `📌 **نام انتخاب‌شده:** **${name}**\n\n` +
    `اکنون **آدرس پایه API (Base URL)** را وارد کنید یا از دکمه پیشنهادی زیر بزنید.\n` +
    `*(نگران اسلش‌های اضافی یا v1/ نباشید؛ سیستم هوشمند خودکار آن را نرمال‌سازی می‌کند)*:`;

  const buttons = [];
  const lower = (name || "").toLowerCase();
  if (lower.includes("groq")) {
    buttons.push([{ text: "🔗 https://api.groq.com/openai/v1", callback_data: "wz_url:https://api.groq.com/openai/v1" }]);
  } else if (lower.includes("openrouter")) {
    buttons.push([{ text: "🔗 https://openrouter.ai/api/v1", callback_data: "wz_url:https://openrouter.ai/api/v1" }]);
  } else if (lower.includes("gemini") || lower.includes("google")) {
    buttons.push([{ text: "🔗 https://generativelanguage.googleapis.com/v1beta/openai", callback_data: "wz_url:https://generativelanguage.googleapis.com/v1beta/openai" }]);
  } else if (lower.includes("deepseek")) {
    buttons.push([{ text: "🔗 https://api.deepseek.com/v1", callback_data: "wz_url:https://api.deepseek.com/v1" }]);
  }
  buttons.push([{ text: "❌ انصراف", callback_data: "wz_cancel" }]);

  return sendTelegramMessage(botToken, chatId, text, buttons);
}

async function sendWizardStep3(botToken, chatId, name, baseUrl) {
  const text = `🔑 **تنظیم کلید API (گام ۳ از ۳)**\n\n` +
    `📌 **نام سرور:** **${name}**\n` +
    `🌐 **آدرس:** \`${baseUrl}\`\n\n` +
    `اکنون **کلید API (API Key)** خود را تایپ و ارسال فرمایید:\n` +
    `*(اگر سرور یا پروکسی اختصاصی شما بدون کلید کار می‌کند، دکمه «بدون کلید» را بزنید)*`;

  const buttons = [
    [{ text: "🔓 بدون کلید (پروکسی عمومی / سرور محلی)", callback_data: "wz_key_none" }],
    [{ text: "❌ انصراف", callback_data: "wz_cancel" }]
  ];
  return sendTelegramMessage(botToken, chatId, text, buttons);
}

async function finishProviderWizard(env, sys, botToken, chatId, name, rawUrl, key) {
  const normUrl = smartNormalizeBaseUrl(rawUrl);
  const newProv = {
    id: `prov_${Date.now()}`,
    name: name || "ارائه‌دهنده اختصاصی",
    baseUrl: normUrl,
    apiKey: key ? key.trim() : "",
    enabled: true,
    isDefault: true
  };

  sys.providers = sys.providers || [];
  sys.providers.forEach(p => p.isDefault = false);
  sys.providers.push(newProv);
  sys.baseUrl = normUrl;

  if (key && key.trim()) {
    sys.apiKeys = sys.apiKeys || [];
    sys.apiKeys.unshift({ key: key.trim(), status: "active", label: name });
    sys.activeKeyIndex = 0;
  }

  sys.cachedModels = [];
  sys.cachedFreeModels = [];
  await storagePut(env, "SYS_STATE", sys);

  await sendTelegramMessage(botToken, chatId, `⏳ **سرور «${name}» ذخیره شد.**\nدر حال تست اتصال و واکشی خودکار لیست مدل‌ها از ارائه‌دهنده...`);

  const discovery = await fetchLiveModelsFromProvider(env, sys, true);
  const freeCount = discovery.freeModels?.length || 0;
  const totalCount = discovery.models?.length || 0;

  if (totalCount > 0) {
    const text = `🎉 **ارائه‌دهنده جدید با موفقیت متصل و فعال شد!**\n\n` +
      `🌐 **نام سرور:** **${name}**\n` +
      `🔗 **آدرس:** \`${normUrl}\`\n` +
      `🔑 **وضعیت کلید:** ${key ? "ثبت شد" : "بدون کلید"}\n` +
      `🤖 **کل مدل‌های دریافت شده:** **${totalCount}** عدد\n` +
      `🎁 **مدل‌های کاملاً رایگان:** **${freeCount}** عدد\n\n` +
      `هم‌اکنون می‌توانید مدل‌ها را مشاهده، تست یا انتخاب نمایید:`;

    const buttons = [
      [
        { text: `🎁 مشاهده مدل‌های رایگان (${freeCount})`, callback_data: "filter_models:free" },
        { text: `💎 همه مدل‌ها (${totalCount})`, callback_data: "filter_models:all" }
      ],
      [
        { text: "⚡ تست پینگ این سرور", callback_data: `test_prov_ping:${newProv.id}` },
        { text: "🌐 لیست همه سرورها", callback_data: "menu_providers" }
      ]
    ];
    return sendTelegramMessage(botToken, chatId, text, buttons);
  } else {
    const text = `⚠️ **سرور با موفقیت ذخیره شد اما دریافت مدل‌ها با خطا مواجه شد:**\n\n` +
      `🌐 **سرور:** **${name}**\n` +
      `🔗 **آدرس:** \`${normUrl}\`\n` +
      `⚠️ **خطای دریافت:** ${discovery.error || "بدون مدل"}\n\n` +
      `پیشنهاد می‌شود پینگ سرور یا صحت کلید API را بررسی فرمایید:`;

    const buttons = [
      [{ text: "⚡ تست پینگ این سرور", callback_data: `test_prov_ping:${newProv.id}` }],
      [{ text: "🌐 لیست سرورها", callback_data: "menu_providers" }]
    ];
    return sendTelegramMessage(botToken, chatId, text, buttons);
  }
}

// ============================================================================
// گزارش شفاف وضعیت سرور، مدل و سلامت سیستم (sendStatusCard)
// ============================================================================
async function sendStatusCard(botToken, chatId, env, sys, isAdmin, messageIdToEdit = null) {
  const activeProv = (sys.providers || []).find(p => p.isDefault) || sys.providers?.[0] || {
    id: "current",
    name: "پیش‌فرض سیستم",
    baseUrl: sys.baseUrl || CONFIG.DEFAULT_BASE_URL
  };
  const effectiveUrl = smartNormalizeBaseUrl(activeProv.baseUrl || sys.baseUrl || CONFIG.DEFAULT_BASE_URL);
  const provHost = effectiveUrl.replace(/^https?:\/\//, "").split("/")[0];
  const keys = getOrderedKeys(sys);
  const activeKey = keys[0];
  const maskedKey = activeKey?.key ? `${activeKey.key.slice(0, 8)}••••${activeKey.key.slice(-4)}` : "❌ کلید ثبت نشده";

  const discovery = await fetchLiveModelsFromProvider(env, sys, false);
  const totalModels = discovery.models.length;
  const freeModels = (discovery.freeModels || []).length;

  let modelDisplay = sys.selectedModel || "auto_free";
  if (modelDisplay === "auto_free") {
    const queue = buildDiverseModelQueue("auto_free", discovery.models, discovery.freeModels);
    const firstFree = queue[0] || (discovery.freeModels && discovery.freeModels[0]) || discovery.models[0] || CONFIG.FALLBACK_MODELS[0];
    modelDisplay = `🎁 خودکار (فقط مدل‌های رایگان) 👈 اولویت فعلی: \`${firstFree}\``;
  } else if (modelDisplay === "auto") {
    const queue = buildDiverseModelQueue("auto", discovery.models, discovery.freeModels);
    const firstModel = queue[0] || discovery.models[0] || CONFIG.FALLBACK_MODELS[0];
    modelDisplay = `💎 خودکار (تمام مدل‌ها) 👈 اولویت فعلی: \`${firstModel}\``;
  } else {
    modelDisplay = `\`${modelDisplay}\``;
  }

  const modeDisplay = {
    chat: "💡 چت ساده و روزمره (/chat)",
    work: "💼 کارمند و برنامه‌نویس (/work)",
    custom: "🎭 شخصیت سفارشی (/custom)"
  }[sys.defaultMode || "chat"] || "💡 چت ساده";

  const statusText = `📊 **گزارش وضعیت زنده دستیار هوش مصنوعی EdgePulse:**\n\n` +
    `🌐 **ارائه‌دهنده فعال:** **${activeProv.name}**\n` +
    `🔗 **آدرس سرور:** \`${effectiveUrl}\`\n` +
    `🤖 **مدل فعال ربات:** ${modelDisplay}\n` +
    `🔑 **کلید API:** \`${maskedKey}\`\n` +
    `📊 **تعداد مدل‌های در دسترس:** **${totalModels}** مدل (🎁 **${freeModels}** مدل رایگان)\n` +
    `🎭 **حالت کنونی دستیار:** ${modeDisplay}\n` +
    `👑 **سطح دسترسی شما:** ${isAdmin ? "مدیر کل (Admin)" : "کاربر عادی"}\n\n` +
    `💡 برای تغییر سرور فعال از «🌐 سرورها» و برای تغییر مدل از «🤖 مدل‌ها» استفاده کنید.`;

  const buttons = [
    [{ text: "⚡ تست زنده پینگ و سلامت سرور", callback_data: `test_prov_ping:${activeProv.id || "current"}` }],
    [{ text: "🧪 تست دسته‌جمعی پینگ رایگان‌ها 🎁 (ضد ۴۲۹)", callback_data: "batch_test:free:0" }],
    [{ text: "🤖 انتخاب مدل (/model)", callback_data: "menu_models" }, { text: "🌐 سرورها (/providers)", callback_data: "menu_providers" }],
    [{ text: "🔄 بروزرسانی وضعیت", callback_data: "menu_status" }]
  ];

  if (messageIdToEdit) {
    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageIdToEdit,
        text: statusText,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      })
    }).then(r => r.json()).catch(() => null);
    if (editRes && editRes.ok) return;
  }

  return sendTelegramMessage(botToken, chatId, statusText, buttons);
}

// ============================================================================
// منوی مدل‌ها در تلگرام با صفحه‌بندی کامل و تفکیک مدل‌های رایگان (sendModelMenu)
// ============================================================================
async function sendModelMenu(
  botToken,
  chatId,
  env,
  sys,
  forceRefresh = true,
  customUserConfig = null,
  isAdmin = true,
  filterType = "all",
  page = 0,
  messageIdToEdit = null
) {
  const discovery = await fetchLiveModelsFromProvider(env, sys, forceRefresh, customUserConfig);
  const effectiveUrl = smartNormalizeBaseUrl(customUserConfig?.baseUrl || sys.baseUrl || CONFIG.DEFAULT_BASE_URL);
  const providerHost = effectiveUrl.replace(/^https?:\/\//, "").split("/")[0];

  if (discovery.models.length === 0) {
    const buttons = [[{ text: "🔄 تلاش مجدد برای دریافت از API", callback_data: "refresh_models:all:0" }]];
    return sendTelegramMessage(
      botToken,
      chatId,
      `⚠️ لیست مدل‌ها از \`${providerHost}\` دریافت نشد.\n**دلیل دقیق:** ${discovery.error || "نامشخص"}`,
      buttons
    );
  }

  const currentSelected = !isAdmin && customUserConfig?.model ? customUserConfig.model : (sys.selectedModel || "auto_free");
  const freeModels = discovery.freeModels || [];

  let modelsToShow = discovery.models;
  if (filterType === "free") {
    modelsToShow = freeModels.length > 0 ? freeModels : discovery.models;
  }

  const pageSize = 10;
  const totalCount = modelsToShow.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const pageSlice = modelsToShow.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const buttons = [];
  // Tab 1: Filters
  buttons.push([
    { text: `${filterType === "free" ? "🔘 " : ""}🎁 فقط رایگان (${freeModels.length})`, callback_data: "filter_models:free:0" },
    { text: `${filterType === "all" ? "🔘 " : ""}💎 همه (${discovery.models.length})`, callback_data: "filter_models:all:0" }
  ]);

  // If page == 0, show Auto buttons (Auto Free and Auto All)
  if (safePage === 0) {
    buttons.push([
      {
        text: `${currentSelected === "auto_free" ? "🟢 " : ""}🎁 خودکار هوشمند (فقط مدل‌های رایگان)`,
        callback_data: "apply_model:auto_free"
      }
    ]);
    buttons.push([
      {
        text: `${currentSelected === "auto" ? "🟢 " : ""}💎 خودکار (تمام مدل‌ها)`,
        callback_data: "apply_model:auto"
      }
    ]);
  }

  // Model buttons (2 per row)
  for (let i = 0; i < pageSlice.length; i += 2) {
    const row = [];
    for (let j = i; j < i + 2 && j < pageSlice.length; j++) {
      const m = pageSlice[j];
      const isFree = freeModels.includes(m);
      const isSel = currentSelected === m;
      const label = m.length > 28 ? m.slice(0, 26) + "…" : m;
      row.push({
        text: `${isSel ? "🟢 " : ""}${isFree ? "🎁 " : ""}${label}`,
        callback_data: `pick_model:${m}`
      });
    }
    buttons.push(row);
  }

  // Navigation row
  const navRow = [];
  if (safePage > 0) {
    navRow.push({ text: "◀️ قبلی", callback_data: `page_models:${filterType}:${safePage - 1}` });
  } else {
    navRow.push({ text: "⏹️ اول", callback_data: "noop" });
  }
  navRow.push({ text: `📄 ${safePage + 1} از ${totalPages}`, callback_data: "noop" });
  if (safePage < totalPages - 1) {
    navRow.push({ text: "بعدی ▶️", callback_data: `page_models:${filterType}:${safePage + 1}` });
  } else {
    navRow.push({ text: "⏹️ آخر", callback_data: "noop" });
  }
  buttons.push(navRow);

  // Bottom action row
  buttons.push([
    { text: "🧪 تست دسته‌جمعی پینگ رایگان‌ها 🎁 (ضد ۴۲۹)", callback_data: "batch_test:free:0" }
  ]);
  buttons.push([
    { text: "🔄 بروزرسانی از API", callback_data: `refresh_models:${filterType}:${safePage}` },
    { text: "📊 وضعیت سیستم", callback_data: "menu_status" }
  ]);

  let selectedDisplay = currentSelected;
  if (currentSelected === "auto_free") selectedDisplay = "🎁 خودکار هوشمند (فقط رایگان‌ها)";
  else if (currentSelected === "auto") selectedDisplay = "💎 خودکار (تمام مدل‌ها)";

  const filterText = filterType === "free" ? "فقط مدل‌های رایگان 🎁" : "همه مدل‌ها 💎";
  const menuText = `🤖 **مدل‌های هوش مصنوعی \`${providerHost}\` (${filterText}):**\n` +
    `⭐ مدل انتخابی فعلی: \`${selectedDisplay}\`\n` +
    `🎁 مدل‌های رایگان با نشان هدیه مشخص شده‌اند.\n` +
    `📄 صفحه **${safePage + 1}** از **${totalPages}** (نمایش ۱۰ مورد در هر صفحه)\n\n` +
    `💡 برای مشاهده جزئیات یا تست پینگ هر مدل، روی دکمه آن کلیک کنید:`;

  if (messageIdToEdit) {
    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageIdToEdit,
        text: menuText,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      })
    }).then(r => r.json()).catch(() => null);
    if (editRes && editRes.ok) return;
  }

  return sendTelegramMessage(botToken, chatId, menuText, buttons);
}

// ============================================================================
// تست دسته‌جمعی سلامت و پینگ مدل‌ها با کنترل نرخ ضد ۴۲۹ (runBatchModelTest)
// ============================================================================
async function runBatchModelTest(botToken, chatId, env, sys, isAdmin, filterType = "free", batchIndex = 0, messageIdToEdit = null) {
  const activeProv = (sys.providers || []).find(p => p.isDefault) || sys.providers?.[0] || {
    id: "current",
    name: "پیش‌فرض سیستم",
    baseUrl: sys.baseUrl || CONFIG.DEFAULT_BASE_URL
  };
  const testBase = smartNormalizeBaseUrl(activeProv.baseUrl || sys.baseUrl || CONFIG.DEFAULT_BASE_URL);
  const providerHost = testBase.replace(/^https?:\/\//, "").split("/")[0];
  const keys = getOrderedKeys(sys);
  const testKey = (sys.apiKeys && sys.apiKeys[0]?.key) || activeProv?.apiKey || keys[0]?.key || "";

  if (!testKey) {
    return sendTelegramMessage(botToken, chatId, "❌ کلید API ثبت نشده است. ابتدا با دستور `/setkey` کلید خود را ثبت فرمایید.");
  }

  const discovery = await fetchLiveModelsFromProvider(env, sys, false);
  const candidates = filterType === "free"
    ? (discovery.freeModels.length > 0 ? discovery.freeModels : discovery.models)
    : discovery.models;

  if (candidates.length === 0) {
    return sendTelegramMessage(botToken, chatId, `⚠️ هیچ مدلی برای تست در ارائه‌دهنده \`${providerHost}\` یافت نشد.`);
  }

  const batchSize = 5;
  const totalBatches = Math.max(1, Math.ceil(candidates.length / batchSize));
  const safeBatch = Math.max(0, Math.min(batchIndex, totalBatches - 1));
  const modelsToTest = candidates.slice(safeBatch * batchSize, (safeBatch + 1) * batchSize);

  const waitNotice = `⏳ **در حال اجرای تست سلامت و پینگ دسته‌جمعی...**\n\n` +
    `🌐 ارائه‌دهنده: \`${providerHost}\`\n` +
    `📂 دسته انتخابی: **${filterType === "free" ? "مدل‌های رایگان 🎁" : "همه مدل‌ها 💎"}** (بخش ${safeBatch + 1} از ${totalBatches})\n` +
    `🎯 در حال سنجش ۵ مدل زیر:\n` +
    modelsToTest.map((m, i) => `  ${i + 1}. \`${m}\``).join("\n") + `\n\n` +
    `🛡️ **محافظ هوشمند ضد ۴۲۹ (Anti-RateLimit):**\n` +
    `پروب‌ها با تاخیر هوشمند ۱.۲ ثانیه‌ای ارسال می‌شوند تا سهمیه ارائه‌دهنده مسدود نگردد. لطفاً چند لحظه شکیبا باشید...`;

  if (messageIdToEdit) {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageIdToEdit,
        text: waitNotice,
        parse_mode: "Markdown"
      })
    }).catch(() => {});
  } else {
    await sendTelegramMessage(botToken, chatId, waitNotice);
  }

  const results = [];
  for (let i = 0; i < modelsToTest.length; i++) {
    const m = modelsToTest[i];
    await sendChatAction(botToken, chatId, "typing");
    const testRes = await testModelLatencyAndHealth(testBase, testKey, m);
    results.push({ model: m, ...testRes });

    // تاخیر هوشمند کنترل‌شده بین تست‌ها برای پیشگیری قطعی از خطای 429 (Too Many Requests)
    if (i < modelsToTest.length - 1) {
      const delayMs = testRes.isRateLimit ? 2500 : 1200;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  const successfulModels = results.filter(r => r.ok);

  let reportText = `🧪 **گزارش ارزیابی دسته‌جمعی پینگ و سلامت مدل‌ها:**\n\n` +
    `🌐 **ارائه‌دهنده:** **${activeProv.name}** (\`${providerHost}\`)\n` +
    `📑 **بخش:** **${safeBatch + 1}** از **${totalBatches}** (${filterType === "free" ? "مدل‌های رایگان 🎁" : "تمام مدل‌ها 💎"})\n` +
    `📊 **نتیجه تست:** **${successfulModels.length}** از **${modelsToTest.length}** مدل با موفقیت پاسخ دادند.\n\n` +
    `⚠️ **نکته بسیار مهم درباره خطای ۴۲۹ (Rate Limit):**\n` +
    `ارائه‌دهندگان برای کلیدهای رایگان سقف درخواست در دقیقه دارند. پروب‌ها با تاخیر محافظتی ارسال شدند؛ اما اگر ارائه‌دهنده در آن لحظه شلوغ باشد، ممکن است علامت 🔴 دریافت کنید. در این شرایط از مدل‌های سبز 🟢 استفاده کنید یا پس از ۱ الی ۲ دقیقه مجدداً تست فرمایید.\n\n` +
    `📋 **جزئیات تست هر مدل:**\n` +
    results.map((r, idx) => {
      if (r.ok) {
        return `${idx + 1}. 🟢 \`${r.model}\`\n    ⚡ تاخیر: **${r.latencyMs}ms** | 💬 _${(r.reply || "OK").slice(0, 30)}_`;
      } else {
        const errDesc = r.status === 429 ? "🔴 محدودیت سهمیه (429 Rate Limit)" : `🔴 خطا: ${r.error || "بدون پاسخ"}`;
        return `${idx + 1}. \`${r.model}\`\n    ⚠️ ${errDesc}`;
      }
    }).join("\n\n");

  const buttons = [];
  // دکمه‌های انتخاب سریع برای مدل‌هایی که موفق بودند
  for (const s of successfulModels.slice(0, 2)) {
    const label = s.model.length > 25 ? s.model.slice(0, 23) + "…" : s.model;
    buttons.push([{ text: `⭐ فعال‌سازی ${label} (${s.latencyMs}ms)`, callback_data: `apply_model:${s.model}` }]);
  }

  // دکمه‌های ناوبری دسته‌ها
  const navRow = [];
  if (safeBatch > 0) {
    navRow.push({ text: "◀️ ۵ مدل قبلی", callback_data: `batch_test:${filterType}:${safeBatch - 1}` });
  }
  if (safeBatch < totalBatches - 1) {
    navRow.push({ text: `۵ مدل بعدی ▶️ (${safeBatch + 2}/${totalBatches})`, callback_data: `batch_test:${filterType}:${safeBatch + 1}` });
  }
  if (navRow.length > 0) buttons.push(navRow);

  // دکمه‌های بازگشت
  buttons.push([
    { text: "🔄 تست مجدد همین بخش", callback_data: `batch_test:${filterType}:${safeBatch}` },
    { text: "🤖 منوی مدل‌ها", callback_data: "menu_models" }
  ]);
  buttons.push([
    { text: "📊 وضعیت سیستم (/status)", callback_data: "menu_status" }
  ]);

  if (messageIdToEdit) {
    const editRes = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageIdToEdit,
        text: reportText,
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: buttons }
      })
    }).then(r => r.json()).catch(() => null);
    if (editRes && editRes.ok) return;
  }

  return sendTelegramMessage(botToken, chatId, reportText, buttons);
}

// ============================================================================
// مدیریت کلیک روی دکمه‌های شیشه‌ای تلگرام (handleCallbackQuery)
// ============================================================================
async function handleCallbackQuery(query, env, botToken, workerOrigin = "") {
  const chatId = query.message.chat.id;
  const userId = String(query.from.id);
  const data = query.data;
  const msgId = query.message?.message_id;
  const sys = await getSystemState(env);
  const isAdmin = sys.adminId === userId;
  const member = !isAdmin ? sys.members[userId] : null;
  const customUserConfig = (!isAdmin && member && (member.customApiKey || member.customBaseUrl))
    ? { apiKey: member.customApiKey, baseUrl: member.customBaseUrl || sys.baseUrl, model: member.customModel || "auto" }
    : null;

  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: query.id })
  }).catch(() => {});

  if (data === "menu_start") {
    return sendStartMenu(botToken, chatId, env, sys, isAdmin, query.from.first_name, workerOrigin, query.message?.message_id);
  }

  if (data === "menu_sponsor" && isAdmin) {
    return sendSponsorMenu(botToken, chatId, sys, query.message?.message_id);
  }

  if (data === "toggle_sponsor_lock" && isAdmin) {
    sys.sponsorLock = sys.sponsorLock === false ? true : false;
    await storagePut(env, "SYS_STATE", sys);
    return sendSponsorMenu(botToken, chatId, sys, query.message?.message_id);
  }

  if (data === "wz_add_channel" && isAdmin) {
    await storagePut(env, `WIZARD_${userId}`, JSON.stringify({ step: "add_channel" }), { expirationTtl: 600 });
    const text = `📢 **افزودن کانال به قفل جوین اجباری:**\n\n` +
      `لطفاً آیدی یا یوزرنیم کانال را با @ ارسال فرمایید (مثلاً: \`@MyChannel\` یا \`-1001234567890\`):\n\n` +
      `💡 *نکته:* حتماً ربات را از قبل در کانال مدیر (Admin) کنید تا دسترسی بررسی اعضا را داشته باشد.\n` +
      `*(برای انصراف عبارت /cancel را بفرستید)*`;
    return sendTelegramMessage(botToken, chatId, text, [
      [{ text: "❌ انصراف", callback_data: "wz_cancel_sponsor" }]
    ]);
  }

  if (data === "wz_cancel_sponsor" && isAdmin) {
    await storageDelete(env, `WIZARD_${userId}`);
    return sendSponsorMenu(botToken, chatId, sys, query.message?.message_id);
  }

  if (data.startsWith("del_channel:") && isAdmin) {
    const idx = parseInt(data.slice("del_channel:".length), 10);
    if (sys.sponsorChannels && sys.sponsorChannels[idx]) {
      sys.sponsorChannels.splice(idx, 1);
      await storagePut(env, "SYS_STATE", sys);
    }
    return sendSponsorMenu(botToken, chatId, sys, query.message?.message_id);
  }

  if (data === "toggle_public_mode" && isAdmin) {
    sys.publicMode = sys.publicMode === false ? true : false;
    await storagePut(env, "SYS_STATE", sys);
    return sendStartMenu(botToken, chatId, env, sys, isAdmin, query.from.first_name, workerOrigin, query.message?.message_id);
  }

  if (data.startsWith("cancel_req:")) {
    const reqId = data.slice("cancel_req:".length);
    await storagePut(env, `CANCEL_${reqId}`, "true", { expirationTtl: 120 });
    ACTIVE_USER_LOCKS.delete(userId);
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: query.message.message_id, text: "❌ درخواست لغو شد." })
    }).catch(() => {});
    return;
  }

  if (data.startsWith("set_mode:") && isAdmin) {
    const chosenMode = data.slice("set_mode:".length);
    let userMem = await getActiveChatMemory(env, userId);
    userMem.mode = chosenMode;
    await saveActiveChatMemory(env, userId, userMem);
    const labelMap = {
      chat: "💡 حالت چت ساده و روزمره فعال شد",
      work: "💼 حالت کارمند حرفه‌ای و برنامه‌نویس فعال شد",
      custom: "🎭 حالت شخصیت سفارشی فعال شد"
    };
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: query.id, text: labelMap[chosenMode] || "✅ حالت دستیار تغییر کرد" })
    }).catch(() => {});
    return sendStartMenu(botToken, chatId, env, sys, isAdmin, query.from.first_name, workerOrigin, msgId);
  }

  if (data === "check_sponsor") {
    const res = await checkSponsorJoin(botToken, sys, userId);
    if (res.ok) return sendTelegramMessage(botToken, chatId, "🎉 **عضویت شما با موفقیت تایید شد!**\nاکنون هر سوال یا درخواستی دارید بفرمایید تا پاسخ دهم.");
    return sendTelegramMessage(botToken, chatId, "⚠️ هنوز در همه کانال‌های تعیین‌شده عضو نشده‌اید. لطفاً ابتدا عضو شوید و سپس دکمه تایید را بزنید.");
  }
  if (data === "new_chat" || data === "clear_chat") {
    ACTIVE_USER_LOCKS.delete(userId);
    const currentMem = await getActiveChatMemory(env, userId);
    await createNewChatSession(env, userId, currentMem.mode || "chat");
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: query.id, text: "✨ گفتگوی جدید ساخته شد" })
    }).catch(() => {});
    return sendStartMenu(botToken, chatId, env, sys, isAdmin, query.from.first_name, workerOrigin, msgId);
  }
  if (data === "history_menu") {
    return sendHistoryMenu(botToken, env, chatId, userId, msgId);
  }
  if (data.startsWith("switch_sess:")) {
    const sessId = data.slice("switch_sess:".length);
    await storagePut(env, `ACTIVE_SESS_${userId}`, sessId);
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: query.id, text: "🔄 گفتگو به سشن انتخاب‌شده منتقل شد" })
    }).catch(() => {});
    return sendHistoryMenu(botToken, env, chatId, userId, msgId);
  }
  if (data === "noop") {
    return;
  }
  if (data === "menu_status") {
    return sendStatusCard(botToken, chatId, env, sys, isAdmin, query.message?.message_id);
  }
  if (data === "menu_models") {
    return sendModelMenu(botToken, chatId, env, sys, false, customUserConfig, isAdmin, "all", 0, msgId);
  }
  if (data.startsWith("refresh_models")) {
    const parts = data.split(":");
    const fType = parts[1] || "all";
    const pNum = parseInt(parts[2] || "0", 10) || 0;
    return sendModelMenu(botToken, chatId, env, sys, true, customUserConfig, isAdmin, fType, pNum, query.message?.message_id);
  }
  if (data.startsWith("filter_models:")) {
    const parts = data.split(":");
    const fType = parts[1] || "all";
    return sendModelMenu(botToken, chatId, env, sys, false, customUserConfig, isAdmin, fType, 0, query.message?.message_id);
  }
  if (data.startsWith("page_models:")) {
    const parts = data.split(":");
    const fType = parts[1] || "all";
    const pNum = parseInt(parts[2] || "0", 10) || 0;
    return sendModelMenu(botToken, chatId, env, sys, false, customUserConfig, isAdmin, fType, pNum, query.message?.message_id);
  }
  if (data.startsWith("batch_test:") && isAdmin) {
    const parts = data.split(":");
    const fType = parts[1] || "free";
    const bIndex = parseInt(parts[2] || "0", 10) || 0;
    return runBatchModelTest(botToken, chatId, env, sys, isAdmin, fType, bIndex, query.message?.message_id);
  }
  if (data === "menu_providers" && isAdmin) {
    return sendProvidersMenu(botToken, chatId, sys, msgId);
  }

  if (data.startsWith("view_prov:") && isAdmin) {
    const pId = data.slice("view_prov:".length);
    const p = (sys.providers || []).find(x => x.id === pId);
    if (p) {
      return sendProviderDetailCard(botToken, chatId, p, p.isDefault, (sys.providers || []).length, msgId);
    }
  }

  if (data.startsWith("test_prov_ping:") && isAdmin) {
    const pId = data.slice("test_prov_ping:".length);
    let p = (sys.providers || []).find(x => x.id === pId);
    if (!p || pId === "current") {
      p = (sys.providers || []).find(x => x.isDefault) || {
        id: "current",
        name: "سرور فعال سیستم",
        baseUrl: sys.baseUrl || CONFIG.DEFAULT_BASE_URL,
        apiKey: (sys.apiKeys && sys.apiKeys[0]?.key) || ""
      };
    }
    if (p) {
      await sendTelegramMessage(botToken, chatId, `⏳ در حال ارسال پروب تستی و پینگ سرور **${p.name}**...`);
      const testKey = p.apiKey || (sys.apiKeys && sys.apiKeys[0]?.key) || "";
      const probe = await autoDetectAndTestBaseUrl(p.baseUrl, testKey);
      if (probe.success) {
        return sendTelegramMessage(botToken, chatId, `🟢 **پینگ سرور با موفقیت انجام شد!**\n\n🌐 سرور: **${p.name}**\n🔗 آدرس کارساز: \`${probe.workingUrl}\`\n📡 کد وضعیت: **${probe.status} OK**\n✅ ارتباط کاملاً پایدار و آماده استفاده است.`, [
          [{ text: "⭐ فعال‌سازی این سرور", callback_data: `set_provider:${p.id}` }],
          [{ text: "🔙 بازگشت به لیست سرورها", callback_data: "menu_providers" }]
        ]);
      } else {
        return sendTelegramMessage(botToken, chatId, `❌ **خطا در برقراری ارتباط با سرور:**\n\n🌐 سرور: **${p.name}**\n🔗 آدرس: \`${p.baseUrl}\`\n⚠️ پیام خطا: ${probe.error || "پاسخی دریافت نشد"}`, [
          [{ text: "⚡ تلاش مجدد", callback_data: `test_prov_ping:${p.id}` }],
          [{ text: "🔙 بازگشت به لیست سرورها", callback_data: "menu_providers" }]
        ]);
      }
    }
  }

  if (data.startsWith("view_prov_models:") && isAdmin) {
    const pId = data.slice("view_prov_models:".length);
    const p = (sys.providers || []).find(x => x.id === pId);
    if (p) {
      sys.providers.forEach(x => x.isDefault = false);
      p.isDefault = true;
      sys.baseUrl = p.baseUrl;
      if (p.apiKey) {
        sys.apiKeys = sys.apiKeys || [];
        const existing = sys.apiKeys.findIndex(k => k.key === p.apiKey);
        if (existing >= 0) {
          sys.activeKeyIndex = existing;
          sys.apiKeys[existing].status = "active";
        } else {
          sys.apiKeys.unshift({ key: p.apiKey, status: "active", label: p.name });
          sys.activeKeyIndex = 0;
        }
      }
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
      await storagePut(env, "SYS_STATE", sys);
      return sendModelMenu(botToken, chatId, env, sys, true, customUserConfig, isAdmin, "all", 0, msgId);
    }
  }

  if (data.startsWith("del_prov:") && isAdmin) {
    const pId = data.slice("del_prov:".length);
    const provs = sys.providers || [];
    if (provs.length <= 1) {
      return sendTelegramMessage(botToken, chatId, "⚠️ این تنها سرور ثبت‌شده سیستم است و امکان حذف آن وجود ندارد.");
    }
    const wasDefault = provs.some(x => x.id === pId && x.isDefault);
    sys.providers = provs.filter(x => x.id !== pId);
    if (wasDefault && sys.providers.length > 0) {
      sys.providers[0].isDefault = true;
      sys.baseUrl = sys.providers[0].baseUrl;
    }
    sys.cachedModels = [];
    sys.cachedFreeModels = [];
    await storagePut(env, "SYS_STATE", sys);
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: query.id, text: "🗑 سرور حذف شد" })
    }).catch(() => {});
    return sendProvidersMenu(botToken, chatId, sys, msgId);
  }

  if (data === "wz_start_prov" && isAdmin) {
    await storagePut(env, `WIZARD_${userId}`, JSON.stringify({ step: "prov_name" }), { expirationTtl: 600 });
    return sendWizardStep1(botToken, chatId);
  }

  if (data.startsWith("wz_name:") && isAdmin) {
    const chosenName = data.slice("wz_name:".length);
    const wState = { step: "prov_url", name: chosenName };
    await storagePut(env, `WIZARD_${userId}`, JSON.stringify(wState), { expirationTtl: 600 });
    return sendWizardStep2(botToken, chatId, chosenName);
  }

  if (data.startsWith("wz_url:") && isAdmin) {
    const chosenUrl = data.slice("wz_url:".length);
    const wizardRaw = await storageGet(env, `WIZARD_${userId}`);
    const wState = wizardRaw ? JSON.parse(wizardRaw) : { name: "ارائه‌دهنده" };
    wState.baseUrl = smartNormalizeBaseUrl(chosenUrl);
    wState.step = "prov_key";
    await storagePut(env, `WIZARD_${userId}`, JSON.stringify(wState), { expirationTtl: 600 });
    return sendWizardStep3(botToken, chatId, wState.name, wState.baseUrl);
  }

  if (data === "wz_key_none" && isAdmin) {
    const wizardRaw = await storageGet(env, `WIZARD_${userId}`);
    const wState = wizardRaw ? JSON.parse(wizardRaw) : {};
    await storageDelete(env, `WIZARD_${userId}`);
    return finishProviderWizard(env, sys, botToken, chatId, wState.name || "سرور اختصاصی", wState.baseUrl || sys.baseUrl, "");
  }

  if (data === "wz_cancel") {
    await storageDelete(env, `WIZARD_${userId}`);
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: query.id, text: "❌ افزودن سرور لغو شد" })
    }).catch(() => {});
    return sendProvidersMenu(botToken, chatId, sys, msgId);
  }

  if (data.startsWith("pick_model:")) {
    const m = data.slice("pick_model:".length);
    const isFree = (sys.cachedFreeModels || []).includes(m);
    return sendModelDetailCard(botToken, chatId, m, sys, isFree, msgId);
  }

  if (data.startsWith("apply_model:") || data.startsWith("set_model:")) {
    const m = data.startsWith("apply_model:") ? data.slice("apply_model:".length) : data.slice("set_model:".length);
    if (isAdmin) {
      sys.selectedModel = m;
      await storagePut(env, "SYS_STATE", sys);
    } else if (member) {
      member.customModel = (m === "auto" || m === "auto_free") ? "" : m;
      await storagePut(env, "SYS_STATE", sys);
    }
    const isAuto = m === "auto" || m === "auto_free";
    const buttons = isAuto
      ? [
          [{ text: "🤖 مشاهده لیست مدل‌ها", callback_data: "menu_models" }],
          [{ text: "📊 وضعیت سیستم (/status)", callback_data: "menu_status" }]
        ]
      : [
          [{ text: "🧪 تست پینگ این مدل", callback_data: `test_model_tg:${m}` }],
          [{ text: "🤖 مشاهده سایر مدل‌ها", callback_data: "menu_models" }]
        ];

    let mTitle = m;
    if (m === "auto_free") mTitle = "🎁 خودکار هوشمند (فقط مدل‌های رایگان - 100% Free)";
    else if (m === "auto") mTitle = "💎 خودکار (تمام مدل‌های موجود)";

    return editOrSendMessage(botToken, chatId, `✅ **مدل با موفقیت برای ربات تنظیم شد!**\n\n🤖 مدل فعال: **${mTitle}**\nاز این پس پیام‌های شما با این مدل پاسخ داده خواهد شد.`, buttons, msgId);
  }

  if (data.startsWith("test_model_tg:")) {
    const m = data.slice("test_model_tg:".length);
    const testBase = smartNormalizeBaseUrl(sys.baseUrl);
    const activeProv = (sys.providers || []).find(p => p.isDefault) || sys.providers?.[0];
    const testKey = (sys.apiKeys && sys.apiKeys[0]?.key) || activeProv?.apiKey || "";

    await sendTelegramMessage(botToken, chatId, `⏳ در حال ارسال پروب تستی و سنجش پینگ مدل \`${m}\` (مصرف میکروتوکن)...`);
    const testRes = await testModelLatencyAndHealth(testBase, testKey, m);
    if (testRes.ok) {
      const buttons = [
        [{ text: "⭐ انتخاب و فعال‌سازی این مدل روی ربات", callback_data: `apply_model:${m}` }],
        [{ text: "🧪 تست مجدد", callback_data: `test_model_tg:${m}` }, { text: "🔙 بازگشت به لیست مدل‌ها", callback_data: "menu_models" }]
      ];
      return sendTelegramMessage(botToken, chatId, `🟢 **تست پینگ و سلامت مدل موفقیت‌آمیز بود!**\n\n🤖 مدل: \`${m}\`\n⚡ تاخیر پاسخ‌دهی (Latency): **${testRes.latencyMs}ms**\n📡 کد وضعیت: **200 OK**\n💬 پاسخ تستی: _${testRes.reply || "OK"}_\n\nآیا مایلید این مدل برای ربات فعال شود؟`, buttons);
    } else {
      const buttons = [
        [{ text: "🧪 تلاش مجدد", callback_data: `test_model_tg:${m}` }],
        [{ text: "🔙 بازگشت به لیست مدل‌ها", callback_data: "menu_models" }]
      ];
      return sendTelegramMessage(botToken, chatId, `❌ **خطا در تست مدل:**\n\n🤖 مدل: \`${m}\`\n⏱ تاخیر: ${testRes.latencyMs}ms\n⚠️ پیام خطا: ${testRes.error || "نامشخص"}`, buttons);
    }
  }

  if (data.startsWith("set_provider:") && isAdmin) {
    const pId = data.slice("set_provider:".length);
    const p = (sys.providers || []).find(x => x.id === pId);
    if (p) {
      sys.providers.forEach(x => x.isDefault = false);
      p.isDefault = true;
      sys.baseUrl = p.baseUrl;
      if (p.apiKey) {
        sys.apiKeys = sys.apiKeys || [];
        const existing = sys.apiKeys.findIndex(k => k.key === p.apiKey);
        if (existing >= 0) {
          sys.activeKeyIndex = existing;
          sys.apiKeys[existing].status = "active";
        } else {
          sys.apiKeys.unshift({ key: p.apiKey, status: "active", label: p.name });
          sys.activeKeyIndex = 0;
        }
      }
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
      await storagePut(env, "SYS_STATE", sys);
      await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: query.id, text: `✅ ارائه‌دهنده به ${p.name} تغییر یافت` })
      }).catch(() => {});
      return sendModelMenu(botToken, chatId, env, sys, true, customUserConfig, isAdmin, "all", 0, msgId);
    }
  }
  if (data === "menu_keys" && isAdmin) {
    return sendKeysMenu(botToken, chatId, sys);
  }

  if (data.startsWith("set_model:")) {
    const chosen = data.slice("set_model:".length);
    if (isAdmin) {
      sys.selectedModel = chosen;
      await storagePut(env, "SYS_STATE", sys);
    } else if (member) {
      member.customModel = chosen === "auto" ? "" : chosen;
      await storagePut(env, "SYS_STATE", sys);
    }
    return sendTelegramMessage(botToken, chatId, `✅ مدل فعال تنظیم شد به: **${chosen}**`);
  }

  if (data.startsWith("select_key:") && isAdmin) {
    const idx = parseInt(data.split(":")[1]);
    if (sys.apiKeys && sys.apiKeys[idx]) {
      sys.activeKeyIndex = idx;
      sys.apiKeys[idx].status = "active";
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
      await storagePut(env, "SYS_STATE", sys);
      return sendTelegramMessage(botToken, chatId, `✅ کلید **${sys.apiKeys[idx].label}** فعال شد.`);
    }
  }
}



// ============================================================================
// پردازشگر اصلی پیام‌های تلگرام
// ============================================================================
async function processTelegramUpdate(update, env, ctx, botToken, workerOrigin) {
  if (update.update_id) {
    if (PROCESSED_UPDATES.has(update.update_id)) return;
    PROCESSED_UPDATES.add(update.update_id);
    if (PROCESSED_UPDATES.size > 200) {
      const firstItem = PROCESSED_UPDATES.values().next().value;
      PROCESSED_UPDATES.delete(firstItem);
    }
  }

  if (update.callback_query) {
    return handleCallbackQuery(update.callback_query, env, botToken, workerOrigin);
  }

  const msg = update.message;
  if (!msg || !msg.from) return;

  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const firstName = msg.from.first_name || "User";
  const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
  let text = (msg.text || msg.caption || "").trim();

  // Ignore completely empty non-text/photo/document messages (like stickers, audio without text) to avoid wasting AI tokens
  if (!text && !msg.photo && !msg.document) {
    if (!isGroup) {
      return sendTelegramMessage(botToken, chatId, "💡 لطفاً پیام خود را به صورت متن، عکس یا فایل ارسال کنید.");
    }
    return;
  }

  let sys = await getSystemState(env);

  if (!sys.stats) sys.stats = { totalUsers: {}, totalRequests: 0 };
  sys.stats.totalUsers[userId] = Date.now();
  sys.stats.totalRequests = (sys.stats.totalRequests || 0) + 1;

  // اگر هنوز ادمینی تعیین نشده، اولین کاربری که به ربات پیام می‌دهد ادمین می‌شود
  if (!sys.adminId) {
    sys.adminId = userId;
    await storagePut(env, "SYS_STATE", sys);
    await syncMenuButtons(botToken, chatId, workerOrigin);
  }

  // رهگیری گام‌های تعاملی ویزارد افزودن سرور (Interactive Step-by-Step Wizard)
  const wizardRaw = await storageGet(env, `WIZARD_${userId}`);
  if (wizardRaw && text) {
    if (text === "/cancel" || text === "انصراف" || text === "لغو") {
      await storageDelete(env, `WIZARD_${userId}`);
      return sendTelegramMessage(botToken, chatId, "❌ فرآیند افزودن ارائه‌دهنده لغو شد.", [
        [{ text: "🌐 بازگشت به لیست سرورها", callback_data: "menu_providers" }]
      ]);
    }

    try {
      const wState = JSON.parse(wizardRaw);
      if (wState.step === "prov_name") {
        wState.name = text.trim();
        wState.step = "prov_url";
        await storagePut(env, `WIZARD_${userId}`, JSON.stringify(wState), { expirationTtl: 600 });
        return sendWizardStep2(botToken, chatId, wState.name);
      } else if (wState.step === "prov_url") {
        wState.baseUrl = smartNormalizeBaseUrl(text.trim());
        wState.step = "prov_key";
        await storagePut(env, `WIZARD_${userId}`, JSON.stringify(wState), { expirationTtl: 600 });
        return sendWizardStep3(botToken, chatId, wState.name, wState.baseUrl);
      } else if (wState.step === "prov_key") {
        const key = text.trim();
        await storageDelete(env, `WIZARD_${userId}`);
        return finishProviderWizard(env, sys, botToken, chatId, wState.name, wState.baseUrl, key);
      } else if (wState.step === "add_channel") {
        let ch = text.trim();
        if (!ch.startsWith("@") && !ch.startsWith("-100")) ch = "@" + ch;
        sys.sponsorChannels = sys.sponsorChannels || [];
        if (!sys.sponsorChannels.includes(ch)) {
          sys.sponsorChannels.push(ch);
        }
        sys.sponsorLock = true;
        await storagePut(env, "SYS_STATE", sys);
        await storageDelete(env, `WIZARD_${userId}`);
        await sendTelegramMessage(botToken, chatId, `✅ کانال \`${ch}\` با موفقیت به قفل جوین اجباری اضافه و فعال گردید.`);
        return sendSponsorMenu(botToken, chatId, sys);
      }
    } catch (e) {
      await storageDelete(env, `WIZARD_${userId}`);
    }
  }

  if (text === "/myid") {
    return sendTelegramMessage(botToken, chatId, `🆔 آیدی عددی شما: \`${userId}\`
👑 ادمین فعلی سیستم: \`${sys.adminId || "ثبت نشده"}\``);
  }

  if (text === "/admin") {
    if (!sys.adminId) {
      sys.adminId = userId;
      await storagePut(env, "SYS_STATE", sys);
      await syncMenuButtons(botToken, chatId, workerOrigin);
      const btn = [[{ text: "🎛 باز کردن مینی‌اپ مدیریت", web_app: { url: `${workerOrigin}/app` } }]];
      return sendTelegramMessage(botToken, chatId, `✅ آیدی \`${userId}\` به عنوان **ادمین اصلی سیستم** ثبت شد.`, btn);
    } else if (sys.adminId === userId) {
      await syncMenuButtons(botToken, chatId, workerOrigin);
      const btn = [[{ text: "🎛 باز کردن مینی‌اپ مدیریت", web_app: { url: `${workerOrigin}/app` } }]];
      return sendTelegramMessage(botToken, chatId, "✅ شما ادمین اصلی سیستم هستید.", btn);
    } else {
      return sendTelegramMessage(botToken, chatId, `⛔ سیستم قبلاً روی آیدی \`${sys.adminId}\` قفل شده است.`);
    }
  }

  const isAdmin = sys.adminId === userId;
  let member = !isAdmin ? sys.members[userId] : null;

  if (isAdmin && msg.photo && text.startsWith("/addphoto")) {
    const largestPhoto = msg.photo[msg.photo.length - 1];
    const label = text.replace("/addphoto", "").trim() || `عکس #${(sys.photoGallery?.length || 0) + 1}`;
    sys.photoGallery = sys.photoGallery || [];
    sys.photoGallery.push({ id: Date.now().toString(), fileId: largestPhoto.file_id, label });
    await storagePut(env, "SYS_STATE", sys);
    return sendTelegramMessage(botToken, chatId, `📸 عکس **${label}** با موفقیت در گالری ذخیره شد!`);
  }

  if (!isAdmin) {
    if (member && member.blocked) {
      return sendTelegramMessage(botToken, chatId, "⛔ حساب شما توسط مدیریت مسدود شده است.");
    }
    if (sys.publicMode === false && !member) {
      return sendTelegramMessage(botToken, chatId, "🔒 این ربات در حال حاضر در حالت خصوصی (فقط مدیر) قرار دارد.");
    }
    if (!member && sys.publicMode !== false) {
      sys.members = sys.members || {};
      sys.members[userId] = { name: firstName, dailyLimit: 0, dailyCount: 0, totalMessages: 0, blocked: false };
      member = sys.members[userId];
      await storagePut(env, "SYS_STATE", sys);
    }

    if (!isGroup) {
      const sponsor = await checkSponsorJoin(botToken, sys, userId);
      if (!sponsor.ok) {
        const kb = sponsor.unjoined.map(ch => {
          const cleanUser = ch.replace(/^@/, "").replace(/^-100/, "");
          const link = ch.startsWith("-100") ? `https://t.me/c/${cleanUser}` : `https://t.me/${cleanUser}`;
          return [{ text: `📢 عضویت در کانال ${ch}`, url: link }];
        });
        kb.push([{ text: "✅ تایید عضویت و شروع چت", callback_data: "check_sponsor" }]);
        const lockMsg = `🔒 **دسترسی به هوش مصنوعی نیازمند عضویت در کانال است!**\n\n` +
          `برای استفاده رایگان و نامحدود، لطفاً ابتدا در کانال(های) زیر عضو شوید:\n\n` +
          sponsor.unjoined.map(c => `• 📢 \`${c}\``).join("\n") + `\n\n` +
          `پس از عضویت، روی دکمه **«✅ تایید عضویت و شروع چت»** کلیک فرمایید:`;
        return sendTelegramMessage(botToken, chatId, lockMsg, kb);
      }
    }
  }

  if (!isAdmin && member && text.startsWith("/mykey ")) {
    const uKey = text.replace("/mykey ", "").trim();
    if (uKey === "off" || uKey === "clear") {
      delete member.customApiKey;
      await storagePut(env, "SYS_STATE", sys);
      return sendTelegramMessage(botToken, chatId, "🔄 کلید شخصی حذف شد.");
    }
    member.customApiKey = uKey;
    await storagePut(env, "SYS_STATE", sys);
    return sendTelegramMessage(botToken, chatId, "✅ کلید API اختصاصی شما ذخیره شد.");
  }

  if (!isAdmin && member && text.startsWith("/myurl ")) {
    const rawUrl = text.replace("/myurl ", "").trim();
    if (rawUrl === "off" || rawUrl === "clear") {
      delete member.customBaseUrl;
      await storagePut(env, "SYS_STATE", sys);
      return sendTelegramMessage(botToken, chatId, "🔄 آدرس API روی سرور پیش‌فرض سیستم تنظیم شد.");
    }
    const uUrl = smartNormalizeBaseUrl(rawUrl);
    member.customBaseUrl = uUrl;
    await storagePut(env, "SYS_STATE", sys);
    return sendTelegramMessage(botToken, chatId, `✅ ارائه‌دهنده اختصاصی شما تنظیم شد به:\n\`${uUrl}\``);
  }

  if (!isAdmin && member && text.startsWith("/mymodel ")) {
    const uModel = text.replace("/mymodel ", "").trim();
    member.customModel = uModel === "auto" ? "" : uModel;
    await storagePut(env, "SYS_STATE", sys);
    return sendTelegramMessage(botToken, chatId, `✅ مدل اختصاصی شما تنظیم شد به: **${uModel}**`);
  }

  if (isAdmin && (text === "/chat" || text === "/work" || text === "/custom" || text === "/persona")) {
    let userMem = await getActiveChatMemory(env, userId);
    if (text === "/work") {
      userMem.mode = "work";
      await saveActiveChatMemory(env, userId, userMem);
      return sendTelegramMessage(botToken, chatId, "💼 **حالت کارمند حرفه‌ای فعال شد.** (آماده انجام کارهای فنی، کدنویسی و تحلیل)");
    } else if (text === "/custom" || text === "/persona") {
      userMem.mode = "custom";
      await saveActiveChatMemory(env, userId, userMem);
      return sendTelegramMessage(botToken, chatId, "🎭 **حالت شخصیت سفارشی فعال شد.**");
    } else {
      userMem.mode = "chat";
      await saveActiveChatMemory(env, userId, userMem);
      return sendTelegramMessage(botToken, chatId, "💡 **حالت چت ساده و پرسش و پاسخ فعال شد.** (هر سوالی داری بپرس)");
    }
  }

  if (text === "/status") {
    return sendStatusCard(botToken, chatId, env, sys, isAdmin);
  }

  if (isAdmin && text === "/providers") {
    return sendProvidersMenu(botToken, chatId, sys);
  }

  if (text === "/start") {
    ACTIVE_USER_LOCKS.delete(userId);
    await storageDelete(env, `WIZARD_${userId}`);
    if (isAdmin) {
      await syncMenuButtons(botToken, chatId, workerOrigin);
    }
    return sendStartMenu(botToken, chatId, env, sys, isAdmin, firstName, workerOrigin);
  }

  if (isAdmin && (text === "/sponsor" || text === "/channels")) {
    return sendSponsorMenu(botToken, chatId, sys);
  }

  if (isAdmin && text.startsWith("/addchannel ")) {
    let ch = text.replace("/addchannel ", "").trim();
    if (!ch.startsWith("@") && !ch.startsWith("-100")) ch = "@" + ch;
    sys.sponsorChannels = sys.sponsorChannels || [];
    if (!sys.sponsorChannels.includes(ch)) sys.sponsorChannels.push(ch);
    sys.sponsorLock = true;
    await storagePut(env, "SYS_STATE", sys);
    await sendTelegramMessage(botToken, chatId, `✅ کانال \`${ch}\` با موفقیت به قفل جوین اجباری اضافه و فعال شد.`);
    return sendSponsorMenu(botToken, chatId, sys);
  }

  if (isAdmin && text.startsWith("/delchannel ")) {
    let ch = text.replace("/delchannel ", "").trim();
    if (!ch.startsWith("@") && !ch.startsWith("-100")) ch = "@" + ch;
    sys.sponsorChannels = (sys.sponsorChannels || []).filter(c => c !== ch);
    await storagePut(env, "SYS_STATE", sys);
    await sendTelegramMessage(botToken, chatId, `🗑 کانال \`${ch}\` حذف شد.`);
    return sendSponsorMenu(botToken, chatId, sys);
  }

  if (isAdmin && (text === "/public" || text.startsWith("/public "))) {
    const arg = text.replace("/public", "").trim().toLowerCase();
    if (arg === "on" || arg === "1" || arg === "true") sys.publicMode = true;
    else if (arg === "off" || arg === "0" || arg === "false") sys.publicMode = false;
    else sys.publicMode = !sys.publicMode;
    await storagePut(env, "SYS_STATE", sys);
    return sendTelegramMessage(botToken, chatId, sys.publicMode ? "🌍 دسترسی عمومی فعال شد (همه کاربران می‌توانند از هوش مصنوعی استفاده کنند)." : "🔒 دسترسی به ربات خصوصی شد (فقط مدیر مجاز است).");
  }

  if (text === "/clear" || text === "/newchat") {
    ACTIVE_USER_LOCKS.delete(userId);
    const currentMem = await getActiveChatMemory(env, userId);
    await createNewChatSession(env, userId, currentMem.mode || "chat");
    return sendTelegramMessage(botToken, chatId, "✨ گفتگوی جدید ساخته شد و حافظه قبلی در تاریخچه ذخیره ماند.");
  }

  if (text === "/model" || text === "/models") {
    await sendChatAction(botToken, chatId, "typing");
    const customUserConfig = (!isAdmin && member && (member.customApiKey || member.customBaseUrl))
      ? { apiKey: member.customApiKey || null, baseUrl: member.customBaseUrl || sys.baseUrl, model: member.customModel || "auto" }
      : null;
    return sendModelMenu(botToken, chatId, env, sys, true, customUserConfig, isAdmin, "all");
  }

  if (isAdmin && text.startsWith("/setmodel ")) {
    let customModel = text.replace("/setmodel ", "").trim();
    if (customModel === "free") customModel = "auto_free";
    if (customModel) {
      sys.selectedModel = customModel;
      await storagePut(env, "SYS_STATE", sys);
      const label = customModel === "auto_free" ? "🎁 انتخاب خودکار هوشمند (فقط رایگان)" : (customModel === "auto" ? "💎 انتخاب خودکار (همه مدل‌ها)" : customModel);
      return sendTelegramMessage(botToken, chatId, `✅ مدل فعال تنظیم شد به: **${label}**`);
    }
  }

  if (isAdmin && text === "/keys") {
    return sendKeysMenu(botToken, chatId, sys);
  }

  if (isAdmin && (text.startsWith("/setkey ") || text.startsWith("/addkey "))) {
    const newKey = text.replace(/^\/(setkey|addkey)\s+/, "").trim();
    if (newKey.length > 5) {
      sys.apiKeys = sys.apiKeys || [];
      const activeProv = (sys.providers || []).find(p => p.isDefault) || sys.providers?.[0];
      const keyLabel = activeProv ? `${activeProv.name} Key` : `Key #${sys.apiKeys.length + 1}`;

      const existingIdx = sys.apiKeys.findIndex(k => k.key === newKey);
      if (existingIdx >= 0) {
        sys.apiKeys[existingIdx].status = "active";
        sys.activeKeyIndex = existingIdx;
      } else {
        sys.apiKeys.unshift({ key: newKey, status: "active", label: keyLabel });
        sys.activeKeyIndex = 0;
      }
      if (activeProv) {
        activeProv.apiKey = newKey;
      }
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
      await storagePut(env, "SYS_STATE", sys);

      await sendTelegramMessage(botToken, chatId, "⏳ کلید ثبت شد! در حال واکشی و استخراج زنده مدل‌ها از ارائه‌دهنده...");
      const discovery = await fetchLiveModelsFromProvider(env, sys, true);
      if (discovery.models.length > 0) {
        return sendTelegramMessage(botToken, chatId, `✅ **کلید با موفقیت ثبت و تایید شد!**\n\n🎯 سرور فعال: **${activeProv?.name || "پیش‌فرض"}**\n🤖 تعداد مدل‌های شناسایی‌شده: **${discovery.models.length}**\n🎁 مدل‌های رایگان: **${discovery.freeModels.length}**\n\nبرای انتخاب مدل دستور \`/model\` را بفرستید.`);
      } else {
        return sendTelegramMessage(botToken, chatId, `⚠️ کلید ذخیره شد ولی لیستی از مدل‌ها دریافت نشد.\nعلت: ${discovery.error || "نامشخص"}`);
      }
    } else {
      return sendTelegramMessage(botToken, chatId, "⚠️ کلید وارد شده نامعتبر است. لطفاً کلید کامل را ارسال کنید:\n`/setkey AIzaSy...`");
    }
  }

  if (isAdmin && text.startsWith("/addprovider ")) {
    const rawArgs = text.replace("/addprovider ", "").trim();
    const parts = rawArgs.split(/\s+/);
    if (parts.length < 2) {
      return sendTelegramMessage(botToken, chatId, `📖 **راهنمای افزودن ارائه‌دهنده از تلگرام:**\n\nفرمت دستور:\n\`/addprovider <نام> <آدرس BaseUrl> [کلید API]\`\n\n**نمونه‌ها:**\n• \`/addprovider Groq https://api.groq.com/openai/v1 gsk_123...\`\n• \`/addprovider OpenRouter https://openrouter.ai/api/v1 sk-or-...\`\n• \`/addprovider Custom https://api.my-server.com/v1\``);
    }
    const name = parts[0];
    const rawUrl = parts[1];
    const key = parts[2] || "";
    const normUrl = smartNormalizeBaseUrl(rawUrl);

    const newProv = {
      id: `prov_${Date.now()}`,
      name: name,
      baseUrl: normUrl,
      apiKey: key,
      enabled: true,
      isDefault: true
    };
    sys.providers = sys.providers || [];
    sys.providers.forEach(p => p.isDefault = false);
    sys.providers.push(newProv);
    sys.baseUrl = normUrl;
    if (key) {
      sys.apiKeys = sys.apiKeys || [];
      sys.apiKeys.unshift({ key, status: "active", label: name });
      sys.activeKeyIndex = 0;
    }
    sys.cachedModels = [];
    sys.cachedFreeModels = [];
    await storagePut(env, "SYS_STATE", sys);

    await sendTelegramMessage(botToken, chatId, `⏳ ارائه‌دهنده **${name}** با آدرس \`${normUrl}\` اضافه شد. در حال استخراج مدل‌ها...`);
    const discovery = await fetchLiveModelsFromProvider(env, sys, true);
    if (discovery.models.length > 0) {
      return sendTelegramMessage(botToken, chatId, `🎉 **ارائه‌دهنده جدید متصل شد!**\n\n🌐 نام سرور: **${name}**\n🤖 مدل‌ها: **${discovery.models.length}** مدل (🎁 ${discovery.freeModels.length} رایگان)\n\nبا دستور \`/model\` مدل مورد نظرتان را انتخاب کنید.`);
    } else {
      return sendTelegramMessage(botToken, chatId, `✅ سرور **${name}** ثبت شد.\n⚠️ خطا در واکشی مدل‌ها: ${discovery.error || "بدون مدل"}`);
    }
  }

  if (isAdmin && text.startsWith("/seturl ")) {
    const rawUrl = text.replace("/seturl ", "").trim();
    if (!rawUrl) return sendTelegramMessage(botToken, chatId, "⚠️ لطفاً آدرس را وارد کنید: `/seturl https://...`");
    const normUrl = smartNormalizeBaseUrl(rawUrl);
    sys.baseUrl = normUrl;
    const activeProv = (sys.providers || []).find(p => p.isDefault);
    if (activeProv) activeProv.baseUrl = normUrl;
    sys.cachedModels = [];
    sys.cachedFreeModels = [];
    await storagePut(env, "SYS_STATE", sys);
    return sendTelegramMessage(botToken, chatId, `🌐 آدرس سرور پیش‌فرض سیستم تغییر کرد به:\n\`${normUrl}\``);
  }

  if (isAdmin && (text === "/testfree" || text === "/batchtest")) {
    return runBatchModelTest(botToken, chatId, env, sys, isAdmin, "free", 0);
  }

  if (isAdmin && text === "/testall") {
    return runBatchModelTest(botToken, chatId, env, sys, isAdmin, "all", 0);
  }

  if (isAdmin && (text === "/test" || text.startsWith("/test "))) {
    const modelToTest = text.replace("/test", "").trim() || sys.selectedModel || "gemini-2.5-flash";
    const activeProv = (sys.providers || []).find(p => p.isDefault) || sys.providers?.[0];
    const testBase = smartNormalizeBaseUrl(sys.baseUrl);
    const testKey = (sys.apiKeys && sys.apiKeys[0]?.key) || activeProv?.apiKey || "";

    if (!testKey) {
      return sendTelegramMessage(botToken, chatId, "❌ هیچ کلید API برای تست ثبت نشده است. ابتدا با دستور `/setkey YOUR_KEY` کلید خود را ثبت کنید.");
    }

    await sendTelegramMessage(botToken, chatId, `⏳ در حال ارسال پروب تستی و سنجش پینگ مدل \`${modelToTest}\`...`);
    const testRes = await testModelLatencyAndHealth(testBase, testKey, modelToTest);
    if (testRes.ok) {
      return sendTelegramMessage(botToken, chatId, `🟢 **تست پینگ موفقیت‌آمیز بود!**\n\n⚡ تاخیر پاسخ‌دهی (Latency): **${testRes.latencyMs}ms**\n🤖 مدل: \`${modelToTest}\`\n🌐 سرور: \`${testBase}\`\n💬 پاسخ کوتاه تست: _${testRes.reply || "OK"}_`);
    } else {
      return sendTelegramMessage(botToken, chatId, `❌ **خطا در تست مدل:**\n\n🤖 مدل: \`${modelToTest}\`\n⏱ تاخیر: ${testRes.latencyMs}ms\n⚠️ جزئیات خطا: ${testRes.error || "نامشخص"}`);
    }
  }

  if (isAdmin && (text === "/panel" || text === "/admin")) {
    await syncMenuButtons(botToken, chatId, workerOrigin);
    const btn = [[{ text: "🎛 باز کردن مینی‌اپ مدیریت", web_app: { url: `${workerOrigin}/app` } }]];
    return sendTelegramMessage(botToken, chatId, `🎛 **پنل مدیریت ربات و مینی‌اپ:**\n\nمی‌توانید از دکمه زیر پنل را باز کنید، یا آدرس زیر را در مرورگر باز نمایید:\n${workerOrigin}/app`, btn);
  }

  if (isAdmin && text.startsWith("/remind ")) {
    const parts = text.split(" ");
    const mins = parseInt(parts[1]);
    const note = parts.slice(2).join(" ");
    if (!isNaN(mins) && note) {
      sys.crons = sys.crons || [];
      sys.crons.push({
        id: Date.now().toString(),
        type: "reminder",
        triggerAt: Date.now() + mins * 60000,
        message: note,
        active: true
      });
      await storagePut(env, "SYS_STATE", sys);
      return sendTelegramMessage(botToken, chatId, `⏰ یادآور ثبت شد! **${mins} دقیقه** دیگر به شما پیام می‌دهم.`);
    }
  }

  if (isGroup) {
    let botUsername = sys.botUsername;
    let botId = sys.botId;
    if (!botUsername) {
      const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`).then(r => r.json()).catch(() => ({}));
      if (meRes.result?.username) {
        botUsername = meRes.result.username;
        botId = meRes.result.id;
        sys.botUsername = botUsername;
        sys.botId = botId;
        await storagePut(env, "SYS_STATE", sys);
      }
    }
    const botTag = botUsername ? `@${botUsername.toLowerCase()}` : "";
    const isReplyToBot = msg.reply_to_message && String(msg.reply_to_message.from?.id) === String(botId);
    const isMentioned = botTag && text.toLowerCase().includes(botTag);
    if (!isReplyToBot && !isMentioned) return;
    if (isMentioned && botUsername) {
      text = text.replace(new RegExp(botTag, "gi"), "").trim();
    }
  }

  const customUserConfig = (!isAdmin && member && (member.customApiKey || member.customBaseUrl))
    ? {
        apiKey: member.customApiKey || null,
        baseUrl: member.customBaseUrl || sys.baseUrl,
        model: member.customModel || "auto"
      }
    : null;

  if ((!sys.apiKeys || sys.apiKeys.length === 0) && !customUserConfig?.apiKey) {
    const btn = isAdmin ? [[{ text: "🔑 افزودن کلید در پنل مدیریت", web_app: { url: `${workerOrigin}/app` } }]] : [];
    return sendTelegramMessage(botToken, chatId, "⚠️ هنوز هیچ کلید API ثبت نشده است. از پنل وب یا دستور /addkey کلید اضافه کنید.", btn);
  }

  if (!isAdmin && member) {
    if (!member.customApiKey) {
      const today = new Date().toISOString().slice(0, 10);
      if (member.lastDate !== today) {
        member.lastDate = today;
        member.dailyCount = 0;
      }
      if (member.dailyLimit > 0 && member.dailyCount >= member.dailyLimit) {
        return sendTelegramMessage(botToken, chatId, "⚠️ سقف پیام روزانه شما تمام شده است.");
      }
      member.dailyCount++;
    }
    member.totalMessages = (member.totalMessages || 0) + 1;
  }
  await storagePut(env, "SYS_STATE", sys);

  const lockTimestamp = ACTIVE_USER_LOCKS.get(userId);
  if (lockTimestamp && (Date.now() - lockTimestamp) < 25000) {
    await sendTelegramMessage(botToken, chatId, "⏳ لطفاً صبر کنید؛ هنوز در حال آماده کردن پاسخ پیام قبلی شما هستم...");
    return;
  }

  const reqId = `${userId}_${Date.now()}`;
  ACTIVE_USER_LOCKS.set(userId, Date.now());

  let userMem = await getActiveChatMemory(env, userId);
  const currentMode = userMem.mode || "chat";

  let statusMsgId = null;
  if (currentMode === "work" || text.length > 90 || msg.document || msg.photo) {
    const statusRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: currentMode === "work" ? "💼 در حال بررسی و انجام کار..." : "⏳ در حال پردازش...",
        reply_markup: { inline_keyboard: [[{ text: "❌ لغو درخواست", callback_data: `cancel_req:${reqId}` }]] }
      })
    }).then(r => r.json()).catch(() => ({}));
    statusMsgId = statusRes.result?.message_id || null;
  }

  try {
    await sendChatAction(botToken, chatId, "typing");

    let enrichedUserPrompt = text;
    let imageBase64 = null;

    if (msg.photo) {
      const largestPhoto = msg.photo[msg.photo.length - 1];
      imageBase64 = await downloadTelegramFileAsBase64(botToken, largestPhoto.file_id);
      enrichedUserPrompt = (text || "این تصویر را با دقت تحلیل کن.") + "\n[پیوست: تصویر]";
    } else if (msg.document) {
      const fileContent = await extractDocumentContent(botToken, msg.document);
      enrichedUserPrompt = `${text}

--- محتوای فایل ارسالی (${msg.document.file_name}) ---
${fileContent}`;
    }

    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      const webText = await fetchWebPageSummary(urlMatch[0]);
      enrichedUserPrompt += `

--- محتوای لینک (${urlMatch[0]}) ---
${webText}`;
    }

    const marketData = await checkAndFetchMarketPrices(text);
    if (marketData) {
      enrichedUserPrompt += `

--- داده‌های زنده بازار ---
${marketData}`;
    }

    if (userMem.messages.length === 0 && text) {
      await updateSessionTitle(env, userId, userMem.sessionId, text.slice(0, 28));
    }

    const systemPrompt = buildSystemPrompt(sys, userMem, isAdmin, firstName, currentMode);
    userMem.messages.push({ role: "user", content: enrichedUserPrompt });
    const recentMessages = userMem.messages.slice(-14);

    const aiResponse = await callAIWithFailover(
      env,
      sys,
      systemPrompt,
      recentMessages,
      imageBase64,
      isAdmin,
      currentMode,
      customUserConfig
    );

    const isCancelled = await storageGet(env, `CANCEL_${reqId}`);
    if (isCancelled) {
      await storageDelete(env, `CANCEL_${reqId}`);
      userMem.messages.pop();
      await saveActiveChatMemory(env, userId, userMem);
      return;
    }

    if (statusMsgId) {
      await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: statusMsgId })
      }).catch(() => {});
    }

    if (!aiResponse.success) {
      userMem.messages.pop();
      await saveActiveChatMemory(env, userId, userMem);
      await sendTelegramMessage(
        botToken,
        chatId,
        `⚠️ **خطا در دریافت پاسخ از هوش مصنوعی:**\n${aiResponse.error}\n\n💡 **راهنما:**\n• جهت انتخاب یک مدل دیگر از دستور \`/model\` استفاده نمایید.\n• برای بررسی وضعیت پینگ سرور و کلید از دستور \`/status\` استفاده کنید.`
      );
      return;
    }

    const replyText = aiResponse.content;
    userMem.messages.push({ role: "assistant", content: replyText });
    await compactAndSaveMemory(env, sys, userId, userMem, customUserConfig);

    if (isAdmin && replyText.includes("<<<SEND_GALLERY_PHOTO>>>")) {
      await handleGalleryPhotoOutput(botToken, chatId, sys, replyText);
      return;
    }

    if (replyText.includes("<<<GENERATE_PHOTO>>>")) {
      await handleGeneratedPhotoOutput(botToken, chatId, sys, replyText, customUserConfig);
      return;
    }

    if (replyText.includes("<<<ZIP_PROJECT>>>")) {
      await handleZipProjectOutput(botToken, chatId, replyText);
      return;
    }

    if (isAdmin && replyText.includes("<<<LINUX_BRIDGE>>>") && sys.linuxBridgeUrl) {
      await forwardToLinuxBridge(botToken, chatId, sys, replyText);
      return;
    }

    const quickButtons = [];
    if (replyText.includes("```")) {
      quickButtons.push([{ text: "📦 دریافت به صورت ZIP", callback_data: "make_zip_last" }]);
    }

    // شفاف‌سازی کامل مدل پاسخ‌دهنده، نام ارائه‌دهنده، وضعیت رایگان بودن، Failover و تاخیر
    const rawBaseUrl = customUserConfig?.baseUrl || sys.baseUrl || CONFIG.DEFAULT_BASE_URL;
    const providerHost = rawBaseUrl.replace(/^https?:\/\//, "").split("/")[0];
    const usedModel = aiResponse.model || sys.selectedModel || "auto_free";
    const latency = aiResponse.latencyMs || 0;
    const isFreeTag = (sys.cachedFreeModels || []).includes(usedModel) || usedModel.includes(":free") || usedModel.includes("-free") ? " (🎁 رایگان)" : "";

    let footer = "";
    if (aiResponse.isFailover) {
      if (aiResponse.failoverReason === "rate_limit_429") {
        footer = `\n\n—\n⚠️ _مدل انتخابی شما (\`${aiResponse.requestedModel}\`) موقتاً با محدودیت نرخ ارائه‌دهنده (۴۲۹) مواجه شد؛ جهت جلوگیری از معطلی، پاسخ با موفقیت از مدل جایگزین دریافت شد:_\n🤖 مدل پاسخ‌دهنده: \`${usedModel}\`${isFreeTag} | 🌐 \`${providerHost}\` | ⚡ ${latency}ms`;
      } else {
        footer = `\n\n—\n⚠️ _مدل انتخابی شما (\`${aiResponse.requestedModel}\`) در سرور با تاخیر یا شلوغی مواجه شد؛ سیستم هوشمند پاسخ را از مدل پشتیبان دریافت کرد:_\n🤖 مدل پاسخ‌دهنده: \`${usedModel}\`${isFreeTag} | 🌐 \`${providerHost}\` | ⚡ ${latency}ms`;
      }
    } else if (aiResponse.failoverReason === "rate_limit_429") {
      footer = `\n\n—\n🤖 مدل: \`${usedModel}\`${isFreeTag} (سوئیچ خودکار ضد ۴۲۹) | 🌐 \`${providerHost}\` | ⚡ ${latency}ms`;
    } else {
      footer = `\n\n—\n🤖 مدل: \`${usedModel}\`${isFreeTag} | 🌐 \`${providerHost}\` | ⚡ ${latency}ms`;
    }

    await sendTelegramMessage(botToken, chatId, replyText + footer, quickButtons);
  } catch (err) {
    await sendTelegramMessage(botToken, chatId, `⚠️ خطای داخلی در پردازش پیام: ${err.message}`);
  } finally {
    ACTIVE_USER_LOCKS.delete(userId);
  }
}


async function getActiveChatMemory(env, userId) {
  let activeSessId = await storageGet(env, `ACTIVE_SESS_${userId}`);
  if (!activeSessId) {
    activeSessId = await createNewChatSession(env, userId, "chat");
  }
  const raw = await storageGet(env, `SESS_DATA_${userId}_${activeSessId}`);
  if (raw) {
    const parsed = JSON.parse(raw);
    parsed.sessionId = activeSessId;
    if (!parsed.mode) parsed.mode = "chat";
    return parsed;
  }
  return { sessionId: activeSessId, summary: "", profile: "", messages: [], mode: "chat" };
}

async function saveActiveChatMemory(env, userId, userMem) {
  const sessId = userMem.sessionId || (await storageGet(env, `ACTIVE_SESS_${userId}`)) || "default";
  await storagePut(env, `SESS_DATA_${userId}_${sessId}`, userMem);
}

async function createNewChatSession(env, userId, keepMode = "chat") {
  const newSessId = `sess_${Date.now()}`;
  await storagePut(env, `ACTIVE_SESS_${userId}`, newSessId);
  const listRaw = await storageGet(env, `SESS_LIST_${userId}`);
  let list = listRaw ? JSON.parse(listRaw) : [];
  list.unshift({ id: newSessId, title: "گفتگوی جدید 💬", date: new Date().toLocaleDateString("fa-IR") });
  if (list.length > 15) list = list.slice(0, 15);
  await storagePut(env, `SESS_LIST_${userId}`, list);
  await storagePut(env, `SESS_DATA_${userId}_${newSessId}`, { sessionId: newSessId, summary: "", profile: "", messages: [], mode: keepMode });
  return newSessId;
}

async function updateSessionTitle(env, userId, sessId, newTitle) {
  const listRaw = await storageGet(env, `SESS_LIST_${userId}`);
  if (!listRaw) return;
  let list = JSON.parse(listRaw);
  const item = list.find(s => s.id === sessId);
  if (item) {
    item.title = newTitle;
    await storagePut(env, `SESS_LIST_${userId}`, list);
  }
}

async function sendHistoryMenu(botToken, env, chatId, userId, messageIdToEdit = null) {
  const listRaw = await storageGet(env, `SESS_LIST_${userId}`);
  const activeSessId = await storageGet(env, `ACTIVE_SESS_${userId}`);
  const list = listRaw ? JSON.parse(listRaw) : [];

  if (list.length === 0) {
    const text = "📜 هنوز تاریخچه‌ای ثبت نشده است.";
    const buttons = [[{ text: "🔙 بازگشت به منوی اصلی", callback_data: "menu_start" }]];
    return editOrSendMessage(botToken, chatId, text, buttons, messageIdToEdit);
  }

  const buttons = list.slice(0, 10).map(s => [{
    text: `${s.id === activeSessId ? "✅ " : ""}${s.title} (${s.date})`,
    callback_data: `switch_sess:${s.id}`
  }]);
  buttons.push([{ text: "➕ شروع گفتگوی جدید", callback_data: "new_chat" }]);
  buttons.push([{ text: "🔙 بازگشت به منوی اصلی", callback_data: "menu_start" }]);

  return editOrSendMessage(botToken, chatId, "📜 **تاریخچه گفتگوهای شما:**", buttons, messageIdToEdit);
}

async function handleGalleryPhotoOutput(botToken, chatId, sys, replyText) {
  const cleanCaption = replyText.replace(/<<<SEND_GALLERY_PHOTO>>>/g, "").trim() || "بفرما ✨";
  const gallery = sys.photoGallery || [];
  if (gallery.length === 0) {
    return sendTelegramMessage(botToken, chatId, cleanCaption + "\n\n*(هنوز عکسی در گالری ثبت نشده؛ با `/addphoto` عکس اضافه کن)*");
  }
  const chosen = gallery[Math.floor(Math.random() * gallery.length)];
  await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      photo: chosen.fileId,
      caption: cleanCaption
    })
  });
}

async function handleGeneratedPhotoOutput(botToken, chatId, sys, replyText, customUserConfig = null) {
  await sendChatAction(botToken, chatId, "upload_photo");
  try {
    const parts = replyText.split("<<<GENERATE_PHOTO>>>");
    const caption = parts[0].trim() || "تصویر آماده شد ✨";
    const fullImagePrompt = parts[1].trim();

    const activeKey = customUserConfig?.apiKey ? customUserConfig.apiKey : getOrderedKeys(sys)[0]?.key;
    if (!activeKey) {
      return sendTelegramMessage(botToken, chatId, caption);
    }

    const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(activeKey)}`;
    const res = await fetch(imagenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt: fullImagePrompt }],
        parameters: { sampleCount: 1, aspectRatio: "3:4" }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        const binaryStr = atob(b64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("caption", caption);
        formData.append("photo", new Blob([bytes], { type: "image/jpeg" }), "photo.jpg");

        await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: "POST", body: formData });
        return;
      }
    }

    if (sys.photoGallery && sys.photoGallery.length > 0) {
      return handleGalleryPhotoOutput(botToken, chatId, sys, caption);
    }

    await sendTelegramMessage(botToken, chatId, `${caption}\n\n*(تولید تصویر روی این کلید API فعال نیست)*`);
  } catch (e) {
    await sendTelegramMessage(botToken, chatId, replyText.split("<<<GENERATE_PHOTO>>>")[0].trim());
  }
}

function buildCleanMessages(systemPrompt, messages, imageBase64, isAdmin, currentMode) {
  const finalSystem = (isAdmin && currentMode === "custom")
    ? `[سناریوی داستان‌نویسی تعاملی و ایفای نقش]\n${systemPrompt}\n\nقانون: خروجی باید ۱۰۰٪ به زبان فارسی محاوره‌ای باشد و فقط به تاریخچه همین گفتگو استناد شود.`
    : systemPrompt;

  const finalMessages = [
    { role: "system", content: finalSystem },
    ...messages
  ];

  if (imageBase64) {
    const lastIdx = finalMessages.length - 1;
    const lastText = finalMessages[lastIdx].content;
    finalMessages[lastIdx].content = [
      { type: "text", text: lastText },
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
    ];
  }

  return finalMessages;
}

async function callAIWithFailover(env, sys, systemPrompt, messages, imageBase64, isAdmin, currentMode = "chat", customUserConfig = null) {
  const rawBaseUrl = customUserConfig?.baseUrl || sys.baseUrl || CONFIG.DEFAULT_BASE_URL;
  const baseUrl = smartNormalizeBaseUrl(rawBaseUrl);
  const keysToTry = customUserConfig?.apiKey
    ? [{ key: customUserConfig.apiKey, status: "active", label: "PersonalUserKey" }]
    : getOrderedKeys(sys);

  const discovery = await fetchLiveModelsFromProvider(env, sys, false, customUserConfig);
  const liveModels = discovery.models.length > 0 ? discovery.models : CONFIG.FALLBACK_MODELS;

  const preferredModel = customUserConfig?.model || sys.selectedModel || "auto_free";
  const freeModels = discovery.freeModels || [];
  const modelQueue = buildDiverseModelQueue(preferredModel, liveModels, freeModels);

  const formattedMessages = buildCleanMessages(systemPrompt, messages, imageBase64, isAdmin, currentMode);

  let keysUpdated = false;
  let lastErrorDetail = discovery.error || "";
  let lastRateLimitedModel = null;
  const startTime = Date.now();
  const isAutoMode = preferredModel === "auto" || preferredModel === "auto_free";
  const maxAttempts = isAutoMode ? 6 : 5;
  const modelsToAttempt = modelQueue.slice(0, maxAttempts);

  for (const keyObj of keysToTry) {
    for (let i = 0; i < modelsToAttempt.length; i++) {
      const model = modelsToAttempt[i];
      const isPreferred = !isAutoMode && model === preferredModel;
      const isFailover = !isAutoMode && model !== preferredModel;
      // مدل انتخابی دستی کاربر تا ۱۸ ثانیه فرصت دارد؛ حالت خودکار و جایگزین‌ها ۹ ثانیه
      const timeoutMs = isPreferred ? 18000 : 9000;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // فقط مدل‌های o1 و o3 متعلق به OpenAI نیازمند نقش developer و max_completion_tokens هستند
        const isOpenAIO = /^(o1|o3)/i.test(model);
        const isDeepSeekR1 = /(deepseek-r1|deepseek-reasoner)/i.test(model);

        const processedMessages = formattedMessages.map(m => {
          if (isOpenAIO && m.role === "system") {
            return { role: "developer", content: m.content || " " };
          }
          return { role: m.role, content: m.content || " " };
        });

        // سقف توکن بالا (۴۰۹۶) برای تضمین پاسخ کامل و جامع و جلوگیری از بریده‌شدن متن‌های طولانی
        const targetMaxTokens = isAdmin ? 8192 : 4096;

        const payload = {
          model: model,
          messages: processedMessages
        };

        if (isOpenAIO) {
          payload.max_completion_tokens = targetMaxTokens;
        } else {
          payload.temperature = isDeepSeekR1 ? 0.6 : (currentMode === "custom" ? 0.85 : (currentMode === "work" ? 0.2 : 0.7));
          payload.max_tokens = targetMaxTokens;
        }

        const headers = {
          "Content-Type": "application/json",
          "User-Agent": "EdgePulseAgent/8.0 (OpenAI-Compatible-Client)",
          "HTTP-Referer": "https://github.com/edgepulse/agent",
          "X-Title": "EdgePulse AI Agent"
        };
        if (keyObj.key && keyObj.key.trim()) {
          headers["Authorization"] = `Bearer ${keyObj.key.trim()}`;
        }

        let res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Auto-healing 400 errors (unsupported parameter handling)
        if (res.status === 400) {
          const errText = await res.text().catch(() => "");
          lastErrorDetail = `مدل ${model} -> کد 400: ${errText.slice(0, 140)}`;

          if (errText.includes("temperature") || errText.includes("max_tokens") || errText.includes("max_completion_tokens") || errText.includes("developer") || errText.includes("system")) {
            const healedMessages = formattedMessages.map(m => m.role === "system" ? { role: "user", content: `[دستورالعمل سیستم]:\n${m.content}` } : m);
            const healedPayload = {
              model: model,
              messages: healedMessages,
              max_tokens: targetMaxTokens
            };
            try {
              const healRes = await fetch(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers,
                body: JSON.stringify(healedPayload)
              });
              if (healRes.ok) {
                const healData = await healRes.json();
                const rawReply = healData.choices?.[0]?.message?.content;
                const reply = cleanModelOutput(rawReply);
                if (reply) {
                  if (keysUpdated) await storagePut(env, "SYS_STATE", sys);
                  return {
                    success: true,
                    content: reply,
                    model: model,
                    requestedModel: preferredModel,
                    isFailover: isFailover,
                    failoverReason: lastRateLimitedModel ? "rate_limit_429" : (i > 0 ? "fallback" : null),
                    baseUrl: baseUrl,
                    latencyMs: Date.now() - startTime
                  };
                }
              }
            } catch (hErr) {}
          }
          continue;
        }

        if (res.status === 401 || res.status === 402) {
          if (!customUserConfig?.apiKey) {
            keyObj.status = "exhausted";
            keysUpdated = true;
          }
          lastErrorDetail = `کد ${res.status} (کلید نامعتبر یا بدون اعتبار)`;
          break;
        }

        if (res.status === 429) {
          markModelRateLimited(model, 60000);
          lastRateLimitedModel = model;
          lastErrorDetail = `محدودیت نرخ (429) روی مدل ${model}`;
          // تاخیر کوتاه محافظتی ۲۰۰ میلی‌ثانیه‌ای و سوئیچ فوری به خانواده ارائه‌دهنده بعدی
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          lastErrorDetail = `مدل ${model} -> کد ${res.status}: ${errText.slice(0, 140)}`;
          continue;
        }

        const data = await res.json();
        const rawReply = data.choices?.[0]?.message?.content;
        const reply = cleanModelOutput(rawReply);
        if (reply) {
          if (keysUpdated) await storagePut(env, "SYS_STATE", sys);
          return {
            success: true,
            content: reply,
            model: model,
            requestedModel: preferredModel,
            isFailover: isFailover,
            failoverReason: lastRateLimitedModel ? "rate_limit_429" : (i > 0 ? "fallback" : null),
            baseUrl: baseUrl,
            latencyMs: Date.now() - startTime
          };
        }
      } catch (err) {
        lastErrorDetail = `خطای شبکه/تایم‌اوت روی مدل ${model}: ${err.message}`;
        continue;
      }
    }
  }

  if (keysUpdated) await storagePut(env, "SYS_STATE", sys);
  const failureHint = (lastErrorDetail && lastErrorDetail.includes("429"))
    ? "\n💡 نکته: سهمیه درخواست در دقیقه (Rate Limit 429) تمام مدل‌های آزموده‌شده پر بود. لطفاً ۳۰ تا ۶۰ ثانیه شکیبا باشید یا از ارائه‌دهنده دیگری استفاده کنید."
    : "";
  return {
    success: false,
    error: `مدل‌ها در سرور \`${baseUrl}\` پاسخ ندادند.\nجزئیات آخرین خطا: ${lastErrorDetail || "نامشخص"}${failureHint}`
  };
}

function buildSystemPrompt(sys, userMem, isAdmin, firstName, currentMode = "chat") {
  let prompt = "";
  const hasGallery = Array.isArray(sys.photoGallery) && sys.photoGallery.length > 0;

  if (isAdmin) {
    if (currentMode === "work") {
      prompt += `${sys.workSoul || CONFIG.DEFAULT_WORK_SOUL}\n\n`;
    } else if (currentMode === "custom") {
      prompt += `${sys.customSoul || CONFIG.DEFAULT_CUSTOM_SOUL}\n\n`;
      if (hasGallery) {
        prompt += `- اگر عکس از گالری درخواست شد از تگ <<<SEND_GALLERY_PHOTO>>> استفاده کن.\n`;
      }
    } else {
      prompt += `${sys.chatSoul || CONFIG.DEFAULT_CHAT_SOUL}\n\n`;
    }

    prompt += `- اگر درخواست ساخت تصویر داده شد، متن فارسی کوتاه بنویس و در انتها تگ <<<GENERATE_PHOTO>>> را به همراه توصیف انگلیسی تصویر قرار بده.\n`;
    prompt += `- اگر بخش «داده‌های زنده بازار» در پیام وجود داشت، اعداد دقیق آن را گزارش و تحلیل کن.\n`;
    prompt += `- برای تحویل پروژه در قالب ZIP، خروجی را با تگ <<<ZIP_PROJECT>>> و JSON زیر بده:\n<<<ZIP_PROJECT>>>\n{"projectName":"project","files":[{"name":"index.html","content":"..."}]}\n`;
    if (sys.linuxBridgeUrl) {
      prompt += `- پل لینوکس متصل است. برای اجرای دستور روی سرور تگ <<<LINUX_BRIDGE>>> و JSON {"action":"post_story|send_msg|read_channels","target":"...","text":"..."} بده.\n`;
    }
  } else {
    const publicSoul = sys.soul || CONFIG.DEFAULT_GUEST_SOUL;
    prompt += `${publicSoul}\n\n`;
    prompt += `[کاربر: ${firstName}]\nقوانین: کاملاً مودب، رسمی و مفید پاسخ بده و هیچ اطلاعاتی درباره ادمین یا سرور فاش نکن.\n`;
  }

  if (userMem.profile) prompt += `\n[اطلاعات کاربر]:\n${userMem.profile}\n`;
  if (userMem.summary) prompt += `\n[خلاصه گفتگوهای قبلی]:\n${userMem.summary}\n`;
  return prompt;
}

async function compactAndSaveMemory(env, sys, userId, userMem, customUserConfig = null) {
  const rawBaseUrl = customUserConfig?.baseUrl || sys.baseUrl || CONFIG.DEFAULT_BASE_URL;
  const baseUrl = smartNormalizeBaseUrl(rawBaseUrl);
  if (userMem.messages.length > 14) {
    const oldChunk = userMem.messages.slice(0, 8);
    const activeKey = customUserConfig?.apiKey ? { key: customUserConfig.apiKey } : getOrderedKeys(sys)[0];
    const modelToUse = (customUserConfig?.model && customUserConfig.model !== "auto")
      ? customUserConfig.model
      : ((sys.selectedModel && sys.selectedModel !== "auto") ? sys.selectedModel : (sys.cachedModels?.[0] || CONFIG.FALLBACK_MODELS[0]));
    if (activeKey && modelToUse) {
      try {
        const headers = { "Content-Type": "application/json", "User-Agent": "EdgePulseAgent/8.0" };
        if (activeKey.key && activeKey.key.trim()) {
          headers["Authorization"] = `Bearer ${activeKey.key.trim()}`;
        }
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: "system", content: "گفتگوی زیر را به همراه خلاصه قبلی در حداکثر ۵ خط بسیار فشرده به زبان فارسی خلاصه کن تا تمام جزئیات مهم و تصمیمات حفظ شوند." },
              { role: "user", content: `خلاصه قبلی: ${userMem.summary}\n\nجدید:\n${JSON.stringify(oldChunk)}` }
            ],
            max_tokens: 350
          })
        });
        if (res.ok) {
          const data = await res.json();
          const cleanSum = cleanModelOutput(data.choices?.[0]?.message?.content);
          if (cleanSum) {
            userMem.summary = cleanSum;
            userMem.messages = userMem.messages.slice(8);
          }
        } else {
          // If summarization failed, only slice 2 oldest messages to avoid losing all context
          userMem.messages = userMem.messages.slice(2);
        }
      } catch (e) {
        userMem.messages = userMem.messages.slice(2);
      }
    }
  }
  await saveActiveChatMemory(env, userId, userMem);
}

async function checkAndFetchMarketPrices(text) {
  const lower = text.toLowerCase();
  let results = [];

  const forexMap = {
    "طلا": "OANDA:XAUUSD", "xau": "OANDA:XAUUSD", "gold": "OANDA:XAUUSD",
    "نقره": "OANDA:XAGUSD", "xag": "OANDA:XAGUSD",
    "یورو": "OANDA:EURUSD", "eurusd": "OANDA:EURUSD",
    "پوند": "OANDA:GBPUSD", "gbpusd": "OANDA:GBPUSD",
    "ین": "OANDA:USDJPY", "usdjpy": "OANDA:USDJPY",
    "نفت": "OANDA:WTICOUSD", "oil": "OANDA:WTICOUSD",
    "داوجونز": "OANDA:US30USD", "us30": "OANDA:US30USD",
    "نزدک": "OANDA:NAS100USD", "nas100": "OANDA:NAS100USD"
  };

  for (const [keyword, tvSymbol] of Object.entries(forexMap)) {
    if (lower.includes(keyword)) {
      const price = await fetchTradingViewOandaPrice(tvSymbol);
      if (price) results.push(`📊 ${tvSymbol} (TradingView - OANDA): ${price}`);
    }
  }

  const cryptoMap = {
    "بیت کوین": "bitcoin", "بیت‌کوین": "bitcoin", "btc": "bitcoin", "bitcoin": "bitcoin",
    "اتریوم": "ethereum", "eth": "ethereum", "ethereum": "ethereum",
    "سولانا": "solana", "sol": "solana",
    "تون": "the-open-network", "ton": "the-open-network",
    "ریپل": "ripple", "xrp": "ripple"
  };

  for (const [keyword, cgId] of Object.entries(cryptoMap)) {
    if (lower.includes(keyword)) {
      const data = await fetchCoinGeckoPrice(cgId);
      if (data) results.push(`🪙 ${cgId.toUpperCase()}: $${data.price} (تغییر ۲۴ساعته: ${data.change}%)`);
    }
  }

  return results.length > 0 ? results.join("\n") : null;
}

async function fetchTradingViewOandaPrice(tvSymbol) {
  try {
    const res = await fetch("https://scanner.tradingview.com/symbol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: { tickers: [tvSymbol] }, columns: ["close", "change", "high", "low"] })
    });
    if (!res.ok) return null;
    const data = await res.json();
    const row = data.data?.[0]?.d;
    if (row && row[0]) return `${row[0]} (تغییر: ${Number(row[1]).toFixed(2)}% | سقف: ${row[2]} | کف: ${row[3]})`;
  } catch (e) {}
  return null;
}

async function fetchCoinGeckoPrice(coinId) {
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data[coinId]) {
      return {
        price: Number(data[coinId].usd).toLocaleString("en-US"),
        change: Number(data[coinId].usd_24h_change || 0).toFixed(2)
      };
    }
  } catch (e) {}
  return null;
}

async function extractDocumentContent(botToken, doc) {
  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${doc.file_id}`);
    const info = await infoRes.json();
    const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${info.result.file_path}`);
    const buffer = await fileRes.arrayBuffer();
    const rawText = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    return rawText.slice(0, 12000);
  } catch (e) { return "[خطا در خواندن فایل]"; }
}

async function downloadTelegramFileAsBase64(botToken, fileId) {
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const info = await infoRes.json();
  const res = await fetch(`https://api.telegram.org/file/bot${botToken}/${info.result.file_path}`);
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function fetchWebPageSummary(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch (e) { return "امکان باز کردن این لینک وجود نداشت."; }
}

async function handleZipProjectOutput(botToken, chatId, replyText) {
  try {
    const afterTag = replyText.split("<<<ZIP_PROJECT>>>")[1] || "";
    const jsonMatch = afterTag.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");
    const project = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(project.files) || project.files.length === 0) throw new Error("No files in project");
    const zipBytes = createZipArchive(project.files);

    const formData = new FormData();
    formData.append("chat_id", chatId);
    formData.append("caption", `📦 پروژه **${project.projectName || "project"}.zip** آماده شد (${project.files.length} فایل).`);
    formData.append("parse_mode", "Markdown");
    formData.append("document", new Blob([zipBytes], { type: "application/zip" }), `${project.projectName || "project"}.zip`);

    await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, { method: "POST", body: formData });
  } catch (e) {
    await sendTelegramMessage(botToken, chatId, replyText.replace(/<<<ZIP_PROJECT>>>/g, ""));
  }
}

function createZipArchive(files) {
  const encoder = new TextEncoder();
  const fileEntries = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);

    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, contentBytes.length, true);
    view.setUint32(22, contentBytes.length, true);
    view.setUint16(26, nameBytes.length, true);
    header.set(nameBytes, 30);

    fileEntries.push({ header, contentBytes, nameBytes, crc, offset });
    offset += header.length + contentBytes.length;
  }

  const centralDir = [];
  let centralSize = 0;
  for (const entry of fileEntries) {
    const cd = new Uint8Array(46 + entry.nameBytes.length);
    const view = new DataView(cd.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.contentBytes.length, true);
    view.setUint32(24, entry.contentBytes.length, true);
    view.setUint16(28, entry.nameBytes.length, true);
    view.setUint32(42, entry.offset, true);
    cd.set(entry.nameBytes, 46);
    centralDir.push(cd);
    centralSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, fileEntries.length, true);
  eocdView.setUint16(10, fileEntries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);

  const finalZip = new Uint8Array(offset + centralSize + 22);
  let pos = 0;
  for (const entry of fileEntries) {
    finalZip.set(entry.header, pos); pos += entry.header.length;
    finalZip.set(entry.contentBytes, pos); pos += entry.contentBytes.length;
  }
  for (const cd of centralDir) {
    finalZip.set(cd, pos); pos += cd.length;
  }
  finalZip.set(eocd, pos);
  return finalZip;
}

function crc32(bytes) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

async function forwardToLinuxBridge(botToken, chatId, sys, replyText) {
  if (!sys.bridgeSecret || sys.bridgeSecret === "secret123") {
    return sendTelegramMessage(botToken, chatId, "⚠️ برای امنیت سرور لینوکس، ابتدا در مینی‌اپ یک رمز عبور قوی (Bridge Secret) تنظیم کنید.");
  }
  try {
    const cmdJson = replyText.split("<<<LINUX_BRIDGE>>>")[1].trim().replace(/^```json/, "").replace(/```$/, "").trim();
    const res = await fetch(`${sys.linuxBridgeUrl}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Bridge-Secret": sys.bridgeSecret,
        "X-Admin-Verified": String(sys.adminId)
      },
      body: cmdJson
    });
    const result = await res.json();
    await sendTelegramMessage(botToken, chatId, `🔗 **نتیجه سرور لینوکس:**\n${result.message || "انجام شد."}`);
  } catch (e) {
    await sendTelegramMessage(botToken, chatId, "❌ ارتباط با سرور لینوکس برقرار نشد.");
  }
}

async function runCronTasks(env, botToken) {
  const sys = await getSystemState(env);
  if (!sys.adminId || !sys.crons || sys.crons.length === 0) return;

  const now = Date.now();
  let changed = false;

  for (const task of sys.crons) {
    if (task.active && now >= task.triggerAt) {
      await sendTelegramMessage(botToken, sys.adminId, `⏰ **یادآور خودکار دستیار:**\n${task.message}`);
      if (task.repeatMinutes && task.repeatMinutes > 0) {
        task.triggerAt = now + task.repeatMinutes * 60000;
      } else {
        task.active = false;
      }
      changed = true;
    }
  }
  if (changed) await storagePut(env, "SYS_STATE", sys);
}

async function sendKeysMenu(botToken, chatId, sys) {
  if (!sys.apiKeys || sys.apiKeys.length === 0) {
    return sendTelegramMessage(botToken, chatId, "🔑 هنوز کلیدی ثبت نشده است. از مینی‌اپ یا دستور `/addkey کلید` استفاده کنید.");
  }
  const buttons = sys.apiKeys.map((k, idx) => [{
    text: `${sys.activeKeyIndex === idx ? "⭐ " : ""}${k.status === "exhausted" ? "❌" : "🟢"} ${k.label} (${k.key.slice(0, 5)}...${k.key.slice(-4)})`,
    callback_data: `select_key:${idx}`
  }]);
  await sendTelegramMessage(botToken, chatId, "🔑 **انتخاب کلید API اصلی (و ریست وضعیت):**", buttons);
}


// ============================================================================
// API راه‌اندازی اولیه و تنظیم خودکار وب‌هوک (handleSetupAPI)
// ============================================================================
async function handleSetupAPI(request, env, origin) {
  let sys = await getSystemState(env);
  const isAlreadySetup = Boolean(sys.botToken && sys.botToken !== "YOUR_TELEGRAM_BOT_TOKEN");
  const initData = request.headers.get("X-Telegram-Init-Data") || "";
  const adminSecret = request.headers.get("X-Admin-Secret") || "";

  // Security Check: If already configured, only authenticated admin can reconfigure!
  if (isAlreadySetup) {
    let isAuthorized = false;
    if (initData) {
      isAuthorized = await verifyAdminWebApp(initData, sys.botToken, sys.adminId);
    } else if (adminSecret && sys.webSecret && adminSecret === sys.webSecret) {
      isAuthorized = true;
    }
    if (!isAuthorized) {
      return new Response(JSON.stringify({
        ok: false,
        error: "ربات قبلاً راه‌اندازی شده است. برای تغییر اطلاعات باید رمز عبور پنل را در هدر ارسال کنید یا از داخل تلگرام اقدام فرمایید."
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  try {
    const body = await request.json();
    const token = body.botToken?.trim();
    const adminId = body.adminId?.trim() || null;
    const webSecret = body.webSecret?.trim() || "";

    if (!token || token.length < 20 || !token.includes(":")) {
      return new Response(JSON.stringify({ ok: false, error: "فرمت توکن ربات تلگرام نامعتبر است (مثال: 123456789:ABCdefGhIJKlm...)." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 1. بررسی معتبر بودن توکن در API تلگرام
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();
    if (!meData.ok) {
      return new Response(JSON.stringify({ ok: false, error: `تلگرام توکن را نپذیرفت: ${meData.description || "نامعتبر"}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const botInfo = meData.result;

    // 2. تنظیم خودکار وب‌هوک تلگرام
    const webhookUrl = `${origin}/`;
    const whRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: true
      })
    });
    const whData = await whRes.json();

    // 3. ذخیره اطلاعات در پایگاه داده
    sys.botToken = token;
    sys.botUsername = botInfo.username;
    sys.botId = botInfo.id;
    if (adminId) sys.adminId = adminId;
    if (webSecret) sys.webSecret = webSecret;
    await storagePut(env, "SYS_STATE", sys);

    if (adminId) {
      await syncMenuButtons(token, adminId, origin);
    }

    const hasKv = Boolean(env.BOT_KV);
    const extraMsg = !hasKv ? "<br><br>⚠️ <b>نکته:</b> حافظه BOT_KV متصل نیست. برای ماندگاری دائمی، بایندینگ BOT_KV را در تنظیمات کلادفلر اضافه کنید." : "";

    return new Response(JSON.stringify({
      ok: true,
      hasKv,
      bot: botInfo,
      webhook: whData,
      message: `ربات @${botInfo.username} با موفقیت متصل شد و وب‌هوک روی ${webhookUrl} تنظیم شد.${extraMsg}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: `خطا در راه‌اندازی: ${err.message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// ============================================================================
// API مدیریت کامل سیستم (handleAdminAPI) - ارائه‌دهنده‌ها، تست مدل، ربات
// ============================================================================
async function handleAdminAPI(request, env, botToken, origin) {
  const sys = await getSystemState(env);
  const initData = request.headers.get("X-Telegram-Init-Data") || "";
  const adminSecret = request.headers.get("X-Admin-Secret") || "";

  let isAuthorized = false;
  if (initData && (await verifyAdminWebApp(initData, botToken, sys.adminId))) {
    isAuthorized = true;
  } else if (adminSecret && sys.webSecret && adminSecret === sys.webSecret) {
    isAuthorized = true;
  } else if (adminSecret && sys.bridgeSecret && adminSecret === sys.bridgeSecret) {
    isAuthorized = true;
  } else if (!sys.webSecret) {
    // دسترسی مستقیم در صورت عدم تعیین رمز پنل وب باز است
    isAuthorized = true;
  } else if (!sys.botToken && !sys.adminId) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED_ADMIN_ONLY" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  if (request.method === "GET") {
    return new Response(JSON.stringify({ ok: true, sys }), { headers: { "Content-Type": "application/json" } });
  }

  if (request.method === "POST") {
    const body = await request.json();
    let discoveryError = null;

    // --- مدیریت تنظیمات ربات و وب‌هوک ---
    if (body.action === "update_bot_config") {
      const newToken = body.botToken?.trim();
      const newAdminId = body.adminId?.trim() || sys.adminId;
      const newSecret = body.webSecret?.trim() !== undefined ? body.webSecret.trim() : sys.webSecret;

      if (newToken && newToken !== sys.botToken) {
        const meRes = await fetch(`https://api.telegram.org/bot${newToken}/getMe`).then(r => r.json()).catch(() => ({ ok: false }));
        if (!meRes.ok) {
          return new Response(JSON.stringify({ ok: false, error: "توکن جدید توسط تلگرام تایید نشد." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
        sys.botToken = newToken;
        sys.botUsername = meRes.result?.username || sys.botUsername;
        sys.botId = meRes.result?.id || sys.botId;
        await fetch(`https://api.telegram.org/bot${newToken}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: `${origin}/`, allowed_updates: ["message", "callback_query"], drop_pending_updates: true })
        });
      }
      sys.adminId = newAdminId;
      sys.webSecret = newSecret;
      if (sys.botToken && sys.adminId) {
        await syncMenuButtons(sys.botToken, sys.adminId, origin);
      }
    } else if (body.action === "resync_webhook") {
      const activeBotToken = sys.botToken || botToken;
      if (activeBotToken) {
        const res = await fetch(`https://api.telegram.org/bot${activeBotToken}/setWebhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: `${origin}/`, allowed_updates: ["message", "callback_query"], drop_pending_updates: true })
        }).then(r => r.json()).catch(e => ({ ok: false, description: e.message }));
        return new Response(JSON.stringify({ ok: res.ok, result: res }), { headers: { "Content-Type": "application/json" } });
      }
    } else if (body.action === "check_webhook") {
      const activeBotToken = sys.botToken || botToken;
      if (activeBotToken) {
        const res = await fetch(`https://api.telegram.org/bot${activeBotToken}/getWebhookInfo`).then(r => r.json()).catch(e => ({ ok: false, description: e.message }));
        return new Response(JSON.stringify({ ok: true, result: res }), { headers: { "Content-Type": "application/json" } });
      }
    }

    // --- مدیریت هوشمند URL و ارائه‌دهنده‌ها (OpenCode / Cherry Studio) ---
    else if (body.action === "detect_baseurl" && body.url) {
      const probeRes = await autoDetectAndTestBaseUrl(body.url, body.apiKey || "");
      return new Response(JSON.stringify(probeRes), { headers: { "Content-Type": "application/json" } });
    } else if (body.action === "add_provider") {
      const normUrl = smartNormalizeBaseUrl(body.baseUrl);
      const newProv = {
        id: `prov_${Date.now()}`,
        name: body.name?.trim() || "ارائه‌دهنده اختصاصی",
        baseUrl: normUrl,
        apiKey: body.apiKey?.trim() || "",
        enabled: true,
        isDefault: Boolean(body.isDefault)
      };
      sys.providers = sys.providers || [];
      if (newProv.isDefault) {
        sys.providers.forEach(p => p.isDefault = false);
        sys.baseUrl = newProv.baseUrl;
        if (newProv.apiKey) {
          sys.apiKeys = sys.apiKeys || [];
          sys.apiKeys.unshift({ key: newProv.apiKey, status: "active", label: newProv.name });
          sys.activeKeyIndex = 0;
        }
      }
      sys.providers.push(newProv);
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
    } else if (body.action === "update_provider" && body.providerId) {
      const p = (sys.providers || []).find(x => x.id === body.providerId);
      if (p) {
        if (body.name) p.name = body.name.trim();
        if (body.baseUrl) p.baseUrl = smartNormalizeBaseUrl(body.baseUrl);
        if (body.apiKey !== undefined) p.apiKey = body.apiKey.trim();
        if (body.enabled !== undefined) p.enabled = Boolean(body.enabled);
        if (body.isDefault) {
          sys.providers.forEach(x => x.isDefault = false);
          p.isDefault = true;
          sys.baseUrl = p.baseUrl;
          if (p.apiKey) {
            sys.apiKeys = sys.apiKeys || [];
            sys.apiKeys.unshift({ key: p.apiKey, status: "active", label: p.name });
            sys.activeKeyIndex = 0;
          }
        }
        sys.cachedModels = [];
        sys.cachedFreeModels = [];
      }
    } else if (body.action === "delete_provider" && body.providerId) {
      const wasDefault = (sys.providers || []).some(x => x.id === body.providerId && x.isDefault);
      sys.providers = (sys.providers || []).filter(x => x.id !== body.providerId);
      if (wasDefault && sys.providers.length > 0) {
        sys.providers[0].isDefault = true;
        sys.baseUrl = sys.providers[0].baseUrl;
      }
    } else if (body.action === "set_active_provider" && body.providerId) {
      const p = (sys.providers || []).find(x => x.id === body.providerId);
      if (p) {
        sys.providers.forEach(x => x.isDefault = false);
        p.isDefault = true;
        sys.baseUrl = p.baseUrl;
        if (p.apiKey) {
          sys.apiKeys = sys.apiKeys || [];
          const existing = sys.apiKeys.findIndex(k => k.key === p.apiKey);
          if (existing >= 0) {
            sys.activeKeyIndex = existing;
            sys.apiKeys[existing].status = "active";
          } else {
            sys.apiKeys.unshift({ key: p.apiKey, status: "active", label: p.name });
            sys.activeKeyIndex = 0;
          }
        }
        sys.cachedModels = [];
        sys.cachedFreeModels = [];
        const res = await fetchLiveModelsFromProvider(env, sys, true);
        discoveryError = res.error;
      }
    }

    // --- تست زنده مدل و انتخاب برای ربات ---
    else if (body.action === "test_model" && body.model) {
      const testBase = smartNormalizeBaseUrl(body.baseUrl || sys.baseUrl);
      const testKey = body.apiKey || (sys.apiKeys && sys.apiKeys[0]?.key) || "";
      const testResult = await testModelLatencyAndHealth(testBase, testKey, body.model);
      return new Response(JSON.stringify(testResult), { headers: { "Content-Type": "application/json" } });
    } else if (body.action === "set_active_model" && body.model) {
      sys.selectedModel = body.model.trim();
    } else if (body.action === "refresh_models") {
      const res = await fetchLiveModelsFromProvider(env, sys, true);
      discoveryError = res.error;
    }

    // --- کلیدهای API ---
    else if (body.action === "add_key" && body.key) {
      sys.apiKeys = sys.apiKeys || [];
      sys.apiKeys.push({
        key: body.key.trim(),
        status: "active",
        label: body.label?.trim() || `Key #${sys.apiKeys.length + 1}`
      });
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
    } else if (body.action === "select_key") {
      sys.activeKeyIndex = body.index;
      if (sys.apiKeys && sys.apiKeys[body.index]) sys.apiKeys[body.index].status = "active";
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
    } else if (body.action === "delete_key") {
      sys.apiKeys.splice(body.index, 1);
      if (sys.activeKeyIndex >= sys.apiKeys.length) sys.activeKeyIndex = 0;
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
    }

    // --- گالری عکس ---
    else if (body.action === "add_photo" && body.fileId) {
      sys.photoGallery = sys.photoGallery || [];
      sys.photoGallery.push({
        id: Date.now().toString(),
        fileId: body.fileId.trim(),
        label: body.label?.trim() || `عکس #${sys.photoGallery.length + 1}`
      });
    } else if (body.action === "delete_photo") {
      sys.photoGallery = (sys.photoGallery || []).filter(p => p.id !== body.id);
    }

    // --- کانال‌های اسپانسر ---
    else if (body.action === "add_sponsor" && body.channel) {
      let ch = body.channel.trim();
      if (!ch.startsWith("@")) ch = "@" + ch;
      sys.sponsorChannels = sys.sponsorChannels || [];
      if (!sys.sponsorChannels.includes(ch)) sys.sponsorChannels.push(ch);
    } else if (body.action === "delete_sponsor") {
      sys.sponsorChannels = (sys.sponsorChannels || []).filter(c => c !== body.channel);
    }

    // --- اعضا و سهمیه‌ها ---
    else if (body.action === "add_member" && body.userId) {
      sys.members = sys.members || {};
      sys.members[body.userId.trim()] = {
        name: body.name || "عضو",
        dailyLimit: parseInt(body.limit) || 0,
        dailyCount: 0,
        totalMessages: 0,
        blocked: false
      };
    } else if (body.action === "toggle_ban" && body.userId) {
      if (sys.members && sys.members[body.userId]) {
        sys.members[body.userId].blocked = !sys.members[body.userId].blocked;
      }
    } else if (body.action === "remove_member") {
      if (sys.members) delete sys.members[body.userId];
    }

    // --- کرون جاب ---
    else if (body.action === "add_cron" && body.message) {
      const mins = parseInt(body.minutes) || 60;
      sys.crons = sys.crons || [];
      sys.crons.push({
        id: Date.now().toString(),
        type: "scheduled",
        triggerAt: Date.now() + mins * 60000,
        repeatMinutes: body.repeat ? mins : 0,
        message: body.message,
        active: true
      });
    } else if (body.action === "delete_cron") {
      sys.crons = (sys.crons || []).filter(c => c.id !== body.id);
    }

    // --- تنظیمات عمومی، شخصیت‌ها و امنیت ---
    else if (body.action === "update_settings") {
      if (body.chatSoul !== undefined) sys.chatSoul = body.chatSoul.trim() ? body.chatSoul : CONFIG.DEFAULT_CHAT_SOUL;
      if (body.workSoul !== undefined) sys.workSoul = body.workSoul.trim() ? body.workSoul : CONFIG.DEFAULT_WORK_SOUL;
      if (body.customSoul !== undefined) sys.customSoul = body.customSoul.trim() ? body.customSoul : CONFIG.DEFAULT_CUSTOM_SOUL;
      if (body.soul !== undefined) sys.soul = body.soul.trim() ? body.soul : CONFIG.DEFAULT_GUEST_SOUL;
      if (body.linuxBridgeUrl !== undefined) sys.linuxBridgeUrl = body.linuxBridgeUrl.trim();
      if (body.bridgeSecret !== undefined) sys.bridgeSecret = body.bridgeSecret.trim();
      if (body.publicMode !== undefined) sys.publicMode = Boolean(body.publicMode);
      if (body.defaultDailyLimit !== undefined) sys.defaultDailyLimit = parseInt(body.defaultDailyLimit) || 20;
      if (body.baseUrl !== undefined && body.baseUrl.trim()) {
        sys.baseUrl = smartNormalizeBaseUrl(body.baseUrl);
        sys.cachedModels = [];
        sys.cachedFreeModels = [];
      }
    }

    await storagePut(env, "SYS_STATE", sys);
    return new Response(JSON.stringify({ ok: true, sys, discoveryError }), { headers: { "Content-Type": "application/json" } });
  }
}



// ============================================================================
// صفحه فرود راه‌اندازی اولیه تحت وب (renderSetupHTML)
// ============================================================================
function renderSetupHTML(sys, botToken, origin, hasKv = true) {
  const isConfigured = Boolean(botToken && botToken !== "YOUR_TELEGRAM_BOT_TOKEN");
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>راه‌اندازی هوشمند ربات EdgePulse</title>
<style>
  body { font-family: Tahoma, 'Vazirmatn', sans-serif; background: #0c0e12; color: #f1f5f9; padding: 20px; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
  .setup-card { background: #161920; border-radius: 18px; padding: 26px; max-width: 520px; width: 100%; border: 1px solid #28303f; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  h2 { margin-top: 0; color: #38bdf8; font-size: 20px; text-align: center; }
  .badge { display: inline-block; background: #0284c7; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 20px; margin-bottom: 12px; }
  p.desc { font-size: 13px; color: #94a3b8; line-height: 1.8; margin-bottom: 18px; text-align: center; }
  label { display: block; margin-top: 14px; font-size: 13px; font-weight: bold; color: #cbd5e1; }
  .hint { font-size: 11px; color: #64748b; margin-top: 3px; }
  input { width: 100%; box-sizing: border-box; padding: 12px; margin-top: 6px; border-radius: 10px; border: 1px solid #334155; background: #1e2430; color: #fff; font-size: 13px; outline: none; transition: 0.2s; }
  input:focus { border-color: #38bdf8; }
  button.submit-btn { width: 100%; padding: 13px; margin-top: 22px; border-radius: 10px; border: none; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-weight: bold; font-size: 14px; cursor: pointer; transition: 0.2s; }
  button.submit-btn:hover { opacity: 0.9; }
  button.submit-btn:disabled { background: #475569; cursor: not-allowed; }
  .status-box { margin-top: 16px; padding: 12px; border-radius: 10px; font-size: 13px; display: none; line-height: 1.6; }
  .status-ok { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
  .status-err { background: #7f1d1d; color: #fca5a5; border: 1px solid #b91c1c; }
  .existing-box { background: #1e293b; border-radius: 10px; padding: 14px; margin-top: 15px; border: 1px solid #3b82f6; text-align: center; }
  .link-btn { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 8px; font-size: 12px; margin-top: 8px; font-weight: bold; }
</style>
</head>
<body>

<div class="setup-card">
  <div style="text-align:center;"><span class="badge">V8.0 PRO - OpenCode & Cherry Studio Edition</span></div>
  <h2>🚀 راه‌اندازی و اتصال ربات تلگرام</h2>
  <p class="desc">توکن ربات خود را وارد کنید تا وب‌هوک به صورت خودکار روی این ورکر تنظیم شود و ربات آماده پاسخ‌گویی گردد.</p>

  ${!hasKv ? `
    <div style="background:#451a03;border:1px solid #b45309;color:#fde68a;padding:12px;border-radius:10px;margin-bottom:16px;font-size:12px;line-height:1.6;text-align:right;">
      ⚠️ <b>توجه مهم (حافظه ابری BOT_KV متصل نیست):</b><br>
      هنوز بایندینگ <b>BOT_KV</b> در کلادفلر متصل نشده است. برای پایداری و ذخیره دائمی توکن، در کلادفلر به <b>Settings &gt; Bindings</b> بروید و یک KV با نام <b>BOT_KV</b> متصل کنید.<br>
      <i>(همچنین می‌توانید توکن را مستقیم در خط ۱۸ فایل worker.js بگذارید).</i>
    </div>
  ` : ""}

  ${isConfigured ? `
    <div class="existing-box">
      <div style="color:#38bdf8;font-weight:bold;">✅ ربات قبلاً تنظیم شده است!</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:4px;">آیدی ادمین: ${sys.adminId || "ثبت نشده"}</div>
      <a href="/app" class="link-btn">🎛 ورود به پنل مدیریت</a>
    </div>
  ` : ""}

  <label>🔑 توکن ربات تلگرام (Bot Token):</label>
  <input id="tokenInput" dir="ltr" placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ" value="${escapeHtml(isConfigured ? botToken : "")}">
  <div class="hint">توکنی که از BotFather@ دریافت کرده‌اید را در اینجا قرار دهید.</div>

  <label>👑 آیدی عددی تلگرام شما (ادمین - اختیاری):</label>
  <input id="adminInput" dir="ltr" placeholder="مثلاً 123456789" value="${escapeHtml(sys.adminId || "")}">
  <div class="hint">برای دسترسی مستقیم و امن به دستورات مدیریتی و مینی‌اپ.</div>

  <label>🔒 رمز عبور پنل وب (اختیاری):</label>
  <input id="secretInput" type="password" dir="ltr" placeholder="یک رمز عبور برای ورود به پنل از مرورگر" value="${escapeHtml(sys.webSecret || "")}">
  <div class="hint">به شما امکان می‌دهد بدون نیاز به تلگرام هم از مرورگر کامپیوتر یا گوشی پنل را مدیریت کنید.</div>

  <button class="submit-btn" id="btnConnect" onclick="connectBot()">🔗 اتصال به تلگرام و تنظیم خودکار وب‌هوک</button>

  <div id="statusBox" class="status-box"></div>
</div>

<script>
async function connectBot() {
  const token = document.getElementById('tokenInput').value.trim();
  const adminId = document.getElementById('adminInput').value.trim();
  const webSecret = document.getElementById('secretInput').value.trim();
  const btn = document.getElementById('btnConnect');
  const statusBox = document.getElementById('statusBox');

  if (!token) {
    statusBox.className = 'status-box status-err';
    statusBox.innerText = 'لطفاً توکن ربات تلگرام را وارد کنید.';
    statusBox.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.innerText = '⏳ در حال تست توکن و تنظیم وب‌هوک...';
  statusBox.style.display = 'none';

  try {
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken: token, adminId, webSecret })
    });
    const data = await res.json();

    if (data.ok) {
      if (webSecret) localStorage.setItem('admin_secret', webSecret);
      statusBox.className = 'status-box status-ok';
      statusBox.innerHTML = '✅ <b>' + data.message + '</b><br>نام کاربری ربات: @' + (data.bot?.username || '') + '<br><br><a href="/app" style="color:#fff;text-decoration:underline;font-weight:bold;">ورود به پنل مدیریت ایجنت ➔</a>';
      statusBox.style.display = 'block';
      btn.innerText = '✅ متصل شد!';
      setTimeout(() => { window.location.href = '/app'; }, 2000);
    } else {
      statusBox.className = 'status-box status-err';
      statusBox.innerText = '❌ خطا: ' + (data.error || 'ارتباط با سرور برقرار نشد.');
      statusBox.style.display = 'block';
      btn.disabled = false;
      btn.innerText = '🔗 تلاش مجدد برای اتصال';
    }
  } catch (err) {
    statusBox.className = 'status-box status-err';
    statusBox.innerText = '❌ خطای شبکه: ' + err.message;
    statusBox.style.display = 'block';
    btn.disabled = false;
    btn.innerText = '🔗 تلاش مجدد برای اتصال';
  }
}
</script>
</body>
</html>`;
}

// ============================================================================
// ============================================================================
// پنل پیشرفته مدیریت ایجنت، ارائه‌دهنده‌ها و مدل‌ها (renderMiniAppHTML)
// نسخه فوق پیشرفته، کاملاً ریسپانسیو و روان (Mobile & Desktop)
// ============================================================================
function renderMiniAppHTML(sys, botToken, origin) {
  const safeSysJson = JSON.stringify(sys).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<title>پنل مدیریت هوشمند EdgePulse</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  :root {
    --bg-base: #080c14;
    --bg-card: rgba(17, 24, 39, 0.75);
    --border-card: rgba(255, 255, 255, 0.08);
    --primary: #0284c7;
    --primary-hover: #0369a1;
    --primary-glow: rgba(2, 132, 199, 0.35);
    --cyan: #38bdf8;
    --emerald: #10b981;
    --amber: #f59e0b;
    --rose: #ef4444;
    --purple: #8b5cf6;
    --text-main: #f8fafc;
    --text-muted: #94a3b8;
  }
  body {
    font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, Tahoma, sans-serif;
    background: var(--bg-base);
    color: var(--text-main);
    margin: 0;
    padding: 12px 12px 40px 12px;
    max-width: 860px;
    margin-inline: auto;
    font-size: 13px;
    line-height: 1.5;
  }

  /* Toast Notification */
  .toast {
    position: fixed;
    top: 14px;
    left: 50%;
    transform: translate(-50%, -80px);
    background: #1e293b;
    color: #f8fafc;
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 9px 18px;
    border-radius: 30px;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
    z-index: 99999;
    opacity: 0;
    pointer-events: none;
    transition: transform 0.25s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.25s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 90vw;
  }
  .toast.show {
    transform: translate(-50%, 0);
    opacity: 1;
    pointer-events: auto;
  }
  .toast-success { background: #064e3b; border-color: #059669; color: #a7f3d0; }
  .toast-error { background: #7f1d1d; border-color: #dc2626; color: #fecaca; }
  .toast-info { background: #0c4a6e; border-color: #0284c7; color: #bae6fd; }

  /* Header Bar */
  .header-bar {
    background: var(--bg-card);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-radius: 16px;
    padding: 12px 14px;
    margin-bottom: 12px;
    border: 1px solid var(--border-card);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  }
  .brand-group { display: flex; align-items: center; gap: 8px; }
  .brand-title { color: var(--cyan); font-size: 15px; font-weight: 800; display: flex; align-items: center; gap: 6px; }
  .status-badges { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }

  .badge-pill {
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 20px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: 1px solid transparent;
  }
  .badge-neutral { background: rgba(148, 163, 184, 0.12); color: #cbd5e1; border-color: rgba(148, 163, 184, 0.2); }
  .badge-success { background: rgba(16, 185, 129, 0.15); color: #34d399; border-color: rgba(16, 185, 129, 0.3); }
  .badge-primary { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
  .badge-purple { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border-color: rgba(139, 92, 246, 0.3); }
  .badge-free { background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.35); padding: 2px 7px; border-radius: 6px; font-size: 10.5px; font-weight: 700; }
  .badge-std { background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); padding: 2px 7px; border-radius: 6px; font-size: 10.5px; }

  /* Tabs Bar */
  .tabs-nav {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding: 2px 2px 8px 2px;
    margin-bottom: 12px;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
  }
  .tabs-nav::-webkit-scrollbar { display: none; }
  .tab-btn {
    flex: 0 0 auto;
    scroll-snap-align: start;
    background: rgba(22, 30, 48, 0.7);
    color: var(--text-muted);
    border: 1px solid var(--border-card);
    padding: 9px 13px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tab-btn:hover { background: rgba(30, 41, 65, 0.9); color: #f1f5f9; }
  .tab-btn.active {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
    color: #ffffff;
    border-color: var(--cyan);
    box-shadow: 0 3px 12px var(--primary-glow);
  }

  /* Card Layout */
  .card {
    background: var(--bg-card);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
    border: 1px solid var(--border-card);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  }
  h3 {
    margin: 0 0 10px 0;
    color: var(--cyan);
    font-size: 13.5px;
    font-weight: 700;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-subtitle { font-size: 11.5px; color: var(--text-muted); margin-bottom: 10px; line-height: 1.5; }

  /* Inputs & Forms */
  label.lbl { display: block; margin-top: 10px; font-size: 11.5px; font-weight: 600; color: #cbd5e1; }
  input, textarea, select {
    width: 100%;
    box-sizing: border-box;
    padding: 10px 12px;
    margin-top: 6px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(13, 19, 33, 0.85);
    color: #ffffff;
    font-size: 12px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus, textarea:focus {
    border-color: var(--cyan);
    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
  }
  textarea { resize: vertical; min-height: 60px; line-height: 1.6; }

  /* Buttons */
  button {
    font-family: inherit;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .btn-primary {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 14px;
    margin-top: 10px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
    color: #fff;
    font-weight: 700;
    font-size: 12.5px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 10px rgba(2, 132, 199, 0.3);
  }
  .btn-primary:hover { opacity: 0.94; transform: translateY(-1px); }
  .btn-primary:active { transform: scale(0.98); }

  .btn-sm {
    width: auto;
    padding: 6px 10px;
    margin: 0;
    font-size: 11px;
    font-weight: 600;
    border-radius: 8px;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .btn-sm:hover { opacity: 0.92; }
  .btn-sm:active { transform: scale(0.96); }

  .btn-green { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
  .btn-purple { background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; }
  .btn-red { background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; }
  .btn-warn { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }
  .btn-ghost { background: rgba(255, 255, 255, 0.07); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.1); }
  .btn-ghost:hover { background: rgba(255, 255, 255, 0.12); color: #fff; }

  /* Presets Responsive Grid */
  .preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 6px;
    margin-top: 8px;
    margin-bottom: 10px;
  }
  .preset-btn {
    background: rgba(22, 31, 50, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    color: #cbd5e1;
    font-size: 11px;
    font-weight: 600;
    padding: 8px 6px;
    text-align: center;
    width: 100%;
    margin: 0;
  }
  .preset-btn:hover { background: rgba(35, 48, 77, 0.95); border-color: var(--cyan); color: var(--cyan); }
  .preset-btn:active { transform: scale(0.97); }

  /* Provider Card */
  .provider-card {
    background: rgba(18, 25, 42, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    padding: 12px;
    margin-bottom: 8px;
    transition: all 0.2s;
  }
  .provider-card.active-prov {
    border-color: rgba(56, 189, 248, 0.45);
    background: rgba(14, 28, 52, 0.9);
    box-shadow: 0 0 15px rgba(2, 132, 199, 0.12);
  }
  .provider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    flex-wrap: wrap;
    gap: 6px;
  }
  .prov-details {
    font-size: 11px;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', Consolas, monospace;
    direction: ltr;
    text-align: left;
    word-break: break-all;
    background: rgba(0, 0, 0, 0.25);
    padding: 6px 8px;
    border-radius: 6px;
  }

  /* Filter Navigation */
  .filter-nav { display: flex; gap: 6px; margin: 10px 0; overflow-x: auto; padding-bottom: 2px; }
  .filter-btn {
    background: rgba(22, 31, 50, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: 0.15s;
  }
  .filter-btn.active {
    background: var(--primary);
    color: #fff;
    border-color: var(--cyan);
    font-weight: 700;
  }

  /* Model Catalog List */
  .model-table {
    max-height: 480px;
    overflow-y: auto;
    font-size: 12px;
    margin-top: 8px;
    padding-right: 2px;
  }
  .model-item {
    background: rgba(17, 24, 39, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 9px 11px;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    transition: background 0.15s;
  }
  .model-item:hover { background: rgba(26, 36, 58, 0.85); }
  .model-item.selected-model {
    border-color: rgba(56, 189, 248, 0.45);
    background: rgba(14, 30, 56, 0.85);
  }
  .model-name {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 11.5px;
    font-weight: 600;
    color: #f8fafc;
    direction: ltr;
    text-align: left;
    word-break: break-all;
  }
  .latency-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Simple Rows */
  .item-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 10px;
    border-radius: 8px;
    background: rgba(15, 22, 36, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.05);
    margin-bottom: 6px;
    gap: 8px;
    font-size: 12px;
  }

  /* Auth Modal */
  .auth-overlay {
    position: fixed;
    inset: 0;
    background: rgba(4, 7, 13, 0.88);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    padding: 16px;
  }

  .empty-state {
    padding: 24px 12px;
    text-align: center;
    color: var(--text-muted);
    font-size: 12px;
  }
</style>
</head>
<body>

<div id="toast" class="toast"></div>

<!-- Auth Box Modal -->
<div id="authBox" class="auth-overlay" style="display:none;">
  <div class="card" style="max-width:390px;width:100%;border-color:var(--cyan);background:#0e1422;box-shadow:0 10px 35px rgba(0,0,0,0.8);">
    <h3 style="text-align:center;justify-content:center;">🔐 احراز هویت پنل مدیریت EdgePulse</h3>
    <p style="font-size:12px;color:var(--text-muted);line-height:1.7;text-align:center;margin:8px 0 12px 0;">
      برای دسترسی مستقیم از مرورگر وب، رمز عبور پنل را وارد نمایید:
    </p>
    <input id="loginSecret" type="password" dir="ltr" placeholder="رمز عبور پنل وب" style="text-align:center;font-size:13px;">
    <button type="button" class="btn-primary" onclick="doLogin()">ورود به پنل</button>
  </div>
</div>

<!-- Header -->
<div class="header-bar">
  <div class="brand-group">
    <span class="brand-title">⚡ EdgePulse Studio</span>
    <span class="badge-pill badge-neutral">v8.0 PRO</span>
  </div>
  <div class="status-badges">
    <span id="headerBotUser" class="badge-pill badge-neutral">ربات: در حال بررسی...</span>
    <span id="headerActiveProv" class="badge-pill badge-purple">سرور: ...</span>
    <span id="headerActiveModel" class="badge-pill badge-primary">مدل: auto</span>
  </div>
</div>

<!-- Navigation Tabs -->
<div class="tabs-nav">
  <button type="button" class="tab-btn active" data-tab="providers"><span style="font-size:14px;">🌐</span> ارائه‌دهنده‌ها و مدل‌ها</button>
  <button type="button" class="tab-btn" data-tab="bot"><span style="font-size:14px;">🤖</span> تنظیمات ربات و وب‌هوک</button>
  <button type="button" class="tab-btn" data-tab="souls"><span style="font-size:14px;">🎭</span> شخصیت‌ها و مودها</button>
  <button type="button" class="tab-btn" data-tab="users"><span style="font-size:14px;">👥</span> اعضا و سهمیه‌ها</button>
  <button type="button" class="tab-btn" data-tab="sponsors"><span style="font-size:14px;">📢</span> اسپانسر و زمان‌بندی</button>
  <button type="button" class="tab-btn" data-tab="media"><span style="font-size:14px;">📸</span> رسانه و پل لینوکس</button>
</div>

<!-- ==================== TAB 1: PROVIDERS & MODELS ==================== -->
<div id="tab-providers">
  <div class="card">
    <h3>➕ افزودن ارائه‌دهنده هوش مصنوعی (OpenCode / Custom / Cherry)</h3>
    <div class="card-subtitle">سریعاً یکی از سرویس‌های زیر را انتخاب کنید یا سرور اختصاصی خود را متصل فرمایید:</div>
    
    <div class="preset-grid">
      <button type="button" class="preset-btn" onclick="applyPreset('google')">Google Gemini</button>
      <button type="button" class="preset-btn" onclick="applyPreset('groq')">Groq Cloud (فوق‌سریع)</button>
      <button type="button" class="preset-btn" onclick="applyPreset('openrouter')">OpenRouter</button>
      <button type="button" class="preset-btn" onclick="applyPreset('deepseek')">DeepSeek Official</button>
      <button type="button" class="preset-btn" onclick="applyPreset('tokenharbor')">TokenHarbor</button>
      <button type="button" class="preset-btn" onclick="applyPreset('custom')">سرور اختصاصی (Custom)</button>
    </div>

    <label class="lbl">نام ارائه‌دهنده:</label>
    <input id="provName" placeholder="مثلاً: Custom Provider یا Groq Cloud">

    <label class="lbl">آدرس Base URL (بدون نیاز به نگرانی، خودکار تصحیح می‌شود):</label>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <input id="provUrl" dir="ltr" placeholder="https://api.groq.com/openai/v1" style="margin:0;">
      <button type="button" class="btn-sm btn-purple" style="white-space:nowrap;width:auto;" onclick="detectUrl()">🪄 تست و اصلاح</button>
    </div>
    <div id="urlDetectResult" style="font-size:11px;color:var(--cyan);margin-top:4px;"></div>

    <label class="lbl">کلید API (API Key):</label>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <input id="provKey" type="password" dir="ltr" placeholder="gsk_... یا sk-or-... یا AIza..." style="margin:0;">
      <button type="button" class="btn-sm btn-ghost" style="white-space:nowrap;width:auto;" onclick="toggleKeyVisibility('provKey')">👁 نمایش</button>
    </div>

    <label style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:12px;cursor:pointer;">
      <input type="checkbox" id="provDefault" style="width:auto;margin:0;" checked> <b>ارائه‌دهنده پیش‌فرض و فعال ربات باشد</b>
    </label>

    <button type="button" class="btn-primary" onclick="addProvider()">➕ ذخیره ارائه‌دهنده و استخراج خودکار مدل‌ها</button>
  </div>

  <div class="card">
    <h3>
      <span>🌐 ارائه‌دهندگان ثبت‌شده (<span id="provCount">0</span>)</span>
      <button type="button" class="btn-sm btn-ghost" onclick="syncWithServer()">🔄 تازه‌سازی</button>
    </h3>
    <div id="providersList"></div>
  </div>

  <div class="card">
    <h3>
      <span>🤖 کاتالوگ مدل‌ها و تست سلامت زنده (Live Latency)</span>
      <button type="button" class="btn-sm btn-green" onclick="refreshLiveModels()">🔄 استخراج مدل‌ها از API</button>
    </h3>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
      <button type="button" class="preset-btn" style="background:#064e3b;border-color:#059669;color:#a7f3d0;" onclick="setActiveModel('auto_free')">🎁 فعال‌سازی خودکار رایگان (Auto Free)</button>
      <button type="button" class="preset-btn" style="background:#0c4a6e;border-color:#0284c7;color:#bae6fd;" onclick="setActiveModel('auto')">🤖 فعال‌سازی خودکار همه (Auto All)</button>
    </div>

    <div style="display:flex;gap:6px;align-items:center;">
      <input id="modelSearch" placeholder="🔍 جستجو بین مدل‌ها..." oninput="filterModelsUI()" style="margin:0;">
      <button type="button" class="btn-sm btn-ghost" onclick="clearModelSearch()">پاکسازی</button>
    </div>

    <div class="filter-nav">
      <button type="button" class="filter-btn active" id="fBtnAll" onclick="setModelFilter('all')">همه مدل‌ها (<span id="cntAll">0</span>)</button>
      <button type="button" class="filter-btn" id="fBtnFree" onclick="setModelFilter('free')">🎁 فقط رایگان (<span id="cntFree">0</span>)</button>
      <button type="button" class="filter-btn" id="fBtnStd" onclick="setModelFilter('std')">💎 استاندارد (<span id="cntStd">0</span>)</button>
    </div>

    <div style="margin-bottom:8px;">
      <button type="button" class="btn-sm btn-purple" style="width:100%;justify-content:center;" onclick="testAllFreeModelsThrottled()">🧪 تست سلامت دسته‌جمعی مدل‌های رایگان (ضد ۴۲۹)</button>
    </div>

    <div id="modelsContainer" class="model-table"></div>
  </div>
</div>

<!-- ==================== TAB 2: BOT & WEBHOOK ==================== -->
<div id="tab-bot" style="display:none;">
  <div class="card">
    <h3>🤖 وضعیت و پیکربندی ربات تلگرام</h3>
    
    <label class="lbl">توکن ربات تلگرام (Bot Token):</label>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <input id="botTokenInput" type="password" dir="ltr" style="margin:0;">
      <button type="button" class="btn-sm btn-ghost" onclick="toggleKeyVisibility('botTokenInput')">👁 نمایش</button>
    </div>

    <label class="lbl">آیدی عددی تلگرام ادمین کل:</label>
    <input id="botAdminId" dir="ltr" placeholder="123456789">

    <label class="lbl">رمز عبور اختصاصی پنل وب (جهت ورود مستقیم بدون تلگرام):</label>
    <input id="botWebSecret" type="password" dir="ltr" placeholder="یک رمز عبور امن">

    <button type="button" class="btn-primary" onclick="saveBotConfig()">💾 ذخیره تنظیمات و همگام‌سازی وب‌هوک</button>
  </div>

  <div class="card">
    <h3>📡 وضعیت زنده وب‌هوک تلگرام</h3>
    <div style="font-size:12px;color:var(--text-muted);line-height:1.8;background:rgba(0,0,0,0.25);padding:10px;border-radius:10px;">
      <div><b>آدرس وب‌هوک:</b> <span id="whUrl" dir="ltr" style="color:var(--cyan);word-break:break-all;">-</span></div>
      <div><b>پیام‌های معلق در صف:</b> <span id="whPending" style="color:#4ade80;">0</span></div>
      <div><b>آخرین خطا:</b> <span id="whError" style="color:#f87171;">ندارد</span></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button type="button" class="btn-primary" style="margin:0;background:linear-gradient(135deg, #10b981, #059669);" onclick="resyncWebhook()">🔄 همگام‌سازی مجدد وب‌هوک</button>
      <button type="button" class="btn-sm btn-purple" style="white-space:nowrap;" onclick="checkWebhook()">⚡ تست اتصال</button>
    </div>
  </div>
</div>

<!-- ==================== TAB 3: SOULS ==================== -->
<div id="tab-souls" style="display:none;">
  <div class="card">
    <h3>🎭 تنظیم پرامپت ۳ حالت مجزای دستیار</h3>
    <div class="card-subtitle">می‌توانید رفتار و لحن هوش مصنوعی را در هر حالت جداگانه شخصی‌سازی کنید:</div>

    <label class="lbl">۱. حالت چت ساده و روزمره (/chat):</label>
    <textarea id="chatSoulInput" rows="2"></textarea>

    <label class="lbl">۲. حالت کارمند حرفه‌ای و برنامه‌نویس (/work):</label>
    <textarea id="workSoulInput" rows="3"></textarea>

    <label class="lbl">۳. حالت شخصیت سفارشی (/custom):</label>
    <textarea id="customSoulInput" rows="3"></textarea>

    <label class="lbl">پرامپت عمومی مهمان‌ها و کاربران عادی:</label>
    <textarea id="soulInput" rows="2"></textarea>

    <button type="button" class="btn-primary" onclick="saveSouls()">💾 ذخیره شخصیت‌ها و پرامپت‌ها</button>
  </div>
</div>

<!-- ==================== TAB 4: USERS ==================== -->
<div id="tab-users" style="display:none;">
  <div class="card">
    <h3>⚙️ تنظیمات دسترسی عمومی ربات</h3>
    <label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:12.5px;cursor:pointer;">
      <input type="checkbox" id="publicModeInput" style="width:auto;margin:0;"> <b>ربات برای عموم کاربران تلگرام باز باشد (Public Access)</b>
    </label>
    <div class="card-subtitle" style="margin-top:4px;">در صورت فعال بودن، هر کاربری می‌تواند بدون نیاز به تایید ادمین با ربات گفتگو کند.</div>

    <label class="lbl">سقف پیام روزانه کاربران عمومی:</label>
    <input id="defaultLimitInput" type="number" placeholder="20">

    <button type="button" class="btn-primary" onclick="savePublicSettings()">💾 ذخیره تنظیمات عمومی</button>
  </div>

  <div class="card">
    <h3>👥 مدیریت اعضا و سهمیه‌های اختصاصی (Whitelist)</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
      <input id="mId" placeholder="آیدی عددی کاربر" style="margin-top:0;">
      <input id="mName" placeholder="نام کاربر" style="margin-top:0;">
    </div>
    <input id="mLimit" type="number" placeholder="سقف پیام روزانه (0 = نامحدود)" style="margin-top:6px;">
    <button type="button" class="btn-primary" onclick="addMember()">➕ افزودن عضو جدید</button>

    <div id="memberList" style="margin-top:12px;"></div>
  </div>
</div>

<!-- ==================== TAB 5: SPONSORS ==================== -->
<div id="tab-sponsors" style="display:none;">
  <div class="card">
    <h3>📢 کانال‌های عضویت اجباری (اسپانسر)</h3>
    <div class="card-subtitle">کاربران عادی قبل از ارسال پیام ملزم به عضویت در این کانال‌ها خواهند بود:</div>
    <div style="display:flex;gap:6px;">
      <input id="sponsorInput" dir="ltr" placeholder="@ChannelUsername" style="margin:0;">
      <button type="button" class="btn-sm btn-green" style="white-space:nowrap;width:auto;" onclick="addSponsor()">➕ افزودن</button>
    </div>
    <div id="sponsorList" style="margin-top:12px;"></div>
  </div>

  <div class="card">
    <h3>⏰ کرون‌جاب و پیام خودکار دوره‌ای</h3>
    <input id="cronMsg" placeholder="متن پیام خودکار...">
    <div style="display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;margin-top:6px;">
      <input id="cronMins" type="number" placeholder="زمان اجرا (دقیقه دیگر)" style="margin:0;">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
        <input type="checkbox" id="cronRepeat" style="width:auto;margin:0;"> تکرار خودکار
      </label>
    </div>
    <button type="button" class="btn-primary" onclick="addCron()">➕ ثبت کرون‌جاب</button>
    <div id="cronList" style="margin-top:12px;"></div>
  </div>
</div>

<!-- ==================== TAB 6: MEDIA & BRIDGE ==================== -->
<div id="tab-media" style="display:none;">
  <div class="card">
    <h3>📸 گالری تصاویر ایجنت</h3>
    <input id="photoLabel" placeholder="عنوان عکس">
    <input id="photoFileId" dir="ltr" placeholder="شناسه file_id تلگرام">
    <button type="button" class="btn-primary" onclick="addPhoto()">➕ افزودن به گالری</button>
    <div id="photoList" style="margin-top:12px;"></div>
  </div>

  <div class="card">
    <h3>🔗 اتصال به سرور لینوکس (Linux Bridge)</h3>
    <label class="lbl">آدرس پل لینوکس (Linux Bridge URL):</label>
    <input id="bridgeInput" dir="ltr" placeholder="http://YOUR_SERVER_IP:8080">
    <label class="lbl">رمز امنیتی پل (Bridge Secret):</label>
    <input id="bridgeSecretInput" dir="ltr" placeholder="یک توکن امنیتی طولانی">
    <button type="button" class="btn-primary" onclick="saveBridgeSettings()">💾 ذخیره تنظیمات پل لینوکس</button>
  </div>
</div>

<script>
// ============================================================================
// منطق کلاینت و رندر داده‌ها - داده‌های اولیه مستقیم و بدون تاخیر از ورکر تزریق شده‌اند
// ============================================================================
var initialSys = ${safeSysJson};
var currentSys = initialSys || {};
var currentFilter = 'all';
var allRawModels = [];
var tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  try {
    tg.ready();
    tg.expand();
  } catch (e) {}
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(text, type) {
  type = type || 'info';
  var t = document.getElementById('toast');
  if (!t) return;
  t.className = 'toast toast-' + type + ' show';
  var icon = type === 'success' ? '🟢' : type === 'error' ? '❌' : 'ℹ️';
  t.innerHTML = '<span>' + icon + '</span> <span>' + escapeHtml(text) + '</span>';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(function() {
    t.className = 'toast';
  }, 3200);
}

function getAuthHeaders() {
  var headers = { 'Content-Type': 'application/json' };
  if (tg && tg.initData) {
    headers['X-Telegram-Init-Data'] = tg.initData;
  }
  var secret = localStorage.getItem('admin_secret');
  if (secret) {
    headers['X-Admin-Secret'] = secret;
  }
  return headers;
}

async function api(payload) {
  try {
    var res = await fetch('/api/admin', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.status === 403) {
      document.getElementById('authBox').style.display = 'flex';
      showToast('لطفاً رمز عبور پنل را وارد کنید', 'error');
      return { ok: false, error: 'UNAUTHORIZED' };
    }
    return await res.json();
  } catch (e) {
    showToast('خطای ارتباط با سرور: ' + (e.message || 'شبکه ناموفق'), 'error');
    return { ok: false, error: e.message };
  }
}

function doLogin() {
  var s = document.getElementById('loginSecret').value.trim();
  if (!s) return showToast('رمز عبور را وارد کنید', 'error');
  localStorage.setItem('admin_secret', s);
  document.getElementById('authBox').style.display = 'none';
  syncWithServer();
}

function switchTab(tabId, el) {
  var tabs = ['providers', 'bot', 'souls', 'users', 'sponsors', 'media'];
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var pane = document.getElementById('tab-' + t);
    if (pane) pane.style.display = (t === tabId) ? 'block' : 'none';
  }
  var buttons = document.querySelectorAll('.tab-btn');
  for (var j = 0; j < buttons.length; j++) {
    buttons[j].classList.remove('active');
  }
  var targetBtn = el || document.querySelector('[data-tab="' + tabId + '"]');
  if (targetBtn) targetBtn.classList.add('active');
  if (tabId === 'bot') checkWebhook();
}

function toggleKeyVisibility(id) {
  var inp = document.getElementById(id);
  if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
}

function applyPreset(name) {
  var presets = {
    google: { name: 'Google Gemini (رایگان و پرسرعت)', url: 'https://generativelanguage.googleapis.com/v1beta/openai', key: '' },
    groq: { name: 'Groq Cloud (فوق‌العاده سریع)', url: 'https://api.groq.com/openai/v1', key: '' },
    openrouter: { name: 'OpenRouter (مدل‌های متنوع)', url: 'https://openrouter.ai/api/v1', key: '' },
    deepseek: { name: 'DeepSeek Official', url: 'https://api.deepseek.com/v1', key: '' },
    tokenharbor: { name: 'TokenHarbor', url: 'https://tokenharbor.ai/v1', key: '' },
    custom: { name: 'ارائه‌دهنده اختصاصی (Custom)', url: 'https://api.unorouter.com/v1', key: '' }
  };
  var p = presets[name];
  if (p) {
    document.getElementById('provName').value = p.name;
    document.getElementById('provUrl').value = p.url;
    document.getElementById('provKey').focus();
    showToast('پیش‌تنظیم ' + p.name + ' اعمال شد', 'info');
  }
}

async function detectUrl() {
  var url = document.getElementById('provUrl').value.trim();
  var key = document.getElementById('provKey').value.trim();
  var resBox = document.getElementById('urlDetectResult');
  if (!url) return showToast('آدرس Base URL را وارد کنید', 'error');
  resBox.innerText = '⏳ در حال تست و اعتبارسنجی خودکار...';
  var res = await api({ action: 'detect_baseurl', url: url, apiKey: key });
  if (res.workingUrl) {
    document.getElementById('provUrl').value = res.workingUrl;
    resBox.innerHTML = '🟢 <b>آدرس تایید شد:</b> ' + escapeHtml(res.workingUrl);
    showToast('آدرس Base URL معتبر و آماده است', 'success');
  } else {
    resBox.innerText = '⚠️ نتیجه: ' + (res.error || 'پاسخ نامشخص');
    showToast('خطا در اعتبارسنجی آدرس', 'error');
  }
}

async function addProvider() {
  var name = document.getElementById('provName').value.trim();
  var baseUrl = document.getElementById('provUrl').value.trim();
  var apiKey = document.getElementById('provKey').value.trim();
  var isDefault = document.getElementById('provDefault').checked;
  if (!baseUrl) return showToast('آدرس Base URL را وارد کنید', 'error');

  showToast('در حال ثبت ارائه‌دهنده و استخراج مدل‌ها...', 'info');
  var res = await api({ action: 'add_provider', name: name, baseUrl: baseUrl, apiKey: apiKey, isDefault: isDefault });
  if (res.ok !== false) {
    showToast('ارائه‌دهنده با موفقیت ذخیره شد', 'success');
    document.getElementById('provName').value = '';
    document.getElementById('provUrl').value = '';
    document.getElementById('provKey').value = '';
    document.getElementById('urlDetectResult').innerText = '';
    await syncWithServer();
  }
}

async function setActiveProvider(id) {
  showToast('در حال تغییر ارائه‌دهنده فعال...', 'info');
  var res = await api({ action: 'set_active_provider', providerId: id });
  if (res.ok !== false) {
    showToast('ارائه‌دهنده فعال با موفقیت تغییر کرد', 'success');
    await syncWithServer();
  }
}

async function deleteProvider(id) {
  if (confirm('آیا از حذف این ارائه‌دهنده اطمینان دارید؟')) {
    var res = await api({ action: 'delete_provider', providerId: id });
    if (res.ok !== false) {
      showToast('ارائه‌دهنده حذف شد', 'info');
      await syncWithServer();
    }
  }
}

async function testProviderPing(baseUrl, apiKey) {
  showToast('در حال تست پینگ و سلامت سرور...', 'info');
  var res = await api({ action: 'detect_baseurl', url: baseUrl, apiKey: apiKey });
  if (res.success || res.workingUrl) {
    showToast('🟢 ارتباط با سرور برقرار است (کد: ' + (res.status || '200 OK') + ')', 'success');
  } else {
    showToast('❌ خطا در پینگ سرور: ' + (res.error || 'عدم پاسخ'), 'error');
  }
}

async function testSingleModel(modelId, baseUrl, apiKey) {
  var safeId = modelId.replace(/[^a-zA-Z0-9]/g, '_');
  var badge = document.getElementById('lat_' + safeId);
  if (badge) badge.innerHTML = '<span class="latency-tag" style="background:#0284c7;color:#fff;">⏳ تست...</span>';

  var res = await api({ action: 'test_model', model: modelId, baseUrl: baseUrl, apiKey: apiKey });
  if (res.ok) {
    var ms = res.latencyMs || 0;
    var bg = ms < 2000 ? '#064e3b' : ms < 5000 ? '#78350f' : '#7f1d1d';
    var clr = ms < 2000 ? '#4ade80' : ms < 5000 ? '#fde047' : '#fca5a5';
    if (badge) badge.innerHTML = '<span class="latency-tag" style="background:' + bg + ';color:' + clr + ';">🟢 ' + ms + 'ms</span>';
    showToast('مدل ' + modelId + ' سالم است (تاخیر: ' + ms + 'ms)', 'success');
  } else {
    if (badge) badge.innerHTML = '<span class="latency-tag" style="background:#7f1d1d;color:#fca5a5;">❌ خطا</span>';
    showToast('خطای تست مدل: ' + (res.error || 'کد وضعیت ناموفق'), 'error');
  }
}

async function testAllFreeModelsThrottled() {
  var freeModels = allRawModels.filter(function(m) { return m.isFree; });
  if (freeModels.length === 0) return showToast('هیچ مدل رایگانی در کاتالوگ یافت نشد', 'info');

  var activeProv = (currentSys && currentSys.providers || []).find(function(p) { return p.isDefault; }) || (currentSys && currentSys.providers && currentSys.providers[0]) || {};
  showToast('تست پینگ ' + Math.min(freeModels.length, 10) + ' مدل رایگان با تاخیر محافظتی آغاز شد...', 'info');

  for (var i = 0; i < Math.min(freeModels.length, 10); i++) {
    var m = freeModels[i];
    await testSingleModel(m.id, activeProv.baseUrl || '', activeProv.apiKey || '');
    await new Promise(function(r) { setTimeout(r, 700); });
  }
  showToast('تست نمونه مدل‌های رایگان به پایان رسید', 'success');
}

async function setActiveModel(m) {
  var res = await api({ action: 'set_active_model', model: m });
  if (res.ok !== false) {
    if (currentSys) currentSys.selectedModel = m;
    var badge = document.getElementById('headerActiveModel');
    if (badge) {
      badge.innerText = 'مدل: ' + (m === 'auto_free' ? '🎁 خودکار رایگان' : m === 'auto' ? '🤖 خودکار همه' : m);
    }
    showToast('مدل فعال ربات تنظیم شد: ' + m, 'success');
    renderModelCatalog();
  }
}

async function refreshLiveModels() {
  var cont = document.getElementById('modelsContainer');
  if (cont) cont.innerHTML = '<div class="empty-state">⏳ در حال ارتباط با سرور و استخراج مدل‌ها...</div>';
  showToast('در حال دریافت زنده مدل‌ها از API ارائه‌دهنده...', 'info');

  var res = await api({ action: 'refresh_models' });
  if (res.ok !== false) {
    showToast('مدل‌ها با موفقیت بروزرسانی شدند', 'success');
    await syncWithServer();
  }
}

function setModelFilter(f) {
  currentFilter = f;
  ['All', 'Free', 'Std'].forEach(function(k) {
    var b = document.getElementById('fBtn' + k);
    if (b) b.classList.remove('active');
  });
  var activeBtn = document.getElementById('fBtn' + (f === 'all' ? 'All' : (f === 'free' ? 'Free' : 'Std')));
  if (activeBtn) activeBtn.classList.add('active');
  renderModelCatalog();
}

function filterModelsUI() {
  renderModelCatalog();
}

function clearModelSearch() {
  var s = document.getElementById('modelSearch');
  if (s) {
    s.value = '';
    renderModelCatalog();
  }
}

function renderProviders() {
  var pList = document.getElementById('providersList');
  if (!pList) return;
  var providers = currentSys.providers || [];
  var cntElem = document.getElementById('provCount');
  if (cntElem) cntElem.innerText = providers.length;

  if (providers.length === 0) {
    pList.innerHTML = '<div class="empty-state">هیچ ارائه‌دهنده‌ای ثبت نشده است. از فرم بالا اولین ارائه‌دهنده را اضافه کنید.</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < providers.length; i++) {
    var p = providers[i];
    var isAct = Boolean(p.isDefault);
    var maskedKey = p.apiKey ? (p.apiKey.slice(0, 5) + '••••' + p.apiKey.slice(-4)) : 'بدون کلید';
    var activeBadge = isAct
      ? '<span class="badge-pill badge-success">🟢 پیش‌فرض ربات</span>'
      : '<span class="badge-pill badge-neutral">⚪ ذخیره‌شده</span>';

    html += '<div class="provider-card ' + (isAct ? 'active-prov' : '') + '">';
    html += '<div class="provider-header">';
    html += '<div><b>' + escapeHtml(p.name) + '</b> ' + activeBadge + '</div>';
    html += '<div style="display:flex;gap:4px;">';
    if (!isAct) {
      html += '<button type="button" class="btn-sm btn-green btn-prov-activate" data-id="' + escapeHtml(p.id) + '">⭐ فعال‌سازی</button>';
    }
    html += '<button type="button" class="btn-sm btn-red btn-prov-delete" data-id="' + escapeHtml(p.id) + '">حذف</button>';
    html += '</div></div>';
    html += '<div class="prov-details">' + escapeHtml(p.baseUrl) + ' | ' + escapeHtml(maskedKey) + '</div>';
    html += '<div style="display:flex;gap:6px;margin-top:8px;">';
    html += '<button type="button" class="btn-sm btn-purple btn-prov-ping" data-id="' + escapeHtml(p.id) + '">⚡ تست پینگ</button>';
    html += '</div></div>';
  }
  pList.innerHTML = html;
}

function renderModelCatalog() {
  var cont = document.getElementById('modelsContainer');
  if (!cont) return;
  var searchInput = document.getElementById('modelSearch');
  var query = (searchInput ? searchInput.value : '').toLowerCase().trim();

  var filtered = allRawModels;
  if (currentFilter === 'free') {
    filtered = filtered.filter(function(m) { return m.isFree; });
  } else if (currentFilter === 'std') {
    filtered = filtered.filter(function(m) { return !m.isFree; });
  }
  if (query) {
    filtered = filtered.filter(function(m) { return m.id.toLowerCase().indexOf(query) >= 0; });
  }

  if (filtered.length === 0) {
    cont.innerHTML = '<div class="empty-state">هیچ مدلی با فیلتر انتخابی یافت نشد.</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var m = filtered[i];
    var isSelected = currentSys && currentSys.selectedModel === m.id;
    var safeId = m.id.replace(/[^a-zA-Z0-9]/g, '_');
    var badgeHtml = m.isFree
      ? '<span class="badge-free">🎁 رایگان</span>'
      : '<span class="badge-std">💎 استاندارد</span>';

    html += '<div class="model-item ' + (isSelected ? 'selected-model' : '') + '">';
    html += '<div>';
    html += '<div class="model-name">' + (isSelected ? '⭐ ' : '') + escapeHtml(m.id) + '</div>';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-top:4px;">';
    html += badgeHtml;
    if (isSelected) {
      html += '<span class="badge-pill badge-primary" style="font-size:10px;padding:1px 6px;">فعال در ربات</span>';
    }
    html += '<span id="lat_' + safeId + '"></span>';
    html += '</div></div>';
    html += '<div style="display:flex;gap:4px;">';
    html += '<button type="button" class="btn-sm btn-purple btn-model-test" data-model="' + escapeHtml(m.id) + '">🧪 تست</button>';
    html += '<button type="button" class="btn-sm btn-green btn-model-select" data-model="' + escapeHtml(m.id) + '">⭐ انتخاب</button>';
    html += '</div></div>';
  }
  cont.innerHTML = html;
}

function renderMembers() {
  var mList = document.getElementById('memberList');
  if (!mList) return;
  var members = currentSys.members || {};
  var entries = Object.entries(members);
  if (entries.length === 0) {
    mList.innerHTML = '<div class="empty-state">هیچ عضو اختصاصی ثبت نشده است.</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < entries.length; i++) {
    var id = entries[i][0];
    var m = entries[i][1];
    var byok = m.customApiKey ? ' 🔑' : '';
    var banStatus = m.blocked ? ' <span style="color:#f87171;">🚫 مسدود</span>' : ' <span style="color:#4ade80;">🟢 فعال</span>';
    html += '<div class="item-row">';
    html += '<span><b>' + escapeHtml(m.name || 'کاربر') + '</b> (' + escapeHtml(id) + ')' + byok + ' | پیام‌ها: ' + (m.totalMessages || 0) + ' (' + banStatus + ')</span>';
    html += '<div style="display:flex;gap:4px;">';
    html += '<button type="button" class="btn-sm btn-warn btn-member-ban" data-id="' + escapeHtml(id) + '">' + (m.blocked ? 'آن‌بن' : 'بن') + '</button>';
    html += '<button type="button" class="btn-sm btn-red btn-member-del" data-id="' + escapeHtml(id) + '">حذف</button>';
    html += '</div></div>';
  }
  mList.innerHTML = html;
}

function renderSponsors() {
  var sList = document.getElementById('sponsorList');
  if (!sList) return;
  var channels = currentSys.sponsorChannels || [];
  if (channels.length === 0) {
    sList.innerHTML = '<div class="empty-state">کانال اسپانسری تعریف نشده است.</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < channels.length; i++) {
    var ch = channels[i];
    html += '<div class="item-row"><span dir="ltr" style="font-weight:600;color:var(--cyan);">' + escapeHtml(ch) + '</span><button type="button" class="btn-sm btn-red btn-sponsor-del" data-channel="' + escapeHtml(ch) + '">حذف</button></div>';
  }
  sList.innerHTML = html;
}

function renderCrons() {
  var cList = document.getElementById('cronList');
  if (!cList) return;
  var crons = (currentSys.crons || []).filter(function(c) { return c.active; });
  if (crons.length === 0) {
    cList.innerHTML = '<div class="empty-state">کرون‌جابی ثبت نشده است.</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < crons.length; i++) {
    var c = crons[i];
    html += '<div class="item-row"><span>⏰ ' + escapeHtml(c.message) + '</span><button type="button" class="btn-sm btn-red btn-cron-del" data-id="' + escapeHtml(c.id) + '">حذف</button></div>';
  }
  cList.innerHTML = html;
}

function renderPhotos() {
  var phoList = document.getElementById('photoList');
  if (!phoList) return;
  var photos = currentSys.photoGallery || [];
  if (photos.length === 0) {
    phoList.innerHTML = '<div class="empty-state">عکسی در گالری موجود نیست.</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < photos.length; i++) {
    var p = photos[i];
    html += '<div class="item-row"><span>🖼 <b>' + escapeHtml(p.label) + '</b></span><button type="button" class="btn-sm btn-red btn-photo-del" data-id="' + escapeHtml(p.id) + '">حذف</button></div>';
  }
  phoList.innerHTML = html;
}

function renderAllUI() {
  if (!currentSys) return;

  var botBadge = document.getElementById('headerBotUser');
  if (botBadge) {
    botBadge.innerText = currentSys.botToken ? 'ربات: متصل' : 'ربات: متصل نیست';
    botBadge.className = 'badge-pill ' + (currentSys.botToken ? 'badge-success' : 'badge-neutral');
  }

  var modelBadge = document.getElementById('headerActiveModel');
  if (modelBadge) {
    var sel = currentSys.selectedModel || 'auto';
    modelBadge.innerText = 'مدل: ' + (sel === 'auto_free' ? '🎁 خودکار رایگان' : sel === 'auto' ? '🤖 خودکار همه' : sel);
  }

  var activeProv = (currentSys.providers || []).find(function(p) { return p.isDefault; }) || (currentSys.providers && currentSys.providers[0]);
  var provBadge = document.getElementById('headerActiveProv');
  if (provBadge) {
    provBadge.innerText = 'سرور: ' + (activeProv ? activeProv.name : 'تنظیم نشده');
  }

  var tokenInp = document.getElementById('botTokenInput');
  if (tokenInp) tokenInp.value = currentSys.botToken || '';
  var adminInp = document.getElementById('botAdminId');
  if (adminInp) adminInp.value = currentSys.adminId || '';
  var secInp = document.getElementById('botWebSecret');
  if (secInp) secInp.value = currentSys.webSecret || '';

  var cSoul = document.getElementById('chatSoulInput');
  if (cSoul) cSoul.value = currentSys.chatSoul || '';
  var wSoul = document.getElementById('workSoulInput');
  if (wSoul) wSoul.value = currentSys.workSoul || '';
  var cuSoul = document.getElementById('customSoulInput');
  if (cuSoul) cuSoul.value = currentSys.customSoul || '';
  var gSoul = document.getElementById('soulInput');
  if (gSoul) gSoul.value = currentSys.soul || '';

  var pubInp = document.getElementById('publicModeInput');
  if (pubInp) pubInp.checked = Boolean(currentSys.publicMode);
  var defLim = document.getElementById('defaultLimitInput');
  if (defLim) defLim.value = currentSys.defaultDailyLimit || 20;

  var brInp = document.getElementById('bridgeInput');
  if (brInp) brInp.value = currentSys.linuxBridgeUrl || '';
  var brSec = document.getElementById('bridgeSecretInput');
  if (brSec) brSec.value = currentSys.bridgeSecret || '';

  renderProviders();

  var cached = currentSys.cachedModels || [];
  var freeCached = currentSys.cachedFreeModels || [];
  allRawModels = cached.map(function(id) {
    return { id: id, isFree: freeCached.indexOf(id) >= 0 };
  });

  var cAll = document.getElementById('cntAll');
  if (cAll) cAll.innerText = allRawModels.length;
  var cFree = document.getElementById('cntFree');
  if (cFree) cFree.innerText = allRawModels.filter(function(m) { return m.isFree; }).length;
  var cStd = document.getElementById('cntStd');
  if (cStd) cStd.innerText = allRawModels.filter(function(m) { return !m.isFree; }).length;

  renderModelCatalog();
  renderMembers();
  renderSponsors();
  renderCrons();
  renderPhotos();
}

async function syncWithServer() {
  try {
    var res = await fetch('/api/admin', { headers: getAuthHeaders() });
    if (res.status === 403) {
      document.getElementById('authBox').style.display = 'flex';
      return;
    }
    var data = await res.json();
    if (data.ok && data.sys) {
      currentSys = data.sys;
      renderAllUI();
    }
  } catch (e) {}
}

async function checkWebhook() {
  var res = await api({ action: 'check_webhook' });
  if (res.result && res.result.result) {
    var r = res.result.result;
    document.getElementById('whUrl').innerText = r.url || 'ثبت نشده';
    document.getElementById('whPending').innerText = r.pending_update_count || 0;
    document.getElementById('whError').innerText = r.last_error_message || 'ندارد';
  }
}

async function resyncWebhook() {
  showToast('در حال همگام‌سازی وب‌هوک با سرور تلگرام...', 'info');
  var res = await api({ action: 'resync_webhook' });
  if (res.ok) {
    showToast('وب‌هوک با موفقیت همگام‌سازی شد', 'success');
  } else {
    showToast('خطا در تنظیم وب‌هوک', 'error');
  }
  checkWebhook();
}

async function saveBotConfig() {
  var token = document.getElementById('botTokenInput').value.trim();
  var adminId = document.getElementById('botAdminId').value.trim();
  var webSecret = document.getElementById('botWebSecret').value.trim();
  showToast('در حال ذخیره تنظیمات ربات...', 'info');
  var res = await api({ action: 'update_bot_config', botToken: token, adminId: adminId, webSecret: webSecret });
  if (res.ok !== false) {
    if (webSecret) localStorage.setItem('admin_secret', webSecret);
    showToast('تنظیمات ربات ذخیره و متصل شد', 'success');
    await syncWithServer();
  }
}

async function saveSouls() {
  showToast('در حال ذخیره پرامپت‌ها...', 'info');
  var res = await api({
    action: 'update_settings',
    chatSoul: document.getElementById('chatSoulInput').value,
    workSoul: document.getElementById('workSoulInput').value,
    customSoul: document.getElementById('customSoulInput').value,
    soul: document.getElementById('soulInput').value
  });
  if (res.ok !== false) {
    showToast('تمامی شخصیت‌ها با موفقیت ذخیره شدند', 'success');
  }
}

async function savePublicSettings() {
  showToast('در حال ذخیره تنظیمات دسترسی عمومی...', 'info');
  var res = await api({
    action: 'update_settings',
    publicMode: document.getElementById('publicModeInput').checked,
    defaultDailyLimit: document.getElementById('defaultLimitInput').value
  });
  if (res.ok !== false) {
    showToast('تنظیمات دسترسی عمومی ذخیره شد', 'success');
  }
}

async function addMember() {
  var uId = document.getElementById('mId').value.trim();
  var name = document.getElementById('mName').value.trim();
  var limit = document.getElementById('mLimit').value.trim();
  if (!uId) return showToast('آیدی کاربر را وارد کنید', 'error');
  await api({ action: 'add_member', userId: uId, name: name, limit: limit });
  document.getElementById('mId').value = '';
  document.getElementById('mName').value = '';
  document.getElementById('mLimit').value = '';
  showToast('عضو افزوده شد', 'success');
  await syncWithServer();
}

async function toggleBan(uId) {
  await api({ action: 'toggle_ban', userId: uId });
  await syncWithServer();
}

async function delMember(uId) {
  if (confirm('کاربر حذف شود؟')) {
    await api({ action: 'remove_member', userId: uId });
    await syncWithServer();
  }
}

async function addSponsor() {
  var ch = document.getElementById('sponsorInput').value.trim();
  if (!ch) return showToast('آیدی کانال را وارد کنید', 'error');
  await api({ action: 'add_sponsor', channel: ch });
  document.getElementById('sponsorInput').value = '';
  showToast('کانال اسپانسر ذخیره شد', 'success');
  await syncWithServer();
}

async function delSponsor(ch) {
  if (confirm('حذف کانال اسپانسر؟')) {
    await api({ action: 'delete_sponsor', channel: ch });
    await syncWithServer();
  }
}

async function addCron() {
  var msg = document.getElementById('cronMsg').value.trim();
  var mins = document.getElementById('cronMins').value.trim();
  var repeat = document.getElementById('cronRepeat').checked;
  if (!msg) return showToast('متن پیام را وارد کنید', 'error');
  await api({ action: 'add_cron', message: msg, minutes: mins, repeat: repeat });
  document.getElementById('cronMsg').value = '';
  showToast('کرون‌جاب ثبت شد', 'success');
  await syncWithServer();
}

async function delCron(id) {
  await api({ action: 'delete_cron', id: id });
  await syncWithServer();
}

async function addPhoto() {
  var fileId = document.getElementById('photoFileId').value.trim();
  var label = document.getElementById('photoLabel').value.trim();
  if (!fileId) return showToast('شناسه file_id را وارد کنید', 'error');
  await api({ action: 'add_photo', fileId: fileId, label: label });
  document.getElementById('photoFileId').value = '';
  document.getElementById('photoLabel').value = '';
  showToast('عکس افزوده شد', 'success');
  await syncWithServer();
}

async function delPhoto(id) {
  await api({ action: 'delete_photo', id: id });
  await syncWithServer();
}

async function saveBridgeSettings() {
  await api({
    action: 'update_settings',
    linuxBridgeUrl: document.getElementById('bridgeInput').value,
    bridgeSecret: document.getElementById('bridgeSecretInput').value
  });
  showToast('تنظیمات پل لینوکس ذخیره شد', 'success');
}

// گوش‌دادن مرکزی به کلیک‌ها (Event Delegation)
document.addEventListener('click', function(e) {
  var btn = e.target.closest('button');
  if (!btn) return;

  if (btn.classList.contains('tab-btn')) {
    var tabId = btn.getAttribute('data-tab');
    if (tabId) switchTab(tabId, btn);
    return;
  }
  if (btn.classList.contains('btn-prov-activate')) {
    setActiveProvider(btn.getAttribute('data-id'));
    return;
  }
  if (btn.classList.contains('btn-prov-delete')) {
    deleteProvider(btn.getAttribute('data-id'));
    return;
  }
  if (btn.classList.contains('btn-prov-ping')) {
    var provId = btn.getAttribute('data-id');
    var p = (currentSys && currentSys.providers || []).find(function(x) { return x.id === provId; });
    if (p) testProviderPing(p.baseUrl, p.apiKey || '');
    return;
  }
  if (btn.classList.contains('btn-model-test')) {
    var modelId = btn.getAttribute('data-model');
    var activeProv = (currentSys && currentSys.providers || []).find(function(x) { return x.isDefault; }) || (currentSys && currentSys.providers && currentSys.providers[0]) || {};
    testSingleModel(modelId, activeProv.baseUrl || '', activeProv.apiKey || '');
    return;
  }
  if (btn.classList.contains('btn-model-select')) {
    setActiveModel(btn.getAttribute('data-model'));
    return;
  }
  if (btn.classList.contains('btn-member-ban')) {
    toggleBan(btn.getAttribute('data-id'));
    return;
  }
  if (btn.classList.contains('btn-member-del')) {
    delMember(btn.getAttribute('data-id'));
    return;
  }
  if (btn.classList.contains('btn-sponsor-del')) {
    delSponsor(btn.getAttribute('data-channel'));
    return;
  }
  if (btn.classList.contains('btn-cron-del')) {
    delCron(btn.getAttribute('data-id'));
    return;
  }
  if (btn.classList.contains('btn-photo-del')) {
    delPhoto(btn.getAttribute('data-id'));
    return;
  }
});

// اجرای اولیه رندر
try {
  renderAllUI();
} catch (err) {
  console.error("renderAllUI error:", err);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    try { renderAllUI(); } catch (e) {}
  });
}

// همگام‌سازی پس‌زمینه با سرور
syncWithServer();
</script>
</body>
</html>`;
}


function splitTelegramChunks(text, maxChunkLen = 3800) {
  if (!text || text.length <= maxChunkLen) return [text || ""];
  const chunks = [];
  let current = "";
  let inCode = false;
  let codeLang = "";

  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const willExceed = (current.length + line.length + 1) > maxChunkLen;

    if (willExceed && current) {
      if (inCode) {
        current += "\n```";
        chunks.push(current);
        current = "```" + codeLang + "\n" + line;
      } else {
        chunks.push(current);
        current = line;
      }
    } else {
      if (current) {
        current += "\n" + line;
      } else {
        current = line;
      }
    }

    if (trimmed.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      } else {
        inCode = false;
        codeLang = "";
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  const safeChunks = [];
  for (const c of chunks) {
    if (c.length <= 3950) {
      safeChunks.push(c);
    } else {
      const sub = c.match(/[\s\S]{1,3900}/g) || [c];
      safeChunks.push(...sub);
    }
  }

  return safeChunks.length > 0 ? safeChunks : [text];
}

async function sendTelegramMessage(botToken, chatId, text, inlineKeyboard = []) {
  if (!text || !text.trim()) text = "⚠️ [پاسخ خالی از مدل]";
  const chunks = splitTelegramChunks(text, 3800);
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const body = { chat_id: chatId, text: chunks[i], parse_mode: "Markdown" };
    if (isLast && inlineKeyboard && inlineKeyboard.length > 0) {
      body.reply_markup = { inline_keyboard: inlineKeyboard };
    }

    // Slight delay between multi-part chunks to prevent Telegram chat flood limits
    if (i > 0) {
      await new Promise(r => setTimeout(r, 250));
    }

    let res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    // Handle Telegram 429 Retry-After gracefully
    if (res.status === 429) {
      const errData = await res.json().catch(() => ({}));
      const retrySec = (errData.parameters?.retry_after || 2);
      await new Promise(r => setTimeout(r, Math.min(retrySec * 1000, 5000)));
      res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }

    // Fallback if Markdown parsing failed (broken formatting in model output)
    if (!res.ok) {
      delete body.parse_mode;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    }
  }
}

async function sendChatAction(botToken, chatId, action) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action })
  });
}
