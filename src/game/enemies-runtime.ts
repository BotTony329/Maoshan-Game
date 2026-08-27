/**
 * 敌人行为策略 —— 经 ENEMY_BEHAVIORS 注册表按 def.behavior 派发。
 * 行为只设置期望速度 (vx, vy)，位移、击退叠加、边界钳制由 World 统一处理。
 *
 * ai 对象是各行为的私有状态袋（跳跃计时/突进阶段/开火冷却等），
 * 生成敌人时已随机化初始相位，避免同屏怪物动作完全同步。
 */
import { TAU, dist } from '../core/math';
import type { Enemy } from './types';
import type { World } from './world';

type EnemyBehavior = (e: Enemy, w: World, dt: number) => void;

/** 减速只在生效期内起作用（糯米阵等来源） */
function effSpeed(e: Enemy, w: World): number {
  return e.speed * (w.time < e.slowUntil ? e.slowFactor : 1);
}

function dirToPlayer(e: Enemy, w: World): { x: number; y: number } {
  const d = Math.max(dist(e.x, e.y, w.player.x, w.player.y), 1);
  return { x: (w.player.x - e.x) / d, y: (w.player.y - e.y) / d };
}

// ---------------------------------------------------------------- 直线追击

const chase: EnemyBehavior = (e, w, dt) => {
  const d = dirToPlayer(e, w);
  const spd = effSpeed(e, w);
  e.vx = d.x * spd;
  e.vy = d.y * spd;
  void dt;
};

// ---------------------------------------------------------------- 跳尸：蓄力→跳跃

const hop: EnemyBehavior = (e, w, dt) => {
  e.ai.t -= dt;
  const spd = effSpeed(e, w);
  if (e.ai.phase === 0) {
    // 蓄力：急减速下沉，给玩家“要跳了”的读谱信号
    e.vx *= Math.pow(0.02, dt);
    e.vy *= Math.pow(0.02, dt);
    if (e.ai.t <= 0) {
      const d = dirToPlayer(e, w);
      e.vx = d.x * spd * 2.6;
      e.vy = d.y * spd * 2.6;
      e.ai.phase = 1;
      e.ai.t = 0.42;
    }
  } else if (e.ai.t <= 0) {
    e.ai.phase = 0;
    e.ai.t = 0.5 + w.rng.range(0, 0.25);
  }
};

// ---------------------------------------------------------------- 飞僵：飘行带横向摆动

const drift: EnemyBehavior = (e, w, dt) => {
  void dt;
  const d = dirToPlayer(e, w);
  const sway = Math.sin(w.time * 3 + e.ai.wob) * 0.5;
  const vx = d.x + -d.y * sway;
  const vy = d.y + d.x * sway;
  const len = Math.max(Math.hypot(vx, vy), 0.001);
  const spd = effSpeed(e, w);
  e.vx = (vx / len) * spd;
  e.vy = (vy / len) * spd;
};

// ---------------------------------------------------------------- 罗刹：接近→蓄力→突进

const dash: EnemyBehavior = (e, w, dt) => {
  const spd = effSpeed(e, w);
  const d = dist(e.x, e.y, w.player.x, w.player.y);
  e.ai.t -= dt;
  if (e.ai.phase === 0) {
    const dir = dirToPlayer(e, w);
    e.vx = dir.x * spd;
    e.vy = dir.y * spd;
    if (d < 280) {
      e.ai.phase = 1;
      e.ai.t = 0.5; // 蓄力窗口，玩家可以侧移躲突进
    }
  } else if (e.ai.phase === 1) {
    e.vx *= Math.pow(0.01, dt);
    e.vy *= Math.pow(0.01, dt);
    if (e.ai.t <= 0) {
      const dir = dirToPlayer(e, w);
      e.vx = dir.x * spd * 3.2;
      e.vy = dir.y * spd * 3.2;
      e.ai.phase = 2;
      e.ai.t = 0.42;
    }
  } else if (e.ai.t <= 0) {
    e.ai.phase = 0;
    e.ai.t = 0.6;
  }
};

// ---------------------------------------------------------------- 狐妖：保持距离吐火球

const ranged: EnemyBehavior = (e, w, dt) => {
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
    // 距离合适时横向游走，更难被弹幕白嫖
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
};

// ---------------------------------------------------------------- 旱魃：追击 + 召尸 + 环形弹幕

const bossHangu: EnemyBehavior = (e, w, dt) => {
  const dir = dirToPlayer(e, w);
  e.vx = dir.x * effSpeed(e, w);
  e.vy = dir.y * effSpeed(e, w);

  e.ai.summon -= dt;
  if (e.ai.summon <= 0) {
    e.ai.summon = 9;
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + w.rng.range(0, 0.5);
      w.spawnEnemyAt('hopper', e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, false);
    }
    w.emitSfx('boss');
  }

  e.ai.burst -= dt;
  if (e.ai.burst <= 0) {
    e.ai.burst = 5.5;
    const n = 12;
    const offset = w.rng.range(0, TAU);
    for (let i = 0; i < n; i++) {
      const a = offset + (i * TAU) / n;
      const p = w.spawnProjectile('fireball');
      p.x = e.x;
      p.y = e.y;
      p.vx = Math.cos(a) * 205;
      p.vy = Math.sin(a) * 205;
      p.radius = 11;
      p.damage = e.damage * 0.6;
      p.pierce = 0;
      p.life = 3.4;
      p.friendly = false;
      p.color = 0xff5a4a;
    }
    w.emitSfx('shoot');
  }
};

// ---------------------------------------------------------------- 尸王：追击 → 蓄力冲锋 → 震地环

const bossShiwang: EnemyBehavior = (e, w, dt) => {
  const spd = effSpeed(e, w);
  e.ai.t -= dt;
  if (e.ai.phase === 0) {
    const dir = dirToPlayer(e, w);
    e.vx = dir.x * spd;
    e.vy = dir.y * spd;
    e.ai.charge -= dt;
    if (e.ai.charge <= 0) {
      e.ai.charge = 7;
      e.ai.phase = 1;
      e.ai.t = 0.65;
    }
  } else if (e.ai.phase === 1) {
    e.vx *= Math.pow(0.01, dt);
    e.vy *= Math.pow(0.01, dt);
    if (e.ai.t <= 0) {
      const dir = dirToPlayer(e, w);
      e.vx = dir.x * spd * 3;
      e.vy = dir.y * spd * 3;
      e.ai.phase = 2;
      e.ai.t = 0.75;
    }
  } else if (e.ai.t <= 0) {
    // 冲锋终点震地，荡开敌我共见的冲击环（hostile：伤玩家）
    e.vx = 0;
    e.vy = 0;
    e.ai.phase = 0;
    const h = w.spawnHazard('ring');
    h.x = e.x;
    h.y = e.y;
    h.maxR = 280;
    h.r = 20;
    h.dur = 0.5;
    h.damage = e.damage;
    h.hostile = true;
    h.color = 0xff5a4a;
    w.emitSfx('bomb');
  }
};

// ---------------------------------------------------------------- 注册表

export const ENEMY_BEHAVIORS: Record<string, EnemyBehavior> = {
  chase, hop, drift, dash, ranged,
  boss_hangu: bossHangu,
  boss_shiwang: bossShiwang,
};
