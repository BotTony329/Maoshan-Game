/**
 * 玩家系统 —— 移动、无敌帧、受击、经验入库。
 * 函数式模块：只操作 World 公开状态，不持有任何自己的持久状态。
 */
import { ARENA, PLAYER } from '../../data/config';
import { dist2 } from '../../core/math';
import type { World } from '../world';

/** 移动 + 无敌帧 + 生命回复 */
export function updatePlayer(w: World, dt: number): void {
  const p = w.player;
  let ix = (w.input.right ? 1 : 0) - (w.input.left ? 1 : 0);
  let iy = (w.input.down ? 1 : 0) - (w.input.up ? 1 : 0);
  if (ix !== 0 || iy !== 0) {
    const len = Math.hypot(ix, iy);
    ix /= len;
    iy /= len;
    p.faceX = ix;
    p.faceY = iy;
    p.x += ix * p.stats.speed * dt;
    p.y += iy * p.stats.speed * dt;
  }
  p.x = clampPlayer(p.x, ARENA.width);
  p.y = clampPlayer(p.y, ARENA.height);
  p.invuln = Math.max(0, p.invuln - dt);
  if (p.stats.regen > 0) {
    p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen * dt);
  }
}

function clampPlayer(v: number, arena: number): number {
  return v < 30 ? 30 : v > arena - 30 ? arena - 30 : v;
}

/** 经验入库（V3：由模式策略决定是否调用——闯幽冥无升级） */
export function addXp(w: World, v: number): void {
  const p = w.player;
  p.xp += v * p.stats.xpGain;
  let leveled = false;
  while (p.xp >= p.xpToNext) {
    p.xp -= p.xpToNext;
    p.level++;
    p.xpToNext = Math.floor(8 + (p.level - 1) * 6 + Math.pow(p.level, 1.7));
    leveled = true;
  }
  if (leveled) w.refreshStats();
}

/**
 * 玩家受击：无敌帧 + 焰珠反炸 + 死亡结算。
 * 返回实际造成的伤害（0 = 被无敌帧/状态挡下）。
 */
export function applyPlayerDamage(w: World, raw: number): number {
  const p = w.player;
  if (p.invuln > 0 || w.state !== 'PLAYING') return 0;
  const dmg = Math.max(1, Math.round(raw));
  p.hp -= dmg;
  p.invuln = PLAYER.invulnTime;
  w.events.onPlayerHit?.(dmg);
  w.emitSfx('hurt');

  // 焰珠：受击反炸一圈
  if (w.orbIds.includes('flame') && w.flameCd <= 0) {
    w.flameCd = 3;
    const ring = w.spawnHazard('ring');
    ring.x = p.x;
    ring.y = p.y;
    ring.maxR = 130;
    ring.r = 20;
    ring.dur = 0.35;
    ring.damage = 30;
    ring.knockback = 260;
    ring.color = 0xff9a3c;
    w.emitSfx('bell');
  }

  if (p.hp <= 0) {
    p.hp = 0;
    w.state = 'GAME_OVER';
    w.events.onGameOver?.();
  }
  return dmg;
}

/** 宝珠触发器：雷珠定时落雷 / 焰珠受击反炸（属性型宝珠在 World.refreshStats 生效） */
export function updateOrbTriggers(w: World, dt: number): void {
  w.flameCd = Math.max(0, w.flameCd - dt);

  if (w.orbIds.includes('thunder')) {
    w.orbThunderT -= dt;
    if (w.orbThunderT <= 0) {
      w.orbThunderT = 6;
      const pool = w.enemies.filter((e) => dist2(e.x, e.y, w.player.x, w.player.y) < 750 * 750);
      if (pool.length > 0) {
        const e = w.rng.pick(pool);
        const h = w.spawnHazard('strike');
        h.x = e.x;
        h.y = e.y;
        h.r = 75;
        h.dur = 0.5;
        h.damage = 45 + w.player.level * 3;
        h.data = 0;
        h.color = 0x8fd3ff;
      }
    }
  }
}
