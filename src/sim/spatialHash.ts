// Grid-based spatial hash. Reduces collision/proximity checks from O(n²) to ~O(n).
// Cell size should be >= the largest query radius used with this hash.
export class SpatialHash {
  private cells = new Map<number, number[]>()
  private readonly cellSize: number

  constructor(cellSize: number) {
    this.cellSize = cellSize
  }

  private key(cx: number, cy: number): number {
    return cx * 10000 + cy
  }

  clear(): void {
    this.cells.clear()
  }

  // Insert an item (by index) at position (x, y)
  insert(index: number, x: number, y: number): void {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    const k = this.key(cx, cy)
    let cell = this.cells.get(k)
    if (!cell) { cell = []; this.cells.set(k, cell) }
    cell.push(index)
  }

  // Return all indices in cells overlapping the circle at (x, y) with given radius
  query(x: number, y: number, radius: number): number[] {
    const minCx = Math.floor((x - radius) / this.cellSize)
    const maxCx = Math.floor((x + radius) / this.cellSize)
    const minCy = Math.floor((y - radius) / this.cellSize)
    const maxCy = Math.floor((y + radius) / this.cellSize)

    const result: number[] = []
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(this.key(cx, cy))
        if (cell) result.push(...cell)
      }
    }
    return result
  }
}
