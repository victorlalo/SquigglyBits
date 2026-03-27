// Jar
export const JAR_RADIUS = 280
export const JAR_CENTER_X = 300
export const JAR_CENTER_Y = 300

// Simulation timing
export const MAX_TICKS = 1500
export const TWEAK_TICKS: ReadonlySet<number> = new Set([500, 1000])
export const STEPS_PER_FRAME = 2   // simulation ticks per rendered frame (increase to speed up)

// Starting population
export const STARTING_CREATURE_COUNT = 80
export const CREATURE_CAP = 2000

// Creature starting ranges
export const CREATURE_SIZE_MIN = 4
export const CREATURE_SIZE_MAX = 8
export const CREATURE_SPEED_MIN = 1.5
export const CREATURE_SPEED_MAX = 3.0
export const CREATURE_START_ENERGY = 80
export const CREATURE_MAX_ENERGY = 200
export const CREATURE_PERCEPTION_BASE = 80

// Energy economy
export const ENERGY_DRAIN_BASE = 0.08        // per tick baseline
export const ENERGY_DRAIN_PER_SIZE = 0.012   // extra drain per pixel of radius
export const ENERGY_DRAIN_PER_SPEED = 0.018  // extra drain per unit of speed

// Reproduction
export const REPRODUCTION_THRESHOLD = 160
export const REPRODUCTION_MUTATION = 0.12    // base stat variance on split

// Food
export const FOOD_ENERGY = 25
export const FOOD_SPAWN_RATE = 0.3           // food items per tick at abundance=5

// Absorption
export const ABSORPTION_MIN_RATIO = 1.08    // absorber must be this much larger
export const ABSORPTION_ENERGY_GAIN = 0.70  // fraction of prey energy absorbed
export const ABSORPTION_MASS_GAIN = 0.25    // fraction of prey mass added to absorber
export const ABSORPTION_HUE_BLEND = 0.15    // hue shift toward prey on absorption
export const ABSORPTION_TRAIT_BLEND = 0.20  // trait shift toward prey on absorption

// AI steering
export const WANDER_STRENGTH = 0.15
export const STEER_STRENGTH = 0.28
export const FLEE_STRENGTH = 0.35
