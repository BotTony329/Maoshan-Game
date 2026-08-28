/**
 * 敌人系统 —— 行为派发、位移、击退衰减、回收、接触伤害、诅咒 DoT 分期结算。
 */
import { ARENA, ENEMY_RECYCLE_DIST, SPAWN_RING } from '../../data/config';
import { ENEMY_BEHAVIORS } from '../enemies';
import { clamp, dist2, TAU } from '../../core/math';
import { dealDamage } from './combat';
import { applyPlayerDamage } from './player';
import type { World } from '../world';

export function updateEnemies(w: World, dt: number): void {
  const p = w.player;
  const knockDecay = Math.exp(-4 * dt);
  for (const e of w.enemies) {
    const behavior = ENEMY_BEHAVIORS[e.def.behavior];
    if (!behavior) throw new Error(`未注册的敌人行为: ${e.def.behavior}`);
    behavior(e, w, dt);

    e.x += (e.vx + e.knockX) * dt;
    e.y += (e.vy + e.knockY) * dt;
    e.knockX *= knockDecay;
    e.knockY *= knockDecay;
    e.x = clamp(e.x, 20, ARENA.width - 20);
    e.y = clamp(e.y, 20, ARENA.height - 20);
    e.flash = Math.max(0, e.flash - dt);

    // 被甩开太远的小怪回收重生，维持场面压力（Boss 不回收）
    if (!e.def.boss && dist2(e.x, e.y, p.x, p.y) > ENEMY_RECYCLE_DIST * ENEMY_RECYCLE_DIST) {
      const a = w.rng.range(0, TAU);
      e.x = clamp(p.x + Math.cos(a) * SPAWN_RING, 40, ARENA.width - 40);
      e.y = clamp(p.y + Math.sin(a) * SPAWN_RING, 40, ARENA.height - 40);
    }

    if (p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.radius + p.radius) ** 2) {
      applyPlayerDamage(w, e.damage - p.stats.armor);
    }

    // 蚀魂咒分期结算：积攒到 4 点伤害才飘字/结算，避免每帧刷屏
    if (e.curseUntil > w.time && e.curseDps > 0) {
      e.curseAcc += e.curseDps * dt;
      if (e.curseAcc >= 4) {
        const dmg = e.curseAcc;
        e.curseAcc = 0;
        dealDamage(w, e, dmg);
      }
    }
  }
}
