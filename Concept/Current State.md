# SquigglyBits — Current State
*Last updated: 2026-03-26*

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

## What Is Built

### Simulation Engine (complete)

All core logic is implemented and TypeScript-clean.

| File | What it does |
|------|-------------|
| `src/rng.ts` | Mulberry32 seedable PRNG. All randomness in the sim goes through this — never `Math.random()`. |
| `src/types.ts` | `Creature`, `Food`, `SimConfig`, `SimState`, `GamePhase` interfaces. |
| `src/config.ts` | All tunable constants (jar size, energy costs, absorption ratios, etc.) in one place. |
| `src/utils.ts` | `hslToHex()` — converts HSL hue to a PixiJS hex color number. |
| `src/sim/spatialHash.ts` | Grid-based spatial hash. Reduces collision checks from O(n²) to ~O(n). Cell size 64px. |
| `src/sim/physics.ts` | Per-tick: integrates positions, enforces circular jar boundary (reflect velocity), detects creature-creature collisions via spatial hash. Returns `CollisionPair[]` — doesn't resolve them. |
| `src/sim/creature.ts` | AI steering (seek food, chase prey, flee predators, wander). Absorption resolution (larger absorbs smaller, blends traits + hue). Food eating. Asexual reproduction with mutation. |
| `src/sim/food.ts` | Spawns food dots randomly inside the jar each tick at a rate driven by `foodAbundance`. |
| `src/sim/simulation.ts` | Tick orchestrator. Calls physics → creature logic in the correct order. Manages `SimState`. Tracks pause points at tick 500 and 1000. |
| `src/assets.ts` | Auto-loads creature sprites from `src/sprites/creature_*.png` via Vite glob. No manifest needed. |

### Current `main.ts` (temporary test harness)

`src/main.ts` currently runs the simulation immediately on load with default config, rendering everything as plain colored circles using a single PixiJS `Graphics` object cleared each frame. This is a working visual test — you can see creatures swarming, eating, and absorbing. It is **not** the final UI.

### Sprite System

`src/sprites/` — drop any `creature_<name>.png` here and it's auto-detected on next `npm run dev`. Creatures are assigned sprite keys at spawn and offspring inherit them. See `src/sprites/README.md` for design tips.

---

## What Is NOT Built Yet

The following are designed but not yet implemented:

### UI Layer (next priority)

| File | What it needs to do |
|------|---------------------|
| `src/ui/setupUI.ts` | Render 3 HTML sliders (food abundance, speed modifier, mutation rate) + "Start" button. Read values into `SimConfig`. |
| `src/ui/simUI.ts` | Drive the PixiJS ticker loop. Handle mid-sim pause at tick 500/1000 (re-show sliders, "Resume" button). |
| `src/ui/selectUI.ts` | After sim ends: display survivors in a spread layout, click to select champion, show stats card (absorptions, generation, speed, size, etc.). "Run Again" button. |
| `src/ui/renderer.ts` | Replace the current per-frame Graphics clear with proper PixiJS `ParticleContainer` rendering. One draw call for all creatures (tinted sprites), one for all food. Dramatically better performance at high entity counts. |

### Not Designed Yet (future)
- Daily shared seed (requires a server or agreed-upon seed source)
- Champion vs champion asynchronous combat
- Leaderboard / social comparison
- Mobile support

---

## Simulation Mechanics Reference

### Tick Order (every frame)
1. Spawn food (rate = `foodAbundance / 5 * 0.3` items/tick)
2. Rebuild food spatial hash
3. Rebuild creature spatial hash (pre-movement, for AI)
4. AI steering: seek food/prey, flee predators, wander
5. Physics: integrate positions → enforce jar boundary → detect collisions
6. Absorption: larger absorbs smaller if size ratio ≥ 1.08
7. Eat food: proximity check
8. Reproduce: if energy ≥ 160, split — child gets 75% of parent size, mutated stats
9. Remove dead (energy ≤ 0) and absorbed creatures
10. Check pause/finish conditions

### Creature Traits
| Trait | Effect | How it changes |
|-------|--------|----------------|
| `speed` | Movement pixels/tick | Blends on absorption, mutates on reproduction |
| `size` | Collision radius | Grows via absorption (area-based math) |
| `perception` | Sensing range | Blends on absorption, mutates on reproduction |
| `hue` | Visual color (HSL) | Shifts 15% toward prey hue on absorption |
| `energy` | Health/fuel | Drains per tick; gained from food and absorption |

### Absorption Formula
- Absorber must be ≥ 1.08× larger (by radius)
- Absorber size grows: `sqrt(absorber.size² + prey.size² × 0.35)`
- Absorber energy gains: `prey.energy × 0.70`
- Trait blend: `absorber_trait × 0.80 + prey_trait × 0.20` (± mutation variance)

### Environmental Sliders
| Slider | Range | Default | Effect |
|--------|-------|---------|--------|
| Food Abundance | 1–10 | 5 | Food spawn rate |
| Speed Modifier | 0.5–2.0 | 1.0 | Global movement multiplier |
| Mutation Rate | 0.0–1.0 | 0.3 | Trait variance on reproduction/absorption |

---

## Key Architectural Decisions

- **Physics is decoupled from game rules.** `physics.ts` only detects collisions and returns pairs. `creature.ts` decides what happens (absorption). This keeps physics reusable and testable.
- **Spatial hash, not quadtree.** Simpler to implement, better cache locality for uniformly distributed entities, sufficient for this use case.
- **Seeded RNG from the start.** Every random call goes through `createRNG(seed)`. This is the foundation for future deterministic daily seeds.
- **HSL hue for creature color.** Stored as 0–360 float, enabling smooth blending arithmetic. Converted to hex only at render time.
- **Sprites are opt-in.** If `src/sprites/` is empty, creatures render as generated circles. Custom art plugs in without code changes.
- **Creature cap at 2000.** Reproduction is blocked above this. Prevents runaway population growth in high-abundance configs.

---

## Immediate Next Steps (in order)

1. **`src/ui/renderer.ts`** — PixiJS ParticleContainer rendering (replaces Graphics test harness)
2. **`src/ui/setupUI.ts`** — Setup phase: sliders + start button
3. **`src/ui/simUI.ts`** — Simulate phase: game loop + mid-sim pause/resume
4. **`src/ui/selectUI.ts`** — Select phase: click to pick champion, stats card
5. **`src/main.ts`** — Rewrite as phase state machine wiring all 3 phases
6. **Polish** — Tune constants, test at scale, visual feedback on absorptions
