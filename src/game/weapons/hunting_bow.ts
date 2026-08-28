/**
 * 猎弓 · 地狱犬（主武器）—— 连珠快箭，地狱犬随行扑咬。
 * 专属：箭雨（周期圆形箭雨）、地狱犬 +1（多一只随行）。
 */
import { dist2 } from '../../core/math';
import { spawnAlly } from '../systems/allies';
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const huntingBow: WeaponModule = {
  def: {
    id: 'hunting_bow',
    name: '猎弓 · 地狱犬',
    desc: '猎人短弓连珠，地狱犬随行扑咬',
    maxLevel: 8,
    color: 0xb8a06a,
    texture: 'icon_bow',
    base: true,
    price: 500,
    levels: [
      { damage: 8, cooldown: 0.72, amount: 1, speed: 470, pierce: 1, area: 1, duration: 1.6, note: '连珠快箭' },
      { cooldown: 0.66, note: '拉弓更快' },
      { amount: 2, damage: 11, note: '+1 支箭' },
      { pierce: 2, cooldown: 0.6, note: '箭可穿透' },
      { amount: 3, damage: 14, note: '+1 支箭' },
      { cooldown: 0.52, speed: 540, note: '连珠如雨' },
      { amount: 4, damage: 18, note: '+1 支箭' },
      { amount: 6, damage: 23, pierce: 3, cooldown: 0.46, note: '万箭归巢' },
    ],
    exclusives: [
      { id: 'arrowrain', name: '箭雨', desc: '每 6 秒在敌群处降下一轮箭雨' },
      { id: 'helledog', name: '地狱犬 +1', desc: '再召唤一只地狱犬随行' },
    ],
  },

  tick(w, slot, s, dt) {
    // 地狱犬随行：装备即在场（少了自动补）
    if (slot.specials.includes('helledog') && !w.allies.some((a) => a.kind === 'hound')) {
      spawnAlly(w, 'hound', w.player.x - 40, w.player.y + 12);
    }
    // 地狱犬基础随行：装备猎弓即送一只
    if (!w.allies.some((a) => a.kind === 'hound')) {
      spawnAlly(w, 'hound', w.player.x - 40, w.player.y + 12);
    }

    // 箭雨：每 6 秒在敌群最密处降一轮
    if (slot.specials.includes('arrowrain')) {
      slot.state.rainT = (slot.state.rainT ?? 3) - dt;
      if (slot.state.rainT <= 0) {
        slot.state.rainT = 6;
        const targets = w.nearestEnemies(w.player.x, w.player.y, 1, 500);
        const at = targets[0] ?? w.player;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const h = w.spawnHazard('strike');
          h.x = at.x + Math.cos(a) * 46;
          h.y = at.y + Math.sin(a) * 46;
          h.r = 42;
          h.dur = 0.5;
          h.damage = Math.max(10, s.damage * 1.6);
          h.data = 0;
          h.color = 0xd8b74a;
        }
        w.emitSfx('shoot');
      }
    }

    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;

    const targets = w.nearestEnemies(w.player.x, w.player.y, s.amount, 900);
    for (let i = 0; i < s.amount; i++) {
      const t = targets.length > 0 ? targets[i % targets.length] : null;
      const angle = t
        ? Math.atan2(t.y - w.player.y, t.x - w.player.x) + w.rng.range(-0.05, 0.05)
        : Math.atan2(w.player.faceY, w.player.faceX);
      const p = w.spawnProjectile('talisman');
      p.x = w.player.x;
      p.y = w.player.y;
      p.vx = Math.cos(angle) * s.speed;
      p.vy = Math.sin(angle) * s.speed;
      p.radius = 7;
      p.damage = s.damage;
      p.pierce = s.pierce;
      p.life = 1.6;
      p.rotation = angle;
      p.color = slot.def.color;
    }
    w.emitSfx('shoot');
    void dist2;
  },
};
