/**
 * 召唤物系统 —— 无敌友军（地狱犬/骷髅犬/未来召唤）。
 * 泛化自旧版单灵犬：数量上限、按类索敌参数、来源标记结算。
 */
import { dealDamage } from './combat';
import type { World } from '../world';

/** 召唤物上限：所有类型共用，防止刷屏 */
export const ALLY_CAP = 4;

export interface AllySpec {
  /** hitCd 来源标记（决定掉落特判，如 'pet'） */
  source: string;
  damage: number;
  speed: number;
  /** 索敌半径 */
  range: number;
}

export const ALLY_SPECS: Record<string, AllySpec> = {
  hound: { source: 'pet', damage: 14, speed: 265, range: 480 },
  skelldog: { source: 'ally:skelldog', damage: 11, speed: 250, range: 440 },
};

export function spawnAlly(w: World, kind: string, x: number, y: number, cap = ALLY_CAP): boolean {
  if (w.allies.length >= cap) return false;
  if (!ALLY_SPECS[kind]) return false;
  w.allies.push({
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    faceX: 1,
    faceY: 0,
  });
  return true;
}

/** 移除所有某类召唤物（召唤师杖献祭等未来用途） */
export function clearAllies(w: World, kind?: string): void {
  w.allies = kind ? w.allies.filter((a) => a.kind !== kind) : [];
}

export function updateAllies(w: World, dt: number): void {
  const p = w.player;
  for (const a of w.allies) {
    const spec = ALLY_SPECS[a.kind];
    const target = w.nearestEnemies(a.x, a.y, 1, spec.range)[0] ?? null;

    let tx: number;
    let ty: number;
    let speed: number;
    if (target) {
      tx = target.x;
      ty = target.y;
      speed = spec.speed;
    } else {
      // 跟随位：主人身后 46px
      tx = p.x - p.faceX * 46;
      ty = p.y - p.faceY * 46;
      speed = spec.speed + 65;
    }

    const dx = tx - a.x;
    const dy = ty - a.y;
    const d = Math.hypot(dx, dy);
    if (d > (target ? 6 : 14)) {
      a.faceX = dx / d;
      a.faceY = dy / d;
      a.x += a.faceX * speed * dt;
      a.y += a.faceY * speed * dt;
    }

    if (target) {
      const biteDist = Math.hypot(target.x - a.x, target.y - a.y);
      const key = `ally#${a.kind}`;
      if (biteDist < target.radius + 14 && (target.hitCd.get(key) ?? 0) <= w.time) {
        target.hitCd.set(key, w.time + 0.8);
        // 伤害随道行成长；source 标记供掉落特判（猎弓丰收等）
        dealDamage(w, target, spec.damage + w.player.level, a.faceX * 110, a.faceY * 110, spec.source);
      }
    }
  }
}
