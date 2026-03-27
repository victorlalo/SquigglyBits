# SquigglyBits — Current State
*Last updated: 2026-03-27*

## What This Game Is

A browser-based ecosystem simulation game. Every run, a jar fills with simple creatures that move, eat food dots, flee predators, and **absorb weaker creatures** — inheriting traits from what they consume. The player never directly controls creatures. Instead, they tune a small number of environmental variables before and during the simulation. At the end, they select one survivor as their **champion**.

The long-term vision includes a daily shared seed (all players get the same starting conditions) and asynchronous champion competition. The current work is a local MVP focused purely on the core simulation loop.

**One-line pitch:** Shape an ecosystem. Pick the monster it produces.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Build | Vite + TypeScript | Fast setup, hot reload, type safety |
| Rendering | PixiJS v8 | WebGL batched rendering for 500–10k sprites |
| Physics | Custom (no library) | Spatial hash + circle math, ~150 lines total |
| Backend | None | Fully client-side for MVP |
| RNG | mulberry32 (custom) | Seedable — deterministic replays, future daily seeds |

---

## How to Run

```bash
npm install       # only needed once
npm run dev       # starts local server at http://localhost:5173
```

---

## Current File Inventory

### Simulation Engine

| File | What it does |
|------|-------------|
| `src/rng.ts` | Mulberry32 seedable PRNG. All randomness in the sim goes through this — never `Math.random()`. |
| `src/types.ts` | `Creature`, `Food`, `SimConfig`, `SimState`, `GamePhase` interfaces. |
| `src/config.ts` | All tunable constants (jar size, energy costs, absorption ratios, creature speed, etc.) in one place. |
| `src/utils.ts` | `hslToHex()` — converts a 0–360 hue to a PixiJS hex color number. |
| `src/sim/spatialHash.ts` | Grid-based spatial hash. Reduces collision/proximity checks from O(n²) to ~O(n). |
| `src/sim/physics.ts` | Per-tick: integrates positions, enforces circular jar boundary (reflect velocity), detects creature-creature collisions. Returns `CollisionPair[]` — doesn't resolve them. |
| `src/sim/creature.ts` | AI steering (seek food, chase prey, flee predators, wander). Absorption resolution (trait + hue blending). Food eating. Asexual reproduction with mutation. Newborn immunity (age < 5 ticks). |
| `src/sim/food.ts` | Spawns food dots randomly inside the jar each tick at a rate driven by `foodAbundance`. |
| `src/sim/simulation.ts` | Tick orchestrator. Calls all systems in order. Manages `SimState`. Sets phase to `paused` at tick 500/1000, `finished` at tick 1500 or ≤1 creature. |
| `src/assets.ts` | Auto-loads creature sprites from `src/sprites/creature_*.png` via Vite glob. No manifest needed. |
| `src/spriteGen.ts` | Generates 12 procedural bilaterally-symmetric grayscale creature textures at startup. Used when no custom sprites are present. |

### UI Layer

| File | What it does |
|------|-------------|
| `src/main.ts` | Entry point. Creates PixiJS app, generates textures, maintains a sprite pool, and runs the `showConfigUI → runSimUI → showSelectUI` async loop. |
| `src/ui/setupUI.ts` | `showConfigUI()` — renders 3 HTML sliders + a button into the sidebar. Returns a `Promise<SimConfig>` that resolves on click. Reused for both setup and mid-sim pause. |
| `src/ui/simUI.ts` | `runSimUI()` — drives the PixiJS ticker. Steps simulation each frame, updates HUD, handles mid-sim pauses (stops ticker, shows sliders, resumes) and finish condition. |
| `src/ui/selectUI.ts` | `showSelectUI()` — overlays survivor circles on the canvas. Click to inspect stats in sidebar. "Confirm Champion" or "Run Again" resolve the promise. |
| `src/ui/tooltip.ts` | `enableHoverTooltip()` — active during mid-sim pauses. Shows a floating stat card when hovering over a creature on the canvas. Returns a cleanup function. |

### Assets

| Path | What it does |
|------|-------------|
| `src/sprites/` | Drop `creature_<name>.png` files here to add custom sprite art. Auto-detected by Vite glob. See `README.md` inside for design tips. |
| `index.html` | Full dark-theme CSS for sidebar, sliders, buttons, stats panel, select overlay, and tooltip. |

---

## How the Game Loop Works

```
main.ts init()
  └── runGame() — loops forever:
        1. await showConfigUI()        player sets sliders → SimConfig
        2. initSimulation(config)      creates SimState (80 creatures, empty food)
        3. await runSimUI(app, state)  ticks sim + renders until finished
              each frame:
                stepSimulation(state)  advance one tick
                drawFrame(state)       update sprite pool + redraw food/jar
              on pause (tick 500, 1000):
                stop ticker
                await showConfigUI()   player re-adjusts sliders
                resume ticker
        4. await showSelectUI(survivors)  player picks champion
        5. → back to step 1
```

---

## Simulation Mechanics Reference

### Tick Order (every tick)
1. Spawn food — rate = `foodAbundance / 5 × 0.3` items/tick
2. Rebuild food spatial hash
3. Rebuild creature spatial hash (pre-movement positions, for AI)
4. AI steering — drain energy, wander, seek food/prey, flee predators, normalize velocity
5. Physics — move creatures, bounce off jar wall, detect collisions
6. Resolve absorptions — larger absorbs smaller (if ratio ≥ 1.08×, prey age ≥ 5)
7. Eat food — proximity check, gain energy
8. Reproduce — if energy ≥ 160, split; child spawned at `parent.size × 3` distance
9. Remove dead (energy ≤ 0) and absorbed creatures
10. Add offspring to array
11. Compact food array (remove eaten)
12. Increment tick, check phase

### Creature Traits
| Trait | Effect | How it changes |
|-------|--------|----------------|
| `speed` | Movement pixels/tick | Blends 20% toward prey on absorption; mutates on reproduction |
| `size` | Collision radius (capped at 32px) | Grows via area-based absorption math |
| `perception` | Sensing range | Blends 20% toward prey on absorption; mutates on reproduction |
| `hue` | Visual color 0–360 | Shifts 15% toward prey hue on absorption; drifts ±12.5° on reproduction |
| `energy` | Health/fuel | Drains per tick; restored by food (+25) and absorption (+70% of prey energy) |

### Absorption Formula
- Absorber must be ≥ 1.08× larger by radius
- Prey must have `age ≥ 5` (newborn immunity)
- New size: `min(32, sqrt(absorber.size² + prey.size² × 0.20))`
- Energy gain: `prey.energy × 0.70`
- Trait blend: `absorber × 0.80 + prey × 0.20` (± mutation variance)

### Environmental Sliders
| Slider | Range | Default | Effect |
|--------|-------|---------|--------|
| Food Abundance | 1–10 | 5 | Food spawn rate per tick |
| Speed Modifier | 0.5–2.0 | 1.0 | Global movement multiplier applied in physics |
| Mutation Rate | 0.0–1.0 | 0.3 | Variance in trait blending and reproduction mutation |

---

## Key Architectural Decisions

- **Physics is decoupled from game rules.** `physics.ts` detects collisions and returns pairs. `creature.ts` decides what happens. Physics knows nothing about absorption.
- **Spatial hash, not quadtree.** Simpler, better cache locality for uniformly distributed entities.
- **Seeded RNG from the start.** Every random call goes through `createRNG(seed)`. Foundation for future deterministic daily seeds.
- **HSL hue for color.** Stored as 0–360 float for smooth blending. Converted to hex only at render time.
- **Sprite pool, not create/destroy.** `main.ts` maintains an array of PixiJS Sprites that are repositioned and re-tinted each frame. Sprites beyond the current creature count are hidden, not removed.
- **Promises for phase transitions.** Each UI phase is an async function returning a Promise. `main.ts` awaits them in sequence, keeping the game loop readable.
- **Newborn immunity.** Offspring cannot be absorbed for their first 5 ticks. Prevents the common failure mode of a parent immediately re-absorbing its own child.

---

## Not Built Yet (Future)

- Daily shared seed (requires server or agreed-upon seed source)
- Champion vs champion asynchronous combat
- Leaderboard / social comparison
- Mobile support
- Visual feedback on absorption events (flash, particle burst, etc.)
- Creature name generation
