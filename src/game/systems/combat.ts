/**
 * 战斗结算系统 —— 伤害入口、击杀结算、掉落触发。
 * 所有伤害统一走 dealDamage：白闪/飘字/击退/来源标记/击杀派发都在这一处。
 * 模式相关的掉落差异由 modes/ 策略层注入（见 World.dropXpFor）。
 */
import { DROPS, ELITE } from '../../data/config';
import { TAU, dist2 } from '../../core/math';
import type { Enemy } from '../types';
import type { World } from '../world';

/**
 * 对单个敌人结算伤害。
 * @param source 击杀来源标记（如 'pet'），供掉落/成就类特判
 */
export function dealDamage(w: World, e: Enemy, amount: number, kbx = 0, kby = 0, source = ''): void {
  if (!e.active || e.hp <= 0) return;
  // 汲魂（术士杖专属）：被诅咒者魂魄松动，承伤 +25%（含诅咒侵蚀本身，越吸越脆）
  if (w.hasSpecial('warlock_staff', 'siphon') && e.curseUntil > w.time) {
    amount = Math.round(amount * 1.25);
  }
  e.hp -= amount;
  w.damageDealt += amount;
  e.flash = 0.09;
  e.lastHitSource = source;
  const resist = e.def.knockbackResist ?? 0;
  if (resist < 1) {
    e.knockX += kbx * (1 - resist);
    e.knockY += kby * (1 - resist);
  }
  if (w.floaters.length < 80) {
    w.floaters.push({ x: e.x, y: e.y - e.radius, amount: Math.max(1, Math.round(amount)), t: 0 });
  }
  if (e.hp <= 0) killEnemy(w, e);
  else w.emitSfx('hit');
}

/** 击杀结算：计数/回血特判/传染/掉落（掉落表按模式策略分流） */
export function killEnemy(w: World, e: Enemy): void {
  e.active = false;
  w.kills++;
  w.modeStrategy.onEnemyKilled(w, e);
  w.events.onEnemyKilled?.(e);
  w.emitSfx('kill');

  // 血珠 / 吸血镰刀：诛邪回血（镰刀 +2，与术士杖汲魂叠加）
  let healPerKill = 0;
  if (w.equips.includes('blood')) healPerKill += 1;
  if (w.equips.includes('sickle')) healPerKill += 2;
  if (healPerKill > 0) {
    w.player.hp = Math.min(w.player.stats.maxHp, w.player.hp + healPerKill);
  }

  // 噬之鬼面：食魄疗己（闯幽冥面具强化）
  if (w.maskLevels.fang) {
    w.player.hp = Math.min(w.player.stats.maxHp, w.player.hp + 0.5 * w.maskLevels.fang);
  }

  // 汲魂（术士杖专属）：被咒死的敌人精气被抽走，回 2 点生命
  if (w.hasSpecial('warlock_staff', 'siphon') && e.curseUntil > w.time) {
    w.player.hp = Math.min(w.player.stats.maxHp, w.player.hp + 2);
  }

  // 猎弓丰收：地狱犬咬死的猎物魂魄翻倍（无尽模式）
  const petKill = e.lastHitSource === 'pet';

  // 蚀魂咒传染：被咒死的敌人把疫病传给邻近者（深度传染扩大半径）
  if (e.curseUntil > w.time && e.curseDps > 0) {
    const deep = w.hasSpecial('warlock_staff', 'deep_plague');
    const spreadR = deep ? 260 : 110;
    const near = w.queryEnemies(e.x, e.y, spreadR + 46);
    for (const o of near) {
      if (!o.active || o === e) continue;
      if (dist2(o.x, o.y, e.x, e.y) > (spreadR + o.radius) ** 2) continue;
      o.curseDps = Math.max(o.curseDps, e.curseDps * (deep ? 1.5 : 0.7));
      o.curseUntil = Math.max(o.curseUntil, w.time + 2);
      o.curseAcc = 0;
    }
    // 传染视觉：紫色疫环
    const ring = w.spawnHazard('ring');
    ring.x = e.x;
    ring.y = e.y;
    ring.maxR = spreadR;
    ring.r = spreadR * 0.5;
    ring.dur = 0.3;
    ring.color = 0x9a5ac8;
  }
  e.curseDps = 0;
  e.curseUntil = 0;

  // 掉落表按模式策略分流（闯幽冥不掉魂魄；无尽按稀有度掉落）
  w.modeStrategy.dropLoot(w, e, petKill);

  if (e.def.boss) w.boss = null;
  void DROPS;
  void ELITE;
  void TAU;
}
