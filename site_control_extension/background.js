/* global browser */

// Site Access Control Extension Background Script
// Reads configuration from browser.storage.local and enforces whitelist/blacklist rules.

const STORAGE_KEY = "siteControlConfig";

let config = {
  enabled: false,    // Whether site control is active
  mode: "blacklist", // "whitelist" or "blacklist"
  sites: [],         // Array of URL patterns to allow/block
};

// Load configuration from storage
async function loadConfig() {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    if (stored[STORAGE_KEY]) {
      config.enabled = stored[STORAGE_KEY].enabled || false;
      config.mode = stored[STORAGE_KEY].mode || "blacklist";
      config.sites = stored[STORAGE_KEY].sites || [];
      console.log("[SiteControl] Config loaded:", config);
    } else {
      console.warn("[SiteControl] No config found, using defaults (disabled)");
    }
  } catch (e) {
    console.error("[SiteControl] Error loading config:", e.message);
  }
}

// Save configuration to storage
async function saveConfig() {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: config });
    console.log("[SiteControl] Config saved");
  } catch (e) {
    console.error("[SiteControl] Error saving config:", e.message);
  }
}

// Check if a URL matches any pattern in the list
function urlMatchesPatterns(url, patterns) {
  for (const pattern of patterns) {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname;
      const fullHost = parsedUrl.host;

      // Exact match against URL, hostname, or full host
      if (pattern === url || pattern === host || pattern === fullHost) {
        return true;
      }

      // Prefix match: ".example.com" matches "www.example.com/page"
      if (host.endsWith(pattern) && pattern.startsWith(".")) {
        return true;
      }

      // HTTP(S) prefix match: "https://example.com*" matches any path under that domain
      if ((pattern.startsWith("http://") || pattern.startsWith("https://")) && !pattern.includes("*")) {
        if (url.startsWith(pattern.replace(/\*$/, ""))) {
          return true;
        }
      }

      // Wildcard match: "*.example.com" matches any subdomain
      if (pattern.includes("*")) {
        const regexPattern = "^" + pattern.replace(/\./g, "\\.").replace(/\*/g, "[^.]+") + "$";
        const regex = new RegExp(regexPattern);
        if (regex.test(host)) {
          return true;
        }
      }
    } catch (e) {
      // If URL parsing fails, try simple string matching
      if (url.includes(pattern.replace("*", ""))) {
        return true;
      }
    }
  }
  return false;
}

// Determine if a request should be blocked based on current config
function shouldBlock(url) {
  // Skip blocking for about: pages.
  if (url.startsWith("about:")) {
    return false;
  }
  // If control is disabled, allow everything
  if (!config.enabled) {
    return false;
  }
  const isMatched = urlMatchesPatterns(url, config.sites);

  if (config.mode === "whitelist") {
    // Block everything NOT in the whitelist (only if whitelist is non-empty)
    return !isMatched && config.sites.length > 0;
  } else {
    // Blacklist mode: block what's in the list
    return isMatched;
  }
}

// Listen for messages from popup or external tools
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "get-config") {
    sendResponse({ config });
    return true; // Keep channel open for async response
  }

  if (message.action === "set-config") {
    config.enabled = message.config.enabled !== undefined ? message.config.enabled : config.enabled;
    config.mode = message.config.mode || config.mode;
    config.sites = message.config.sites !== undefined ? message.config.sites : config.sites;
    saveConfig();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === "import-config") {
    // Import a base64-encoded config string
    try {
      const decoded = JSON.parse(atob(message.data));
      config.enabled = decoded.enabled !== undefined ? decoded.enabled : true;
      config.mode = decoded.mode || "blacklist";
      config.sites = decoded.sites || [];
      saveConfig();
      sendResponse({ success: true, message: "Configuration imported successfully" });
    } catch (e) {
      console.error("[SiteControl] Import failed:", e.message);
      sendResponse({ success: false, error: "Invalid configuration format" });
    }
    return true;
  }

  if (message.action === "export-config") {
    // Export config as base64-encoded string for copy-paste import elsewhere
    const exportData = JSON.stringify({
      enabled: config.enabled,
      mode: config.mode,
      sites: config.sites,
    });
    sendResponse({ success: true, data: btoa(exportData) });
    return true;
  }

  if (message.action === "reload-config") {
    loadConfig();
    sendResponse({ success: true });
  }
});

// Register the request blocker
browser.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (shouldBlock(details.url)) {
      console.log("[SiteControl] Blocked:", details.url);
      return { cancel: true };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Load config on startup
loadConfig();
console.log("[SiteControl] Extension initialized");
