/**
 * 弹幕系统 —— 追踪转向、位移、命中穿透、爆裂、诅咒挂载、敌方弹幕。
 */
import { ARENA } from '../../data/config';
import { clamp, dist2, TAU } from '../../core/math';
import { dealDamage } from './combat';
import { applyPlayerDamage } from './player';
import type { Projectile } from '../types';
import type { World } from '../world';

export function updateProjectiles(w: World, dt: number): void {
  const p = w.player;
  for (const pr of w.projectiles) {
    // 追踪星火：朝索敌半径内最近的敌人拐弯
    if (pr.homing > 0 && pr.friendly) {
      homingSteer(w, pr, dt);
    }

    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (
      pr.life <= 0 ||
      pr.x < -200 || pr.x > ARENA.width + 200 ||
      pr.y < -200 || pr.y > ARENA.height + 200
    ) {
      if (pr.blast > 0) explode(w, pr);
      pr.active = false;
      continue;
    }

    if (pr.friendly) {
      const hits = w.queryEnemies(pr.x, pr.y, pr.radius + 46);
      for (const e of hits) {
        if (!e.active || e.hp <= 0 || pr.hit.has(e)) continue;
        if (dist2(pr.x, pr.y, e.x, e.y) > (pr.radius + e.radius) ** 2) continue;
        pr.hit.add(e);
        if (pr.kind === 'curse') {
          // 蚀魂咒：命中挂 DoT，不立即结算伤害；深度传染专属强化侵蚀
          const mult = w.hasSpecial('warlock_staff', 'deep_plague') ? 1.25 : 1;
          e.curseDps = pr.damage * 0.6 * mult;
          e.curseUntil = w.time + pr.blast;
          e.curseAcc = 0;
          pr.active = false;
          break;
        }
        if (pr.blast > 0) {
          // 爆裂弹：命中即炸，不再逐个穿透
          explode(w, pr);
          pr.active = false;
          break;
        }
        const vlen = Math.hypot(pr.vx, pr.vy) || 1;
        dealDamage(w, e, pr.damage, (pr.vx / vlen) * 90, (pr.vy / vlen) * 90);
        if (pr.pierce <= 0) {
          pr.active = false;
          break;
        }
        pr.pierce--;
      }
    } else if (p.invuln <= 0 && dist2(pr.x, pr.y, p.x, p.y) < (pr.radius + p.radius) ** 2) {
      applyPlayerDamage(w, pr.damage - p.stats.armor);
      pr.active = false;
    }
  }
}

function homingSteer(w: World, pr: Projectile, dt: number): void {
  const near = w.queryEnemies(pr.x, pr.y, 320);
  let target = null as null | { x: number; y: number };
  let bestD2 = Infinity;
  for (const e of near) {
    if (!e.active || e.hp <= 0 || pr.hit.has(e)) continue;
    const d2v = dist2(pr.x, pr.y, e.x, e.y);
    if (d2v < bestD2) {
      bestD2 = d2v;
      target = e;
    }
  }
  if (!target) return;
  const speed = Math.hypot(pr.vx, pr.vy) || 1;
  const want = Math.atan2(target.y - pr.y, target.x - pr.x);
  let cur = Math.atan2(pr.vy, pr.vx);
  let diff = want - cur;
  while (diff > Math.PI) diff -= TAU;
  while (diff < -Math.PI) diff += TAU;
  const turn = clamp(diff, -pr.homing * dt, pr.homing * dt);
  cur += turn;
  pr.vx = Math.cos(cur) * speed;
  pr.vy = Math.sin(cur) * speed;
  pr.rotation = cur;
}

/** 火符爆裂：以弹着点为圆心波及一片，附带视觉冲击环 */
export function explode(w: World, pr: Projectile): void {
  const hits = w.queryEnemies(pr.x, pr.y, pr.blast + 46);
  for (const e of hits) {
    if (!e.active) continue;
    const d = Math.sqrt(dist2(e.x, e.y, pr.x, pr.y));
    if (d <= pr.blast + e.radius) {
      const inv = 1 / Math.max(d, 1);
      dealDamage(w, e, pr.damage, (e.x - pr.x) * inv * 160, (e.y - pr.y) * inv * 160);
    }
  }
  const ring = w.spawnHazard('ring');
  ring.x = pr.x;
  ring.y = pr.y;
  ring.maxR = pr.blast;
  ring.r = pr.blast * 0.4;
  ring.dur = 0.28;
  ring.color = 0xff7a3c;
  w.emitSfx('hit');
}
