/**
 * 铜钱剑（通用池）—— 朝面朝方向掷出穿邪钱剑。
 */
import { TAU } from '../../core/math';
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const coinSword: WeaponModule = {
  def: {
    id: 'coin_sword', name: '铜钱剑',
    desc: '古钱串剑破邪而出，贯穿成排鬼怪',
    maxLevel: 8, color: 0xf0c33c, texture: 'icon_coin',
    levels: [
      { damage: 22, cooldown: 1.6, amount: 1, speed: 520, area: 1, duration: 1.5, pierce: 3, note: '掷出穿邪钱剑' },
      { pierce: 5, note: '穿透提升' },
      { amount: 2, damage: 28, note: '+1 柄钱剑' },
      { cooldown: 1.35, speed: 600, note: '出剑更快' },
      { pierce: 8, damage: 34, note: '穿透大幅提升' },
      { amount: 3, note: '+1 柄钱剑' },
      { damage: 44, cooldown: 1.15, note: '伤害提升' },
      { amount: 5, pierce: 12, damage: 55, note: '万贯钱剑，贯穿尸山' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    const base = Math.abs(w.player.faceX) + Math.abs(w.player.faceY) > 0
      ? Math.atan2(w.player.faceY, w.player.faceX)
      : w.rng.range(0, TAU);
    for (let i = 0; i < s.amount; i++) {
      const angle = base + (i - (s.amount - 1) / 2) * 0.18;
      const p = w.spawnProjectile('coin');
      p.x = w.player.x; p.y = w.player.y;
      p.vx = Math.cos(angle) * s.speed;
      p.vy = Math.sin(angle) * s.speed;
      p.radius = 13 * s.area;
      p.damage = s.damage; p.pierce = s.pierce; p.life = 1.5;
      p.rotation = angle; p.color = slot.def.color;
    }
    w.emitSfx('shoot');
  },
};
