// Street Empire: Marisol Bay — an original 3D coastal open world for gta6-01.
// Dario Fuentes explores a seeded city on foot or in five original vehicle types.
// Includes MBPD pursuit, combat, six Mama Rosa story jobs, taxi fares, tokens,
// browser autosaves and gesture-started synthesized audio. Four seeded real scenes.
// The browser loads static ES modules and the local MIT-licensed three.js 0.187.0;
// procedural models and canvas textures require no build and no runtime downloads.
// This entry program packages game/ and real screenshots, then writes the canonical
// make.fun dossier using the unchanged vendored library. It performs no publishing.
// Local play: node serve.ts → http://localhost:8080
// Local package: MAKEFUN_OUTPUT_DIR=/tmp/marisol-output node main.ts

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const sourceDirectory = fileURLToPath(new URL('.', import.meta.url));
const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outputDirectory, { recursive: true });
for (const folder of ['game', 'screenshots']) {
  cpSync(join(sourceDirectory, folder), join(outputDirectory, folder), { recursive: true });
}
const dossier = buildDossier(outputDirectory, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDirectory, 'dossier.json'), dossier);
console.log(`Street Empire: Marisol Bay packaged at ${outputDirectory}`);
