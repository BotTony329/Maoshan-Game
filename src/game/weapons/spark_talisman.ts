/**
 * 电符（通用池）—— 闪电在敌群之间跳跃连击。
 */
import { chainFrom, tickTimer } from './shared';
import type { Enemy } from '../types';
import type { WeaponModule } from './types';

export const sparkTalisman: WeaponModule = {
  def: {
    id: 'spark_talisman', name: '电符',
    desc: '雷光缠身跳跃，在妖邪之间连串贯穿',
    maxLevel: 8, color: 0x8fd3ff, texture: 'icon_spark',
    levels: [
      { damage: 16, cooldown: 1.8, amount: 2, area: 230, speed: 1, duration: 1, note: '雷光连跳 2 次' },
      { amount: 3, note: '连跳 +1 次' },
      { damage: 22, area: 260, note: '跳距更远' },
      { amount: 4, cooldown: 1.6, note: '连跳 +1 次' },
      { damage: 30, note: '雷威更盛' },
      { amount: 6, area: 290, note: '连跳 +2 次' },
      { damage: 40, cooldown: 1.35, note: '雷威更盛' },
      { amount: 9, damage: 52, area: 330, note: '天雷勾动，链缚群邪' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    const struck = new Set<Enemy>();
    const points = chainFrom(w, { x: w.player.x, y: w.player.y }, s.area, 240, s.amount, s.damage, struck);
    if (points.length === 1) {
      const a = Math.atan2(w.player.faceY, w.player.faceX);
      points.push({ x: w.player.x + Math.cos(a) * s.area * 0.6, y: w.player.y + Math.sin(a) * s.area * 0.6 });
    }
    const h = w.spawnHazard('chain');
    h.dur = 0.22; h.points = points; h.color = slot.def.color;
    w.emitSfx('thunder');
  },
};
