#!/usr/bin/env python3
"""Pull the self-hosted fonts (and the two sample cover photos) out of the
Claude Design standalone export.

Usage:  python tools/extract_bundle.py [path/to/standalone.html]

Writes:
  assets/fonts/<family>-<weight>-<style>-<subset>.woff2   (committed)
  assets/fonts/fonts.css                                    (committed)
  drafts/sample-cover-<slot>.webp                           (gitignored)

The export is a bundler page: a <script type="__bundler/manifest"> holds a
JSON map of uuid -> {mime, compressed, data(base64)}, and a
<script type="__bundler/template"> holds the real page as a JSON string whose
@font-face rules reference those uuids.
"""
import base64
import gzip
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "drafts" / "Wolfpack Newsletter (standalone).html"
FONT_DIR = ROOT / "assets" / "fonts"
DRAFTS = ROOT / "drafts"


def script_payload(html: str, kind: str) -> str:
    """Return the text inside <script type="__bundler/<kind>">...</script>."""
    m = re.search(
        r'<script type="__bundler/' + re.escape(kind) + r'">\s*(.*?)\s*</script>',
        html,
        re.S,
    )
    if not m:
        sys.exit(f"could not find __bundler/{kind} block")
    return m.group(1)


def decode_asset(entry: dict) -> bytes:
    raw = base64.b64decode(entry["data"])
    if entry.get("compressed"):
        raw = gzip.decompress(raw)
    return raw


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    if not src.exists():
        sys.exit(f"not found: {src}")
    html = src.read_text(encoding="utf-8")

    manifest = json.loads(script_payload(html, "manifest"))
    template = json.loads(script_payload(html, "template"))  # JSON string -> html

    FONT_DIR.mkdir(parents=True, exist_ok=True)
    DRAFTS.mkdir(parents=True, exist_ok=True)

    # ---- fonts ----------------------------------------------------------
    block_re = re.compile(r"/\*\s*([a-z-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", re.S)
    css_out = [
        "/* Self-hosted web fonts extracted from the Wolfpack design export.",
        " * Anton, Barlow Condensed, IBM Plex Mono and Source Serif 4 are all",
        " * released under the SIL Open Font License 1.1. */",
        "",
    ]
    written = 0
    for subset, body in block_re.findall(template):
        fam = re.search(r"font-family:\s*'([^']+)'", body).group(1)
        style = re.search(r"font-style:\s*(\w+)", body).group(1)
        weight = re.search(r"font-weight:\s*(\d+)", body).group(1)
        uuid = re.search(r'url\("([0-9a-f-]{36})"\)', body).group(1)
        entry = manifest.get(uuid)
        if not entry or not entry["mime"].startswith("font/"):
            print(f"skip {fam} {weight} {style} {subset}: no font asset for {uuid}")
            continue
        name = f"{slug(fam)}-{weight}-{style}-{subset}.woff2"
        (FONT_DIR / name).write_bytes(decode_asset(entry))
        written += 1
        new_body = body.replace(f'url("{uuid}")', f'url("{name}")')
        css_out.append(f"/* {fam} {weight} {style} - {subset} */")
        css_out.append("@font-face {" + new_body.rstrip() + "\n}")
    (FONT_DIR / "fonts.css").write_text("\n".join(css_out) + "\n", encoding="utf-8")
    print(f"wrote {written} font files + fonts.css -> {FONT_DIR}")

    # ---- sample photos (local only) --------------------------------------
    for slot_id, uuid in re.findall(r'<image-slot id="([^"]+)"[^>]*src="([0-9a-f-]{36})"', template):
        entry = manifest.get(uuid)
        if not entry or not entry["mime"].startswith("image/"):
            continue
        ext = entry["mime"].split("/")[1]
        out = DRAFTS / f"sample-cover-{slot_id.replace('-photo', '')}.{ext}"
        out.write_bytes(decode_asset(entry))
        print(f"wrote sample photo -> {out}")


if __name__ == "__main__":
    main()
