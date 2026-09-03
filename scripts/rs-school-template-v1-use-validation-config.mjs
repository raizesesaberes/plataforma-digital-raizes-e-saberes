#!/usr/bin/env node
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = resolve(ROOT, "supabase-config.js");
const BACKUP = "/private/tmp/rs-school-template-v1-supabase-config.original.js";
const PILOT_REF = "jaesjldrbjbdmzzggxzw";

const fail = (message) => {
  console.error(`ERRO\t${message}`);
  process.exit(1);
};
const promptHidden = (label) => {
  const shell = `printf %s ${JSON.stringify(`${label}: `)} > /dev/tty; stty -echo < /dev/tty; IFS= read -r value < /dev/tty; stty echo < /dev/tty; printf '\\n' > /dev/tty; printf %s "$value"`;
  const result = spawnSync("bash", ["-lc", shell], { encoding: "utf8" });
  if (result.status !== 0) fail(`Nao foi possivel ler ${label}.`);
  return result.stdout.trim();
};

const url = (process.env.SUPABASE_URL || promptHidden("SUPABASE_URL da instalacao nova")).replace(/\/$/, "");
const anonKey = process.env.SUPABASE_ANON_KEY || promptHidden("SUPABASE_ANON_KEY publica da instalacao nova");
if (!url || !anonKey) fail("URL e anon key publica sao obrigatorias.");
if (url.includes(PILOT_REF)) fail("URL aponta para o piloto; troca de config bloqueada.");
if (!existsSync(BACKUP)) copyFileSync(CONFIG, BACKUP);

writeFileSync(
  CONFIG,
  `window.RAIZES_SUPABASE = {\n  url: ${JSON.stringify(url)},\n  anonKey: ${JSON.stringify(anonKey)},\n  allowLocalFallback: false,\n};\n`
);
console.log("FRONTEND_CONFIG_VALIDATION\tPASS");
console.log("BACKUP_CONFIG\t/private/tmp/rs-school-template-v1-supabase-config.original.js");
