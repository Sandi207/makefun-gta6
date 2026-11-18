# Street Empire: Marisol Bay

Original open-world crime game for make.fun bounty gta6-01.

## Systems built

- Four city districts: CENTRO, PLAYA DEL SOL, PORT MARISOL, and LAS PALMAS.
- On-foot movement and driving with five vehicle types; traffic and pedestrians.
- Wanted levels 0–5 with MBPD pursuit and arrests; combat with fists, pistol, and SMG.
- Six story missions for fixer Mama Rosa, taxi fares, and 20 sunset tokens.
- localStorage saves and Continue; WebAudio synthesized engine, siren, gunshots, and music.

## Technology and verification

three.js 0.187.0 is vendored under `game/vendor/three`. The game uses ES modules and requires no network at runtime. Serve locally with `node serve.ts` on port 8080. Verification scripts: `node scripts/check-simulation.mjs` and `node scripts/playtest.mjs`.

## Screenshots

Four JPGs under `screenshots/`, each 1280×720 and under 256 KiB. Deterministic scenes are staged with `?shot=start&seed=6`, `?shot=drive&seed=6`, `?shot=chase&seed=6`, and `?shot=mission&seed=6`.

## Known limits

Headless Chrome with SwiftShader runs at about 2 fps, so game time advances slowly there; the fixed timestep keeps it playable. The playtest holds W for 2500 ms on foot and 3000 ms while driving to accommodate low headless frame rates. Police navigation and hit detection are arcade approximations. Audio requires a user gesture.
