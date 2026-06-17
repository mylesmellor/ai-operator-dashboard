#!/usr/bin/env node
// Model availability preflight.
//
// Why this exists: on 2026-06-17 a live demo broke because the app pinned
// `claude-sonnet-4-20250514`, which retired 2026-06-15 and now returns
// 404 not_found_error. The demo fallback rule masked it at runtime, so the
// retirement was invisible until a presentation. This check surfaces a
// retired/pinned model loudly *before* it ships or before a launch.
//
// What it does: collects every Claude model id the app could use (the
// ANTHROPIC_MODEL env var plus quoted `claude-*` literals scanned from src/),
// then calls GET https://api.anthropic.com/v1/models/{id} for each.
//
// Exit codes:
//   0  all reachable, or skipped (no API key — logged, not fatal)
//   1  could not verify (network error / unexpected non-404 status)
//   2  at least one model is RETIRED (HTTP 404) — the loud one
//
// CI fails the build on any non-zero. The app launcher blocks only on 2
// (retirement) and warns-but-continues on 1 (so being offline never blocks a
// launch). Dependency-light: Node built-ins only (fetch, fs, path).

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANTHROPIC_VERSION = "2023-06-01";

// --- Load ANTHROPIC_API_KEY / ANTHROPIC_MODEL from env, falling back to
// .env.local (node scripts don't get Next.js's automatic .env loading). ---
function loadDotEnv(file) {
  const path = join(ROOT, file);
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const dotenv = { ...loadDotEnv(".env"), ...loadDotEnv(".env.local") };
const apiKey = process.env.ANTHROPIC_API_KEY || dotenv.ANTHROPIC_API_KEY;
const envModel = process.env.ANTHROPIC_MODEL || dotenv.ANTHROPIC_MODEL;

// --- Collect model ids the app references. ---
function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry)) acc.push(full);
  }
  return acc;
}

// Match quoted Claude model id literals, e.g. "claude-sonnet-4-6".
const MODEL_RE = /['"`](claude-[a-z0-9.\-]+)['"`]/g;
const refs = new Map(); // id -> Set of "file:line" sources

function addRef(id, source) {
  if (!refs.has(id)) refs.set(id, new Set());
  refs.get(id).add(source);
}

if (envModel) addRef(envModel, "ANTHROPIC_MODEL (env / .env.local)");

for (const file of walk(join(ROOT, "src"))) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    let m;
    MODEL_RE.lastIndex = 0;
    while ((m = MODEL_RE.exec(line)) !== null) {
      const rel = file.slice(ROOT.length + 1);
      addRef(m[1], `${rel}:${i + 1}`);
    }
  });
}

const modelIds = [...refs.keys()].sort();

console.log("── Model availability preflight ──────────────────────────────");

if (modelIds.length === 0) {
  console.log("No Claude model ids found to check. Nothing to do.");
  process.exit(0);
}

console.log(`Checking ${modelIds.length} model id(s): ${modelIds.join(", ")}`);

if (!apiKey) {
  console.log(
    "⚠  ANTHROPIC_API_KEY not set (checked env + .env.local) — skipping live check."
  );
  console.log("   This is not a failure, but the models were NOT verified.");
  process.exit(0);
}

// --- Check each model id against the Models API. ---
async function checkModel(id) {
  try {
    const res = await fetch(`https://api.anthropic.com/v1/models/${id}`, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
    });
    if (res.status === 200) return { id, status: "ok" };
    if (res.status === 404) return { id, status: "retired", http: 404 };
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 160);
    } catch {
      /* ignore */
    }
    return { id, status: "error", http: res.status, detail };
  } catch (err) {
    return { id, status: "error", detail: String(err?.message || err).slice(0, 160) };
  }
}

const results = await Promise.all(modelIds.map(checkModel));

let retired = 0;
let errors = 0;
for (const r of results) {
  const where = [...refs.get(r.id)].join(", ");
  if (r.status === "ok") {
    console.log(`✓  ${r.id}  — available`);
  } else if (r.status === "retired") {
    retired++;
    console.log(`✗  ${r.id}  — RETIRED (HTTP 404 not_found)`);
    console.log(`     referenced by: ${where}`);
  } else {
    errors++;
    console.log(`?  ${r.id}  — could not verify (${r.http || "network"}) ${r.detail || ""}`);
  }
}

console.log("──────────────────────────────────────────────────────────────");

if (retired > 0) {
  console.error("");
  console.error("‼  MODEL RETIRED — this WILL break the demo. Swap to a current");
  console.error("   model id (e.g. claude-sonnet-4-6) before launching.");
  process.exit(2);
}
if (errors > 0) {
  console.error("⚠  Could not verify all models (network/auth). Not blocking, but unverified.");
  process.exit(1);
}
console.log("All configured models are available.");
process.exit(0);
