# WOLFPACK — 259th HR Company SFRG newsletter

A small, zero-build website that produces the biweekly Soldier and Family
Readiness Group newsletter in the Wolfpack design, and shows it to families
behind a passphrase.

| Where | What |
|---|---|
| `editor/` | Form on the left, live Letter-size pages on the right. Export PDF, email HTML, publish. |
| `index.html` | What families see: passphrase → list of issues → pages, with Download PDF. |
| `issues/` | Published issues, **encrypted** (`<id>.enc`) plus `index.json` (ids and dates only). |
| `assets/` | Page templates, styles, self-hosted fonts, crypto. |
| `tools/` | Font extraction, command-line publish, headless PDF render. |
| `drafts/` | **Gitignored.** Plaintext drafts, original photos, the design export. Never committed. |

Live at **https://259hr-perstat.com/SFRG/** (proxied by the PERSTAT server to
GitHub Pages at `https://kinglion7.github.io/Sitrep/`). The editor is at
`/SFRG/editor/`.

## Every two weeks

1. Open the editor (`/SFRG/editor/`, or double-click `editor/index.html`).
   It reopens whatever you were last working on.
2. **New issue**. Dates, training weeks and the issue number move forward two
   weeks; stories and photos clear; labels and layout stay.
3. Fill the sections top to bottom. `newsletter_info.md` is the checklist of
   what to collect before you start. Wrap a word in `*asterisks*` to colour it.
4. Drop photos onto the grey boxes in the preview (or use the Choose button).
   They are resized in the browser to 1600 px, so phone photos are fine.
   Use the X / Y sliders to move the crop.
5. Watch the yellow bar under the form. Red outlines mean text no longer fits;
   shorten it.
6. **Save draft** → keep the `.json` in `drafts/`. It holds the photos too.
7. **Export PDF** → in the print dialog choose *Save as PDF*, Letter, margins
   *None*, *Background graphics* on. 5 pages. Attach this to the email.
8. **Email HTML** → Copy, paste into the message body (Outlook: it keeps the
   layout; Gmail drops the cover photo but keeps the text and link).
9. **Publish** → enter the family passphrase twice → two files download.
   Move them into `issues/` and push:

   ```
   move %USERPROFILE%\Downloads\<id>.enc issues\
   move %USERPROFILE%\Downloads\index.json issues\
   git add issues
   git commit -m "Publish <id>"
   git push
   ```

   GitHub Pages updates within a couple of minutes.

Command-line alternative for steps 7 and 9 (needs Node 20+ and Chrome or Edge):

```
node tools/render-pdf.mjs drafts/<id>.json drafts/<id>.pdf
node tools/publish.mjs   drafts/<id>.json
```

## Families

Share the link and the passphrase in person, by text or on a Signal group,
never in the same email as the newsletter. Readers open the link, enter the
passphrase once (there is a *remember on this device* box), and get every issue.
Download PDF uses the phone or desktop print dialog.

## Security model (read this once)

The site is static and public. GitHub Pages has no server-side login, so the
protection is encryption:

- Each issue is encrypted **in the browser** before it leaves your machine
  (AES-256-GCM, key from the passphrase with PBKDF2-SHA256, 600 000
  iterations). The repo and the website only ever contain ciphertext.
- Anyone can download the `.enc` files and guess passphrases offline. That is
  why the editor refuses anything under 10 characters or digits-only. Use a
  phrase like `three words and a number`; a 4-digit PIN would fall in seconds.
- One passphrase for all issues. To rotate it: in the editor, *Open published*
  each `.enc` with the old passphrase, *Publish* with the new one, push.
- The editor itself has no secrets in it; publishing requires push access to
  this repo.
- Never commit `drafts/`, photos or the design export; `.gitignore` already
  blocks them. Original photos are also a privacy matter for the families.

## Local testing

```
python -m http.server 8765
# editor:  http://127.0.0.1:8765/editor/?draft=../drafts/<id>.json
# viewer:  http://127.0.0.1:8765/
```

`?draft=` loads a draft file; `&zoom=1` forces 100 %. The viewer needs HTTP
(it fetches `issues/`); the editor also works from `file://`.

## Hosting

- **GitHub Pages**: repo `Kinglion7/Sitrep`, Settings → Pages → *Deploy from a
  branch*, `main` / `/ (root)`. `.nojekyll` is present so nothing is rewritten.
- **PERSTAT** (`docker/Caddyfile`): `redir /SFRG /SFRG/` and a
  `handle_path /SFRG/*` block that rewrites to `/Sitrep{uri}` and proxies to
  `kinglion7.github.io`. The PWA service worker lists `/SFRG` in
  `navigateFallbackDenylist`, and the desktop nav has a plain `<a href="/SFRG/">`
  link. Redeploy PERSTAT after changing those.

## Changing the design

`assets/css/wolfpack.css` holds every size and colour; `assets/js/templates.js`
holds the markup for the four covers (1a Classic, 1b Banded, 1c Vertical,
1d Paper) and the four interior pages. Fonts were pulled from the original
Claude Design export with `python tools/extract_bundle.py` (Anton, Barlow
Condensed, IBM Plex Mono, Source Serif 4; all SIL Open Font License).
