/**
 * 镇魂铃（通用池）—— 以自身为中心荡开冲击环。
 */
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const soulBell: WeaponModule = {
  def: {
    id: 'soul_bell', name: '镇魂铃',
    desc: '铃音荡开，震退周身鬼怪',
    maxLevel: 8, color: 0xc9a2ff, texture: 'icon_bell',
    levels: [
      { damage: 12, cooldown: 2.6, amount: 1, area: 150, speed: 1, duration: 0.45, knockback: 220, note: '荡开一圈铃音' },
      { area: 185, note: '音域扩大' },
      { damage: 18, knockback: 260, note: '震退更强' },
      { area: 225, cooldown: 2.3, note: '音域扩大' },
      { damage: 26, knockback: 300, note: '震退更强' },
      { area: 270, cooldown: 2.0, note: '音域扩大' },
      { damage: 36, knockback: 340, note: '铃音催魂' },
      { area: 330, damage: 48, knockback: 380, duration: 0.35, note: '九霄铃音，群魔退散' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    const h = w.spawnHazard('ring');
    h.x = w.player.x; h.y = w.player.y;
    h.maxR = s.area; h.r = 12;
    h.dur = Math.max(s.duration, 0.3);
    h.damage = s.damage; h.knockback = s.knockback;
    h.color = slot.def.color;
    w.emitSfx('bell');
  },
};
