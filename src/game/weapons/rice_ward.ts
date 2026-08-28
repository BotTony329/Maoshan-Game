/**
 * 糯米阵（通用池）—— 贴身光环，灼烧+减速。
 */
import { dealDamage } from '../systems/combat';
import type { WeaponModule } from './types';

const AURA_SLOW = 0.25;

export const riceWard: WeaponModule = {
  def: {
    id: 'rice_ward', name: '糯米阵',
    desc: '糯米驱邪，周身阴秽受灼且迟滞',
    maxLevel: 8, color: 0xe8e2c9, texture: 'icon_rice',
    levels: [
      { damage: 4, cooldown: 0.5, amount: 1, area: 90, speed: 1, duration: 1, note: '糯米灼烧近身之敌' },
      { area: 110, note: '阵域扩大' },
      { damage: 6, note: '灼烧更烈' },
      { area: 135, cooldown: 0.45, note: '阵域继续扩大' },
      { damage: 9, note: '灼烧更烈' },
      { area: 160, note: '阵域扩大' },
      { damage: 13, cooldown: 0.35, note: '灼烧更烈' },
      { area: 195, damage: 18, note: '糯米如雪，邪祟辟易' },
    ],
  },
  tick(w, slot, s, dt) {
    slot.state.radius = s.area;
    const key = `${slot.def.id}#${slot.instance}`;
    const hits = w.queryEnemies(w.player.x, w.player.y, s.area);
    for (const e of hits) {
      if ((e.hitCd.get(key) ?? 0) > w.time) continue;
      e.hitCd.set(key, w.time + Math.max(s.cooldown, 0.2));
      e.slowFactor = Math.min(e.slowFactor, 1 - AURA_SLOW);
      e.slowUntil = Math.max(e.slowUntil, w.time + 0.5);
      dealDamage(w, e, s.damage);
    }
  },
};
