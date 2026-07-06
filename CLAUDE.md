# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Browser games for a young child, based on episodes of the *Yakari* cartoon.
Two families of games:

- **Five episode games** (`yakari-ep16/17/21/23/56-*`), Game-Boy-Color style
  (top-down view, grid movement, camera follow, interact by walking into
  things). No failure states, no game over, spoken narration (French
  `speechSynthesis`), one feather earned per completed board.
- **One platformer** (`yakari-ep21-condor-plateforme/`), an Aladdin-style
  side-scrolling remake of the condor episode with jumping, a bow with
  limited arrows, 3 hearts, and a game over that restarts at level 1. It
  does NOT use `yakari-engine/` — its engine is self-contained in its own
  `game.js` (see that folder's README).

This is an **independent git repo** (`codeursenior/yakari-games` on GitHub,
public, deployed via GitHub Pages), nested inside the personal `Galadriel`
workspace but excluded from its git tracking. Commit and push from *this*
directory, not from the Galadriel root.

## Running / testing

Zero build, zero dependencies, zero external files. To run:

- Open `index.html` (root menu) or any `yakari-ep*/index.html` directly in a
  browser — double-click works, no server needed.
- There is no test suite, linter, or build step. Verify changes by playing
  through the affected board(s) in a browser.
- Reloading the page always restarts the game from scratch — there is no save
  system, and this is intentional.

## Architecture

### Shared engine (`yakari-engine/`)

`engine.js` is the common game engine loaded by every game before its own
`game.js` (classic `<script>` tags, so state is shared via globals — not
modules). It owns:

- Canvas rendering at 480×320, camera clamped to a 15×10 tile viewport.
- Grid movement: 200 ms per step, driven by `setInterval` game-logic ticks
  decoupled from `requestAnimationFrame` rendering, using `performance.now()`
  absolute time (so the game doesn't desync if the tab is backgrounded).
  Do not use `Date.now()`/delta-time accumulation here — this game intentionally
  keys everything off absolute time.
- Interaction model: bump-to-interact (walking into a solid tile/entity),
  debounced 380 ms (`lastBump`).
  There is no button/menu for interactions.
- Touch-to-move: tapping a tile pathfinds there via BFS (`findPath`) and
  auto-"bumps" a solid target on arrival.
- WebAudio-generated sound effects (`sfx`, extendable via
  `Object.assign(sfx, {...})`) and French `speechSynthesis` narration — no
  audio files.
- Effects (hearts, poof, sparkles, smoke, splash), weather (rain/snow), night
  with light-hole overlays, dawn tint, progress feathers, title/victory
  overlay.

`style.css` holds the shared chrome (frame, touch d-pad, narration banner,
overlay).

### Per-game code (`yakari-ep*/`)

Each episode folder contains only `index.html`, `game.js`, and `README.md` —
no engine code. A game's `game.js`:

1. Declares ASCII maps (one character = one tile) and sets `SOLID_TILES`.
2. Implements `drawTile(chr, x, y, px, py, t)` (required — the engine has no
   default tile rendering).
3. Optionally overrides `drawPlayerSprite(...)` (e.g. Yakari riding his pony),
   adds sounds via `Object.assign(sfx, {...})`, and hooks
   `tileSolidHook` (conditional solidity, e.g. a lake passable only by canoe),
   `logicTickHook` (periodic rules, e.g. volcano smoke), and
   `renderOverlayHook` (full-screen tint, e.g. eruption glow).
4. Defines a chain of phase functions (`startPhase1`, `startPhase2`, ...),
   each setting up a map/quest and calling `fadeOut(() => startPhaseN())` on
   completion to advance. Quest progress counters live on the shared `quest`
   object.
5. Ends with `startEngine(startPhase1)`.

`index.html` in each game folder loads `../yakari-engine/style.css`, then
`../yakari-engine/engine.js`, then its own `game.js` — order matters since
`game.js` relies on globals the engine defines.

### Root menu (`index.html`)

Static card grid linking to each `yakari-ep*/` folder. Update this when adding
a new episode game.

## Adding a new episode game

1. Copy an existing game folder (`index.html` + `game.js` + `README.md`) as a
   starting point.
2. In `index.html`: update title, favicon emoji, and overlay text.
3. In `game.js`: replace maps, sprites, phases, and narration strings.
4. Check the known pitfalls: every objective must be BFS-reachable, the first
   objective must be visible from the spawn camera position (15×10 view), and
   all timing must use absolute time (`performance.now()`), never deltas.
5. Add a card for the new game to the root `index.html` menu.
