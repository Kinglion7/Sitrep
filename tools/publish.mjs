#!/usr/bin/env node
/* Encrypt a draft from the command line (same format as the editor's Publish).
 *
 *   node tools/publish.mjs drafts/2026-10-tw51-52.json
 *
 * Prompts for the passphrase twice, writes issues/<id>.enc, updates
 * issues/index.json. Set WP_PASSPHRASE in the environment to skip the prompt
 * (for scripts). Needs Node 20+.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Load the browser scripts unchanged so the file format cannot drift.
globalThis.window = globalThis;
for (const f of ["schema.js", "crypto.js"]) {
  new Function(readFileSync(join(ROOT, "assets/js", f), "utf8"))();
}
const { schema: S, crypto: C } = globalThis.WP;

function ask(question, hidden) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (/\r?\n/.test(s)) rl.output.write("\n"); };
      process.stdout.write(question);
    }
    rl.question(hidden ? "" : question, (a) => { rl.close(); res(a); });
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node tools/publish.mjs drafts/<issue>.json");
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(resolve(file), "utf8"));
  const issue = S.normalize(raw.issue && raw.format ? raw.issue : raw);
  const id = S.issueId(issue);
  const problems = S.validate(issue);
  for (const p of problems) console.warn(`${p.level === "error" ? "ERROR" : "warn "}: ${p.text}`);
  if (problems.some((p) => p.level === "error")) process.exit(2);

  let pass = process.env.WP_PASSPHRASE;
  if (!pass) {
    pass = await ask("Passphrase: ", true);
    const again = await ask("Repeat passphrase: ", true);
    if (pass !== again) { console.error("Passphrases do not match."); process.exit(3); }
  }
  C.checkPassphrase(pass);

  const bundle = { format: 1, id, published: issue.meta.date, trainingWeeks: issue.meta.trainingWeeks, issue };
  const bytes = await C.encryptBundle(bundle, pass);
  const encPath = join(ROOT, "issues", `${id}.enc`);
  writeFileSync(encPath, bytes);

  const indexPath = join(ROOT, "issues", "index.json");
  let index = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")) : [];
  index = index.filter((e) => e.id !== id);
  index.push({ id, published: issue.meta.date, trainingWeeks: issue.meta.trainingWeeks });
  index.sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));
  writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");

  console.log(`wrote issues/${id}.enc (${(bytes.length / 1024).toFixed(0)} KB) and issues/index.json (${index.length} issues)`);
  console.log(`next: git add issues && git commit -m "Publish ${id}" && git push`);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
