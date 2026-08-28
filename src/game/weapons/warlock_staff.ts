/**
 * 术士杖（主武器）—— 蚀魂咒：邪术侵蚀魂魄，咒死之疫四散传染。
 * 专属：汲魂（咒杀回血 + 被咒者承伤 +25%）、深度传染（半径与侵蚀大增）。
 */
import type { WeaponModule } from './types';
import { tickTimer } from './shared';

export const warlockStaff: WeaponModule = {
  def: {
    id: 'warlock_staff',
    name: '术士杖',
    desc: '邪术侵蚀魂魄，咒死之疫还会四散传染',
    maxLevel: 8,
    color: 0x9a5ac8,
    texture: 'icon_curse',
    base: true,
    price: 550,
    levels: [
      { damage: 20, cooldown: 1.3, amount: 1, speed: 290, area: 1, duration: 3, note: '咒蚀 3 秒，死后传染' },
      { damage: 26, note: '咒蚀更深' },
      { amount: 2, cooldown: 1.2, note: '+1 道咒火' },
      { duration: 3.5, damage: 33, note: '侵蚀更久' },
      { amount: 3, note: '+1 道咒火' },
      { damage: 42, cooldown: 1.05, note: '咒蚀更深' },
      { amount: 4, duration: 4, note: '+1 道咒火' },
      { amount: 6, damage: 55, cooldown: 0.95, note: '万魂噬尽，疫行千里' },
    ],
    exclusives: [
      { id: 'siphon', name: '汲魂', desc: '咒杀回血 2 点；被咒者承伤 +25%' },
      { id: 'deep_plague', name: '深度传染', desc: '传染半径与侵蚀大增' },
    ],
  },

  tick(w, slot, s, dt) {
    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;

    const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, 650);
    for (let i = 0; i < s.amount; i++) {
      const t = targets.length > 0 ? targets[i % targets.length] : null;
      const angle = t
        ? Math.atan2(t.y - w.player.y, t.x - w.player.x)
        : Math.atan2(w.player.faceY, w.player.faceX);
      const p = w.spawnProjectile('curse');
      p.x = w.player.x;
      p.y = w.player.y;
      p.vx = Math.cos(angle) * s.speed;
      p.vy = Math.sin(angle) * s.speed;
      p.radius = 9;
      p.damage = s.damage;
      p.pierce = 0;
      p.life = Math.max(s.duration, 2);
      p.blast = Math.max(s.duration, 2); // 侵蚀持续秒数（诅咒弹复用字段）
      p.rotation = angle;
      p.color = slot.def.color;
    }
    w.emitSfx('shoot');
  },
};
