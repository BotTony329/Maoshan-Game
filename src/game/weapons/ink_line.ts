/**
 * 墨斗线（通用池）—— 螺旋扩散的墨刃。
 */
import { TAU } from '../../core/math';
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const inkLine: WeaponModule = {
  def: {
    id: 'ink_line', name: '墨斗线',
    desc: '墨线旋绕而出，如龙卷扫荡四野',
    maxLevel: 8, color: 0x5a5f8c, texture: 'icon_ink',
    levels: [
      { damage: 9, cooldown: 3.4, amount: 2, area: 60, speed: 3.2, duration: 2.0, note: '墨刃两道旋出' },
      { amount: 3, note: '+1 道墨刃' },
      { damage: 13, area: 75, note: '墨刃更长' },
      { amount: 4, duration: 2.4, note: '+1 道墨刃' },
      { damage: 18, speed: 3.8, note: '旋转更急' },
      { amount: 5, area: 90, note: '+1 道墨刃' },
      { damage: 24, duration: 2.8, note: '墨刃更长' },
      { amount: 8, damage: 32, area: 110, speed: 4.4, duration: 3.2, note: '墨龙缠身，秽尽皆摧' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    const h = w.spawnHazard('spiral');
    h.follow = true; h.x = w.player.x; h.y = w.player.y;
    h.maxR = s.area; h.dur = s.duration;
    h.angle = w.rng.range(0, TAU); h.spin = s.speed;
    h.damage = s.damage; h.tickEvery = 0.3; h.data = s.amount;
    h.color = slot.def.color;
  },
};
