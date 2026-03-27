# SquigglyBits MVP Implementation Plan

## Context
The repo is empty (just a concept doc). Goal: build the smallest playable version of the core loop — **tune environment -> watch simulation -> pick a champion** — in a single day. No online/social features. Purely client-side.

The simulation's core fantasy: creatures collide, compete, and **absorb weaker creatures**, inheriting traits from what they consume. The player shapes the ecosystem indirectly through environmental tuning — never controlling creatures directly.

**Target scale: 500-10,000 simple 2D sprites** — this drives the need for WebGL rendering and spatial partitioning.

## Stack
- **Vite + TypeScript** (fast setup, hot reload)
- **PixiJS v8** — WebGL batched rendering via `ParticleContainer` handles 10k+ simple sprites at 60fps
- **No backend** — everything runs in the browser
- **Seeded RNG** — simple seedable PRNG (mulberry32) so simulations are deterministic. Random seed per run for MVP; prepares for daily shared seeds later.

## Architecture: Physics as a Separate System

Physics is its own module (`src/sim/physics.ts`), decoupled from creature behavior:

### Spatial Hash Grid (`src/sim/spatialHash.ts`)
- Divides the jar into a grid of cells (cell size = largest possible creature diameter)
- Each tick, all creatures are inserted into the grid by position
- Collision queries only check creatures in the same + neighboring cells
- Reduces collision detection from O(n^2) to ~O(n) for uniformly distributed entities
- ~60-80 lines of code. Simple and fast.

### Physics Module (`src/sim/physics.ts`)
Handles:
- **Broad-phase collision detection** via spatial hash — returns pairs of overlapping creatures
- **Jar boundary enforcement** — keep creatures inside the circular jar, reflect velocity on contact
- **Movement integration** — apply velocity to position each tick

The physics module returns collision pairs to the simulation, which then decides what happens (absorption, trait blending). Physics doesn't know about game rules.

## File Structure
```
SquigglyBits/
  Concept/                          (existing)
  index.html                        (canvas container + sidebar UI)
  package.json / tsconfig.json / vite.config.ts
  src/
    main.ts                         (entry: wire 3 phases together)
    types.ts                        (Creature, Food, SimConfig, GamePhase)
    config.ts                       (constants: jar size, tick count, defaults)
    rng.ts                          (seedable PRNG utility)
    sim/
      spatialHash.ts                (grid-based spatial partitioning)
      physics.ts                    (movement, boundary, collision detection)
      creature.ts                   (behavior: absorption logic, reproduction, energy)
      food.ts                       (spawn logic)
      simulation.ts                 (tick orchestrator: calls physics, then creature logic)
    ui/
      setupUI.ts                    (sliders + start button)
      simUI.ts                      (PixiJS render loop + mid-sim tweaks)
      selectUI.ts                   (show survivors, click to pick champion)
      renderer.ts                   (PixiJS drawing: ParticleContainer for creatures, Graphics for jar/food)
```

## 3 Game Phases

1. **SETUP** — Player sees jar preview + environment sliders. Clicks "Start Simulation".
2. **SIMULATE** — Simulation runs at 60fps. Player watches creatures move, collide, and absorb each other. HUD shows tick counter + creature count. Player gets **2 mid-run tweak opportunities** (slider adjustments at tick 500 and 1000). Ends when ticks hit max (~1500 ticks, ~25s) or 1 or fewer creatures remain.
3. **SELECT** — Survivors displayed. Player clicks one to select as champion. Stats card shown. "Run Again" button returns to Setup.

## Creature Mechanics

### Movement
- Velocity vector + wander (small random perturbation each tick)
- Steer toward nearest food if within perception range
- Steer toward smaller nearby creatures (predatory)
- Flee from larger nearby creatures (survival)
- Bounce off circular jar wall (handled by physics module)

### Absorption (core mechanic)
- When two creatures collide (detected by physics), the **larger one absorbs the smaller one**
- Absorber gains: portion of absorbed creature's energy + **blended traits** (speed, size weighted toward absorber but shifted by prey's stats)
- Absorber's color shifts toward absorbed creature's hue — visual trait inheritance

### Energy & Death
- Energy drains each tick (faster/bigger = more drain)
- Eating food dots restores energy
- Absorbing creatures restores more energy than food
- Energy <= 0 = death

### Reproduction (secondary)
- High energy threshold triggers asexual split
- Parent/child each get half energy, child stats mutated
- Keeps population from collapsing too fast
- Soft creature cap at ~2000 to prevent runaway growth (skip reproduction above cap)

### Traits
- **speed**: movement rate (higher = faster but more energy drain)
- **size**: radius (larger = wins absorptions but needs more food)
- **perception**: sensing range for food/threats
- **color**: HSL hue, blended on absorption — shows lineage visually

## Environmental Sliders (3 total)
| Slider | Range | Default | Effect |
|--------|-------|---------|--------|
| Food Abundance | 1-10 | 5 | Food spawn rate per tick |
| Speed Modifier | 0.5-2.0 | 1.0 | Global movement speed multiplier |
| Mutation Rate | 0.0-1.0 | 0.3 | How much offspring/absorption trait blending varies |

## Mid-Simulation Tweaks
- At tick 500 and tick 1000, simulation **pauses** and slider panel reappears
- Player adjusts sliders (or leaves them), clicks "Resume"
- HUD shows countdown to next tweak opportunity

## Simulation Tick Order
1. Spawn food (random chance based on abundance)
2. Update creature movement (steer toward food/prey, flee predators)
3. **Physics step**: integrate positions, enforce jar boundary, detect collisions via spatial hash
4. Resolve collisions — larger absorbs smaller, blend traits
5. Eat food (proximity check via spatial hash)
6. Reproduce (energy > threshold, respect cap)
7. Remove dead (energy <= 0)
8. Check for mid-sim tweak pause points
9. Increment tick

## Rendering Strategy (PixiJS)
- **Creatures**: `ParticleContainer` with simple circle textures (generated once via `Graphics` -> `renderTexture`). Tint each sprite by creature color. Update position/scale each frame.
- **Food**: Second `ParticleContainer` with smaller dot texture.
- **Jar border**: `Graphics` circle, drawn once.
- **HUD**: HTML overlay (not PixiJS text — simpler and more flexible).
- This approach handles 10k+ entities at 60fps with minimal overhead.

## Key Design Decisions
- **Physics is decoupled** — detects collisions, doesn't resolve them. Simulation decides what happens.
- **Spatial hash over quadtree** — simpler to implement, better cache locality for uniform distributions, sufficient for this use case.
- **PixiJS ParticleContainer** — massive batched draw calls. One draw call for all creatures, one for all food.
- **Seeded RNG everywhere** — all random calls go through the seedable PRNG, never Math.random().
- **HSL colors blend on absorption** — visually track lineage and see "hybrid" creatures.
- **Jar is a circle** — boundary enforcement via distance-from-center check in physics module.

## Implementation Order
1. Scaffold project: `npm create vite@latest`, install PixiJS, verify dev server
2. `rng.ts` — seedable PRNG (mulberry32, ~15 lines)
3. `types.ts` + `config.ts` — shared types and constants
4. `spatialHash.ts` — grid-based spatial partitioning (~70 lines)
5. `physics.ts` — movement integration, boundary, collision detection using spatial hash
6. `creature.ts` + `food.ts` — behavior logic (absorption, reproduction, energy)
7. `simulation.ts` — tick orchestrator, wire physics + creature logic
8. `renderer.ts` — PixiJS setup, ParticleContainer for creatures/food, jar Graphics
9. `setupUI.ts` — sliders + start button (HTML)
10. `simUI.ts` — game loop (PixiJS ticker), mid-sim tweak pause logic
11. `main.ts` — phase state machine wiring everything together
12. `selectUI.ts` — survivor display, click-to-select, stats card
13. Polish — tune constants, stress-test at high creature counts, fix edge cases

## Verification
- Run `npm run dev`, open browser
- Adjust sliders, click Start — hundreds of creatures should swarm, collide, absorb
- Larger creatures visibly grow and shift color when absorbing smaller ones
- At 1000+ creatures, framerate should stay at/near 60fps
- Mid-sim pause triggers at tick 500 and 1000
- Simulation ends after ~25 seconds or when few creatures remain
- Click a surviving creature — stats card shows traits, absorption count, generation
- Click "Run Again" — resets to setup
- Stress test: set food abundance to max, verify creature cap prevents runaway growth
