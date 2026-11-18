# Street Empire: Marisol Bay

[![make.fun bounty gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Sandi207/makefun-gta6/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Sandi207/makefun-gta6/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun bounty gta6-01](https://make.fun/bounty/gta6-01) — playable offline
in a desktop browser from static files, keyboard + mouse.

**Marisol Bay** is a fictional sun-soaked coastal city, built from scratch:
drive and steal cars, walk the streets among traffic and pedestrians, build
a wanted level and outrun the Marisol Bay Police, fight rival crews, and run
a story of missions for the city's fixers — with a full HUD, minimap, save
system, and an original synthesized soundtrack.

Everything here is original: the city, characters, vehicles, names, story,
art, sound and music. Nothing from Rockstar Games.

## Play

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

- **WASD** move / drive, **Shift** sprint, **Space** brake / jump, **E** enter/exit/steal car, **F** punch / fire, **R** reload, **M** missions, **P** pause, **H** horn.
- On foot or behind the wheel: traffic, pedestrians, police chases, wanted stars, cash, safehouses.
- Progress saves automatically (localStorage) — continue from the title screen.

## Build

- `main.ts` (Node 22) hands the game in: it copies `game/` and `screenshots/`
  to the output directory and writes `dossier.json` with the vendored
  `vendor/makefun-game.ts` library.
- `game/` is the playable game as static files (`game/index.html`).
  three.js is vendored under `game/vendor/` — no network request at runtime.
- `screenshots/` holds 3–4 real renders of the game's own code.

## License

MIT — see [LICENSE](LICENSE).
