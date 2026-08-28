/**
 * 西洋魔杖（通用池）—— 会拐弯的追踪星火。
 */
import { TAU } from '../../core/math';
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const wand: WeaponModule = {
  def: {
    id: 'wand', name: '西洋魔杖',
    desc: '番邦奇杖，星火会自己拐弯咬人',
    maxLevel: 8, color: 0xf5d76e, texture: 'icon_wand',
    levels: [
      { damage: 12, cooldown: 1.1, amount: 2, speed: 330, area: 220, duration: 2.2, note: '两缕星火自动索敌' },
      { amount: 3, note: '+1 缕星火' },
      { damage: 17, note: '星火更炽' },
      { amount: 4, cooldown: 0.95, note: '+1 缕星火' },
      { area: 260, duration: 2.5, note: '追踪更久更远' },
      { amount: 6, damage: 23, note: '+2 缕星火' },
      { damage: 31, cooldown: 0.85, note: '星火更炽' },
      { amount: 8, damage: 40, area: 300, duration: 2.8, note: '群星环绕，指哪打哪' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    for (let i = 0; i < s.amount; i++) {
      const a = w.rng.range(0, TAU);
      const p = w.spawnProjectile('wand');
      p.x = w.player.x; p.y = w.player.y;
      p.vx = Math.cos(a) * s.speed; p.vy = Math.sin(a) * s.speed;
      p.radius = 8; p.damage = s.damage; p.pierce = 0;
      p.life = Math.max(s.duration, 1.6);
      p.homing = 4.2; p.rotation = a; p.color = slot.def.color;
    }
    w.emitSfx('shoot');
  },
};
