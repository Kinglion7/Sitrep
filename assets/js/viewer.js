/* WOLFPACK newsletter — family-facing viewer. */
(function () {
  "use strict";
  const WP = window.WP;
  const S = WP.schema, T = WP.templates;
  const $ = (s) => document.querySelector(s);

  const PASS_KEY = "wp.pass";
  let index = [];
  let passphrase = "";
  let current = null;

  function show(id, on) { $(id).hidden = !on; }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2600);
  }
  function storedPass() {
    try { return sessionStorage.getItem(PASS_KEY) || localStorage.getItem(PASS_KEY) || ""; } catch (_) { return ""; }
  }
  function storePass(p, remember) {
    try {
      sessionStorage.setItem(PASS_KEY, p);
      if (remember) localStorage.setItem(PASS_KEY, p); else localStorage.removeItem(PASS_KEY);
    } catch (_) { /* private mode */ }
  }
  function forgetPass() {
    try { sessionStorage.removeItem(PASS_KEY); localStorage.removeItem(PASS_KEY); } catch (_) {}
    passphrase = "";
  }

  function labelOf(entry) {
    const tw = entry.trainingWeeks || (S.parseTW(entry.id.replace(/tw(\d+)-(\d+)/, "TW$1–TW$2")) ? entry.id.replace(/^.*tw(\d+)-(\d+).*$/, "TW$1–TW$2") : entry.id);
    const d = new Date(entry.published + "T12:00:00");
    const date = isNaN(d) ? entry.published : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    return { tw, date };
  }

  async function loadIndex() {
    try {
      const r = await fetch("issues/index.json", { cache: "no-store" });
      index = r.ok ? await r.json() : [];
    } catch (_) { index = []; }
    index.sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));
  }

  function renderList() {
    const ul = $("#list");
    ul.innerHTML = "";
    show("#empty", index.length === 0);
    for (const e of index) {
      const { tw, date } = labelOf(e);
      const li = document.createElement("li");
      li.innerHTML = `<button type="button"><span class="vw-tw">${T.esc(tw)}</span><span class="vw-date">${T.esc(date)}</span></button>`;
      li.querySelector("button").addEventListener("click", () => openIssue(e));
      ul.appendChild(li);
    }
  }

  function fitScale() {
    const w = Math.min(document.documentElement.clientWidth, 900) - 24;
    $("#stage").style.setProperty("--wp-scale", String(Math.min(1, w / 816)));
  }

  async function openIssue(entry) {
    show("#loading", true); $("#loading").textContent = "Opening…";
    try {
      const r = await fetch(`issues/${entry.id}.enc`, { cache: "no-store" });
      if (!r.ok) throw new Error("That issue could not be downloaded.");
      const bytes = new Uint8Array(await r.arrayBuffer());
      const bundle = await WP.crypto.decryptBundle(bytes, passphrase);
      current = S.normalize(bundle.issue || bundle);
      $("#stage").innerHTML = T.renderIssue(current, { editing: false });
      fitScale();
      show("#cardList", false); show("#issue", true);
      document.title = `${current.meta.masthead} · ${current.meta.trainingWeeks}`;
      history.replaceState(null, "", "#" + entry.id);
      window.scrollTo(0, 0);
    } catch (err) {
      if (err.message === "WRONG_PIN") {
        forgetPass();
        askPass("That passphrase did not open this issue. Try again.");
      } else {
        toast(err.message || "Could not open the issue");
      }
    } finally {
      show("#loading", false);
    }
  }

  function askPass(msg) {
    show("#cardList", false); show("#issue", false); show("#cardPass", true);
    $("#passErr").innerHTML = msg ? `<div class="ui-err">${T.esc(msg)}</div>` : "";
    $("#pass").value = "";
    $("#pass").focus();
  }

  async function unlocked() {
    show("#cardPass", false);
    renderList();
    show("#cardList", true);
    const want = location.hash.slice(1);
    const entry = index.find((e) => e.id === want);
    if (entry) await openIssue(entry);
    else if (index.length === 1) await openIssue(index[0]);
  }

  $("#formPass").addEventListener("submit", async (e) => {
    e.preventDefault();
    const p = $("#pass").value;
    if (!p) return;
    if (index.length === 0) { passphrase = p; storePass(p, $("#remember").checked); await unlocked(); return; }
    // verify against the newest issue before accepting
    $("#passErr").innerHTML = `<div class="ui-note">Checking…</div>`;
    try {
      const r = await fetch(`issues/${index[0].id}.enc`, { cache: "no-store" });
      const bytes = new Uint8Array(await r.arrayBuffer());
      await WP.crypto.decryptBundle(bytes, p);
      passphrase = p;
      storePass(p, $("#remember").checked);
      await unlocked();
    } catch (err) {
      $("#passErr").innerHTML = `<div class="ui-err">${err.message === "WRONG_PIN" ? "Wrong passphrase." : T.esc(err.message)}</div>`;
    }
  });

  $("#btnBack").addEventListener("click", () => {
    show("#issue", false); show("#cardList", true);
    history.replaceState(null, "", location.pathname);
    document.title = "Wolfpack Newsletter";
  });
  $("#btnLock").addEventListener("click", () => { forgetPass(); askPass(); });
  $("#btnPdf").addEventListener("click", () => window.print());
  $("#btnEmail").addEventListener("click", () => {
    if (!current) return;
    const w = window.open("", "_blank");
    if (w) { w.document.open(); w.document.write(WP.email.render(current)); w.document.close(); }
  });
  window.addEventListener("resize", fitScale);

  (async function boot() {
    await loadIndex();
    show("#loading", false);
    if (!WP.crypto.available()) {
      $("#loading").textContent = "This browser cannot decrypt the newsletter. Please open the link in Chrome, Edge or Safari over https.";
      show("#loading", true);
      return;
    }
    passphrase = storedPass();
    if (passphrase) await unlocked(); else askPass();
  })();
})();
