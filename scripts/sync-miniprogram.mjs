import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const contractsSrc = path.join(rootDir, 'packages', 'contracts', 'src', 'index.ts');
const contractsDest = path.join(rootDir, 'miniprogram', 'lib', 'contracts', 'index.ts');

const engineSrcDir = path.join(rootDir, 'packages', 'rules-engine', 'src');
const engineDestDir = path.join(rootDir, 'miniprogram', 'lib', 'rules-engine');

const HEADER = '// AUTO-SYNCED FROM packages/* — 请勿手动修改，运行 npm run sync:miniprogram 更新\n';

fs.mkdirSync(path.dirname(contractsDest), { recursive: true });
fs.writeFileSync(contractsDest, HEADER + fs.readFileSync(contractsSrc, 'utf8'), 'utf8');

fs.mkdirSync(engineDestDir, { recursive: true });
for (const file of fs.readdirSync(engineSrcDir)) {
  if (!file.endsWith('.ts')) continue;
  const raw = fs.readFileSync(path.join(engineSrcDir, file), 'utf8');
  const rewritten = raw.replace(/['"]\.\.\/\.\.\/contracts['"]/g, "'../contracts/index'");
  fs.writeFileSync(path.join(engineDestDir, file), HEADER + rewritten, 'utf8');
}

console.log('[sync-miniprogram] Synced contracts and rules-engine into miniprogram/lib/');
