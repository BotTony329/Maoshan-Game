/**
 * 召唤师杖（主武器）—— 维持骷髅犬协同作战，走哪跟哪。
 * 专属：骸骨 pack（骷髅犬 +2）、献祭强化（犬牙 +50%）。
 */
import { ALLY_CAP } from '../systems/allies';
import { tickTimer } from './shared';
import type { WeaponModule } from './types';

export const summonerStaff: WeaponModule = {
  def: {
    id: 'summoner_staff',
    name: '召唤师杖',
    desc: '唤起骷髅犬协同作战，走哪跟哪',
    maxLevel: 8,
    color: 0xc8e8a0,
    texture: 'icon_staff_summon',
    base: true,
    price: 600,
    levels: [
      { damage: 6, cooldown: 3.0, amount: 1, area: 440, speed: 250, duration: 1, pierce: 0, note: '唤起 1 只骷髅犬' },
      { cooldown: 2.8, note: '骷髅犬牙口更利' },
      { amount: 2, note: '+1 只骷髅犬' },
      { damage: 8, cooldown: 2.6, note: '骷髅犬牙口更利' },
      { amount: 3, note: '+1 只骷髅犬' },
      { damage: 11, cooldown: 2.3, note: '骷髅犬牙口更利' },
      { amount: 4, note: '+1 只骷髅犬' },
      { amount: 4, damage: 16, cooldown: 2.0, note: '骸骨大军，闻风丧胆' },
    ],
    exclusives: [
      { id: 'pack', name: '骸骨 pack', desc: '骷髅犬数量上限 +2' },
      { id: 'sacrifice', name: '献祭强化', desc: '骷髅犬咬伤 +50%' },
    ],
  },

  tick(w, slot, s, dt) {
    // 维持骷髅犬数量：上限 = 等级数量 + pack 专属；每 cooldown 补一只
    const cap = Math.min(s.amount + (slot.specials.includes('pack') ? 2 : 0), ALLY_CAP);
    const current = w.allies.filter((a) => a.kind === 'skelldog').length;
    if (current < cap) {
      if (!tickTimer(slot, dt)) return;
      slot.timer = s.cooldown;
      const a = w.rng.range(0, Math.PI * 2);
      w.spawnAlly('skelldog', w.player.x + Math.cos(a) * 50, w.player.y + Math.sin(a) * 50, cap);
      w.emitSfx('kill');
    }
  },
};
