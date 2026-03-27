import type { Food, SimConfig } from '../types'
import type { RNG } from '../rng'
import { FOOD_ENERGY, FOOD_SPAWN_RATE, JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS } from '../config'

export function spawnFood(food: Food[], config: SimConfig, rng: RNG): void {
  // foodAbundance=5 is "default" — base rate * (abundance/5) food items per tick
  const rate = FOOD_SPAWN_RATE * (config.foodAbundance / 5)
  const whole = Math.floor(rate)
  const count = whole + (rng() < (rate - whole) ? 1 : 0)

  for (let i = 0; i < count; i++) {
    // Uniform distribution inside the circle
    const angle = rng() * Math.PI * 2
    const r = Math.sqrt(rng()) * (JAR_RADIUS - 12)
    food.push({
      x: JAR_CENTER_X + Math.cos(angle) * r,
      y: JAR_CENTER_Y + Math.sin(angle) * r,
      energy: FOOD_ENERGY,
    })
  }
}
