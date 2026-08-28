/**
 * 武器注册表 —— 全部武器模块的唯一入口。
 * 新武器 = 新建模块文件 + 在这里 import 并加入 MODULES 数组。
 */
import type { WeaponDef, WeaponModule } from './types';
import { rune } from './rune';
import { shamanHammer } from './shaman_hammer';
import { huntingBow } from './hunting_bow';
import { warlockStaff } from './warlock_staff';
import { mageStaff } from './mage_staff';
import { summonerStaff } from './summoner_staff';
import { peachSword } from './peach_sword';
import { riceWard } from './rice_ward';
import { coinSword } from './coin_sword';
import { baguaMirror } from './bagua_mirror';
import { soulBell } from './soul_bell';
import { thunder } from './thunder';
import { inkLine } from './ink_line';
import { fireTalisman } from './fire_talisman';
import { wand } from './wand';
import { sparkTalisman } from './spark_talisman';
import { godslayer } from './godslayer';

const MODULES: WeaponModule[] = [
  rune, shamanHammer, huntingBow, warlockStaff, mageStaff, summonerStaff,
  peachSword, riceWard, coinSword, baguaMirror, soulBell, thunder,
  inkLine, fireTalisman, wand, sparkTalisman, godslayer,
];

/** id → 模块（运行时 tick 派发用） */
export const WEAPON_MODULES: Record<string, WeaponModule> = Object.fromEntries(
  MODULES.map((m) => [m.def.id, m]),
);

/** id → 定义（数据查询用） */
export const WEAPONS: Record<string, WeaponDef> = Object.fromEntries(
  MODULES.map((m) => [m.def.id, m.def]),
);

export const WEAPON_LIST: WeaponDef[] = MODULES.map((m) => m.def);

/** 主武器（可装备的起手法器，鬼市武器库有售） */
export const BASE_WEAPONS: WeaponDef[] = WEAPON_LIST.filter((d) => d.base);

/** 通用池武器（局内奖励可抽的新武器） */
export const GENERIC_WEAPONS: WeaponDef[] = WEAPON_LIST.filter((d) => !d.base && !d.marketOnly);

/** 默认起手武器 */
export const DEFAULT_WEAPON = 'rune';
