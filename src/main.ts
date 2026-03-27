import { Application, Graphics, Sprite, Container } from 'pixi.js'
import { initSimulation } from './sim/simulation'
import { getSpriteManifest } from './assets'
import { randomSeed } from './rng'
import { hslToHex } from './utils'
import { JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS } from './config'
import { showConfigUI } from './ui/setupUI'
import { runSimUI } from './ui/simUI'
import { showSelectUI } from './ui/selectUI'
import { generateCreatureTextures, SPRITE_SIZE } from './spriteGen'
import type { SimConfig, SimState, Creature } from './types'

const DEFAULT_CONFIG: SimConfig = {
  foodAbundance: 5,
  speedModifier: 1.0,
  mutationRate: 0.3,
}

const NUM_CREATURE_SHAPES = 12

async function init() {
  const app = new Application()
  await app.init({
    width: 600,
    height: 600,
    backgroundColor: 0x0a0a0a,
    antialias: true,
  })

  const gameContainer = document.getElementById('game-container')!
  const sidebar       = document.getElementById('sidebar')!
  gameContainer.appendChild(app.canvas)

  const { keys: spriteKeys } = getSpriteManifest()

  // Generate procedural creature textures
  const creatureTextures = generateCreatureTextures(NUM_CREATURE_SHAPES, 42)

  // Graphics layer for jar border + food
  const g = new Graphics()
  app.stage.addChild(g)

  // Sprite container for creatures (rendered on top of Graphics)
  const creatureContainer = new Container()
  app.stage.addChild(creatureContainer)

  // Sprite pool — reuse by index, toggle visibility. No create/destroy per frame.
  const spritePool: Sprite[] = []

  function drawFrame(state: SimState) {
    // --- Jar border + food (Graphics) ---
    g.clear()
    g.circle(JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS)
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
      if (i >= spritePool.length) {
        const s = new Sprite()
        s.anchor.set(0.5)
        creatureContainer.addChild(s)
        spritePool.push(s)
      }

      const sprite = spritePool[i]
      sprite.texture = creatureTextures[c.id % creatureTextures.length]
      sprite.x = c.x
      sprite.y = c.y
      sprite.scale.set((c.size * 2) / SPRITE_SIZE)
      sprite.tint = hslToHex(c.hue, 0.85, 0.60)
      sprite.visible = true
    }

    // Hide excess pool sprites
    for (let i = count; i < spritePool.length; i++) {
      spritePool[i].visible = false
    }
  }

  function cleanup() {
    g.clear()
    for (const s of spritePool) s.visible = false
  }

  async function runGame() {
    // Phase 1: Setup
    const config = await showConfigUI(sidebar, DEFAULT_CONFIG, 'Start Simulation')

    // Phase 2: Simulate
    const state = initSimulation(config, randomSeed(), spriteKeys)
    await runSimUI(app, state, sidebar, () => drawFrame(state))
    cleanup()

    // Phase 3: Select
    await showSelectUI(gameContainer, sidebar, state.creatures)

    // Loop
    runGame()
  }

  runGame()
}

init()
