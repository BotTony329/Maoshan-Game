/**
 * 武器共享工具 —— 数值结算、判定几何、通用弹道子程序。
 */
import { dist2, pointSegDist2, TAU } from '../../core/math';
import { dealDamage } from '../systems/combat';
import type { Enemy, Hazard, Player, WeaponSlot, WeaponStats } from '../types';
import type { World } from '../world';

const FIELD_DEFAULTS: WeaponStats = {
  damage: 0, cooldown: 1, amount: 1, area: 1,
  speed: 1, duration: 1, pierce: 0, knockback: 0,
};
const STAT_FIELDS = Object.keys(FIELD_DEFAULTS) as (keyof WeaponStats)[];

/**
 * 计算某武器槽位在当前等级与玩家加成下的最终数值。
 * Lv1 提供全量基础值，其后各级覆盖同名字段逐级叠加；最后套用玩家加成与专属升级。
 */
export function computeWeaponStats(slot: WeaponSlot, player: Player): WeaponStats {
  const out: WeaponStats = { ...FIELD_DEFAULTS };
  const maxL = Math.min(slot.level, slot.def.levels.length);
  for (let l = 0; l < maxL; l++) {
    const lv = slot.def.levels[l];
    for (const field of STAT_FIELDS) {
      const value = lv[field];
      if (value !== undefined) out[field] = value;
    }
  }
  out.damage *= player.stats.damage;
  out.cooldown *= Math.max(1 - player.stats.cooldown, 0.3);
  out.area *= player.stats.area;
  // 符文专属「破魔」：穿透 +2
  if (slot.def.id === 'rune' && slot.specials.includes('demo_bane')) out.pierce += 2;
  return out;
}

/** 武器模块冷却计时：到期返回 true（调用方负责重置） */
export function tickTimer(slot: WeaponSlot, dt: number): boolean {
  slot.timer -= dt;
  return slot.timer <= 0;
}

/** 八卦镜光束命中：点到线段距离 */
export function beamHits(h: Hazard, x: number, y: number, radius: number): boolean {
  const ex = h.x + Math.cos(h.angle) * h.maxR;
  const ey = h.y + Math.sin(h.angle) * h.maxR;
  return pointSegDist2(x, y, h.x, h.y, ex, ey) <= (h.width / 2 + radius) ** 2;
}

/** 螺旋墨刃第 i 臂坐标（逻辑与渲染共用） */
export function spiralBladePos(h: Hazard, i: number): { x: number; y: number } {
  const n = Math.max(1, Math.round(h.data));
  const a = h.angle + (i * TAU) / n;
  return { x: h.x + Math.cos(a) * h.r, y: h.y + Math.sin(a) * h.r };
}

export interface ChainPoint {
  x: number;
  y: number;
}

/**
 * 闪电链子程序：从 from 起逐跳命中最近的未击中敌人并结算伤害。
 * 电符（通用池）与萨满锤「闪电箭」专属共用。
 * @returns 命中坐标序列（渲染层画电弧）
 */
export function chainFrom(
  w: World,
  from: ChainPoint,
  firstRange: number,
  hopRange: number,
  hops: number,
  damage: number,
  struck: Set<Enemy>,
): ChainPoint[] {
  const points: ChainPoint[] = [{ ...from }];
  let cur = from;
  for (let hop = 0; hop < hops; hop++) {
    const candidates = w.queryEnemies(cur.x, cur.y, hop === 0 ? firstRange : hopRange);
    let next: Enemy | null = null;
    let bestD2 = Infinity;
    for (const e of candidates) {
      if (!e.active || e.hp <= 0 || struck.has(e)) continue;
      const d2v = dist2(e.x, e.y, cur.x, cur.y);
      if (d2v < bestD2) {
        bestD2 = d2v;
        next = e;
      }
    }
    if (!next) break;
    struck.add(next);
    points.push({ x: next.x, y: next.y });
    dealDamage(w, next, damage);
    cur = { x: next.x, y: next.y };
  }
  return points;
}
