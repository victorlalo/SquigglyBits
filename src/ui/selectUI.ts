import type { Creature } from '../types'
import { getFeatureDefinition } from '../creatureFeatures'

export type RenderCreatureFn = (canvas: HTMLCanvasElement, creature: Creature) => void

export function showSelectUI(
  gameContainer: HTMLElement,
  sidebar: HTMLElement,
  survivors: Creature[],
  renderCreature: RenderCreatureFn,
): Promise<void> {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.id = 'select-overlay'
    gameContainer.appendChild(overlay)

    const maxSize = Math.max(...survivors.map(c => c.size), 1)
    let selected: Creature | null = null

    for (const creature of survivors) {
      const displayR = Math.max(28, Math.min(56, (creature.size / maxSize) * 56))
      const size = displayR * 2

      const canvas = document.createElement('canvas')
      canvas.width  = size
      canvas.height = size
      canvas.className = 'creature-dot'
      canvas.dataset.id = String(creature.id)
      canvas.style.width  = `${size}px`
      canvas.style.height = `${size}px`
      renderCreature(canvas, creature)

      canvas.addEventListener('mouseenter', () => {
        showStats(creature, false)
      })
      canvas.addEventListener('mouseleave', () => {
        if (selected) showStats(selected, true)
        else showDefault()
      })
      canvas.addEventListener('click', () => {
        overlay.querySelectorAll<HTMLElement>('.creature-dot').forEach(e => e.classList.remove('selected'))
        canvas.classList.add('selected')
        selected = creature
        showStats(creature, true)
      })

      overlay.appendChild(canvas)
    }

    function showStats(c: Creature, withButtons: boolean) {
      const buttons = withButtons ? `
        <button id="confirm-btn">Confirm Champion</button>
        <button id="run-again-btn" class="secondary">Run Again</button>
      ` : ''

      sidebar.innerHTML = `
        <h1>Pick Your Champion</h1>
        <div class="stats">
          <p><span>Feature</span><b>${getFeatureDefinition(c.featureId).label}</b></p>
          <p><span>Speed</span><b>${c.speed.toFixed(2)}</b></p>
          <p><span>Size</span><b>${c.size.toFixed(1)}</b></p>
          <p><span>Perception</span><b>${c.perception.toFixed(1)}</b></p>
          <p><span>Absorptions</span><b>${c.absorptions}</b></p>
          <p><span>Generation</span><b>${c.generation}</b></p>
          <p><span>Children</span><b>${c.children}</b></p>
          <p><span>Age</span><b>${c.age} ticks</b></p>
        </div>
        ${buttons}
      `
      sidebar.querySelector('#confirm-btn')?.addEventListener('click', () => {
        cleanup(); resolve()
      })
      sidebar.querySelector('#run-again-btn')?.addEventListener('click', () => {
        cleanup(); resolve()
      })
    }

    function showDefault() {
      sidebar.innerHTML = `
        <h1>Pick Your Champion</h1>
        <p>${survivors.length} survivor${survivors.length === 1 ? '' : 's'}</p>
        <p class="tagline">Hover to inspect. Click to select.</p>
        <button id="run-again-btn" class="secondary">Run Again</button>
      `
      sidebar.querySelector('#run-again-btn')!.addEventListener('click', () => {
        cleanup(); resolve()
      })
    }

    function cleanup() {
      overlay.remove()
    }

    showDefault()
  })
}
