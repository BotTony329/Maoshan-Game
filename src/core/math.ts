/**
 * 数学与随机数工具 —— 纯函数集合，供逻辑层与渲染层共同使用。
 */

export const TAU = Math.PI * 2;

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const dist2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};

export const dist = (ax: number, ay: number, bx: number, by: number): number =>
  Math.sqrt(dist2(ax, ay, bx, by));

/** 点到线段的最短距离平方（八卦镜光束判定用） */
export function pointSegDist2(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return dist2(px, py, ax, ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = clamp(t, 0, 1);
  return dist2(px, py, ax + abx * t, ay + aby * t);
}

/**
 * 可播种 RNG（mulberry32）。
 * 逻辑层全部经由此类取随机，测试可以固定种子复现任意一局；
 * 涉及手感的表现层随机（粒子方向等）才允许用 Math.random。
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) 浮点 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** [min, max) 整数 */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length)];
  }

  /** 按 weight 字段加权抽取一项 */
  weightedPick<T>(items: readonly (T & { weight: number })[]): T {
    let total = 0;
    for (const it of items) total += it.weight;
    let roll = this.next() * total;
    for (const it of items) {
      roll -= it.weight;
      if (roll < 0) return it;
    }
    return items[items.length - 1];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
