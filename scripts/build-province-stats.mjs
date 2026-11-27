import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROVINCE_REGISTRY } from '../server/provinces.mjs';
import { buildCombinationMajorStats } from '../server/advisor.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data', 'normalized');

for (const prov of PROVINCE_REGISTRY) {
  const bundlePath = path.join(dataDir, prov.bundleFile);
  if (!fs.existsSync(bundlePath) || !prov.statsFile) continue;
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
  const comboMajorStats = buildCombinationMajorStats(bundle.offerings);
  const out = {
    dataset: bundle.dataset,
    offeringsCount: bundle.offerings.length,
    comboMajorStats,
  };
  const outPath = path.join(dataDir, prov.statsFile);
  fs.writeFileSync(outPath, JSON.stringify(out), 'utf8');
  console.log(
    `[build-province-stats] ${prov.code} (${prov.name}) -> ${prov.statsFile} | offerings=${bundle.offerings.length} | P_CB=${comboMajorStats.P_CB.undergradCoveragePct}%`
  );
}
