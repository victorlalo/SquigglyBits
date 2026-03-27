import { Application, Graphics } from 'pixi.js'

async function init() {
  const app = new Application()

  await app.init({
    width: 600,
    height: 600,
    backgroundColor: 0x0a0a0a,
    antialias: true,
  })

  document.getElementById('game-container')!.appendChild(app.canvas)

  // Jar border
  const jar = new Graphics()
  jar.circle(300, 300, 280)
  jar.stroke({ color: 0x444444, width: 2 })
  app.stage.addChild(jar)

  // A few test creatures (colored circles)
  const colors = [0x44ff88, 0xff6644, 0x4488ff, 0xffcc44, 0xcc44ff]
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    const creature = new Graphics()
    creature.circle(0, 0, 10 + i * 3)
    creature.fill(colors[i])
    creature.x = 300 + Math.cos(angle) * 150
    creature.y = 300 + Math.sin(angle) * 150
    app.stage.addChild(creature)
  }
}

init()
