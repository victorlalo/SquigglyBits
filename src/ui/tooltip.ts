import type { Creature, SimState } from '../types'
import { getFeatureDefinition } from '../creatureFeatures'

const LOGICAL_SIZE = 600 // matches app.init width/height

export function enableHoverTooltip(canvas: HTMLCanvasElement, state: SimState): () => void {
  const tooltip = document.createElement('div')
  tooltip.id = 'creature-tooltip'
  tooltip.style.display = 'none'
  document.body.appendChild(tooltip)

  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect()
    // Map rendered CSS pixels → logical game coordinates
    const mx = (e.clientX - rect.left) * (LOGICAL_SIZE / rect.width)
    const my = (e.clientY - rect.top)  * (LOGICAL_SIZE / rect.height)

    let found: Creature | null = null
    for (const c of state.creatures) {
      const dx = c.x - mx
      const dy = c.y - my
      if (dx * dx + dy * dy <= c.size * c.size) {
        found = c
        break
      }
    }

    if (found) {
      tooltip.style.display = 'block'
      // Keep tooltip on screen if near right/bottom edge
      const tx = e.clientX + 14 + 160 > window.innerWidth  ? e.clientX - 170 : e.clientX + 14
      const ty = e.clientY + 14 + 200 > window.innerHeight ? e.clientY - 210 : e.clientY + 14
      tooltip.style.left = `${tx}px`
      tooltip.style.top  = `${ty}px`
      tooltip.innerHTML = `
        <div class="tt-row"><span>Feature</span><b>${getFeatureDefinition(found.featureId).label}</b></div>
        <div class="tt-row"><span>Speed</span><b>${found.speed.toFixed(2)}</b></div>
        <div class="tt-row"><span>Size</span><b>${found.size.toFixed(1)}</b></div>
        <div class="tt-row"><span>Perception</span><b>${found.perception.toFixed(1)}</b></div>
        <div class="tt-row"><span>Energy</span><b>${found.energy.toFixed(0)} / ${found.maxEnergy}</b></div>
        <div class="tt-row"><span>Absorptions</span><b>${found.absorptions}</b></div>
        <div class="tt-row"><span>Generation</span><b>${found.generation}</b></div>
        <div class="tt-row"><span>Children</span><b>${found.children}</b></div>
        <div class="tt-row"><span>Age</span><b>${found.age} ticks</b></div>
      `
    } else {
      tooltip.style.display = 'none'
    }
  }

  function onMouseLeave() {
    tooltip.style.display = 'none'
  }

  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseleave', onMouseLeave)

  return () => {
    canvas.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mouseleave', onMouseLeave)
    tooltip.remove()
  }
}
