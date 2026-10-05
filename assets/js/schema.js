/* WOLFPACK newsletter — issue schema, defaults and helpers.
 * Classic script: exposes window.WP.schema.
 *
 * Public defaults deliberately contain no Soldier names or operational detail;
 * the repo is public. Real issues live in drafts/ (gitignored) and in the
 * encrypted issues/*.enc bundles.
 */
(function () {
  "use strict";
  const WP = (window.WP = window.WP || {});

  const SCHEMA_VERSION = 1;

  function photo() {
    return { dataUrl: "", objectPosition: "50% 50%" };
  }

  function blankIssue() {
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: {
        date: "2026-09-19",            // publication date, ISO
        trainingWeeks: "TW49–TW50",
        monthYear: "SEPTEMBER 2026",
        volume: 1,
        issue: 4,
        masthead: "WOLFPACK",
        unitLine: "259TH HR COMPANY · DSTB · 25TH INFANTRY DIVISION",
        unitShort: "259TH HR CO · DSTB",
        motto: "TROPIC LIGHTNING",
        distribution: "INTERNAL DISTRIBUTION",
        marking: "UNCLASSIFIED · NOT FOR PUBLIC RELEASE",
      },
      cover: {
        variant: "1a",                 // 1a | 1b | 1c | 1d
        photo: photo(),
        headline: "Headline goes here",
        subhead: "One sentence that says what the two weeks were about.",
        topWolfTeaser: "RANK Lastname — one line on why they are Top Wolf.",
        // 1b only
        coverlines: [
          { tag: "FORWARD OPS", text: "One-line teaser for the forward operations story" },
          { tag: "TOP WOLF", text: "One-line teaser for Top Wolf" },
          { tag: "PRIORITIES", text: "One-line teaser for the next training weeks" },
        ],
        // 1c only
        kicker: "WEEK 1 · TRAINING EVENT NAME",
        bigNumerals: "",               // blank = derived from trainingWeeks, e.g. 49/50
        // 1d only: the big yellow stamp at the foot (two or three words), plus contents blurbs
        footline: "Wolfpack ready.",
        contents: [
          { title: "Commander's Summary", blurb: "One line on the commander's summary." },
          { title: "Forward Ops", blurb: "One line on who is forward and why." },
          { title: "In the Field", blurb: "Three or four words per photo story." },
          { title: "Top Wolf", blurb: "RANK Lastname, one line." },
        ],
      },
      cdr: {
        kicker: "01 / CDR'S SUMMARY",
        headline: "Two-week headline.",
        deck: "A one-sentence deck in italics that frames the period.",
        body:
          "Write two or three paragraphs here. Separate paragraphs with a blank line. The first letter becomes a drop cap.\n\nKeep the whole summary under about 180 words so it fits beside the list.",
        listHead: "EVALUATED THIS WEEK",
        evaluated: ["Task one", "Task two", "Task three", "Task four"],
        pullQuote: "“A short pull quote from the commander or first sergeant.”",
      },
      forward: {
        photo: photo(),
        kicker: "FORWARD OPERATIONS",
        title: "RANK Lastname, Task Force",
        body: "Two or three sentences on who is forward, where (as releasable), and what they are setting conditions for.",
      },
      field: {
        kicker: "02 / IN THE FIELD",
        headline: "Two weeks, six frames",
        photos: [
          { photo: photo(), label: "LABEL", caption: "One-line caption." },
          { photo: photo(), label: "LABEL", caption: "One-line caption." },
          { photo: photo(), label: "LABEL", caption: "One-line caption." },
          { photo: photo(), label: "LABEL", caption: "One-line caption." },
          { photo: photo(), label: "LABEL", caption: "One-line caption." },
          { photo: photo(), label: "LABEL", caption: "One-line caption." },
        ],
      },
      asks: {
        kicker: "03 / COMMAND ASKS",
        headline: "What we need. What's next.",
        division: { label: "25ID ASSISTANCE", headline: "NSTR", body: "Nothing significant to report" },
        dsb: { label: "25TH DSB ASSISTANCE", headline: "Ask in a few words", body: "One or two sentences on what the ask enables and why it matters." },
        prioritiesHead: "259TH PRIORITIES FOR THE TRAINING WEEKS",
        priorities: [
          { text: "Priority one", note: "" },
          { text: "Priority two", note: "(MET)" },
          { text: "Priority three", note: "" },
          { text: "Priority four", note: "" },
        ],
      },
      topWolf: {
        photo: photo(),
        kicker: "04 / TOP WOLF",
        ribbon: "TOP WOLF OF THE WEEK",
        rank: "SGT",
        name: "Lastname",
        stats: [
          { big: "SPC→SGT", small: "Promoted mid-mission" },
          { big: "NCOIC", small: "Mission or section" },
          { big: "MENTOR", small: "What they lead" },
        ],
        body:
          "First paragraph: what they did and why it stood out.\n\nSecond paragraph: the impact on the squad, platoon or families.",
      },
      email: {
        introLine: "Wolfpack families — here is the latest from the 259th.",
        closingLine: "Thank you for everything you do to support our Soldiers.",
        contactLine: "Questions? Contact your SFRG lead.",
        link: "https://259hr-perstat.com/SFRG/",
      },
    };
  }

  /* ---- helpers ------------------------------------------------------- */

  const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY",
    "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

  function parseTW(s) {
    const m = String(s || "").match(/(\d+)\D+(\d+)/);
    return m ? [Number(m[1]), Number(m[2])] : null;
  }

  function wrapTW(n) {
    return ((n - 1) % 52) + 1;
  }

  function formatTW(a, b) {
    return `TW${a}–TW${b}`;
  }

  function numeralsFromTW(s) {
    const tw = parseTW(s);
    return tw ? `${tw[0]}/${tw[1]}` : "";
  }

  function addDays(iso, days) {
    const d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function monthYearOf(iso) {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? "" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function issueId(issue) {
    const m = issue.meta;
    const tw = parseTW(m.trainingWeeks);
    const twPart = tw ? `tw${tw[0]}-${tw[1]}` : `issue${m.issue}`;
    return `${(m.date || "").slice(0, 7) || "undated"}-${twPart}`;
  }

  /** Deep-copy an issue and advance it two weeks; photos and story text are cleared. */
  function newIssueFrom(prev) {
    const next = deepMerge(blankIssue(), prev ? clone(prev) : {});
    const blank = blankIssue();
    next.meta.date = addDays(prev.meta.date, 14);
    next.meta.monthYear = monthYearOf(next.meta.date) || next.meta.monthYear;
    next.meta.issue = Number(prev.meta.issue || 0) + 1;
    const tw = parseTW(prev.meta.trainingWeeks);
    if (tw) next.meta.trainingWeeks = formatTW(wrapTW(tw[0] + 2), wrapTW(tw[1] + 2));
    // keep layout choices and labels, reset stories and photos
    next.cover = Object.assign(blank.cover, { variant: prev.cover.variant });
    next.cdr = Object.assign(blank.cdr, { kicker: prev.cdr.kicker, listHead: prev.cdr.listHead });
    next.forward = Object.assign(blank.forward, { kicker: prev.forward.kicker });
    next.field = Object.assign(blank.field, { kicker: prev.field.kicker });
    next.asks = Object.assign(blank.asks, {
      kicker: prev.asks.kicker, headline: prev.asks.headline, prioritiesHead: prev.asks.prioritiesHead,
      division: Object.assign({}, prev.asks.division), dsb: Object.assign({}, prev.asks.dsb),
      priorities: clone(prev.asks.priorities),
    });
    next.topWolf = Object.assign(blank.topWolf, { kicker: prev.topWolf.kicker, ribbon: prev.topWolf.ribbon });
    next.email = clone(prev.email);
    return next;
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  /** Fill any missing keys from defaults (so old drafts still load). */
  function deepMerge(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over.map((v, i) => deepMerge(base[i] !== undefined ? base[i] : base[0], v)) : base;
    if (base && typeof base === "object") {
      const out = {};
      for (const k of Object.keys(base)) out[k] = over && k in over ? deepMerge(base[k], over[k]) : base[k];
      for (const k of Object.keys(over || {})) if (!(k in out)) out[k] = over[k];
      return out;
    }
    return over === undefined || over === null ? base : over;
  }

  function normalize(issue) {
    return deepMerge(blankIssue(), issue || {});
  }

  function hasPhoto(p) {
    return !!(p && p.dataUrl);
  }

  /** Content checks before publish. Returns [{level:'warn'|'error', text}]. */
  function validate(issue) {
    const out = [];
    const need = (ok, text, level) => { if (!ok) out.push({ level: level || "warn", text }); };
    need(hasPhoto(issue.cover.photo), "Cover photo is empty.");
    need(hasPhoto(issue.forward.photo), "Forward Ops photo is empty.");
    need(hasPhoto(issue.topWolf.photo), "Top Wolf photo is empty.");
    const used = issue.field.photos.filter((c) => hasPhoto(c.photo) || (c.caption || "").trim());
    need(used.length > 0, "In the Field page has no photos.");
    used.forEach((c, i) => need(hasPhoto(c.photo), `In the Field slot ${i + 1} has a caption but no photo.`));
    need(parseTW(issue.meta.trainingWeeks), "Training weeks should look like TW49–TW50.", "error");
    need(/^\d{4}-\d{2}-\d{2}$/.test(issue.meta.date), "Publication date must be YYYY-MM-DD.", "error");
    return out;
  }

  WP.schema = {
    SCHEMA_VERSION, blankIssue, newIssueFrom, normalize, clone, issueId, validate,
    parseTW, numeralsFromTW, addDays, monthYearOf, hasPhoto, photo,
  };
})();
