/**
 * V2 测试：闯幽冥关卡流（2 分钟/门/奖励）、自动成长、地府金融系统。
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
import { stageTheme, goldForRun } from '../src/data/config';
import { rollDoors } from '../src/data/doors';
import { GODSLAYER_PRICE } from '../src/data/finance';
import { Rng } from '../src/core/math';
import { loadSave, persist, openAccount, exchangeToMingbi, exchangeToCopper, buyStock, sellStock, buyWealth, financeTick, buyLegendary } from '../src/game/save';
import { makeWorld, fastForward } from './helpers';

/** 推进战斗直到亮门（击杀数结算），保护玩家不死 */
function runToDoors(w: ReturnType<typeof makeWorld>, maxSeconds = 240): void {
  w.player.hp = 1e9;
  w.player.stats.maxHp = 1e9;
  const steps = Math.ceil((maxSeconds * 30));
  for (let i = 0; i < steps; i++) {
    if (w.state !== 'PLAYING') return;
    w.update(1 / 30);
  }
}

function freshSaveGold(gold: number): void {
  const s = loadSave();
  s.gold = gold;
  persist();
}

describe('闯幽冥（关卡流）', () => {
  it('击杀数达标亮门并冻结战局', () => {
    const w = makeWorld(42);
    expect(w.mode).toBe('stages');
    expect(w.stage).toBe(1);
    runToDoors(w);
    expect(w.pendingDoors.length).toBeGreaterThanOrEqual(1);
    expect(w.pendingDoors.length).toBeLessThanOrEqual(3);
    // 门冻结世界：时间不再走
    const t = w.time;
    w.update(0.5);
    expect(w.time).toBe(t);
  });

  it('选门进下一关：发奖励三选一，选完恢复战斗', () => {
    const w = makeWorld(42);
    runToDoors(w);
    expect(w.state).toBe('DOORS');
    w.chooseDoor('next');
    expect(w.state).toBe('REWARD');
    expect(w.stage).toBe(2);
    expect(w.stageTime).toBe(0);
    w.applyUpgrade({ kind: 'heal' });
    expect(w.state).toBe('PLAYING');
  });

  it('补给站门：回血五成 + 150 文', () => {
    const w = makeWorld(42);
    runToDoors(w);
    w.player.hp = 4e8;
    const gold0 = w.bonusGold;
    const hpAtDoors = w.player.hp;
    w.chooseDoor('supply');
    expect(w.player.hp).toBeGreaterThan(hpAtDoors); // 回了上限五成
    expect(w.bonusGold - gold0).toBe(150);
    expect(w.state).toBe('REWARD');
  });

  it('Boss 房门：斩杀 Boss 过关，开场 Boss 逐关增血', () => {
    const w = makeWorld(42);
    runToDoors(w);
    w.chooseDoor('boss');
    expect(w.pendingBoss).toBe(false); // 已消费
    w.applyUpgrade({ kind: 'heal' });
    expect(w.boss).not.toBeNull();
    // 第 2 关的旱魃：2600 × 1.25
    expect(w.boss!.maxHp).toBeGreaterThan(2600);
    // 斩杀 Boss 过关（不看击杀数；下一帧结算）
    w.dealDamage(w.boss!, 9999999);
    w.update(1 / 60);
    expect(w.state).toBe('DOORS');
  });

  it('小怪房门：下一关刷怪提速', () => {
    const w = makeWorld(42);
    runToDoors(w);
    w.chooseDoor('mob');
    expect(w.spawnRateMult).toBe(1.6);
    // 进入奖励→战斗后刷怪间隔应被压缩（相位计时器按倍率扣）
    w.applyUpgrade({ kind: 'heal' });
    const t0 = w.ruleTimers[0] ?? 1;
    w.update(1);
    const t1 = w.ruleTimers[0] ?? 0;
    expect(t1).toBeLessThan(t0);
  });

  it('主题推进：从人间杀穿地府，越境换色换名并循环炼狱', () => {
    expect(stageTheme(1).name).toContain('人间');
    expect(stageTheme(2).name).toContain('黄泉');
    expect(stageTheme(6).name).toContain('阎罗殿');
    expect(stageTheme(7).name).toContain('炼狱');
    expect(stageTheme(1).tint).not.toBe(stageTheme(3).tint);
  });

  it('难度随虚拟分钟推进：第 2 关的怪比第 1 关硬', () => {
    const w = makeWorld(42);
    w.player.hp = 1e9;
    w.player.stats.maxHp = 1e9;
    const hp1 = w.spawnEnemyAt('jiangshi', 100, 100).maxHp;
    runToDoors(w);
    w.chooseDoor('next');
    w.applyUpgrade({ kind: 'heal' });
    const hp2 = w.spawnEnemyAt('jiangshi', 100, 100).maxHp;
    expect(hp2).toBeGreaterThan(hp1);
  });
});

describe('升级自动成长（仅无尽；闯幽冥无升级）', () => {
  it('无尽：拾取魂魄升级，+1% 伤害/+3 上限，无选择弹窗', () => {
    const w = makeWorld();
    w.start('endless');
    const dmg0 = w.player.stats.damage;
    const hp0 = w.player.stats.maxHp;
    w.dropPickup('xp', w.player.x, w.player.y, 50);
    w.update(1 / 60);
    expect(w.state).toBe('PLAYING');
    expect(w.player.level).toBeGreaterThan(1);
    expect(w.player.stats.damage).toBeGreaterThan(dmg0);
    expect(w.player.stats.maxHp).toBeGreaterThan(hp0);
  });

  it('闯幽冥：升级通道关闭，等级恒 1', () => {
    const w = makeWorld();
    w.dropPickup('xp', w.player.x, w.player.y, 0); // 无魂魄可捡
    w.spawnEnemyAt('jiangshi', w.player.x + 60, w.player.y);
    const e = w.enemies[w.enemies.length - 1];
    w.dealDamage(e, 99999);
    expect(w.player.level).toBe(1);
  });
});

describe('无尽模式（照旧）', () => {
  it('无尽：不亮门，15 分钟后仍在战斗，Boss 循环', () => {
    const w = makeWorld(42);
    w.start('endless');
    w.player.hp = 1e9;
    w.player.stats.maxHp = 1e9;
    const end = fastForward(w, 16 * 60, 0.5);
    expect(end).toBe('PLAYING');
    expect(w.stage).toBe(0);
    // 300s 旱魃 → 600s 尸王
    expect(w.boss?.def.id).toBe('shiwang');
  }, 30000);
});

// ---------------------------------------------------------------- 地府金融

describe('地府金融', () => {
  it('开户送冥币；汇率游走但有上下限', () => {
    freshReset();
    openAccount();
    expect(loadSave().finance.accountOpen).toBe(true);
    expect(loadSave().finance.mingbi).toBe(100);
    for (let i = 0; i < 200; i++) financeTick(new Rng(i + 1));
    const rate = loadSave().finance.rate;
    expect(rate).toBeGreaterThanOrEqual(6);
    expect(rate).toBeLessThanOrEqual(18);
  });

  it('铜钱 ↔ 冥币按当局汇率兑换', () => {
    freshReset();
    openAccount();
    const s = loadSave();
    s.finance.rate = 10;
    persist();
    freshSaveGold(1000);
    const got = exchangeToMingbi(500);
    expect(got).toBe(50);
    expect(loadSave().gold).toBe(500);
    expect(loadSave().finance.mingbi).toBe(150); // 100 开户礼 + 50
    const copper = exchangeToCopper(50);
    expect(copper).toBe(500);
    expect(loadSave().finance.mingbi).toBe(100);
  });

  it('A股：买入扣冥币、卖出回冥币，随行情盈亏', () => {
    freshReset();
    openAccount();
    const s = loadSave();
    s.finance.mingbi = 1000;
    s.finance.prices.mengpo = { price: 10, prev: 10 };
    persist();
    expect(buyStock('mengpo', 50)).toBe(50);
    expect(s.finance.mingbi).toBe(500);
    expect(s.finance.holdings.mengpo).toBe(50);
    // 行情翻倍后卖出
    s.finance.prices.mengpo.price = 20;
    const gain = sellStock('mengpo', 50);
    expect(gain).toBe(1000);
    expect(s.finance.mingbi).toBe(1500);
    // 钱不够只能买得起部分
    expect(buyStock('panguan', 9999)).toBe(Math.floor(1500 / s.finance.prices.panguan.price));
  });

  it('理财：到期连本带息，违约产品可能腰斩', () => {
    freshReset();
    openAccount();
    const s = loadSave();
    s.finance.mingbi = 1000;
    persist();
    expect(buyWealth('mengpo_fund', 500)).toBe(true); // 2 局 +12%
    expect(s.finance.mingbi).toBe(500);
    financeTick(new Rng(1));
    expect(s.finance.wealth[0].remaining).toBe(1);
    financeTick(new Rng(1)); // 稳健产品必兑付
    expect(s.finance.wealth).toHaveLength(0);
    expect(s.finance.mingbi).toBe(500 + Math.round(500 * 1.12));
  });

  it('金币结算公式（闯幽冥按层数、无尽按分钟）', () => {
    expect(goldForRun({ kills: 0, level: 1, mode: 'stages', progress: 1, bonusGold: 0 })).toBe(6);
    expect(goldForRun({ kills: 0, level: 1, mode: 'stages', progress: 5, bonusGold: 200 })).toBe(326);
    expect(goldForRun({ kills: 0, level: 1, mode: 'endless', progress: 601, bonusGold: 0 })).toBe(156);
  });

  it('弑神枪：999999 文，买不起就进不了手；买下后每局自带', () => {
    freshReset();
    freshSaveGold(500000);
    expect(buyLegendary('godslayer', GODSLAYER_PRICE)).toBe(false); // 攒钱半程也买不起
    freshSaveGold(GODSLAYER_PRICE);
    expect(buyLegendary('godslayer', GODSLAYER_PRICE)).toBe(true);
    expect(loadSave().legendary).toContain('godslayer');

    // 每局自带（在道途起手武器之外追加）
    const w = makeWorld();
    w.start('stages', { classId: 'taoist', extraWeapons: ['godslayer'] });
    expect(w.player.weapons.map((x) => x.def.id)).toEqual(['talisman', 'godslayer']);
  });

  it('弑神枪真的一枪清屏', () => {
    const w = makeWorld();
    w.start('stages', { extraWeapons: ['godslayer'] });
    const spawneds = Array.from({ length: 8 }, (_, i) =>
      w.spawnEnemyAt('jiangshi', w.player.x + ((i % 4) - 1.5) * 300, w.player.y + (i < 4 ? -300 : 300)),
    );
    fastForward(w, 2, 1 / 30);
    for (const e of spawneds) expect(e.hp <= 0 || !e.active).toBe(true);
  });
});

describe('冥品商店（门后冥币消费）', () => {
  it('商店门：仅入地府（第2境起）10% 出现，第1境绝不出现', () => {
    let shopAtStage1 = 0;
    let shopAtStage2 = 0;
    for (let i = 0; i < 600; i++) {
      if (rollDoors(1, new Rng(i + 1)).some((d) => d.id === 'shop')) shopAtStage1++;
      if (rollDoors(2, new Rng(i + 401)).some((d) => d.id === 'shop')) shopAtStage2++;
    }
    expect(shopAtStage1).toBe(0);
    expect(shopAtStage2).toBeGreaterThan(0);
    expect(shopAtStage2).toBeLessThan(200); // 期望 ~60，守住“10% 机会”的语义
  });

  it('进店购物：扣冥币、效果生效；离店进入下一关奖励', () => {
    freshReset();
    openAccount();
    const s = loadSave();
    s.finance.mingbi = 1000;
    persist();

    const w = makeWorld(42);
    runToDoors(w);
    w.chooseDoor('shop');
    expect(w.state).toBe('SHOP');
    // runToDoors 抬过上限，先还原成可读数值
    w.player.stats.maxHp = 100;
    w.player.hp = 50;

    // 糯米袋回血
    expect(w.buyShopItem('rice_bag')).toBeNull();
    expect(w.player.hp).toBe(100);
    expect(loadSave().finance.mingbi).toBe(900);

    // 追魂香：局内伤害 +25%
    expect(w.buyShopItem('fury_incense')).toBeNull();
    expect(w.player.stats.damage).toBeCloseTo(1.25, 5);

    // 玉佩：护甲 +3
    expect(w.buyShopItem('jade_pendant')).toBeNull();
    expect(w.player.stats.armor).toBe(3);

    // 秘传符买完后冥币归零，再买被拒
    expect(w.buyShopItem('secret_scroll')).toBeNull();
    expect(w.buyShopItem('rice_bag')).toBe('冥币不足');

    // 离店 → 下一关奖励 → 恢复战斗
    w.finishShop();
    expect(w.state).toBe('REWARD');
    expect(w.stage).toBe(2);
    w.applyUpgrade({ kind: 'heal' });
    expect(w.state).toBe('PLAYING');
  });

  it('秘传符：随机武器升 1 级', () => {
    freshReset();
    openAccount();
    const s = loadSave();
    s.finance.mingbi = 5000;
    persist();
    const w = makeWorld(42);
    const slot = w.player.weapons[0];
    slot.level = 3;
    expect(w.buyShopItem('secret_scroll')).toBeNull();
    expect(slot.level).toBe(4);
  });
});

// ---------------------------------------------------------------- 工具

function freshReset(): void {
  localStorage.clear();
  // 重置 save 模块缓存：换一个全新 World 触发不了，直接改存储后重载即可
  const before = loadSave();
  Object.assign(before, {
    gold: 200, classes: [], activeClass: 'taoist', orbs: [], equippedOrbs: [],
    legendary: [], finance: {
      accountOpen: false, mingbi: 0, rate: 10,
      prices: { mengpo: { price: 24, prev: 24 }, panguan: { price: 18, prev: 18 }, huangquan: { price: 32, prev: 32 }, yanluo: { price: 26, prev: 26 } },
      holdings: {}, wealth: [], lastReport: [],
    },
  });
  persist();
}
