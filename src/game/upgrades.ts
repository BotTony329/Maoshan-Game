/**
 * 升级三选一 —— 抽卡池构建与抽取。
 *
 * 池约束（品类惯例 + 本作规则）：
 * - 武器未满 6 格时可抽新武器；已拥有的武器可抽升阶（未满 8 级）
 * - 被动同理（6 格 / 5 级）
 * - 升阶权重略高于新武器，强化“养成成型”的正反馈
 * - 池空时给保底选项（回血 / 掷爆竹）
 */
import { WEAPON_LIST } from '../data/weapons';
import { PASSIVE_LIST } from '../data/passives';
import { PLAYER } from '../data/config';
import type { Player, UpgradeOption } from './types';
import type { Rng } from '../core/math';

interface PoolEntry {
  option: UpgradeOption;
  weight: number;
}

export function generateOptions(player: Player, rng: Rng): UpgradeOption[] {
  const pool: PoolEntry[] = [];

  const weaponCount = player.weapons.length;
  for (const def of WEAPON_LIST) {
    if (def.marketOnly) continue; // 鬼市专属不入升级池
    const slot = player.weapons.find((s) => s.def.id === def.id);
    if (slot) {
      if (slot.level < def.maxLevel) {
        pool.push({ option: { kind: 'weapon-upgrade', id: def.id, fromLevel: slot.level }, weight: 1.3 });
      }
    } else if (weaponCount < PLAYER.maxWeapons) {
      pool.push({ option: { kind: 'weapon-new', id: def.id }, weight: 1.0 });
    }
  }

  const passiveCount = player.passives.size;
  for (const def of PASSIVE_LIST) {
    if (def.marketOnly) continue;
    const level = player.passives.get(def.id) ?? 0;
    if (level > 0) {
      if (level < def.maxLevel) {
        pool.push({ option: { kind: 'passive-upgrade', id: def.id, fromLevel: level }, weight: 1.1 });
      }
    } else if (passiveCount < PLAYER.maxPassives) {
      pool.push({ option: { kind: 'passive-new', id: def.id }, weight: 1.0 });
    }
  }

  const picked: UpgradeOption[] = [];
  while (picked.length < 3 && pool.length > 0) {
    const entry = rng.weightedPick(pool);
    pool.splice(pool.indexOf(entry), 1);
    picked.push(entry.option);
  }

  // 保底：没有可抽项时给补给，保证升级永不空转
  while (picked.length < 3) {
    picked.push(picked.length % 2 === 0 ? { kind: 'heal' } : { kind: 'bomb' });
  }
  return picked;
}
