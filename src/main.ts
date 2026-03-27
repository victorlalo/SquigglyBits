import { Application, Graphics, Sprite, Container } from 'pixi.js'
import { initSimulation } from './sim/simulation'
import { getSpriteManifest } from './assets'
import { randomSeed } from './rng'
import { hslToHex } from './utils'
import { JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS } from './config'
import { showConfigUI } from './ui/setupUI'
import { runSimUI } from './ui/simUI'
import { showSelectUI } from './ui/selectUI'
import { buildCreatureSpriteSet, getCreatureVisualKey, SPRITE_SIZE } from './spriteGen'
import type { Creature, SimConfig, SimState } from './types'

const DEFAULT_CONFIG: SimConfig = {
  foodAbundance: 5,
  speedModifier: 1.0,
  mutationRate: 0.3,
}

// Multiply-tint a grayscale canvas and composite onto ctx at the given size.
// Equivalent to PixiJS sprite tinting: white areas take the full tint color.
function drawTinted(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, tintColor: string, size: number): void {
  const off = document.createElement('canvas')
  off.width = size; off.height = size
  const offCtx = off.getContext('2d')!
  offCtx.drawImage(src, 0, 0, size, size)
  offCtx.globalCompositeOperation = 'multiply'
  offCtx.fillStyle = tintColor
  offCtx.fillRect(0, 0, size, size)
  offCtx.globalCompositeOperation = 'destination-in'
  offCtx.drawImage(src, 0, 0, size, size)
  ctx.drawImage(off, 0, 0)
}

async function init() {
  const app = new Application()
  await app.init({
    width: 600,
    height: 600,
    backgroundColor: 0x111111,
    antialias: true,
  })

  const gameContainer = document.getElementById('game-container')!
  const sidebar       = document.getElementById('sidebar')!
  gameContainer.appendChild(app.canvas)

  const { keys: spriteKeys } = getSpriteManifest()
  const creatureVisualCache = new Map<string, ReturnType<typeof buildCreatureSpriteSet>>()

  function getCreatureSpriteSetCached(creature: Creature) {
    const key = getCreatureVisualKey(creature)
    let cached = creatureVisualCache.get(key)
    if (!cached) {
      cached = buildCreatureSpriteSet(creature)
      creatureVisualCache.set(key, cached)
    }
    return cached
  }

  // Renders a creature onto an arbitrary HTMLCanvasElement using Canvas2D tinting.
  // Used by the select screen, which runs outside the PixiJS context.
  function renderCreatureToCanvas(target: HTMLCanvasElement, c: Creature): void {
    const size = target.width
    const ctx  = target.getContext('2d')!
    const spriteSet = getCreatureSpriteSetCached(c)
    ctx.clearRect(0, 0, size, size)
    drawTinted(
      ctx,
      spriteSet.accentCanvas,
      `hsl(${(c.hue + c.visual.accentHueOffset + 360) % 360}, 92%, 64%)`,
      size,
    )
    drawTinted(ctx, spriteSet.bodyCanvas, `hsl(${c.hue}, 85%, 60%)`, size)
    ctx.drawImage(spriteSet.eyeCanvas, 0, 0, size, size)
  }

  // Graphics layer for jar border + food
  const g = new Graphics()
  app.stage.addChild(g)

  // Sprite container for creatures (rendered on top of Graphics)
  const creatureContainer = new Container()
  app.stage.addChild(creatureContainer)

  // Sprite pool — reuse by index, toggle visibility. No create/destroy per frame.
  const bodySpritePool: Sprite[] = []
  const accentSpritePool: Sprite[] = []
  const eyeSpritePool: Sprite[] = []

  function drawFrame(state: SimState) {
    // --- Jar border + food (Graphics) ---
    g.clear()
    g.circle(JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS)
    g.fill(0x6a6a6a)
    g.stroke({ color: 0x555555, width: 2 })
    for (const f of state.food) {
      g.circle(f.x, f.y, 3)
      g.fill(0x44cc44)
    }

    // --- Creatures (Sprites) — one pool slot per creature index ---
    const count = state.creatures.length

    for (let i = 0; i < count; i++) {
      const c = state.creatures[i]

      // Grow pool on demand
      if (i >= bodySpritePool.length) {
        const body = new Sprite()
        body.anchor.set(0.5)
        creatureContainer.addChild(body)
        bodySpritePool.push(body)

        const accent = new Sprite()
        accent.anchor.set(0.5)
        creatureContainer.addChild(accent)
        accentSpritePool.push(accent)

        const eye = new Sprite()
        eye.anchor.set(0.5)
        creatureContainer.addChild(eye)
        eyeSpritePool.push(eye)
      }

      const angle = Math.atan2(c.vy, c.vx) + Math.PI / 2  // sprites drawn head-up, so offset by 90°
      const spriteSet = getCreatureSpriteSetCached(c)

      const bodySprite = bodySpritePool[i]
      bodySprite.texture = spriteSet.bodyTexture
      bodySprite.x = c.x
      bodySprite.y = c.y
      bodySprite.scale.set((c.size * 2) / SPRITE_SIZE)
      bodySprite.tint = hslToHex(c.hue, 0.85, 0.60)
      bodySprite.rotation = angle
      bodySprite.visible = true

      const accentSprite = accentSpritePool[i]
      accentSprite.texture = spriteSet.accentTexture
      accentSprite.x = c.x
      accentSprite.y = c.y
      accentSprite.scale.set((c.size * 2) / SPRITE_SIZE)
      accentSprite.tint = hslToHex((c.hue + c.visual.accentHueOffset) % 360, 0.92, 0.64)
      accentSprite.rotation = angle
      accentSprite.visible = true

      const eyeSprite = eyeSpritePool[i]
      eyeSprite.texture = spriteSet.eyeTexture
      eyeSprite.x = c.x
      eyeSprite.y = c.y
      eyeSprite.scale.set((c.size * 2) / SPRITE_SIZE)
      eyeSprite.rotation = angle
      eyeSprite.visible = true
    }

    // Hide excess pool sprites
    for (let i = count; i < bodySpritePool.length; i++) {
      bodySpritePool[i].visible = false
      accentSpritePool[i].visible = false
      eyeSpritePool[i].visible = false
    }
  }

  function cleanup() {
    g.clear()
    for (const s of bodySpritePool) s.visible = false
    for (const s of accentSpritePool) s.visible = false
    for (const s of eyeSpritePool) s.visible = false
  }

  async function runGame() {
    // Phase 1: Setup
    const config = await showConfigUI(sidebar, DEFAULT_CONFIG, 'Start Simulation')

    // Phase 2: Simulate
    const state = initSimulation(config, randomSeed(), spriteKeys)
    await runSimUI(app, state, sidebar, () => drawFrame(state))
    cleanup()

    // Phase 3: Select
    await showSelectUI(gameContainer, sidebar, state.creatures, renderCreatureToCanvas)

    // Loop
    runGame()
  }

  runGame()
}

init()
