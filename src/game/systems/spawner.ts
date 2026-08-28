/**
 * 刷怪导演 —— 相位波次表、出生环、精英、无尽模式循环劫难。
 * 难度时间轴由模式策略提供（difficultyMinute）。
 */
import { ARENA, SPAWN_RING } from '../../data/config';
import { ELITE_START_MIN, WAVE_PHASES } from '../../data/waves';
import { clamp, TAU } from '../../core/math';
import type { WavePhase } from '../types';
import type { World } from '../world';

export function difficultyMinute(w: World): number {
  return w.modeStrategy.difficultyMinute(w);
}

export function currentPhase(w: World): WavePhase {
  const minute = difficultyMinute(w);
  let phase = WAVE_PHASES[0];
  for (const ph of WAVE_PHASES) {
    if (minute >= ph.fromMin) phase = ph;
    else break;
  }
  return phase;
}

export function updateSpawner(w: World, dt: number): void {
  const phase = currentPhase(w);

  if (w.ruleTimers.length !== phase.rules.length) {
    // 进入新相位：计时器带随机初相，避免切表瞬间全场齐刷
    w.ruleTimers = phase.rules.map(() => w.rng.range(0, 1));
  }
  for (let i = 0; i < phase.rules.length; i++) {
    const rule = phase.rules[i];
    w.ruleTimers[i] -= dt;
    if (w.ruleTimers[i] <= 0) {
      // 小怪房门：刷怪提速
      w.ruleTimers[i] = rule.every / w.spawnRateMult;
      if (w.enemies.length < phase.maxEnemies) {
        for (let b = 0; b < rule.batch; b++) spawnOnRing(w, rule.enemy, false);
      }
    }
  }

  if (difficultyMinute(w) >= ELITE_START_MIN) {
    w.eliteTimer -= dt;
    if (w.eliteTimer <= 0) {
      w.eliteTimer = 60;
      const rule = w.rng.pick(phase.rules);
      if (rule) spawnOnRing(w, rule.enemy, true);
    }
  }

  w.modeStrategy.tick(w, dt);
}

/** 在玩家周围的屏幕外出生环上刷怪（钳回竞技场内） */
export function spawnOnRing(w: World, defId: string, elite: boolean, hpMult = 1): import('../types').Enemy {
  const a = w.rng.range(0, TAU);
  const x = clamp(w.player.x + Math.cos(a) * SPAWN_RING, 40, ARENA.width - 40);
  const y = clamp(w.player.y + Math.sin(a) * SPAWN_RING, 40, ARENA.height - 40);
  return w.spawnEnemyAt(defId, x, y, elite, hpMult);
}
