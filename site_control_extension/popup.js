/* global browser */

const STORAGE_KEY = "siteControlConfig";

let currentConfig = {
  enabled: false,
  mode: "blacklist",
  sites: [],
};

// DOM elements
const statusDot = document.getElementById("statusDot");
const enabledToggle = document.getElementById("enabledToggle");
const modeSelect = document.getElementById("modeSelect");
const siteListEl = document.getElementById("siteList");
const newSiteInput = document.getElementById("newSiteInput");
const addSiteBtn = document.getElementById("addSiteBtn");
const exportArea = document.getElementById("exportArea");
const exportBtn = document.getElementById("exportBtn");
const copyExportBtn = document.getElementById("copyExportBtn");
const importArea = document.getElementById("importArea");
const importBtn = document.getElementById("importBtn");
const importMsg = document.getElementById("importMsg");

// Load config from storage on popup open
async function loadConfig() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY]) {
    currentConfig.enabled = stored[STORAGE_KEY].enabled || false;
    currentConfig.mode = stored[STORAGE_KEY].mode || "blacklist";
    currentConfig.sites = stored[STORAGE_KEY].sites || [];
  }
  updateUI();
}

// Save config to storage
async function saveConfig() {
  await browser.storage.local.set({ [STORAGE_KEY]: currentConfig });
  // Notify background script to reload
  try {
    await browser.runtime.sendMessage({ action: "reload-config" });
  } catch (e) {
    console.warn("Could not notify background:", e);
  }
}

// Update all UI elements based on current config
function updateUI() {
  statusDot.classList.toggle("active", currentConfig.enabled);
  enabledToggle.checked = currentConfig.enabled;
  modeSelect.value = currentConfig.mode;
  renderSiteList();
}

// Render the site list
function renderSiteList() {
  siteListEl.innerHTML = "";

  if (currentConfig.sites.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "empty-msg";
    emptyMsg.textContent = currentConfig.mode === "whitelist"
      ? "(no sites allowed)"
      : "(no sites blocked)";
    siteListEl.appendChild(emptyMsg);
    return;
  }

  currentConfig.sites.forEach((site, index) => {
    const item = document.createElement("div");
    item.className = "site-item";

    const label = document.createElement("span");
    label.textContent = site;
    label.title = site;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "×";
    removeBtn.className = "secondary";
    removeBtn.onclick = () => {
      currentConfig.sites.splice(index, 1);
      saveConfig();
      updateUI();
    };

    item.appendChild(label);
    item.appendChild(removeBtn);
    siteListEl.appendChild(item);
  });
}

// Add a new site to the list
function addSite() {
  const value = newSiteInput.value.trim();
  if (!value) return;

  // Avoid duplicates
  if (currentConfig.sites.includes(value)) {
    newSiteInput.select();
    return;
  }

  currentConfig.sites.push(value);
  saveConfig();
  updateUI();
  newSiteInput.value = "";
  newSiteInput.focus();
}

// Export config as base64 string
function exportConfig() {
  const data = JSON.stringify({
    enabled: currentConfig.enabled,
    mode: currentConfig.mode,
    sites: currentConfig.sites,
  });
  exportArea.value = btoa(data);
}

// Copy exported config to clipboard
async function copyExport() {
  if (!exportArea.value) return;
  try {
    await navigator.clipboard.writeText(exportArea.value);
    const originalText = copyExportBtn.textContent;
    copyExportBtn.textContent = "Copied!";
    setTimeout(() => { copyExportBtn.textContent = originalText; }, 1500);
  } catch (e) {
    exportArea.select();
    document.execCommand("copy");
  }
}

// Import config from base64 string
async function importConfig() {
  const value = importArea.value.trim();
  if (!value) return;

  try {
    const decoded = JSON.parse(atob(value));
    currentConfig.enabled = decoded.enabled !== undefined ? decoded.enabled : true;
    currentConfig.mode = decoded.mode || "blacklist";
    currentConfig.sites = Array.isArray(decoded.sites) ? decoded.sites : [];
    await saveConfig();
    updateUI();

    importMsg.textContent = `Imported: ${currentConfig.sites.length} sites (${currentConfig.mode})`;
    importMsg.className = "msg success";
    importArea.value = "";
  } catch (e) {
    console.error("Import failed:", e);
    importMsg.textContent = "Invalid config string. Please check and try again.";
    importMsg.className = "msg error";
  }

  // Clear message after a few seconds
  setTimeout(() => {
    if (importMsg.classList.contains("success")) {
      importMsg.textContent = "";
    }
  }, 5000);
}

// Event listeners
enabledToggle.addEventListener("change", () => {
  currentConfig.enabled = enabledToggle.checked;
  saveConfig();
  updateUI();
});

modeSelect.addEventListener("change", () => {
  currentConfig.mode = modeSelect.value;
  saveConfig();
  renderSiteList(); // Update empty message text
});

addSiteBtn.addEventListener("click", addSite);

newSiteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addSite();
  }
});

exportBtn.addEventListener("click", exportConfig);
copyExportBtn.addEventListener("click", copyExport);
importBtn.addEventListener("click", importConfig);

// Initialize on popup open
loadConfig();
