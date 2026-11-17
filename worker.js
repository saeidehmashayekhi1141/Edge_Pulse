function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// ULTIMATE CLOUDFLARE AI AGENT (V8.0 PRO - OPENCODE & CHERRY STUDIO EDITION)
// Features: Web Onboarding & Auto-Webhook | Multi-Provider Engine (CCR, Groq, OpenRouter, Gemini)
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
        return new Response(renderSetupHTML(sys, botToken, origin), {
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

  // Phase 2: Probe POST /chat/completions (for minimal CCR proxies without /models endpoint)
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
      return { ok: false, latencyMs: latency, status: res.status, error: `کد ${res.status}: ${errBody.slice(0, 160)}` };
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
  return env.BOT_KV ? await env.BOT_KV.get(key) : null;
}

async function storagePut(env, key, value, options = {}) {
  const strVal = typeof value === "string" ? value : JSON.stringify(value);
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
  let cleaned = text.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/^<thought>[\s\S]*/gi, "");
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
    return {
      models: sys.cachedModels,
      freeModels: sys.cachedFreeModels || [],
      error: null
    };
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

function normalizeModelList(rawList, isGoogle, baseUrl = "") {
  const blacklist = ["embed", "tts", "whisper", "dall-e", "flux", "imagen", "veo", "aqa", "bisociate", "learnlm"];
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
    if (blacklist.some(bad => cleanId.toLowerCase().includes(bad))) continue;

    seen.add(cleanId);
    const info = classifyModel(cleanId, baseUrl, typeof item === "object" ? item : null);
    list.push({
      id: cleanId,
      name: (item && item.name) || cleanId,
      isFree: info.isFree,
      tag: info.tag
    });
  }

  return list;
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
    selectedModel: "auto",
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
    publicMode: false,
    defaultDailyLimit: 20,
    stats: { totalUsers: {}, totalRequests: 0 },
    linuxBridgeUrl: "",
    bridgeSecret: ""
  };
  await storagePut(env, "SYS_STATE", initial);
  return initial;
}

// ============================================================================
// منوی مدل‌ها در تلگرام با تفکیک مدل‌های رایگان (sendModelMenu)
// ============================================================================
async function sendModelMenu(botToken, chatId, env, sys, forceRefresh = true, customUserConfig = null, isAdmin = true, filterType = "all") {
  const discovery = await fetchLiveModelsFromProvider(env, sys, forceRefresh, customUserConfig);
  const effectiveUrl = smartNormalizeBaseUrl(customUserConfig?.baseUrl || sys.baseUrl || CONFIG.DEFAULT_BASE_URL);
  const providerHost = effectiveUrl.replace(/^https?:\/\//, "").split("/")[0];

  if (discovery.models.length === 0) {
    const buttons = [[{ text: "🔄 تلاش مجدد برای دریافت از API", callback_data: "refresh_models" }]];
    return sendTelegramMessage(
      botToken,
      chatId,
      `⚠️ لیست مدل‌ها از \`${providerHost}\` دریافت نشد.\n**دلیل دقیق:** ${discovery.error || "نامشخص"}`,
      buttons
    );
  }

  const currentSelected = !isAdmin && customUserConfig?.model ? customUserConfig.model : sys.selectedModel;
  const freeModels = discovery.freeModels || [];

  let modelsToShow = discovery.models;
  if (filterType === "free") {
    modelsToShow = freeModels.length > 0 ? freeModels : discovery.models;
  }

  const allModels = ["auto", ...modelsToShow.slice(0, 24)];
  const uniqueModels = [...new Set(allModels)];

  const buttons = [];
  buttons.push([
    { text: `🎁 فقط مدل‌های رایگان (${freeModels.length})`, callback_data: "filter_models:free" },
    { text: `💎 همه مدل‌ها (${discovery.models.length})`, callback_data: "filter_models:all" }
  ]);

  for (let i = 0; i < uniqueModels.length; i += 2) {
    const row = [];
    for (let j = i; j < i + 2 && j < uniqueModels.length; j++) {
      const m = uniqueModels[j];
      const isFree = freeModels.includes(m);
      const isSel = currentSelected === m;
      row.push({
        text: `${isSel ? "🟢 " : ""}${isFree ? "🎁 " : ""}${m === "auto" ? "خودکار (Auto)" : m}`,
        callback_data: `set_model:${m}`
      });
    }
    buttons.push(row);
  }
  buttons.push([{ text: "🔄 بروزرسانی مجدد لیست از API", callback_data: "refresh_models" }]);

  const filterText = filterType === "free" ? "فقط مدل‌های رایگان 🎁" : "همه مدل‌ها";
  await sendTelegramMessage(
    botToken,
    chatId,
    `🤖 **مدل‌های فعال \`${providerHost}\` (${filterText}):**\n⭐ مدل انتخابی: \`${currentSelected}\`\n🎁 مدل‌های رایگان با نشان هدیه مشخص شده‌اند.`,
    buttons
  );
}

// ============================================================================
// مدیریت کلیک روی دکمه‌های شیشه‌ای تلگرام (handleCallbackQuery)
// ============================================================================
async function handleCallbackQuery(query, env, botToken) {
  const chatId = query.message.chat.id;
  const userId = String(query.from.id);
  const data = query.data;
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
      chat: "💡 **حالت چت ساده و پرسش و پاسخ فعال شد.**",
      work: "💼 **حالت کارمند حرفه‌ای فعال شد.**",
      custom: "🎭 **حالت شخصیت سفارشی فعال شد.**"
    };
    return sendTelegramMessage(botToken, chatId, labelMap[chosenMode] || "✅ حالت تغییر کرد.");
  }

  if (data === "check_sponsor") {
    const res = await checkSponsorJoin(botToken, sys, userId);
    if (res.ok) return sendTelegramMessage(botToken, chatId, "✅ عضویت شما تایید شد! اکنون می‌توانید پیام خود را بفرستید.");
    return sendTelegramMessage(botToken, chatId, "⚠️ هنوز در همه کانال‌های اسپانسر عضو نشده‌اید.");
  }
  if (data === "new_chat" || data === "clear_chat") {
    ACTIVE_USER_LOCKS.delete(userId);
    const currentMem = await getActiveChatMemory(env, userId);
    await createNewChatSession(env, userId, currentMem.mode || "chat");
    return sendTelegramMessage(botToken, chatId, "✨ گفتگوی جدید ساخته شد. پیام خود را بفرستید!");
  }
  if (data === "history_menu") {
    return sendHistoryMenu(botToken, env, chatId, userId);
  }
  if (data.startsWith("switch_sess:")) {
    const sessId = data.slice("switch_sess:".length);
    await storagePut(env, `ACTIVE_SESS_${userId}`, sessId);
    return sendTelegramMessage(botToken, chatId, "🔄 گفتگو به سشن انتخاب‌شده منتقل شد.");
  }
  if (data === "menu_models" || data === "refresh_models") {
    return sendModelMenu(botToken, chatId, env, sys, true, customUserConfig, isAdmin, "all");
  }
  if (data.startsWith("filter_models:")) {
    const fType = data.slice("filter_models:".length);
    return sendModelMenu(botToken, chatId, env, sys, false, customUserConfig, isAdmin, fType);
  }
  if (data === "menu_providers" && isAdmin) {
    const provs = sys.providers || [];
    const buttons = provs.map(p => [{
      text: `${p.isDefault ? "🟢 " : ""}${p.name} (${p.baseUrl.replace(/^https?:\/\//, "").split("/")[0]})`,
      callback_data: `set_provider:${p.id}`
    }]);
    return sendTelegramMessage(botToken, chatId, "🌐 **لیست ارائه‌دهنده‌ها (انتخاب سریع سرور):**", buttons);
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
      return sendTelegramMessage(botToken, chatId, `✅ ارائه‌دهنده فعال تغییر کرد به: **${p.name}**\nآدرس: \`${p.baseUrl}\``);
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
    return handleCallbackQuery(update.callback_query, env, botToken);
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
    if (!sys.publicMode && !member) {
      return sendTelegramMessage(botToken, chatId, "⛔ شما مجوز دسترسی به این دستیار را ندارید.");
    }
    if (!member && sys.publicMode) {
      sys.members[userId] = { name: firstName, dailyLimit: sys.defaultDailyLimit || 20, dailyCount: 0, totalMessages: 0, blocked: false };
      member = sys.members[userId];
    }

    if (!isGroup) {
      const sponsor = await checkSponsorJoin(botToken, sys, userId);
      if (!sponsor.ok) {
        const kb = sponsor.unjoined.map(ch => [{ text: `📢 عضویت در ${ch}`, url: `https://t.me/${ch.replace("@", "")}` }]);
        kb.push([{ text: "✅ عضو شدم / بررسی مجدد", callback_data: "check_sponsor" }]);
        return sendTelegramMessage(botToken, chatId, "⚠️ برای استفاده از ربات ابتدا در کانال(های) زیر عضو شوید:", kb);
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
    return sendTelegramMessage(botToken, chatId, `✅ ارائه‌دهنده اختصاصی شما تنظیم شد به:
\`${uUrl}\``);
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

  if (isAdmin && text === "/providers") {
    const provs = sys.providers || [];
    if (provs.length === 0) {
      return sendTelegramMessage(botToken, chatId, "🌐 هنوز ارائه‌دهنده‌ای ثبت نشده است.");
    }
    const buttons = provs.map(p => [{
      text: `${p.isDefault ? "🟢 " : ""}${p.name} (${p.baseUrl.replace(/^https?:\/\//, "").split("/")[0]})`,
      callback_data: `set_provider:${p.id}`
    }]);
    return sendTelegramMessage(botToken, chatId, "🌐 **لیست ارائه‌دهنده‌ها (انتخاب سریع سرور):**", buttons);
  }

  if (text === "/start") {
    ACTIVE_USER_LOCKS.delete(userId);
    if (isAdmin) {
      await syncMenuButtons(botToken, chatId, workerOrigin);
    }
    const buttons = isAdmin
      ? [
          [{ text: "🎛 پنل مدیریت (Web / Mini App)", web_app: { url: `${workerOrigin}/app` } }],
          [
            { text: "💡 چت ساده (/chat)", callback_data: "set_mode:chat" },
            { text: "💼 کارمند (/work)", callback_data: "set_mode:work" },
            { text: "🎭 شخصیت سفارشی (/custom)", callback_data: "set_mode:custom" }
          ],
          [{ text: "🤖 مدل‌های هوش مصنوعی (/model)", callback_data: "menu_models" }, { text: "🌐 سرورها (/providers)", callback_data: "menu_providers" }],
          [{ text: "📜 تاریخچه چت‌ها", callback_data: "history_menu" }, { text: "➕ چت جدید (/newchat)", callback_data: "new_chat" }]
        ]
      : [
          [{ text: "🤖 انتخاب مدل (/model)", callback_data: "menu_models" }, { text: "📜 تاریخچه چت‌ها", callback_data: "history_menu" }],
          [{ text: "➕ چت جدید (/newchat)", callback_data: "new_chat" }]
        ];
    const welcomeText = isAdmin
      ? `سلام! دستیار آماده است.

**دستورات تغییر حالت سریع:**
• \`/chat\` : چت ساده و روزمره
• \`/work\` : کارمند حرفه‌ای و برنامه‌نویس
• \`/custom\` : شخصیت سفارشی شما
• \`/model\` : انتخاب مدل (با تفکیک مدل‌های رایگان 🎁)`
      : `سلام ${firstName}! خوش آمدید.

💡 **قابلیت اتصال کلید شخصی (BYOK):**
• کلید شخصی: \`/mykey YOUR_KEY\`
• آدرس ارائه‌دهنده: \`/myurl https://...\`
• انتخاب مدل: \`/model\``;
    return sendTelegramMessage(botToken, chatId, welcomeText, buttons);
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
    const customModel = text.replace("/setmodel ", "").trim();
    if (customModel) {
      sys.selectedModel = customModel;
      await storagePut(env, "SYS_STATE", sys);
      return sendTelegramMessage(botToken, chatId, `✅ مدل فعال دستی تنظیم شد به: **${customModel}**`);
    }
  }

  if (isAdmin && text === "/keys") {
    return sendKeysMenu(botToken, chatId, sys);
  }

  if (isAdmin && text.startsWith("/addkey ")) {
    const newKey = text.replace("/addkey ", "").trim();
    if (newKey.length > 8) {
      sys.apiKeys = sys.apiKeys || [];
      sys.apiKeys.push({ key: newKey, status: "active", label: `Key #${sys.apiKeys.length + 1}` });
      sys.cachedModels = [];
      sys.cachedFreeModels = [];
      await storagePut(env, "SYS_STATE", sys);
      return sendTelegramMessage(botToken, chatId, `✅ کلید جدید **Key #${sys.apiKeys.length}** اضافه شد.`);
    }
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
      enrichedUserPrompt = (text || "این تصویر را با دقت تحلیل کن.") + "
[پیوست: تصویر]";
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
      await sendTelegramMessage(botToken, chatId, `⚠️ ${aiResponse.error}`);
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
    await sendTelegramMessage(botToken, chatId, replyText, quickButtons);
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

async function sendHistoryMenu(botToken, env, chatId, userId) {
  const listRaw = await storageGet(env, `SESS_LIST_${userId}`);
  const activeSessId = await storageGet(env, `ACTIVE_SESS_${userId}`);
  const list = listRaw ? JSON.parse(listRaw) : [];

  if (list.length === 0) {
    return sendTelegramMessage(botToken, chatId, "📜 هنوز تاریخچه‌ای ثبت نشده است.");
  }

  const buttons = list.slice(0, 10).map(s => [{
    text: `${s.id === activeSessId ? "✅ " : ""}${s.title} (${s.date})`,
    callback_data: `switch_sess:${s.id}`
  }]);
  buttons.push([{ text: "➕ شروع گفتگوی جدید", callback_data: "new_chat" }]);

  await sendTelegramMessage(botToken, chatId, "📜 **تاریخچه گفتگوهای شما:**", buttons);
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

  const preferredModel = customUserConfig?.model || sys.selectedModel;
  let modelQueue = [];
  if (preferredModel && preferredModel !== "auto") {
    modelQueue.push(preferredModel);
  }
  for (const m of liveModels) {
    if (!modelQueue.includes(m)) modelQueue.push(m);
  }

  const formattedMessages = buildCleanMessages(systemPrompt, messages, imageBase64, isAdmin, currentMode);

  let keysUpdated = false;
  let lastErrorDetail = discovery.error || "";

  for (const keyObj of keysToTry) {
    for (const model of modelQueue.slice(0, 8)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const isReasoning = /^(o1|o3|deepseek-r1|deepseek-reasoner)/i.test(model);
        const processedMessages = formattedMessages.map(m => {
          if (isReasoning && m.role === "system") {
            return { role: "developer", content: m.content || " " };
          }
          return { role: m.role, content: m.content || " " };
        });

        const payload = {
          model: model,
          messages: processedMessages
        };

        if (isReasoning) {
          payload.max_completion_tokens = isAdmin ? 4096 : 1500;
        } else {
          payload.temperature = currentMode === "custom" ? 0.85 : (currentMode === "work" ? 0.2 : 0.7);
          payload.max_tokens = isAdmin ? 4096 : 1500;
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
              max_tokens: isAdmin ? 4096 : 1500
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
                  return { success: true, content: reply };
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
          lastErrorDetail = `محدودیت نرخ (429) روی مدل ${model}`;
          // Graceful backoff before attempting next fallback
          await new Promise(r => setTimeout(r, 1200));
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
          return { success: true, content: reply };
        }
      } catch (err) {
        lastErrorDetail = `خطای شبکه/تایم‌اوت روی مدل ${model}: ${err.message}`;
        continue;
      }
    }
  }

  if (keysUpdated) await storagePut(env, "SYS_STATE", sys);
  return {
    success: false,
    error: `مدل‌ها در آدرس \`${baseUrl}\` پاسخ ندادند.\nجزئیات آخرین خطا: ${lastErrorDetail || "نامشخص"}`
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

    return new Response(JSON.stringify({
      ok: true,
      bot: botInfo,
      webhook: whData,
      message: `ربات @${botInfo.username} با موفقیت متصل شد و وب‌هوک روی ${webhookUrl} تنظیم شد.`
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
  if (initData) {
    isAuthorized = await verifyAdminWebApp(initData, botToken, sys.adminId);
  } else if (adminSecret && sys.webSecret && adminSecret === sys.webSecret) {
    isAuthorized = true;
  } else if (adminSecret && sys.bridgeSecret && adminSecret === sys.bridgeSecret) {
    isAuthorized = true;
  } else if (!sys.botToken && !sys.webSecret && !sys.adminId) {
    // Only completely unconfigured system allows initial setup without secret
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
function renderSetupHTML(sys, botToken, origin) {
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
// پنل پیشرفته مدیریت ایجنت، ارائه‌دهنده‌ها و مدل‌ها (renderMiniAppHTML)
// سبک OpenCode، Cherry Studio و Chatbox با تست زنده پینگ و تفکیک رایگان
// ============================================================================
function renderMiniAppHTML(sys, botToken, origin) {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>پنل مدیریت هوشمند EdgePulse</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
  body { font-family: Tahoma, 'Vazirmatn', sans-serif; background: #0b0d11; color: #f1f5f9; padding: 12px; margin: 0; }
  .header-bar { background: #14171f; border-radius: 14px; padding: 12px 16px; margin-bottom: 12px; border: 1px solid #232936; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .brand-title { color: #38bdf8; font-size: 15px; font-weight: bold; }
  .badge-tag { font-size: 11px; padding: 3px 8px; border-radius: 6px; background: #1e2430; color: #94a3b8; border: 1px solid #2c3545; }
  .tabs-nav { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 12px; }
  .tab-btn { background: #171b24; color: #94a3b8; border: 1px solid #262e3d; padding: 8px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; white-space: nowrap; transition: 0.2s; }
  .tab-btn.active { background: #0284c7; color: #fff; font-weight: bold; border-color: #38bdf8; }
  .card { background: #14171f; border-radius: 14px; padding: 14px; margin-bottom: 14px; border: 1px solid #232936; }
  h3 { margin-top: 0; color: #38bdf8; font-size: 14px; border-bottom: 1px solid #232936; padding-bottom: 8px; }
  label.lbl { display: block; margin-top: 10px; font-size: 12px; color: #94a3b8; }
  input, textarea, select { width: 100%; box-sizing: border-box; padding: 10px; margin-top: 6px; border-radius: 8px; border: 1px solid #2a3342; background: #1b202a; color: #fff; font-size: 12px; outline: none; }
  input:focus, textarea:focus { border-color: #38bdf8; }
  button { width: 100%; box-sizing: border-box; padding: 10px; margin-top: 10px; border-radius: 8px; border: none; background: #0284c7; color: #fff; font-weight: bold; font-size: 12px; cursor: pointer; transition: 0.2s; }
  button:hover { opacity: 0.9; }
  button:active { transform: scale(0.98); }
  .btn-sm { width: auto; padding: 4px 8px; margin: 0; font-size: 11px; }
  .btn-green { background: #16a34a; }
  .btn-red { background: #dc2626; }
  .btn-warn { background: #d97706; }
  .btn-purple { background: #7c3aed; }
  .item-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #1f2532; gap: 6px; font-size: 12px; }
  .provider-card { background: #181d26; border: 1px solid #2a3342; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
  .provider-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .preset-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px; margin-bottom: 8px; }
  .preset-btn { background: #1c222c; border: 1px solid #334155; font-size: 11px; padding: 6px; margin: 0; color: #cbd5e1; }
  .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; text-align: center; }
  .stat-box { background: #11141a; padding: 10px; border-radius: 10px; border: 1px solid #232936; }
  .filter-nav { display: flex; gap: 6px; margin-top: 10px; margin-bottom: 10px; }
  .filter-btn { background: #1b202a; border: 1px solid #2e3848; color: #94a3b8; padding: 5px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; }
  .filter-btn.active { background: #0284c7; color: #fff; font-weight: bold; border-color: #38bdf8; }
  .model-table { max-height: 400px; overflow-y: auto; font-size: 12px; margin-top: 8px; }
  .model-item { background: #171c24; border: 1px solid #262f3d; border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; }
  .badge-free { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
  .badge-std { background: #1e293b; color: #94a3b8; border: 1px solid #334155; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
  .latency-tag { font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; }
  .auth-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 16px; }
</style>
</head>
<body>

<div id="authBox" class="auth-overlay" style="display:none;">
  <div class="card" style="max-width:380px;width:100%;border-color:#38bdf8;">
    <h3 style="text-align:center;">🔐 احراز هویت پنل مدیریت</h3>
    <p style="font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">برای مدیریت خارج از تلگرام، رمز عبور پنل را وارد کنید:</p>
    <input id="loginSecret" type="password" dir="ltr" placeholder="رمز عبور پنل وب">
    <button onclick="doLogin()">ورود به پنل</button>
  </div>
</div>

<div class="header-bar">
  <div>
    <span class="brand-title">🎛 EdgePulse AI Agent</span>
    <span class="badge-tag">OpenCode & Cherry Edition</span>
  </div>
  <div style="display:flex;gap:4px;">
    <span id="headerBotUser" class="badge-tag">ربات: در حال بررسی...</span>
    <span id="headerActiveModel" class="badge-tag">مدل: auto</span>
  </div>
</div>

<div class="tabs-nav">
  <button class="tab-btn active" onclick="switchTab('providers')">🌐 ارائه‌دهنده‌ها و مدل‌ها</button>
  <button class="tab-btn" onclick="switchTab('bot')">🤖 ربات و وب‌هوک</button>
  <button class="tab-btn" onclick="switchTab('souls')">🎭 شخصیت‌ها و مودها</button>
  <button class="tab-btn" onclick="switchTab('users')">👥 اعضا و سهمیه‌ها</button>
  <button class="tab-btn" onclick="switchTab('sponsors')">📢 اسپانسر و زمان‌بندی</button>
  <button class="tab-btn" onclick="switchTab('media')">📸 رسانه و پل لینوکس</button>
</div>

<!-- ==================== TAB 1: PROVIDERS & MODELS ==================== -->
<div id="tab-providers">
  <div class="card">
    <h3>➕ افزودن ارائه‌دهنده جدید (OpenCode / CCR / Cherry Studio)</h3>
    <div class="preset-grid">
      <button class="preset-btn" onclick="applyPreset('google')">Google Gemini</button>
      <button class="preset-btn" onclick="applyPreset('groq')">Groq Cloud</button>
      <button class="preset-btn" onclick="applyPreset('openrouter')">OpenRouter</button>
      <button class="preset-btn" onclick="applyPreset('deepseek')">DeepSeek</button>
      <button class="preset-btn" onclick="applyPreset('tokenharbor')">TokenHarbor</button>
      <button class="preset-btn" onclick="applyPreset('ccr')">سرور CCR اختصاصی</button>
    </div>
    <label class="lbl">نام ارائه‌دهنده:</label>
    <input id="provName" placeholder="مثلاً: Groq Cloud یا سرور CCR شخصی">
    
    <label class="lbl">آدرس Base URL (بدون نیاز به نگرانی، خودکار اصلاح می‌شود):</label>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <input id="provUrl" dir="ltr" placeholder="https://api.groq.com/openai/v1" style="margin:0;">
      <button class="btn-sm btn-purple" style="white-space:nowrap;width:auto;" onclick="detectUrl()">🪄 اصلاح و تست هوشمند</button>
    </div>
    <div id="urlDetectResult" style="font-size:11px;color:#38bdf8;margin-top:4px;"></div>

    <label class="lbl">کلید API (API Key):</label>
    <input id="provKey" dir="ltr" placeholder="gsk_... یا sk-or-... یا AIza...">

    <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;">
      <input type="checkbox" id="provDefault" style="width:auto;margin:0;" checked> ارائه‌دهنده پیش‌فرض و فعال ربات باشد
    </label>
    <button onclick="addProvider()">➕ ذخیره ارائه‌دهنده و استخراج مدل‌ها</button>
  </div>

  <div class="card">
    <h3>🌐 ارائه‌دهندگان ثبت‌شده</h3>
    <div id="providersList">در حال بارگذاری...</div>
  </div>

  <div class="card">
    <h3>🤖 کاتالوگ مدل‌ها و تست زنده سلامت (Live Latency Test)</h3>
    <div style="display:flex;gap:6px;align-items:center;">
      <input id="modelSearch" placeholder="🔍 جستجو بین مدل‌ها..." oninput="filterModelsUI()" style="margin:0;">
      <button class="btn-sm btn-green" style="width:auto;white-space:nowrap;" onclick="refreshLiveModels()">🔄 بروزرسانی از API</button>
    </div>
    <div class="filter-nav">
      <button class="filter-btn active" id="fBtnAll" onclick="setModelFilter('all')">همه مدل‌ها (<span id="cntAll">0</span>)</button>
      <button class="filter-btn" id="fBtnFree" onclick="setModelFilter('free')">🎁 فقط رایگان (<span id="cntFree">0</span>)</button>
      <button class="filter-btn" id="fBtnStd" onclick="setModelFilter('std')">💎 استاندارد (<span id="cntStd">0</span>)</button>
    </div>
    <div id="modelsContainer" class="model-table">در حال بارگذاری مدل‌ها...</div>
  </div>
</div>

<!-- ==================== TAB 2: BOT & WEBHOOK ==================== -->
<div id="tab-bot" style="display:none;">
  <div class="card">
    <h3>🤖 وضعیت و تنظیمات ربات تلگرام</h3>
    <label class="lbl">توکن ربات تلگرام (Bot Token):</label>
    <div style="display:flex;gap:6px;margin-top:6px;">
      <input id="botTokenInput" type="password" dir="ltr" style="margin:0;">
      <button class="btn-sm btn-warn" style="width:auto;white-space:nowrap;" onclick="toggleTokenView()">👁 نمایش</button>
    </div>

    <label class="lbl">آیدی عددی تلگرام ادمین:</label>
    <input id="botAdminId" dir="ltr" placeholder="123456789">

    <label class="lbl">رمز عبور پنل وب (برای ورود بدون تلگرام از مرورگر):</label>
    <input id="botWebSecret" type="password" dir="ltr" placeholder="یک رمز عبور امن">

    <button onclick="saveBotConfig()">💾 ذخیره تنظیمات و اتصال مجدد به وب‌هوک</button>
  </div>

  <div class="card">
    <h3>📡 وضعیت زنده وب‌هوک تلگرام</h3>
    <div style="font-size:12px;color:#94a3b8;line-height:1.7;">
      <div><b>آدرس وب‌هوک:</b> <span id="whUrl" dir="ltr" style="color:#38bdf8;">-</span></div>
      <div><b>پیام‌های در صف:</b> <span id="whPending" style="color:#4ade80;">0</span></div>
      <div><b>آخرین خطا:</b> <span id="whError" style="color:#f87171;">ندارد</span></div>
    </div>
    <div style="display:flex;gap:6px;margin-top:10px;">
      <button class="btn-green" onclick="resyncWebhook()">🔄 همگام‌سازی مجدد وب‌هوک</button>
      <button class="btn-purple" onclick="checkWebhook()">⚡ تست وضعیت وب‌هوک</button>
    </div>
  </div>
</div>

<!-- ==================== TAB 3: SOULS ==================== -->
<div id="tab-souls" style="display:none;">
  <div class="card">
    <h3>🎭 تنظیم پرامپت ۳ حالت مجزا</h3>
    <label class="lbl">۱. حالت چت ساده و روزمره (/chat):</label>
    <textarea id="chatSoulInput" rows="2"></textarea>
    <label class="lbl">۲. حالت کارمند حرفه‌ای و برنامه‌نویس (/work):</label>
    <textarea id="workSoulInput" rows="3"></textarea>
    <label class="lbl">۳. حالت شخصیت سفارشی (/custom):</label>
    <textarea id="customSoulInput" rows="4"></textarea>
    <label class="lbl">پرامپت عمومی مهمان‌ها:</label>
    <textarea id="soulInput" rows="2"></textarea>
    <button onclick="saveSouls()">💾 ذخیره شخصیت‌ها</button>
  </div>
</div>

<!-- ==================== TAB 4: USERS ==================== -->
<div id="tab-users" style="display:none;">
  <div class="card">
    <h3>⚙️ تنظیمات دسترسی عمومی</h3>
    <label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:12px;">
      <input type="checkbox" id="publicModeInput" style="width:auto;margin:0;"> ربات برای همه کاربران تلگرام باز باشد (Public Mode)
    </label>
    <label class="lbl">سقف پیام روزانه پیش‌فرض کاربران عمومی:</label>
    <input id="defaultLimitInput" type="number" placeholder="20">
    <button onclick="savePublicSettings()">💾 ذخیره تنظیمات عمومی</button>
  </div>

  <div class="card">
    <h3>👥 مدیریت اعضا (Whitelist / BYOK)</h3>
    <input id="mId" placeholder="آیدی عددی تلگرام کاربر">
    <input id="mName" placeholder="نام کاربر">
    <input id="mLimit" type="number" placeholder="سقف پیام روزانه (0 = نامحدود)">
    <button onclick="addMember()">➕ افزودن عضو</button>
    <div id="memberList" style="margin-top:10px;"></div>
  </div>
</div>

<!-- ==================== TAB 5: SPONSORS ==================== -->
<div id="tab-sponsors" style="display:none;">
  <div class="card">
    <h3>📢 کانال‌های اسپانسری (عضویت اجباری)</h3>
    <input id="sponsorInput" dir="ltr" placeholder="@ChannelUsername">
    <button onclick="addSponsor()">➕ افزودن کانال اسپانسر</button>
    <div id="sponsorList" style="margin-top:10px;"></div>
  </div>

  <div class="card">
    <h3>⏰ کرون‌جاب و پیام خودکار</h3>
    <input id="cronMsg" placeholder="متن پیام یادآوری...">
    <input id="cronMins" type="number" placeholder="زمان اجرا (دقیقه دیگر)">
    <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;">
      <input type="checkbox" id="cronRepeat" style="width:auto;margin:0;"> تکرار خودکار
    </label>
    <button onclick="addCron()">➕ ثبت کرون‌جاب</button>
    <div id="cronList" style="margin-top:10px;"></div>
  </div>
</div>

<!-- ==================== TAB 6: MEDIA & BRIDGE ==================== -->
<div id="tab-media" style="display:none;">
  <div class="card">
    <h3>📸 گالری عکس‌های ایجنت</h3>
    <input id="photoLabel" placeholder="عنوان عکس">
    <input id="photoFileId" dir="ltr" placeholder="Telegram file_id">
    <button onclick="addPhoto()">➕ افزودن به گالری</button>
    <div id="photoList" style="margin-top:10px;"></div>
  </div>

  <div class="card">
    <h3>🔗 سرور لینوکس (Linux Bridge)</h3>
    <label class="lbl">آدرس سرور لینوکس:</label>
    <input id="bridgeInput" dir="ltr" placeholder="http://IP:8080">
    <label class="lbl">رمز امنیتی پل (Bridge Secret):</label>
    <input id="bridgeSecretInput" dir="ltr" placeholder="یک رمز طولانی">
    <button onclick="saveBridgeSettings()">💾 ذخیره تنظیمات لینوکس</button>
  </div>
</div>

<script>
let currentSys = null;
let currentFilter = 'all';
let allRawModels = [];
const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (tg && tg.initData) {
    headers['X-Telegram-Init-Data'] = tg.initData;
  }
  const secret = localStorage.getItem('admin_secret');
  if (secret) {
    headers['X-Admin-Secret'] = secret;
  }
  return headers;
}

async function api(payload) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (res.status === 403) {
    document.getElementById('authBox').style.display = 'flex';
    return { ok: false, error: 'UNAUTHORIZED' };
  }
  return res.json();
}

function doLogin() {
  const s = document.getElementById('loginSecret').value.trim();
  if (!s) return alert('رمز عبور را وارد کنید');
  localStorage.setItem('admin_secret', s);
  document.getElementById('authBox').style.display = 'none';
  loadDashboard();
}

function switchTab(tabId) {
  ['providers', 'bot', 'souls', 'users', 'sponsors', 'media'].forEach(t => {
    document.getElementById('tab-' + t).style.display = (t === tabId) ? 'block' : 'none';
  });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  if (tabId === 'bot') checkWebhook();
}

function applyPreset(name) {
  const presets = {
    google: { name: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai', key: '' },
    groq: { name: 'Groq Cloud', url: 'https://api.groq.com/openai/v1', key: '' },
    openrouter: { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1', key: '' },
    deepseek: { name: 'DeepSeek Official', url: 'https://api.deepseek.com/v1', key: '' },
    tokenharbor: { name: 'TokenHarbor', url: 'https://tokenharbor.ai/v1', key: '' },
    ccr: { name: 'سرور CCR شخصی', url: 'https://my-proxy.workers.dev/v1', key: '' }
  };
  const p = presets[name];
  if (p) {
    document.getElementById('provName').value = p.name;
    document.getElementById('provUrl').value = p.url;
    document.getElementById('provKey').focus();
  }
}

async function detectUrl() {
  const url = document.getElementById('provUrl').value.trim();
  const key = document.getElementById('provKey').value.trim();
  const resBox = document.getElementById('urlDetectResult');
  if (!url) return alert('آدرس URL را وارد کنید');
  resBox.innerText = '⏳ در حال تست و اعتبارسنجی خودکار...';
  const res = await api({ action: 'detect_baseurl', url, apiKey: key });
  if (res.workingUrl) {
    document.getElementById('provUrl').value = res.workingUrl;
    resBox.innerHTML = '✅ <b>آدرس تایید شد:</b> ' + res.workingUrl;
  } else {
    resBox.innerText = '⚠️ خطای اعتبارسنجی: ' + (res.error || 'نامشخص');
  }
}

async function addProvider() {
  const name = document.getElementById('provName').value.trim();
  const baseUrl = document.getElementById('provUrl').value.trim();
  const apiKey = document.getElementById('provKey').value.trim();
  const isDefault = document.getElementById('provDefault').checked;
  if (!baseUrl) return alert('آدرس Base URL را وارد کنید');
  await api({ action: 'add_provider', name, baseUrl, apiKey, isDefault });
  document.getElementById('provName').value = '';
  document.getElementById('provUrl').value = '';
  document.getElementById('provKey').value = '';
  loadDashboard();
}

async function setActiveProvider(id) {
  await api({ action: 'set_active_provider', providerId: id });
  loadDashboard();
}

async function deleteProvider(id) {
  if (confirm('این ارائه‌دهنده حذف شود؟')) {
    await api({ action: 'delete_provider', providerId: id });
    loadDashboard();
  }
}

async function testProviderPing(baseUrl, apiKey) {
  alert('در حال تست پینگ...');
  const res = await api({ action: 'detect_baseurl', url: baseUrl, apiKey });
  if (res.success) {
    alert('🟢 ارتباط موفق! کد وضعیت: ' + res.status);
  } else {
    alert('❌ خطا در پینگ: ' + (res.error || 'ناموفق'));
  }
}

async function testSingleModel(modelId, baseUrl, apiKey, btnId) {
  const btn = document.getElementById(btnId);
  const badge = document.getElementById('lat_' + modelId.replace(/[^a-zA-Z0-9]/g, '_'));
  if (badge) badge.innerHTML = '<span class="latency-tag" style="background:#0284c7;color:#fff;">⏳ تست...</span>';
  const res = await api({ action: 'test_model', model: modelId, baseUrl, apiKey });
  if (res.ok) {
    if (badge) badge.innerHTML = '<span class="latency-tag" style="background:#064e3b;color:#4ade80;">🟢 ' + res.latencyMs + 'ms</span>';
  } else {
    if (badge) badge.innerHTML = '<span class="latency-tag" style="background:#7f1d1d;color:#fca5a5;">❌ خطا</span>';
    alert('خطای تست مدل: ' + (res.error || 'نامشخص'));
  }
}

async function setActiveModel(m) {
  await api({ action: 'set_active_model', model: m });
  alert('مدل فعال ربات تنظیم شد به: ' + m);
  loadDashboard();
}

async function refreshLiveModels() {
  document.getElementById('modelsContainer').innerHTML = '⏳ در حال دریافت لیست مدل‌ها از API...';
  const res = await api({ action: 'refresh_models' });
  loadDashboard(res.discoveryError);
}

function setModelFilter(f) {
  currentFilter = f;
  ['All', 'Free', 'Std'].forEach(k => document.getElementById('fBtn' + k).classList.remove('active'));
  document.getElementById('fBtn' + (f === 'all' ? 'All' : (f === 'free' ? 'Free' : 'Std'))).classList.add('active');
  renderModelCatalog();
}

function filterModelsUI() {
  renderModelCatalog();
}

function renderModelCatalog() {
  const cont = document.getElementById('modelsContainer');
  const query = (document.getElementById('modelSearch').value || '').toLowerCase().trim();
  const activeProv = (currentSys?.providers || []).find(p => p.isDefault) || currentSys?.providers?.[0] || {};

  let filtered = allRawModels;
  if (currentFilter === 'free') filtered = filtered.filter(m => m.isFree);
  if (currentFilter === 'std') filtered = filtered.filter(m => !m.isFree);
  if (query) filtered = filtered.filter(m => m.id.toLowerCase().includes(query));

  if (filtered.length === 0) {
    cont.innerHTML = '<div style="color:#94a3b8;padding:12px;text-align:center;">هیچ مدلی یافت نشد.</div>';
    return;
  }

  let html = '';
  filtered.forEach(m => {
    const isSelected = currentSys?.selectedModel === m.id;
    const safeId = m.id.replace(/[^a-zA-Z0-9]/g, '_');
    const badgeHtml = m.isFree
      ? '<span class="badge-free">🎁 ' + (m.tag || 'رایگان') + '</span>'
      : '<span class="badge-std">💎 استاندارد</span>';

    html += `
      <div class="model-item">
        <div>
          <b>${isSelected ? '🟢 ' : ''}<span dir="ltr">${m.id}</span></b>
          <div style="margin-top:3px;">${badgeHtml} <span id="lat_${safeId}"></span></div>
        </div>
        <div style="display:flex;gap:4px;">
          <button id="btn_test_${safeId}" class="btn-sm btn-purple" onclick="testSingleModel('${m.id}', '${activeProv.baseUrl || ''}', '${activeProv.apiKey || ''}', 'btn_test_${safeId}')">🧪 تست پینگ</button>
          <button class="btn-sm btn-green" onclick="setActiveModel('${m.id}')">⭐ انتخاب</button>
        </div>
      </div>
    `;
  });
  cont.innerHTML = html;
}

async function checkWebhook() {
  const res = await api({ action: 'check_webhook' });
  if (res.result?.result) {
    const r = res.result.result;
    document.getElementById('whUrl').innerText = r.url || 'ثبت نشده';
    document.getElementById('whPending').innerText = r.pending_update_count || 0;
    document.getElementById('whError').innerText = r.last_error_message || 'ندارد';
  }
}

async function resyncWebhook() {
  const res = await api({ action: 'resync_webhook' });
  alert(res.ok ? '✅ وب‌هوک با موفقیت همگام‌سازی شد' : '❌ خطا در تنظیم وب‌هوک');
  checkWebhook();
}

function toggleTokenView() {
  const inp = document.getElementById('botTokenInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function saveBotConfig() {
  const token = document.getElementById('botTokenInput').value.trim();
  const adminId = document.getElementById('botAdminId').value.trim();
  const webSecret = document.getElementById('botWebSecret').value.trim();
  const res = await api({ action: 'update_bot_config', botToken: token, adminId, webSecret });
  if (res.ok) {
    if (webSecret) localStorage.setItem('admin_secret', webSecret);
    alert('تنظیمات ربات و وب‌هوک ذخیره شد');
    loadDashboard();
  } else {
    alert('خطا: ' + (res.error || 'نامشخص'));
  }
}

async function saveSouls() {
  await api({
    action: 'update_settings',
    chatSoul: document.getElementById('chatSoulInput').value,
    workSoul: document.getElementById('workSoulInput').value,
    customSoul: document.getElementById('customSoulInput').value,
    soul: document.getElementById('soulInput').value
  });
  alert('هر ۳ شخصیت با موفقیت ذخیره شدند');
}

async function savePublicSettings() {
  await api({
    action: 'update_settings',
    publicMode: document.getElementById('publicModeInput').checked,
    defaultDailyLimit: document.getElementById('defaultLimitInput').value
  });
  alert('تنظیمات دسترسی عمومی ذخیره شد');
}

async function addMember() {
  await api({ action: 'add_member', userId: document.getElementById('mId').value, name: document.getElementById('mName').value, limit: document.getElementById('mLimit').value });
  loadDashboard();
}
async function toggleBan(uId) { await api({ action: 'toggle_ban', userId: uId }); loadDashboard(); }
async function delMember(uId) { await api({ action: 'remove_member', userId: uId }); loadDashboard(); }
async function addSponsor() { await api({ action: 'add_sponsor', channel: document.getElementById('sponsorInput').value }); document.getElementById('sponsorInput').value = ''; loadDashboard(); }
async function delSponsor(ch) { await api({ action: 'delete_sponsor', channel: ch }); loadDashboard(); }
async function addCron() { await api({ action: 'add_cron', message: document.getElementById('cronMsg').value, minutes: document.getElementById('cronMins').value, repeat: document.getElementById('cronRepeat').checked }); document.getElementById('cronMsg').value = ''; loadDashboard(); }
async function delCron(id) { await api({ action: 'delete_cron', id }); loadDashboard(); }
async function addPhoto() { await api({ action: 'add_photo', fileId: document.getElementById('photoFileId').value, label: document.getElementById('photoLabel').value }); document.getElementById('photoFileId').value = ''; loadDashboard(); }
async function delPhoto(id) { await api({ action: 'delete_photo', id }); loadDashboard(); }
async function saveBridgeSettings() {
  await api({ action: 'update_settings', linuxBridgeUrl: document.getElementById('bridgeInput').value, bridgeSecret: document.getElementById('bridgeSecretInput').value });
  alert('تنظیمات پل لینوکس ذخیره شد');
}

async function loadDashboard(extraError) {
  const res = await fetch('/api/admin', { headers: getAuthHeaders() });
  if (res.status === 403) {
    document.getElementById('authBox').style.display = 'flex';
    return;
  }
  const data = await res.json();
  currentSys = data.sys;

  document.getElementById('headerBotUser').innerText = currentSys.botToken ? 'ربات: متصل' : 'ربات: متصل نیست';
  document.getElementById('headerActiveModel').innerText = 'مدل: ' + (currentSys.selectedModel || 'auto');

  document.getElementById('botTokenInput').value = currentSys.botToken || '';
  document.getElementById('botAdminId').value = currentSys.adminId || '';
  document.getElementById('botWebSecret').value = currentSys.webSecret || '';

  document.getElementById('chatSoulInput').value = currentSys.chatSoul || '';
  document.getElementById('workSoulInput').value = currentSys.workSoul || '';
  document.getElementById('customSoulInput').value = currentSys.customSoul || '';
  document.getElementById('soulInput').value = currentSys.soul || '';

  document.getElementById('publicModeInput').checked = Boolean(currentSys.publicMode);
  document.getElementById('defaultLimitInput').value = currentSys.defaultDailyLimit || 20;

  document.getElementById('bridgeInput').value = currentSys.linuxBridgeUrl || '';
  document.getElementById('bridgeSecretInput').value = currentSys.bridgeSecret || '';

  // Providers list
  const pList = document.getElementById('providersList');
  pList.innerHTML = '';
  (currentSys.providers || []).forEach(p => {
    const isAct = p.isDefault;
    const maskedKey = p.apiKey ? (p.apiKey.slice(0, 5) + '...' + p.apiKey.slice(-4)) : 'بدون کلید';
    pList.innerHTML += `
      <div class="provider-card">
        <div class="provider-header">
          <div><b>${isAct ? '🟢 ' : '⚪ '}${p.name}</b> <span class="badge-tag">${isAct ? 'پیش‌فرض ربات' : 'غیرفعال'}</span></div>
          <div style="display:flex;gap:4px;">
            ${!isAct ? `<button class="btn-sm btn-green" onclick="setActiveProvider('${p.id}')">⭐ فعال‌سازی</button>` : ''}
            <button class="btn-sm btn-red" onclick="deleteProvider('${p.id}')">حذف</button>
          </div>
        </div>
        <div style="font-size:11px;color:#94a3b8;font-family:monospace;direction:ltr;text-align:left;">${p.baseUrl} | ${maskedKey}</div>
        <div style="display:flex;gap:4px;margin-top:8px;">
          <button class="btn-sm btn-purple" onclick="testProviderPing('${p.baseUrl}', '${p.apiKey}')">⚡ تست پینگ</button>
        </div>
      </div>
    `;
  });

  // Models catalog
  const cached = currentSys.cachedModels || [];
  const freeCached = currentSys.cachedFreeModels || [];
  allRawModels = cached.map(id => ({ id, isFree: freeCached.includes(id), tag: freeCached.includes(id) ? 'رایگان' : 'استاندارد' }));
  document.getElementById('cntAll').innerText = allRawModels.length;
  document.getElementById('cntFree').innerText = allRawModels.filter(m => m.isFree).length;
  document.getElementById('cntStd').innerText = allRawModels.filter(m => !m.isFree).length;
  renderModelCatalog();

  // Whitelist members
  const mList = document.getElementById('memberList');
  mList.innerHTML = '';
  for (const [id, m] of Object.entries(currentSys.members || {})) {
    const byok = m.customApiKey ? ' 🔑' : '';
    const banStatus = m.blocked ? ' 🚫 مسدود' : ' 🟢 فعال';
    mList.innerHTML += `
      <div class="item-row">
        <span><b>${m.name}</b> (${id})${byok} | پیام: ${m.totalMessages || 0} (${banStatus})</span>
        <div style="display:flex;gap:4px;">
          <button class="btn-sm btn-warn" onclick="toggleBan('${id}')">${m.blocked ? 'آن‌بن' : 'بن'}</button>
          <button class="btn-sm btn-red" onclick="delMember('${id}')">حذف</button>
        </div>
      </div>
    `;
  }

  // Sponsors
  const sList = document.getElementById('sponsorList');
  sList.innerHTML = '';
  (currentSys.sponsorChannels || []).forEach(ch => {
    sList.innerHTML += `<div class="item-row"><span dir="ltr">${ch}</span><button class="btn-sm btn-red" onclick="delSponsor('${ch}')">حذف</button></div>`;
  });

  // Crons
  const cList = document.getElementById('cronList');
  cList.innerHTML = '';
  (currentSys.crons || []).filter(c => c.active).forEach(c => {
    cList.innerHTML += `<div class="item-row"><span>⏰ ${c.message}</span><button class="btn-sm btn-red" onclick="delCron('${c.id}')">حذف</button></div>`;
  });

  // Gallery
  const phoList = document.getElementById('photoList');
  phoList.innerHTML = '';
  (currentSys.photoGallery || []).forEach(p => {
    phoList.innerHTML += `<div class="item-row"><span>🖼 <b>${p.label}</b></span><button class="btn-sm btn-red" onclick="delPhoto('${p.id}')">حذف</button></div>`;
  });
}

loadDashboard();
</script>
</body>
</html>`;
}


async function sendTelegramMessage(botToken, chatId, text, inlineKeyboard = []) {
  if (!text || !text.trim()) text = "⚠️ [پاسخ خالی از مدل]";
  const chunks = text.match(/[\s\S]{1,3900}/g) || [text];
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
