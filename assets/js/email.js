/* WOLFPACK newsletter — email-ready HTML.
 * Classic script: exposes window.WP.email.
 * Single-column, table-based, inline styles, 600 px. Text-first: the only
 * image is the cover photo as a data URL (shown by Outlook / Apple Mail,
 * stripped by Gmail web). Photos are never hosted unencrypted.
 */
(function () {
  "use strict";
  const WP = (window.WP = window.WP || {});

  const C = { paper: "#f3efe6", ink: "#141412", gold: "#f2b705", red: "#b3261e", dim: "#6b665c", white: "#ffffff" };
  const F = {
    head: "font-family:'Anton','Arial Narrow',Impact,Arial,sans-serif;",
    cond: "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif;",
    body: "font-family:Georgia,'Times New Roman',serif;",
    mono: "font-family:Consolas,Menlo,monospace;",
  };

  const esc = (s) => WP.templates.esc(s);
  const inl = (s) => esc(s).replace(/\*([^*\n]+)\*/g, `<span style="color:${C.red}">$1</span>`).replace(/\n/g, "<br>");
  const paras = (s, style) => String(s || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;${style}">${inl(p)}</p>`).join("");

  function section(kicker, title, inner) {
    return `
<tr><td style="padding:24px 28px 8px;">
  <div style="${F.mono}font-size:11px;letter-spacing:.08em;color:${C.red};">${esc(kicker)}</div>
  <div style="${F.head}font-size:28px;line-height:1.05;text-transform:uppercase;color:${C.ink};margin-top:6px;">${inl(title)}</div>
  <div style="height:3px;background:${C.ink};margin:10px 0 14px;"></div>
  ${inner}
</td></tr>`;
  }

  function render(issue) {
    const m = issue.meta, c = issue.cover, d = issue.cdr, f = issue.forward, a = issue.asks, t = issue.topWolf, e = issue.email;
    const bodyStyle = `${F.body}font-size:16px;line-height:1.55;color:${C.ink};`;
    const coverImg = WP.schema.hasPhoto(c.photo)
      ? `<tr><td style="padding:0;"><img src="${esc(c.photo.dataUrl)}" width="600" alt="" style="display:block;width:100%;height:auto;max-height:420px;object-fit:cover;"></td></tr>`
      : "";
    const evaluated = (d.evaluated || []).filter((x) => String(x).trim()).map((x) =>
      `<li style="${F.cond}font-size:16px;font-weight:700;text-transform:uppercase;margin:4px 0;">${inl(x)}</li>`).join("");
    const priorities = (a.priorities || []).filter((p) => String(p.text || "").trim()).map((p, i) =>
      `<tr><td style="${F.head}font-size:30px;color:${C.gold};padding:6px 14px 6px 0;vertical-align:top;width:48px;">${String(i + 1).padStart(2, "0")}</td>
       <td style="${F.head}font-size:20px;text-transform:uppercase;color:${C.ink};padding:10px 0;border-top:1px solid #d6ccbb;">${inl(p.text)} ${p.note ? `<span style="${F.cond}font-size:14px;color:${C.dim};text-transform:none;">${esc(p.note)}</span>` : ""}</td></tr>`).join("");
    const stats = (t.stats || []).map((s) =>
      `<td style="padding:8px 12px 8px 0;vertical-align:top;"><div style="${F.head}font-size:22px;color:${C.red};">${esc(s.big)}</div><div style="${F.cond}font-size:13px;font-weight:700;text-transform:uppercase;">${inl(s.small)}</div></td>`).join("");

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.masthead)} ${esc(m.trainingWeeks)}</title></head>
<body style="margin:0;padding:0;background:#e9e6df;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e9e6df;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:${C.paper};">
  <tr><td style="background:${C.ink};color:${C.white};padding:22px 28px 16px;">
    <div style="${F.cond}font-size:13px;font-weight:700;letter-spacing:.08em;">${esc(m.trainingWeeks)} · ${esc(m.monthYear)} · VOL. ${esc(m.volume)} ISSUE ${esc(m.issue)}</div>
    <div style="${F.head}font-size:64px;line-height:.95;color:${C.gold};margin-top:4px;">${esc(m.masthead)}</div>
    <div style="${F.cond}font-size:12px;font-weight:700;letter-spacing:.1em;margin-top:6px;">${esc(m.unitLine)}</div>
  </td></tr>
  <tr><td style="height:6px;background:${C.red};font-size:0;line-height:0;">&nbsp;</td></tr>
  ${coverImg}
  <tr><td style="padding:24px 28px 0;">
    <div style="${F.head}font-size:34px;line-height:1;text-transform:uppercase;color:${C.ink};">${inl(c.headline)}</div>
    <div style="${F.cond}font-size:18px;font-weight:700;text-transform:uppercase;margin-top:8px;color:${C.ink};">${inl(c.subhead)}</div>
    <p style="margin:16px 0 0;${bodyStyle}">${inl(e.introLine)}</p>
  </td></tr>

  ${section(d.kicker, d.headline, `
    <p style="margin:0 0 12px;${F.body}font-size:17px;font-style:italic;color:${C.ink};">${inl(d.deck)}</p>
    ${paras(d.body, bodyStyle)}
    ${evaluated ? `<div style="${F.cond}font-size:13px;font-weight:800;letter-spacing:.12em;margin-top:8px;">${esc(d.listHead)}</div><ul style="margin:6px 0 0;padding-left:20px;">${evaluated}</ul>` : ""}
    ${d.pullQuote && d.pullQuote.trim() ? `<div style="border-left:6px solid ${C.gold};padding:4px 0 4px 16px;margin-top:16px;${F.head}font-size:20px;text-transform:uppercase;">${inl(d.pullQuote)}</div>` : ""}`)}

  ${section(f.kicker, f.title, paras(f.body, bodyStyle))}

  ${section(a.kicker, a.headline, `
    <div style="${F.cond}font-size:13px;font-weight:800;letter-spacing:.12em;color:${C.dim};">${esc(a.division.label)}</div>
    <div style="${F.head}font-size:22px;text-transform:uppercase;margin:4px 0 2px;">${inl(a.division.headline)}</div>
    ${paras(a.division.body, bodyStyle)}
    <div style="${F.cond}font-size:13px;font-weight:800;letter-spacing:.12em;color:${C.dim};margin-top:8px;">${esc(a.dsb.label)}</div>
    <div style="${F.head}font-size:22px;text-transform:uppercase;margin:4px 0 2px;">${inl(a.dsb.headline)}</div>
    ${paras(a.dsb.body, bodyStyle)}
    <div style="${F.cond}font-size:13px;font-weight:800;letter-spacing:.12em;color:${C.red};margin-top:12px;">${esc(a.prioritiesHead)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:4px;">${priorities}</table>`)}

  ${section(t.kicker, `${t.rank} ${t.name}`, `
    <div style="display:inline-block;background:${C.red};color:${C.white};${F.cond}font-size:12px;font-weight:800;letter-spacing:.12em;padding:4px 10px;margin-bottom:10px;">${esc(t.ribbon)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${stats}</tr></table>
    <div style="height:1px;background:#d6ccbb;margin:8px 0 14px;"></div>
    ${paras(t.body, bodyStyle)}`)}

  <tr><td style="padding:8px 28px 28px;">
    <p style="margin:0 0 14px;${bodyStyle}">${inl(e.closingLine)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.gold};">
      <a href="${esc(e.link)}" style="display:inline-block;padding:12px 20px;${F.cond}font-size:15px;font-weight:800;letter-spacing:.1em;color:${C.ink};text-decoration:none;">READ THE FULL ISSUE (PIN REQUIRED) &rarr;</a>
    </td></tr></table>
    <p style="margin:16px 0 0;${F.body}font-size:14px;color:${C.dim};">${inl(e.contactLine)}</p>
  </td></tr>
  <tr><td style="background:${C.ink};color:${C.white};padding:14px 28px;">
    <div style="${F.cond}font-size:12px;font-weight:800;letter-spacing:.12em;color:${C.gold};">${esc(m.distribution)}</div>
    <div style="${F.mono}font-size:11px;letter-spacing:.06em;margin-top:4px;">${esc(m.marking)} · ${esc(m.unitLine)}</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  }

  WP.email = { render };
})();
