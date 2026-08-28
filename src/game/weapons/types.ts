/**
 * 武器模块接口 —— 每把武器一个自包含模块（def + tick + 专属升级钩子）。
 * 新武器 = 新建一个模块文件 + registry 注册一行，不改任何现有代码。
 */
import type { Enemy, WeaponDef, WeaponSlot, WeaponStats } from '../types';
import type { World } from '../world';

export type { Enemy, WeaponDef, WeaponSlot, WeaponStats } from '../types';

export interface WeaponModule {
  def: WeaponDef;
  /** 每帧行为：冷却、发射、常驻判定都在这里 */
  tick(w: World, slot: WeaponSlot, s: WeaponStats, dt: number): void;
  /** 击杀钩子（汲魂/丰收等专属升级的结算点），可选 */
  onEnemyKilled?(w: World, e: Enemy, slot: WeaponSlot, s: WeaponStats): void;
}

/** 武器专属升级定义：只有装备了该武器才会出现在奖励池 */
export interface ExclusiveUpgrade {
  id: string;
  name: string;
  desc: string;
}
