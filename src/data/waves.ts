/**
 * 波次导演表 —— 每分钟的刷怪构成。
 * 难度按“虚拟分钟”推进：闯幽冥模式 = (关卡-1)*2 + 关内分钟；无尽 = 真实分钟。
 */
import type { WavePhase } from '../game/types';

export const WAVE_PHASES: WavePhase[] = [  {
    fromMin: 0,
    hpScale: 1.0,
    maxEnemies: 90,
    rules: [{ enemy: 'jiangshi', every: 1.1, batch: 2 }],
  },
  {
    fromMin: 1,
    hpScale: 1.15,
    maxEnemies: 110,
    rules: [
      { enemy: 'jiangshi', every: 1.0, batch: 2 },
      { enemy: 'hopper', every: 2.6, batch: 2 },
    ],
  },
  {
    fromMin: 2,
    hpScale: 1.3,
    maxEnemies: 130,
    rules: [
      { enemy: 'jiangshi', every: 0.9, batch: 3 },
      { enemy: 'hopper', every: 2.2, batch: 2 },
      { enemy: 'flying', every: 3.2, batch: 2 },
    ],
  },
  {
    fromMin: 4,
    hpScale: 1.6,
    maxEnemies: 150,
    rules: [
      { enemy: 'jiangshi', every: 0.8, batch: 3 },
      { enemy: 'flying', every: 2.6, batch: 2 },
      { enemy: 'shikki', every: 4.0, batch: 2 },
      { enemy: 'huli', every: 5.0, batch: 1 },
    ],
  },
  {
    fromMin: 6,
    hpScale: 2.0,
    maxEnemies: 170,
    rules: [
      { enemy: 'jiangshi', every: 0.7, batch: 3 },
      { enemy: 'hopper', every: 2.0, batch: 3 },
      { enemy: 'luocha', every: 4.5, batch: 2 },
      { enemy: 'shikki', every: 3.5, batch: 2 },
      { enemy: 'huli', every: 4.5, batch: 1 },
    ],
  },
  {
    fromMin: 8,
    hpScale: 2.6,
    maxEnemies: 190,
    rules: [
      { enemy: 'jiangshi', every: 0.6, batch: 4 },
      { enemy: 'flying', every: 2.2, batch: 3 },
      { enemy: 'luocha', every: 3.8, batch: 2 },
      { enemy: 'taotie', every: 7.0, batch: 1 },
      { enemy: 'huli', every: 4.0, batch: 2 },
    ],
  },
  {
    fromMin: 10,
    hpScale: 3.4,
    maxEnemies: 210,
    rules: [
      { enemy: 'hopper', every: 1.4, batch: 4 },
      { enemy: 'flying', every: 2.0, batch: 3 },
      { enemy: 'luocha', every: 3.2, batch: 3 },
      { enemy: 'taotie', every: 6.0, batch: 1 },
      { enemy: 'white_bone', every: 5.0, batch: 2 },
    ],
  },
  {
    fromMin: 12,
    hpScale: 4.4,
    maxEnemies: 230,
    rules: [
      { enemy: 'jiangshi', every: 0.5, batch: 5 },
      { enemy: 'hopper', every: 1.2, batch: 4 },
      { enemy: 'luocha', every: 3.0, batch: 3 },
      { enemy: 'taotie', every: 5.5, batch: 2 },
      { enemy: 'white_bone', every: 4.5, batch: 2 },
      { enemy: 'huli', every: 4.0, batch: 2 },
    ],
  },
  {
    fromMin: 14,
    hpScale: 5.5,
    maxEnemies: 260,
    rules: [
      { enemy: 'jiangshi', every: 0.45, batch: 6 },
      { enemy: 'hopper', every: 1.0, batch: 5 },
      { enemy: 'luocha', every: 2.6, batch: 4 },
      { enemy: 'taotie', every: 5.0, batch: 2 },
      { enemy: 'white_bone', every: 4.0, batch: 3 },
      { enemy: 'flying', every: 1.8, batch: 3 },
    ],
  },
];

/** 精英怪替换的刷怪规则：从第 2 虚拟分钟起每 60 秒在当前相位怪里挑一只精英化 */
export const ELITE_START_MIN = 2;
