/**
 * 敌人行为注册表 —— behavior id → 策略函数。
 * 新敌人行为 = 新函数 + 注册一行。
 */
import type { EnemyBehavior } from './types-helper';
import { chase, drift, hop } from './basic';
import { dash } from './dash';
import { ranged } from './ranged';
import { bossHangu, bossShiwang } from './bosses';

export const ENEMY_BEHAVIORS: Record<string, EnemyBehavior> = {
  chase, hop, drift, dash, ranged,
  boss_hangu: bossHangu,
  boss_shiwang: bossShiwang,
};
