/**
 * 武器行为策略 —— 每把武器一个 tick 函数，经 WEAPON_BEHAVIORS 注册表派发。
 * 新武器 = 新策略函数 + 数据条目，不改任何现有代码。
 *
 * 约定：
 * - 行为只通过 World 提供的 API 产生弹幕/区域/伤害，不直接碰渲染。
 * - 桃木剑(orbit)与糯米阵(aura)是“常驻判定”，直接查网格结算，
 *   不产生 Hazard 实体；渲染层从 slot.state 读取外观参数。
 */
import { dist, dist2, pointSegDist2, TAU } from '../core/math';
import type { World } from './world';
import type { Enemy, Hazard, Player, WeaponSlot, WeaponStats } from './types';

export type WeaponBehavior = (w: World, slot: WeaponSlot, s: WeaponStats, dt: number) => void;

/** 冷却到期返回 true（调用方负责重置） */
function tickTimer(slot: WeaponSlot, dt: number): boolean {
  slot.timer -= dt;
  return slot.timer <= 0;
}

// ---------------------------------------------------------------- 飞符

const talisman: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, 900);
  for (let i = 0; i < s.amount; i++) {
    let angle: number;
    const t = targets.length > 0 ? targets[i % targets.length] : null;
    if (t) {
      angle = Math.atan2(t.y - w.player.y, t.x - w.player.x);
    } else {
      // 无可索之敌时朝面朝方向空放，保持出手节奏
      angle = Math.atan2(w.player.faceY, w.player.faceX);
    }
    // 多符齐发带少许散布，避免完全重叠
    angle += w.rng.range(-0.06, 0.06) * i;
    const p = w.spawnProjectile('talisman');
    p.x = w.player.x;
    p.y = w.player.y;
    p.vx = Math.cos(angle) * s.speed;
    p.vy = Math.sin(angle) * s.speed;
    p.radius = 9 * s.area;
    p.damage = s.damage;
    p.pierce = s.pierce;
    p.life = 1.8;
    p.rotation = angle;
    p.color = slot.def.color;
  }
  w.emitSfx('shoot');
};

// ---------------------------------------------------------------- 桃木剑（环绕）

const orbit: WeaponBehavior = (w, slot, s, dt) => {
  slot.state.angle = (slot.state.angle + s.speed * dt) % TAU;
  slot.state.radius = s.area;
  slot.state.count = s.amount;
  // duration 复用为“对同一敌人的重复命中间隔”
  const key = `${slot.def.id}#${slot.instance}`;
  for (let i = 0; i < s.amount; i++) {
    const a = slot.state.angle + (i * TAU) / s.amount;
    const sx = w.player.x + Math.cos(a) * s.area;
    const sy = w.player.y + Math.sin(a) * s.area;
    const hits = w.queryEnemies(sx, sy, 26);
    for (const e of hits) {
      const ready = e.hitCd.get(key) ?? 0;
      if (ready > w.time) continue;
      e.hitCd.set(key, w.time + Math.max(s.duration, 0.2));
      const kx = (e.x - w.player.x) / Math.max(dist(e.x, e.y, w.player.x, w.player.y), 1);
      const ky = (e.y - w.player.y) / Math.max(dist(e.x, e.y, w.player.x, w.player.y), 1);
      w.dealDamage(e, s.damage, kx * 90, ky * 90);
    }
  }
};

// ---------------------------------------------------------------- 糯米阵（光环）

const AURA_SLOW = 0.25; // 所有等级统一 25% 减速：驱邪控场是它的定位，不随等级膨胀

const aura: WeaponBehavior = (w, slot, s, dt) => {
  slot.state.radius = s.area;
  const key = `${slot.def.id}#${slot.instance}`;
  const hits = w.queryEnemies(w.player.x, w.player.y, s.area);
  for (const e of hits) {
    const ready = e.hitCd.get(key) ?? 0;
    if (ready > w.time) continue;
    e.hitCd.set(key, w.time + Math.max(s.cooldown, 0.2));
    e.slowFactor = Math.min(e.slowFactor, 1 - AURA_SLOW);
    e.slowUntil = Math.max(e.slowUntil, w.time + 0.5);
    w.dealDamage(e, s.damage);
  }
};

// ---------------------------------------------------------------- 铜钱剑（穿透重弹）

const coin: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  // 朝面朝方向掷出；多柄呈扇形展开
  const base = Math.abs(w.player.faceX) + Math.abs(w.player.faceY) > 0
    ? Math.atan2(w.player.faceY, w.player.faceX)
    : w.rng.range(0, TAU);
  for (let i = 0; i < s.amount; i++) {
    const angle = base + (i - (s.amount - 1) / 2) * 0.18;
    const p = w.spawnProjectile('coin');
    p.x = w.player.x;
    p.y = w.player.y;
    p.vx = Math.cos(angle) * s.speed;
    p.vy = Math.sin(angle) * s.speed;
    p.radius = 13 * s.area;
    p.damage = s.damage;
    p.pierce = s.pierce;
    p.life = 1.5;
    p.rotation = angle;
    p.color = slot.def.color;
  }
  w.emitSfx('shoot');
};

// ---------------------------------------------------------------- 八卦镜（光束）

const mirror: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, s.area * 1.2);
  for (let i = 0; i < s.amount; i++) {
    const t = targets.length > 0 ? targets[i % targets.length] : null;
    const angle = t
      ? Math.atan2(t.y - w.player.y, t.x - w.player.x)
      : Math.atan2(w.player.faceY, w.player.faceX);
    const h = w.spawnHazard('beam');
    h.x = w.player.x;
    h.y = w.player.y;
    h.angle = angle;
    h.maxR = s.area;          // 光束长度
    h.width = 22 * (0.8 + s.area / 500); // 半宽随长度轻度增长
    h.dur = s.duration;
    h.tickEvery = 0.22;
    h.damage = s.damage;
    h.color = slot.def.color;
  }
  w.emitSfx('shoot');
};

// ---------------------------------------------------------------- 镇魂铃（冲击环）

const bell: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  const h = w.spawnHazard('ring');
  h.x = w.player.x;
  h.y = w.player.y;
  h.maxR = s.area;
  h.r = 12;
  h.dur = Math.max(s.duration, 0.3);
  h.damage = s.damage;
  h.knockback = s.knockback;
  h.color = slot.def.color;
  w.emitSfx('bell');
};

// ---------------------------------------------------------------- 天雷符（落雷）

const thunder: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  // 从可视范围内随机挑目标；敌稀时落点散布在玩家附近
  const pool = w.enemies.filter((e) => dist(e.x, e.y, w.player.x, w.player.y) < 750);
  for (let i = 0; i < s.amount; i++) {
    let x: number;
    let y: number;
    if (pool.length > 0) {
      const e = w.rng.pick(pool);
      x = e.x;
      y = e.y;
    } else {
      x = w.player.x + w.rng.range(-300, 300);
      y = w.player.y + w.rng.range(-300, 300);
    }
    const h = w.spawnHazard('strike');
    h.x = x;
    h.y = y;
    h.r = s.area;      // 落雷判定半径
    h.dur = s.duration; // 前段警示，末段落雷
    h.damage = s.damage;
    h.data = 0;         // 0 = 尚未落下
    h.color = slot.def.color;
  }
};

// ---------------------------------------------------------------- 墨斗线（螺旋墨刃）

const ink: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  const h = w.spawnHazard('spiral');
  h.follow = true;
  h.x = w.player.x;
  h.y = w.player.y;
  h.maxR = s.area;
  h.dur = s.duration;
  h.angle = w.rng.range(0, TAU);
  h.spin = s.speed;      // rad/s
  h.damage = s.damage;
  h.tickEvery = 0.3;
  h.data = s.amount;     // 臂数
  h.color = slot.def.color;
};

// ---------------------------------------------------------------- 火符（爆裂弹）

const bomb: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, 700);
  for (let i = 0; i < s.amount; i++) {
    const t = targets.length > 0 ? targets[i % targets.length] : null;
    // 朝目标大致方向抛射，弹道偏差让它像“掷”而非“射”
    const angle = t
      ? Math.atan2(t.y - w.player.y, t.x - w.player.x) + w.rng.range(-0.2, 0.2)
      : Math.atan2(w.player.faceY, w.player.faceX) + w.rng.range(-0.3, 0.3);
    const p = w.spawnProjectile('fire');
    p.x = w.player.x;
    p.y = w.player.y;
    p.vx = Math.cos(angle) * s.speed;
    p.vy = Math.sin(angle) * s.speed;
    p.radius = 10;
    p.damage = s.damage;
    p.pierce = 0;
    p.life = Math.max(s.duration, 1.2);
    p.blast = s.area; // area 字段复用为爆裂半径
    p.rotation = angle;
    p.color = slot.def.color;
  }
  w.emitSfx('shoot');
};

// ---------------------------------------------------------------- 电符（闪电链）

const chain: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  // 萨满道途天赋：闪电链多跳 4 次、跳距更远
  const isShaman = w.classId === 'shaman';
  const hops = s.amount + (isShaman ? 4 : 0);
  const hopRange = isShaman ? 300 : 240;
  // 第一跳找最近的敌人，其后逐跳找未击中过的最近者
  let from = { x: w.player.x, y: w.player.y };
  const struck = new Set<Enemy>();
  const points: { x: number; y: number }[] = [{ ...from }];

  for (let hop = 0; hop < hops; hop++) {
    const candidates = w.queryEnemies(from.x, from.y, hop === 0 ? s.area : hopRange);
    let next: Enemy | null = null;
    let bestD2 = Infinity;
    for (const e of candidates) {
      if (!e.active || e.hp <= 0 || struck.has(e)) continue;
      const d2v = dist2(e.x, e.y, from.x, from.y);
      if (d2v < bestD2) {
        bestD2 = d2v;
        next = e;
      }
    }
    if (!next) break;
    struck.add(next);
    points.push({ x: next.x, y: next.y });
    w.dealDamage(next, s.damage);
    from = { x: next.x, y: next.y };
  }

  // 打空一跳都没中也要有雷光反馈（朝面朝方向虚晃一道）
  if (points.length === 1) {
    const a = Math.atan2(w.player.faceY, w.player.faceX);
    points.push({ x: w.player.x + Math.cos(a) * s.area * 0.6, y: w.player.y + Math.sin(a) * s.area * 0.6 });
  }

  const h = w.spawnHazard('chain');
  h.dur = 0.22;
  h.points = points;
  h.color = slot.def.color;
  w.emitSfx('thunder');
};

// ---------------------------------------------------------------- 关刀（横扫）

const SWEEP_HALF_ANGLE = Math.PI * 0.42; // 约 ±75° 扇面

const sweep: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  // 武士道途天赋：扫击范围 +30%
  const reach = s.area * (w.classId === 'warrior' ? 1.3 : 1);
  // amount > 1 时在面朝方向基础上均分多个扫向，形成连环刀
  for (let i = 0; i < s.amount; i++) {
    const base = Math.atan2(w.player.faceY, w.player.faceX);
    const angle = base + (i * TAU) / s.amount;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let sweepHits = 0;
    const hits = w.queryEnemies(w.player.x, w.player.y, reach + 46);
    for (const e of hits) {
      if (!e.active || e.hp <= 0) continue;
      const dx = e.x - w.player.x;
      const dy = e.y - w.player.y;
      const d = Math.hypot(dx, dy);
      if (d > reach + e.radius) continue;
      // 扇面判定：单位向量点积
      if ((dx / Math.max(d, 1)) * cos + (dy / Math.max(d, 1)) * sin < Math.cos(SWEEP_HALF_ANGLE)) continue;
      w.dealDamage(e, s.damage, (dx / Math.max(d, 1)) * s.knockback, (dy / Math.max(d, 1)) * s.knockback);
      sweepHits++;
    }
    // 武士道途天赋：一扫三敌，返还 30% 冷却——怪越密刀越快
    if (sweepHits >= 3) {
      slot.timer = Math.max(slot.timer - s.cooldown * 0.3, 0.15);
    }

    const h = w.spawnHazard('sweep');
    h.follow = false;
    h.x = w.player.x;
    h.y = w.player.y;
    h.angle = angle;
    h.r = reach;
    h.dur = Math.max(s.duration, 0.18);
    h.color = slot.def.color;
  }
  w.emitSfx('shoot');
};

// ---------------------------------------------------------------- 蚀魂咒（诅咒 DoT）

/**
 * 诅咒弹：命中后不直接致死，而是挂上持续侵蚀（伤害在 World.updateEnemies 内分期结算）；
 * 被咒死的敌人会把疫病传给邻近者——术士的“邪恶巫术”核心。
 */
const curse: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, 650);
  for (let i = 0; i < s.amount; i++) {
    const t = targets.length > 0 ? targets[i % targets.length] : null;
    const angle = t
      ? Math.atan2(t.y - w.player.y, t.x - w.player.x)
      : Math.atan2(w.player.faceY, w.player.faceX);
    const p = w.spawnProjectile('curse');
    p.x = w.player.x;
    p.y = w.player.y;
    p.vx = Math.cos(angle) * s.speed;
    p.vy = Math.sin(angle) * s.speed;
    p.radius = 9;
    p.damage = s.damage;
    p.pierce = 0;
    p.life = Math.max(s.duration, 2);
    // blast 字段在诅咒弹上复用为“侵蚀持续秒数”
    p.blast = Math.max(s.duration, 2);
    p.rotation = angle;
    p.color = slot.def.color;
  }
  w.emitSfx('shoot');
};

// ---------------------------------------------------------------- 西洋魔杖（追踪星火）

const wand: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  for (let i = 0; i < s.amount; i++) {
    const a = w.rng.range(0, TAU);
    const p = w.spawnProjectile('wand');
    p.x = w.player.x;
    p.y = w.player.y;
    p.vx = Math.cos(a) * s.speed;
    p.vy = Math.sin(a) * s.speed;
    p.radius = 8;
    p.damage = s.damage;
    p.pierce = 0;
    p.life = Math.max(s.duration, 1.6);
    // area 复用为索敌半径；转向速率随武器等级区间固定，手感统一
    p.homing = 4.2;
    p.rotation = a;
    p.color = slot.def.color;
  }
  w.emitSfx('shoot');
};

// ---------------------------------------------------------------- 弑神枪（传说）

/**
 * 枪出如龙：对可视范围内一切妖邪造成巨额伤害。
 * 传说神器——地府金融体系的终极目标，标价 999999 文。
 */
const nuke: WeaponBehavior = (w, slot, s, dt) => {
  if (!tickTimer(slot, dt)) return;
  slot.timer = s.cooldown;

  for (const e of w.enemies) {
    if (!e.active) continue;
    if (dist2(e.x, e.y, w.player.x, w.player.y) > 780 * 780) continue;
    w.dealDamage(e, s.damage);
  }

  const h = w.spawnHazard('ring');
  h.follow = false;
  h.x = w.player.x;
  h.y = w.player.y;
  h.maxR = 760;
  h.r = 60;
  h.dur = Math.max(s.duration, 0.4);
  h.color = 0xffd24a;
  w.emitSfx('bomb');
};

// ---------------------------------------------------------------- 注册表

export const WEAPON_BEHAVIORS: Record<string, WeaponBehavior> = {
  talisman, orbit, aura, coin, mirror, bell, thunder, ink,
  bomb, chain, sweep, wand, curse, nuke,
};

// ---------------------------------------------------------------- 数值结算

const FIELD_DEFAULTS: WeaponStats = {
  damage: 0, cooldown: 1, amount: 1, area: 1,
  speed: 1, duration: 1, pierce: 0, knockback: 0,
};
const STAT_FIELDS = Object.keys(FIELD_DEFAULTS) as (keyof WeaponStats)[];

/**
 * 计算某武器槽位在当前等级与玩家加成下的最终数值。
 * 规则：Lv1 提供全量基础值，其后各级覆盖同名字段，逐级叠加合并；
 * 最后套用玩家被动（伤害乘算 / 冷却缩短 / 范围乘算）。
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
  return out;
}

/** 敌人 hitCd 表的键：同武器多实例（理论上不会出现，但键含实例号更稳） */
export function slotKey(slot: WeaponSlot): string {
  return `${slot.def.id}#${slot.instance}`;
}

/**
 * 螺旋墨刃第 i 臂的世界坐标 —— 逻辑与渲染共用同一公式，保证判定与画面一致。
 */
export function spiralBladePos(h: Hazard, i: number): { x: number; y: number } {
  const n = Math.max(1, Math.round(h.data));
  const a = h.angle + (i * TAU) / n;
  return { x: h.x + Math.cos(a) * h.r, y: h.y + Math.sin(a) * h.r };
}

/**
 * 八卦镜光束命中判定：点到线段距离 —— 逻辑与渲染共用。
 */
export function beamHits(h: Hazard, x: number, y: number, radius: number): boolean {
  const ex = h.x + Math.cos(h.angle) * h.maxR;
  const ey = h.y + Math.sin(h.angle) * h.maxR;
  return pointSegDist2(x, y, h.x, h.y, ex, ey) <= (h.width / 2 + radius) ** 2;
}
