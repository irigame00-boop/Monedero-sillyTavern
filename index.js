// Monedero del Personaje — SillyTavern Extension
// Compatible con ST 1.8+

import { saveSettingsDebounced, getRequestHeaders } from "../../../../script.js";
import { getContext } from "../../../extensions.js";

const extensionName = "wallet";
const defaultSettings = {
    balance: 100,
    currency: "monedas",
    socialClass: "clase_media",
    transactions: [],
    enabled: true
};

// Configuración de clases sociales
const socialClasses = {
    mendigo: {
        label: "🪙 Mendigo",
        startBalance: 5,
        currency: "cobre",
        color: "#8B7355",
        maxBalance: 50,
        description: "Vive al día, cada moneda cuenta"
    },
    pobre: {
        label: "🥔 Pobre",
        startBalance: 30,
        currency: "monedas de cobre",
        color: "#A0856C",
        maxBalance: 200,
        description: "Trabajador humilde, ahorra con esfuerzo"
    },
    clase_baja: {
        label: "🔑 Clase baja",
        startBalance: 100,
        currency: "monedas",
        color: "#9E9E9E",
        maxBalance: 1000,
        description: "Puede cubrir necesidades básicas"
    },
    clase_media: {
        label: "💼 Clase media",
        startBalance: 500,
        currency: "monedas de plata",
        color: "#78909C",
        maxBalance: 10000,
        description: "Estable, puede darse algún lujo"
    },
    clase_alta: {
        label: "🏠 Clase alta",
        startBalance: 5000,
        currency: "monedas de oro",
        color: "#FFB300",
        maxBalance: 100000,
        description: "Vida cómoda, inversiones y propiedades"
    },
    noble: {
        label: "👑 Noble",
        startBalance: 25000,
        currency: "oro",
        color: "#FF8F00",
        maxBalance: 500000,
        description: "Tierra, títulos y vasallos"
    },
    rey: {
        label: "♛ Realeza",
        startBalance: 100000,
        currency: "tesoros reales",
        color: "#9C27B0",
        maxBalance: 9999999,
        description: "El reino entero es su patrimonio"
    }
};

let settings = {};

function loadSettings() {
    const ctx = getContext();
    if (!ctx.extensionSettings[extensionName]) {
        ctx.extensionSettings[extensionName] = Object.assign({}, defaultSettings);
    }
    settings = ctx.extensionSettings[extensionName];

    // Asegura que todos los campos existen
    for (const [k, v] of Object.entries(defaultSettings)) {
        if (settings[k] === undefined) settings[k] = v;
    }
}

function saveSettings() {
    saveSettingsDebounced();
}

// ── Panel principal ──────────────────────────────────────────────────────────
function buildPanel() {
    const cls = socialClasses[settings.socialClass] || socialClasses.clase_media;

    return `
<div id="wallet-panel">
  <div id="wallet-header">
    <span id="wallet-title">💰 Monedero</span>
    <span id="wallet-class-badge" style="background:${cls.color}">${cls.label}</span>
  </div>

  <div id="wallet-balance-area">
    <div id="wallet-balance-label">Saldo actual</div>
    <div id="wallet-balance-amount">${formatBalance(settings.balance, cls.currency)}</div>
    <div id="wallet-class-desc">${cls.description}</div>
  </div>

  <div id="wallet-actions">
    <div class="wallet-action-row">
      <input type="number" id="wallet-amount-input" placeholder="Cantidad" min="0" step="1">
      <input type="text" id="wallet-note-input" placeholder="Nota (opcional)">
    </div>
    <div class="wallet-action-row">
      <button id="wallet-earn-btn" class="wallet-btn wallet-btn-earn">＋ Ganar</button>
      <button id="wallet-spend-btn" class="wallet-btn wallet-btn-spend">－ Gastar</button>
      <button id="wallet-set-btn" class="wallet-btn wallet-btn-set">＝ Fijar</button>
    </div>
  </div>

  <div id="wallet-class-section">
    <label for="wallet-class-select">Clase social:</label>
    <select id="wallet-class-select">
      ${Object.entries(socialClasses).map(([k, v]) =>
        `<option value="${k}" ${k === settings.socialClass ? "selected" : ""}>${v.label}</option>`
      ).join("")}
    </select>
    <button id="wallet-apply-class" class="wallet-btn wallet-btn-set">Aplicar</button>
  </div>

  <div id="wallet-history-section">
    <div id="wallet-history-header">
      <span>📋 Historial</span>
      <button id="wallet-clear-history" class="wallet-btn-tiny">Limpiar</button>
    </div>
    <div id="wallet-history-list">${buildHistoryHTML()}</div>
  </div>
</div>`;
}

function formatBalance(amount, currency) {
    const abs = Math.abs(amount);
    let formatted;
    if (abs >= 1000000) formatted = (abs / 1000000).toFixed(1) + "M";
    else if (abs >= 1000) formatted = (abs / 1000).toFixed(1) + "K";
    else formatted = abs.toString();
    return `${amount < 0 ? "-" : ""}${formatted} <span class="wallet-currency">${currency}</span>`;
}

function buildHistoryHTML() {
    const list = (settings.transactions || []).slice(-15).reverse();
    if (!list.length) return `<div class="wallet-empty">Sin transacciones aún.</div>`;
    return list.map(t => {
        const sign = t.type === "earn" ? "+" : t.type === "spend" ? "-" : "=";
        const cls = t.type === "earn" ? "wallet-hist-earn" : t.type === "spend" ? "wallet-hist-spend" : "wallet-hist-set";
        return `<div class="wallet-hist-item ${cls}">
          <span class="wallet-hist-sign">${sign}</span>
          <span class="wallet-hist-val">${Math.abs(t.amount)}</span>
          <span class="wallet-hist-note">${t.note || ""}</span>
          <span class="wallet-hist-time">${t.time}</span>
        </div>`;
    }).join("");
}

function refreshPanel() {
    const cls = socialClasses[settings.socialClass] || socialClasses.clase_media;
    const badge = document.getElementById("wallet-class-badge");
    const amount = document.getElementById("wallet-balance-amount");
    const desc = document.getElementById("wallet-class-desc");
    const hist = document.getElementById("wallet-history-list");

    if (badge) { badge.textContent = cls.label; badge.style.background = cls.color; }
    if (amount) amount.innerHTML = formatBalance(settings.balance, cls.currency);
    if (desc) desc.textContent = cls.description;
    if (hist) hist.innerHTML = buildHistoryHTML();
}

function addTransaction(type, amount, note) {
    if (!settings.transactions) settings.transactions = [];
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")}`;
    settings.transactions.push({ type, amount, note, time });
    if (settings.transactions.length > 100) settings.transactions.shift();
    saveSettings();
    refreshPanel();
}

function bindEvents() {
    const earn = document.getElementById("wallet-earn-btn");
    const spend = document.getElementById("wallet-spend-btn");
    const set = document.getElementById("wallet-set-btn");
    const applyClass = document.getElementById("wallet-apply-class");
    const clearHist = document.getElementById("wallet-clear-history");

    earn?.addEventListener("click", () => {
        const v = parseFloat(document.getElementById("wallet-amount-input").value);
        if (isNaN(v) || v <= 0) return;
        const note = document.getElementById("wallet-note-input").value.trim();
        settings.balance += v;
        document.getElementById("wallet-amount-input").value = "";
        document.getElementById("wallet-note-input").value = "";
        addTransaction("earn", v, note);
    });

    spend?.addEventListener("click", () => {
        const v = parseFloat(document.getElementById("wallet-amount-input").value);
        if (isNaN(v) || v <= 0) return;
        const note = document.getElementById("wallet-note-input").value.trim();
        settings.balance -= v;
        document.getElementById("wallet-amount-input").value = "";
        document.getElementById("wallet-note-input").value = "";
        addTransaction("spend", v, note);
    });

    set?.addEventListener("click", () => {
        const v = parseFloat(document.getElementById("wallet-amount-input").value);
        if (isNaN(v)) return;
        const note = document.getElementById("wallet-note-input").value.trim();
        settings.balance = v;
        document.getElementById("wallet-amount-input").value = "";
        document.getElementById("wallet-note-input").value = "";
        addTransaction("set", v, note || "Saldo fijado manualmente");
    });

    applyClass?.addEventListener("click", () => {
        const sel = document.getElementById("wallet-class-select").value;
        settings.socialClass = sel;
        settings.currency = socialClasses[sel].currency;
        saveSettings();
        refreshPanel();
    });

    clearHist?.addEventListener("click", () => {
        if (confirm("¿Borrar todo el historial?")) {
            settings.transactions = [];
            saveSettings();
            refreshPanel();
        }
    });
}

// ── Inyección en el chat ─────────────────────────────────────────────────────
// Detecta menciones de dinero en los mensajes y actualiza automáticamente
function scanMessageForMoney(messageText) {
    if (!settings.enabled) return;

    // Patrones: "gastas X monedas", "recibes X oro", "pierdes X", "encuentras X monedas"
    const spendPatterns = [
        /(?:gastas?|pagas?|pierdes?|cobran?|cuesta[n]?)\s+(\d+(?:[.,]\d+)?)\s*(?:monedas?|oro|plata|cobre|reales?)?/gi,
        /(?:costo|coste|precio)[:\s]+(\d+(?:[.,]\d+)?)/gi,
    ];
    const earnPatterns = [
        /(?:recibes?|ganas?|encuentras?|te dan|cobras?|obtienes?)\s+(\d+(?:[.,]\d+)?)\s*(?:monedas?|oro|plata|cobre|reales?)?/gi,
        /(?:recompensa|pago|salario)[:\s]+(\d+(?:[.,]\d+)?)/gi,
    ];

    let changed = false;

    for (const pattern of spendPatterns) {
        let m;
        while ((m = pattern.exec(messageText)) !== null) {
            const v = parseFloat(m[1].replace(",", "."));
            if (!isNaN(v) && v > 0) {
                settings.balance -= v;
                addTransaction("spend", v, "Detectado automáticamente");
                changed = true;
            }
        }
    }

    for (const pattern of earnPatterns) {
        let m;
        while ((m = pattern.exec(messageText)) !== null) {
            const v = parseFloat(m[1].replace(",", "."));
            if (!isNaN(v) && v > 0) {
                settings.balance += v;
                addTransaction("earn", v, "Detectado automáticamente");
                changed = true;
            }
        }
    }

    if (changed) refreshPanel();
}

// ── Entrada del sistema ──────────────────────────────────────────────────────
// Inyecta el saldo actual en el prompt del personaje
function getSystemInjection() {
    const cls = socialClasses[settings.socialClass] || socialClasses.clase_media;
    return `[Estado financiero del personaje: Saldo actual = ${settings.balance} ${cls.currency}. Clase social: ${cls.label} (${cls.description}). Esto afecta sus posibilidades de compra, actitud y comportamiento.]`;
}

// ── Init ─────────────────────────────────────────────────────────────────────
jQuery(async () => {
    loadSettings();

    // Añade botón en la barra lateral de extensiones
    const toggleBtn = `<div id="wallet-toggle-btn" class="list-group-item flex-container flexGap5" title="Monedero del Personaje">
        <i class="fa-solid fa-wallet"></i>
        <span>Monedero</span>
    </div>`;
    $("#extensions_settings").append(toggleBtn);

    // Crea el drawer flotante
    const drawerHtml = `<div id="wallet-drawer" style="display:none;">${buildPanel()}</div>`;
    $("body").append(drawerHtml);

    bindEvents();

    // Toggle del panel
    $(document).on("click", "#wallet-toggle-btn", () => {
        const drawer = $("#wallet-drawer");
        drawer.toggle();
    });

    // Detectar mensajes nuevos del chat
    $(document).on("click", ".mes_edit_done, #send_but", () => {
        setTimeout(() => {
            const lastMsg = $(".mes:last .mes_text").text();
            if (lastMsg) scanMessageForMoney(lastMsg);
        }, 500);
    });

    // Hook para inyectar contexto en los prompts
    const originalGetPrompt = window.getSystemPrompt;
    if (typeof originalGetPrompt === "function") {
        window.getSystemPrompt = function(...args) {
            const base = originalGetPrompt.apply(this, args);
            return base + "\n" + getSystemInjection();
        };
    }

    console.log("[Monedero] Extensión cargada ✓");
});
