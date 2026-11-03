/**
 * Process Development Monthly Report Automation System
 * Module: Gemini & OpenRouter AI Client
 * Communicates with OpenRouter Free API & Google Gemini 3.8 Flash
 * Features: Multi-provider support (OpenRouter Free / Gemini Direct / Offline Local Rule)
 * WALTON Hi-Tech Industries PLC
 */

class GeminiClient {
  constructor(config = APP_CONFIG.AI) {
    this.config = config;
    this.cache = typeof AICacheManager !== 'undefined' ? AICacheManager : null;
    this.templates = typeof PROMPT_TEMPLATES !== 'undefined' ? PROMPT_TEMPLATES : null;
    
    // OpenRouter Settings
    this.PROXY_ENDPOINTS = ["/api/openrouter", "report/api/openrouter.php", "/report/api/openrouter.php"];
    this.PROXY_ENDPOINT = "/api/openrouter";
    this.OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
    this.STORAGE_KEY_PROVIDER = "walton_pd_ai_provider";
    this.STORAGE_KEY_OPENROUTER_KEY = "walton_pd_openrouter_api_key";
    this.STORAGE_KEY_OPENROUTER_MODEL = "walton_pd_openrouter_model";
    this.DEFAULT_OPENROUTER_MODEL = "openrouter/free";
  }

  getProvider() {
    return HELPERS.storage.get(this.STORAGE_KEY_PROVIDER, "openrouter") || "openrouter";
  }

  setProvider(provider) {
    HELPERS.storage.set(this.STORAGE_KEY_PROVIDER, provider);
  }

  getOpenRouterKey() {
    return HELPERS.storage.get(this.STORAGE_KEY_OPENROUTER_KEY, "") || "";
  }

  setOpenRouterKey(key) {
    const cleanKey = (key || "").trim();
    HELPERS.storage.set(this.STORAGE_KEY_OPENROUTER_KEY, cleanKey);
    // Asynchronously sync with Hostinger server proxy so all computers share the key
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
      fetch('/report/api/openrouter.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_key', apiKey: cleanKey })
      }).catch(() => {});
    }
  }

  getOpenRouterModel() {
    let m = HELPERS.storage.get(this.STORAGE_KEY_OPENROUTER_MODEL, this.DEFAULT_OPENROUTER_MODEL) || this.DEFAULT_OPENROUTER_MODEL;
    if (typeof m === 'string' && (m.includes('gemini-2.0-flash-exp') || m.trim() === '')) {
      m = this.DEFAULT_OPENROUTER_MODEL;
      this.setOpenRouterModel(m);
    }
    return m;
  }

  get openRouterModel() {
    return this.getOpenRouterModel();
  }

  setOpenRouterModel(model) {
    HELPERS.storage.set(this.STORAGE_KEY_OPENROUTER_MODEL, (model || this.DEFAULT_OPENROUTER_MODEL).trim());
  }

  /**
   * Retrieves active Gemini API key from storage
   */
  getApiKey() {
    return HELPERS.storage.get(this.config.STORAGE_KEY_API_KEY, "") || "";
  }

  /**
   * Sets Gemini API key in storage
   */
  setApiKey(key) {
    HELPERS.storage.set(this.config.STORAGE_KEY_API_KEY, (key || "").trim());
  }

  /**
   * Tests OpenRouter API connection with a lightweight prompt
   * Prioritizes secure Vercel /api/openrouter proxy, falling back to direct fetch
   */
  async testOpenRouterConnection(apiKey = null, model = null) {
    const key = apiKey || this.getOpenRouterKey();
    const mdl = model || this.getOpenRouterModel();
    const startTime = Date.now();

    // 1. Try PHP Proxy / Serverless Route (Primary, Secure)
    const isBrowser = typeof window !== 'undefined';
    const isNotLocalFile = isBrowser && window.location.protocol !== 'file:';

    if (isNotLocalFile) {
      for (const endpoint of this.PROXY_ENDPOINTS) {
        try {
          const headers = { "Content-Type": "application/json" };
          if (key) headers["x-openrouter-key"] = key;

          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null;

          const proxyRes = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ action: "test", model: mdl, apiKey: key }),
            signal: controller ? controller.signal : undefined
          });
          if (timeoutId) clearTimeout(timeoutId);

          if (proxyRes.ok) {
            const contentType = proxyRes.headers.get("content-type") || "";
            if (contentType.includes("json")) {
              const proxyData = await proxyRes.json();
              const isSuccess = Boolean(proxyData.success);
              if (isSuccess && key) {
                fetch('/report/api/openrouter.php', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'save_key', apiKey: key })
                }).catch(() => {});
              }
              return {
                success: isSuccess,
                connected: isSuccess,
                provider: "OpenRouter",
                status: proxyData.status || (isSuccess ? "Connected" : "Failed"),
                model: proxyData.model || mdl,
                latency: proxyData.latency || (Date.now() - startTime),
                timestamp: proxyData.timestamp || new Date().toISOString(),
                error: proxyData.error || (isSuccess ? null : "Connection failed"),
                details: proxyData.details || "",
                reply: proxyData.reply || ""
              };
            }
          }
        } catch (proxyErr) {
          console.warn(`Proxy endpoint ${endpoint} failed, trying next:`, proxyErr.message);
        }
      }
    }

    // 2. Direct OpenRouter Connection Fallback
    if (!key) {
      return {
        success: false,
        connected: false,
        status: "Failed",
        model: mdl,
        timestamp: new Date().toISOString(),
        error: "Invalid API Key: OpenRouter API key is empty. Please enter your key or configure OPENROUTER_API_KEY.",
        latency: Date.now() - startTime
      };
    }

    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

      const response = await fetch(this.OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "X-Title": "Walton AC Process Monthly Report",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: mdl,
          messages: [
            { role: "user", content: "Say OK" }
          ],
          max_tokens: 50,
          temperature: 0.1
        }),
        signal: controller ? controller.signal : undefined
      });
      if (timeoutId) clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      if (!response.ok) {
        const errText = await response.text();
        let diagReason = `API Request Failed (HTTP ${response.status})`;
        let errDetails = "";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error && errJson.error.message) errDetails = errJson.error.message;
        } catch (_) {
          if (errText) errDetails = errText.slice(0, 150);
        }

        if (response.status === 401 || response.status === 403) {
          diagReason = "Invalid API Key: OpenRouter rejected the API key as unauthorized or revoked.";
        } else if (response.status === 402) {
          diagReason = "Insufficient Credits: OpenRouter account has ran out of credits.";
        } else if (response.status === 404) {
          diagReason = `Model Not Available: The model "${mdl}" is unavailable or deprecated on OpenRouter.`;
        } else if (response.status === 429) {
          diagReason = "Rate Limit Exceeded: Free tier rate limits reached. Please wait a moment.";
        } else if (errDetails) {
          diagReason = `API Request Failed: ${errDetails}`;
        }

        return {
          success: false,
          connected: false,
          status: "Failed",
          error: diagReason,
          details: errDetails,
          latency,
          model: mdl,
          code: response.status,
          timestamp: new Date().toISOString()
        };
      }

      const data = await response.json();
      const choice = data.choices && data.choices[0];
      const msg = choice ? choice.message : null;
      const rawReply = msg ? (msg.content || msg.reasoning || "OK") : "OK";
      const reply = String(rawReply || "OK").trim();

      return {
        success: true,
        connected: true,
        status: "Connected",
        provider: "OpenRouter",
        latency,
        reply: reply || "OK",
        model: mdl,
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      return {
        success: false,
        connected: false,
        status: "Failed",
        error: `API Request Failed: ${e.message || "Network / CORS connection error."}`,
        latency: Date.now() - startTime,
        model: mdl,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Fetches all available models from OpenRouter API, prioritizing free models
   */
  async fetchOpenRouterModels(apiKey = null) {
    const key = apiKey || this.getOpenRouterKey();
    const headers = {
      "HTTP-Referer": "https://waltonbd.com",
      "X-Title": "Walton AC Process Monthly Report"
    };
    if (key) {
      headers["Authorization"] = `Bearer ${key}`;
    }

    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", { method: "GET", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        const freeModels = [];
        const otherModels = [];

        data.data.forEach(m => {
          const id = m.id;
          const name = m.name || id;
          const isFree = id.endsWith(':free') || (m.pricing && m.pricing.prompt === 0 && m.pricing.completion === 0);
          if (isFree) {
            freeModels.push({ id, name: `${name} (FREE)`, isFree: true, context_length: m.context_length });
          } else {
            otherModels.push({ id, name, isFree: false, context_length: m.context_length });
          }
        });

        // Sort free models nicely
        freeModels.sort((a, b) => a.name.localeCompare(b.name));
        // Prepend OpenRouter Free Models Auto-Router at the very top
        freeModels.unshift(
          { id: "openrouter/free", name: "OpenRouter: Free Models Auto-Router (100% Free - Recommended)", isFree: true },
          { id: "openrouter/auto", name: "OpenRouter: Auto Router (Best Fit)", isFree: true }
        );
        const seen = new Set();
        const uniqueFree = freeModels.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        return { freeModels: uniqueFree, otherModels, all: [...uniqueFree, ...otherModels] };
      }
    } catch (e) {
      console.warn("Could not dynamically load OpenRouter models, using verified catalog:", e.message);
    }

    // Fallback verified models (prioritizing 100% active free models)
    const fallbackFree = [
      { id: "openrouter/free", name: "OpenRouter: Free Models Auto-Router (100% Free - Recommended)", isFree: true },
      { id: "google/gemma-4-31b-it:free", name: "Google: Gemma 4 31B (High Accuracy - Free)", isFree: true },
      { id: "google/gemma-4-26b-a4b-it:free", name: "Google: Gemma 4 26B A4B (Fast - Free)", isFree: true },
      { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Meta: Llama 3.3 70B Instruct (High Capability - Free)", isFree: true },
      { id: "nvidia/nemotron-3.5-lightning:free", name: "NVIDIA: Nemotron 3.5 Lightning (Free)", isFree: true },
      { id: "deepseek/deepseek-r1:free", name: "DeepSeek: R1 Reasoning (Deep Logic - Free)", isFree: true },
      { id: "openrouter/auto", name: "OpenRouter: Auto Router (Best Fit)", isFree: true }
    ];
    return { freeModels: fallbackFree, otherModels: [], all: fallbackFree };
  }

  /**
   * Low-level helper to call OpenRouter Chat Completions
   */
  async callOpenRouter(messages, temperature = 0.2, maxTokens = 600, jsonMode = false) {
    const key = this.getOpenRouterKey();
    let model = this.getOpenRouterModel();
    if (!model || model.includes('gemini-2.0-flash-exp')) {
      model = 'openrouter/free';
    }

    // 1. Try Hostinger PHP Proxy or Serverless Route
    const isBrowser = typeof window !== 'undefined';
    const isNotLocalFile = isBrowser && window.location.protocol !== 'file:';

    if (isNotLocalFile) {
      for (const endpoint of this.PROXY_ENDPOINTS) {
        try {
          const headers = { "Content-Type": "application/json" };
          if (key) {
            headers["x-openrouter-key"] = key;
            headers["Authorization"] = `Bearer ${key}`;
          }

          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

          const proxyPayload = {
            action: "chat",
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens,
            apiKey: key || ""
          };
          if (jsonMode) proxyPayload.response_format = { type: "json_object" };

          const proxyRes = await fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(proxyPayload),
            signal: controller ? controller.signal : undefined
          });
          if (timeoutId) clearTimeout(timeoutId);

          if (proxyRes.ok) {
            const contentType = proxyRes.headers.get("content-type") || "";
            if (contentType.includes("json")) {
              const proxyData = await proxyRes.json();
              if (proxyData && proxyData.success && proxyData.content) {
                return proxyData.content;
              }
              if (proxyData && proxyData.error) {
                console.warn(`Proxy ${endpoint} error:`, proxyData.error);
              }
            }
          }
        } catch (proxyErr) {
          console.warn(`Proxy ${endpoint} notice:`, proxyErr.message);
        }
      }
    }

    // 2. Direct OpenRouter Connection Fallback (with automatic model fallback)
    if (!key) throw new Error("OpenRouter API key is not configured.");

    const candidateModels = [model, 'openrouter/free', 'google/gemma-4-31b-it:free', 'meta-llama/llama-3.3-70b-instruct:free'];
    const tried = new Set();
    let lastErr = null;

    for (const curModel of candidateModels) {
      if (tried.has(curModel)) continue;
      tried.add(curModel);

      const payload = {
        model: curModel,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens
      };
      if (jsonMode) {
        payload.response_format = { type: "json_object" };
      }

      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

        let response = await fetch(this.OPENROUTER_ENDPOINT, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "X-Title": "Walton AC Process Monthly Report",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller ? controller.signal : undefined
        });
        if (timeoutId) clearTimeout(timeoutId);

        // If HTTP 400 because model does not support response_format: json_object, retry without response_format
        if (!response.ok && jsonMode && response.status === 400) {
          delete payload.response_format;
          const retryController = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const retryTimeoutId = retryController ? setTimeout(() => retryController.abort(), 12000) : null;

          response = await fetch(this.OPENROUTER_ENDPOINT, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${key}`,
              "X-Title": "Walton AC Process Monthly Report",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload),
            signal: retryController ? retryController.signal : undefined
          });
          if (retryTimeoutId) clearTimeout(retryTimeoutId);
        }

        if (response.ok) {
          const data = await response.json();
          if (data.choices && data.choices[0] && data.choices[0].message) {
            const msg = data.choices[0].message;
            const content = msg.content || msg.reasoning || "";
            return String(content || "");
          }
        } else {
          const errText = await response.text();
          lastErr = new Error(`OpenRouter Error (${response.status}): ${errText.slice(0, 150)}`);
          // If not 404/429, don't try other models
          if (response.status !== 404 && response.status !== 429) {
            break;
          }
        }
      } catch (reqErr) {
        lastErr = reqErr;
      }
    }

    throw lastErr || new Error("Failed to receive response from OpenRouter API.");
  }

  /**
   * Ultra-robust AI response parser: Handles JSON fences, embedded JSON, and raw Markdown/Text
   */
  parseAiResponse(rawReply, taskName = "") {
    if (!rawReply) return null;
    const text = String(rawReply).trim();

    // 1. Try direct clean JSON
    try {
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed && (parsed.ai_description || parsed.ai_impact || parsed.description || parsed.impact)) {
        return {
          ai_report_title: parsed.ai_report_title || taskName,
          ai_description: parsed.ai_description || parsed.description || parsed.ai_report_description || "",
          ai_impact: Array.isArray(parsed.ai_impact) ? parsed.ai_impact : (Array.isArray(parsed.impact) ? parsed.impact : (parsed.ai_report_impact ? [parsed.ai_report_impact] : []))
        };
      }
    } catch (_) {}

    // 2. Try JSON match inside string
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed && (parsed.ai_description || parsed.ai_impact || parsed.description || parsed.impact)) {
          return {
            ai_report_title: parsed.ai_report_title || taskName,
            ai_description: parsed.ai_description || parsed.description || parsed.ai_report_description || "",
            ai_impact: Array.isArray(parsed.ai_impact) ? parsed.ai_impact : (Array.isArray(parsed.impact) ? parsed.impact : (parsed.ai_report_impact ? [parsed.ai_report_impact] : []))
          };
        }
      } catch (_) {}
    }

    // 3. Fallback: Parse human Markdown/Text with "Description:" and "Impact: • ..."
    let desc = "";
    let impacts = [];

    const descMatch = text.match(/(?:description|overview|narrative)\s*[:=-]\s*([^\n\r]+(?:\n(?![•*-]|\d+[\.)]|impact)[^\n\r]+)*)/i);
    if (descMatch && descMatch[1]) {
      desc = descMatch[1].trim().replace(/^["']|["']$/g, '');
    }

    const impactSectionMatch = text.match(/(?:impact|outcomes|key impact|key outcomes|deliverables)\s*[:=-]\s*([\s\S]*)/i);
    const impactText = impactSectionMatch ? impactSectionMatch[1] : text;

    const bulletLines = impactText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => /^[•*-]\s+|\d+[\.)]\s+/.test(l))
      .map(l => l.replace(/^[•*-]\s+|\d+[\.)]\s+/, '').trim())
      .filter(l => l.length > 5 && !l.toLowerCase().startsWith('description:'));

    if (bulletLines.length > 0) {
      impacts = bulletLines;
    }

    if (!desc) {
      const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      for (const p of paragraphs) {
        if (!/^[•*-]|\d+[\.)]/.test(p) && !p.toLowerCase().startsWith('impact:')) {
          desc = p.replace(/\s+/g, ' ').trim();
          break;
        }
      }
    }

    if (desc || (impacts && impacts.length > 0)) {
      return {
        ai_report_title: taskName,
        ai_description: desc,
        ai_impact: impacts
      };
    }

    return null;
  }

  /**
   * Transforms a single task into AI report fields:
   * ai_report_title, ai_description, ai_impact, ai_category, ai_project_type
   * @param {Object} task
   * @param {Boolean} forceRegenerate - If true, bypasses cache
   */
  async transformTask(task, forceRegenerate = false) {
    if (!task) return null;

    // 1. Check cache unless forced
    if (!forceRegenerate) {
      const cached = this.cache ? this.cache.get(task) : null;
      if (cached && (cached.ai_description || cached.ai_report_description)) {
        return {
          ai_report_title: cached.ai_report_title,
          ai_description: cached.ai_description || cached.ai_report_description,
          ai_impact: cached.ai_impact || cached.ai_report_impact,
          ai_category: cached.ai_category || "Process Development",
          ai_project_type: cached.ai_project_type || "Process Improvement",
          fromCache: true
        };
      }
    }

    const provider = this.getProvider();

    // 2. OPENROUTER PROVIDER
    const hasOpenRouterKey = Boolean(this.getOpenRouterKey());
    const hasGeminiKey = Boolean(this.getApiKey());

    if (provider === "openrouter" || !hasGeminiKey) {
      try {
        const prompt = this.templates.buildTaskPrompt(task);
        const rawReply = await this.callOpenRouter([
          { role: "system", content: this.templates.SYSTEM_INSTRUCTION },
          { role: "user", content: prompt }
        ], this.config.TEMPERATURE, this.config.MAX_OUTPUT_TOKENS, false);

        const parsed = this.parseAiResponse(rawReply, task.task_name || task.original_task_name);
        if (!parsed || (!parsed.ai_description && (!parsed.ai_impact || parsed.ai_impact.length === 0))) {
          throw new Error("Could not extract narrative from OpenRouter response: " + String(rawReply || "").slice(0, 100));
        }

        const result = {
          ai_report_title: parsed.ai_report_title || task.task_name || task.original_task_name,
          ai_description: parsed.ai_description || "",
          ai_report_description: parsed.ai_description || "",
          ai_impact: Array.isArray(parsed.ai_impact) ? parsed.ai_impact : [parsed.ai_impact].filter(Boolean),
          ai_report_impact: Array.isArray(parsed.ai_impact) ? parsed.ai_impact : [parsed.ai_impact].filter(Boolean),
          ai_category: parsed.ai_category || "Process Development",
          ai_project_type: parsed.ai_project_type || "Process Improvement",
          fromCache: false,
          source: `openrouter:${this.getOpenRouterModel()}`
        };

        if (this.cache) this.cache.set(task, result);
        return result;
      } catch (err) {
        console.warn("OpenRouter API call notice, applying human-tone engineering rewrite:", err.message);
        const fallback = this.templates.localFactualTransform(task);
        if (this.cache) this.cache.set(task, fallback);
        return { ...fallback, fromCache: false, source: "fallback_after_openrouter_notice", error: err.message };
      }
    }

    // 3. GEMINI DIRECT PROVIDER
    const geminiKey = this.getApiKey();
    if (provider === "gemini" && geminiKey) {
      try {
        const prompt = this.templates.buildTaskPrompt(task);
        const url = `${this.config.API_ENDPOINT}/${this.config.DEFAULT_MODEL}:generateContent?key=${geminiKey}`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: this.templates.SYSTEM_INSTRUCTION + "\n\n" + prompt }]
            }],
            generationConfig: {
              temperature: this.config.TEMPERATURE,
              maxOutputTokens: this.config.MAX_OUTPUT_TOKENS,
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Gemini API HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts[0].text;
          const parsed = JSON.parse(text);

          const result = {
            ai_report_title: parsed.ai_report_title || task.task_name || task.original_task_name,
            ai_description: parsed.ai_description || parsed.ai_report_description || "",
            ai_impact: Array.isArray(parsed.ai_impact) ? parsed.ai_impact : (parsed.ai_report_impact ? [parsed.ai_report_impact] : []),
            ai_category: parsed.ai_category || "Process Development",
            ai_project_type: parsed.ai_project_type || "Process Improvement",
            fromCache: false,
            source: "gemini-3.8-flash"
          };

          if (this.cache) this.cache.set(task, result);
          return result;
        } else {
          throw new Error("Invalid response format from Gemini API");
        }
      } catch (err) {
        console.warn("Gemini API call failed, falling back to local factual transformation:", err.message);
        const fallback = this.templates.localFactualTransform(task);
        if (this.cache) this.cache.set(task, fallback);
        return { ...fallback, fromCache: false, source: "fallback_after_gemini_error", error: err.message };
      }
    }

    // 4. OFFLINE / LOCAL RULE FALLBACK
    const fallback = this.templates.localFactualTransform(task);
    if (this.cache) this.cache.set(task, fallback);
    return { ...fallback, fromCache: false, source: "local_rule" };
  }

  /**
   * Batch transforms multiple tasks
   */
  async batchTransformTasks(tasks = [], forceRegenerate = false) {
    const results = [];
    for (const task of tasks) {
      const transformed = await this.transformTask(task, forceRegenerate);
      task.ai_report_title = transformed.ai_report_title;
      task.ai_description = transformed.ai_description;
      task.ai_impact = transformed.ai_impact;
      task.ai_category = transformed.ai_category;
      task.ai_project_type = transformed.ai_project_type;
      results.push(task);
    }
    return results;
  }

  /**
   * Generates 4-5 industrial engineering milestone breakdown steps for a task
   * Uses OpenRouter Free API, Gemini, or domain-rich local template fallback
   * Ensures STRICT numbered format ("1. ... 2. ... 3. ... 4. ... 5. ...") with ZERO AI reasoning leakage
   */
  async generateTaskSteps(taskName = "", category = "") {
    const cleanName = (taskName || "").trim();
    if (!cleanName) return "";

    const provider = this.getProvider();

    // Helper to sanitize and normalize AI reply into concise 3-4 word bullet points
    const sanitizeSteps = (raw) => {
      if (!raw || typeof raw !== 'string') return "";
      let s = raw.trim();

      // 1. Remove thinking / reasoning XML tags from reasoning models
      s = s.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // 2. Strip common conversational filler prefixes
      s = s.replace(/^(?:The user wants|Here is|Sure|Here are|Okay|Below are|As an engineer|Step[- ]by[- ]step)[\s\S]*?:/i, '').trim();

      // 3. Remove markdown bold/italics/quotes
      s = s.replace(/[*_#`"]/g, '');

      // 4. Use helper to strictly enforce 3-4 words per bullet point
      const helpers = (typeof HELPERS !== 'undefined') ? HELPERS : (typeof require !== 'undefined' ? require('../utils/helpers') : null);
      if (helpers && helpers.formatDetailsAsShortBullets) {
        s = helpers.formatDetailsAsShortBullets(s);
      }

      // Ensure it has valid bullet content
      if (!s || s.length < 10) return "";
      return s;
    };

    // 1. Try OpenRouter (with strict 1500ms timeout race)
    if (provider === "openrouter" && this.getOpenRouterKey()) {
      try {
        const prompt = `You are an industrial process development engineer at Walton AC factory.
Task Name: "${cleanName}"
Category: "${category || "Process development"}"

INSTRUCTIONS:
Generate 4 to 5 bullet points for this engineering task.
EACH bullet point must be strictly 3 to 4 words and directly related to "${cleanName}".

FORMAT:
• [3-4 words] • [3-4 words] • [3-4 words] • [3-4 words]

EXAMPLE:
• 3D CAD modeling • Tooling fixture fabrication • Line trial run • Final SOP handover

Output ONLY the bullet points. Start immediately with "• ". Do NOT include intro, numbers, or explanation.`;

        const openRouterCall = this.callOpenRouter([
          { role: "system", content: "You are an expert industrial manufacturing engineer at Walton AC factory. Output strictly 4 to 5 bullet points of 3-4 words each. Start immediately with '• '." },
          { role: "user", content: prompt }
        ], 0.2, 200, false);

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
        const reply = await Promise.race([openRouterCall, timeoutPromise]);

        const cleaned = sanitizeSteps(reply);
        if (cleaned) {
          return cleaned;
        }
      } catch (err) {
        console.warn("OpenRouter fast step generation notice:", err.message);
      }
    }

    // 2. Try Gemini (with strict 1500ms timeout race)
    const geminiKey = this.getApiKey();
    if (provider === "gemini" && geminiKey) {
      try {
        const url = `${this.config.API_ENDPOINT}/${this.config.DEFAULT_MODEL}:generateContent?key=${geminiKey}`;
        const prompt = `You are a manufacturing process development engineer at Walton AC factory.
Task Name: "${cleanName}"
Category: "${category || "Process development"}"

Generate 4 to 5 bullet points directly related to "${cleanName}".
Each bullet point MUST be strictly 3 to 4 words.
Format strictly as: "• [3-4 words] • [3-4 words] • [3-4 words] • [3-4 words]".
No intro, no markdown, no numbers. Start directly with "• ".`;

        const geminiCall = fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
          })
        }).then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text.trim();
          }
          return "";
        });

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500));
        const text = await Promise.race([geminiCall, timeoutPromise]);

        if (text) {
          const cleaned = sanitizeSteps(text);
          if (cleaned) {
            return cleaned;
          }
        }
      } catch (err) {
        console.warn("Gemini fast step generation notice:", err.message);
      }
    }

    // 3. High-Quality Instant Deterministic Local Fallback (< 2ms guaranteed 3-4 word bullets)
    return this.templates.generateEngineeringSteps(cleanName, category);
  }

  /**
   * Generates executive management impact highlights (3 bullet points)
   * Focuses on cost savings, cycle time, quality, and safety
   */
  async generateManagementImpact(taskName = "", category = "", costImpact = "", timeline = "") {
    const provider = this.getProvider();

    if (provider === "openrouter" && this.getOpenRouterKey()) {
      try {
        const prompt = `Generate strictly 3 high-impact executive management outcomes for this manufacturing project:
Project Name: "${taskName}"
Category: "${category}"
Annual Cost Impact: "${costImpact || 'Significant cost avoidance and scrap reduction'}"
Timeline: "${timeline || 'Target FY 26-27'}"

RULES FOR HUMAN TONE:
- Write in an authentic, executive operations director tone at Walton Hi-Tech Industries.
- Format strictly as 3 bullet points starting with '• '.
- State genuine operational outcomes: cycle time reduction, scrap elimination, tooling repeatability, worker ergonomic safety, line yield.
- No robotic filler words. Keep each bullet under 18 words.`;

        const reply = await this.callOpenRouter([
          { role: "system", content: "You are the Head of Process Development at Walton Hi-Tech Industries PLC. Write in a realistic, authoritative, human executive tone." },
          { role: "user", content: prompt }
        ], 0.2, 250, false);

        if (reply && reply.trim()) {
          return reply.trim();
        }
      } catch (e) {
        console.warn("OpenRouter management impact generation fallback:", e.message);
      }
    }

    // Fallback deterministic executive bullets
    return [
      `• Streamlines manufacturing operations and enhances process reliability`,
      `• Generates verified cost avoidance of ${costImpact || 'annual financial impact'} and material savings`,
      `• Improves cycle time efficiency and ensures 100% quality compliance on Walton AC lines`
    ].join('\n');
  }
}

const geminiClient = new GeminiClient();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GeminiClient, geminiClient };
} else if (typeof window !== 'undefined') {
  window.GeminiClient = GeminiClient;
  window.geminiClient = geminiClient;
}
