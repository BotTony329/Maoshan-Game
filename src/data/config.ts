/**
 * 全局平衡数值 —— 所有“游戏手感”相关的常数集中在这里，
 * 调节游戏难度只动这一个文件，不改逻辑。
 */
import type { PlayerStats } from '../game/types';

/** 竞技场为有界矩形（尸潮类游戏惯例，VS 本体同样有边界） */
export const ARENA = {
  width: 2400,
  height: 2400,
};

/**
 * 闯幽冥：关卡由击杀数结算（V2.1 用户实测 2 分钟太长）。
 * 普通关前期杀 10~20 个即过，目标随深度缓增；Boss 房以斩杀 Boss 结算。
 */
export function stageKillTarget(stage: number): number {
  return Math.min(10 + (stage - 1) * 5, 60);
}

/** 关卡主题：从人间杀穿地府，走完进入轮回炼狱循环 */
export const STAGE_THEMES = [
  { name: '人间 · 乱葬岗', tint: 0x18251c },
  { name: '黄泉路', tint: 0x221a30 },
  { name: '忘川河畔', tint: 0x14222c },
  { name: '恶狗村', tint: 0x2a1a14 },
  { name: '鬼门关', tint: 0x2c1216 },
  { name: '阎罗殿', tint: 0x2c2610 },
];

export function stageTheme(stage: number): { name: string; tint: number } {
  const base = STAGE_THEMES[(stage - 1) % STAGE_THEMES.length];
  const loop = Math.floor((stage - 1) / STAGE_THEMES.length);
  if (loop === 0) return base;
  return { name: `轮回炼狱${'一二三四五六七八九'[Math.min(loop - 1, 8)]} · ${base.name}`, tint: base.tint };
}

/** 一局的总时长（秒）。—— V2 起仅作无尽模式统计口径，不再有胜利时刻 */
export const RUN_DURATION = 15 * 60;

export const BASE_STATS: PlayerStats = {
  maxHp: 100,
  speed: 150,      // px/s
  damage: 1,       // 倍率
  area: 1,
  cooldown: 0,     // 减少比例
  regen: 0,
  xpGain: 1,
  armor: 0,
  magnet: 70,      // 拾取吸附半径 px
};

/** 升级所需经验：曲线前缓后陡，10 分钟约 30 级上下 */
export function xpToNext(level: number): number {
  return Math.floor(8 + (level - 1) * 6 + Math.pow(level, 1.7));
}

/** 敌人血量随时间的全局成长（叠加在波次表 hpScale 上） */
export function globalHpScale(minutes: number): number {
  return 1 + 0.12 * minutes + 0.01 * minutes * minutes;
}

export const PLAYER = {
  radius: 14,
  /** 受击后的无敌帧（秒），防止被围殴瞬间蒸发 */
  invulnTime: 0.5,
  maxWeapons: 6,
  maxPassives: 6,
};

/** 出生环：敌人从屏幕外一圈生成，距玩家该半径处刷出 */
export const SPAWN_RING = 620;

/** 敌人被甩开超过该距离时回收重生到出生环上，维持场面压力 */
export const ENEMY_RECYCLE_DIST = 1100;

/** 玩家拾取物吸附时的移动速度 */
export const PICKUP_MAGNET_SPEED = 420;

/** 局内掉落：怪物额外掉落功能性拾取物的概率 */
export const DROPS = {
  healChance: 0.012,   // 血馒头：回复 30 HP
  bombChance: 0.005,   // 爆竹：全屏伤害
  healValue: 30,
  bombDamage: 120,
};

/** 精英怪：每分钟刷一只，属性放大且必掉补给 */
export const ELITE = {
  hpMult: 8,
  radiusMult: 1.45,
  speedMult: 0.9,
  xpMult: 10,
};

/** 伤害飘字 / 粒子等表现层数值由渲染层自行持有，此处只放逻辑上限 */
export const LIMITS = {
  maxProjectiles: 600,
  maxHazards: 160,
  maxPickups: 400,
};

/**
 * 局末铜钱结算：捡到的一切折算成钱带走。
 * 闯幽冥按深入层数重赏（越往下越值钱），无尽看坚持的分钟数。
 */
export function goldForRun(input: {
  kills: number;
  level: number;
  mode: 'stages' | 'endless';
  /** stages：到达的关卡序号；endless：总存活秒数 */
  progress: number;
  bonusGold: number;
  /** 搜打撤：携带中的赃物（未撤离不入账） */
  carryLoot?: number;
  /** 搜打撤：是否成功撤离（false/缺省 = 死亡，只有基础奖励） */
  extracted?: boolean;
}): number {
  if (input.mode === 'stages') {
    const base = input.kills * 0.5 + input.level * 6;
    // 死亡：只有基础奖励——携带赃物与门奖金尽失（搜打撤核心风险）
    if (!input.extracted) return Math.round(base);
    return Math.round(base + (input.progress - 1) * 30 + input.bonusGold + (input.carryLoot ?? 0));
  }
  const base = input.kills * 0.5 + input.level * 6 + input.bonusGold;
  return Math.round(base + Math.floor(input.progress / 60) * 15);
}

/** 无尽模式时间轴：每 5 分钟一个事件节拍 */
export const ENDLESS = {
  eventEvery: 300,
  /** 每完整一巡（3 个事件）Boss 血量倍率再抬一档 */
  bossHpStep: 0.4,
  hordeBase: 60,
};
