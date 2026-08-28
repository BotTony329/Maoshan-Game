import { describe, expect, it } from 'vitest';
import { generateOptions } from '../src/game/upgrades';
import { WEAPONS } from '../src/game/weapons/registry';
import { PASSIVES } from '../src/data/passives';
import { PLAYER } from '../src/data/config';
import { makeWorld } from './helpers';
import { Rng } from '../src/core/math';

describe('generateOptions（三选一抽卡池）', () => {
  it('开局池里有新武器与新法宝，不重复且恰好 3 个', () => {
    const w = makeWorld();
    const options = generateOptions(w.player, w.rng);
    expect(options).toHaveLength(3);
    const keys = options.map((o) => `${o.kind}:${'id' in o ? o.id : ''}`);
    expect(new Set(keys).size).toBe(3);
    for (const o of options) {
      expect(['weapon-new', 'weapon-upgrade', 'special', 'passive-new', 'passive-upgrade', 'heal', 'bomb']).toContain(o.kind);
    }
  });

  it('已满级武器不再出现在升级池', () => {
    const w = makeWorld();
    const p = w.player;
    const slot = p.weapons[0];
    slot.level = WEAPONS[slot.def.id].maxLevel;
    for (let i = 0; i < 200; i++) {
      const options = generateOptions(p, w.rng);
      for (const o of options) {
        expect(o.kind === 'weapon-upgrade' && o.id === slot.def.id).toBe(false);
      }
    }
  });

  it('武器槽满 6 格时不再提供新武器', () => {
    const w = makeWorld();
    const p = w.player;
    p.weapons.length = 0;
    for (const def of Object.values(WEAPONS).slice(0, PLAYER.maxWeapons)) {
      p.weapons.push({ def, level: 1, timer: 0, state: {}, instance: p.weapons.length + 1, specials: [] });
    }
    for (let i = 0; i < 200; i++) {
      const options = generateOptions(p, w.rng);
      for (const o of options) expect(o.kind).not.toBe('weapon-new');
    }
  });

  it('全满时给保底补给选项（回血/爆竹），升级永不空转', () => {
    const w = makeWorld();
    const p = w.player;
    p.weapons.length = 0;
    const defs = Object.values(WEAPONS);
    for (let i = 0; i < PLAYER.maxWeapons; i++) {
      p.weapons.push({ def: defs[i], level: defs[i].maxLevel, timer: 0, state: {}, instance: i + 1, specials: [] });
    }
    p.passives.clear();
    const pdefs = Object.values(PASSIVES);
    for (let i = 0; i < PLAYER.maxPassives; i++) {
      p.passives.set(pdefs[i].id, pdefs[i].maxLevel);
    }
    // 剩下两把武器无法入列（槽满），法宝全满 → 池应只剩升级项为空 → 保底
    const rng = w.rng;
    for (let i = 0; i < 50; i++) {
      const options = generateOptions(p, rng);
      expect(options).toHaveLength(3);
    }
  });

  it('固定种子下抽取可复现', () => {
    const w = makeWorld();
    const a = generateOptions(w.player, new Rng(7));
    const b = generateOptions(w.player, new Rng(7));
    expect(a).toEqual(b);
  });
});
