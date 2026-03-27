import { Texture } from 'pixi.js'
import { getFeatureDefinition } from './creatureFeatures'
import type { Creature, CreatureBodyArchetype, CreatureFeatureId, CreatureVisualGenome } from './types'

export const SPRITE_SIZE = 96

export interface CreatureSpriteSet {
  bodyCanvas: HTMLCanvasElement
  accentCanvas: HTMLCanvasElement
  eyeCanvas: HTMLCanvasElement
  bodyTexture: Texture
  accentTexture: Texture
  eyeTexture: Texture
}

interface EyeSpec {
  x: number
  y: number
  scale: number
}

interface ShapeMetrics {
  cx: number
  cy: number
  rx: number
  ry: number
  contour: Array<{ x: number, y: number }>
}

interface ArchetypeSpec {
  headY: number
  tailY: number
  spineCurve: number
  spineCurveFreq: number
  spineTaperBias: number
  widthNoise: number
  sideNoise: number
  profile: Array<[number, number]>
}

export function createRandomVisualGenome(rng: () => number): CreatureVisualGenome {
  const archetypes: CreatureBodyArchetype[] = ['round', 'pear', 'elongated', 'tadpole']
  return {
    bodyArchetype: archetypes[Math.floor(rng() * archetypes.length)],
    shapeSeed: Math.floor(rng() * 0x7fffffff),
    eyeSeed: Math.floor(rng() * 0x7fffffff),
    eyeOffsetX: (rng() - 0.5) * 0.18,
    eyeOffsetY: (rng() - 0.5) * 0.16,
    eyeScale: 0.82 + rng() * 0.52,
    accentHueOffset: (rng() < 0.5 ? -1 : 1) * (80 + rng() * 120),
  }
}

export function inheritVisualGenome(
  parent: CreatureVisualGenome,
  rng: () => number,
  mutationRate: number,
): CreatureVisualGenome {
  const mutate = (value: number, spread: number) => value + (rng() - 0.5) * spread * (0.4 + mutationRate)
  return {
    bodyArchetype: rng() < 0.12 * mutationRate
      ? randomArchetype(rng)
      : parent.bodyArchetype,
    shapeSeed: rng() < 0.35 * mutationRate ? Math.floor(rng() * 0x7fffffff) : parent.shapeSeed,
    eyeSeed: rng() < 0.35 * mutationRate ? Math.floor(rng() * 0x7fffffff) : parent.eyeSeed,
    eyeOffsetX: clamp(mutate(parent.eyeOffsetX, 0.12), -0.22, 0.22),
    eyeOffsetY: clamp(mutate(parent.eyeOffsetY, 0.12), -0.18, 0.18),
    eyeScale: clamp(mutate(parent.eyeScale, 0.35), 0.62, 1.50),
    accentHueOffset: mutate(parent.accentHueOffset, 70),
  }
}

export function getCreatureVisualKey(creature: Creature): string {
  const visual = creature.visual
  return [
    creature.featureId,
    visual.bodyArchetype,
    visual.shapeSeed,
    visual.eyeSeed,
    round2(visual.eyeOffsetX),
    round2(visual.eyeOffsetY),
    round2(visual.eyeScale),
    round2(visual.accentHueOffset),
  ].join(':')
}

export function buildCreatureSpriteSet(creature: Creature): CreatureSpriteSet {
  const bodyCanvas = document.createElement('canvas')
  const accentCanvas = document.createElement('canvas')
  const eyeCanvas = document.createElement('canvas')

  for (const canvas of [bodyCanvas, accentCanvas, eyeCanvas]) {
    canvas.width = SPRITE_SIZE
    canvas.height = SPRITE_SIZE
  }

  const shape = buildShapeMetrics(creature.visual)
  drawBody(bodyCanvas.getContext('2d')!, creature.visual, shape)
  drawAccent(accentCanvas.getContext('2d')!, creature.featureId, shape)
  drawEyes(eyeCanvas.getContext('2d')!, creature.visual, shape)

  return {
    bodyCanvas,
    accentCanvas,
    eyeCanvas,
    bodyTexture: Texture.from(bodyCanvas),
    accentTexture: Texture.from(accentCanvas),
    eyeTexture: Texture.from(eyeCanvas),
  }
}

// ─── Shape generation ────────────────────────────────────────────────────────

// Spine-based silhouette: each profile is [t_along_spine, half_width_fraction].
// The archetypes diverge in body length, bend, asymmetry, and width progression.
const ARCHETYPE_SPECS: Record<CreatureBodyArchetype, ArchetypeSpec> = {
  round: {
    headY: 0.18,
    tailY: 0.84,
    spineCurve: 0.020,
    spineCurveFreq: 1.1,
    spineTaperBias: 0.35,
    widthNoise: 0.018,
    sideNoise: 0.030,
    profile: [[0, 0.050], [0.10, 0.16], [0.26, 0.25], [0.48, 0.28], [0.66, 0.27], [0.82, 0.17], [1, 0.050]],
  },
  pear: {
    headY: 0.12,
    tailY: 0.92,
    spineCurve: 0.016,
    spineCurveFreq: 0.9,
    spineTaperBias: 0.55,
    widthNoise: 0.020,
    sideNoise: 0.024,
    profile: [[0, 0.022], [0.10, 0.07], [0.22, 0.11], [0.40, 0.18], [0.58, 0.28], [0.74, 0.31], [0.90, 0.19], [1, 0.055]],
  },
  elongated: {
    headY: 0.08,
    tailY: 0.94,
    spineCurve: 0.038,
    spineCurveFreq: 1.4,
    spineTaperBias: 0.18,
    widthNoise: 0.014,
    sideNoise: 0.020,
    profile: [[0, 0.030], [0.10, 0.09], [0.24, 0.14], [0.42, 0.15], [0.60, 0.14], [0.76, 0.12], [0.90, 0.08], [1, 0.018]],
  },
  tadpole: {
    headY: 0.10,
    tailY: 0.97,
    spineCurve: 0.012,
    spineCurveFreq: 0.8,
    spineTaperBias: 0.82,
    widthNoise: 0.024,
    sideNoise: 0.028,
    profile: [[0, 0.060], [0.08, 0.22], [0.18, 0.26], [0.30, 0.21], [0.44, 0.12], [0.58, 0.07], [0.74, 0.04], [0.88, 0.022], [1, 0.010]],
  },
}

function buildShapeMetrics(visual: CreatureVisualGenome): ShapeMetrics {
  const rand = makeRand(visual.shapeSeed)
  const S = SPRITE_SIZE
  const cx = S * 0.50
  const spec = ARCHETYPE_SPECS[visual.bodyArchetype]
  const headY = S * spec.headY
  const tailY = S * spec.tailY
  const spineLen = tailY - headY
  const rightPts: Array<{ x: number; y: number }> = []
  const leftPts: Array<{ x: number; y: number }> = []
  const curvePhase = rand() * Math.PI * 2
  const asymmetry = (rand() - 0.5) * 0.16

  for (const [t, baseHalfWidth] of spec.profile) {
    const y = headY + t * spineLen
    const taperWeight = Math.pow(t, spec.spineTaperBias)
    const spineBend = Math.sin(t * Math.PI * spec.spineCurveFreq + curvePhase) * spec.spineCurve * S * (0.35 + taperWeight)
    const spineCenterX = cx + spineBend + (rand() - 0.5) * 0.010 * S

    const widthNoise = (rand() - 0.5) * spec.widthNoise * S
    const halfW = Math.max(0.010 * S, baseHalfWidth * S + widthNoise)
    const leftScale = 1 + asymmetry * (0.30 + t * 0.70)
    const rightScale = 1 - asymmetry * (0.30 + (1 - t) * 0.70)
    const noiseL = (rand() - 0.5) * spec.sideNoise * S
    const noiseR = (rand() - 0.5) * spec.sideNoise * S

    leftPts.push({ x: spineCenterX - halfW * leftScale + noiseL, y })
    rightPts.push({ x: spineCenterX + halfW * rightScale + noiseR, y })
  }

  const headTip = {
    x: cx + Math.sin(curvePhase) * spec.spineCurve * S * 0.45 + (rand() - 0.5) * 0.010 * S,
    y: headY - (0.010 + spec.profile[0][1] * 0.15) * S,
  }
  const tailTip = {
    x: cx + Math.sin(Math.PI * spec.spineCurveFreq + curvePhase) * spec.spineCurve * S * 0.75 + (rand() - 0.5) * 0.012 * S,
    y: tailY + (0.012 + (1 - spec.profile[spec.profile.length - 1][1]) * 0.004) * S,
  }

  // Contour: head tip → right side (head→tail) → tail tip → left side (tail→head)
  const contour = [headTip, ...rightPts, tailTip, ...leftPts.reverse()]

  // rx/ry are relative to canvas center for accent-feature positioning
  const canvasCy = S * 0.50
  let maxDx = 0
  let maxDy = 0
  for (const p of contour) {
    maxDx = Math.max(maxDx, Math.abs(p.x - cx))
    maxDy = Math.max(maxDy, Math.abs(p.y - canvasCy))
  }

  return { cx, cy: canvasCy, rx: maxDx, ry: maxDy, contour }
}

// ─── Body drawing ─────────────────────────────────────────────────────────────

function drawBody(ctx: CanvasRenderingContext2D, _visual: CreatureVisualGenome, shape: ShapeMetrics): void {
  const S = SPRITE_SIZE
  const bodyPath = catmullRomPath(shape.contour)

  // Base grayscale fill — PixiJS tint provides the color
  ctx.fillStyle = '#d8d8d8'
  ctx.fill(bodyPath)

  // Top-lit directional gradient: brighter near head (top), darker toward tail
  const lit = ctx.createLinearGradient(shape.cx, S * 0.08, shape.cx, S * 0.94)
  lit.addColorStop(0,    'rgba(255,255,255,0.32)')
  lit.addColorStop(0.28, 'rgba(255,255,255,0.10)')
  lit.addColorStop(0.60, 'rgba(0,0,0,0.03)')
  lit.addColorStop(1,    'rgba(0,0,0,0.24)')
  ctx.fillStyle = lit
  ctx.fill(bodyPath)

  // Small specular highlight near the top of the head
  const specY = S * 0.21
  const spec = ctx.createRadialGradient(shape.cx, specY, 0, shape.cx, specY, S * 0.11)
  spec.addColorStop(0, 'rgba(255,255,255,0.26)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec
  ctx.fill(bodyPath)

  // Thin outline
  ctx.strokeStyle = 'rgba(35,35,35,0.30)'
  ctx.lineWidth = 1.5
  ctx.stroke(bodyPath)

  const cheekY = S * 0.40
  drawCheek(ctx, shape.cx - shape.rx * 0.36, cheekY)
  drawCheek(ctx, shape.cx + shape.rx * 0.36, cheekY)
}

// ─── Accent drawing ───────────────────────────────────────────────────────────

function drawAccent(ctx: CanvasRenderingContext2D, featureId: CreatureFeatureId, shape: ShapeMetrics): void {
  ctx.fillStyle = '#d0d0d0'
  ctx.strokeStyle = '#d0d0d0'
  ctx.lineWidth = 4
  getFeatureDefinition(featureId).drawAccent({
    ctx,
    spriteSize: SPRITE_SIZE,
    bodyCx: shape.cx,
    bodyCy: shape.cy,
    bodyRx: shape.rx,
    bodyRy: shape.ry,
  })
}

// ─── Eye drawing ──────────────────────────────────────────────────────────────

function drawEyes(ctx: CanvasRenderingContext2D, visual: CreatureVisualGenome, shape: ShapeMetrics): void {
  for (const eye of buildEyes(visual, shape)) {
    const cx = SPRITE_SIZE * eye.x
    const cy = SPRITE_SIZE * eye.y
    const scleraRx = SPRITE_SIZE * 0.145 * eye.scale
    const scleraRy = SPRITE_SIZE * 0.128 * eye.scale
    const pupilR   = SPRITE_SIZE * 0.065 * eye.scale

    // Sclera
    ctx.fillStyle = 'rgba(255,255,255,0.99)'
    ctx.beginPath()
    ctx.ellipse(cx, cy, scleraRx, scleraRy, 0, 0, Math.PI * 2)
    ctx.fill()

    // Sclera rim
    ctx.strokeStyle = 'rgba(40,40,40,0.16)'
    ctx.lineWidth = 1.2
    ctx.stroke()

    // Pupil
    ctx.fillStyle = '#060606'
    ctx.beginPath()
    ctx.arc(cx, cy + pupilR * 0.08, pupilR, 0, Math.PI * 2)
    ctx.fill()

    // Primary highlight — top-left
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.beginPath()
    ctx.arc(cx - pupilR * 0.30, cy - pupilR * 0.40, pupilR * 0.32, 0, Math.PI * 2)
    ctx.fill()

    // Secondary highlight — smaller, bottom-right for depth
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.beginPath()
    ctx.arc(cx + pupilR * 0.28, cy + pupilR * 0.30, pupilR * 0.14, 0, Math.PI * 2)
    ctx.fill()

    // Eyelid arch — gives the eye that slightly droopy "pet" look
    ctx.strokeStyle = 'rgba(25,25,25,0.28)'
    ctx.lineWidth = Math.max(1.2, eye.scale * 1.6)
    ctx.beginPath()
    ctx.arc(cx, cy + scleraRy + SPRITE_SIZE * 0.07, SPRITE_SIZE * 0.048 * eye.scale, 0.14 * Math.PI, 0.86 * Math.PI)
    ctx.stroke()
  }
}

function buildEyes(visual: CreatureVisualGenome, _shape: ShapeMetrics): EyeSpec[] {
  const baseX = 0.5 + visual.eyeOffsetX
  const baseY = 0.38 + visual.eyeOffsetY
  return [{
    x: clamp(baseX, 0.26, 0.74),
    y: clamp(baseY, 0.20, 0.62),
    scale: clamp(visual.eyeScale, 0.34, 1.50),
  }]
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

// Smooth closed path through points using Catmull-Rom → cubic bezier conversion
function catmullRomPath(pts: Array<{ x: number; y: number }>): Path2D {
  const path = new Path2D()
  const n = pts.length
  if (n < 2) return path
  path.moveTo(pts[0].x, pts[0].y)
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y)
  }
  path.closePath()
  return path
}

function drawCheek(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.10)'
  ctx.beginPath()
  ctx.arc(x, y, 6, 0, Math.PI * 2)
  ctx.fill()
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function randomArchetype(rng: () => number): CreatureBodyArchetype {
  const archetypes: CreatureBodyArchetype[] = ['round', 'pear', 'elongated', 'tadpole']
  return archetypes[Math.floor(rng() * archetypes.length)]
}

function makeRand(seed: number): () => number {
  let s = seed | 0
  return () => {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return ((s >>> 0) % 10000) / 10000
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): string {
  return value.toFixed(2)
}
