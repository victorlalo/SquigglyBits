// Sprite convention:
//   src/sprites/creature_<name>.png
//
// Any PNG matching that pattern is automatically picked up at build time
// via Vite's import.meta.glob. Sprites are assigned to creatures at spawn
// and inherited by offspring. No config changes needed — just drop the file.
//
// Sprite design tips:
//   - Draw on a transparent background
//   - Use white/light colors if you want the creature's hue tint to show through
//   - Recommended size: 64x64 or 128x128 px (will be scaled to creature.size)

const rawModules = import.meta.glob('./sprites/creature_*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export interface SpriteManifest {
  keys: string[]           // e.g. ['blob', 'spike']
  urls: Record<string, string> // key -> resolved URL for Assets.load()
}

export function getSpriteManifest(): SpriteManifest {
  const keys: string[] = []
  const urls: Record<string, string> = {}

  for (const [path, url] of Object.entries(rawModules)) {
    // './sprites/creature_blob.png' -> key = 'blob'
    const match = path.match(/creature_(.+)\.png$/i)
    if (match) {
      const key = match[1]
      keys.push(key)
      urls[key] = url as string
    }
  }

  return { keys, urls }
}
