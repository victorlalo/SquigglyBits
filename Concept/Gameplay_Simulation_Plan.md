# Gameplay & Simulation Design

## The Core Loop

The simulation starts from a shared daily seed, so every player gets the same jar, starting creatures, and baseline rules. Before the run begins, the player makes a small number of indirect environmental adjustments. The simulation then plays out automatically as creatures move around the jar, collide, compete, absorb weaker creatures, grow, and inherit some traits from what they consume. During the run, the player gets a limited number of opportunities to make additional environmental tweaks, but never directly controls the creatures themselves. By the end of the simulation, the jar has produced a set of survivors shaped by both the starting conditions and the player's tuning choices, and the player selects one final creature as their champion.

## The Three Phases

### Phase 1: Setup
The player sees the empty jar and a small set of environmental sliders. They tune conditions before anything begins. This is their primary strategic decision — they have the most control here and the least information.

### Phase 2: Simulate
The simulation runs automatically. Creatures swarm, eat, chase, flee, absorb, and reproduce. The player can only watch — except at two fixed intervention points (tick 500 and tick 1000), where the simulation briefly pauses and the player can re-adjust sliders. This models the fantasy of being an ecosystem manager rather than a creature pilot.

### Phase 3: Select
When the simulation ends, the player reviews surviving creatures and selects one as their champion. They can inspect each creature's stats: how big it grew, how many creatures it absorbed, how many generations it represents, its current speed and perception. The champion is then submitted to compete against other players' champions.

## Indirect Control — Why It Matters

Players never touch a creature directly. All influence is environmental:
- **Food Abundance** — more food means more reproduction and less aggressive absorption; sparse food drives predatory behavior
- **Speed Modifier** — a faster world rewards agile hunters; a slow world rewards bulk and efficiency
- **Mutation Rate** — high mutation creates volatile, unpredictable populations; low mutation preserves whatever traits dominate early

The same slider values will produce different outcomes on different runs because the interactions are emergent. This is intentional — the game rewards intuition and pattern recognition over optimal strategy.

## Creature Behavior

Creatures have no player input. They follow simple rules that produce complex group behavior:

- **Seek** the nearest food within perception range
- **Chase** smaller creatures within perception range (if smaller by ≥ 8%)
- **Flee** from larger creatures within perception range
- **Wander** randomly when nothing is in range
- **Bounce** off the circular jar wall

### Absorption
When a larger creature contacts a smaller one, it absorbs it:
- The smaller creature is removed
- The absorber gains a portion of its energy
- The absorber grows (area-based mass addition)
- Traits blend slightly toward the absorbed creature's values
- The absorber's hue shifts toward the prey's hue — creating visible lineage

This means a dominant creature carries the genetic history of everything it has consumed. Its color and traits are a composite of its prey.

### Reproduction
When a creature accumulates enough energy, it splits asexually. The parent and child each receive half the energy. The child's traits are slightly mutated from the parent's. Children start at 75% of parent size and inherit the parent's sprite art. Reproduction is capped at 2000 total creatures to prevent runaway population explosions.

### Death
Creatures drain energy each tick. Larger and faster creatures drain more. A creature that cannot find food or absorb others will slowly starve and die. Energy reaches zero → creature is removed.

## Champion Selection

At simulation end, surviving creatures are displayed. The player inspects them and selects one. The selection criteria are entirely up to the player — they may prefer the largest creature, the one with the most absorptions, the highest generation, or simply the one with the most interesting trait combination. The selected creature becomes their champion for that day's seed.

## Future: Champion vs Champion Combat

Champions from the same daily seed compete asynchronously after submission. The combat system is not yet designed, but the stats accumulated during the simulation (size, speed, perception, absorptions, generation) will feed into it. The goal is that a champion shaped by aggressive, absorption-heavy play will feel different to compete with than one shaped by a food-abundant, high-reproduction run.
