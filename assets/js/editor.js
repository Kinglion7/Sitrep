/* WOLFPACK newsletter — editor controller. */
(function () {
  "use strict";
  const WP = window.WP;
  const S = WP.schema, T = WP.templates;
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));

  let issue = S.blankIssue();
  let photoTarget = null;           // path currently receiving a photo
  let renderTimer = null;

  /* ---- path helpers ----------------------------------------------------- */
  function get(path) {
    return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), issue);
  }
  function set(path, value) {
    const keys = path.split(".");
    let o = issue;
    for (let i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] == null) o[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
  }

  /* ---- form spec -------------------------------------------------------- */
  const COVER_OPTS = [
    ["1a", "1a Classic — full-bleed photo, masthead on top"],
    ["1b", "1b Banded — black head, photo, 3 coverlines"],
    ["1c", "1c Vertical — spine masthead, giant week numerals"],
    ["1d", "1d Paper — red masthead, framed photo, contents"],
  ];
  const ACCENT_HINT = "Wrap a word in *asterisks* for the accent colour.";

  const FORM = [
    { id: "meta", title: "Issue", open: true, fields: [
      { row: [["meta.date", "Publication date", "date"], ["meta.trainingWeeks", "Training weeks", "text", { hint: "e.g. TW49–TW50" }]] },
      { row: [["meta.monthYear", "Month / year", "text"], ["meta.volume", "Volume", "number"]] },
      { row: [["meta.issue", "Issue number", "number"], ["meta.masthead", "Masthead", "text"]] },
      ["meta.unitLine", "Unit line", "text"],
      { row: [["meta.unitShort", "Unit (short, cover 1b)", "text"], ["meta.motto", "Motto (cover 1a)", "text"]] },
      { row: [["meta.distribution", "Distribution badge", "text"], ["meta.marking", "Marking line", "text"]] },
    ]},
    { id: "cover", title: "Cover", open: true, fields: [
      ["cover.variant", "Layout", "select", { options: COVER_OPTS }],
      ["cover.photo", "Cover photo", "photo"],
      ["cover.headline", "Headline", "text", { hint: ACCENT_HINT + " 1d wants a short one (two or three words)." }],
      ["cover.subhead", "Subhead", "textarea", { only: ["1a", "1c"] }],
      ["cover.topWolfTeaser", "Top Wolf teaser", "text", { only: ["1a"] }],
      { group: "Coverlines (1b)", only: ["1b"], fields: [
        { row: [["cover.coverlines.0.tag", "Tag 1", "text"], ["cover.coverlines.0.text", "Line 1", "text"]] },
        { row: [["cover.coverlines.1.tag", "Tag 2", "text"], ["cover.coverlines.1.text", "Line 2", "text"]] },
        { row: [["cover.coverlines.2.tag", "Tag 3", "text"], ["cover.coverlines.2.text", "Line 3", "text"]] },
      ]},
      { row: [["cover.kicker", "Kicker (1c)", "text", { only: ["1c"] }], ["cover.bigNumerals", "Big numerals (1c, blank = weeks)", "text", { only: ["1c"] }]] },
      ["cover.footline", "Foot stamp (1d) — two or three words", "text", { only: ["1d"] }],
      { group: "Contents blurbs (1d)", only: ["1d"], fields: [
        ["cover.contents.0.blurb", "01 Commander's Summary", "text"],
        ["cover.contents.1.blurb", "02 Forward Ops", "text"],
        ["cover.contents.2.blurb", "03 In the Field", "text"],
        ["cover.contents.3.blurb", "04 Top Wolf", "text"],
      ]},
    ]},
    { id: "cdr", title: "p.2 · Commander's Summary", fields: [
      { row: [["cdr.kicker", "Kicker", "text"], ["cdr.headline", "Headline", "text", { hint: ACCENT_HINT }]] },
      ["cdr.deck", "Deck (italic)", "textarea"],
      ["cdr.body", "Body (blank line between paragraphs; first letter becomes the drop cap)", "textarea", { cls: "tall" }],
      { row: [["cdr.listHead", "List heading", "text"], ["cdr.evaluated", "List items (one per line, up to 8)", "lines"]] },
      ["cdr.pullQuote", "Pull quote (blank to hide)", "textarea"],
    ]},
    { id: "forward", title: "p.2 · Forward Ops", fields: [
      ["forward.photo", "Photo (240 × 220, portrait-ish)", "photo"],
      { row: [["forward.kicker", "Kicker", "text"], ["forward.title", "Title", "text"]] },
      ["forward.body", "Body", "textarea"],
    ]},
    { id: "field", title: "p.3 · In the Field", fields: [
      { row: [["field.kicker", "Kicker", "text"], ["field.headline", "Headline", "text"]] },
      ...[0, 1, 2, 3, 4, 5].map((i) => ({ group: `Photo ${i + 1}`, fields: [
        [`field.photos.${i}.photo`, "Photo", "photo"],
        { row: [[`field.photos.${i}.label`, "Label", "text"], [`field.photos.${i}.caption`, "Caption", "text"]] },
      ]})),
    ]},
    { id: "asks", title: "p.4 · Command Asks + Priorities", fields: [
      { row: [["asks.kicker", "Kicker", "text"], ["asks.headline", "Headline", "text"]] },
      { group: "Left column", fields: [
        ["asks.division.label", "Label", "text"],
        ["asks.division.headline", "Headline (≤ 6 characters shows huge, e.g. NSTR)", "text"],
        ["asks.division.body", "Body", "textarea"],
      ]},
      { group: "Right column", fields: [
        ["asks.dsb.label", "Label", "text"],
        ["asks.dsb.headline", "Headline", "text"],
        ["asks.dsb.body", "Body", "textarea"],
      ]},
      ["asks.prioritiesHead", "Priorities heading", "text"],
      ...[0, 1, 2, 3].map((i) => ({ row: [[`asks.priorities.${i}.text`, `Priority ${i + 1}`, "text"], [`asks.priorities.${i}.note`, "Note (small)", "text"]] })),
    ]},
    { id: "topWolf", title: "p.5 · Top Wolf", fields: [
      ["topWolf.photo", "Portrait (360 × 1056, tall)", "photo"],
      { row: [["topWolf.kicker", "Kicker", "text"], ["topWolf.ribbon", "Ribbon", "text"]] },
      { row: [["topWolf.rank", "Rank", "text"], ["topWolf.name", "Last name", "text"]] },
      ...[0, 1, 2].map((i) => ({ row: [[`topWolf.stats.${i}.big`, `Stat ${i + 1} (big)`, "text"], [`topWolf.stats.${i}.small`, "Stat caption", "text"]] })),
      ["topWolf.body", "Body (blank line between paragraphs)", "textarea", { cls: "tall" }],
    ]},
    { id: "email", title: "Email version", fields: [
      ["email.introLine", "Intro line", "text"],
      ["email.closingLine", "Closing line", "text"],
      ["email.contactLine", "Contact line", "text"],
      ["email.link", "Link to the full issue", "text"],
    ]},
  ];

  /* ---- form rendering --------------------------------------------------- */
  function buildForm() {
    const root = $("#form");
    root.innerHTML = "";
    for (const sec of FORM) {
      const d = document.createElement("details");
      d.className = "ed-sec";
      d.open = !!sec.open;
      d.innerHTML = `<summary>${sec.title}</summary><div class="ed-sec__body"></div>`;
      const body = $(".ed-sec__body", d);
      for (const f of sec.fields) body.appendChild(buildItem(f));
      root.appendChild(d);
    }
    syncVisibility();
  }

  function buildItem(f) {
    if (Array.isArray(f)) return buildField(...f);
    if (f.row) {
      const row = document.createElement("div");
      row.className = "ed-row";
      f.row.forEach((x) => row.appendChild(buildField(...x)));
      return row;
    }
    if (f.group) {
      const g = document.createElement("div");
      g.className = "ed-group";
      if (f.only) g.dataset.only = f.only.join(",");
      g.innerHTML = `<div class="ed-group__title">${f.group}</div>`;
      f.fields.forEach((x) => g.appendChild(buildItem(x)));
      return g;
    }
    return document.createTextNode("");
  }

  function buildField(path, label, type, opts) {
    opts = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "ed-field";
    wrap.dataset.path = path;
    if (opts.only) wrap.dataset.only = opts.only.join(",");
    const id = "f_" + path.replace(/\W/g, "_");
    let ctl = "";
    const val = get(path);
    if (type === "photo") {
      wrap.innerHTML = `<label>${label}</label>` + photoCtl(path, val);
      wirePhoto(wrap, path);
      return wrap;
    }
    if (type === "select") {
      ctl = `<select id="${id}">${opts.options.map(([v, l]) => `<option value="${v}"${v === val ? " selected" : ""}>${T.esc(l)}</option>`).join("")}</select>`;
    } else if (type === "textarea") {
      ctl = `<textarea id="${id}" class="${opts.cls || ""}">${T.esc(val)}</textarea>`;
    } else if (type === "lines") {
      ctl = `<textarea id="${id}">${T.esc((val || []).join("\n"))}</textarea>`;
    } else {
      ctl = `<input id="${id}" type="${type}" value="${T.esc(val)}">`;
    }
    wrap.innerHTML = `<label for="${id}">${label}</label>${ctl}${opts.hint ? `<div class="ed-hint">${opts.hint}</div>` : ""}`;
    const el = $("#" + id, wrap);
    el.addEventListener("input", () => {
      let v = el.value;
      if (type === "number") v = v === "" ? "" : Number(v);
      if (type === "lines") v = v.split("\n").map((s) => s.trim()).filter(Boolean);
      set(path, v);
      if (path === "cover.variant") syncVisibility();
      if (path.startsWith("meta.")) $("#issueId").textContent = S.issueId(issue);
      scheduleRender();
    });
    return wrap;
  }

  function photoCtl(path, p) {
    const has = S.hasPhoto(p);
    const pos = (p && p.objectPosition) || "50% 50%";
    const [x, y] = pos.split(/\s+/).map((v) => parseInt(v, 10));
    return `<div class="ed-photo">
      <div class="ed-photo__thumb" data-act="pick" style="${has ? `background-image:url(${p.dataUrl})` : ""}">${has ? "" : "CHOOSE"}</div>
      <div class="ed-photo__ctl">
        <div class="ed-btns"><button type="button" class="ui-btn" data-act="pick">Choose</button><button type="button" class="ui-btn" data-act="clear"${has ? "" : " disabled"}>Remove</button></div>
        <div class="ed-range"><span>X</span><input type="range" min="0" max="100" value="${isNaN(x) ? 50 : x}" data-act="posx" title="Horizontal focal point"></div>
        <div class="ed-range"><span>Y</span><input type="range" min="0" max="100" value="${isNaN(y) ? 50 : y}" data-act="posy" title="Vertical focal point"></div>
        <div class="ed-hint">${has ? WP.photos.human(WP.photos.bytesOf(p.dataUrl)) + " · drag the sliders to move the crop" : "Click, or drop a photo on the page preview"}</div>
      </div></div>`;
  }

  function wirePhoto(wrap, path) {
    wrap.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]") && e.target.closest("[data-act]").dataset.act;
      if (act === "pick") pickPhoto(path);
      if (act === "clear") { set(path, S.photo()); refreshPhotoField(path); scheduleRender(); }
    });
    wrap.addEventListener("input", (e) => {
      const act = e.target.dataset.act;
      if (act !== "posx" && act !== "posy") return;
      const p = get(path) || S.photo();
      const x = $("[data-act=posx]", wrap).value, y = $("[data-act=posy]", wrap).value;
      p.objectPosition = `${x}% ${y}%`;
      set(path, p);
      scheduleRender();
    });
  }

  function refreshPhotoField(path) {
    const wrap = $(`.ed-field[data-path="${path}"]`);
    if (!wrap) return;
    const label = $("label", wrap).outerHTML;
    wrap.innerHTML = label + photoCtl(path, get(path));
  }

  function pickPhoto(path) {
    photoTarget = path;
    $("#filePhoto").value = "";
    $("#filePhoto").click();
  }

  async function acceptPhoto(path, file) {
    try {
      toast("Resizing photo…");
      const dataUrl = await WP.photos.fromFile(file);
      const prev = get(path) || S.photo();
      set(path, { dataUrl, objectPosition: prev.objectPosition || "50% 50%" });
      refreshPhotoField(path);
      scheduleRender();
      toast("Photo added");
    } catch (err) {
      toast(err.message || "Could not read that image");
    }
  }

  function syncVisibility() {
    const v = issue.cover.variant;
    $$("[data-only]").forEach((el) => { el.hidden = !el.dataset.only.split(",").includes(v); });
  }

  /** Re-read every control from the issue (after loading a draft). */
  function fillForm() {
    buildForm();
    $("#issueId").textContent = S.issueId(issue);
  }

  /* ---- preview ---------------------------------------------------------- */
  function scheduleRender() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 120);
    scheduleAutosave();
  }

  function render() {
    const stage = $("#stage");
    const pane = $("#previewPane");
    const keep = pane.scrollTop;
    stage.innerHTML = T.renderIssue(issue, { editing: true });
    applyZoom();
    pane.scrollTop = keep;
    checkOverflow();
  }

  function applyZoom() {
    const z = $("#zoom").value;
    const pane = $("#previewPane");
    const k = z === "fit" ? Math.min(1, (pane.clientWidth - 40) / 816) : Number(z);
    $("#stage").style.setProperty("--wp-scale", String(Math.max(0.2, k)));
  }

  function checkOverflow() {
    const problems = [];
    $$(".wp-check").forEach((el) => {
      const over = el.scrollHeight > el.clientHeight + 2;
      el.classList.toggle("wp-overflow", over);
      if (over) problems.push("Text is too long for its box (outlined in red).");
    });
    // Measure element boxes rather than scrollHeight: tight line-heights on the
    // giant Anton numerals inflate scrollHeight without drawing outside the page.
    $$(".wp-page").forEach((pg, i) => {
      const p = pg.getBoundingClientRect();
      const k = p.width / 816;                      // preview scale
      let over = false;
      for (const el of pg.querySelectorAll("div, p, span, img")) {
        const r = el.getBoundingClientRect();
        if (r.height === 0) continue;
        if (r.bottom - p.top > (1056 + 2) * k || r.right - p.left > (816 + 2) * k) {
          if (el.closest(".c1c__mast")) continue;   // rotated spine masthead, by design
          over = true; break;
        }
      }
      pg.classList.toggle("wp-overflow", over);
      if (over) problems.push(`Page ${i + 1} content runs past the edge — shorten the text.`);
    });
    const st = $("#status");
    const uniq = Array.from(new Set(problems));
    st.classList.toggle("show", uniq.length > 0);
    st.innerHTML = uniq.length ? `<b>Check layout:</b><ul>${uniq.map((p) => `<li>${p}</li>`).join("")}</ul>` : "";
  }

  // click / drop on page slots
  $("#stage").addEventListener("click", (e) => {
    const slot = e.target.closest(".wp-slot");
    if (slot) pickPhoto(slot.dataset.slot);
  });
  $("#stage").addEventListener("dragover", (e) => {
    const slot = e.target.closest(".wp-slot");
    if (!slot) return;
    e.preventDefault();
    slot.classList.add("wp-slot--over");
  });
  $("#stage").addEventListener("dragleave", (e) => {
    const slot = e.target.closest(".wp-slot");
    if (slot) slot.classList.remove("wp-slot--over");
  });
  $("#stage").addEventListener("drop", (e) => {
    const slot = e.target.closest(".wp-slot");
    if (!slot) return;
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) acceptPhoto(slot.dataset.slot, file);
  });
  $("#filePhoto").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file && photoTarget) acceptPhoto(photoTarget, file);
  });
  $("#zoom").addEventListener("change", applyZoom);
  window.addEventListener("resize", applyZoom);

  /* ---- autosave (IndexedDB, falls back to nothing) ---------------------- */
  const DB = "wolfpack-editor", STORE = "drafts", KEY = "current";
  let saveTimer = null;
  function idb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("no idb"));
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbPut(val) {
    const db = await idb();
    return new Promise((res, rej) => { const tx = db.transaction(STORE, "readwrite"); tx.objectStore(STORE).put(val, KEY); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }
  async function idbGet() {
    const db = await idb();
    return new Promise((res, rej) => { const tx = db.transaction(STORE, "readonly"); const r = tx.objectStore(STORE).get(KEY); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  function scheduleAutosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => idbPut(issue).catch(() => {}), 600);
  }

  /* ---- files ------------------------------------------------------------ */
  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function loadIssue(obj) {
    issue = S.normalize(obj);
    fillForm();
    render();
    scheduleAutosave();
  }

  $("#btnSave").addEventListener("click", () => {
    download(S.issueId(issue) + ".json", JSON.stringify(issue, null, 2), "application/json");
    toast("Draft downloaded — keep it in drafts/ (never commit it)");
  });
  $("#btnOpen").addEventListener("click", () => { $("#fileDraft").value = ""; $("#fileDraft").click(); });
  $("#fileDraft").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      loadIssue(obj.issue && obj.format ? obj.issue : obj);
      toast("Draft loaded");
    } catch (err) {
      toast("That file is not a Wolfpack draft");
    }
  });
  $("#btnNew").addEventListener("click", () => {
    if (!confirm("Start the next issue? Dates, training weeks and the issue number advance two weeks; stories and photos are cleared. Save the current draft first if you have not.")) return;
    loadIssue(S.newIssueFrom(issue));
    toast("New issue started");
  });
  $("#btnPdf").addEventListener("click", () => {
    $$(".wp-overflow").forEach((el) => el.classList.remove("wp-overflow"));
    window.print();
    setTimeout(checkOverflow, 500);
  });

  /* ---- email ------------------------------------------------------------ */
  $("#btnEmail").addEventListener("click", () => {
    $("#emailHtml").value = WP.email.render(issue);
    $("#dlgEmail").showModal();
  });
  $("#emailCopy").addEventListener("click", async () => {
    const html = $("#emailHtml").value;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([html], { type: "text/plain" }) })]);
      } else {
        await navigator.clipboard.writeText(html);
      }
      toast("Copied — paste into your email");
    } catch (_) {
      $("#emailHtml").select();
      document.execCommand("copy");
      toast("Copied as text");
    }
  });
  $("#emailDownload").addEventListener("click", () => download(S.issueId(issue) + "-email.html", $("#emailHtml").value, "text/html"));
  $("#emailPreview").addEventListener("click", () => {
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write($("#emailHtml").value); w.document.close(); }
  });

  /* ---- publish ---------------------------------------------------------- */
  $("#btnPublish").addEventListener("click", () => {
    const checks = S.validate(issue);
    const over = $$(".wp-overflow").length > 0;
    if (over) checks.unshift({ level: "warn", text: "Some text overflows its box (outlined in red in the preview)." });
    $("#pubChecks").innerHTML = checks.length
      ? `<div class="${checks.some((c) => c.level === "error") ? "ui-err" : "ui-warn"}"><b>Before you publish:</b><ul style="margin:4px 0 0;padding-left:18px">${checks.map((c) => `<li>${T.esc(c.text)}</li>`).join("")}</ul></div>`
      : `<div class="ui-ok">All sections filled. Issue id: <b>${S.issueId(issue)}</b></div>`;
    $("#pubResult").innerHTML = "";
    $("#pubPass").value = ""; $("#pubPass2").value = "";
    $("#pubGo").disabled = checks.some((c) => c.level === "error");
    $("#dlgPublish").showModal();
  });

  $("#pubGo").addEventListener("click", async () => {
    const p1 = $("#pubPass").value, p2 = $("#pubPass2").value;
    const out = $("#pubResult");
    try {
      WP.crypto.checkPassphrase(p1);
      if (p1 !== p2) throw new Error("The two passphrases do not match.");
    } catch (err) {
      out.innerHTML = `<div class="ui-err">${T.esc(err.message)}</div>`;
      return;
    }
    $("#pubGo").disabled = true;
    out.innerHTML = `<div class="ui-note">Encrypting… (a few seconds)</div>`;
    try {
      const id = S.issueId(issue);
      const bundle = { format: 1, id, published: issue.meta.date, trainingWeeks: issue.meta.trainingWeeks, issue };
      const bytes = await WP.crypto.encryptBundle(bundle, p1);
      download(id + ".enc", bytes);
      // regenerate issues/index.json (merge with the live one when served over http)
      let index = [];
      try {
        const r = await fetch("../issues/index.json", { cache: "no-store" });
        if (r.ok) index = await r.json();
      } catch (_) { /* file:// — start from empty */ }
      index = index.filter((e) => e.id !== id);
      index.push({ id, published: issue.meta.date, trainingWeeks: issue.meta.trainingWeeks });
      index.sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));
      download("index.json", JSON.stringify(index, null, 2), "application/json");
      out.innerHTML = `<div class="ui-ok">Two files downloaded. Put them in the repo and push:</div>
<pre class="ui-code">move %USERPROFILE%\\Downloads\\${id}.enc issues\\
move %USERPROFILE%\\Downloads\\index.json issues\\
git add issues
git commit -m "Publish ${id}"
git push</pre>
<div class="ui-note">GitHub Pages updates within a minute or two. The site shows ${index.length} issue${index.length === 1 ? "" : "s"} after this push. Delete the plaintext draft from Downloads if you saved one there.</div>`;
    } catch (err) {
      out.innerHTML = `<div class="ui-err">${T.esc(err.message || String(err))}</div>`;
    } finally {
      $("#pubGo").disabled = false;
    }
  });

  /* ---- open published --------------------------------------------------- */
  let encBytes = null;
  $("#btnOpenEnc").addEventListener("click", () => { $("#fileEnc").value = ""; $("#fileEnc").click(); });
  $("#fileEnc").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    encBytes = new Uint8Array(await file.arrayBuffer());
    $("#passIn").value = ""; $("#passErr").innerHTML = "";
    $("#dlgPass").showModal();
    $("#passIn").focus();
  });
  async function tryOpenEnc() {
    try {
      const bundle = await WP.crypto.decryptBundle(encBytes, $("#passIn").value);
      $("#dlgPass").close();
      loadIssue(bundle.issue || bundle);
      toast("Published issue opened");
    } catch (err) {
      $("#passErr").innerHTML = `<div class="ui-err">${err.message === "WRONG_PIN" ? "Wrong passphrase." : err.message === "NOT_A_BUNDLE" ? "That is not a Wolfpack .enc file." : T.esc(err.message)}</div>`;
    }
  }
  $("#passGo").addEventListener("click", tryOpenEnc);
  $("#passIn").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); tryOpenEnc(); } });

  /* ---- misc ------------------------------------------------------------- */
  $$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---- boot ------------------------------------------------------------- */
  (async function boot() {
    const q = new URLSearchParams(location.search);
    try {
      const saved = await idbGet();
      if (saved) issue = S.normalize(saved);
    } catch (_) { /* no autosave available */ }
    // ?draft=<url> loads a draft JSON (local testing: python -m http.server)
    if (q.get("draft")) {
      try {
        const r = await fetch(q.get("draft"), { cache: "no-store" });
        const obj = await r.json();
        issue = S.normalize(obj.issue && obj.format ? obj.issue : obj);
      } catch (_) { toast("Could not load ?draft= file"); }
    }
    if (q.get("zoom")) $("#zoom").value = q.get("zoom");
    fillForm();
    render();
    window.__wpReady = true;   // tools/render-pdf.mjs waits for this
    if (!WP.crypto.available()) toast("WebCrypto unavailable — open this page over https or from a local file");
  })();
})();
