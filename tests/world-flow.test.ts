import { describe, expect, it, vi } from 'vitest';
import { makeWorld, fastForward } from './helpers';

describe('World 基础流程', () => {
  it('开局：战斗状态、飞符起手、时间归零', () => {
    const w = makeWorld();
    expect(w.state).toBe('PLAYING');
    expect(w.time).toBe(0);
    expect(w.player.weapons).toHaveLength(1);
    expect(w.player.weapons[0].def.id).toBe('talisman');
  });

  it('飞符自动索敌并造成伤害（无尽模式掉魂魄）', () => {
    const onEnemyKilled = vi.fn();
    const w = makeWorld(42, { onEnemyKilled });
    w.start('endless');
    w.spawnEnemyAt('jiangshi', w.player.x + 120, w.player.y);
    fastForward(w, 2.5, 1 / 30);
    expect(onEnemyKilled).toHaveBeenCalled();
    expect(w.kills).toBeGreaterThanOrEqual(1);
    // 魂魄可能已被磁吸拾取（正确行为），也可能还在地上
    expect(w.player.xp > 0 || w.pickups.some((pk) => pk.kind === 'xp')).toBe(true);
  });

  it('敌人接触伤害受无敌帧限制', () => {
    const w = makeWorld();
    w.spawnEnemyAt('jiangshi', w.player.x + 5, w.player.y);
    const hpBefore = w.player.hp;
    fastForward(w, 1.2, 1 / 30);
    expect(w.player.hp).toBeLessThan(hpBefore);
    // 0.5s 无敌帧 + 8 点/次：1.2 秒内至多挨 3 次
    expect(hpBefore - w.player.hp).toBeLessThanOrEqual(24);
  });

  it('生命归零进入 GAME_OVER，世界停摆', () => {
    const onGameOver = vi.fn();
    const w = makeWorld(42, { onGameOver });
    w.player.hp = 1;
    w.spawnEnemyAt('taotie', w.player.x + 4, w.player.y); // 高伤贴脸
    fastForward(w, 2, 1 / 30);
    expect(w.state).toBe('GAME_OVER');
    expect(onGameOver).toHaveBeenCalled();
    const t = w.time;
    w.update(0.5);
    expect(w.time).toBe(t);
  });

  it('怪潮高压下实体数不失控（对象池与压实工作正常）', () => {
    const w = makeWorld(42);
    w.player.hp = 1e9;
    w.player.stats.maxHp = 1e9;
    fastForward(w, 60, 0.5);
    expect(w.enemies.length).toBeLessThanOrEqual(300);
    expect(w.projectiles.length).toBeLessThanOrEqual(600);
    expect(w.pickups.length).toBeLessThanOrEqual(400);
  });
});
