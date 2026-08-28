/**
 * 武器系统测试 —— 六主武器装备/专属升级/行为机制。
 * save.ts 依赖 localStorage —— node 环境先挂内存桩。
 */
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, String(v));
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
  clear(): void {
    this.m.clear();
  }
}
globalThis.localStorage = new MemStorage() as unknown as Storage;

import { describe, expect, it } from 'vitest';
import { WEAPONS, BASE_WEAPONS, GENERIC_WEAPONS } from '../src/game/weapons/registry';
import { computeWeaponStats } from '../src/game/weapons/shared';
import { ORB_CAP } from '../src/data/orbs';
import { loadSave, persist, buy, equipWeapon } from '../src/game/save';
import { makeWorld, fastForward } from './helpers';


describe('武器库（主武器体系）', () => {
  it('六把主武器登记在册；符文免费默认，其余收费', () => {
    expect(BASE_WEAPONS).toHaveLength(6);
    expect(WEAPONS.rune.price).toBe(0);
    for (const d of BASE_WEAPONS) {
      if (d.id !== 'rune') expect(d.price ?? 0, d.id).toBeGreaterThan(0);
    }
  });

  it('主武器不入局内奖励通用池（通用池只剩普通武器）', () => {
    for (const d of BASE_WEAPONS) {
      expect(GENERIC_WEAPONS.some((g) => g.id === d.id), d.id).toBe(false);
    }
    // 通用魔法保留：八卦镜/血袍/电符等都在
    expect(GENERIC_WEAPONS.some((g) => g.id === 'bagua_mirror')).toBe(true);
    expect(GENERIC_WEAPONS.some((g) => g.id === 'spark_talisman')).toBe(true);
  });

  it('装备主武器：开局起手（默认符文）', () => {
    const w = makeWorld();
    w.start('stages', { weaponId: 'shaman_hammer' });
    expect(w.player.weapons[0].def.id).toBe('shaman_hammer');

    const w2 = makeWorld();
    w2.start('stages', {});
    expect(w2.player.weapons[0].def.id).toBe('rune');
  });

  it('未知武器安全回退到符文', () => {
    const w = makeWorld();
    w.start('stages', { weaponId: 'not_exist' });
    expect(w.player.weapons[0].def.id).toBe('rune');
  });
});

describe('武器专属升级', () => {
  it('萨满锤「闪电箭」：锤击命中向邻近敌人放电', () => {
    const w = makeWorld();
    w.start('stages', { weaponId: 'shaman_hammer' });
    const slot = w.player.weapons[0];
    slot.specials.push('chainstrike');
    slot.timer = 0.05;
    w.player.faceX = 1;
    w.player.faceY = 0;
    // 主目标 + 链电目标
    const a = w.spawnEnemyAt('taotie', w.player.x + 110, w.player.y);
    const b = w.spawnEnemyAt('taotie', a.x + 100, w.player.y); // 链距 240 内
    fastForward(w, 0.4, 1 / 30);
    expect(a.hp).toBeLessThan(a.maxHp);
    expect(b.hp).toBeLessThan(b.maxHp);
  });

  it('萨满锤「图腾召唤」：周期放置图腾电击周围', () => {
    const w = makeWorld();
    w.start('stages', { weaponId: 'shaman_hammer' });
    const slot = w.player.weapons[0];
    slot.specials.push('totem');
    const e = w.spawnEnemyAt('taotie', w.player.x + 90, w.player.y);
    fastForward(w, 6, 1 / 30);
    expect(e.hp).toBeLessThan(e.maxHp);
  });

  it('法师杖「暴风雪」：区域伤害 + 减速', () => {
    const w = makeWorld();
    w.start('stages', { weaponId: 'mage_staff' });
    const e = w.spawnEnemyAt('taotie', w.player.x + 150, w.player.y);
    fastForward(w, 3, 1 / 30);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(e.slowUntil).toBeGreaterThan(0);
  });

  it('召唤师杖：维持骷髅犬（随等级增加）', () => {
    const w = makeWorld();
    w.start('endless', { weaponId: 'summoner_staff' }); // 闯关会因杀数达标亮门打断计数
    const slot = w.player.weapons[0];
    slot.level = 7; // Lv7 数量上限 4 只
    fastForward(w, 12, 1 / 30);
    const dogs = w.allies.filter((a) => a.kind === 'skelldog');
    expect(dogs.length).toBe(4);
    expect(w.allies.length).toBeLessThanOrEqual(4);
  });

  it('术士杖「汲魂」：咒杀回血 2 点，被咒者承伤 +25%', () => {
    const w = makeWorld();
    w.start('stages', { weaponId: 'warlock_staff' });
    w.player.weapons[0].specials.push('siphon');
    w.player.hp = 50;

    const cursed = w.spawnEnemyAt('taotie', w.player.x + 150, w.player.y);
    cursed.curseDps = 10;
    cursed.curseUntil = w.time + 5;
    const hp0 = cursed.hp;
    w.dealDamage(cursed, 100);
    expect(cursed.hp).toBeCloseTo(hp0 - 125, 5);
    w.dealDamage(cursed, 99999);
    expect(w.player.hp).toBe(52);
  });

  it('符文「破魔」：穿透 +2', () => {
    const w = makeWorld();
    w.start('stages', { weaponId: 'rune' });
    const slot = w.player.weapons[0];
    const before = computeWeaponStats(slot, w.player).pierce;
    slot.specials.push('demo_bane');
    expect(computeWeaponStats(slot, w.player).pierce).toBe(before + 2);
  });

  it('专属升级只对装备者出现于奖励池', async () => {
    const { generateOptions } = await import('../src/game/upgrades');
    const w = makeWorld();
    w.start('stages', { weaponId: 'rune' });
    for (let i = 0; i < 200; i++) {
      for (const o of generateOptions(w.player, w.rng)) {
        if (o.kind === 'special') expect(o.weapon).toBe('rune');
      }
    }
  });
});

describe('宝珠（保留项抽查）', () => {
  it('鬼珠 + 风珠照常生效', () => {
    const w = makeWorld();
    w.start('stages', { orbs: ['ghost', 'wind'] });
    expect(w.player.stats.magnet).toBeCloseTo(140, 5);
    expect(w.player.stats.speed).toBeCloseTo(150 * 1.15, 5);
  });

  it('最多携带 2 颗', () => {
    const w = makeWorld();
    w.start('stages', { orbs: ['blood', 'ghost', 'thunder', 'wind'] });
    expect(w.orbIds).toHaveLength(ORB_CAP);
  });
});

describe('存档（武器库）', () => {
  it('购买并装备主武器', () => {
    freshSaveGold(2000);
    expect(buy('weapon', 'hunting_bow', 500)).toBe(true);
    equipWeapon('hunting_bow');
    expect(loadSave().equippedWeapon).toBe('hunting_bow');
    expect(loadSave().weapons).toContain('hunting_bow');
  });

  it('未购买的武器不能装备', () => {
    equipWeapon('summoner_staff');
    expect(loadSave().equippedWeapon).not.toBe('summoner_staff');
  });
});


function freshSaveGold(gold: number): void {
  const s = loadSave();
  s.gold = gold;
  persist();
}
