// Convert HSL (h: 0-360, s: 0-1, l: 0-1) to a PixiJS hex color number
export function hslToHex(h: number, s: number, l: number): number {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c)
  }
  return (f(0) << 16) | (f(8) << 8) | f(4)
}
