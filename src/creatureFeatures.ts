import type { CreatureFeatureId } from './types'

export interface FeatureGameplay {
  speedMultiplier: number
  energyDrainMultiplier: number
  absorptionAttackMultiplier: number
  absorptionDefenseMultiplier: number
  growthMultiplier: number
  contactDamage: number
  collisionChaos: number
  poisonRadius: number
  poisonDamage: number
  burstChance: number
  burstMultiplier: number
  contactRangeBonus: number
  steerMultiplier: number
  fleeMultiplier: number
  wanderMultiplier: number
}

export interface FeatureVisualContext {
  ctx: CanvasRenderingContext2D
  spriteSize: number
  bodyCx: number
  bodyCy: number
  bodyRx: number
  bodyRy: number
}

export interface FeatureDefinition {
  id: CreatureFeatureId
  label: string
  summary: string
  gameplay: FeatureGameplay
  drawAccent: (visual: FeatureVisualContext) => void
}

const DEFAULT_GAMEPLAY: FeatureGameplay = {
  speedMultiplier: 1,
  energyDrainMultiplier: 1,
  absorptionAttackMultiplier: 1,
  absorptionDefenseMultiplier: 1,
  growthMultiplier: 1,
  contactDamage: 0,
  collisionChaos: 0,
  poisonRadius: 0,
  poisonDamage: 0,
  burstChance: 0,
  burstMultiplier: 1,
  contactRangeBonus: 0,
  steerMultiplier: 1,
  fleeMultiplier: 1,
  wanderMultiplier: 1,
}

export const FEATURE_DEFINITIONS: Record<CreatureFeatureId, FeatureDefinition> = {
  spikes: {
    id: 'spikes',
    label: 'Spikes / Thorns',
    summary: 'Damages on contact and resists absorption, but drags and causes messy collisions.',
    gameplay: {
      ...DEFAULT_GAMEPLAY,
      speedMultiplier: 0.88,
      energyDrainMultiplier: 1.04,
      absorptionDefenseMultiplier: 1.12,
      contactDamage: 7,
      collisionChaos: 0.18,
      wanderMultiplier: 1.12,
    },
    drawAccent: drawSpikes,
  },
  shell: {
    id: 'shell',
    label: 'Shell / Carapace',
    summary: 'Durable and hard to absorb, but slower and slower to grow.',
    gameplay: {
      ...DEFAULT_GAMEPLAY,
      speedMultiplier: 0.78,
      absorptionDefenseMultiplier: 1.18,
      growthMultiplier: 0.75,
      steerMultiplier: 0.88,
      fleeMultiplier: 0.88,
    },
    drawAccent: drawShell,
  },
  fins: {
    id: 'fins',
    label: 'Fins / Streamlined Body',
    summary: 'Fast and smooth, but easier to overpower once caught.',
    gameplay: {
      ...DEFAULT_GAMEPLAY,
      speedMultiplier: 1.28,
      absorptionDefenseMultiplier: 0.88,
      steerMultiplier: 1.12,
      fleeMultiplier: 1.10,
      wanderMultiplier: 0.72,
    },
    drawAccent: drawFins,
  },
  poisonSac: {
    id: 'poisonSac',
    label: 'Poison Sacs / Toxic Surface',
    summary: 'Damages nearby creatures and discourages attacks, but slows growth and drains itself.',
    gameplay: {
      ...DEFAULT_GAMEPLAY,
      speedMultiplier: 0.92,
      growthMultiplier: 0.80,
      poisonRadius: 22,
      poisonDamage: 0.22,
      energyDrainMultiplier: 1.10,
      absorptionDefenseMultiplier: 1.04,
    },
    drawAccent: drawPoisonSac,
  },
  thrusters: {
    id: 'thrusters',
    label: 'Jet Nozzles / Thrusters',
    summary: 'Can burst forward quickly, but wastes energy and loses control.',
    gameplay: {
      ...DEFAULT_GAMEPLAY,
      speedMultiplier: 0.96,
      energyDrainMultiplier: 1.12,
      burstChance: 0.10,
      burstMultiplier: 1.95,
      steerMultiplier: 0.84,
      fleeMultiplier: 1.18,
      wanderMultiplier: 1.70,
      collisionChaos: 0.10,
    },
    drawAccent: drawThrusters,
  },
  tentacles: {
    id: 'tentacles',
    label: 'Tentacles / Graspers',
    summary: 'Long contact reach and easier grabs, but vulnerable and less clean to maneuver.',
    gameplay: {
      ...DEFAULT_GAMEPLAY,
      speedMultiplier: 0.92,
      absorptionAttackMultiplier: 1.12,
      absorptionDefenseMultiplier: 0.93,
      contactRangeBonus: 6,
      steerMultiplier: 0.88,
      wanderMultiplier: 1.08,
    },
    drawAccent: drawTentacles,
  },
  denseCore: {
    id: 'denseCore',
    label: 'Dense Core / Heavy Center',
    summary: 'Hits hard and resists being overpowered, but accelerates sluggishly.',
    gameplay: {
      ...DEFAULT_GAMEPLAY,
      speedMultiplier: 0.82,
      absorptionAttackMultiplier: 1.10,
      absorptionDefenseMultiplier: 1.12,
      contactDamage: 3,
      steerMultiplier: 0.74,
      fleeMultiplier: 0.80,
      wanderMultiplier: 0.82,
    },
    drawAccent: drawDenseCore,
  },
  frills: {
    id: 'frills',
    label: 'Frills / Drag Surfaces',
    summary: 'Turns cleanly and moves stably, but gives up top speed and catches more contact.',
    gameplay: {
      ...DEFAULT_GAMEPLAY,
      speedMultiplier: 0.88,
      absorptionDefenseMultiplier: 0.97,
      contactRangeBonus: 2,
      steerMultiplier: 1.18,
      fleeMultiplier: 1.08,
      wanderMultiplier: 0.68,
    },
    drawAccent: drawFrills,
  },
}

export const FEATURE_IDS = Object.keys(FEATURE_DEFINITIONS) as CreatureFeatureId[]

export function getFeatureDefinition(id: CreatureFeatureId): FeatureDefinition {
  return FEATURE_DEFINITIONS[id]
}

function drawSpikes({ ctx, bodyCx, bodyCy, bodyRx, bodyRy }: FeatureVisualContext): void {
  for (let i = 0; i < 6; i++) {
    const t = (i / 5) * Math.PI
    const x = bodyCx - bodyRx + (i / 5) * bodyRx * 2
    const y = bodyCy - Math.sin(t) * bodyRy - 8
    drawTriangle(ctx, x - 7, y + 16, x + 7, y + 16, x, y - 10)
  }
}

function drawShell({ ctx, bodyCx, bodyCy, bodyRx, bodyRy }: FeatureVisualContext): void {
  ctx.beginPath()
  ctx.ellipse(bodyCx, bodyCy + bodyRy * 0.12, bodyRx * 1.02, bodyRy * 0.88, 0, Math.PI, 0, true)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.72)'
  ctx.lineWidth = 3
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(bodyCx + i * bodyRx * 0.22, bodyCy - bodyRy * 0.64)
    ctx.lineTo(bodyCx + i * bodyRx * 0.14, bodyCy + bodyRy * 0.52)
    ctx.stroke()
  }
}

function drawFins({ ctx, bodyCx, bodyCy, bodyRx, bodyRy }: FeatureVisualContext): void {
  drawTriangle(ctx, bodyCx - bodyRx * 1.20, bodyCy, bodyCx - bodyRx * 0.42, bodyCy - bodyRy * 0.95, bodyCx - bodyRx * 0.56, bodyCy + bodyRy * 0.72)
  drawTriangle(ctx, bodyCx + bodyRx * 1.20, bodyCy, bodyCx + bodyRx * 0.42, bodyCy - bodyRy * 0.95, bodyCx + bodyRx * 0.56, bodyCy + bodyRy * 0.72)
}

function drawPoisonSac({ ctx, bodyCx, bodyCy, bodyRx, bodyRy }: FeatureVisualContext): void {
  drawCircle(ctx, bodyCx + bodyRx * 0.72, bodyCy + bodyRy * 0.42, 13)
  drawCircle(ctx, bodyCx - bodyRx * 0.55, bodyCy + bodyRy * 0.48, 10)
  drawCircle(ctx, bodyCx + bodyRx * 0.12, bodyCy - bodyRy * 0.60, 8)
}

function drawThrusters({ ctx, bodyCx, bodyCy, bodyRx, bodyRy }: FeatureVisualContext): void {
  drawThrusterPod(ctx, bodyCx - bodyRx * 0.50, bodyCy + bodyRy * 0.88)
  drawThrusterPod(ctx, bodyCx, bodyCy + bodyRy * 1.00)
  drawThrusterPod(ctx, bodyCx + bodyRx * 0.50, bodyCy + bodyRy * 0.88)
}

function drawTentacles({ ctx, bodyCx, bodyCy, bodyRx, bodyRy }: FeatureVisualContext): void {
  ctx.lineCap = 'round'
  ctx.lineWidth = 6
  for (let i = 0; i < 4; i++) {
    const startX = bodyCx - bodyRx * 0.42 + i * bodyRx * 0.28
    ctx.beginPath()
    ctx.moveTo(startX, bodyCy + bodyRy * 0.62)
    ctx.bezierCurveTo(
      startX - 5,
      bodyCy + bodyRy * 1.05,
      startX + (i % 2 === 0 ? -12 : 12),
      bodyCy + bodyRy * 1.36,
      startX + (i % 2 === 0 ? -6 : 6),
      bodyCy + bodyRy * 1.60,
    )
    ctx.stroke()
  }
}

function drawDenseCore({ ctx, bodyCx, bodyCy }: FeatureVisualContext): void {
  drawCircle(ctx, bodyCx, bodyCy + 4, 18)
  ctx.strokeStyle = 'rgba(255,255,255,0.72)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(bodyCx, bodyCy + 4, 25, 0, Math.PI * 2)
  ctx.stroke()
}

function drawFrills({ ctx, bodyCx, bodyCy, bodyRx, bodyRy }: FeatureVisualContext): void {
  for (let i = 0; i < 6; i++) {
    const x = bodyCx - bodyRx * 0.90 + i * bodyRx * 0.36
    const y = bodyCy - bodyRy * 0.95
    drawTriangle(ctx, x - 8, y + 14, x + 8, y + 14, x, y - 9)
  }
}

function drawTriangle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): void {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x3, y3)
  ctx.closePath()
  ctx.fill()
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawThrusterPod(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath()
  ctx.roundRect(x - 7, y - 6, 14, 12, 5)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x - 5, y + 6)
  ctx.lineTo(x, y + 18)
  ctx.lineTo(x + 5, y + 6)
  ctx.closePath()
  ctx.fill()
}
