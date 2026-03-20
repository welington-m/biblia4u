/**
 * Bíblia Multi-Idiomas
 * -----------------------------------------------------------------------------
 * Frontend estático para comparar versículos em Português, Espanhol, Inglês
 * e Japonês.
 *
 * Principais responsabilidades:
 * - Carregar lista de traduções por idioma
 * - Buscar texto do capítulo por tradução/livro/capítulo
 * - Renderizar lista de versículos com seleção manual
 * - Abrir a Tabela comparativa em popup e mantê-la sincronizada
 * - Persistir configurações (tema e fonte do popup) em localStorage
 *
 * Autor:
 * - Welington Jose Miyazato
 *
 * Observação:
 * - A API externa pode ter restrições de CORS; o projeto usa proxy Nginx em /pp.
 */

(() => {
  const API_BASE = "/pp";

  const LANGUAGE_CONFIG = {
    pt: {
      label: "Português",
      nativeLabel: "Português",
      patterns: [/Portuguese|Português/i],
      pref: ["TB10", "ARA", "NAA", "NTLH", "NVIPT"],
      fallback: [
        { short_name: "TB10", full_name: "Tradução Brasileira, 2010" },
        { short_name: "NTLH", full_name: "Nova Tradução na Linguagem de Hoje, 2000" },
        { short_name: "ARA", full_name: "Almeida Revista e Atualizada" },
      ],
    },
    es: {
      label: "Espanhol",
      nativeLabel: "Español",
      patterns: [/Spanish|Español|Espanhol/i],
      pref: ["RVR60", "NVI", "LBLA", "DHH"],
      fallback: [
        { short_name: "RVR60", full_name: "Reina-Valera 1960" },
        { short_name: "NVI", full_name: "Nueva Version Internacional" },
        { short_name: "LBLA", full_name: "La Biblia de las Americas" },
      ],
    },
    en: {
      label: "Inglês",
      nativeLabel: "English",
      patterns: [/English|Ingl[eê]s/i],
      pref: ["KJV", "WEB", "ASV", "NIV"],
      fallback: [
        { short_name: "KJV", full_name: "King James Version" },
        { short_name: "WEB", full_name: "World English Bible" },
        { short_name: "ASV", full_name: "American Standard Version" },
      ],
    },
    ja: {
      label: "Japonês",
      nativeLabel: "日本語",
      patterns: [/Japanese|日本語|日本/i],
      pref: ["JPKJVNJB", "JPNICT", "JPKJV", "NJB"],
      fallback: [
        { short_name: "JPNICT", full_name: "新共同訳聖書 (Japanese New Interconfessional Translation)" },
        { short_name: "JPKJVNJB", full_name: "新改訳聖書 第三版 / New Japanese Bible - Shinkai-yaku, 2003" },
        { short_name: "JPKJV", full_name: "口語訳 (Kougo-yaku)" },
        { short_name: "NJB", full_name: "Japanese Bible (var.)" },
      ],
    },
  };

  const LANGUAGE_KEYS = Object.keys(LANGUAGE_CONFIG);

  const BOOKS = [
    [1, "Gênesis"], [2, "Êxodo"], [3, "Levítico"], [4, "Números"], [5, "Deuteronômio"],
    [6, "Josué"], [7, "Juízes"], [8, "Rute"], [9, "1 Samuel"], [10, "2 Samuel"],
    [11, "1 Reis"], [12, "2 Reis"], [13, "1 Crônicas"], [14, "2 Crônicas"], [15, "Esdras"],
    [16, "Neemias"], [17, "Ester"], [18, "Jó"], [19, "Salmos"], [20, "Provérbios"],
    [21, "Eclesiastes"], [22, "Cantares"], [23, "Isaías"], [24, "Jeremias"], [25, "Lamentações"],
    [26, "Ezequiel"], [27, "Daniel"], [28, "Oséias"], [29, "Joel"], [30, "Amós"],
    [31, "Obadias"], [32, "Jonas"], [33, "Miquéias"], [34, "Naum"], [35, "Habacuque"],
    [36, "Sofonias"], [37, "Ageu"], [38, "Zacarias"], [39, "Malaquias"],
    [40, "Mateus"], [41, "Marcos"], [42, "Lucas"], [43, "João"], [44, "Atos"],
    [45, "Romanos"], [46, "1 Coríntios"], [47, "2 Coríntios"], [48, "Gálatas"], [49, "Efésios"],
    [50, "Filipenses"], [51, "Colossenses"], [52, "1 Tessalonicenses"], [53, "2 Tessalonicenses"],
    [54, "1 Timóteo"], [55, "2 Timóteo"], [56, "Tito"], [57, "Filemom"], [58, "Hebreus"],
    [59, "Tiago"], [60, "1 Pedro"], [61, "2 Pedro"], [62, "1 João"], [63, "2 João"],
    [64, "3 João"], [65, "Judas"], [66, "Apocalipse"],
  ];

  const BOOK_NAMES_BY_LANGUAGE = {
    pt: [
      "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué", "Juízes", "Rute", "1 Samuel", "2 Samuel",
      "1 Reis", "2 Reis", "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó", "Salmos", "Provérbios",
      "Eclesiastes", "Cantares", "Isaías", "Jeremias", "Lamentações", "Ezequiel", "Daniel", "Oséias", "Joel", "Amós",
      "Obadias", "Jonas", "Miquéias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias", "Malaquias", "Mateus",
      "Marcos", "Lucas", "João", "Atos", "Romanos", "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses",
      "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo", "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro",
      "2 Pedro", "1 João", "2 João", "3 João", "Judas", "Apocalipse",
    ],
    es: [
      "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio", "Josué", "Jueces", "Rut", "1 Samuel", "2 Samuel",
      "1 Reyes", "2 Reyes", "1 Crónicas", "2 Crónicas", "Esdras", "Nehemías", "Ester", "Job", "Salmos", "Proverbios",
      "Eclesiastés", "Cantares", "Isaías", "Jeremías", "Lamentaciones", "Ezequiel", "Daniel", "Oseas", "Joel", "Amós",
      "Abdías", "Jonás", "Miqueas", "Nahúm", "Habacuc", "Sofonías", "Hageo", "Zacarías", "Malaquías", "Mateo",
      "Marcos", "Lucas", "Juan", "Hechos", "Romanos", "1 Corintios", "2 Corintios", "Gálatas", "Efesios", "Filipenses",
      "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo", "2 Timoteo", "Tito", "Filemón", "Hebreos", "Santiago", "1 Pedro",
      "2 Pedro", "1 Juan", "2 Juan", "3 Juan", "Judas", "Apocalipsis",
    ],
    en: [
      "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
      "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
      "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
      "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew",
      "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
      "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter",
      "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
    ],
    ja: [
      "創世記", "出エジプト記", "レビ記", "民数記", "申命記", "ヨシュア記", "士師記", "ルツ記", "サムエル記上", "サムエル記下",
      "列王記上", "列王記下", "歴代誌上", "歴代誌下", "エズラ記", "ネヘミヤ記", "エステル記", "ヨブ記", "詩篇", "箴言",
      "伝道者の書", "雅歌", "イザヤ書", "エレミヤ書", "哀歌", "エゼキエル書", "ダニエル書", "ホセア書", "ヨエル書", "アモス書",
      "オバデヤ書", "ヨナ書", "ミカ書", "ナホム書", "ハバクク書", "ゼパニヤ書", "ハガイ書", "ゼカリヤ書", "マラキ書", "マタイによる福音書",
      "マルコによる福音書", "ルカによる福音書", "ヨハネによる福音書", "使徒言行録", "ローマの信徒への手紙", "コリントの信徒への手紙一", "コリントの信徒への手紙二", "ガラテヤの信徒への手紙", "エフェソの信徒への手紙", "フィリピの信徒への手紙",
      "コロサイの信徒への手紙", "テサロニケの信徒への手紙一", "テサロニケの信徒への手紙二", "テモテへの手紙一", "テモテへの手紙二", "テトスへの手紙", "フィレモンへの手紙", "ヘブライ人への手紙", "ヤコブの手紙", "ペトロの手紙一",
      "ペトロの手紙二", "ヨハネの手紙一", "ヨハネの手紙二", "ヨハネの手紙三", "ユダの手紙", "ヨハネの黙示録",
    ],
  };

  const $ = (id) => document.getElementById(id);

  let activeLanguages = new Set(LANGUAGE_KEYS);
  let selected = { pt: "TB10", es: "RVR60", en: "KJV", ja: "JPKJVNJB" };
  let translations = { pt: [], es: [], en: [], ja: [] };
  let chapterCache = new Map();
  let selectedVerseNumbers = new Set();
  let loadSeq = 0;

  let cmpWin = null;
  let cmpWinReady = false;

  const SETTINGS = {
    theme: "dark",
    cmpFontSize: 16,
  };

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
      const inst = M.FormSelect.getInstance(el);
      if (inst) inst.destroy();
      M.FormSelect.init(el);
    }
  }

  function updateMaterializeTextFields() {
    if (window.M && M.updateTextFields) M.updateTextFields();
  }

  function getActiveLanguages() {
    return LANGUAGE_KEYS.filter((langKey) => activeLanguages.has(langKey));
  }

  function getPrimaryLanguage() {
    return getActiveLanguages()[0];
  }

  function getPrimaryTranslationCode() {
    const lang = getPrimaryLanguage();
    return selected[lang] || "";
  }

  function getBookAndChapter() {
    return {
      book: Number($("book").value),
      chapter: Number($("chapter").value),
    };
  }

  function getBookNameForLanguage(langKey, bookNumber) {
    const names = BOOK_NAMES_BY_LANGUAGE[langKey] || [];
    return names[bookNumber - 1] || BOOKS.find((item) => item[0] === bookNumber)?.[1] || `Livro ${bookNumber}`;
  }

  function clearChapterState() {
    chapterCache = new Map();
    selectedVerseNumbers = new Set();
  }

  function selectAllVersesFromBase() {
    const baseMap = chapterCache.get(getPrimaryTranslationCode());
    selectedVerseNumbers = new Set(baseMap ? Array.from(baseMap.keys()) : []);
  }

  function loadSettingsFromStorage() {
    const theme = localStorage.getItem("theme");
    const fs = localStorage.getItem("cmpFontSize");
    if (theme === "light" || theme === "dark") SETTINGS.theme = theme;
    if (fs && Number.isFinite(Number(fs))) SETTINGS.cmpFontSize = Math.min(76, Math.max(12, Number(fs)));
  }

  function persistSettings() {
    localStorage.setItem("theme", SETTINGS.theme);
    localStorage.setItem("cmpFontSize", String(SETTINGS.cmpFontSize));
  }

  function applyTheme() {
    document.body.classList.toggle("theme-dark", SETTINGS.theme === "dark");
    document.body.classList.toggle("theme-light", SETTINGS.theme === "light");

    const toggle = $("themeToggle");
    if (toggle) toggle.checked = SETTINGS.theme === "dark";

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
    } catch {
      // ignore
    }
  }

  function bindPostMessageListener() {
    window.addEventListener("message", (ev) => {
      if (ev.origin !== location.origin) return;
      const data = ev.data || {};
      if (data.type === "setFont" && Number.isFinite(Number(data.value))) {
        SETTINGS.cmpFontSize = Math.min(76, Math.max(12, Number(data.value)));
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

  function fillBooks() {
    const sel = $("book");
    sel.innerHTML = "";
    for (const [id, name] of BOOKS) {
      const opt = document.createElement("option");
      opt.value = String(id);
      opt.textContent = `${id}. ${name}`;
      sel.appendChild(opt);
    }
    sel.value = "4";
    $("chapter").value = "3";
    initMaterializeSelect("book");
  }

  function renderTranslationSelect(langKey) {
    const selectEl = $(`${langKey}Select`);
    if (!selectEl) return;

    selectEl.innerHTML = "";
    for (const t of translations[langKey]) {
      const opt = document.createElement("option");
      opt.value = t.short_name;
      opt.textContent = `${t.short_name} — ${t.full_name}`;
      selectEl.appendChild(opt);
    }

    if (!translations[langKey].some((t) => t.short_name === selected[langKey])) {
      selected[langKey] = pickPreferred(translations[langKey], LANGUAGE_CONFIG[langKey].pref);
    }

    selectEl.value = selected[langKey];
    $(`${langKey}Code`).textContent = selected[langKey] || "—";
    initMaterializeSelect(`${langKey}Select`);
  }

  function updateLanguageVisibility() {
    const active = new Set(getActiveLanguages());
    document.querySelectorAll(".app-translation-group").forEach((el) => {
      const shouldShow = active.has(el.dataset.lang);
      el.style.display = shouldShow ? "" : "none";
    });

    $("baseLanguageLabel").textContent = LANGUAGE_CONFIG[getPrimaryLanguage()].label;
  }

  function syncLanguageCheckboxes() {
    const enabled = new Set(getActiveLanguages());
    document.querySelectorAll(".app-lang-toggle").forEach((el) => {
      el.checked = enabled.has(el.dataset.lang);
    });

    $("langAll").checked = LANGUAGE_KEYS.every((langKey) => enabled.has(langKey));
  }

  function updateLanguageSummary() {
    const summary = getActiveLanguages()
      .map((langKey) => `${langKey.toUpperCase()}: ${selected[langKey] || "—"}`)
      .join(" | ");
    setLangStatus(summary || "Sem idioma selecionado");
  }

  function renderTranslationSelects() {
    LANGUAGE_KEYS.forEach(renderTranslationSelect);
    syncLanguageCheckboxes();
    updateLanguageVisibility();
    updateLanguageSummary();
  }

  async function loadTranslations() {
    setStatus("warn", "Carregando traduções…");
    try {
      const data = await fetchJson(`${API_BASE}/bible/get-languages/`);
      for (const langKey of LANGUAGE_KEYS) {
        const cfg = LANGUAGE_CONFIG[langKey];
        const entry = data.find((item) => cfg.patterns.some((pattern) => pattern.test(item.language || "")));
        translations[langKey] = (entry?.translations || []).map((t) => ({
          short_name: t.short_name,
          full_name: t.full_name,
        }));
        if (!translations[langKey].length) translations[langKey] = cfg.fallback;
        selected[langKey] = pickPreferred(translations[langKey], cfg.pref);
      }

      renderTranslationSelects();
      setStatus("ok", "Traduções carregadas.");
    } catch (e) {
      console.error(e);
      for (const langKey of LANGUAGE_KEYS) {
        translations[langKey] = LANGUAGE_CONFIG[langKey].fallback;
        selected[langKey] = pickPreferred(translations[langKey], LANGUAGE_CONFIG[langKey].pref);
      }
      renderTranslationSelects();
      setStatus("warn", `Fallback ativo. ${e.message || e}`);
    }
  }

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

  function getVersesForBaseList() {
    return chapterCache.get(getPrimaryTranslationCode()) || new Map();
  }

  function renderVerseListBase() {
    const container = $("verses");
    container.innerHTML = "";

    const baseMap = getVersesForBaseList();
    if (!baseMap || baseMap.size === 0) {
      const empty = document.createElement("div");
      empty.className = "app-mini";
      empty.style.padding = "12px";
      empty.innerHTML = `Nenhum verso carregado ainda. Clique em <b>Carregar</b>.`;
      container.appendChild(empty);
      return;
    }

    const range = getVerseRange();
    const [rs, re] = range || [null, null];

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
      cb.checked = selectedVerseNumbers.has(vNum);
      cb.addEventListener("change", () => {
        if (cb.checked) selectedVerseNumbers.add(vNum);
        else selectedVerseNumbers.delete(vNum);
        renderComparisonWindow();
      });

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
    const nums = Array.from(selectedVerseNumbers).filter((n) => Number.isFinite(n));
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
      for (let i = s; i <= e; i += 1) out.push(i);
      return out;
    }

    const baseMap = getVersesForBaseList();
    if (!baseMap) return [];
    return Array.from(baseMap.keys()).sort((a, b) => a - b);
  }

  function ensureComparisonWindowOpened({ forceRebuild = false } = {}) {
    if (cmpWin && !cmpWin.closed && cmpWinReady && !forceRebuild) return true;

    cmpWinReady = false;
    cmpWin = window.open("about:blank", "biblia4u-comparison", "width=1200,height=800");
    if (!cmpWin) {
      setStatus("err", "Popup bloqueado. Permita popups para http://localhost:8080.");
      return false;
    }

    try {
      void cmpWin.document;
    } catch {
      setStatus("err", "Não consegui escrever na janela de comparação.");
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
  <title>Tabela comparativa — Welington Jose Miyazato</title>
  <style>
    :root { --cmp-font-size: ${fontSize}px; }
    html, body { height: 100%; }
    body{
      margin:0;
      height:100%;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      font-size: var(--cmp-font-size);
      display:flex;
    }
    body.theme-dark{
      background: linear-gradient(180deg,#070b14,#0b1220);
      color:#eaf0ff;
    }
    body.theme-light{
      background: linear-gradient(180deg,#ffffff,#f4f6fb);
      color:#0b1220;
    }
    .cmp-wrap{
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
      padding: 12px;
      display:flex;
    }
    .cmp-card{
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
      border-radius: 18px;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(17,26,46,.86);
      box-shadow: 0 14px 40px rgba(0,0,0,.28);
      display:flex;
      flex-direction: column;
    }
    body.theme-light .cmp-card{
      border: 1px solid rgba(0,0,0,.08);
      background: rgba(255,255,255,.95);
      box-shadow: 0 14px 40px rgba(0,0,0,.10);
    }
    .cmp-toolbar{
      display:flex;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      font-size: 0.92em;
    }
    body.theme-light .cmp-toolbar{
      border-bottom: 1px solid rgba(0,0,0,.08);
    }
    .cmp-info{
      opacity:.78;
      font-weight:600;
    }
    .cmp-tablewrap{
      flex: 1 1 auto;
      min-width: 0;
      min-height: 0;
      overflow: auto;
    }
    table{
      width:100%;
      border-collapse: collapse;
      min-width: 900px;
    }
    th, td{
      padding: 14px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      vertical-align: top;
    }
    body.theme-light th, body.theme-light td{
      border-bottom: 1px solid rgba(0,0,0,.08);
    }
    thead th{
      position: sticky;
      top: 0;
      z-index: 2;
      background: rgba(12,18,34,.92);
      color: rgba(234,240,255,.78);
      font-weight: 700;
      font-size: 0.95em;
      backdrop-filter: blur(10px);
    }
    body.theme-light thead th{
      background: rgba(255,255,255,.96);
      color: rgba(11,18,32,.78);
    }
    .sub{
      display:block;
      margin-top: 4px;
      opacity: .75;
      font-weight: 600;
      font-size: 0.85em;
    }
  </style>
</head>
<body class="${themeClass}">
  <div class="cmp-wrap">
    <div class="cmp-card">
      <div class="cmp-toolbar">
        <div><b>Tabela comparativa</b></div>
        <div id="cmpInfo" class="cmp-info">Aguardando capítulo…</div>
      </div>
      <div class="cmp-tablewrap">
        <table>
          <thead><tr id="cmpHead"></tr></thead>
          <tbody id="cmpBody"></tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>`);
    doc.close();
    cmpWinReady = true;
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
    const { book, chapter } = getBookAndChapter();
    const bookName = BOOKS.find((item) => item[0] === book)?.[1] || `Livro ${book}`;
    const activeLanguages = getActiveLanguages();

    info.textContent = `${bookName} ${chapter} | ${verseNums.length} verso(s) | ${activeLanguages.map((lang) => LANGUAGE_CONFIG[lang].label).join(" / ")}`;

    const th0 = doc.createElement("th");
    th0.textContent = "Verso";
    headRow.appendChild(th0);

    for (const langKey of activeLanguages) {
      const th = doc.createElement("th");
      const nativeBookName = getBookNameForLanguage(langKey, book);
      th.innerHTML = `${escapeHtml(LANGUAGE_CONFIG[langKey].nativeLabel)}<span class="sub">${escapeHtml(nativeBookName)} | ${escapeHtml(selected[langKey])}</span>`;
      headRow.appendChild(th);
    }

    for (const vNum of verseNums) {
      const tr = doc.createElement("tr");

      const tdN = doc.createElement("td");
      tdN.innerHTML = `<b>${vNum}</b>`;
      tr.appendChild(tdN);

      for (const langKey of activeLanguages) {
        const td = doc.createElement("td");
        const verseMap = chapterCache.get(selected[langKey]) || new Map();
        td.textContent = verseMap.get(vNum) || "";
        tr.appendChild(td);
      }

      body.appendChild(tr);
    }
  }

  function renderAll() {
    updateLanguageVisibility();
    updateLanguageSummary();
    renderVerseListBase();
    renderComparisonWindow();
  }

  async function loadChapter({ ensureWindow = false } = {}) {
    const { book, chapter } = getBookAndChapter();
    const activeLanguages = getActiveLanguages();
    const currentLoad = ++loadSeq;

    if (!book || !chapter) {
      setStatus("err", "Informe livro e capítulo.");
      return;
    }

    const missing = activeLanguages.filter((langKey) => !selected[langKey]);
    if (missing.length > 0) {
      setStatus("err", `Selecione a tradução de ${missing.map((lang) => LANGUAGE_CONFIG[lang].label).join(", ")}.`);
      return;
    }

    if (ensureWindow) {
      const opened = ensureComparisonWindowOpened();
      if (!opened) return;
    }

    setStatus("warn", "Buscando capítulo…");
    clearChapterState();
    renderAll();

    const requests = activeLanguages.map((langKey) => {
      const code = selected[langKey];
      const url = `${API_BASE}/bible/get-text/${encodeURIComponent(code)}/${book}/${chapter}/?clean=true`;
      return fetchJson(url)
        .then((value) => ({ status: "fulfilled", langKey, value }))
        .catch((reason) => ({ status: "rejected", langKey, reason }));
    });

    const results = await Promise.all(requests);
    if (currentLoad !== loadSeq) return;

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const verseMap = new Map();
      (result.value || []).forEach((v) => verseMap.set(Number(v.verse), v.text));
      chapterCache.set(selected[result.langKey], verseMap);
    }

    selectAllVersesFromBase();
    renderAll();

    const okCount = results.filter((result) => result.status === "fulfilled").length;
    const summary = results
      .map((result) => `${result.langKey.toUpperCase()} ${result.status === "fulfilled" ? "ok" : "falhou"}`)
      .join(" | ");

    setStatus(okCount > 0 ? "ok" : "err", summary);

    if (cmpWin && !cmpWin.closed) {
      try {
        cmpWin.focus();
      } catch {
        // ignore
      }
    }
  }

  function refreshIfComparisonOpen() {
    if (!cmpWin || cmpWin.closed) {
      clearChapterState();
      renderAll();
      return;
    }
    loadChapter();
  }

  function bindEvents() {
    $("loadBtn").addEventListener("click", () => loadChapter({ ensureWindow: true }));
    $("updateBtn").addEventListener("click", () => loadChapter({ ensureWindow: true }));

    $("clearSelBtn").addEventListener("click", () => {
      selectedVerseNumbers = new Set();
      renderAll();
    });

    $("langAll").addEventListener("change", () => {
      if ($("langAll").checked) {
        activeLanguages = new Set(LANGUAGE_KEYS);
      } else {
        activeLanguages = new Set(["pt"]);
        setStatus("warn", "Pelo menos um idioma deve ficar ativo.");
      }
      syncLanguageCheckboxes();
      clearChapterState();
      renderAll();
      refreshIfComparisonOpen();
    });

    document.querySelectorAll(".app-lang-toggle").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const langKey = checkbox.dataset.lang;
        if (checkbox.checked) activeLanguages.add(langKey);
        else activeLanguages.delete(langKey);

        if (activeLanguages.size === 0) {
          activeLanguages.add(langKey);
          checkbox.checked = true;
          setStatus("warn", "Pelo menos um idioma deve ficar ativo.");
        }

        syncLanguageCheckboxes();
        clearChapterState();
        renderAll();
        refreshIfComparisonOpen();
      });
    });

    for (const langKey of LANGUAGE_KEYS) {
      $(`${langKey}Select`).addEventListener("change", () => {
        selected[langKey] = $(`${langKey}Select`).value;
        $(`${langKey}Code`).textContent = selected[langKey] || "—";
        clearChapterState();
        renderAll();
        if (getActiveLanguages().includes(langKey)) refreshIfComparisonOpen();
      });
    }

    ["book", "chapter"].forEach((id) => {
      $(id).addEventListener("change", () => {
        updateMaterializeTextFields();
        refreshIfComparisonOpen();
      });
    });

    ["vStart", "vEnd"].forEach((id) => {
      $(id).addEventListener("change", () => {
        updateMaterializeTextFields();
        renderAll();
      });
    });

    $("themeToggle").addEventListener("change", () => {
      SETTINGS.theme = $("themeToggle").checked ? "dark" : "light";
      persistSettings();
      applyTheme();
    });

    $("fontSize").addEventListener("input", () => {
      SETTINGS.cmpFontSize = Math.min(76, Math.max(12, Number($("fontSize").value)));
      persistSettings();
      applyFontSizeUI();
      renderComparisonWindow();
    });
  }

  window.addEventListener("DOMContentLoaded", async () => {
    loadSettingsFromStorage();
    persistSettings();

    $("origin").textContent = location.origin;

    if (window.M) M.AutoInit();

    bindPostMessageListener();
    applyTheme();
    applyFontSizeUI();

    fillBooks();
    bindEvents();

    await loadTranslations();
    updateMaterializeTextFields();
    renderAll();
    setStatus("ok", "Pronto.");
  });
})();
