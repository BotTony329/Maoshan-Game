/**
 * 存档 v4 —— 家底 + 武器库 + 地府金融账户。
 * V3→V4：道途(职业)体系删除，改为"道士+主武器"体系（weapons/equippedWeapon）。
 */
import { EQUIP_CAP } from '../data/equipment';
import { DEFAULT_WEAPON, WEAPONS } from './weapons/registry';
import { FX, STOCKS, WEALTH_PRODUCTS, initPrices, type StockPrices, type WealthHolding } from '../data/finance';
import { MASK_MAX_LEVEL } from '../data/masks';

const KEY = 'maoshan_save_v5';

export interface FinanceData {
  accountOpen: boolean;
  mingbi: number;
  rate: number;
  prices: StockPrices;
  holdings: Record<string, number>;
  wealth: WealthHolding[];
  lastReport: string[];
}

export interface SaveData {
  gold: number;
  /** 已购主武器 id（符文默认免费） */
  weapons: string[];
  /** 当前装备的主武器 id */
  equippedWeapon: string;
  /** 已购装备 id */
  equipment: string[];
  /** 本局携带的装备 id（≤ EQUIP_CAP） */
  equipped: string[];
  bestStageTime: number;
  bestEndlessTime: number;
  runs: number;
  legendary: string[];
  masks: Record<string, number>;
  finance: FinanceData;
}

function defaultFinance(): FinanceData {
  return {
    accountOpen: false,
    mingbi: 0,
    rate: FX.base,
    prices: initPrices(),
    holdings: {},
    wealth: [],
    lastReport: [],
  };
}

const DEFAULT_SAVE: SaveData = {
  gold: 200,
  weapons: [DEFAULT_WEAPON],
  equippedWeapon: DEFAULT_WEAPON,
  equipment: [],
  equipped: [],
  bestStageTime: 0,
  bestEndlessTime: 0,
  runs: 0,
  legendary: [],
  masks: {},
  finance: defaultFinance(),
};

let cache: SaveData | null = null;

export function loadSave(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      cache = { ...DEFAULT_SAVE, ...parsed, finance: { ...defaultFinance(), ...(parsed.finance ?? {}) } };
      sanitize(cache);
      return cache;
    }
  } catch {
    // 损坏档当新档处理
  }
  cache = { ...DEFAULT_SAVE, weapons: [DEFAULT_WEAPON], legendary: [], masks: {}, finance: defaultFinance() };
  return cache;
}

export function persist(): void {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // 无痕模式等写入失败：本次会话内仍可玩
  }
}

function sanitize(s: SaveData): void {
  s.gold = Math.max(0, Math.floor(s.gold));
  s.weapons = [...new Set(s.weapons)].filter((id) => WEAPONS[id] && WEAPONS[id].base);
  if (!s.weapons.includes(DEFAULT_WEAPON)) s.weapons.unshift(DEFAULT_WEAPON);
  if (!WEAPONS[s.equippedWeapon] || !s.weapons.includes(s.equippedWeapon)) {
    s.equippedWeapon = DEFAULT_WEAPON;
  }
  s.equipment = [...new Set(s.equipment)];
  s.equipped = s.equipped.filter((id) => s.equipment.includes(id)).slice(0, EQUIP_CAP);
  s.masks = s.masks ?? {};
  for (const lv of Object.values(s.masks)) {
    if (lv < 0 || lv > MASK_MAX_LEVEL) { s.masks = {}; break; }
  }
  const f = s.finance;
  f.mingbi = Math.max(0, Math.floor(f.mingbi));
  f.rate = Math.min(FX.max, Math.max(FX.min, f.rate || FX.base));
  for (const st of STOCKS) {
    if (!f.prices[st.id] || !(f.prices[st.id].price > 0)) {
      f.prices[st.id] = { price: st.base, prev: st.base };
    }
  }
  f.holdings = f.holdings ?? {};
  f.wealth = Array.isArray(f.wealth) ? f.wealth : [];
  f.lastReport = Array.isArray(f.lastReport) ? f.lastReport : [];
}

/** 购买：主武器/装备共用。钱不够或已拥有返回 false */
export function buy(kind: 'weapon' | 'equip', id: string, price: number): boolean {
  const s = loadSave();
  const list = kind === 'weapon' ? s.weapons : s.equipment;
  if (list.includes(id) || s.gold < price) return false;
  s.gold -= price;
  list.push(id);
  persist();
  return true;
}

/** 装备主武器（须已拥有或为默认武器） */
export function equipWeapon(id: string): void {
  const s = loadSave();
  if (id !== DEFAULT_WEAPON && !s.weapons.includes(id)) return;
  s.equippedWeapon = id;
  persist();
}

/** 勾选/取消携带一件装备（须已拥有，受 EQUIP_CAP 限制） */
export function toggleEquip(id: string): void {
  const s = loadSave();
  if (!s.equipment.includes(id)) return;
  const i = s.equipped.indexOf(id);
  if (i >= 0) s.equipped.splice(i, 1);
  else if (s.equipped.length < EQUIP_CAP) s.equipped.push(id);
  persist();
}

/** 升级鬼面具（闯关页）。价格由存档层按等级权威计算。返回实际升到的等级（0 = 失败） */
export function buyMask(id: string): number {
  const s = loadSave();
  const cur = s.masks[id] ?? 0;
  if (cur >= MASK_MAX_LEVEL) return 0;
  const price = maskPrice(cur + 1);
  if (s.gold < price) return 0;
  s.gold -= price;
  s.masks[id] = cur + 1;
  persist();
  return cur + 1;
}

import { maskPrice } from '../data/masks';

export function spendMingbi(amount: number): boolean {
  const s = loadSave();
  if (s.finance.mingbi < amount) return false;
  s.finance.mingbi -= amount;
  persist();
  return true;
}

export function addGold(amount: number): void {
  const s = loadSave();
  s.gold = Math.max(0, s.gold + Math.round(amount));
  persist();
}

export function recordRun(mode: 'stages' | 'endless', timeSurvived: number): void {
  const s = loadSave();
  s.runs++;
  if (mode === 'stages') s.bestStageTime = Math.max(s.bestStageTime, Math.floor(timeSurvived));
  else s.bestEndlessTime = Math.max(s.bestEndlessTime, Math.floor(timeSurvived));
  persist();
}

export function openAccount(): void {
  const s = loadSave();
  if (s.finance.accountOpen) return;
  s.finance.accountOpen = true;
  s.finance.mingbi += FX.signupBonus;
  persist();
}

export function exchangeToMingbi(copper: number): number {
  const s = loadSave();
  const usable = Math.min(s.gold, copper);
  const mingbi = Math.floor(usable / s.finance.rate);
  if (mingbi <= 0) return 0;
  s.gold -= Math.round(mingbi * s.finance.rate);
  s.finance.mingbi += mingbi;
  persist();
  return mingbi;
}

export function exchangeToCopper(mingbi: number): number {
  const s = loadSave();
  const usable = Math.min(s.finance.mingbi, mingbi);
  if (usable <= 0) return 0;
  const copper = Math.floor(usable * s.finance.rate);
  s.finance.mingbi -= usable;
  s.gold += copper;
  persist();
  return copper;
}

export function buyStock(id: string, qty: number): number {
  const s = loadSave();
  const st = s.finance.prices[id];
  if (!st || qty <= 0) return 0;
  const affordable = Math.floor(s.finance.mingbi / st.price);
  const deal = Math.min(qty, affordable);
  if (deal <= 0) return 0;
  s.finance.mingbi -= deal * st.price;
  s.finance.holdings[id] = (s.finance.holdings[id] ?? 0) + deal;
  persist();
  return deal;
}

export function sellStock(id: string, qty: number): number {
  const s = loadSave();
  const st = s.finance.prices[id];
  const held = s.finance.holdings[id] ?? 0;
  if (!st || qty <= 0 || held <= 0) return 0;
  const deal = Math.min(qty, held);
  const gain = deal * st.price;
  s.finance.holdings[id] = held - deal;
  s.finance.mingbi += gain;
  persist();
  return gain;
}

export function buyWealth(pid: string, principal: number): boolean {
  const s = loadSave();
  if (principal <= 0 || s.finance.mingbi < principal) return false;
  const product = WEALTH_PRODUCTS.find((p) => p.id === pid);
  if (!product) return false;
  s.finance.mingbi -= principal;
  s.finance.wealth.push({ pid, principal, remaining: product.runs });
  persist();
  return true;
}

export function financeTick(rng: { next(): number; range(min: number, max: number): number }): string[] {
  const s = loadSave();
  const report: string[] = [];

  const matured: WealthHolding[] = [];
  s.finance.wealth = s.finance.wealth.filter((h) => {
    h.remaining -= 1;
    if (h.remaining <= 0) {
      matured.push(h);
      return false;
    }
    return true;
  });
  for (const h of matured) {
    const product = WEALTH_PRODUCTS.find((p) => p.id === h.pid);
    const defaulted = !!(product && product.risk > 0 && rng.next() < product.risk);
    const payout = defaulted
      ? Math.round(h.principal * 0.5)
      : Math.round(h.principal * (1 + (product?.rate ?? 0)));
    s.finance.mingbi += payout;
    report.push(`${product?.name ?? '理财'}到期：${defaulted ? '烂尾违约！仅回收' : '连本带息回收'} ${payout} 冥币`);
  }

  for (const st of STOCKS) {
    const p = s.finance.prices[st.id];
    p.prev = p.price;
    p.price = Math.round(Math.min(400, Math.max(2, p.price * rng.range(0.72, 1.35))));
  }

  const oldRate = s.finance.rate;
  s.finance.rate = Math.round(Math.min(FX.max, Math.max(FX.min, s.finance.rate * rng.range(1 - FX.swing, 1 + FX.swing))) * 10) / 10;
  report.push(`汇率：1 冥币 = ${oldRate} → ${s.finance.rate} 文`);

  s.finance.lastReport = report;
  persist();
  return report;
}

/** 购买传说武器（铜钱计价，鬼市传说位） */
export function buyLegendary(id: string, price: number): boolean {
  const s = loadSave();
  if (s.legendary.includes(id) || s.gold < price) return false;
  s.gold -= price;
  s.legendary.push(id);
  persist();
  return true;
}
