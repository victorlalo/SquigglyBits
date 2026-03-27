import type { Creature } from '../types'

export function showSelectUI(
  gameContainer: HTMLElement,
  sidebar: HTMLElement,
  survivors: Creature[],
): Promise<void> {
  return new Promise(resolve => {
    // Overlay on top of the PixiJS canvas
    const overlay = document.createElement('div')
    overlay.id = 'select-overlay'
    gameContainer.appendChild(overlay)

    const maxSize = Math.max(...survivors.map(c => c.size))
    let selected: Creature | null = null

    for (const creature of survivors) {
      const displayR = Math.max(14, Math.min(40, (creature.size / maxSize) * 40))
      const el = document.createElement('div')
      el.className = 'creature-dot'
      el.dataset.id = String(creature.id)
      el.style.width  = `${displayR * 2}px`
      el.style.height = `${displayR * 2}px`
      el.style.background = `hsl(${creature.hue}, 85%, 60%)`
      el.addEventListener('click', () => {
        overlay.querySelectorAll<HTMLElement>('.creature-dot').forEach(e => e.classList.remove('selected'))
        el.classList.add('selected')
        selected = creature
        renderStats(creature)
      })
      overlay.appendChild(el)
    }

    function renderStats(c: Creature) {
      sidebar.innerHTML = `
        <h1>Pick Your Champion</h1>
        <div class="stats">
          <p><span>Speed</span><b>${c.speed.toFixed(2)}</b></p>
          <p><span>Size</span><b>${c.size.toFixed(1)}</b></p>
          <p><span>Perception</span><b>${c.perception.toFixed(1)}</b></p>
          <p><span>Absorptions</span><b>${c.absorptions}</b></p>
          <p><span>Generation</span><b>${c.generation}</b></p>
          <p><span>Children</span><b>${c.children}</b></p>
          <p><span>Age</span><b>${c.age} ticks</b></p>
        </div>
        <button id="confirm-btn">Confirm Champion</button>
        <button id="run-again-btn" class="secondary">Run Again</button>
      `
      sidebar.querySelector('#confirm-btn')!.addEventListener('click', () => {
        if (!selected) return
        cleanup()
        resolve()
      })
      sidebar.querySelector('#run-again-btn')!.addEventListener('click', () => {
        cleanup()
        resolve()
      })
    }

    function cleanup() {
      overlay.remove()
    }

    // Default sidebar — no creature selected yet
    sidebar.innerHTML = `
      <h1>Pick Your Champion</h1>
      <p>${survivors.length} survivor${survivors.length === 1 ? '' : 's'}</p>
      <p class="tagline">Click a creature to inspect it.</p>
      <button id="run-again-btn" class="secondary">Run Again</button>
    `
    sidebar.querySelector('#run-again-btn')!.addEventListener('click', () => {
      cleanup()
      resolve()
    })
  })
}
