# Creature Sprites

Place custom sprite art here. Any PNG named `creature_<name>.png` is automatically loaded.

## Naming Convention

| File | Key | Usage |
|------|-----|-------|
| `creature_blob.png` | `blob` | Assigned randomly to starting creatures |
| `creature_spike.png` | `spike` | Assigned randomly to starting creatures |
| `creature_orb.png` | `orb` | Assigned randomly to starting creatures |

Multiple sprite types are distributed randomly across the starting population. Offspring inherit their parent's sprite key (with the same hue-based tinting).

## Design Tips

- **Canvas size**: 64×64 or 128×128 px (sprites are scaled to match `creature.size`)
- **Background**: transparent PNG
- **Color**: draw in white/light grey if you want the creature's inherited hue to show through via tinting. Colored art also works — the tint will shift it.
- **Shape**: roughly circular works best since collision detection uses a circle radius

## Fallback

If no sprites are found, creatures render as plain colored circles generated at runtime.
