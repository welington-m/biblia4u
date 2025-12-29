/**
 * Bíblia Multi-Idiomas (PT/JA)
 * -----------------------------------------------------------------------------
 * Frontend estático para comparar versículos em Português/Japonês.
 *
 * Principais responsabilidades:
 * - Carregar lista de traduções PT/JA (com fallback se necessário)
 * - Buscar texto do capítulo por tradução/livro/capítulo
 * - Renderizar lista de versículos (texto base: PT) com seleção manual
 * - Abrir uma janela popup com a Tabela comparativa e mantê-la sincronizada
 * - Persistir configurações (tema e fonte do popup) em localStorage
 *
 * Autor:
 * - Welington Jose Miyazato
 *
 * Observação:
 * - A API externa pode ter restrições de CORS; o projeto usa proxy Nginx em /pp.
 */

(() => {
  // usa proxy do nginx (evita CORS do upstream)
  const API_BASE = "/pp";

  // Preferências (default)
  const PREF = {
    pt: ["TB10", "ARA", "NAA", "NTLH", "NVIPT"],
    ja: ["JPKJVNJB", "JPNICT", "JPKJV", "NJB"],
  };

  // Fallback mínimo (caso /get-languages falhe)
  const FALLBACK = {
    pt: [
      { short_name: "TB10", full_name: "Tradução Brasileira, 2010" },
      { short_name: "NTLH", full_name: "Nova Tradução na Linguagem de Hoje, 2000" },
      { short_name: "ARA", full_name: "Almeida Revista e Atualizada" },
    ],
    ja: [
      { short_name: "JPNICT", full_name: "新共同訳聖書 (Japanese New Interconfessional Translation)" },
      { short_name: "JPKJVNJB", full_name: "新改訳聖書 第三版 / New Japanese Bible - Shinkai-yaku, 2003" },
      { short_name: "JPKJV", full_name: "口語訳 (Kougo-yaku)" },
      { short_name: "NJB", full_name: "Japanese Bible (var.)" },
    ],
  };

  const BOOKS = [
    [1,"Gênesis"],[2,"Êxodo"],[3,"Levítico"],[4,"Números"],[5,"Deuteronômio"],
    [6,"Josué"],[7,"Juízes"],[8,"Rute"],[9,"1 Samuel"],[10,"2 Samuel"],
    [11,"1 Reis"],[12,"2 Reis"],[13,"1 Crônicas"],[14,"2 Crônicas"],[15,"Esdras"],
    [16,"Neemias"],[17,"Ester"],[18,"Jó"],[19,"Salmos"],[20,"Provérbios"],
    [21,"Eclesiastes"],[22,"Cantares"],[23,"Isaías"],[24,"Jeremias"],[25,"Lamentações"],
    [26,"Ezequiel"],[27,"Daniel"],[28,"Oséias"],[29,"Joel"],[30,"Amós"],
    [31,"Obadias"],[32,"Jonas"],[33,"Miquéias"],[34,"Naum"],[35,"Habacuque"],
    [36,"Sofonias"],[37,"Ageu"],[38,"Zacarias"],[39,"Malaquias"],
    [40,"Mateus"],[41,"Marcos"],[42,"Lucas"],[43,"João"],[44,"Atos"],
    [45,"Romanos"],[46,"1 Coríntios"],[47,"2 Coríntios"],[48,"Gálatas"],[49,"Efésios"],
    [50,"Filipenses"],[51,"Colossenses"],[52,"1 Tessalonicenses"],[53,"2 Tessalonicenses"],
    [54,"1 Timóteo"],[55,"2 Timóteo"],[56,"Tito"],[57,"Filemom"],[58,"Hebreus"],
    [59,"Tiago"],[60,"1 Pedro"],[61,"2 Pedro"],[62,"1 João"],[63,"2 João"],
    [64,"3 João"],[65,"Judas"],[66,"Apocalipse"]
  ];

  const $ = (id) => document.getElementById(id);

  let selected = { pt: "TB10", ja: "JPKJVNJB" };
  let translations = { pt: [], ja: [] };
  let chapterCache = new Map();

  // popup reference
  let cmpWin = null;
  let cmpWinReady = false;

  // settings
  const SETTINGS = {
    theme: "dark",      // "dark" | "light"
    cmpFontSize: 16     // px
  };

  // ---------- helpers ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m]));
  }

  function setStatus(kind, msg) {
    const statusEl = $("status");
    const icon = kind === "ok" ? "check_circle" : kind === "err" ? "error" : "info";
    statusEl.innerHTML = `<i class="material-icons tiny">${icon}</i> ${escapeHtml(msg)}`;
  }

  function setLangStatus(msg) {
    const langStatusEl = $("langStatus");
    langStatusEl.innerHTML = `<i class="material-icons tiny">translate</i> ${escapeHtml(msg)}`;
  }

  async function fetchJson(url, { timeoutMs = 15000 } = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} :: ${body.slice(0, 180)}`);
      }
      return await res.json();
    } finally {
      clearTimeout(t);
    }
  }

  function pickPreferred(list, prefArr) {
    const set = new Set(list.map((x) => x.short_name));
    for (const p of prefArr) if (set.has(p)) return p;
    return list[0]?.short_name || "";
  }

  function initMaterializeSelect(id) {
    const el = $(id);
    if (!el) return;
    if (window.M && M.FormSelect) {
      // destroy existing instance if any
      const inst = M.FormSelect.getInstance(el);
      if (inst) inst.destroy();
      M.FormSelect.init(el);
    }
  }

  function updateMaterializeTextFields() {
    if (window.M && M.updateTextFields) M.updateTextFields();
  }

// ============================================================================
// Settings: theme + font size (persisted)
// ============================================================================
  function loadSettingsFromStorage() {
    const theme = localStorage.getItem("theme");
    const fs = localStorage.getItem("cmpFontSize");
    if (theme === "light" || theme === "dark") SETTINGS.theme = theme;
    if (fs && Number.isFinite(Number(fs))) SETTINGS.cmpFontSize = Math.min(26, Math.max(12, Number(fs)));
  }

  function persistSettings() {
    localStorage.setItem("theme", SETTINGS.theme);
    localStorage.setItem("cmpFontSize", String(SETTINGS.cmpFontSize));
  }

  function applyTheme() {
    document.body.classList.toggle("theme-dark", SETTINGS.theme === "dark");
    document.body.classList.toggle("theme-light", SETTINGS.theme === "light");

    const toggle = $("themeToggle");
    if (toggle) toggle.checked = (SETTINGS.theme === "dark");

    // apply to popup if open
    applySettingsToPopup();
  }

  function applyFontSizeUI() {
    const slider = $("fontSize");
    const value = $("fontSizeValue");
    if (slider) slider.value = String(SETTINGS.cmpFontSize);
    if (value) value.textContent = String(SETTINGS.cmpFontSize);
    applySettingsToPopup();
  }

  function applySettingsToPopup() {
    if (!cmpWin || cmpWin.closed || !cmpWinReady) return;
    try {
      const clsDark = SETTINGS.theme === "dark";
      cmpWin.document.body.classList.toggle("theme-dark", clsDark);
      cmpWin.document.body.classList.toggle("theme-light", !clsDark);
      cmpWin.document.documentElement.style.setProperty("--cmp-font-size", `${SETTINGS.cmpFontSize}px`);

      // sync popup controls (if exist)
      const fs = cmpWin.document.getElementById("cmpFontSize");
      const fsV = cmpWin.document.getElementById("cmpFontValue");
      const th = cmpWin.document.getElementById("cmpThemeToggle");
      if (fs) fs.value = String(SETTINGS.cmpFontSize);
      if (fsV) fsV.textContent = String(SETTINGS.cmpFontSize);
      if (th) th.checked = (SETTINGS.theme === "dark");
    } catch {
      // ignore
    }
  }

  // receive popup changes
  function bindPostMessageListener() {
    window.addEventListener("message", (ev) => {
      if (ev.origin !== location.origin) return;
      const data = ev.data || {};
      if (data.type === "setFont" && Number.isFinite(Number(data.value))) {
        SETTINGS.cmpFontSize = Math.min(26, Math.max(12, Number(data.value)));
        persistSettings();
        applyFontSizeUI();
      }
      if (data.type === "setTheme" && (data.value === "dark" || data.value === "light")) {
        SETTINGS.theme = data.value;
        persistSettings();
        applyTheme();
      }
    });
  }

  // ---------- UI fill ----------
  function fillBooks() {
    const sel = $("book");
    sel.innerHTML = "";
    for (const [id, name] of BOOKS) {
      const opt = document.createElement("option");
      opt.value = String(id);
      opt.textContent = `${id}. ${name}`;
      sel.appendChild(opt);
    }
    sel.value = "4";       // Números
    $("chapter").value = "3";
    initMaterializeSelect("book");
  }

  function renderTranslationSelects() {
    const ptSel = $("ptSelect");
    const jaSel = $("jaSelect");
    ptSel.innerHTML = "";
    jaSel.innerHTML = "";

    for (const t of translations.pt) {
      const opt = document.createElement("option");
      opt.value = t.short_name;
      opt.textContent = `${t.short_name} — ${t.full_name}`;
      ptSel.appendChild(opt);
    }
    for (const t of translations.ja) {
      const opt = document.createElement("option");
      opt.value = t.short_name;
      opt.textContent = `${t.short_name} — ${t.full_name}`;
      jaSel.appendChild(opt);
    }

    if (!translations.pt.some((t) => t.short_name === selected.pt)) selected.pt = pickPreferred(translations.pt, PREF.pt);
    if (!translations.ja.some((t) => t.short_name === selected.ja)) selected.ja = pickPreferred(translations.ja, PREF.ja);

    ptSel.value = selected.pt;
    jaSel.value = selected.ja;

    $("ptCode").textContent = selected.pt || "—";
    $("jaCode").textContent = selected.ja || "—";

    initMaterializeSelect("ptSelect");
    initMaterializeSelect("jaSelect");

    setLangStatus(`PT: ${selected.pt} | JA: ${selected.ja}`);
  }

  async function loadTranslations() {
    setStatus("warn", "Carregando traduções…");
    try {
      const data = await fetchJson(`${API_BASE}/bible/get-languages/`);
      const ptEntry = data.find((e) => /Portuguese|Português/i.test(e.language));
      const jaEntry = data.find((e) => /Japanese|日本語|日本/i.test(e.language));

      translations.pt = (ptEntry?.translations || []).map((t) => ({ short_name: t.short_name, full_name: t.full_name }));
      translations.ja = (jaEntry?.translations || []).map((t) => ({ short_name: t.short_name, full_name: t.full_name }));

      if (!translations.pt.length) translations.pt = FALLBACK.pt;
      if (!translations.ja.length) translations.ja = FALLBACK.ja;

      selected.pt = pickPreferred(translations.pt, PREF.pt);
      selected.ja = pickPreferred(translations.ja, PREF.ja);

      renderTranslationSelects();
      setStatus("ok", "Pronto.");
    } catch (e) {
      console.error(e);
      translations.pt = FALLBACK.pt;
      translations.ja = FALLBACK.ja;
      selected.pt = pickPreferred(translations.pt, PREF.pt);
      selected.ja = pickPreferred(translations.ja, PREF.ja);
      renderTranslationSelects();
      setStatus("warn", `Fallback ativo. ${e.message || e}`);
    }
  }

  // ---------- verses ----------
  function clampInt(v, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  }

  function getVerseRange() {
    const start = clampInt($("vStart").value, 1, 999);
    const end = clampInt($("vEnd").value, 1, 999);
    if (start && end) return [Math.min(start, end), Math.max(start, end)];
    if (start && !end) return [start, start];
    return null;
  }

  function renderVerseListBase() {
    const container = $("verses");
    container.innerHTML = "";

    const baseMap = chapterCache.get(selected.pt);
    if (!baseMap || baseMap.size === 0) {
      const empty = document.createElement("div");
      empty.className = "app-mini";
      empty.style.padding = "12px";
      empty.innerHTML = `Nenhum verso carregado ainda. Clique em <b>Carregar</b>.`;
      container.appendChild(empty);
      return;
    }

    const range = getVerseRange();
    const [rs, re] = range ? range : [null, null];

    for (const [vNum, text] of baseMap.entries()) {
      if (range && (vNum < rs || vNum > re)) continue;

      const li = document.createElement("a");
      li.href = "javascript:void(0)";
      li.className = "collection-item";

      const row = document.createElement("div");
      row.className = "app-verse-row";

      const label = document.createElement("label");
      label.style.marginTop = "2px";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "filled-in";
      cb.dataset.v = String(vNum);
      cb.checked = !!range;
      cb.addEventListener("change", () => renderComparisonWindow());

      const span = document.createElement("span");
      span.textContent = "";

      label.appendChild(cb);
      label.appendChild(span);

      const num = document.createElement("div");
      num.className = "app-verse-num";
      num.textContent = String(vNum);

      const t = document.createElement("div");
      t.className = "app-verse-text";
      t.textContent = text;

      row.appendChild(label);
      row.appendChild(num);
      row.appendChild(t);
      li.appendChild(row);
      container.appendChild(li);
    }
  }

  function getSelectedVerseNumbersFromUI() {
    const boxes = document.querySelectorAll('#verses input[type="checkbox"]:checked');
    const nums = Array.from(boxes)
      .map((b) => Number(b.dataset.v))
      .filter((n) => Number.isFinite(n));
    nums.sort((a, b) => a - b);
    return nums;
  }

  function getVerseSetToShow() {
    const selectedNums = getSelectedVerseNumbersFromUI();
    if (selectedNums.length > 0) return selectedNums;

    const range = getVerseRange();
    if (range) {
      const [s, e] = range;
      const out = [];
      for (let i = s; i <= e; i++) out.push(i);
      return out;
    }

    const baseMap = chapterCache.get(selected.pt);
    if (!baseMap) return [];
    return Array.from(baseMap.keys()).sort((a, b) => a - b);
  }

  // ---------- popup window ----------
  function ensureComparisonWindowOpened() {
    // always open new window on each "Carregar" click
    cmpWinReady = false;
    cmpWin = window.open("about:blank", "_blank", "width=1200,height=800");
    try {
      void cmpWin.document; // força acesso
    } catch (e) {
      setStatus("err", "Não consegui escrever na janela (bloqueio de segurança). Remova noopener e tente novamente.");
      return false;
    }


    if (!cmpWin) {
      setStatus("err", "Popup bloqueado. Permita popups para http://localhost:8080.");
      return false;
    }
    buildComparisonWindowShell();
    return true;
  }

  function buildComparisonWindowShell() {
    const themeClass = SETTINGS.theme === "dark" ? "theme-dark" : "theme-light";
    const fontSize = SETTINGS.cmpFontSize;

    const doc = cmpWin.document;
    doc.open();
    doc.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Tabela comparativa</title>

  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
  <style>
    :root{ --cmp-font-size: ${fontSize}px; }

    html, body { height: 100%; }
    body{
      margin:0; height:100%;
      display:flex; flex-direction:column;
      font-size: var(--cmp-font-size);
    }

    /* Theme based on classes */
    body.theme-dark{
      background: linear-gradient(180deg,#070b14,#0b1220);
      color:#eaf0ff;
    }
    body.theme-light{
      background: linear-gradient(180deg,#ffffff,#f4f6fb);
      color:#0b1220;
    }
    /* Materialize nav text colors inside popup (fix for light theme) */
    .cmp-nav, .cmp-nav .brand-logo, .cmp-nav ul a, .cmp-nav .material-icons {
      color: inherit !important;
    }
    .cmp-by{
      font-weight: 500;
      font-size: 12px;
      opacity: .85;
      margin-left: 10px;
    }

    .cmp-nav{
      background: rgba(7,11,20,.75);
      border-bottom: 1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(10px);
    }
    body.theme-light .cmp-nav{
      background: rgba(255,255,255,.78);
      border-bottom: 1px solid rgba(0,0,0,.08);
    }

    .cmp-wrap{
      flex: 1 1 auto;
      min-height: 0;
      padding: 12px;
      width: min(1600px, 98vw);
      margin: 0 auto;
    }

    .cmp-card{
      height: 100%;
      border-radius: 16px;
      overflow: hidden;
    }

    .cmp-tablewrap{
      height: calc(100% - 0px);
      overflow: auto;
    }

    table{ width: 100%; border-collapse: collapse; min-width: 900px; }
    th, td{ padding: 12px; border-bottom: 1px solid rgba(255,255,255,.08); vertical-align: top; }
    body.theme-light th, body.theme-light td{ border-bottom: 1px solid rgba(0,0,0,.08); }
    thead th{
      position: sticky; top: 0; z-index: 2;
      background: rgba(12,18,34,.92);
      color: rgba(234,240,255,.75);
      font-size: 0.9em;
    }
    body.theme-light thead th{
      background: rgba(255,255,255,.95);
      color: rgba(11,18,32,.75);
    }

    .cmp-sub{ opacity:.78; font-size: 0.9em; }
    .cmp-accent{ font-weight: 800; }
    body.theme-dark .cmp-accent{ color:#5eead4; }
    body.theme-light .cmp-accent{ color:#0aa; }

    .cmp-controls{
      display:flex; gap:14px; align-items:center; flex-wrap:wrap;
      padding: 10px 12px;
    }
    .cmp-controls .range-field{ width: 220px; margin: 0; }
    .cmp-controls label{ font-size: 12px; }
    .cmp-chip{ margin: 0; }

    body.theme-dark .card{ background: rgba(17,26,46,.86); border: 1px solid rgba(255,255,255,.10); }
    body.theme-light .card{ background: rgba(255,255,255,.95); border: 1px solid rgba(0,0,0,.08); }

  </style>
</head>

<body class="${themeClass}">
  <nav class="cmp-nav z-depth-0">
    <div class="nav-wrapper" style="padding:0 12px;">
      <span class="brand-logo" style="font-size:16px;font-weight:800;">
        Tabela comparativa
        <span class="cmp-by">— Desenvolvido por: Welington Jose Miyazato</span>
      </span>

      <ul class="right">
        <li><span class="chip cmp-chip" id="cmpInfo">—</span></li>
      </ul>
    </div>
  </nav>

  <div class="cmp-controls">
    <div>
      <label>Fonte: <b id="cmpFontValue">${fontSize}</b>px</label>
      <p class="range-field">
        <input id="cmpFontSize" type="range" min="12" max="26" step="1" value="${fontSize}" />
      </p>
    </div>

    <div class="switch" style="margin-top:6px;">
      <label>
        Light
        <input id="cmpThemeToggle" type="checkbox" ${SETTINGS.theme === "dark" ? "checked" : ""}>
        <span class="lever"></span>
        Dark
      </label>
    </div>

    <span class="cmp-sub">Dica: a tabela atualiza quando você marca/desmarca versículos na janela principal.</span>
  </div>

  <div class="cmp-wrap">
    <div class="card cmp-card">
      <div class="card-content" style="height:100%; padding:0;">
        <div class="cmp-tablewrap">
          <table>
            <thead><tr id="cmpHead"></tr></thead>
            <tbody id="cmpBody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    // report changes to opener
    function post(type, value){
      try { window.opener && window.opener.postMessage({ type, value }, window.location.origin); } catch(e){}
    }

    const font = document.getElementById('cmpFontSize');
    const fontV = document.getElementById('cmpFontValue');
    font.addEventListener('input', () => {
      fontV.textContent = font.value;
      document.documentElement.style.setProperty('--cmp-font-size', font.value + 'px');
      post('setFont', Number(font.value));
    });

    const theme = document.getElementById('cmpThemeToggle');
    theme.addEventListener('change', () => {
      const mode = theme.checked ? 'dark' : 'light';
      document.body.classList.toggle('theme-dark', mode === 'dark');
      document.body.classList.toggle('theme-light', mode === 'light');
      post('setTheme', mode);
    });
  </script>
</body>
</html>`);
    doc.close();
    cmpWinReady = true;

    // apply settings + initial render
    applySettingsToPopup();
  }

  function renderComparisonWindow() {
    if (!cmpWin || cmpWin.closed || !cmpWinReady) return;

    const doc = cmpWin.document;
    const headRow = doc.getElementById("cmpHead");
    const body = doc.getElementById("cmpBody");
    const info = doc.getElementById("cmpInfo");
    if (!headRow || !body || !info) return;

    headRow.innerHTML = "";
    body.innerHTML = "";

    const verseNums = getVerseSetToShow();
    const book = Number($("book").value);
    const chapter = Number($("chapter").value);
    const bookName = BOOKS.find((b) => b[0] === book)?.[1] || `Livro ${book}`;

    info.innerHTML = `${escapeHtml(bookName)} ${chapter} — Versos: <span class="cmp-accent">${verseNums.length}</span> — PT: <span class="cmp-accent">${escapeHtml(selected.pt)}</span> | JA: <span class="cmp-accent">${escapeHtml(selected.ja)}</span>`;

    const th0 = doc.createElement("th");
    th0.textContent = "Verso";
    headRow.appendChild(th0);

    const thPT = doc.createElement("th");
    thPT.innerHTML = `Português<div class="cmp-sub">${escapeHtml(selected.pt)}</div>`;
    headRow.appendChild(thPT);

    const thJA = doc.createElement("th");
    thJA.innerHTML = `Japonês<div class="cmp-sub">${escapeHtml(selected.ja)}</div>`;
    headRow.appendChild(thJA);

    const ptMap = chapterCache.get(selected.pt) || new Map();
    const jaMap = chapterCache.get(selected.ja) || new Map();

    for (const vNum of verseNums) {
      const tr = doc.createElement("tr");

      const tdN = doc.createElement("td");
      tdN.innerHTML = `<b>${vNum}</b>`;
      tr.appendChild(tdN);

      const tdPT = doc.createElement("td");
      tdPT.textContent = ptMap.get(vNum) || "";
      tr.appendChild(tdPT);

      const tdJA = doc.createElement("td");
      tdJA.textContent = jaMap.get(vNum) || "";
      tr.appendChild(tdJA);

      body.appendChild(tr);
    }
  }

  function renderAll() {
    renderVerseListBase();
    renderComparisonWindow();
  }

  async function loadChapter() {
    const book = Number($("book").value);
    const chapter = Number($("chapter").value);

    if (!book || !chapter) {
      setStatus("err", "Informe livro e capítulo.");
      return;
    }
    if (!selected.pt || !selected.ja) {
      setStatus("err", "Selecione traduções PT/JA.");
      return;
    }

    // always open a new comparison window
    const opened = ensureComparisonWindowOpened();
    if (!opened) return;

    setStatus("warn", "Buscando capítulo…");
    chapterCache = new Map();

    const ptUrl = `${API_BASE}/bible/get-text/${encodeURIComponent(selected.pt)}/${book}/${chapter}/?clean=true`;
    const jaUrl = `${API_BASE}/bible/get-text/${encodeURIComponent(selected.ja)}/${book}/${chapter}/?clean=true`;

    const [ptRes, jaRes] = await Promise.allSettled([fetchJson(ptUrl), fetchJson(jaUrl)]);

    if (ptRes.status === "fulfilled") {
      const ptMap = new Map();
      (ptRes.value || []).forEach((v) => ptMap.set(Number(v.verse), v.text));
      chapterCache.set(selected.pt, ptMap);
    }

    if (jaRes.status === "fulfilled") {
      const jaMap = new Map();
      (jaRes.value || []).forEach((v) => jaMap.set(Number(v.verse), v.text));
      chapterCache.set(selected.ja, jaMap);
    }

    const msgs = [
      ptRes.status === "fulfilled" ? "PT ok" : "PT falhou",
      jaRes.status === "fulfilled" ? "JA ok" : "JA falhou",
    ];

    setStatus((ptRes.status === "fulfilled" || jaRes.status === "fulfilled") ? "ok" : "err", msgs.join(" | "));

    renderAll();
    try { cmpWin.focus(); } catch {}
  }

  function bindEvents() {
    $("loadBtn").addEventListener("click", loadChapter);

    $("clearSelBtn").addEventListener("click", () => {
      document.querySelectorAll('#verses input[type="checkbox"]').forEach((cb) => (cb.checked = false));
      renderComparisonWindow();
    });

    $("ptSelect").addEventListener("change", () => {
      selected.pt = $("ptSelect").value;
      $("ptCode").textContent = selected.pt || "—";
      chapterCache = new Map();
      renderAll();
    });

    $("jaSelect").addEventListener("change", () => {
      selected.ja = $("jaSelect").value;
      $("jaCode").textContent = selected.ja || "—";
      chapterCache = new Map();
      renderAll();
    });

    ["book", "chapter", "vStart", "vEnd"].forEach((id) => {
      $(id).addEventListener("change", () => {
        updateMaterializeTextFields();
        renderAll();
      });
    });

    // theme toggle
    $("themeToggle").addEventListener("change", () => {
      SETTINGS.theme = $("themeToggle").checked ? "dark" : "light";
      persistSettings();
      applyTheme();
    });

    // font size slider
    $("fontSize").addEventListener("input", () => {
      SETTINGS.cmpFontSize = Number($("fontSize").value);
      persistSettings();
      applyFontSizeUI();
      renderComparisonWindow();
    });
  }

  // ---------- boot ----------
  window.addEventListener("DOMContentLoaded", async () => {
    loadSettingsFromStorage();
    persistSettings();

    $("origin").textContent = location.origin;

    // Materialize init for pre-existing elements
    if (window.M) M.AutoInit();

    bindPostMessageListener();

    // Apply settings to main
    applyTheme();
    applyFontSizeUI();

    fillBooks();
    bindEvents();

    await loadTranslations();
    renderTranslationSelects();

    updateMaterializeTextFields();
    renderAll();

    setStatus("ok", "Pronto.");
  });
})();
