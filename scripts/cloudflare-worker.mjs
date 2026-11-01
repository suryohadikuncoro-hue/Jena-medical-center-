#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const [mode = "validate", ...args] = process.argv.slice(2);
const validModes = new Set(["validate", "deploy"]);

if (!validModes.has(mode)) {
  console.error(
    "Usage: node scripts/cloudflare-worker.mjs <validate|deploy> [--skip-build]"
  );
  process.exit(2);
}

const skipBuild = args.includes("--skip-build");
const unexpectedArgs = args.filter(arg => arg !== "--skip-build");
if (unexpectedArgs.length > 0) {
  console.error(`Unknown option(s): ${unexpectedArgs.join(", ")}`);
  process.exit(2);
}

let config;
try {
  // wrangler.jsonc in this repository is valid JSON (JSONC without comments).
  config = JSON.parse(
    readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  );
} catch (error) {
  console.error(`Cannot read or parse wrangler.jsonc: ${error.message}`);
  process.exit(1);
}

const configuredName =
  typeof config.name === "string" ? config.name.trim() : "";
const expectedName = process.env.CF_EXPECTED_WORKER_NAME?.trim();

if (!configuredName) {
  console.error(
    'Preflight failed: wrangler.jsonc must define a non-empty top-level "name".'
  );
  process.exit(1);
}

if (!expectedName) {
  console.error("Preflight failed: CF_EXPECTED_WORKER_NAME is not set.");
  console.error(
    "Set it in Cloudflare Workers Builds to the exact Worker name shown in the Cloudflare dashboard."
  );
  process.exit(1);
}

if (configuredName !== expectedName) {
  console.error("Preflight failed: Cloudflare Worker name mismatch.");
  console.error(`  wrangler.jsonc name:       ${configuredName}`);
  console.error(`  CF_EXPECTED_WORKER_NAME:   ${expectedName}`);
  console.error(
    "Make the two names identical before deploying; no deployment was attempted."
  );
  process.exit(1);
}

console.log(`Worker name validated: ${configuredName}`);

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(`Could not start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const totalSteps = (skipBuild ? 0 : 1) + 1 + (mode === "deploy" ? 1 : 0);
let currentStep = 1;

if (!skipBuild) {
  console.log(`\n[${currentStep++}/${totalSteps}] Building application...`);
  run("pnpm", ["run", "build"]);
}

console.log(
  `\n[${currentStep++}/${totalSteps}] Validating Worker bundle with Wrangler (dry run; no deployment)...`
);
run("pnpm", ["exec", "wrangler", "deploy", "--dry-run"]);

if (mode === "deploy") {
  console.log(
    `\n[${currentStep}/${totalSteps}] Preflight passed. Deploying Worker...`
  );
  run("pnpm", ["exec", "wrangler", "deploy"]);
} else {
  console.log("\nValidation passed. No deployment was performed.");
}
