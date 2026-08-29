/**
 * 萨满锤（主武器）—— 巨锤横扫震地，怪越密刀越快。
 * 专属：闪电箭（锤击向 2 名敌人放电）、图腾召唤（周期放置图腾电击周围）。
 */
import { TAU } from '../../core/math';
import { chainFrom } from './shared';
import { tickTimer } from './shared';
import type { Enemy, WeaponModule } from './types';

export const shamanHammer: WeaponModule = {
  def: {
    id: 'shaman_hammer',
    name: '萨满锤',
    desc: '雷纹巨锤震击周身，360°荡开妖邪',
    maxLevel: 8,
    color: 0x7ec8a0,
    texture: 'icon_hammer',
    base: true,
    price: 450,
    levels: [
      { damage: 38, cooldown: 1.5, amount: 1, area: 120, speed: 1, duration: 0.22, pierce: 0, knockback: 300, note: '震击周身一圈' },
      { damage: 50, note: '锤锋更沉' },
      { area: 140, knockback: 340, note: '震得更远' },
      { amount: 2, cooldown: 1.35, note: '连震两波' },
      { damage: 66, area: 155, note: '锤锋更沉' },
      { cooldown: 1.2, knockback: 380, note: '抡锤更快' },
      { damage: 88, area: 170, note: '锤罡纵横' },
      { amount: 3, damage: 112, area: 185, duration: 0.18, note: '雷锤震八荒，周身无活口' },
    ],
    exclusives: [
      { id: 'chainstrike', name: '闪电箭', desc: '锤击命中时向最多 2 名敌人放出跳跃雷光' },
      { id: 'totem', name: '图腾召唤', desc: '每 8 秒放置图腾，电击周围妖邪' },
    ],
  },

  tick(w, slot, s, dt) {
    // 图腾召唤：周期布置，图腾本体是 hazard（系统层电击）
    if (slot.specials.includes('totem')) {
      slot.state.totemT = (slot.state.totemT ?? 2) - dt;
      if (slot.state.totemT <= 0) {
        slot.state.totemT = 8;
        const a = w.rng.range(0, TAU);
        const h = w.spawnHazard('totem');
        h.x = w.player.x + Math.cos(a) * 70;
        h.y = w.player.y + Math.sin(a) * 70;
        h.maxR = 210;              // 电击半径
        h.r = 12;                  // 图腾体半径
        h.dur = 5;
        h.damage = Math.max(10, s.damage * 0.5);
        h.data = 0.8;              // 电击间隔
        h.color = slot.def.color;
        w.emitSfx('thunder');
      }
    }

    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;

    // 360° 震击：周身一圈全部命中，amount = 连震波数
    for (let i = 0; i < s.amount; i++) {
      const hits = w.queryEnemies(w.player.x, w.player.y, s.area + 46);
      const struck = new Set<Enemy>();
      for (const e of hits) {
        if (!e.active || e.hp <= 0) continue;
        const dx = e.x - w.player.x;
        const dy = e.y - w.player.y;
        const d = Math.max(Math.hypot(dx, dy), 1);
        if (d > s.area + e.radius) continue;
        w.dealDamage(e, s.damage, (dx / d) * s.knockback, (dy / d) * s.knockback);
        struck.add(e);
      }
      // 一震三敌返还 30% 冷却：怪越密锤越快
      if (struck.size >= 3) slot.timer = Math.max(slot.timer - s.cooldown * 0.3, 0.15);
      // 闪电箭：锤击命中即放电，从被锤者跳向邻近敌人（每波最多两簇）
      if (slot.specials.includes('chainstrike')) {
        let sparks = 2;
        for (const e of struck) {
          if (sparks <= 0) break;
          sparks--;
          const pts = chainFrom(w, { x: e.x, y: e.y }, 240, 240, 2, Math.max(8, s.damage * 0.4), struck);
          const hz = w.spawnHazard('chain');
          hz.dur = 0.22;
          hz.points = pts;
          hz.color = 0x8fd3ff;
        }
      }
    }
    w.emitSfx('shoot');
  },
};
