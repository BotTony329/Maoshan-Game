/**
 * 萨满锤（主武器）—— 巨锤横扫震地，怪越密刀越快。
 * 专属：闪电箭（锤击向 2 名敌人放电）、图腾召唤（周期放置图腾电击周围）。
 */
import { TAU } from '../../core/math';
import { chainFrom } from './shared';
import { tickTimer } from './shared';
import { spawnAlly } from '../systems/allies';
import type { WeaponModule } from './types';

const SWEEP_HALF_ANGLE = Math.PI * 0.42;

export const shamanHammer: WeaponModule = {
  def: {
    id: 'shaman_hammer',
    name: '萨满锤',
    desc: '雷纹巨锤横扫一片，怪越密越是趁手',
    maxLevel: 8,
    color: 0x7ec8a0,
    texture: 'icon_hammer',
    base: true,
    price: 450,
    levels: [
      { damage: 38, cooldown: 1.5, amount: 1, area: 120, speed: 1, duration: 0.22, pierce: 0, knockback: 300, note: '横扫面朝一片' },
      { damage: 50, note: '锤锋更沉' },
      { area: 140, knockback: 340, note: '扫得更远' },
      { amount: 2, cooldown: 1.35, note: '前后两向连扫' },
      { damage: 66, area: 155, note: '锤锋更沉' },
      { cooldown: 1.2, knockback: 380, note: '抡锤更快' },
      { damage: 88, area: 170, note: '锤罡纵横' },
      { amount: 3, damage: 112, area: 185, duration: 0.18, note: '雷锤临凡，横扫八荒' },
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

    const reach = s.area;
    for (let i = 0; i < s.amount; i++) {
      const base = Math.atan2(w.player.faceY, w.player.faceX);
      const angle = base + (i * TAU) / s.amount;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const hits = w.queryEnemies(w.player.x, w.player.y, reach + 46);
      let sweepHits = 0;
      const struck = new Set<import('../types').Enemy>();
      for (const e of hits) {
        if (!e.active || e.hp <= 0) continue;
        const dx = e.x - w.player.x;
        const dy = e.y - w.player.y;
        const d = Math.hypot(dx, dy);
        if (d > reach + e.radius) continue;
        if ((dx / Math.max(d, 1)) * cos + (dy / Math.max(d, 1)) * sin < Math.cos(SWEEP_HALF_ANGLE)) continue;
        w.dealDamage(e, s.damage, (dx / Math.max(d, 1)) * s.knockback, (dy / Math.max(d, 1)) * s.knockback);
        struck.add(e);
        sweepHits++;
      }
      // 一扫三敌返还 30% 冷却：怪越密锤越快
      if (sweepHits >= 3) slot.timer = Math.max(slot.timer - s.cooldown * 0.3, 0.15);
      // 闪电箭：锤击命中即放电，从被锤者跳向邻近敌人
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
    void spawnAlly;
  },
};
