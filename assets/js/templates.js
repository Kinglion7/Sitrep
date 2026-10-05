/* WOLFPACK newsletter — page templates.
 * Classic script: exposes window.WP.templates.
 *
 * renderIssue(issue, { editing }) -> HTML string of all pages, each wrapped in
 * <div class="wp-page-wrap"><div class="wp-page ..."></div></div>.
 *
 * Text handling: everything is HTML-escaped. Inline *asterisks* become an
 * accent span (red on paper, gold on dark). Blank lines split paragraphs.
 * Photo slots carry data-slot="<path into the issue object>" so the editor can
 * attach click / drop handlers.
 */
(function () {
  "use strict";
  const WP = (window.WP = window.WP || {});

  /* ---- text utilities ------------------------------------------------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  /** escape + *accent* + single line breaks */
  function inline(s) {
    return esc(s)
      .replace(/\*([^*\n]+)\*/g, '<em class="wp-accent">$1</em>')
      .replace(/\n/g, "<br>");
  }
  function paragraphs(s, opts) {
    const parts = String(s || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    return parts.map((p, i) => {
      if (opts && opts.dropcap && i === 0 && p.length > 1) {
        return `<p><span class="wp-dropcap">${esc(p[0])}</span>${inline(p.slice(1))}</p>`;
      }
      return `<p>${inline(p)}</p>`;
    }).join("");
  }
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  /* ---- photo slot ----------------------------------------------------- */
  function slot(photo, path, placeholder, opts) {
    const has = photo && photo.dataUrl;
    const editing = opts && opts.editing;
    const cls = ["wp-slot", has ? "" : "wp-slot--empty", editing ? "wp-slot--editing" : ""].filter(Boolean).join(" ");
    const pos = esc((photo && photo.objectPosition) || "50% 50%");
    const inner = has
      ? `<img src="${esc(photo.dataUrl)}" alt="" style="object-position:${pos}">`
      : `<div class="wp-slot__ph">${esc(placeholder)}</div>`;
    return `<div class="${cls}" data-slot="${esc(path)}" title="${editing ? "Click or drop a photo" : ""}">${inner}</div>`;
  }

  function folio(issue, pageNo) {
    return `<div class="wp-folio"><span>${esc(issue.meta.masthead)} · ${esc(issue.meta.trainingWeeks)}</span><span>${pad2(pageNo)}</span></div>`;
  }

  function wrap(cls, inner) {
    return `<div class="wp-page-wrap"><div class="wp-page ${cls}">${inner}</div></div>`;
  }

  /* ===================================================================== */
  /* COVERS                                                                */
  /* ===================================================================== */
  function cover1a(issue, o) {
    const m = issue.meta, c = issue.cover;
    return wrap("c1a", `
      <div class="c1a__photo">${slot(c.photo, "cover.photo", "Cover photo — full bleed, face in the middle third", o)}</div>
      <div class="c1a__grad"></div>
      <div class="c1a__head">
        <div class="c1a__issue">${esc(m.trainingWeeks)} / ${esc(m.monthYear)} / VOL. ${esc(m.volume)} ISSUE ${esc(m.issue)}</div>
        <div class="c1a__mast">${esc(m.masthead)}</div>
        <div class="c1a__unit"><span>${esc(m.unitLine)}</span><span class="wp-gold">${esc(m.motto)}</span></div>
      </div>
      <div class="c1a__story">
        <div class="c1a__hl">${inline(c.headline)}</div>
        <div class="c1a__sub">${inline(c.subhead)}</div>
        <div class="c1a__tw-label">TOP WOLF:</div>
        <div class="c1a__tw">${inline(c.topWolfTeaser)}</div>
      </div>
      <div class="c1a__foot">
        <div class="wp-badge">${esc(m.distribution)}</div>
        <div class="wp-marking">${esc(m.marking)}</div>
      </div>`);
  }

  function cover1b(issue, o) {
    const m = issue.meta, c = issue.cover;
    const lines = (c.coverlines || []).slice(0, 3).map((l) =>
      `<div><div class="wp-tag">${esc(l.tag)}</div><div class="c1b__line-text">${inline(l.text)}</div></div>`).join("");
    return wrap("c1b", `
      <div class="c1b__band">
        <div class="c1b__mast">${esc(m.masthead)}</div>
        <div class="c1b__meta"><div class="wp-gold">${esc(m.trainingWeeks)}</div><div>VOL. ${esc(m.volume)} · ISSUE ${esc(m.issue)}</div><div class="wp-dim">${esc(m.unitShort)}</div></div>
      </div>
      <div class="c1b__rule"></div>
      <div class="c1b__photo">${slot(c.photo, "cover.photo", "Cover photo — landscape or group shot works here", o)}</div>
      <div class="c1b__foot">
        <div class="c1b__hl">${inline(c.headline)}</div>
        <div class="c1b__lines">${lines}</div>
      </div>`);
  }

  function cover1c(issue, o) {
    const m = issue.meta, c = issue.cover;
    const numerals = c.bigNumerals || WP.schema.numeralsFromTW(m.trainingWeeks);
    return wrap("c1c", `
      <div class="c1c__photo">${slot(c.photo, "cover.photo", "Cover photo — subject on the right two-thirds", o)}</div>
      <div class="c1c__grad"></div>
      <div class="c1c__mast">${esc(m.masthead)}</div>
      <div class="c1c__meta"><div>${esc(m.monthYear)} · VOL. ${esc(m.volume)} ISSUE ${esc(m.issue)}</div><div class="wp-gold">${esc(m.unitLine)}</div></div>
      <div class="c1c__story">
        <div class="c1c__kicker">${esc(c.kicker)}</div>
        <div class="c1c__hl">${inline(c.headline)}</div>
        <div class="c1c__sub">${inline(c.subhead)}</div>
      </div>
      <div class="c1c__num"><div class="c1c__num-label">TRAINING WEEKS</div><div class="c1c__num-big">${esc(numerals)}</div></div>`);
  }

  function cover1d(issue, o) {
    const m = issue.meta, c = issue.cover;
    const toc = (c.contents || []).slice(0, 4).map((t, i) =>
      `<div><div class="c1d__toc-num">${pad2(i + 1)}</div><div class="c1d__toc-title">${esc(t.title)}</div><div class="c1d__toc-blurb">${inline(t.blurb)}</div></div>`).join("");
    const foot = (c.footline || "").trim() || c.headline;
    const footCls = (foot || "").length > 16 ? "c1d__foot c1d__foot--long" : "c1d__foot";
    return wrap("c1d", `
      <div class="c1d__head">
        <div class="c1d__mast">${esc(m.masthead)}</div>
        <div class="c1d__rule"><span>${esc(m.unitLine)}</span><span>${esc(m.trainingWeeks)} · ISSUE ${esc(m.issue)}</span></div>
      </div>
      <div class="c1d__photo">${slot(c.photo, "cover.photo", "Cover photo — tall portrait crop", o)}</div>
      <div class="c1d__toc">${toc}</div>
      <div class="${footCls}"><span>${inline(foot)}</span></div>`);
  }

  /* ===================================================================== */
  /* INTERIOR                                                              */
  /* ===================================================================== */
  function pageCdr(issue, o, pageNo) {
    const d = issue.cdr, f = issue.forward;
    const items = (d.evaluated || []).filter((t) => String(t).trim()).slice(0, 8).map((t, i) =>
      `<div class="p2__item"><span class="wp-tag">${pad2(i + 1)}</span>${inline(t)}</div>`).join("");
    const hlCls = (d.headline || "").length > 24 ? "p2__hl p2__hl--long" : "p2__hl";
    return wrap("p2", `
      ${folio(issue, pageNo)}
      <div class="p2__head">
        <div class="wp-kicker">${esc(d.kicker)}</div>
        <div class="${hlCls}">${inline(d.headline)}</div>
        <div class="p2__deck">${inline(d.deck)}</div>
      </div>
      <div class="p2__cols">
        <div class="p2__body wp-check">${paragraphs(d.body, { dropcap: true })}</div>
        <div>
          <div class="p2__list-head">${esc(d.listHead)}</div>
          <div class="p2__list">${items}</div>
        </div>
      </div>
      ${d.pullQuote && d.pullQuote.trim() ? `<div class="p2__quote">${inline(d.pullQuote)}</div>` : ""}
      <div class="p2__fwd wp-on-dark">
        <div class="p2__fwd-photo">${slot(f.photo, "forward.photo", "Forward Ops photo", o)}</div>
        <div class="p2__fwd-text">
          <div class="p2__fwd-kicker">${esc(f.kicker)}</div>
          <div class="p2__fwd-title">${inline(f.title)}</div>
          <div class="p2__fwd-body wp-check">${paragraphs(f.body)}</div>
        </div>
      </div>`);
  }

  function pageField(issue, o, pageNo) {
    const fl = issue.field;
    const all = (fl.photos || []).slice(0, 6);
    const used = (c) => WP.schema.hasPhoto(c.photo) || String(c.caption || "").trim() || String(c.label || "").trim();
    const cells = o && o.editing ? all : all.filter(used);
    const n = cells.length || (o && o.editing ? 6 : 0);
    let gridCls = "p3__grid";
    if (n <= 1) gridCls += " p3__grid--rows1 p3__grid--cols1";
    else if (n <= 2) gridCls += " p3__grid--rows1";
    else if (n <= 4) gridCls += " p3__grid--rows2";
    const html = cells.map((c, i) => {
      const idx = all.indexOf(c);
      return `<div class="p3__cell">
        <div class="p3__cell-photo">${slot(c.photo, `field.photos.${idx}.photo`, `Photo ${idx + 1}`, o)}</div>
        <div class="p3__cap wp-check"><b>${esc(c.label)}${c.label ? " —" : ""}</b> ${inline(c.caption)}</div>
      </div>`;
    }).join("");
    return wrap("p3", `
      ${folio(issue, pageNo)}
      <div class="p3__head"><div><div class="wp-kicker">${esc(fl.kicker)}</div><div class="p3__hl">${inline(fl.headline)}</div></div></div>
      <div class="${gridCls}">${html}</div>`);
  }

  function askCol(a, side) {
    const short = String(a.headline || "").trim().length <= 6;
    const head = short
      ? `<div class="p4__ask-big">${esc(a.headline)}</div><div class="p4__ask-small">${inline(a.body)}</div>`
      : `<div class="p4__ask-title">${inline(a.headline)}</div><div class="p4__ask-body wp-check">${paragraphs(a.body)}</div>`;
    return `<div class="${side}"><div class="p4__ask-label">${esc(a.label)}</div>${head}</div>`;
  }

  function pageAsks(issue, o, pageNo) {
    const a = issue.asks;
    const rows = (a.priorities || []).filter((p) => String(p.text || "").trim()).slice(0, 5).map((p, i) =>
      `<div class="p4__pri-row"><div class="p4__pri-num">${pad2(i + 1)}</div><div class="p4__pri-text">${inline(p.text)}${p.note ? ` <small>${esc(p.note)}</small>` : ""}</div></div>`).join("");
    return wrap("p4 wp-page--dark", `
      ${folio(issue, pageNo)}
      <div class="p4__head"><div class="wp-kicker">${esc(a.kicker)}</div><div class="p4__hl">${inline(a.headline)}</div></div>
      <div class="p4__asks">${askCol(a.division, "p4__ask-l")}${askCol(a.dsb, "p4__ask-r")}</div>
      <div class="p4__pri-head">${esc(a.prioritiesHead)}</div>
      <div class="p4__pri">${rows}</div>`);
  }

  function pageTopWolf(issue, o, pageNo) {
    const t = issue.topWolf, m = issue.meta;
    const longest = Math.max(String(t.rank || "").length, String(t.name || "").length);
    const nameCls = longest > 11 ? "p5__name p5__name--xlong" : longest > 7 ? "p5__name p5__name--long" : "p5__name";
    const stats = (t.stats || []).slice(0, 3).map((s) =>
      `<div class="p5__stat"><div class="p5__stat-big${String(s.big || "").length > 6 ? " p5__stat-big--long" : ""}">${esc(s.big)}</div><div class="p5__stat-small">${inline(s.small)}</div></div>`).join("");
    return wrap("p5", `
      <div class="p5__photo">${slot(t.photo, "topWolf.photo", "Top Wolf portrait — tall, chest up", o)}<div class="p5__ribbon">${esc(t.ribbon)}</div></div>
      <div class="p5__col">
        ${folio(issue, pageNo)}
        <div class="wp-kicker">${esc(t.kicker)}</div>
        <div class="${nameCls}">${esc(t.rank)}<br>${esc(t.name)}</div>
        <div class="p5__stats">${stats}</div>
        <div class="p5__body wp-check">${paragraphs(t.body)}</div>
        <div class="p5__foot"><i></i>${esc(m.unitLine)}</div>
      </div>`);
  }

  /* ===================================================================== */
  const COVERS = { "1a": cover1a, "1b": cover1b, "1c": cover1c, "1d": cover1d };

  function renderCover(issue, o) {
    return (COVERS[issue.cover.variant] || cover1a)(issue, o || {});
  }

  function renderIssue(issue, o) {
    o = o || {};
    return [
      renderCover(issue, o),
      pageCdr(issue, o, 2),
      pageField(issue, o, 3),
      pageAsks(issue, o, 4),
      pageTopWolf(issue, o, 5),
    ].join("\n");
  }

  WP.templates = { renderIssue, renderCover, esc, inline, paragraphs, COVERS: Object.keys(COVERS) };
})();
