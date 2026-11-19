#!/usr/bin/env node
// Keeps the AI prompt in step with the qID Connect pack. Run: node tools/check-ai-prompt.mjs
// Zero dependencies; needs `unzip` on the path (macOS and GitHub's Ubuntu runners have it).
//
// The prompt lives in one place, ai/ai-prompt.js, which qid.dev/ai and build.qid.dev both load.
// This fails, and says what to change, when:
//   - the prompt names a qID Connect version that is not the one in connect/qid-connect-latest.zip,
//   - the pinned zip in the prompt is missing, or differs from qid-connect-latest.zip,
//   - a file the prompt tells the agent to follow is not in that pack,
//   - the changelog page or llms.txt names another current version,
//   - the copy of the prompt in ai/index.html (shown without JavaScript) differs,
//   - an address that prefills the prompt grows past the length ai-prompt.js allows.
// So a new pack copied into connect/ cannot go out with an old prompt: bump the version in
// ai/ai-prompt.js, paste the same text into ai/index.html, and run this again.
// SPDX-License-Identifier: MIT
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(ROOT, file), "utf8");
const problems = [];
const fail = (message) => problems.push(message);

const js = read("ai/ai-prompt.js");
const promptMatch = js.match(/const PROMPT = ("(?:[^"\\]|\\.)*");/);
if (!promptMatch) {
  console.error("ai/ai-prompt.js: no one-line `const PROMPT = \"...\";` found.");
  process.exit(1);
}
const PROMPT = JSON.parse(promptMatch[1]);
const maxUrl = Number(js.match(/const MAX_URL = (\d+);/)?.[1]);
const prefillBases = [...js.matchAll(/url: "(https:\/\/[^"]+\?q=)"/g)].map((m) => m[1]);

// The version the prompt names, and the pinned zip.
const named = PROMPT.match(/qID Connect (\d+\.\d+\.\d+)/)?.[1];
const pinned = PROMPT.match(/https:\/\/qid\.dev\/connect\/qid-connect-(\d+\.\d+\.\d+)\.zip/)?.[1];
if (!named) fail('The prompt names no "qID Connect <version>".');
if (!pinned) fail("The prompt links no pinned https://qid.dev/connect/qid-connect-<version>.zip.");
if (named && pinned && named !== pinned) fail(`The prompt names qID Connect ${named} but links the ${pinned} zip.`);

// The version of the pack the site serves as latest.
const latestZip = "connect/qid-connect-latest.zip";
const listing = execFileSync("unzip", ["-Z1", join(ROOT, latestZip)], { encoding: "utf8" }).split("\n").filter(Boolean);
const latest = listing[0]?.match(/^qid-connect-(\d+\.\d+\.\d+)\//)?.[1];
if (!latest) fail(`${latestZip}: cannot read its version from the folder name inside.`);
else if (named && named !== latest) fail(`The prompt names qID Connect ${named}, but ${latestZip} is ${latest}. Update PROMPT in ai/ai-prompt.js and the copy in ai/index.html.`);

const version = latest ?? named;
if (version) {
  const pinnedZip = `connect/qid-connect-${version}.zip`;
  if (!existsSync(join(ROOT, pinnedZip))) fail(`${pinnedZip} is missing.`);
  else if (!readFileSync(join(ROOT, pinnedZip)).equals(readFileSync(join(ROOT, latestZip)))) fail(`${pinnedZip} and ${latestZip} differ.`);

  // Every pack path the prompt names must be in the pack.
  for (const path of PROMPT.match(/\b(?:docs|skills|packages|examples)\/[\w./-]+\w/g) ?? []) {
    if (!listing.includes(`qid-connect-${version}/${path}`)) fail(`The prompt names ${path}, which is not in the ${version} pack.`);
  }

  const changelog = read("connect/changelog/index.html").match(/Current version: <b>(\d+\.\d+\.\d+)<\/b>/)?.[1];
  if (changelog !== version) fail(`connect/changelog says the current version is ${changelog}, not ${version}.`);
  const llms = read("llms.txt").match(/qID Connect \([^)]*\) is at (\d+\.\d+\.\d+)/)?.[1];
  if (llms !== version) fail(`llms.txt says qID Connect is at ${llms}, not ${version}.`);
}

// The copy in the page, for people without JavaScript, must be the same text.
const unescape = (text) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const shown = read("ai/index.html").match(/<pre id="promptText">([\s\S]*?)<\/pre>/)?.[1];
if (shown === undefined) fail('ai/index.html has no <pre id="promptText">.');
else if (unescape(shown) !== PROMPT) fail("The prompt in ai/index.html differs from PROMPT in ai/ai-prompt.js. Paste the same text into both.");
if (!read("ai/index.html").includes('<script src="/ai/ai-prompt.js"')) fail("ai/index.html does not load /ai/ai-prompt.js.");

// The prefill addresses must stay under the limit, or the buttons fall back to copy and paste.
if (!maxUrl) fail("ai/ai-prompt.js has no MAX_URL.");
for (const base of prefillBases) {
  const length = (base + encodeURIComponent(PROMPT)).length;
  if (length > maxUrl) fail(`${base}… is ${length} characters, over MAX_URL ${maxUrl}: every button would copy and paste instead.`);
}

if (problems.length) {
  console.error(`AI prompt check failed:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`AI prompt check passed: qID Connect ${version}, ${PROMPT.length} characters, longest prefill address ${Math.max(...prefillBases.map((b) => (b + encodeURIComponent(PROMPT)).length))} of ${maxUrl}.`);
