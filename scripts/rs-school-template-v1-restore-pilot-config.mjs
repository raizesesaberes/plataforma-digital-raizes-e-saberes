#!/usr/bin/env node
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = resolve(ROOT, "supabase-config.js");
const BACKUP = "/private/tmp/rs-school-template-v1-supabase-config.original.js";

if (!existsSync(BACKUP)) {
  console.error("ERRO\tBackup temporario do supabase-config.js nao encontrado.");
  process.exit(1);
}
copyFileSync(BACKUP, CONFIG);
console.log("FRONTEND_CONFIG_RESTORE\tPASS");
