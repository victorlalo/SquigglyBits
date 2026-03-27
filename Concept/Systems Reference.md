# SquigglyBits — Systems Reference

A plain-language walkthrough of every system in the codebase, in dependency order (foundations first).

---

## 1. Seeded RNG (`src/rng.ts`)

Every random number in the simulation goes through a single function called `createRNG(seed)`. It returns a `() => number` function that produces values between 0 and 1, just like `Math.random()` — but it's **deterministic**: the same seed always produces the same sequence.

The algorithm is called **mulberry32**, a fast 32-bit hash-based PRNG. It runs in a single line of integer math and has good distribution.

Why this matters: it means the same seed will always produce the exact same simulation. This is the foundation for the future "daily shared seed" feature, where all players start from identical conditions.

```
createRNG(seed) → rng
rng()           → number between 0 and 1
randomSeed()    → a random 32-bit integer to use as a seed
```

---

## 2. Types (`src/types.ts`)

Defines the shape of every major object in the game. Nothing here runs — it's just TypeScript contracts.

**`Creature`** — everything the simulation knows about one creature:
- `id` — unique integer, never reused
- `x, y` — position in the jar (pixels)
- `vx, vy` — current movement direction, always a unit vector (length = 1)
- `speed` — pixels moved per tick (the `vx/vy` vector is scaled by this)
- `size` — collision radius in pixels
- `perception` — how far the creature can sense food and other creatures
- `energy` — current fuel. drains every tick. hits 0 = death
- `maxEnergy` — energy cap (200)
- `age` — ticks lived
- `generation` — how many reproduction splits from the original starting creatures
- `hue` — a 0–360 number representing the creature's color on the color wheel
- `spriteKey` — which art asset to use ('default' = procedural circle)
- `absorptions` — how many creatures this one has eaten
- `children` — how many offspring it has spawned

**`Food`** — just `x, y, energy`. No behavior, no ID.

**`SimConfig`** — the three player-adjustable values:
- `foodAbundance` (1–10)
- `speedModifier` (0.5–2.0)
- `mutationRate` (0.0–1.0)

**`SimState`** — the entire live state of a running simulation: the creatures array, food array, current tick, RNG instance, config, and phase (`running` / `paused` / `finished`).

---

## 3. Config (`src/config.ts`)

A flat list of constants that control the feel of the simulation. Nothing is hardcoded elsewhere — every tunable number lives here. Key values:

| Constant | Value | What it does |
|----------|-------|-------------|
| `JAR_RADIUS` | 280px | Size of the circular arena |
| `MAX_TICKS` | 1500 | Simulation length (~25s at 60fps) |
| `STEPS_PER_FRAME` | 1 | How many simulation ticks run per rendered frame |
| `STARTING_CREATURE_COUNT` | 80 | Creatures at the start of each run |
| `CREATURE_CAP` | 2000 | Hard population ceiling — reproduction stops here |
| `CREATURE_SIZE_MIN/MAX` | 8–16px | Starting radius range |
| `CREATURE_SIZE_CAP` | 32px | Hard maximum radius — limits absorber growth |
| `CREATURE_SPEED_MIN/MAX` | 0.6–1.4 px/tick | Starting speed range |
| `ENERGY_DRAIN_BASE` | 0.08/tick | Baseline energy drain per tick |
| `ENERGY_DRAIN_PER_SIZE` | 0.022/px | Extra drain per pixel of radius (big = hungry) |
| `ENERGY_DRAIN_PER_SPEED` | 0.018 | Extra drain per unit of speed (fast = hungry) |
| `REPRODUCTION_THRESHOLD` | 160 energy | Split happens when energy exceeds this |
| `ABSORPTION_MIN_RATIO` | 1.08× | Absorber must be at least 8% larger to absorb |
| `TWEAK_TICKS` | {500, 1000} | Ticks at which the simulation pauses for player input |

---

## 4. Spatial Hash (`src/sim/spatialHash.ts`)

A performance structure used by the physics and AI systems to avoid checking every creature against every other creature each tick (which would be O(n²) — at 2000 creatures, that's 4 million checks).

**How it works:** The game world is divided into a grid of cells (64×64 pixels each). Every tick, each creature/food item is registered in whichever cell its position falls into. To find nearby things, you only check the cells that overlap your search area.

```
hash.insert(index, x, y)         — register an item in a cell
hash.query(x, y, radius)         — return all item indices in nearby cells
hash.clear()                      — wipe between ticks
```

The hash is rebuilt from scratch every tick because creatures move. Two separate hash instances exist: one for food (cell size 32), one for creature AI (cell size 64). Physics has its own internal hash for collision detection.

---

## 5. Physics (`src/sim/physics.ts`)

Runs once per tick. Responsible for **movement** and **collision detection only** — it does not decide what happens when creatures collide.

**Step 1 — Movement integration:**
Every creature's position is updated by: `x += vx * speed * speedModifier`. The `vx/vy` direction vector was set by the AI steering system in the previous step. `speedModifier` is the player's slider value.

**Step 2 — Jar boundary:**
After moving, the distance from the jar center is checked. If a creature has gone past the edge, it's pushed back to the boundary and its velocity is **reflected** — like a billiard ball bouncing off a wall. The reflection is calculated using the outward normal of the circle at the contact point.

**Step 3 — Collision detection:**
Using the spatial hash, nearby creature pairs are found. For each pair, the actual distance between them is compared to the sum of their radii (`size_a + size_b`). If the distance is less than that sum, they're touching. The pair is recorded as `{ largerIdx, smallerIdx }` and returned to the simulation. Physics stops here — it doesn't absorb anything.

---

## 6. Creature Behavior (`src/sim/creature.ts`)

Four functions, each called once per tick by the simulation orchestrator.

### `updateSteering` — AI decision-making
For each creature, every tick:
1. **Drain energy** — subtract `ENERGY_DRAIN_BASE + size * ENERGY_DRAIN_PER_SIZE + speed * ENERGY_DRAIN_PER_SPEED`
2. **Wander** — add a small random nudge to `vx/vy` so creatures don't travel in perfectly straight lines
3. **Seek food** — query the food hash within perception range. Steer toward the nearest food dot found.
4. **Seek prey** — query the creature hash for any creature that's at least 8% smaller. If one is closer than the nearest food, steer toward it instead.
5. **Flee predator** — query the creature hash for anything 8% larger. Apply a stronger push away from the nearest one.
6. **Normalize velocity** — after all nudges and steers are added, reduce the velocity vector back to unit length. This ensures speed is always controlled by `creature.speed`, not by accumulated force.

### `resolveAbsorptions` — what happens when creatures touch
Takes the collision pairs from physics. For each pair:
- Skips if either creature was already absorbed this tick
- Skips if the size ratio is too small (< 1.08×)
- **Skips if the prey's age is less than 5 ticks** (newborn immunity — prevents parent from instantly re-absorbing its own offspring)
- Absorber gains `prey.energy × 0.70`
- Absorber size grows: `sqrt(absorber.size² + prey.size² × 0.20)` — area-based, capped at 32px
- Absorber's `speed` and `perception` blend 20% toward the prey's values
- Absorber's `hue` shifts 15% toward the prey's hue around the color wheel

### `eatFood` — food consumption
For each creature, queries the food hash within `creature.size + 4` pixels. Any food dot within that range is eaten: the creature gains `FOOD_ENERGY` (25) and the food is marked for removal.

### `reproduce` — asexual splitting
For each creature with energy above `REPRODUCTION_THRESHOLD` (160):
- Parent's energy is halved
- A child is spawned at distance `parent.size × 3` away in a random direction
- Child size = parent size × 0.75 × small mutation
- Child speed, perception = parent values × small mutation
- Child hue = parent hue ± up to 12.5°
- Child inherits parent's `spriteKey`
- Child `age` starts at 0, `generation` = parent + 1

---

## 7. Food (`src/sim/food.ts`)

Each tick, new food dots are spawned randomly inside the jar. The rate is:
```
rate = FOOD_SPAWN_RATE × (foodAbundance / 5)
     = 0.3 × (foodAbundance / 5)
```
At `foodAbundance = 5` (default), that's 0.3 food per tick = roughly 1 food every 3 ticks. At abundance 10, it's 0.6 per tick. Fractional rates are handled by spawning the whole number and rolling a dice for the remainder.

Food position is uniformly distributed inside the circle using `sqrt(random)` for radius — this avoids the bias toward the center that plain `random × radius` would produce.

---

## 8. Simulation Orchestrator (`src/sim/simulation.ts`)

`stepSimulation(state)` calls all the above systems in the correct order each tick:

```
1.  spawnFood            → add new food dots
2.  rebuild food hash    → so AI can query food positions
3.  rebuild creature AI hash → so AI can query creature positions
4.  updateSteering       → drain energy, decide movement direction
5.  physicsStep          → move creatures, bounce off walls, find collisions
6.  resolveAbsorptions   → process collisions → trait blending
7.  eatFood              → process food contacts
8.  reproduce            → spawn offspring
9.  remove dead/absorbed → splice out from array
10. add offspring        → push to array
11. remove eaten food    → compact food array in-place
12. increment tick
13. check phase          → set to 'paused' at tick 500/1000, 'finished' at 1500 or ≤1 creature
```

The order matters — steering decisions use pre-movement positions, physics moves and then detects collisions, absorptions are resolved before removals so the array indices are still valid.

---

## 9. Procedural Sprites (`src/spriteGen.ts`)

At startup, generates 12 unique grayscale creature textures in memory (no files needed). Each texture is 64×64 pixels built on a 16×16 logical grid scaled 4×.

**Process per shape:**
1. A random elliptical body envelope is generated (varying width, height, vertical bias)
2. Each grid cell inside the envelope has a probability of being "filled" based on distance from center
3. Optional appendages are added: legs (bottom edge protrusions) and/or horns (top edge protrusions)
4. Isolated pixels (no orthogonal neighbors) are removed for cleaner shapes
5. Edge pixels are drawn darker than interior pixels to create a subtle outline
6. The grid is **bilaterally symmetric** — the left half mirrors the right, so shapes look like organisms

The textures are white/light grey, designed to be tinted at render time by each creature's `hue`.

Custom art can replace these: drop `creature_<name>.png` files in `src/sprites/` and they're auto-loaded via Vite's file glob.

---

## 10. Rendering (`src/main.ts` — `drawFrame`)

Runs every frame via PixiJS's ticker. Two layers:

**Layer 1 — Graphics (jar + food):**
A single PixiJS `Graphics` object is cleared and redrawn every frame. Draws the circular jar border (grey outline) and all food dots (small green circles). Graphics is fine for these because there aren't many food items and they're simple shapes.

**Layer 2 — Sprite pool (creatures):**
An array of PixiJS `Sprite` objects. The pool grows as needed but never shrinks. Each frame:
- Sprites at indices `0..creatures.length-1` are made visible and positioned to match the creature at that array index
- Sprites beyond `creatures.length` are hidden (`.visible = false`)
- Each sprite's texture is set to one of the 12 procedural shapes (by `creature.id % 12`)
- Each sprite's `tint` is set to the creature's `hslToHex(hue, 0.85, 0.60)`
- Each sprite's `scale` maps the 64px texture to the creature's current `size * 2` pixel diameter

This avoids creating and destroying PixiJS objects every frame, which would be slow.

---

## 11. UI Layer

Three async functions, each returning a `Promise` that resolves when the player takes an action. `main.ts` awaits them in sequence.

**`showConfigUI(sidebar, defaults, buttonLabel)`** (`src/ui/setupUI.ts`)
Renders 3 HTML range sliders into the sidebar. Resolves with a `SimConfig` object when the button is clicked. Reused for both the initial setup screen and the mid-simulation pause.

**`runSimUI(app, state, sidebar, drawFrame)`** (`src/ui/simUI.ts`)
Attaches a PixiJS ticker that calls `stepSimulation` + `drawFrame` each frame. Monitors `state.phase`:
- If `'paused'`: stops the ticker, shows sliders again (via `showConfigUI`), re-enables hover tooltip, resumes when player confirms
- If `'finished'`: destroys the ticker and resolves the promise

**`showSelectUI(gameContainer, sidebar, survivors)`** (`src/ui/selectUI.ts`)
Overlays an HTML div on top of the canvas showing each survivor as a colored circle sized relative to the largest survivor. Click a circle to see its stats in the sidebar. "Confirm Champion" or "Run Again" both resolve the promise (Run Again skips without selecting).

**`enableHoverTooltip(canvas, state)`** (`src/ui/tooltip.ts`)
Active only during mid-simulation pauses. Listens for `mousemove` on the canvas, converts CSS pixel coordinates to game coordinates, finds the creature under the cursor by radius check, and shows a floating tooltip with its stats. Returns a cleanup function that removes the listeners and tooltip element.

---

## How It All Connects

```
main.ts
  ├── init(): create PixiJS app, generate textures, build sprite pool
  └── runGame() loop:
        await showConfigUI()       → player sets sliders → SimConfig
        initSimulation(config)     → creates SimState with 80 creatures
        await runSimUI(app, state) → ticks simulation, draws frames
          └── each tick: stepSimulation(state)
                ├── food.ts:        spawnFood
                ├── creature.ts:    updateSteering
                ├── physics.ts:     physicsStep → CollisionPairs
                ├── creature.ts:    resolveAbsorptions, eatFood, reproduce
                └── simulation.ts:  remove dead, add offspring, check phase
        await showSelectUI(survivors) → player picks champion
        → loop back to showConfigUI
```
