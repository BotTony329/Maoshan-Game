/**
 * 模式策略接口 —— 闯幽冥 / 无尽 的差异全部收敛在这里。
 * World 是共享的状态容器与模拟管线；模式只拥有：进度推进、掉落表、难度曲线、经验规则。
 */
import type { Enemy } from '../types';
import type { World } from '../world';

export interface RunModeStrategy {
  readonly id: 'stages' | 'endless';
  /** HUD / 结算显示用 */
  readonly label: string;
  /** 开局重置本模式的私有进度状态 */
  init(w: World): void;
  /** 每帧模式推进（过关判定 / 事件合成） */
  tick(w: World, dt: number): void;
  /** 难度时间轴（虚拟分钟），刷怪相位与血量缩放消费 */
  difficultyMinute(w: World): number;
  /** 击杀计数（闯关数怪 / 无尽只记总杀） */
  onEnemyKilled(w: World, e: Enemy): void;
  /** 击杀掉落表（模式差异最大的地方） */
  dropLoot(w: World, e: Enemy, petKill: boolean): void;
  /** 经验入库：无尽走升级三选一；闯幽冥无升级（no-op） */
  grantXp(w: World, amount: number): void;
  /** 闯幽冥专属：选门（World.chooseDoor 委托入口，其他模式不实现） */
  chooseDoor?(w: World, door: string): void;
  /** 闯幽冥专属：离店 */
  finishShop?(w: World): void;
}
