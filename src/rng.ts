export type RNG = () => number

// Mulberry32 — fast, seedable, good distribution
export function createRNG(seed: number): RNG {
  let s = seed >>> 0
  return () => {
    s += 0x6D2B79F5
    let z = s
    z = Math.imul(z ^ (z >>> 15), z | 1)
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
    return ((z ^ (z >>> 14)) >>> 0) / 0x100000000
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xFFFFFFFF) >>> 0
}
