import type { SimConfig } from '../types'

export function showConfigUI(
  sidebar: HTMLElement,
  defaults: SimConfig,
  buttonLabel: string,
): Promise<SimConfig> {
  return new Promise(resolve => {
    sidebar.innerHTML = `
      <h1>SquigglyBits</h1>
      <p class="tagline">Shape an ecosystem. Pick the monster it produces.</p>

      <label>Food Abundance <span id="food-val">${defaults.foodAbundance}</span></label>
      <input type="range" id="food" min="1" max="10" step="1" value="${defaults.foodAbundance}">

      <label>Speed Modifier <span id="speed-val">${defaults.speedModifier.toFixed(1)}</span></label>
      <input type="range" id="speed" min="0.5" max="2.0" step="0.1" value="${defaults.speedModifier}">

      <label>Mutation Rate <span id="mutation-val">${defaults.mutationRate.toFixed(2)}</span></label>
      <input type="range" id="mutation" min="0.0" max="1.0" step="0.05" value="${defaults.mutationRate}">

      <button id="action-btn">${buttonLabel}</button>
    `

    const food     = sidebar.querySelector<HTMLInputElement>('#food')!
    const speed    = sidebar.querySelector<HTMLInputElement>('#speed')!
    const mutation = sidebar.querySelector<HTMLInputElement>('#mutation')!

    food.addEventListener('input', () => {
      sidebar.querySelector('#food-val')!.textContent = food.value
    })
    speed.addEventListener('input', () => {
      sidebar.querySelector('#speed-val')!.textContent = Number(speed.value).toFixed(1)
    })
    mutation.addEventListener('input', () => {
      sidebar.querySelector('#mutation-val')!.textContent = Number(mutation.value).toFixed(2)
    })

    sidebar.querySelector('#action-btn')!.addEventListener('click', () => {
      resolve({
        foodAbundance: Number(food.value),
        speedModifier: Number(speed.value),
        mutationRate:  Number(mutation.value),
      })
    })
  })
}
