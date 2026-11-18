# Street Empire: Marisol Bay

[![make.fun bounty gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Sandi207/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Sandi207/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01)

**Arrive unknown. Leave a legend.** An original 3D open-world crime game in development for the [make.fun bounty gta6-01](https://make.fun/bounty/gta6-01). Play Dario Fuentes, a newcomer driver finding his way in a fictional sun-soaked coastal city. Everything authored for this game is original; no Rockstar assets, characters, locations or branding are used.

**Session 2** adds police pursuit, combat, six original story missions, taxi fares, collectibles, browser saves and synthesized audio to the exploration and driving core. The simulation suite passes; the worker’s browser play-test and four real screenshots remain pending.

## Play locally

```sh
node serve.ts
```

Open **http://localhost:8080** in a desktop browser with WebGL2. Node 22.18+ or 24 runs the TypeScript server directly. There is no build step, installation, account, or runtime network dependency. All content is static under `game/`; any local static HTTP server can serve that folder offline. The server listens on loopback only.

| Input | On foot | Driving |
| --- | --- | --- |
| W / S | Forward / back relative to camera | Accelerate / brake, then reverse |
| A / D | Strafe relative to camera | Steer |
| Shift | Sprint | — |
| Space | Jump | Handbrake |
| E | Enter a nearby stopped car | Exit after slowing below 18 km/h |
| Right mouse drag | Orbit camera | Orbit; chase view returns after release |
| Left click | Aim at the mouse crosshair and shoot | — |
| F / 1 / 2 / 3 | Punch / fists / pistol / SMG | — |
| M | Mission menu | Mission menu |
| T | Find a City Cab first | Start / cancel a taxi fare |
| 0 | Mute / unmute audio | Mute / unmute audio |
| Esc / P | Pause / resume | Pause / resume |
| Enter | Start from the title | — |

Arrow keys also move and drive. Click **Enter Marisol** to begin. A coral Solero GT waits at the curb beside Dario. Press **M** for Mama Rosa’s mission menu and briefing cards. The HUD, minimap and world marker track the current objective. Walk into marked weapons, health and armor pickups; find 20 sunset tokens for $50 each. **Continue** appears on the title when this browser has a save. Autosave records cash, vitals, wanted, weapons, mission progress, tokens and player/car position; pause also has a Save button. Saves need browser localStorage and stay on this device. Audio begins after a click or keypress.

## The city and simulation

- Ten by ten city blocks: Centro towers and a fountain plaza, Las Palmas houses, Playa del Sol's hotels, boardwalk, sand and ocean, and Port Marisol's containers, cranes, docks and cargo ship.
- Canvas-generated building facades, lane textures and original shop/billboard graphics. Palms, trees, sidewalks, benches, hydrants, street lamps, crosswalks and timed traffic signals. Warm daylight slowly shifts into night as the game clock advances.
- An animated primitive-built character with camera-relative walking, sprinting, jumping, bounds and building/prop collisions.
- Five procedural vehicles: Cavalier sedan, Solero GT, City Cab, Porter van and Brisa roadster. Acceleration, braking, reverse, speed-dependent steering, handbrake, turning/spinning wheels, emissive headlights, collision damage and engine smoke.
- 14 active lane-following traffic cars replenish near the player; approximately 34 parked cars spread across the city. Stealing a traffic car replenishes its slot. 24 nearby pedestrians walk sidewalks, cross at intersections and flee fast cars.
- Live minimap, health, armor, cash, 0–5 wanted stars, weapons/ammo, token count, objectives, game clock, district, context prompts, notifications, vehicle speed, gear and engine condition. Title, pause, mission, briefing, pass/fail, BUSTED and WASTED screens.
- Vehicle theft, pedestrian impacts, shots, officer/MBPD-car attacks and reckless driving near police raise wanted. Original black-and-white MBPD patrol cars dispatch from the city edge, follow roads and ram; officers chase, attack and arrest slow players nearby. Break line of sight or outrun their 110 m search radius to cool down stars. Arrest deducts a fine and respawns at the station; death deducts a medical bill and respawns at the hospital.
- Fists, pistol and SMG pickups, ammo, mouse raycast shooting with scenery obstruction, muzzle flash/tracers and hit reactions. Provoked Los Tiburones fight back and drop weapons. Health regeneration is off; packs and armor help with damage from falls, crashes, enemies and police.
- Mama Rosa’s six-job story for Dario: delivery, getaway, repo, turf fight, harbor run and finale escape. Ordered unlocks, briefings, timed objectives, waypoints, cash rewards and failure/retry. Taxi passenger pickup/drop-off fares and 20 hidden sunset tokens are available between story jobs.
- Gesture-started WebAudio engine hum, siren, gunshots, punches, pickup/UI tones and an original four-chord pad with bassline. No audio files.

Traffic, police routes and collisions use lightweight arcade approximations. Bullets use analytic world-space bounding boxes rather than per-triangle hits. Vehicle damage stops a wrecked engine; find a new car. Everything is generated from the URL seed; no external art or sound is needed. The fixed loop now supports 30 steps/frame, a 0.75 s frame clamp and bounded retained backlog, so 6 fps still advances game time normally. Rendering uses a 1024 shadow map, distance culling for articulated entities and adaptive pixel ratio down to 1.0; sustained low FPS disables shadows.

## Screenshots and browser checks

`shots.json` stages actual game scenes at a fixed seed:

- `?shot=start&seed=6`: title over a city vista.
- `?shot=drive&seed=6`: driving the Solero GT along Palma Avenue.
- `?shot=chase&seed=6`: the Solero GT with three wanted stars and two MBPD cars pursuing.
- `?shot=mission&seed=6`: Dario at a Mama Rosa waypoint confronting Los Tiburones.

The four output files are `1-start.jpg`, `2-drive.jpg`, `3-chase.jpg`, and `4-mission.jpg`. `?shot=street` remains available for inspection.

Staged simulation time is fixed for repeatable screenshots. Movement or starting from the title resumes play. `window.__shotReady` becomes true after rendering; `window.__game.snapshot()` exposes simulation counters for play-testing. The game itself needs no automation library.

Capture and validate the game with:

```sh
node scripts/check-simulation.mjs
# In a second terminal, with node serve.ts already running:
node scripts/playtest.mjs
```

The simulation check passes against the actual game and three.js modules (122 buildings, 811 collision boxes, 14 traffic cars and 24 pedestrians). It covers the original movement, driving, collision, traffic and geometry checks plus 6 fps real-time movement, the browser starter-drive sequence, wanted escalation, edge police pursuit, sight obstruction, ramming, arrests/death/respawns, no regeneration, pickups, aimed hits, gang retaliation/loot, all 20 tokens, all six mission rewards, failure/retry, taxi fares, save/continue, wanted decay, all four deterministic shot scenes, HUD/menu DOM wiring and gesture-gated synthesis. It uses a canvas stub and does **not** certify browser rendering.

**Worker verification still required:** this sandbox blocks loopback binding and Chromium startup. Session 1’s worker observed approximately 6 fps in Chrome/SwiftShader and game time falling behind, failing “keyboard moves Dario.” The timing fix now passes a simulated 6 fps regression; actual frame rate, mouse aiming, audio, UI readability and zero browser errors still need the worker’s run of `scripts/playtest.mjs`. That script retains its title → start → walk → pause → enter car → drive assertions, checks that theft raises wanted, and captures four actual 1280×720 JPEGs, each at most 256 KiB. No substitute images have been created here.

## Package the entry

```sh
MAKEFUN_OUTPUT_DIR=/tmp/marisol-output node main.ts
```

`main.ts` copies `game/` and `screenshots/`, then creates `dossier.json` with the unchanged `vendor/makefun-game.ts`. It enforces the 48 MiB game, 993-entry, four-screenshot and 256 KiB/image caps. Capture the real screenshots before packaging; the current empty screenshot directory intentionally cannot produce a valid dossier. No commit, push or submission is performed.

The renderer is MIT-licensed **three.js 0.187.0**, including its required core module, vendored in `game/vendor/three/`. The CDN was unavailable during this session, so the revision-187 files were copied from the local make.fun kit cache. Their upstream license is included.

## License

Original game code: MIT — see [LICENSE](LICENSE). three.js: [MIT](game/vendor/three/LICENSE).
