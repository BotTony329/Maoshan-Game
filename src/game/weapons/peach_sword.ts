/**
 * 桃木剑（通用池）—— 绕身飞斩，近身者皆伤。
 */
import { TAU, dist } from '../../core/math';
import { dealDamage } from '../systems/combat';
import type { WeaponModule } from './types';

export const peachSword: WeaponModule = {
  def: {
    id: 'peach_sword', name: '桃木剑',
    desc: '桃木神剑绕身飞斩，近身者皆伤',
    maxLevel: 8, color: 0xe8845c, texture: 'icon_sword',
    levels: [
      { damage: 8, cooldown: 1, amount: 1, speed: 2.4, area: 60, duration: 0.5, note: '一柄桃木剑绕身' },
      { amount: 2, note: '+1 柄桃木剑' },
      { damage: 12, area: 70, note: '剑更大更利' },
      { amount: 3, speed: 3.0, note: '+1 柄，转速提升' },
      { damage: 16, area: 80, duration: 0.4, note: '伤害提升' },
      { amount: 4, note: '+1 柄桃木剑' },
      { damage: 22, area: 95, speed: 3.6, note: '剑罡外放' },
      { amount: 6, damage: 30, area: 110, duration: 0.3, note: '五雷桃木剑阵' },
    ],
  },
  tick(w, slot, s, dt) {
    slot.state.angle = (slot.state.angle + s.speed * dt) % TAU;
    slot.state.radius = s.area;
    slot.state.count = s.amount;
    const key = `${slot.def.id}#${slot.instance}`;
    for (let i = 0; i < s.amount; i++) {
      const a = slot.state.angle + (i * TAU) / s.amount;
      const sx = w.player.x + Math.cos(a) * s.area;
      const sy = w.player.y + Math.sin(a) * s.area;
      const hits = w.queryEnemies(sx, sy, 26);
      for (const e of hits) {
        if ((e.hitCd.get(key) ?? 0) > w.time) continue;
        e.hitCd.set(key, w.time + Math.max(s.duration, 0.2));
        const dd = Math.max(dist(e.x, e.y, w.player.x, w.player.y), 1);
        dealDamage(w, e, s.damage, (e.x - w.player.x) / dd * 90, (e.y - w.player.y) / dd * 90);
      }
    }
  },
};
