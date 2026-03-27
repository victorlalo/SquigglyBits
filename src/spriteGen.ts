import { Texture } from 'pixi.js'

const GRID_SIZE = 16   // logical pixel grid for shape generation
const PIXEL_SCALE = 16  // each logical pixel becomes 4x4 on the canvas
const SPRITE_SIZE = GRID_SIZE * PIXEL_SCALE  // 64px texture output

/**
 * Generate a set of unique grayscale creature textures.
 * Shapes are designed on a 16x16 grid then scaled 4x to 64x64
 * with bilateral symmetry — designed to be tinted at render time.
 */
export function generateCreatureTextures(count: number, baseSeed: number): Texture[] {
  const textures: Texture[] = []

  for (let n = 0; n < count; n++) {
    let seed = (baseSeed + n * 7919) | 0
    function rand() {
      seed ^= seed << 13
      seed ^= seed >> 17
      seed ^= seed << 5
      return ((seed >>> 0) % 10000) / 10000
    }

    const canvas = document.createElement('canvas')
    canvas.width = SPRITE_SIZE
    canvas.height = SPRITE_SIZE
    const ctx = canvas.getContext('2d')!

    const half = GRID_SIZE / 2
    const filled: boolean[][] = Array.from(
      { length: GRID_SIZE }, () => Array(half).fill(false),
    )

    // Randomized body envelope
    const widthScale  = 0.45 + rand() * 0.55
    const heightScale = 0.55 + rand() * 0.45
    const density     = 0.55 + rand() * 0.35
    const yBias       = (rand() - 0.5) * 0.3

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < half; x++) {
        const ny = ((y + 0.5) / GRID_SIZE - 0.5 + yBias) * 2
        const nx = (x + 0.5) / half

        const dx = nx / widthScale
        const dy = ny / heightScale
        const d = dx * dx + dy * dy

        const prob = Math.max(0, 1 - d * 1.05) * density
        filled[y][x] = rand() < prob
      }
    }

    // Add possible appendages: antennae, legs, tail
    const appendageType = rand()
    if (appendageType < 0.5) {
      const legCount = 1 + Math.floor(rand() * 3)
      for (let leg = 0; leg < legCount; leg++) {
        const lx = Math.floor(rand() * (half - 1))
        const ly = GRID_SIZE - 1 - Math.floor(rand() * 3)
        if (ly >= 0 && ly < GRID_SIZE) filled[ly][lx] = true
        if (ly - 1 >= 0) filled[ly - 1][lx] = true
      }
    }
    if (appendageType > 0.3) {
      const hornCount = 1 + Math.floor(rand() * 2)
      for (let h = 0; h < hornCount; h++) {
        const hx = Math.floor(rand() * (half - 1))
        const hy = Math.floor(rand() * 3)
        filled[hy][hx] = true
        if (hy + 1 < GRID_SIZE) filled[hy + 1][hx] = true
      }
    }

    // Cleanup: remove isolated pixels (no orthogonal neighbors)
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < half; x++) {
        if (!filled[y][x]) continue
        let nbrs = 0
        if (y > 0 && filled[y - 1][x]) nbrs++
        if (y < GRID_SIZE - 1 && filled[y + 1][x]) nbrs++
        if (x > 0 && filled[y][x - 1]) nbrs++
        if (x < half - 1 && filled[y][x + 1]) nbrs++
        if (x === 0) nbrs++
        if (nbrs === 0) filled[y][x] = false
      }
    }

    // Draw grayscale at PIXEL_SCALE — each logical pixel → 4x4 block
    const ps = PIXEL_SCALE
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < half; x++) {
        if (!filled[y][x]) continue

        const isEdge =
          (y === 0              || !filled[y - 1][x]) ||
          (y === GRID_SIZE - 1  || !filled[y + 1][x]) ||
          (x === half - 1       || !filled[y][x + 1]) ||
          (x > 0                && !filled[y][x - 1])

        const b = isEdge
          ? 140 + Math.floor(rand() * 30)
          : 210 + Math.floor(rand() * 45)

        ctx.fillStyle = `rgb(${b},${b},${b})`
        // Right half
        ctx.fillRect((half + x) * ps, y * ps, ps, ps)
        // Left half (mirror)
        ctx.fillRect((half - 1 - x) * ps, y * ps, ps, ps)
      }
    }

    textures.push(Texture.from(canvas))
  }

  return textures
}

export { SPRITE_SIZE }
