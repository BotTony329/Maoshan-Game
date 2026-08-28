/**
 * 火符（通用池）—— 抛射爆裂符，命中爆炸波及范围。
 */
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const fireTalisman: WeaponModule = {
  def: {
    id: 'fire_talisman', name: '火符',
    desc: '三昧真火附符而爆，炸开一片焦土',
    maxLevel: 8, color: 0xff7a3c, texture: 'icon_fire',
    levels: [
      { damage: 26, cooldown: 1.6, amount: 1, speed: 300, area: 62, duration: 1.6, note: '掷出爆裂火符' },
      { area: 74, note: '爆裂范围扩大' },
      { amount: 2, damage: 34, note: '+1 张火符' },
      { cooldown: 1.4, speed: 340, note: '掷符更快' },
      { area: 88, damage: 42, note: '爆裂范围扩大' },
      { amount: 3, note: '+1 张火符' },
      { damage: 54, cooldown: 1.2, note: '火力更猛' },
      { amount: 4, damage: 68, area: 105, note: '九焰焚天，邪秽皆烬' },
    ],
  },
  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;
    const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, 700);
    for (let i = 0; i < s.amount; i++) {
      const t = targets.length > 0 ? targets[i % targets.length] : null;
      const angle = t ? Math.atan2(t.y - w.player.y, t.x - w.player.x) + w.rng.range(-0.2, 0.2)
                      : Math.atan2(w.player.faceY, w.player.faceX) + w.rng.range(-0.3, 0.3);
      const p = w.spawnProjectile('fire');
      p.x = w.player.x; p.y = w.player.y;
      p.vx = Math.cos(angle) * s.speed; p.vy = Math.sin(angle) * s.speed;
      p.radius = 10; p.damage = s.damage; p.pierce = 0;
      p.life = Math.max(s.duration, 1.2); p.blast = s.area;
      p.rotation = angle; p.color = slot.def.color;
    }
    w.emitSfx('shoot');
  },
};
