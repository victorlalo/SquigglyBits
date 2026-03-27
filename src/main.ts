import { Application, Graphics } from 'pixi.js'
import { initSimulation, stepSimulation } from './sim/simulation'
import { getSpriteManifest } from './assets'
import { randomSeed } from './rng'
import { hslToHex } from './utils'
import { JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS, MAX_TICKS } from './config'
import type { SimConfig } from './types'

const DEFAULT_CONFIG: SimConfig = {
  foodAbundance: 5,
  speedModifier: 1.0,
  mutationRate: 0.3,
}

async function init() {
  const app = new Application()
  await app.init({
    width: 600,
    height: 600,
    backgroundColor: 0x0a0a0a,
    antialias: true,
  })
  document.getElementById('game-container')!.appendChild(app.canvas)

  const { keys: spriteKeys } = getSpriteManifest()

  // Single Graphics object — cleared and redrawn each frame
  const g = new Graphics()
  app.stage.addChild(g)

  const state = initSimulation(DEFAULT_CONFIG, randomSeed(), spriteKeys)

  const creatureCountEl = document.getElementById('creature-count')!
  const tickEl = document.getElementById('tick')!
  const statusEl = document.getElementById('status')!

  app.ticker.add(() => {
    if (state.phase === 'running') {
      stepSimulation(state)
    }

    // --- Draw ---
    g.clear()

    // Jar border
    g.circle(JAR_CENTER_X, JAR_CENTER_Y, JAR_RADIUS)
    g.stroke({ color: 0x555555, width: 2 })

    // Food
    for (const f of state.food) {
      g.circle(f.x, f.y, 3)
      g.fill(0x44cc44)
    }

    // Creatures
    for (const c of state.creatures) {
      const color = hslToHex(c.hue, 0.85, 0.60)
      g.circle(c.x, c.y, c.size)
      g.fill(color)
    }

    // HUD
    creatureCountEl.textContent = `Creatures: ${state.creatures.length}`
    tickEl.textContent = `Tick: ${state.tick} / ${MAX_TICKS}`
    statusEl.textContent = state.phase === 'paused'
      ? 'PAUSED — tweak sliders then resume (not yet wired)'
      : state.phase === 'finished'
        ? `FINISHED — ${state.creatures.length} survivors`
        : 'Running...'
  })
}

init()
