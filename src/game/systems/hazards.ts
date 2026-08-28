/**
 * 区域效果系统 —— ring 扩张环 / beam 光束 / strike 落雷 / spiral 墨刃 /
 * totem 图腾电击 / blizzard 暴风雪。aura（糯米阵）常驻判定在武器模块内。
 */
import { clamp, dist2 } from '../../core/math';
import { beamHits, spiralBladePos } from '../weapons/shared';
import { dealDamage } from './combat';
import type { Enemy } from '../types';
import { applyPlayerDamage } from './player';
import type { World } from '../world';

export function updateHazards(w: World, dt: number): void {
  const p = w.player;
  for (const h of w.hazards) {
    h.t += dt;
    if (h.follow) {
      h.x = p.x;
      h.y = p.y;
    }

    switch (h.kind) {
      case 'ring': {
        const prevR = h.r;
        h.r = h.maxR * Math.min(h.t / h.dur, 1);
        if (h.hostile) {
          if (h.data === 0 && dist2(p.x, p.y, h.x, h.y) <= (h.r + p.radius) ** 2) {
            h.data = 1;
            applyPlayerDamage(w, h.damage - p.stats.armor);
          }
        } else {
          const hits = w.queryEnemies(h.x, h.y, h.r + 48);
          for (const e of hits) {
            if (!e.active || h.hitCd.has(e)) continue;
            const d = Math.sqrt(dist2(e.x, e.y, h.x, h.y));
            // 环带扫过判定：命中介于上一帧半径与当前半径之间的敌人
            if (d <= h.r + e.radius && d >= prevR - e.radius) {
              h.hitCd.set(e, 1e9); // 一圈只结算一次
              const inv = 1 / Math.max(d, 1);
              dealDamage(w, e, h.damage, (e.x - h.x) * inv * h.knockback, (e.y - h.y) * inv * h.knockback);
            }
          }
        }
        break;
      }
      case 'beam': {
        // 以光束中点做网格粗查询，再按点到线段距离精判
        const mx = h.x + Math.cos(h.angle) * h.maxR * 0.5;
        const my = h.y + Math.sin(h.angle) * h.maxR * 0.5;
        const hits = w.queryEnemies(mx, my, h.maxR * 0.5 + h.width);
        for (const e of hits) {
          if (!e.active) continue;
          if ((h.hitCd.get(e) ?? 0) > w.time) continue;
          if (beamHits(h, e.x, e.y, e.radius)) {
            h.hitCd.set(e, w.time + Math.max(h.tickEvery, 0.05));
            dealDamage(w, e, h.damage);
          }
        }
        break;
      }
      case 'strike': {
        // 前段警示圈，末段 0.12s 内落雷判定一次
        if (h.data === 0 && h.t >= h.dur - 0.12) {
          h.data = 1;
          const hits = w.queryEnemies(h.x, h.y, h.r + 46);
          for (const e of hits) {
            if (e.active && dist2(e.x, e.y, h.x, h.y) <= (h.r + e.radius) ** 2) {
              dealDamage(w, e, h.damage);
            }
          }
          w.emitSfx('thunder');
        }
        break;
      }
      case 'spiral': {
        h.angle += h.spin * dt;
        h.r = h.maxR * Math.min(1, (h.t / h.dur) ** 0.7); // 先快后慢展开
        const blades = Math.max(1, Math.round(h.data));
        for (let i = 0; i < blades; i++) {
          const pos = spiralBladePos(h, i);
          const hits = w.queryEnemies(pos.x, pos.y, 16 + 46);
          for (const e of hits) {
            if (!e.active) continue;
            if ((h.hitCd.get(e) ?? 0) > w.time) continue;
            if (dist2(e.x, e.y, pos.x, pos.y) <= (16 + e.radius) ** 2) {
              h.hitCd.set(e, w.time + Math.max(h.tickEvery, 0.05));
              dealDamage(w, e, h.damage);
            }
          }
        }
        break;
      }
      case 'totem': {
        // 图腾：静置立柱，周期电击周围最近敌人（萨满锤专属）
        h.data -= dt;
        if (h.data <= 0) {
          h.data = 0.8;
          const hits = w.queryEnemies(h.x, h.y, h.maxR + 46);
          let target: Enemy | null = null;
          let bestD2 = Infinity;
          for (const e of hits) {
            if (!e.active) continue;
            const d2v = dist2(e.x, e.y, h.x, h.y);
            if (d2v < bestD2) {
              bestD2 = d2v;
              target = e;
            }
          }
          if (target) {
            dealDamage(w, target, h.damage);
            // 电击连线（渲染层读 points 画）
            h.points = [{ x: h.x, y: h.y }, { x: target.x, y: target.y }];
          }
        }
        break;
      }
      case 'blizzard': {
        // 暴风雪：区域持续伤害 + 减速 30%
        const hits = w.queryEnemies(h.x, h.y, h.r + 46);
        for (const e of hits) {
          if (!e.active) continue;
          if ((h.hitCd.get(e) ?? 0) > w.time) continue;
          if (dist2(e.x, e.y, h.x, h.y) <= (h.r + e.radius) ** 2) {
            h.hitCd.set(e, w.time + Math.max(h.tickEvery, 0.05));
            dealDamage(w, e, h.damage);
            e.slowFactor = Math.min(e.slowFactor, 0.7);
            e.slowUntil = Math.max(e.slowUntil, w.time + 0.4);
          }
        }
        break;
      }
      case 'chain':
      case 'sweep':
      case 'aura':
        // 纯表现体 / 常驻判定在武器模块内
        break;
    }

    if (h.t >= h.dur) h.active = false;
  }
  void clamp;
}
