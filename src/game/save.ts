/**
 * 存档 v3 —— 家底 + 地府金融账户。
 * v2 结构（无金融）读取后自动补默认金融字段；铜钱/道途/宝珠保留。
 */
import { ORB_CAP } from '../data/orbs';
import { DEFAULT_CLASS } from '../data/classes';
import { FX, STOCKS, WEALTH_PRODUCTS, initPrices, type StockPrices, type WealthHolding } from '../data/finance';
import { MASK_MAX_LEVEL, maskPrice } from '../data/masks';

const KEY = 'maoshan_save_v3';

export interface FinanceData {
  accountOpen: boolean;
  /** 冥币活期余额 */
  mingbi: number;
  /** 汇率：1 冥币 = rate 文铜钱（每局结算随机游走） */
  rate: number;
  prices: StockPrices;
  holdings: Record<string, number>;
  wealth: WealthHolding[];
  /** 上次结算的财经快报（银行界面展示） */
  lastReport: string[];
}

export interface SaveData {
  gold: number;
  classes: string[];
  activeClass: string;
  orbs: string[];
  equippedOrbs: string[];
  bestClassicTime: number;
  bestEndlessTime: number;
  runs: number;
  /** 已解锁的传说武器（弑神枪）等 */
  legendary: string[];
  /** 鬼面具等级（闯幽冥专属人物强化）：id -> 等级 */
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
  classes: [],
  activeClass: DEFAULT_CLASS,
  orbs: [],
  equippedOrbs: [],
  bestClassicTime: 0,
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
  cache = { ...DEFAULT_SAVE, classes: [], orbs: [], equippedOrbs: [], legendary: [], finance: defaultFinance() };
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
  s.classes = [...new Set(s.classes)];
  s.orbs = [...new Set(s.orbs)];
  s.equippedOrbs = s.equippedOrbs.filter((id) => s.orbs.includes(id)).slice(0, ORB_CAP);
  if (s.activeClass !== DEFAULT_CLASS && !s.classes.includes(s.activeClass)) {
    s.activeClass = DEFAULT_CLASS;
  }
  s.masks = s.masks ?? {};
  for (const lv of Object.values(s.masks)) {
    if (lv < 0 || lv > MASK_MAX_LEVEL) {
      s.masks = {};
      break;
    }
  }
  const f = s.finance;
  f.mingbi = Math.max(0, Math.floor(f.mingbi));
  f.rate = Math.min(FX.max, Math.max(FX.min, f.rate || FX.base));
  // 股价表补齐缺上市的新票
  for (const st of STOCKS) {
    if (!f.prices[st.id] || !(f.prices[st.id].price > 0)) {
      f.prices[st.id] = { price: st.base, prev: st.base };
    }
  }
  f.holdings = f.holdings ?? {};
  f.wealth = Array.isArray(f.wealth) ? f.wealth : [];
  f.lastReport = Array.isArray(f.lastReport) ? f.lastReport : [];
}

// ---------------------------------------------------------------- 基础操作（沿用）

export function buy(kind: 'class' | 'orb', id: string, price: number): boolean {
  const s = loadSave();
  const list = kind === 'class' ? s.classes : s.orbs;
  if (list.includes(id) || s.gold < price) return false;
  s.gold -= price;
  list.push(id);
  persist();
  return true;
}

export function selectClass(id: string): void {
  const s = loadSave();
  if (id !== DEFAULT_CLASS && !s.classes.includes(id)) return;
  s.activeClass = id;
  persist();
}

export function toggleOrb(id: string): void {
  const s = loadSave();
  if (!s.orbs.includes(id)) return;
  const i = s.equippedOrbs.indexOf(id);
  if (i >= 0) s.equippedOrbs.splice(i, 1);
  else if (s.equippedOrbs.length < ORB_CAP) s.equippedOrbs.push(id);
  persist();
}

/** 冥币消费（局内冥品商店）。余额不足返回 false */
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
  if (mode === 'stages') s.bestClassicTime = Math.max(s.bestClassicTime, Math.floor(timeSurvived));
  else s.bestEndlessTime = Math.max(s.bestEndlessTime, Math.floor(timeSurvived));
  persist();
}

// ---------------------------------------------------------------- 地府银行

/** 开户：一次性，送开户礼 */
export function openAccount(): void {
  const s = loadSave();
  if (s.finance.accountOpen) return;
  s.finance.accountOpen = true;
  s.finance.mingbi += FX.signupBonus;
  persist();
}

/** 铜钱 → 冥币。返回换到的冥币数（钱不够换 1 单位时为 0） */
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

/** 冥币 → 铜钱。返回换到的铜钱数 */
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

/** 买入股票（冥币计价）。返回实际成交股数 */
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

/** 卖出股票。返回到账冥币 */
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

/** 买理财产品（冥币计价） */
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

/**
 * 每局结算推进金融世界：理财到期、行情波动、汇率游走。
 * 返回快报文案（供银行/结算界面展示）。
 */
export function financeTick(rng: { next(): number; range(min: number, max: number): number }): string[] {
  const s = loadSave();
  const report: string[] = [];

  // 理财到期（可能违约）
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

  // 行情波动
  for (const st of STOCKS) {
    const p = s.finance.prices[st.id];
    p.prev = p.price;
    p.price = Math.round(Math.min(400, Math.max(2, p.price * rng.range(0.72, 1.35))));
  }

  // 汇率游走
  const oldRate = s.finance.rate;
  s.finance.rate = Math.round(Math.min(FX.max, Math.max(FX.min, s.finance.rate * rng.range(1 - FX.swing, 1 + FX.swing))) * 10) / 10;
  report.push(`汇率：1 冥币 = ${oldRate} → ${s.finance.rate} 文`);

  s.finance.lastReport = report;
  persist();
  return report;
}

/** 升级鬼面具（闯关页）。价格由存档层按等级权威计算，UI 报价仅展示。返回实际升到的等级（0 = 失败） */
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

/** 购买传说武器（铜钱计价，鬼市传说位） */
export function buyLegendary(id: string, price: number): boolean {
  const s = loadSave();
  if (s.legendary.includes(id) || s.gold < price) return false;
  s.gold -= price;
  s.legendary.push(id);
  persist();
  return true;
}
