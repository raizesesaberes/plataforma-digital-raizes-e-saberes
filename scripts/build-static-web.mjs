// Publish the static runtime, never the repository root or operational artifacts.
import { cpSync, lstatSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist');
const rootExtensions = new Set(['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp']);
const assetExtensions = new Set(['.html', '.css', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.mp4', '.ogg', '.wav', '.pdf']);
const excludedRoot = new Set(['supabase-config.example.js', 'secretaria-v1-validation.html', 'secretaria-v1-validation-2.html']);
let copied = 0;

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
function copyFile(relative) {
  const source = join(root, relative);
  if (!lstatSync(source).isFile()) throw new Error(`Non-regular runtime file: ${relative}`);
  const destination = join(output, relative);
  mkdirSync(resolve(destination, '..'), { recursive: true });
  cpSync(source, destination);
  copied += 1;
}
function copyAssets(relative) {
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const child = join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink not allowed in runtime assets: ${child}`);
    if (entry.isDirectory()) copyAssets(child);
    else if (entry.isFile() && assetExtensions.has(extname(entry.name).toLowerCase())) copyFile(child);
  }
}
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (entry.isFile() && !entry.name.startsWith('.') && !/\.(example|test|spec)\./.test(entry.name) && rootExtensions.has(extname(entry.name).toLowerCase()) && !excludedRoot.has(entry.name)) copyFile(entry.name);
}
copyAssets('assets');
copyFile('data/atividades-imprimiveis/catalog.json');
console.log(`Static runtime prepared: ${copied} files in dist; operational directories excluded.`);
