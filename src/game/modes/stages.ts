/**
 * 闯幽冥（stages）—— 击杀数过关、亮门抉择、杀穿地府。
 * 规则：不掉魂魄、无升级（成长来自过门奖励与鬼面具）；Boss 房斩杀 Boss 过关。
 */
import { stageKillTarget } from '../../data/config';
import { rollTreasure } from '../../data/treasure';
import { rollDoors } from '../../data/doors';
import { generateOptions } from '../upgrades';
import { spawnOnRing } from '../systems/spawner';
import type { RunModeStrategy } from './strategy';
import type { World } from '../world';

export const stagesMode: RunModeStrategy = {
  id: 'stages',
  label: '闯幽冥',

  init(w) {
    w.stage = 1;
    w.stageTime = 0;
    w.stageKills = 0;
    w.stageTarget = stageKillTarget(1);
    w.stageIsBoss = false;
    w.spawnRateMult = 1;
    w.pendingSpawnRate = 1;
    w.pendingBoss = false;
    w.pendingDoors = [];
    w.bonusGold = 0;
  },

  tick(w, dt) {
    w.stageTime += dt;
    // 过关判定：普通关看击杀数，Boss 房看 Boss 死活
    if (w.stageIsBoss) {
      if (w.boss === null) openDoors(w);
    } else if (w.stageKills >= w.stageTarget) {
      openDoors(w);
    }
  },

  difficultyMinute(w) {
    // 每关只推 1 档难度（实测 +2 档到第 3 关就杀不动了）
    return w.stage - 1;
  },

  onEnemyKilled(w) {
    w.stageKills++;
  },

  dropLoot(w, e, _petKill) {
    // 闯幽冥不掉魂魄（无升级，成长来自过门奖励）；只掉补给
    if (e.def.boss) {
      w.dropPickup('heal', e.x, e.y + 24, 0);
    } else if (e.elite) {
      w.dropPickup(w.rng.next() < 0.5 ? 'heal' : 'bomb', e.x + 16, e.y, 0);
    } else {
      const roll = w.rng.next();
      if (roll < 0.012) w.dropPickup('heal', e.x, e.y, 0);
      else if (roll < 0.017) w.dropPickup('bomb', e.x, e.y, 0);
    }
  },

  grantXp() {
    // 闯幽冥无升级：魂魄不存在，经验不入账
  },

  chooseDoor(w, door) {
    pickDoor(w, door);
  },

  finishShop(w) {
    closeShop(w);
  },
};

/** 过关：掷门并冻结战局，等玩家抉择 */
export function openDoors(w: World): void {
  w.state = 'DOORS';
  w.pendingDoors = rollDoors(w.stage, w.rng);
  w.emitSfx('bell');
  w.events.onDoors?.();
}

/** 玩家选门：结算门效果、进入下一关、发放关卡奖励 */
export function pickDoor(w: World, door: string): void {
  if (w.state !== 'DOORS') return;
  switch (door) {
    case 'supply':
      w.player.hp = Math.min(w.player.stats.maxHp, w.player.hp + w.player.stats.maxHp * 0.5);
      w.bonusGold += 150;
      break;
    case 'mob':
      w.pendingSpawnRate = 1.6;
      w.bonusGold += 200;
      break;
    case 'boss':
      w.pendingBoss = true;
      w.bonusGold += 300;
      break;
    case 'extract':
      // 搜打撤·撤：活着出去，赃物与奖金全额入账（结算在 ResultScene）
      w.extract();
      return;
    case 'shop':
      w.state = 'SHOP';
      w.emitSfx('select');
      w.events.onShop?.();
      return;
    case 'next':
      break;
  }
  enterStage(w);
}

/** 离开冥品商店：结账完毕，进入下一关与关卡奖励 */
export function closeShop(w: World): void {
  if (w.state !== 'SHOP') return;
  enterStage(w);
}

/** 进入下一关：清场、重置进度、按门效果布置，然后发关卡奖励 */
export function enterStage(w: World): void {
  w.stage++;
  w.stageTime = 0;
  w.stageKills = 0;
  w.stageIsBoss = false;
  w.stageTarget = stageKillTarget(w.stage);
  w.spawnRateMult = w.pendingSpawnRate;
  w.pendingSpawnRate = 1;
  w.ruleTimers = [];
  w.eliteTimer = 60;

  // 清场：静默移除（不掉落不记杀）
  for (const e of w.enemies) e.active = false;
  for (const pr of w.projectiles) pr.active = false;
  for (const h of w.hazards) h.active = false;
  for (const pk of w.pickups) pk.active = false;
  w.compactAll();

  // 搜打撤·搜：本关随机位置刷新宝箱（价值随深度上浮，2% 出 5000 文大票）
  const treasureValue = rollTreasure(w.stage, w.rng);
  if (treasureValue > 0) {
    const a = w.rng.range(0, Math.PI * 2);
    const dist2p = w.rng.range(220, 460);
    w.dropPickup('treasure', w.player.x + Math.cos(a) * dist2p, w.player.y + Math.sin(a) * dist2p, treasureValue);
  }

  // Boss 房：开场即当前强度的 Boss（越深越硬）
  if (w.pendingBoss) {
    w.pendingBoss = false;
    w.stageIsBoss = true;
    const id = w.stage % 2 === 0 ? 'shiwang' : 'hangu';
    const boss = spawnOnRing(w, id, false, 1 + 0.25 * (w.stage - 1));
    w.boss = boss;
    w.emitSfx('boss');
    w.events.onBossSpawned?.(boss);
  }

  w.refreshStats();
  w.state = 'REWARD';
  w.emitSfx('levelup');
  w.events.onReward?.(generateOptions(w.player, w.rng));
}
