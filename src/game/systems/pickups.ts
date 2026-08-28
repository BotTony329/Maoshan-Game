/**
 * 拾取系统 —— 磁吸、拾取结算（经验走模式策略 grantXp）。
 */
import { DROPS, PICKUP_MAGNET_SPEED } from '../../data/config';
import { dist2 } from '../../core/math';
import { dealDamage } from './combat';
import type { World } from '../world';

export function updatePickups(w: World, dt: number): void {
  const p = w.player;
  const magnet = p.stats.magnet;
  for (const pk of w.pickups) {
    pk.t += dt;
    const d2v = dist2(pk.x, pk.y, p.x, p.y);
    // 宝箱不吃磁吸：搜打撤的“搜”就是要你亲自走过去
    if (pk.kind !== 'treasure' && d2v < magnet * magnet) {
      const d = Math.sqrt(d2v) || 1;
      const step = PICKUP_MAGNET_SPEED * dt;
      pk.x += ((p.x - pk.x) / d) * step;
      pk.y += ((p.y - pk.y) / d) * step;
    }
    if (d2v < 26 * 26) {
      pk.active = false;
      if (pk.kind === 'xp') {
        w.grantXp(pk.value);
        w.emitSfx('pickup');
      } else if (pk.kind === 'treasure') {
        // 搜打撤：赃物入包（未撤离不算入账）
        w.carryLoot += pk.value;
        w.emitSfx('levelup');
      } else if (pk.kind === 'heal') {
        p.hp = Math.min(p.stats.maxHp, p.hp + DROPS.healValue);
        w.emitSfx('heal');
      } else if (pk.kind === 'bomb') {
        for (const e of w.enemies) dealDamage(w, e, DROPS.bombDamage);
        w.emitSfx('bomb');
      }
    }
  }
}
