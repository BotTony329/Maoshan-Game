/**
 * 飘字系统 —— 伤害数字上浮（渲染层读取 w.floaters 展示）。
 */
import type { World } from '../world';

export function updateFloaters(w: World, dt: number): void {
  for (const f of w.floaters) f.t += dt;
}
