/**
 * 八卦镜（通用池）—— 朝敌群方向射出光束。
 */
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const baguaMirror: WeaponModule = {
  def: {
    id: 'bagua_mirror', name: '八卦镜',
    desc: '镜光如练，灼穿一线妖魔',
    maxLevel: 8, color: 0x9fd8ff, texture: 'icon_mirror',
    levels: [
      { damage: 14, cooldown: 2.2, amount: 1, area: 420, speed: 1, duration: 0.55, note: '射出一线镜光' },
      { damage: 20, note: '光束更炽' },
      { duration: 0.75, area: 480, note: '照射更久更远' },
      { damage: 27, note: '光束更炽' },
      { amount: 2, cooldown: 2.0, note: '双镜齐射' },
      { damage: 36, duration: 0.9, note: '光束更炽' },
      { area: 560, cooldown: 1.8, note: '镜光更长' },
      { amount: 3, damage: 48, duration: 1.1, note: '八卦镜阵，三光涤秽' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, s.area * 1.2);
    for (let i = 0; i < s.amount; i++) {
      const t = targets.length > 0 ? targets[i % targets.length] : null;
      const angle = t ? Math.atan2(t.y - w.player.y, t.x - w.player.x) : Math.atan2(w.player.faceY, w.player.faceX);
      const h = w.spawnHazard('beam');
      h.x = w.player.x; h.y = w.player.y;
      h.angle = angle; h.maxR = s.area;
      h.width = 22 * (0.8 + s.area / 500);
      h.dur = s.duration; h.tickEvery = 0.22; h.damage = s.damage;
      h.color = slot.def.color;
    }
    w.emitSfx('shoot');
  },
};
