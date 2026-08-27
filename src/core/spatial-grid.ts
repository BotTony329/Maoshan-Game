/**
 * 空间哈希网格 —— 弹幕游戏的碰撞查询基础设施。
 *
 * 每帧由 World 重建一次（clear + 批量 insert），查询走圆形邻域。
 * 用调用方传入的 out 数组承接结果，避免高频查询产生 GC 压力。
 */
export interface HasXY {
  x: number;
  y: number;
}

export class SpatialGrid<T extends HasXY> {
  private readonly cellSize: number;
  private readonly buckets = new Map<number, T[]>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.buckets.clear();
  }

  private key(cx: number, cy: number): number {
    // 坐标可能为负（ arena 边缘），加偏移保证哈希稳定
    return (cx + 4096) * 8192 + (cy + 4096);
  }

  insert(item: T): void {
    const cx = Math.floor(item.x / this.cellSize);
    const cy = Math.floor(item.y / this.cellSize);
    const k = this.key(cx, cy);
    const bucket = this.buckets.get(k);
    if (bucket) bucket.push(item);
    else this.buckets.set(k, [item]);
  }

  /** 查询圆邻域内（含边界相交）的所有元素，结果追加进 out */
  queryCircle(x: number, y: number, r: number, out: T[]): T[] {
    const minCx = Math.floor((x - r) / this.cellSize);
    const maxCx = Math.floor((x + r) / this.cellSize);
    const minCy = Math.floor((y - r) / this.cellSize);
    const maxCy = Math.floor((y + r) / this.cellSize);
    const r2 = r * r;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.buckets.get(this.key(cx, cy));
        if (!bucket) continue;
        for (const item of bucket) {
          const dx = item.x - x;
          const dy = item.y - y;
          if (dx * dx + dy * dy <= r2) out.push(item);
        }
      }
    }
    return out;
  }
}
