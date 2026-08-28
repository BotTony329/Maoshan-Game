/**
 * 无尽尸潮（endless）—— 没有天亮没有门：魂魄掉落、升级三选一、循环劫难。
 * 旱魃/尸王每 5 分钟严格交替登场（每两巡血量抬一档），尸潮穿插其间。
 */
import { ENDLESS } from '../../data/config';
import { xpToNext } from '../../data/config';
import { spawnOnRing } from '../systems/spawner';
import { generateOptions } from '../upgrades';
import type { RunModeStrategy } from './strategy';
import type { World } from '../world';

export const endlessMode: RunModeStrategy = {
  id: 'endless',
  label: '无尽尸潮',

  init(w) {
    w.stage = 0;
    w.endlessEventK = 1;
    w.endlessBossCount = 0;
  },

  tick(w, dt) {
    // 每 5 分钟一个节拍的循环劫难
    while (w.time >= w.endlessEventK * ENDLESS.eventEvery) {
      const k = w.endlessEventK++;
      if (k % 3 === 0) {
        // 每第三拍：尸潮，一波比一波厚
        const count = ENDLESS.hordeBase + k * 8;
        for (let i = 0; i < count; i++) {
          spawnOnRing(w, i % 2 === 0 ? 'jiangshi' : 'hopper', false);
        }
        w.emitSfx('boss');
      } else {
        const id = w.endlessBossCount % 2 === 0 ? 'hangu' : 'shiwang';
        const hpMult = 1 + ENDLESS.bossHpStep * Math.floor(w.endlessBossCount / 2);
        w.endlessBossCount++;
        const boss = spawnOnRing(w, id, false, hpMult);
        w.boss = boss;
        w.emitSfx('boss');
        w.events.onBossSpawned?.(boss);
      }
    }
  },

  difficultyMinute(w) {
    return Math.floor(w.time / 60);
  },

  onEnemyKilled() {
    // 无尽只记总杀数（w.kills 由 combat 通用累计）
  },

  dropLoot(w, e, petKill) {
    if (e.def.boss) {
      // Boss 掉一大捧魂魄，散落拾取有仪式感
      const gems = 4;
      for (let i = 0; i < gems; i++) {
        const a = (i * Math.PI * 2) / gems;
        w.dropPickup('xp', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, Math.round(e.def.xp / gems));
      }
      w.dropPickup('heal', e.x, e.y + 24, 0);
    } else if (e.elite) {
      w.dropPickup('xp', e.x, e.y, Math.round(e.def.xp * 10));
      w.dropPickup(w.rng.next() < 0.5 ? 'heal' : 'bomb', e.x + 16, e.y, 0);
    } else {
      // 灵犬/地狱犬咬死的猎物魂魄翻倍（丰收）
      if (petKill) {
        w.dropPickup('xp', e.x - 8, e.y, e.def.xp);
        w.dropPickup('xp', e.x + 8, e.y, e.def.xp);
      } else {
        w.dropPickup('xp', e.x, e.y, e.def.xp);
      }
      const roll = w.rng.next();
      if (roll < 0.012) w.dropPickup('heal', e.x, e.y, 0);
      else if (roll < 0.017) w.dropPickup('bomb', e.x, e.y, 0);
    }
  },

  grantXp(w, amount) {
    const p = w.player;
    p.xp += amount * p.stats.xpGain;
    let levels = 0;
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = xpToNext(p.level);
      levels++;
    }
    if (levels === 0) return;
    w.refreshStats();
    // 升级三选一：打断战斗弹卡（多级连升逐次弹）
    w.pendingLevels += levels;
    if (w.state === 'PLAYING') enterLevelUp(w);
  },
};

/** 进入升级三选一（World.applyUpgrade 选完恢复或连弹下一轮） */
export function enterLevelUp(w: World): void {
  w.state = 'LEVEL_UP';
  w.emitSfx('levelup');
  w.events.onReward?.(generateOptions(w.player, w.rng));
}
