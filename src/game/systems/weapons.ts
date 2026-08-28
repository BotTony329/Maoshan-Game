/**
 * 武器系统派发 —— 每帧驱动所有已装备武器模块的 tick。
 * （V3：武器本体在 weapons/ 各自模块中，此处只做派发）
 */
import { WEAPON_MODULES } from '../weapons/registry';
import { computeWeaponStats } from '../weapons/shared';
import type { World } from '../world';

export function updateWeapons(w: World, dt: number): void {
  const p = w.player;
  for (const slot of p.weapons) {
    const mod = WEAPON_MODULES[slot.def.id];
    if (!mod) throw new Error(`未注册的武器模块: ${slot.def.id}`);
    mod.tick(w, slot, computeWeaponStats(slot, p), dt);
  }
}
