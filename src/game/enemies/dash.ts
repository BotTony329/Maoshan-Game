/**
 * 罗刹 —— 接近→蓄力→突进（蓄力窗口给玩家侧移躲闪的读谱空间）。
 */
import type { Enemy } from '../types';
import type { World } from '../world';
import { effSpeed, dirToPlayer } from './basic';

export function dash(e: Enemy, w: World, dt: number): void {
  const spd = effSpeed(e, w);
  const d = Math.hypot(e.x - w.player.x, e.y - w.player.y);
  e.ai.t -= dt;
  if (e.ai.phase === 0) {
    const dir = dirToPlayer(e, w);
    e.vx = dir.x * spd;
    e.vy = dir.y * spd;
    if (d < 280) {
      e.ai.phase = 1;
      e.ai.t = 0.5;
    }
  } else if (e.ai.phase === 1) {
    e.vx *= Math.pow(0.01, dt);
    e.vy *= Math.pow(0.01, dt);
    if (e.ai.t <= 0) {
      const dir = dirToPlayer(e, w);
      e.vx = dir.x * spd * 3.2;
      e.vy = dir.y * spd * 3.2;
      e.ai.phase = 2;
      e.ai.t = 0.42;
    }
  } else if (e.ai.t <= 0) {
    e.ai.phase = 0;
    e.ai.t = 0.6;
  }
}
