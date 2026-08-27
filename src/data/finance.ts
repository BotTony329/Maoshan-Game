/**
 * 地府金融系统 —— 阴间钱庄的核心数据。
 * 冥币买不了任何东西，只能炒股、买理财；挣了按当局汇率换回铜钱。
 * 目标：让玩家靠复利与低买高卖，够到那把 999999 文的弑神枪。
 */
import { Rng } from '../core/math';

/** 汇率：1 冥币 = rate 文铜钱，每局结算后随机游走 */
export const FX = {
  base: 10,
  min: 6,
  max: 18,
  /** 每局汇率波动幅度 ±18% */
  swing: 0.18,
  /** 开户礼 */
  signupBonus: 100,
};

export interface StockDef {
  id: string;
  name: string;
  /** 初始股价（冥币） */
  base: number;
}

/** 地府A股 —— 四只阴间蓝筹 */
export const STOCKS: StockDef[] = [
  { id: 'mengpo', name: '孟婆汤业', base: 24 },
  { id: 'panguan', name: '判官笔业', base: 18 },
  { id: 'huangquan', name: '黄泉高铁', base: 32 },
  { id: 'yanluo', name: '阎罗电子', base: 26 },
];

/** 每局价格波动：[-28%, +35%]，偶发财经事件大起大落 */
export const MARKET = {
  down: 0.72,
  up: 1.35,
  newsChance: 0.35,
  newsSwing: 0.55,
  minPrice: 2,
  maxPrice: 400,
};

export interface MarketReport {
  headlines: string[];
  changes: { id: string; name: string; pct: number }[];
}

const NEWS_UP = [
  '阎王御批：地府基建全面放行',
  '孟婆汤 detected 孟婆汤热量为 0，阴间疯抢',
  '判官笔获得生死簿 API 授权',
  '黄泉高铁通车，奈何桥段破土动工',
];
const NEWS_DOWN = [
  '枉死城房价崩了，热钱出逃',
  '黑白差班费拖欠，阴间罢工',
  '轮回系统宕机三日夜，投胎积压',
  '酆都大帝整顿阴间金融乱象',
];

/** 持仓价格表（存档态）：id -> {price, prev} */
export type StockPrices = Record<string, { price: number; prev: number }>;

export function initPrices(): StockPrices {
  const out: StockPrices = {};
  for (const s of STOCKS) out[s.id] = { price: s.base, prev: s.base };
  return out;
}

/** 每局结算推进一次行情，返回财经快报 */
export function advanceMarket(prices: StockPrices, rng: Rng): MarketReport {
  const headlines: string[] = [];
  const changes: MarketReport['changes'] = [];

  for (const s of STOCKS) {
    const st = prices[s.id];
    st.prev = st.price;
    let factor = rng.range(MARKET.down, MARKET.up);
    if (rng.next() < MARKET.newsChance) {
      const up = rng.next() < 0.5;
      factor *= up ? 1 + MARKET.newsSwing : 1 - MARKET.newsSwing;
      headlines.push(`【快报】${s.name}：${up ? rng.pick(NEWS_UP) : rng.pick(NEWS_DOWN)}`);
    }
    st.price = Math.round(Math.min(MARKET.maxPrice, Math.max(MARKET.minPrice, st.price * factor)));
    changes.push({ id: s.id, name: s.name, pct: (st.price - st.prev) / st.prev });
  }
  return { headlines, changes };
}

// ---------------------------------------------------------------- 理财产品

export interface WealthProduct {
  id: string;
  name: string;
  /** 锁定期（局） */
  runs: number;
  /** 期满收益率 */
  rate: number;
  /** 违约概率（期满只回一半本金） */
  risk: number;
  desc: string;
}

export const WEALTH_PRODUCTS: WealthProduct[] = [
  { id: 'mengpo_fund', name: '孟婆汤基金', runs: 2, rate: 0.12, risk: 0, desc: '两局到期，稳稳的幸福' },
  { id: 'liudao_bond', name: '六道轮回债', runs: 3, rate: 0.22, risk: 0, desc: '三轮轮回，利滚利' },
  { id: 'wangsi_reit', name: '枉死城地产', runs: 4, rate: 0.4, risk: 0.25, desc: '四局翻四成，但可能烂尾' },
];

export interface WealthHolding {
  pid: string;
  principal: number;
  /** 剩余局数 */
  remaining: number;
}

// ---------------------------------------------------------------- 传说武器

/** 弑神枪标价：纯攒钱难以企及，必须经营阴间金融 */
export const GODSLAYER_PRICE = 999999;
