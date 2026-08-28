/**
 * 狐妖 —— 保持距离吐火球，距离合适时横向游走。
 */
import { dist } from '../../core/math';
import type { Enemy } from '../types';
import type { World } from '../world';
import { effSpeed, dirToPlayer } from './basic';

export function ranged(e: Enemy, w: World, dt: number): void {
  const spd = effSpeed(e, w);
  const d = dist(e.x, e.y, w.player.x, w.player.y);
  const dir = dirToPlayer(e, w);
  if (d > 360) {
    e.vx = dir.x * spd;
    e.vy = dir.y * spd;
  } else if (d < 240) {
    e.vx = -dir.x * spd * 0.7;
    e.vy = -dir.y * spd * 0.7;
  } else {
    const side = e.ai.wob >= 0 ? 1 : -1;
    e.vx = -dir.y * spd * 0.5 * side;
    e.vy = dir.x * spd * 0.5 * side;
  }

  e.ai.shoot -= dt;
  if (e.ai.shoot <= 0 && d < 640) {
    e.ai.shoot = 2.4 + w.rng.range(0, 0.8);
    const p = w.spawnProjectile('fireball');
    p.x = e.x;
    p.y = e.y;
    p.vx = dir.x * 235;
    p.vy = dir.y * 235;
    p.radius = 10;
    p.damage = e.damage;
    p.pierce = 0;
    p.life = 3.2;
    p.friendly = false;
    p.color = 0xff7a3c;
    w.emitSfx('shoot');
  }
}
