/**
 * 游戏领域共享类型 —— 逻辑层（core/game/data）与渲染层（scenes/render）的共同语言。
 * 本文件不 import Phaser：整个逻辑层保持引擎无关，可在 vitest 中直接驱动。
 */

/**
 * 一局的状态机。
 * PLAYING 战斗推进；DOORS 关卡结束亮门待选；REWARD 选关卡奖励；其余终态。
 * （V2 起升级不再打断战斗，三选一挪到关卡切换）
 */
/** 局模式：闯幽冥（2 分钟一关、亮门抉择）/ 无尽尸潮（死亡才结算） */
export type RunMode = 'stages' | 'endless';

/**
 * 一局的状态机。
 * PLAYING 战斗推进；DOORS 关卡结束亮门待选；REWARD 选关卡奖励；其余终态。
 * （V2 起升级不再打断战斗，三选一挪到关卡切换）
 */
export type RunState = 'MENU' | 'PLAYING' | 'DOORS' | 'REWARD' | 'SHOP' | 'LEVEL_UP' | 'GAME_OVER' | 'VICTORY';

export type SfxName =
  | 'shoot' | 'hit' | 'kill' | 'hurt' | 'pickup' | 'levelup'
  | 'select' | 'thunder' | 'boss' | 'bomb' | 'heal' | 'bell' | 'victory';

// ---------------------------------------------------------------- 武器

export interface WeaponStats {
  damage: number;   // 单次伤害
  cooldown: number; // 触发间隔（秒）
  amount: number;   // 单次数量（弹体数 / 环绕剑数 / 落雷数…）
  area: number;     // 范围倍率（半径 / 长度）
  speed: number;    // 弹速 / 转速倍率
  duration: number; // 持续时间（秒）
  pierce: number;   // 穿透数
  knockback: number; // 击退力度（px/s，0 = 无击退）
}

/** 每一级对基础值的覆盖项；计算时从 Lv1 起逐级叠加合并 */
export interface WeaponLevelStats extends Partial<WeaponStats> {
  /** 卡片上展示的升级说明，如 “+1 道符” */
  note?: string;
}

     // 弑神枪：传说神器，定期荡涤全屏

export interface ExclusiveUpgrade {
  id: string;
  name: string;
  desc: string;
}

export interface WeaponDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  /** index 0 = Lv1 基础值（全量），其后为每级覆盖 */
  levels: WeaponLevelStats[];
  color: number;   // 主题色（渲染层用）
  texture: string; // 图标贴图键
  /** true = 主武器（鬼市武器库购买装备，不入局内奖励池） */
  base?: boolean;
  /** 武器库售价（主武器用；0/缺省 = 免费默认） */
  price?: number;
  /** true = 仅特殊途径获得（传说武器等），不进入局内奖励池 */
  marketOnly?: boolean;
  /** 武器专属升级：只有装备了该武器才会出现在奖励池 */
  exclusives?: { id: string; name: string; desc: string }[];
}

// ---------------------------------------------------------------- 被动

/** 玩家最终属性。字段语义：maxHp/regen/armor 为加法，其余为比例加成 */
export interface PlayerStats {
  maxHp: number;
  speed: number;
  damage: number;
  area: number;
  cooldown: number; // 表示“减少比例”，如 0.18 = 冷却缩短 18%
  regen: number;
  xpGain: number;
  armor: number;
  magnet: number;
}

export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  /** 每升一级提供的增量（在基础值上累加） */
  perLevel: Partial<PlayerStats>;
  color: number;
  texture: string;
  /** true = 仅鬼市出售获得，不进入局内升级池 */
  marketOnly?: boolean;
}

// ---------------------------------------------------------------- 敌人

export type EnemyBehaviorId =
  | 'chase'        // 直线追击
  | 'hop'          // 僵尸跳：蓄力→跳跃爆发
  | 'drift'        // 飘行（飞行怪，带横向摆动）
  | 'dash'         // 罗刹：接近后蓄力突进
  | 'ranged'       // 狐妖：保持距离喷火球
  | 'boss_hangu'   // 旱魃：召唤+环状弹幕
  | 'boss_shiwang'; // 尸王：冲锋+震地环

export interface EnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  behavior: EnemyBehaviorId;
  texture: string;
  scale?: number;
  boss?: boolean;
  /** 0=全额击退，1=免疫击退 */
  knockbackResist?: number;
}

export interface Enemy {
  active: boolean;
  def: EnemyDef;
  x: number; y: number;
  vx: number; vy: number;
  /** 每帧重算的基础移速（Elite 会被压低速） */
  speed: number;
  radius: number;
  hp: number; maxHp: number;
  /** 出生时按分钟数缩放过的倍率，Boss 不缩放 */
  hpScale: number;
  elite: boolean;
  damage: number;
  /** 各武器实例的命中冷却表：slotKey -> 下次可被该武器命中的世界时间 */
  hitCd: Map<string, number>;
  slowFactor: number;
  slowUntil: number;
  knockX: number; knockY: number;
  flash: number; // 受击白闪剩余时间（渲染层读）
  /** 行为策略的私有状态（跳跃计时、突进阶段等） */
  ai: Record<string, number>;
  /** 蚀魂咒（术士邪恶巫术）：持续侵蚀伤害，死亡时向邻近扩散 */
  curseDps: number;
  curseUntil: number;
  curseAcc: number;
  /** 最后一击的来源标记（如 'pet'），击杀结算按来源特判 */
  lastHitSource: string;
}

/** 召唤物（无敌友军）：地狱犬/骷髅犬/未来召唤 */
export interface Ally {
  kind: string;
  x: number; y: number;
  vx: number; vy: number;
  faceX: number; faceY: number;
}

// ---------------------------------------------------------------- 关卡与门

/** 门种：关卡结束后亮出的抉择 */
export type DoorId = 'next' | 'supply' | 'mob' | 'boss' | 'shop' | 'extract';

export interface DoorDef {
  id: DoorId;
  name: string;
  desc: string;
  color: number;
}

/** 关卡主题：从人间一路杀穿地府，末境之后进入轮回炼狱循环 */
export interface StageTheme {
  name: string;
  /** 场景染色（叠在地面上的氛围色） */
  tint: number;
}

// ---------------------------------------------------------------- 宝珠（鬼市独家内容）

/** 宝珠定义：鬼市独家机制道具，一局至多携带 ORB_CAP 颗 */
export interface OrbDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  color: number;
  texture: string;
}

// ---------------------------------------------------------------- 弹幕与区域

export type ProjectileKind = 'talisman' | 'coin' | 'fireball' | 'ink' | 'fire' | 'wand' | 'curse';

export interface Projectile {
  active: boolean;
  kind: ProjectileKind;
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  damage: number;
  pierce: number;
  life: number;
  rotation: number;
  /** 已命中的敌人集合，防止同一弹对同一目标多次结算 */
  hit: Set<Enemy>;
  friendly: boolean; // false = 敌方弹幕（狐妖火球）
  color: number;
  /** >0 = 命中（或到寿）时的爆裂半径（火符） */
  blast: number;
  /** >0 = 每秒可拐向最近敌人的转向弧度（西洋魔杖） */
  homing: number;
}

export type HazardKind = 'aura' | 'ring' | 'beam' | 'strike' | 'spiral' | 'chain' | 'sweep' | 'totem' | 'blizzard';

/**
 * 区域效果统一抽象：光环、冲击环、光束、落雷、螺旋全部归一为
 * “带生命周期的圆形/线段判定体”，由 World.updateHazards 统一推进与结算。
 */
export interface Hazard {
  active: boolean;
  kind: HazardKind;
  x: number; y: number;
  follow: boolean;        // true = 每帧吸附到玩家位置（糯米阵/桃木剑中心）
  r: number;              // 当前判定半径
  maxR: number;           // ring 的最终半径 / beam 的长度
  width: number;          // beam 半宽 / strike 警示半径等次要尺寸
  angle: number;          // beam 方向、spiral 当前角
  spin: number;           // spiral 角速度
  damage: number;
  t: number; dur: number; // 已持续 / 总时长
  tickEvery: number;      // 对同一敌人的重复判定间隔；0 = 只判一次
  slow: number;           // 命中减速比例
  knockback: number;
  color: number;
  data: number;           // 行为自由量（strike 是否已落下 / spiral 臂数…）
  /** true = 伤害玩家（尸王震地环）；false = 伤害敌人 */
  hostile: boolean;
  hitCd: Map<Enemy, number>;
  /** chain：闪电跳跃路径；sweep：无额外用途（角度/半径用 angle/r） */
  points?: { x: number; y: number }[];
}

/** 伤害飘字（逻辑层产生真实数值，渲染层负责展示与销毁） */
export interface Floater {
  x: number;
  y: number;
  amount: number;
  t: number;
}

export type PickupKind = 'xp' | 'heal' | 'bomb' | 'treasure';

export interface Pickup {
  active: boolean;
  kind: PickupKind;
  x: number; y: number;
  value: number;
  t: number; // 存在时长（浮动动画用）
}

// ---------------------------------------------------------------- 玩家

export interface WeaponSlot {
  def: WeaponDef;
  level: number;
  timer: number;                  // 行为自主管理的冷却计时
  state: Record<string, number>;  // 行为私有状态（环绕角、螺旋角等）
  instance: number;
  /** 已获得的专属升级 id（萨满锤闪电箭/术士杖汲魂等） */
  specials: string[];
}

export interface Player {
  x: number; y: number;
  radius: number;
  hp: number;
  level: number;
  xp: number;
  xpToNext: number;
  invuln: number;
  faceX: number; faceY: number; // 最后移动方向（铜钱剑发射方向）
  weapons: WeaponSlot[];
  passives: Map<string, number>;
  stats: PlayerStats;
}

// ---------------------------------------------------------------- 升级三选一

export type UpgradeOption =
  | { kind: 'weapon-new'; id: string }
  | { kind: 'weapon-upgrade'; id: string; fromLevel: number }
  | { kind: 'special'; weapon: string; id: string }
  | { kind: 'passive-new'; id: string }
  | { kind: 'passive-upgrade'; id: string; fromLevel: number }
  | { kind: 'heal' }
  | { kind: 'bomb' };

// ---------------------------------------------------------------- 波次

export interface SpawnRule {
  enemy: string;
  /** 生成间隔（秒） */
  every: number;
  /** 每次生成的数量 */
  batch: number;
}

export interface WavePhase {
  fromMin: number;
  rules: SpawnRule[];
  /** 敌人血量按分钟数的额外缩放（叠加在全局成长曲线上） */
  hpScale: number;
  maxEnemies: number;
}

export type TimedEventType = 'boss' | 'horde' | 'victory';

export interface TimedEvent {
  /** 触发时刻（秒） */
  at: number;
  type: TimedEventType;
  enemy?: string;
  count?: number;
}
