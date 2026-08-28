/**
 * 天雷符（通用池）—— 随机落雷轰击敌群。
 */
import { dist } from '../../core/math';
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const thunder: WeaponModule = {
  def: {
    id: 'thunder', name: '天雷符',
    desc: '召天雷轰击敌群，雷落之处焦土成片',
    maxLevel: 8, color: 0x8fd3ff, texture: 'icon_thunder',
    levels: [
      { damage: 30, cooldown: 2.8, amount: 1, area: 70, speed: 1, duration: 0.5, note: '一道天雷落下' },
      { amount: 2, note: '+1 道天雷' },
      { damage: 42, area: 80, note: '雷区扩大' },
      { amount: 3, cooldown: 2.5, note: '+1 道天雷' },
      { damage: 56, note: '雷威更盛' },
      { amount: 4, area: 95, note: '+1 道天雷' },
      { damage: 74, cooldown: 2.2, note: '雷威更盛' },
      { amount: 6, damage: 95, area: 115, duration: 0.4, note: '五雷正法，天罚降世' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    const pool = w.enemies.filter((e) => dist(e.x, e.y, w.player.x, w.player.y) < 750);
    for (let i = 0; i < s.amount; i++) {
      let x: number; let y: number;
      if (pool.length > 0) { const e = w.rng.pick(pool); x = e.x; y = e.y; }
      else { x = w.player.x + w.rng.range(-300, 300); y = w.player.y + w.rng.range(-300, 300); }
      const h = w.spawnHazard('strike');
      h.x = x; h.y = y; h.r = s.area; h.dur = s.duration;
      h.damage = s.damage; h.data = 0; h.color = slot.def.color;
    }
  },
};
