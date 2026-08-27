/**
 * 会话单例 —— 跨场景共享的“当前这一局”。
 * GameScene 创建 World；UIScene / LevelUpScene / ResultScene 只读。
 */
import { World } from './world';
import type { RunMode, UpgradeOption } from './types';

interface GameSession {
  world: World;
  /** 最近一次升级三选一的选项（供 LevelUpScene 渲染） */
  pendingOptions: UpgradeOption[];
  lastResult: { victory: boolean };
  /** 主菜单选定的模式；GameScene 开局消费 */
  pendingMode: RunMode;
  /** 结算读回的本局模式（与 world.mode 一致） */
  lastMode: RunMode;
}

export const session: GameSession = {
  world: new World(),
  pendingOptions: [],
  lastResult: { victory: false },
  pendingMode: 'stages',
  lastMode: 'stages',
};
