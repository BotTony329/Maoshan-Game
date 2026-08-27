/**
 * 妖邪图鉴 —— 僵尸 + 山海经鬼怪 + 两位 Boss。
 * behavior 指向 game/behaviors/enemies.ts 中的策略实现。
 */
import type { EnemyDef } from '../game/types';

export const ENEMIES: Record<string, EnemyDef> = {
  // ---- 基础僵尸系 ----
  jiangshi: {
    id: 'jiangshi',
    name: '小僵尸',
    hp: 18, speed: 52, damage: 8, radius: 14, xp: 1,
    behavior: 'chase',
    texture: 'enemy_jiangshi',
  },
  hopper: {
    id: 'hopper',
    name: '跳尸',
    hp: 26, speed: 70, damage: 10, radius: 14, xp: 2,
    behavior: 'hop',
    texture: 'enemy_hopper',
  },
  flying: {
    id: 'flying',
    name: '飞僵',
    hp: 22, speed: 92, damage: 9, radius: 13, xp: 2,
    behavior: 'drift',
    texture: 'enemy_flying',
  },
  white_bone: {
    id: 'white_bone',
    name: '白毛僵',
    hp: 90, speed: 46, damage: 14, radius: 18, xp: 4,
    behavior: 'chase',
    texture: 'enemy_white',
    knockbackResist: 0.5,
  },

  // ---- 山海经妖邪 ----
  taotie: {
    id: 'taotie',
    name: '饕餮',
    hp: 220, speed: 34, damage: 20, radius: 26, xp: 8,
    behavior: 'chase',
    texture: 'enemy_taotie',
    knockbackResist: 0.85,
  },
  luocha: {
    id: 'luocha',
    name: '罗刹',
    hp: 45, speed: 78, damage: 16, radius: 15, xp: 4,
    behavior: 'dash',
    texture: 'enemy_luocha',
  },
  huli: {
    id: 'huli',
    name: '狐妖',
    hp: 40, speed: 62, damage: 12, radius: 14, xp: 5,
    behavior: 'ranged',
    texture: 'enemy_huli',
  },
  shikki: {
    id: 'shikki',
    name: '尸傀',
    hp: 60, speed: 58, damage: 12, radius: 16, xp: 3,
    behavior: 'chase',
    texture: 'enemy_shikki',
  },

  // ---- Boss ----
  hangu: {
    id: 'hangu',
    name: '旱魃',
    hp: 2600, speed: 55, damage: 25, radius: 34, xp: 120,
    behavior: 'boss_hangu',
    texture: 'enemy_hangu',
    boss: true,
    knockbackResist: 1,
  },
  shiwang: {
    id: 'shiwang',
    name: '尸王',
    hp: 6500, speed: 42, damage: 32, radius: 42, xp: 200,
    behavior: 'boss_shiwang',
    texture: 'enemy_shiwang',
    boss: true,
    knockbackResist: 1,
  },
};

export const ENEMY_LIST = Object.values(ENEMIES);
