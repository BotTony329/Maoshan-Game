import { World, type WorldEvents } from '../src/game/world';
import type { RunState } from '../src/game/types';

/** 构建一局已 start 的固定种子 World */
export function makeWorld(seed = 42, events: WorldEvents = {}): World {
  const w = new World(seed, events);
  w.start();
  return w;
}

/**
 * 快进推演 N 秒（无尽模式用）。
 * 闯幽冥模式会在 2 分钟亮门后冻结——本助手不自动选门，方便断言门状态。
 */
export function fastForward(w: World, seconds: number, dt = 1 / 15): RunState {
  const steps = Math.ceil(seconds / dt);
  for (let i = 0; i < steps; i++) {
    if (w.state === 'DOORS' || w.state === 'REWARD') return w.state;
    if (w.state !== 'PLAYING') return w.state;
    w.update(dt);
  }
  return w.state;
}
