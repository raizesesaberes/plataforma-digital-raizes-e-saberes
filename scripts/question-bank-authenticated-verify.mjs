#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const nodeExecutable = process.execPath;
const verifyScript = "scripts/question-bank-remote-homologation.mjs";
const defaultUsers = {
  ADMIN: "admin.banco@raizesesaberes.com",
  PROFESSOR: "professor.banco@raizesesaberes.com",
  CURATOR: "curador.banco@raizesesaberes.com",
  VIEWER: "viewer.banco@raizesesaberes.com",
};

if (!existsSync(verifyScript)) {
  console.error(`Arquivo nao encontrado: ${verifyScript}`);
  process.exit(1);
}

const askVisible = async (rl, prompt, fallback) => {
  const answer = await rl.question(`${prompt} [${fallback}]: `);
  return answer.trim() || fallback;
};

const askHidden = (prompt) =>
  new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = stdin.isRaw;
    let value = "";

    stdout.write(prompt);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    const onData = (char) => {
      if (char === "\u0003") {
        stdout.write("\n");
        stdin.setRawMode?.(wasRaw || false);
        stdin.pause();
        process.exit(130);
      }
      if (char === "\r" || char === "\n") {
        stdout.write("\n");
        stdin.off("data", onData);
        stdin.setRawMode?.(wasRaw || false);
        stdin.pause();
        resolve(value);
        return;
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };

    stdin.on("data", onData);
  });

const main = async () => {
  console.log("Homologacao autenticada do Banco de Questoes");
  console.log("As senhas digitadas aqui nao sao gravadas e nao aparecem no log.\n");

  const rl = createInterface({ input, output });
  const env = { ...process.env };

  try {
    for (const [profile, fallbackEmail] of Object.entries(defaultUsers)) {
      const emailKey = `SUPABASE_TEST_EMAIL_${profile}`;
      const passwordKey = `SUPABASE_TEST_PASSWORD_${profile}`;
      env[emailKey] ||= await askVisible(rl, `E-mail ${profile.toLowerCase()}`, fallbackEmail);
      if (!env[passwordKey]) {
        env[passwordKey] = await askHidden(`Senha ${profile.toLowerCase()}: `);
      }
      if (!env[passwordKey]) {
        throw new Error(`Senha nao informada para ${profile.toLowerCase()}.`);
      }
    }
  } finally {
    rl.close();
  }

  console.log("\nExecutando homologacao remota autenticada...\n");
  const result = spawnSync(nodeExecutable, [verifyScript, "verify"], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  for (const key of Object.keys(defaultUsers)) {
    delete env[`SUPABASE_TEST_PASSWORD_${key}`];
  }

  process.exit(result.status ?? 1);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
