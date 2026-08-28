/**
 * Boss 行为 —— 旱魃（召唤+弹幕环）/ 尸王（冲锋+震地环）。
 */
import { TAU } from '../../core/math';
import type { Enemy } from '../types';
import type { World } from '../world';
import { effSpeed, dirToPlayer } from './basic';

/** 旱魃：追击 + 召尸 + 环形弹幕 */
export function bossHangu(e: Enemy, w: World, dt: number): void {
  const dir = dirToPlayer(e, w);
  e.vx = dir.x * effSpeed(e, w);
  e.vy = dir.y * effSpeed(e, w);

  e.ai.summon -= dt;
  if (e.ai.summon <= 0) {
    e.ai.summon = 9;
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + w.rng.range(0, 0.5);
      w.spawnEnemyAt('hopper', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, false);
    }
    w.emitSfx('boss');
  }

  e.ai.burst -= dt;
  if (e.ai.burst <= 0) {
    e.ai.burst = 5.5;
    const n = 12;
    const offset = w.rng.range(0, TAU);
    for (let i = 0; i < n; i++) {
      const a = offset + (i * TAU) / n;
      const p = w.spawnProjectile('fireball');
      p.x = e.x;
      p.y = e.y;
      p.vx = Math.cos(a) * 205;
      p.vy = Math.sin(a) * 205;
      p.radius = 11;
      p.damage = e.damage * 0.6;
      p.pierce = 0;
      p.life = 3.4;
      p.friendly = false;
      p.color = 0xff5a4a;
    }
    w.emitSfx('shoot');
  }
}

/** 尸王：追击 → 蓄力冲锋 → 震地环（hostile 环伤玩家） */
export function bossShiwang(e: Enemy, w: World, dt: number): void {
  const spd = effSpeed(e, w);
  e.ai.t -= dt;
  if (e.ai.phase === 0) {
    const dir = dirToPlayer(e, w);
    e.vx = dir.x * spd;
    e.vy = dir.y * spd;
    e.ai.charge -= dt;
    if (e.ai.charge <= 0) {
      e.ai.charge = 7;
      e.ai.phase = 1;
      e.ai.t = 0.65;
    }
  } else if (e.ai.phase === 1) {
    e.vx *= Math.pow(0.01, dt);
    e.vy *= Math.pow(0.01, dt);
    if (e.ai.t <= 0) {
      const dir = dirToPlayer(e, w);
      e.vx = dir.x * spd * 3;
      e.vy = dir.y * spd * 3;
      e.ai.phase = 2;
      e.ai.t = 0.75;
    }
  } else if (e.ai.t <= 0) {
    e.vx = 0;
    e.vy = 0;
    e.ai.phase = 0;
    const h = w.spawnHazard('ring');
    h.x = e.x;
    h.y = e.y;
    h.maxR = 280;
    h.r = 20;
    h.dur = 0.5;
    h.damage = e.damage;
    h.hostile = true;
    h.color = 0xff5a4a;
    w.emitSfx('bomb');
  }
}
