/**
 * Production build wrapper — loads .env files with override for empty values.
 * Fixes dotenv v17 not replacing pre-set empty KINDE_* vars during `next build`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filename) {
  const filePath = path.join(root, filename);
  if (!fs.existsSync(filePath)) return;

  const parsed = dotenv.parse(fs.readFileSync(filePath));
  for (const [key, value] of Object.entries(parsed)) {
    if (!process.env[key] || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

// Match Next.js production env load order (later files win when value was empty).
for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  loadEnvFile(file);
}

const nextBin = path.join(root, "node_modules", ".bin", "next");

const result = spawnSync(nextBin, ["build"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
