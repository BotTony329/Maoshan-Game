/**
 * 道途（职业）/ 宝珠 / 鬼市存档测试。
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
import { WEAPONS } from '../src/data/weapons';
import { computeWeaponStats } from '../src/game/weapons-runtime';
import { ORB_CAP } from '../src/data/orbs';
import { Rng } from '../src/core/math';
import { loadSave, persist, buy, selectClass, toggleOrb, buyMask } from '../src/game/save';
import { makeWorld, fastForward } from './helpers';

function freshSaveGold(gold: number): void {
  const s = loadSave();
  s.gold = gold;
  persist();
}

describe('道途（职业）', () => {
  it('默认道士：飞符起手，经验 +10%', () => {
    const w = makeWorld();
    w.start('stages', { classId: 'taoist' });
    expect(w.player.weapons[0].def.id).toBe('talisman');
    expect(w.player.stats.xpGain).toBeCloseTo(1.1, 5);
  });

  it('萨满：电符起手，闪电链多跳 4 次且跳距更远', () => {
    const w = makeWorld();
    w.start('stages', { classId: 'shaman' });
    expect(w.player.weapons[0].def.id).toBe('spark_talisman');
    const enemies = [80, 160, 240, 320, 400].map((dx) =>
      w.spawnEnemyAt('taotie', w.player.x + dx, w.player.y),
    );
    fastForward(w, 0.6, 1 / 30);
    for (const e of enemies) expect(e.hp).toBeLessThan(e.maxHp);
  });

  it('武士：关刀起手，护甲 +2（受击减伤体现）', () => {
    const w = makeWorld();
    w.start('stages', { classId: 'warrior' });
    expect(w.player.weapons[0].def.id).toBe('guandao');
    expect(w.player.stats.armor).toBe(2);
  });

  it('武士：一扫三敌返还 30% 冷却', () => {
    const w = makeWorld();
    w.start('stages', { classId: 'warrior' });
    const slot = w.player.weapons[0];
    slot.timer = 0.05;
    w.player.faceX = 1;
    w.player.faceY = 0;
    for (const [dx, dy] of [[110, -30], [110, 0], [110, 30]] as const) {
      w.spawnEnemyAt('taotie', w.player.x + dx, w.player.y + dy);
    }
    fastForward(w, 0.4, 1 / 30);
    // Lv1 冷却 1.5s，返还 0.45s：0.4s 自然衰减后应 ≈0.72（无返还则 ≈1.17）
    expect(slot.timer).toBeLessThan(0.9);

    // 对照组：单只怪不返还
    const w2 = makeWorld();
    w2.start('stages', { classId: 'warrior' });
    const slot2 = w2.player.weapons[0];
    slot2.timer = 0.05;
    w2.player.faceX = 1;
    w2.player.faceY = 0;
    w2.spawnEnemyAt('taotie', w2.player.x + 110, w2.player.y);
    fastForward(w2, 0.4, 1 / 30);
    expect(slot2.timer).toBeGreaterThan(1.0);
  });

  it('猎人：猎弓起手 + 灵犬宠物随行并参与咬人', () => {
    const w = makeWorld();
    w.start('stages', { classId: 'hunter' });
    expect(w.player.weapons[0].def.id).toBe('hunting_bow');
    expect(w.pet).not.toBeNull();
    const prey = w.spawnEnemyAt('taotie', w.player.x + 200, w.player.y);
    fastForward(w, 2.5, 1 / 30);
    expect(prey.hp).toBeLessThan(prey.maxHp);
  });

  it('猎人丰收：灵犬击杀掉双倍魂魄（无尽模式掉落）', () => {
    const w = makeWorld();
    w.start('endless', { classId: 'hunter' });
    const e = w.spawnEnemyAt('jiangshi', w.player.x + 60, w.player.y);
    w.dealDamage(e, 99999, 0, 0, 'pet');
    const xpGems = w.pickups.filter((pk) => pk.kind === 'xp');
    expect(xpGems).toHaveLength(2);
    expect(xpGems[0].value + xpGems[1].value).toBe(e.def.xp * 2);

    // 对照：非宠物击杀只掉一颗
    const w2 = makeWorld();
    w2.start('endless', { classId: 'taoist' });
    const e2 = w2.spawnEnemyAt('jiangshi', w2.player.x + 60, w2.player.y);
    w2.dealDamage(e2, 99999);
    expect(w2.pickups.filter((pk) => pk.kind === 'xp')).toHaveLength(1);
  });

  it('术士：蚀魂咒起手，咒蚀持续掉血且咒死传染', () => {
    const w = makeWorld();
    w.start('stages', { classId: 'warlock' });
    expect(w.player.weapons[0].def.id).toBe('soul_curse');
    const a = w.spawnEnemyAt('taotie', w.player.x + 120, w.player.y);
    const b = w.spawnEnemyAt('taotie', a.x + 60, w.player.y);
    fastForward(w, 0.8, 1 / 30);
    expect(a.curseUntil).toBeGreaterThan(0);
    const hpBefore = b.hp;
    w.dealDamage(a, 99999);
    expect(b.curseUntil).toBeGreaterThan(0);
    fastForward(w, 1.5, 1 / 30);
    expect(b.hp).toBeLessThan(hpBefore);
  });

  it('术士汲魂：咒杀回血 2 点，被咒者承伤 +25%', () => {
    const w = makeWorld();
    w.start('stages', { classId: 'warlock' });
    w.player.hp = 50;

    const cursed = w.spawnEnemyAt('taotie', w.player.x + 150, w.player.y);
    cursed.curseDps = 10;
    cursed.curseUntil = w.time + 5;
    const hp0 = cursed.hp;
    w.dealDamage(cursed, 100);
    expect(cursed.hp).toBeCloseTo(hp0 - 125, 5);
    w.dealDamage(cursed, 99999);
    expect(w.player.hp).toBe(52);

    const clean = w.spawnEnemyAt('taotie', w.player.x - 150, w.player.y);
    const hp1 = clean.hp;
    w.dealDamage(clean, 100);
    expect(clean.hp).toBe(hp1 - 100);
  });

  it('未知职业安全回退到默认道士', () => {
    const w = makeWorld();
    w.start('stages', { classId: 'not_exist' });
    expect(w.player.weapons[0].def.id).toBe('talisman');
    expect(w.pet).toBeNull();
  });
});

describe('宝珠', () => {
  it('鬼珠：吸附翻倍 + 经验加成（叠道士天赋 +10%）', () => {
    const w = makeWorld();
    w.start('stages', { orbs: ['ghost'] });
    expect(w.player.stats.magnet).toBeCloseTo(140, 5);
    expect(w.player.stats.xpGain).toBeCloseTo(1.15 * 1.1, 5);
  });

  it('风珠：移速与回复提升', () => {
    const w = makeWorld();
    w.start('stages', { orbs: ['wind'] });
    expect(w.player.stats.speed).toBeCloseTo(150 * 1.15, 5);
    expect(w.player.stats.regen).toBeCloseTo(0.6, 5);
  });

  it('雷珠：6 秒一道自动天雷', () => {
    const w = makeWorld();
    w.start('stages', { orbs: ['thunder'] });
    const e = w.spawnEnemyAt('taotie', w.player.x + 200, w.player.y);
    const hp0 = e.maxHp;
    fastForward(w, 7.5, 1 / 30);
    expect(e.hp).toBeLessThan(hp0);
  });

  it('焰珠：受击反炸周围敌人', () => {
    const w = makeWorld();
    w.start('stages', { orbs: ['flame'] });
    const e = w.spawnEnemyAt('taotie', w.player.x + 40, w.player.y);
    fastForward(w, 0.6, 1 / 30);
    expect(e.hp).toBeLessThan(e.maxHp);
  });

  it('血珠：击杀回血', () => {
    const w = makeWorld();
    w.start('stages', { orbs: ['blood'] });
    w.player.hp = 50;
    const e = w.spawnEnemyAt('jiangshi', w.player.x + 60, w.player.y);
    w.dealDamage(e, 99999);
    expect(w.player.hp).toBe(51);
  });

  it('最多携带 2 颗，多余忽略', () => {
    const w = makeWorld();
    w.start('stages', { orbs: ['blood', 'ghost', 'thunder', 'wind'] });
    expect(w.orbIds).toHaveLength(ORB_CAP);
  });
});

describe('鬼市存档', () => {
  it('购买职业：扣钱入库；钱不够/重复购买失败', () => {
    freshSaveGold(300);
    expect(buy('class', 'shaman', 400)).toBe(false);
    freshSaveGold(500);
    expect(buy('class', 'shaman', 400)).toBe(true);
    expect(loadSave().gold).toBe(100);
    expect(buy('class', 'shaman', 400)).toBe(false);
  });

  it('道途选择：未购买的不能启用', () => {
    selectClass('warrior');
    expect(loadSave().activeClass).toBe('taoist');
    freshSaveGold(9999);
    buy('class', 'warrior', 400);
    selectClass('warrior');
    expect(loadSave().activeClass).toBe('warrior');
  });

  it('宝珠勾选：须已拥有，上限 2 颗', () => {
    const s = loadSave();
    s.orbs = ['blood', 'ghost', 'thunder'];
    persist();
    toggleOrb('blood');
    toggleOrb('ghost');
    toggleOrb('thunder');
    expect(loadSave().equippedOrbs).toHaveLength(ORB_CAP);
    toggleOrb('not_owned');
    expect(loadSave().equippedOrbs).toHaveLength(ORB_CAP);
  });

  it('鬼面具：花钱升级、常驻生效于闯幽冥', () => {
    freshSaveGold(100);
    expect(buyMask('rage')).toBe(0); // 钱不够升 1 级（300）
    freshSaveGold(300);
    expect(buyMask('rage')).toBe(1);
    freshSaveGold(300);
    expect(buyMask('rage')).toBe(0); // 2 级要 600，钱不够
    freshSaveGold(600);
    expect(buyMask('rage')).toBe(2);
    freshSaveGold(1000);
    expect(buyMask('rage')).toBe(3);
    expect(buyMask('rage')).toBe(0); // 已圆满

    const w = makeWorld();
    w.start('stages', { masks: loadSave().masks });
    expect(w.player.stats.damage).toBeCloseTo(1 * 1.24, 5); // +8%×3
    // 无尽不生效
    const w2 = makeWorld();
    w2.start('endless', { masks: loadSave().masks });
    expect(w2.player.stats.damage).toBeCloseTo(1, 5);
  });

  it('噬面具：击杀回血', () => {
    freshSaveGold(300);
    buyMask('fang');
    const w = makeWorld();
    w.start('stages', { masks: loadSave().masks });
    w.player.hp = 50;
    const e = w.spawnEnemyAt('jiangshi', w.player.x + 60, w.player.y);
    w.dealDamage(e, 99999);
    expect(w.player.hp).toBeCloseTo(50.5, 5);
  });

  it('固定种子下抽取可复现', () => {
    const a = new Rng(7).int(0, 1000);
    const b = new Rng(7).int(0, 1000);
    expect(a).toBe(b);
  });
});

describe('专属武器不入局内池', () => {
  it('电符/关刀/猎弓/蚀魂咒/弑神枪/玄甲胄不会出现在关卡奖励里', async () => {
    const { generateOptions } = await import('../src/game/upgrades');
    const exclusive = ['spark_talisman', 'guandao', 'hunting_bow', 'soul_curse', 'godslayer', 'kuijia'];
    const w = makeWorld();
    for (let i = 0; i < 200; i++) {
      for (const o of generateOptions(w.player, w.rng)) {
        if ('id' in o) expect(exclusive).not.toContain(o.id);
      }
    }
  });
});

describe('武器图鉴完整性', () => {
  it('全部武器（含弑神枪）各级都能结算出全量正值数值', () => {
    const basePlayer = makeWorld().player;
    for (const def of Object.values(WEAPONS)) {
      for (let level = 1; level <= def.maxLevel; level++) {
        const s = computeWeaponStats({ def, level, timer: 0, state: {}, instance: 1 }, basePlayer);
        expect(s.damage, `${def.id} L${level}.damage`).toBeGreaterThan(0);
        expect(s.cooldown, `${def.id} L${level}.cooldown`).toBeGreaterThan(0);
      }
    }
  });
});
