/**
 * 符文（默认主武器）—— 自动索敌飞符。
 * 专属：破魔（穿透 +2）。
 */
import { dist2 } from '../../core/math';
import type { WeaponModule } from './types';
import { tickTimer } from './shared';

export const rune: WeaponModule = {
  def: {
    id: 'rune',
    name: '符文',
    desc: '符文化光，自动追射最近的妖邪。道士的入门法器',
    maxLevel: 8,
    color: 0xf5d76e,
    texture: 'icon_talisman',
    base: true,
    price: 0,
    levels: [
      { damage: 10, cooldown: 1.0, amount: 1, speed: 380, pierce: 0, area: 1, duration: 1.6, note: '掷出一张符文' },
      { amount: 2, note: '+1 张符文' },
      { damage: 14, cooldown: 0.9, note: '伤害提升' },
      { amount: 3, note: '+1 张符文' },
      { pierce: 1, cooldown: 0.8, note: '符文可穿透 1 名敌人' },
      { amount: 4, damage: 18, note: '+1 张符文' },
      { cooldown: 0.65, speed: 460, note: '掷符更快更远' },
      { amount: 6, damage: 24, pierce: 2, note: '符如飞蝗，穿邪破鬼' },
    ],
    exclusives: [
      { id: 'demo_bane', name: '破魔', desc: '符文穿透 +2，专克成群恶鬼' },
    ],
  },

  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;

    const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, 900);
    for (let i = 0; i < s.amount; i++) {
      const t = targets.length > 0 ? targets[i % targets.length] : null;
      let angle = t
        ? Math.atan2(t.y - w.player.y, t.x - w.player.x)
        : Math.atan2(w.player.faceY, w.player.faceX);
      angle += w.rng.range(-0.06, 0.06) * i;
      const p = w.spawnProjectile('talisman');
      p.x = w.player.x;
      p.y = w.player.y;
      p.vx = Math.cos(angle) * s.speed;
      p.vy = Math.sin(angle) * s.speed;
      p.radius = 9 * s.area;
      p.damage = s.damage;
      p.pierce = s.pierce;
      p.life = 1.8;
      p.rotation = angle;
      p.color = slot.def.color;
    }
    w.emitSfx('shoot');
    void dist2;
  },
};
