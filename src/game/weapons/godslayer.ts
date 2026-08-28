/**
 * 弑神枪（传说）—— 枪出如龙，荡涤满屏妖邪。
 * 地府金融体系的终局目标：标价 999999 文。
 */
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const godslayer: WeaponModule = {
  def: {
    id: 'godslayer', name: '弑神枪',
    desc: '传说神器：枪出如龙，荡涤满屏妖邪',
    maxLevel: 8, color: 0xffd24a, texture: 'icon_godslayer',
    marketOnly: true,
    levels: [
      { damage: 1500, cooldown: 1.2, amount: 1, area: 1, speed: 1, duration: 0.5, note: '枪气荡涤全屏' },
      { damage: 2000, cooldown: 1.15, note: '枪气更烈' },
      { damage: 2600, cooldown: 1.1, note: '枪气更烈' },
      { damage: 3300, cooldown: 1.05, note: '枪气更烈' },
      { damage: 4200, cooldown: 1.0, note: '枪出惊神' },
      { damage: 5400, cooldown: 0.95, note: '枪出惊神' },
      { damage: 7000, cooldown: 0.9, note: '枪出惊神' },
      { damage: 9999, cooldown: 0.8, note: '一枪定乾坤，诸邪退避' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    for (const e of w.enemies) {
      if (!e.active) continue;
      const dx = e.x - w.player.x; const dy = e.y - w.player.y;
      if (dx * dx + dy * dy > 780 * 780) continue;
      w.dealDamage(e, s.damage);
    }
    const h = w.spawnHazard('ring');
    h.follow = false; h.x = w.player.x; h.y = w.player.y;
    h.maxR = 760; h.r = 60; h.dur = Math.max(s.duration, 0.4);
    h.color = slot.def.color;
    w.emitSfx('bomb');
  },
};
