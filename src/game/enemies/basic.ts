/**
 * 基础敌人行为 —— 追击 / 跳尸蓄力跳 / 飞僵飘行。
 */
import type { Enemy } from '../types';
import type { World } from '../world';

/** 减速只在生效期内起作用（糯米阵/暴风雪等来源） */
export function effSpeed(e: Enemy, w: World): number {
  return e.speed * (w.time < e.slowUntil ? e.slowFactor : 1);
}

export function dirToPlayer(e: Enemy, w: World): { x: number; y: number } {
  const d = Math.max(Math.hypot(e.x - w.player.x, e.y - w.player.y), 1);
  return { x: (w.player.x - e.x) / d, y: (w.player.y - e.y) / d };
}

/** 直线追击 */
export function chase(e: Enemy, w: World): void {
  const d = dirToPlayer(e, w);
  const spd = effSpeed(e, w);
  e.vx = d.x * spd;
  e.vy = d.y * spd;
}

/** 跳尸：蓄力→跳跃爆发（蓄力急减速是“要跳了”的读谱信号） */
export function hop(e: Enemy, w: World, dt: number): void {
  e.ai.t -= dt;
  const spd = effSpeed(e, w);
  if (e.ai.phase === 0) {
    e.vx *= Math.pow(0.02, dt);
    e.vy *= Math.pow(0.02, dt);
    if (e.ai.t <= 0) {
      const d = dirToPlayer(e, w);
      e.vx = d.x * spd * 2.6;
      e.vy = d.y * spd * 2.6;
      e.ai.phase = 1;
      e.ai.t = 0.42;
    }
  } else if (e.ai.t <= 0) {
    e.ai.phase = 0;
    e.ai.t = 0.5 + w.rng.range(0, 0.25);
  }
}

/** 飞僵：飘行带横向摆动 */
export function drift(e: Enemy, w: World, dt: number): void {
  void dt;
  const d = dirToPlayer(e, w);
  const sway = Math.sin(w.time * 3 + e.ai.wob) * 0.5;
  const vx = d.x + -d.y * sway;
  const vy = d.y + d.x * sway;
  const len = Math.max(Math.hypot(vx, vy), 0.001);
  const spd = effSpeed(e, w);
  e.vx = (vx / len) * spd;
  e.vy = (vy / len) * spd;
}
