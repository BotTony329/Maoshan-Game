/**
 * 模式注册表 —— 按模式 id 查策略。
 */
import type { RunMode } from '../types';
import { endlessMode } from './endless';
import { stagesMode } from './stages';
import type { RunModeStrategy } from './strategy';

const STRATEGIES: Record<RunMode, RunModeStrategy> = {
  stages: stagesMode,
  endless: endlessMode,
};

export function modeStrategyFor(mode: RunMode): RunModeStrategy {
  return STRATEGIES[mode] ?? stagesMode;
}
