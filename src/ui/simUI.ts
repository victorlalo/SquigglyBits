import type { Application } from 'pixi.js'
import type { SimState } from '../types'
import { stepSimulation, resumeSimulation } from '../sim/simulation'
import { STEPS_PER_FRAME, MAX_TICKS } from '../config'
import { showConfigUI } from './setupUI'
import { enableHoverTooltip } from './tooltip'

export function runSimUI(
  app: Application,
  state: SimState,
  sidebar: HTMLElement,
  drawFrame: () => void,
): Promise<void> {
  return new Promise(resolve => {
    let handlingPause = false

    function renderHUD() {
      sidebar.innerHTML = `
        <h1>SquigglyBits</h1>
        <p id="status">Running...</p>
        <p id="tick">Tick: ${state.tick} / ${MAX_TICKS}</p>
        <p id="creature-count">Creatures: ${state.creatures.length}</p>
      `
    }
    renderHUD()

    const ticker = app.ticker.add(() => {
      // Step simulation
      if (state.phase === 'running') {
        for (let i = 0; i < STEPS_PER_FRAME; i++) {
          stepSimulation(state)
          if (state.phase !== 'running') break
        }
        const tickEl  = sidebar.querySelector('#tick')
        const countEl = sidebar.querySelector('#creature-count')
        if (tickEl)  tickEl.textContent  = `Tick: ${state.tick} / ${MAX_TICKS}`
        if (countEl) countEl.textContent = `Creatures: ${state.creatures.length}`
      }

      // Draw immediately after stepping — same callback, same frame
      drawFrame()

      // Handle pause
      if (state.phase === 'paused' && !handlingPause) {
        handlingPause = true
        ticker.stop()
        const disableTooltip = enableHoverTooltip(app.canvas as HTMLCanvasElement, state)
        showConfigUI(sidebar, state.config, 'Resume').then(newConfig => {
          disableTooltip()
          state.config = newConfig
          handlingPause = false
          resumeSimulation(state)
          renderHUD()
          ticker.start()
        })
      }

      // Handle finish
      if (state.phase === 'finished') {
        ticker.destroy()
        resolve()
      }
    })
  })
}
