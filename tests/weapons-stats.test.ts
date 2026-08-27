import { describe, expect, it } from 'vitest';
import { computeWeaponStats } from '../src/game/weapons-runtime';
import { recalcStats } from '../src/game/stats';
import { WEAPONS } from '../src/data/weapons';
import { BASE_STATS } from '../src/data/config';
import { makeWorld } from './helpers';

describe('computeWeaponStats（等级合并与玩家加成）', () => {
  it('Lv1 使用基础值', () => {
    const w = makeWorld();
    const slot = w.player.weapons[0]; // 起始武器：飞符 Lv1
    const s = computeWeaponStats(slot, w.player);
    expect(s.damage).toBe(10);
    expect(s.amount).toBe(1);
    expect(s.cooldown).toBe(1.0);
  });

  it('高级覆盖低级、未覆盖字段继承', () => {
    const w = makeWorld();
    const slot = w.player.weapons[0];
    slot.level = 3; // L2 只覆盖 amount=2，L3 覆盖 damage=14 cooldown=0.9
    const s = computeWeaponStats(slot, w.player);
    expect(s.amount).toBe(2);       // 继承 L2
    expect(s.damage).toBe(14);      // L3 覆盖
    expect(s.cooldown).toBe(0.9);   // L3 覆盖
    expect(s.speed).toBe(380);      // 继承 L1
  });

  it('朱砂（伤害%）与阴阳玉（冷却缩短）生效', () => {
    const w = makeWorld();
    const p = w.player;
    p.passives.set('cinnabar', 2);    // +20% 伤害
    p.passives.set('yinyang_jade', 1); // -7% 冷却
    recalcStats(p);
    const slot = p.weapons[0];
    const s = computeWeaponStats(slot, p);
    expect(s.damage).toBeCloseTo(10 * 1.2, 5);
    expect(s.cooldown).toBeCloseTo(1.0 * (1 - 0.07), 5);
  });
});

describe('recalcStats（被动法宝结算）', () => {
  it('道袍提高生命上限并同步回复', () => {
    const w = makeWorld();
    const p = w.player;
    p.passives.set('robe', 2); // +50 上限
    recalcStats(p);
    expect(p.stats.maxHp).toBe(BASE_STATS.maxHp + 50);
    expect(p.hp).toBe(BASE_STATS.maxHp + 50);
  });

  it('草鞋按比例加速、罡气按点数加护甲', () => {
    const w = makeWorld();
    const p = w.player;
    p.passives.set('shoes', 1);      // +8% 移速
    p.passives.set('ward_armor', 2); // +3 护甲
    recalcStats(p);
    expect(p.stats.speed).toBeCloseTo(150 * 1.08, 5);
    expect(p.stats.armor).toBeCloseTo(3, 5);
  });

  it('冷却缩短封顶 60%', () => {
    const w = makeWorld();
    const p = w.player;
    p.passives.set('yinyang_jade', 5); // 35% 不到顶
    recalcStats(p);
    expect(p.stats.cooldown).toBeLessThanOrEqual(0.6);
    // 若数据调整到超顶，这里应仍然 ≤ 0.6
    p.passives.set('yinyang_jade', 99);
    recalcStats(p);
    expect(p.stats.cooldown).toBe(0.6);
  });
});

describe('武器图鉴数据完整性', () => {
  it('任意武器任意等级都能结算出全量正值数值（缺省字段由默认值兜底）', () => {
    const basePlayer = makeWorld().player;
    for (const def of Object.values(WEAPONS)) {
      for (let level = 1; level <= def.maxLevel; level++) {
        const slot = { def, level, timer: 0, state: {}, instance: 1 };
        const s = computeWeaponStats(slot, basePlayer);
        expect(s.damage, `${def.id} L${level}.damage`).toBeGreaterThan(0);
        expect(s.cooldown, `${def.id} L${level}.cooldown`).toBeGreaterThan(0);
        expect(s.amount, `${def.id} L${level}.amount`).toBeGreaterThanOrEqual(1);
        expect(s.area, `${def.id} L${level}.area`).toBeGreaterThan(0);
        expect(s.speed, `${def.id} L${level}.speed`).toBeGreaterThan(0);
        expect(s.duration, `${def.id} L${level}.duration`).toBeGreaterThan(0);
        expect(s.pierce, `${def.id} L${level}.pierce`).toBeGreaterThanOrEqual(0);
        expect(s.knockback, `${def.id} L${level}.knockback`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
