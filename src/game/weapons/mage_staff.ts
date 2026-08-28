/**
 * 法师杖（主武器）—— 周期在敌群处降下暴风雪，冰冻迟滞成片妖邪。
 * 专属：极寒增强（范围与持续大增）、冰霜新星（周期冰环护体）。
 */
import { dist2 } from '../../core/math';
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const mageStaff: WeaponModule = {
  def: {
    id: 'mage_staff',
    name: '法师杖',
    desc: '冰霜法术，暴风雪吞没成片妖邪',
    maxLevel: 8,
    color: 0x9fd8ff,
    texture: 'icon_staff_mage',
    base: true,
    price: 550,
    levels: [
      { damage: 10, cooldown: 2.8, amount: 1, area: 95, speed: 1, duration: 2.5, pierce: 0, note: '降下暴风雪' },
      { area: 110, note: '雪域扩大' },
      { damage: 14, cooldown: 2.6, note: '寒气更烈' },
      { amount: 2, note: '+1 处暴风雪' },
      { damage: 19, area: 125, note: '寒气更烈' },
      { amount: 3, duration: 3.0, note: '+1 处暴风雪' },
      { damage: 26, cooldown: 2.3, note: '寒气更烈' },
      { amount: 4, damage: 34, area: 145, duration: 3.5, note: '万里冰封，寸步难行' },
    ],
    exclusives: [
      { id: 'glacier', name: '极寒增强', desc: '暴风雪范围与持续 +50%' },
      { id: 'nova', name: '冰霜新星', desc: '每 9 秒放出一圈冰环震退妖邪' },
    ],
  },

  tick(w, slot, s, dt) {
    // 冰霜新星
    if (slot.specials.includes('nova')) {
      slot.state.novaT = (slot.state.novaT ?? 5) - dt;
      if (slot.state.novaT <= 0) {
        slot.state.novaT = 9;
        const ring = w.spawnHazard('ring');
        ring.x = w.player.x;
        ring.y = w.player.y;
        ring.maxR = 200;
        ring.r = 20;
        ring.dur = 0.4;
        ring.damage = Math.max(10, s.damage * 1.5);
        ring.knockback = 200;
        ring.color = 0x9fd8ff;
        w.emitSfx('bell');
      }
    }

    if (!tickTimer(slot, dt)) return;
    slot.timer = s.cooldown;

    const glacier = slot.specials.includes('glacier');
    const area = s.area * (glacier ? 1.5 : 1);
    const dur = s.duration * (glacier ? 1.5 : 1);

    for (let i = 0; i < s.amount; i++) {
      // 落点优先敌群，敌稀时散布在玩家周围
      const targets = w.nearestEnemies(w.player.x, w.player.y, 1, 620);
      let x: number;
      let y: number;
      if (targets[0] && i === 0) {
        x = targets[0].x;
        y = targets[0].y;
      } else if (targets.length > 0) {
        const t = targets[i % targets.length];
        x = t.x + w.rng.range(-60, 60);
        y = t.y + w.rng.range(-60, 60);
      } else {
        x = w.player.x + w.rng.range(-260, 260);
        y = w.player.y + w.rng.range(-260, 260);
      }

      const h = w.spawnHazard('blizzard');
      h.x = x;
      h.y = y;
      h.r = area;
      h.dur = dur;
      h.tickEvery = 0.5; // 每 0.5s 一跳
      h.damage = s.damage;
      h.slow = 0.3;
      h.color = 0x9fd8ff;
    }
    w.emitSfx('shoot');
    void dist2;
  },
};
