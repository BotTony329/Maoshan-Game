/**
 * World —— 一局游戏的全部可玩状态与推演逻辑。
 *
 * 分层红线：本文件不 import Phaser。渲染层每帧读取这里的公开数组做画面同步，
 * 单元测试直接 new World() + update(dt) 即可驱动完整一局。
 *
 * 实体生命周期：所有敌/弹/区域/拾取物走对象池；“死亡”只是 active=false +
 * 帧末压实（compact），同一帧内的后续系统据此跳过尸体。
 */
import { Pool } from '../core/pool';
import { Rng, clamp, dist2, TAU } from '../core/math';
import { SpatialGrid } from '../core/spatial-grid';
import {
  ARENA, BASE_STATS, DROPS, ELITE, ENEMY_RECYCLE_DIST, ENDLESS, LIMITS,
  PICKUP_MAGNET_SPEED, PLAYER, SPAWN_RING, stageKillTarget, globalHpScale, xpToNext,
} from '../data/config';
import { rollDoors } from '../data/doors';
import { SHOP_ITEMS } from '../data/shop';
import { MASKS } from '../data/masks';
import { spendMingbi } from './save';
import { ENEMIES } from '../data/enemies';
import { WEAPONS } from '../data/weapons';
import { CLASSES, DEFAULT_CLASS } from '../data/classes';
import { ORBS, ORB_CAP } from '../data/orbs';
import { ELITE_START_MIN, WAVE_PHASES } from '../data/waves';
import { recalcStats } from './stats';
import { ENEMY_BEHAVIORS } from './enemies-runtime';
import { WEAPON_BEHAVIORS, beamHits, computeWeaponStats, spiralBladePos } from './weapons-runtime';
import { generateOptions } from './upgrades';
import type {
  DoorDef, DoorId, Enemy, Floater, Hazard, HazardKind, Pet, Pickup, PickupKind, Player,
  Projectile, ProjectileKind, RunMode, RunState, SfxName, UpgradeOption, WavePhase,
} from './types';

export interface WorldEvents {
  onReward?(options: UpgradeOption[]): void;
  onDoors?(): void;
  onShop?(): void;
  onPlayerHit?(dmg: number): void;
  onEnemyKilled?(e: Enemy): void;
  onBossSpawned?(e: Enemy): void;
  onGameOver?(): void;
  onSfx?(name: SfxName): void;
}

// ---------------------------------------------------------------- 池化工厂

const createEnemy = (): Enemy => ({
  active: false, def: ENEMIES.jiangshi,
  x: 0, y: 0, vx: 0, vy: 0, speed: 50, radius: 14,
  hp: 1, maxHp: 1, hpScale: 1, elite: false, damage: 0,
  hitCd: new Map(), slowFactor: 1, slowUntil: 0,
  knockX: 0, knockY: 0, flash: 0, ai: {},
  curseDps: 0, curseUntil: 0, curseAcc: 0, lastHitSource: '',
});

const createProjectile = (): Projectile => ({
  active: false, kind: 'talisman',
  x: 0, y: 0, vx: 0, vy: 0, radius: 8,
  damage: 0, pierce: 0, life: 0, rotation: 0,
  hit: new Set(), friendly: true, color: 0xffffff,
  blast: 0, homing: 0,
});

const createHazard = (): Hazard => ({
  active: false, kind: 'ring',
  x: 0, y: 0, follow: false,
  r: 0, maxR: 0, width: 0, angle: 0, spin: 0,
  damage: 0, t: 0, dur: 1, tickEvery: 0,
  slow: 0, knockback: 0, color: 0xffffff, data: 0,
  hostile: false, hitCd: new Map(), points: undefined,
});

const createPickup = (): Pickup => ({
  active: false, kind: 'xp', x: 0, y: 0, value: 0, t: 0,
});

const createPlayer = (): Player => ({
  x: ARENA.width / 2, y: ARENA.height / 2, radius: PLAYER.radius,
  hp: BASE_STATS.maxHp, level: 1, xp: 0, xpToNext: xpToNext(1),
  invuln: 0, faceX: 0, faceY: -1,
  weapons: [], passives: new Map(), stats: { ...BASE_STATS },
});

// ---------------------------------------------------------------- World

export class World {
  state: RunState = 'MENU';
  mode: RunMode = 'stages';
  /** 本局道途（职业）与携带的宝珠——鬼市配置在开局时注入 */
  classId: string = DEFAULT_CLASS;
  orbIds: string[] = [];
  /** 灵犬宠物（猎人道途），null = 本局无宠物 */
  pet: Pet | null = null;
  time = 0;
  /** 闯幽冥：当前关卡序号（1 起）；无尽恒 0 */
  stage = 0;
  /** 本关已进行秒数（stages） */
  stageTime = 0;
  /** 关卡额外铜钱（门效果累积，结算一并入账） */
  bonusGold = 0;
  /** 当前关卡刷怪倍率（小怪房门效果，仅本关有效） */
  spawnRateMult = 1;
  /** 下一关的刷怪倍率（选门时暂存，进关时生效） */
  private pendingSpawnRate = 1;
  /** 下一关开场出 Boss（Boss 房门效果） */
  pendingBoss = false;
  /** 关卡结束亮出的门（DOORS 状态下由 DoorScene 读取） */
  pendingDoors: DoorDef[] = [];
  /** 本关已击杀数（闯幽冥的过关进度） */
  stageKills = 0;
  /** 本关过关所需击杀数 */
  stageTarget = 10;
  /** 本关是否为 Boss 房（斩杀 Boss 过关，不看击杀数） */
  stageIsBoss = false;
  /** 冥品商店购买的局内增益 */
  furyActive = false;
  shopArmorBonus = 0;
  /** 鬼面具等级（闯幽冥专属人物强化，来自鬼市闯关页） */
  maskLevels: Record<string, number> = {};
  kills = 0;
  damageDealt = 0;
  boss: Enemy | null = null;

  readonly rng: Rng;
  readonly events: WorldEvents;
  readonly player: Player = createPlayer();
  readonly enemies: Enemy[] = [];
  readonly projectiles: Projectile[] = [];
  readonly hazards: Hazard[] = [];
  readonly pickups: Pickup[] = [];
  readonly floaters: Floater[] = [];
  readonly input = { up: false, down: false, left: false, right: false };

  private readonly grid = new SpatialGrid<Enemy>(96);
  private readonly scratch: Enemy[] = [];
  private readonly enemyPool = new Pool(createEnemy, 80);
  private readonly projPool = new Pool(createProjectile, 80);
  private readonly hazardPool = new Pool(createHazard, 24);
  private readonly pickupPool = new Pool(createPickup, 80);

  private nextWeaponInstance = 1;
  private eliteTimer = 60;
  /** 当前相位的刷怪计时器（测试断言刷怪节奏用） */
  ruleTimers: number[] = [];
  /** 无尽模式的事件推进（Boss 循环/尸潮） */
  private endlessEventK = 1;
  /** 无尽模式已登场的 Boss 数（旱魃/尸王严格交替，与尸潮节拍解耦） */
  private endlessBossCount = 0;
  /** 宝珠触发计时 */
  private orbThunderT = 6;
  private flameCd = 0;
  /** 传染环的稳定实例键（灵犬咬击/诅咒共用 hitCd 表机制） */
  private static readonly PET_KEY = 'pet#1';

  constructor(seed: number = Date.now() % 2147483647, events: WorldEvents = {}) {
    this.rng = new Rng(seed);
    this.events = events;
  }

  /**
   * 开新局（可重复调用，等价于“再来一局”）。
   * @param mode 夜巡 15 分钟 / 无尽尸潮
   * @param loadout 鬼市配置：道途（职业）与携带的宝珠
   */
  start(mode: RunMode = 'stages', loadout?: { classId?: string; orbs?: string[]; extraWeapons?: string[]; masks?: Record<string, number> }): void {
    // 先定模式与关卡序号：refreshStats 的深度补偿依赖 this.stage
    this.mode = mode;
    this.stage = mode === 'stages' ? 1 : 0;
    for (const e of this.enemies) { e.active = false; e.hitCd.clear(); this.enemyPool.release(e); }
    for (const pr of this.projectiles) { pr.hit.clear(); this.projPool.release(pr); }
    for (const h of this.hazards) { h.hitCd.clear(); this.hazardPool.release(h); }
    for (const pk of this.pickups) this.pickupPool.release(pk);
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.hazards.length = 0;
    this.pickups.length = 0;
    this.floaters.length = 0;

    const p = this.player;
    p.x = ARENA.width / 2;
    p.y = ARENA.height / 2;
    p.hp = BASE_STATS.maxHp;
    p.level = 1;
    p.xp = 0;
    p.xpToNext = xpToNext(1);
    p.invuln = 1; // 开局短暂无敌，防止落地即挨打
    p.faceX = 0;
    p.faceY = -1;
    p.weapons.length = 0;
    p.passives.clear();
    // 鬼市配置：道途决定起手武器（兜底飞符）；宝珠走 refreshStats 注入属性
    const classDef = (loadout?.classId && CLASSES[loadout.classId]) || CLASSES[DEFAULT_CLASS];
    this.classId = classDef.id;
    this.orbIds = (loadout?.orbs ?? []).filter((id) => ORBS[id]).slice(0, ORB_CAP);
    this.maskLevels = {};
    for (const [id, lv] of Object.entries(loadout?.masks ?? {})) {
      if (MASKS.some((m) => m.id === id) && lv > 0) this.maskLevels[id] = lv;
    }
    const startWeapon = WEAPONS[classDef.startWeapon] ?? WEAPONS.talisman;
    p.weapons.push({ def: startWeapon, level: 1, timer: 0.4, state: {}, instance: this.nextWeaponInstance++ });
    // 传说武器（弑神枪等）：入手后每局自带
    for (const id of loadout?.extraWeapons ?? []) {
      if (WEAPONS[id]) p.weapons.push({ def: WEAPONS[id], level: 1, timer: 0.6, state: {}, instance: this.nextWeaponInstance++ });
    }
    // 猎人道途：灵犬相随
    this.pet = classDef.id === 'hunter'
      ? { x: p.x - 46, y: p.y + 10, vx: 0, vy: 0, faceX: 1, faceY: 0 }
      : null;
    this.refreshStats();

    this.time = 0;
    this.stageTime = 0;
    this.bonusGold = 0;
    this.spawnRateMult = 1;
    this.pendingBoss = false;
    this.pendingDoors = [];
    this.stageKills = 0;
    this.stageTarget = stageKillTarget(1);
    this.stageIsBoss = false;
    this.furyActive = false;
    this.shopArmorBonus = 0;
    this.kills = 0;
    this.damageDealt = 0;
    this.boss = null;
    this.mode = mode;
    this.nextWeaponInstance = 1;
    this.eliteTimer = 60;
    this.ruleTimers = [];
    this.endlessEventK = 1;
    this.endlessBossCount = 0;
    this.orbThunderT = 6;
    this.flameCd = 0;
    this.state = 'PLAYING';
  }

  /**
   * 在纯被动结算之上，叠加道途天赋、宝珠与等级成长。
   * 每次被动/等级变化后都要走这里，否则加成会被 recalcStats 冲掉。
   */
  refreshStats(): void {
    recalcStats(this.player);
    const s = this.player.stats;
    if (this.classId === 'taoist') s.xpGain *= 1.1;
    if (this.classId === 'warrior') s.armor += 2;
    if (this.orbIds.includes('ghost')) {
      s.magnet *= 2;
      s.xpGain *= 1.15;
    }
    if (this.orbIds.includes('wind')) {
      s.speed *= 1.15;
      s.regen += 0.6;
    }
    // 等级自动成长：+1% 伤害 / +3 生命上限（仅无尽模式会升级）
    const lv = this.player.level - 1;
    if (lv > 0) {
      s.damage *= 1 + 0.01 * lv;
      s.maxHp += 3 * lv;
    }
    // 冥品商店局内增益
    if (this.furyActive) s.damage *= 1.25;
    s.armor += this.shopArmorBonus;
    // 鬼面具（闯幽冥专属人物强化）
    if (this.mode === 'stages') {
      const ml = this.maskLevels;
      if (ml.rage) s.damage *= 1 + 0.08 * ml.rage;
      if (ml.guard) s.armor += 1 * ml.guard;
      if (ml.swift) s.speed *= 1 + 0.05 * ml.swift;
      if (ml.vitality) s.maxHp += 20 * ml.vitality;
      // 深度补偿：每深入一境全伤害 +4%，让输出跟上成长
      s.damage *= 1 + 0.04 * (this.stage - 1);
    }
  }

  /** 推进一帧。dt 为秒；钳制由调用方（场景层）负责，测试允许大步进 */
  update(dt: number): void {
    if (this.state !== 'PLAYING') return;

    this.time += dt;
    if (this.mode === 'stages') this.stageTime += dt;
    this.updatePlayer(dt);
    this.updateWeapons(dt);
    this.updateSpawner(dt);
    this.rebuildGrid();
    this.updateEnemies(dt);
    this.updatePet(dt);
    this.updateProjectiles(dt);
    this.updateHazards(dt);
    this.updateOrbs(dt);
    this.updatePickups(dt);
    this.compactEnemies();
    this.compactProjectiles();
    this.compactHazards();
    this.compactPickups();
    this.updateFloaters(dt);

    // 闯幽冥：击杀数达标（或斩杀 Boss）即过关
    if (this.mode === 'stages') this.checkStageClear();
  }

  /** 过关判定：普通关看击杀数，Boss 房看 Boss 死活 */
  private checkStageClear(): void {
    if (this.stageIsBoss) {
      if (this.boss === null) this.openDoors();
      return;
    }
    if (this.stageKills >= this.stageTarget) this.openDoors();
  }

  /** 关卡结束：掷门并冻结战局，等玩家抉择 */
  private openDoors(): void {
    this.state = 'DOORS';
    this.pendingDoors = rollDoors(this.stage, this.rng);
    this.emitSfx('bell');
    this.events.onDoors?.();
  }

  /**
   * 玩家选门：结算门效果、进入下一关、发放关卡奖励（三选一）。
   * —— 升级三选一已移除，抉择只发生在关卡切换。
   */
  chooseDoor(door: DoorId): void {
    if (this.state !== 'DOORS') return;
    switch (door) {
      case 'supply':
        this.player.hp = Math.min(this.player.stats.maxHp, this.player.hp + this.player.stats.maxHp * 0.5);
        this.bonusGold += 150;
        break;
      case 'mob':
        this.pendingSpawnRate = 1.6;
        this.bonusGold += 200;
        break;
      case 'boss':
        this.pendingBoss = true;
        this.bonusGold += 300;
        break;
      case 'shop':
        // 冥品商店：进店用冥币购物，离店后才进下一关
        this.state = 'SHOP';
        this.emitSfx('select');
        this.events.onShop?.();
        return;
      case 'next':
        break;
    }
    this.enterStage();
  }

  /** 离开冥品商店：结账完毕，进入下一关与关卡奖励 */
  finishShop(): void {
    if (this.state !== 'SHOP') return;
    this.enterStage();
  }

  /**
   * 冥品商店购物：扣冥币、当场生效。
   * 返回 null = 成功；返回字符串 = 失败原因。
   */
  buyShopItem(itemId: string): string | null {
    const item = SHOP_ITEMS.find((it) => it.id === itemId);
    if (!item) return '没有此货';
    if (!spendMingbi(item.price)) return '冥币不足';

    const p = this.player;
    switch (itemId) {
      case 'rice_bag':
        p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * 0.5);
        break;
      case 'cracker':
        for (const e of [...this.enemies]) this.dealDamage(e, 500);
        break;
      case 'fury_incense':
        this.furyActive = true;
        this.refreshStats();
        break;
      case 'secret_scroll': {
        const upgradable = p.weapons.filter((sl) => sl.level < sl.def.maxLevel);
        if (upgradable.length === 0) {
          // 没得升就退钱换全屏爆竹，绝不白花
          for (const e of [...this.enemies]) this.dealDamage(e, 500);
          break;
        }
        const slot = this.rng.pick(upgradable);
        slot.level = Math.min(slot.level + 1, slot.def.maxLevel);
        break;
      }
      case 'jade_pendant':
        this.shopArmorBonus += 3;
        this.refreshStats();
        break;
    }
    this.emitSfx('levelup');
    return null;
  }

  /** 进入下一关：清场、重置计时、按门效果布置，然后发关卡奖励 */
  private enterStage(): void {
    this.stage++;
    this.stageTime = 0;
    this.stageKills = 0;
    this.stageIsBoss = false;
    this.stageTarget = stageKillTarget(this.stage);
    this.spawnRateMult = this.pendingSpawnRate;
    this.pendingSpawnRate = 1;
    this.ruleTimers = [];
    this.eliteTimer = 60;

    // 清场：静默移除（不掉落不记杀），拾取的魂魄自动入袋
    for (const e of this.enemies) e.active = false;
    for (const pr of this.projectiles) pr.active = false;
    for (const h of this.hazards) h.active = false;
    for (const pk of this.pickups) {
      pk.active = false;
      if (pk.kind === 'xp') this.addXp(pk.value);
    }
    this.compactEnemies();
    this.compactProjectiles();
    this.compactHazards();
    this.compactPickups();

    // Boss 房：开场即当前强度的 Boss（越深越硬）
    if (this.pendingBoss) {
      this.pendingBoss = false;
      this.stageIsBoss = true;
      const id = this.stage % 2 === 0 ? 'shiwang' : 'hangu';
      const boss = this.spawnOnRing(id, false, 1 + 0.25 * (this.stage - 1));
      this.boss = boss;
      this.emitSfx('boss');
      this.events.onBossSpawned?.(boss);
    }

    this.refreshStats();
    this.state = 'REWARD';
    this.emitSfx('levelup');
    this.events.onReward?.(generateOptions(this.player, this.rng));
  }

  /** 玩家选完关卡奖励后由 UI 调用 */
  applyUpgrade(option: UpgradeOption): void {
    const p = this.player;
    switch (option.kind) {
      case 'weapon-new':
        p.weapons.push({ def: WEAPONS[option.id], level: 1, timer: 0.2, state: {}, instance: this.nextWeaponInstance++ });
        break;
      case 'weapon-upgrade': {
        const slot = p.weapons.find((s) => s.def.id === option.id);
        if (slot) slot.level = Math.min(slot.level + 1, slot.def.maxLevel);
        break;
      }
      case 'passive-new':
        p.passives.set(option.id, 1);
        this.refreshStats();
        break;
      case 'passive-upgrade':
        p.passives.set(option.id, (p.passives.get(option.id) ?? 0) + 1);
        this.refreshStats();
        break;
      case 'heal':
        p.hp = Math.min(p.stats.maxHp, p.hp + 50);
        break;
      case 'bomb':
        for (const e of this.enemies) this.dealDamage(e, 80);
        break;
    }
    this.state = 'PLAYING';
  }

  /** 玩家在升级界面做出选择后由 UI 调用 */
  // ------------------------------------------------ 行为策略可用的 API

  spawnEnemyAt(defId: string, x: number, y: number, elite = false, hpMult = 1): Enemy {
    const def = ENEMIES[defId];
    if (!def) throw new Error(`未注册的敌人: ${defId}`);
    const e = this.enemyPool.obtain();
    const minute = this.virtualMinute();
    const scale = def.boss ? 1 : globalHpScale(minute) * this.currentPhase(minute).hpScale;
    const mult = scale * hpMult * (elite ? ELITE.hpMult : 1);

    e.active = true;
    e.def = def;
    e.x = clamp(x, 30, ARENA.width - 30);
    e.y = clamp(y, 30, ARENA.height - 30);
    e.vx = 0;
    e.vy = 0;
    e.speed = def.speed * (elite ? ELITE.speedMult : 1);
    e.radius = def.radius * (elite ? ELITE.radiusMult : 1);
    e.maxHp = def.hp * mult;
    e.hp = e.maxHp;
    e.hpScale = scale;
    e.elite = elite;
    e.damage = def.damage;
    e.hitCd.clear();
    e.slowFactor = 1;
    e.slowUntil = 0;
    e.knockX = 0;
    e.knockY = 0;
    e.flash = 0;
    e.lastHitSource = '';
    e.ai = {
      t: this.rng.range(0, 0.5),
      phase: 0,
      wob: this.rng.range(-Math.PI, Math.PI),
      shoot: this.rng.range(1, 2.5),
      summon: 4,
      burst: 3,
      charge: 4,
    };
    this.enemies.push(e);
    return e;
  }

  spawnProjectile(kind: ProjectileKind): Projectile {
    const p = this.projPool.obtain();
    p.active = true;
    p.kind = kind;
    p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
    p.radius = 8;
    p.damage = 0;
    p.pierce = 0;
    p.life = 1;
    p.rotation = 0;
    p.hit.clear();
    p.friendly = true;
    p.color = 0xffffff;
    p.blast = 0;
    p.homing = 0;
    this.projectiles.push(p);
    return p;
  }

  spawnHazard(kind: HazardKind): Hazard {
    const h = this.hazardPool.obtain();
    h.active = true;
    h.kind = kind;
    h.x = 0; h.y = 0;
    h.follow = false;
    h.r = 0; h.maxR = 0; h.width = 0;
    h.angle = 0; h.spin = 0;
    h.damage = 0;
    h.t = 0; h.dur = 1;
    h.tickEvery = 0;
    h.slow = 0; h.knockback = 0;
    h.data = 0;
    h.hostile = false;
    h.points = undefined;
    h.hitCd.clear();
    this.hazards.push(h);
    return h;
  }

  dropPickup(kind: PickupKind, x: number, y: number, value: number): void {
    if (this.pickups.length >= LIMITS.maxPickups) return;
    const pk = this.pickupPool.obtain();
    pk.active = true;
    pk.kind = kind;
    pk.x = x + this.rng.range(-10, 10);
    pk.y = y + this.rng.range(-10, 10);
    pk.value = value;
    pk.t = 0;
    this.pickups.push(pk);
  }

  /** 网格圆查询。返回共享缓冲区：下一次查询前有效，请立即消费，勿跨帧持有 */
  queryEnemies(x: number, y: number, r: number): Enemy[] {
    this.scratch.length = 0;
    this.grid.queryCircle(x, y, r, this.scratch);
    return this.scratch;
  }

  /** 最近的 n 个存活敌人（武器索敌用；n 很小，直接维护有序小数组） */
  nearestEnemies(x: number, y: number, n: number, maxDist: number): Enemy[] {
    const md2v = maxDist * maxDist;
    const best: { e: Enemy; d2v: number }[] = [];
    for (const e of this.enemies) {
      if (!e.active || e.hp <= 0) continue;
      const d2v = dist2(x, y, e.x, e.y);
      if (d2v > md2v) continue;
      let pos = best.length;
      while (pos > 0 && best[pos - 1].d2v > d2v) pos--;
      if (pos < n) {
        best.splice(pos, 0, { e, d2v });
        if (best.length > n) best.pop();
      }
    }
    return best.map((b) => b.e);
  }

  dealDamage(e: Enemy, amount: number, kbx = 0, kby = 0, source = ''): void {
    if (!e.active || e.hp <= 0) return;
    // 术士汲魂天赋：被诅咒者魂魄松动，承伤 +25%（含诅咒侵蚀本身，越吸越脆）
    if (this.classId === 'warlock' && e.curseUntil > this.time) {
      amount = Math.round(amount * 1.25);
    }
    e.hp -= amount;
    this.damageDealt += amount;
    e.flash = 0.09;
    e.lastHitSource = source;
    const resist = e.def.knockbackResist ?? 0;
    if (resist < 1) {
      e.knockX += kbx * (1 - resist);
      e.knockY += kby * (1 - resist);
    }
    if (this.floaters.length < 80) {
      this.floaters.push({ x: e.x, y: e.y - e.radius, amount: Math.max(1, Math.round(amount)), t: 0 });
    }
    if (e.hp <= 0) this.killEnemy(e);
    else this.emitSfx('hit');
  }

  emitSfx(name: SfxName): void {
    this.events.onSfx?.(name);
  }

  // ------------------------------------------------ 内部系统

  private updatePlayer(dt: number): void {
    const p = this.player;
    let ix = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    let iy = (this.input.down ? 1 : 0) - (this.input.up ? 1 : 0);
    if (ix !== 0 || iy !== 0) {
      const len = Math.hypot(ix, iy);
      ix /= len;
      iy /= len;
      p.faceX = ix;
      p.faceY = iy;
      p.x += ix * p.stats.speed * dt;
      p.y += iy * p.stats.speed * dt;
    }
    p.x = clamp(p.x, 30, ARENA.width - 30);
    p.y = clamp(p.y, 30, ARENA.height - 30);
    p.invuln = Math.max(0, p.invuln - dt);
    if (p.stats.regen > 0) {
      p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.regen * dt);
    }
  }

  private updateWeapons(dt: number): void {
    const p = this.player;
    for (const slot of p.weapons) {
      const behavior = WEAPON_BEHAVIORS[slot.def.behavior];
      if (!behavior) throw new Error(`未注册的武器行为: ${slot.def.behavior}`);
      behavior(this, slot, computeWeaponStats(slot, p), dt);
    }
  }

  /**
   * 难度时间轴（虚拟分钟）：闯幽冥 = (关卡-1)*2 + 关内分钟，越深越凶；
   * 无尽 = 真实分钟。
   */
  private virtualMinute(): number {
    if (this.mode === 'stages') {
      // 每关只推 1 档难度（用户实测 +2 档到第 3 关就杀不动了）
      return this.stage - 1;
    }
    return Math.floor(this.time / 60);
  }

  private currentPhase(minute: number): WavePhase {
    let phase = WAVE_PHASES[0];
    for (const ph of WAVE_PHASES) {
      if (minute >= ph.fromMin) phase = ph;
      else break;
    }
    return phase;
  }

  private updateSpawner(dt: number): void {
    const minute = this.virtualMinute();
    const phase = this.currentPhase(minute);

    if (this.ruleTimers.length !== phase.rules.length) {
      // 进入新相位：计时器带随机初相，避免切表瞬间全场齐刷
      this.ruleTimers = phase.rules.map(() => this.rng.range(0, 1));
    }
    for (let i = 0; i < phase.rules.length; i++) {
      const rule = phase.rules[i];
      this.ruleTimers[i] -= dt;
      if (this.ruleTimers[i] <= 0) {
        // 小怪房门：刷怪提速
        this.ruleTimers[i] = (rule.every / this.spawnRateMult);
        if (this.enemies.length < phase.maxEnemies) {
          for (let b = 0; b < rule.batch; b++) this.spawnOnRing(rule.enemy, false);
        }
      }
    }

    if (minute >= ELITE_START_MIN) {
      this.eliteTimer -= dt;
      if (this.eliteTimer <= 0) {
        this.eliteTimer = 60;
        const rule = this.rng.pick(phase.rules);
        if (rule) this.spawnOnRing(rule.enemy, true);
      }
    }

    if (this.mode === 'endless') {
      this.updateEndlessEvents();
    }
  }

  /**
   * 无尽模式的时间轴：夜巡的天亮不存在，改成每 5 分钟一个节拍的
   * 循环劫难 —— 旱魃/尸王严格交替登场（每两巡血量抬一档），尸潮穿插其间。
   */
  private updateEndlessEvents(): void {
    while (this.time >= this.endlessEventK * ENDLESS.eventEvery) {
      const k = this.endlessEventK++;
      if (k % 3 === 0) {
        // 每第三拍：尸潮，一波比一波厚
        const count = ENDLESS.hordeBase + k * 8;
        for (let i = 0; i < count; i++) {
          this.spawnOnRing(i % 2 === 0 ? 'jiangshi' : 'hopper', false, 1);
        }
        this.emitSfx('boss');
      } else {
        const id = this.endlessBossCount % 2 === 0 ? 'hangu' : 'shiwang';
        const hpMult = 1 + ENDLESS.bossHpStep * Math.floor(this.endlessBossCount / 2);
        this.endlessBossCount++;
        const boss = this.spawnOnRing(id, false, hpMult);
        this.boss = boss;
        this.emitSfx('boss');
        this.events.onBossSpawned?.(boss);
      }
    }
  }

  /** 在玩家周围的屏幕外出生环上刷怪（钳回竞技场内） */
  private spawnOnRing(defId: string, elite: boolean, hpMult = 1): Enemy {
    const a = this.rng.range(0, TAU);
    const x = clamp(this.player.x + Math.cos(a) * SPAWN_RING, 40, ARENA.width - 40);
    const y = clamp(this.player.y + Math.sin(a) * SPAWN_RING, 40, ARENA.height - 40);
    return this.spawnEnemyAt(defId, x, y, elite, hpMult);
  }

  private rebuildGrid(): void {
    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    const knockDecay = Math.exp(-4 * dt);
    for (const e of this.enemies) {
      const behavior = ENEMY_BEHAVIORS[e.def.behavior];
      if (!behavior) throw new Error(`未注册的敌人行为: ${e.def.behavior}`);
      behavior(e, this, dt);

      e.x += (e.vx + e.knockX) * dt;
      e.y += (e.vy + e.knockY) * dt;
      e.knockX *= knockDecay;
      e.knockY *= knockDecay;
      e.x = clamp(e.x, 20, ARENA.width - 20);
      e.y = clamp(e.y, 20, ARENA.height - 20);
      e.flash = Math.max(0, e.flash - dt);

      // 被甩开太远的小怪回收重生，维持场面压力（Boss 不回收）
      if (!e.def.boss && dist2(e.x, e.y, p.x, p.y) > ENEMY_RECYCLE_DIST * ENEMY_RECYCLE_DIST) {
        const a = this.rng.range(0, TAU);
        e.x = clamp(p.x + Math.cos(a) * SPAWN_RING, 40, ARENA.width - 40);
        e.y = clamp(p.y + Math.sin(a) * SPAWN_RING, 40, ARENA.height - 40);
      }

      if (p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) < (e.radius + p.radius) ** 2) {
        this.applyPlayerDamage(e.damage - p.stats.armor);
      }

      // 蚀魂咒分期结算：积攒到 4 点伤害才飘字/结算，避免每帧刷屏
      if (e.curseUntil > this.time && e.curseDps > 0) {
        e.curseAcc += e.curseDps * dt;
        if (e.curseAcc >= 4) {
          const dmg = e.curseAcc;
          e.curseAcc = 0;
          this.dealDamage(e, dmg);
        }
      }
    }
  }

  /** 灵犬（猎人道途）：扑咬 480 内最近之敌，无人可咬时缀在主人身后 */
  private updatePet(dt: number): void {
    const pet = this.pet;
    if (!pet) return;
    const p = this.player;
    const target = this.nearestEnemies(pet.x, pet.y, 1, 480)[0] ?? null;

    let tx: number;
    let ty: number;
    let speed: number;
    if (target) {
      tx = target.x;
      ty = target.y;
      speed = 265;
    } else {
      // 跟随位：主人身后 46px
      tx = p.x - p.faceX * 46;
      ty = p.y - p.faceY * 46;
      speed = 330;
    }

    const dx = tx - pet.x;
    const dy = ty - pet.y;
    const d = Math.hypot(dx, dy);
    if (d > (target ? 6 : 14)) {
      pet.faceX = dx / d;
      pet.faceY = dy / d;
      pet.x += pet.faceX * speed * dt;
      pet.y += pet.faceY * speed * dt;
    }

    if (target) {
      const biteDist = Math.hypot(target.x - pet.x, target.y - pet.y);
      if (biteDist < target.radius + 14 && (target.hitCd.get(World.PET_KEY) ?? 0) <= this.time) {
        target.hitCd.set(World.PET_KEY, this.time + 0.8);
        // source='pet'：猎人道途靠它判定“丰收”双倍魂魄
        this.dealDamage(target, 12 + this.player.level, pet.faceX * 110, pet.faceY * 110, 'pet');
      }
    }
  }

  /** 宝珠触发器：雷珠定时落雷 / 焰珠受击反炸（属性型宝珠在 refreshStats 里生效） */
  private updateOrbs(dt: number): void {
    this.flameCd = Math.max(0, this.flameCd - dt);

    if (this.orbIds.includes('thunder')) {
      this.orbThunderT -= dt;
      if (this.orbThunderT <= 0) {
        this.orbThunderT = 6;
        const pool = this.enemies.filter((e) => dist2(e.x, e.y, this.player.x, this.player.y) < 750 * 750);
        if (pool.length > 0) {
          const e = this.rng.pick(pool);
          const h = this.spawnHazard('strike');
          h.x = e.x;
          h.y = e.y;
          h.r = 75;
          h.dur = 0.5;
          h.damage = 45 + this.player.level * 3;
          h.data = 0;
          h.color = 0x8fd3ff;
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    const p = this.player;
    for (const pr of this.projectiles) {
      // 追踪星火：朝索敌半径内最近的敌人拐弯
      if (pr.homing > 0 && pr.friendly) {
        const near = this.queryEnemies(pr.x, pr.y, 320);
        let target: Enemy | null = null;
        let bestD2 = Infinity;
        for (const e of near) {
          if (!e.active || e.hp <= 0 || pr.hit.has(e)) continue;
          const d2v = dist2(pr.x, pr.y, e.x, e.y);
          if (d2v < bestD2) {
            bestD2 = d2v;
            target = e;
          }
        }
        if (target) {
          const speed = Math.hypot(pr.vx, pr.vy) || 1;
          const want = Math.atan2(target.y - pr.y, target.x - pr.x);
          let cur = Math.atan2(pr.vy, pr.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= TAU;
          while (diff < -Math.PI) diff += TAU;
          const turn = clamp(diff, -pr.homing * dt, pr.homing * dt);
          cur += turn;
          pr.vx = Math.cos(cur) * speed;
          pr.vy = Math.sin(cur) * speed;
          pr.rotation = cur;
        }
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (
        pr.life <= 0 ||
        pr.x < -200 || pr.x > ARENA.width + 200 ||
        pr.y < -200 || pr.y > ARENA.height + 200
      ) {
        if (pr.blast > 0) this.explode(pr);
        pr.active = false;
        continue;
      }

      if (pr.friendly) {
        const hits = this.queryEnemies(pr.x, pr.y, pr.radius + 46);
        for (const e of hits) {
          if (!e.active || e.hp <= 0 || pr.hit.has(e)) continue;
          if (dist2(pr.x, pr.y, e.x, e.y) > (pr.radius + e.radius) ** 2) continue;
          pr.hit.add(e);
          if (pr.kind === 'curse') {
            // 蚀魂咒：命中挂 DoT，不立即结算伤害；术士天职，侵蚀更强
            const mult = this.classId === 'warlock' ? 1.25 : 1;
            e.curseDps = pr.damage * 0.6 * mult;
            e.curseUntil = this.time + pr.blast;
            e.curseAcc = 0;
            pr.active = false;
            break;
          }
          if (pr.blast > 0) {
            // 爆裂弹：命中即炸，不再逐个穿透
            this.explode(pr);
            pr.active = false;
            break;
          }
          const vlen = Math.hypot(pr.vx, pr.vy) || 1;
          this.dealDamage(e, pr.damage, (pr.vx / vlen) * 90, (pr.vy / vlen) * 90);
          if (pr.pierce <= 0) {
            pr.active = false;
            break;
          }
          pr.pierce--;
        }
      } else if (p.invuln <= 0 && dist2(pr.x, pr.y, p.x, p.y) < (pr.radius + p.radius) ** 2) {
        this.applyPlayerDamage(pr.damage - p.stats.armor);
        pr.active = false;
      }
    }
  }

  /** 火符爆裂：以弹着点为圆心波及一片，附带视觉冲击环 */
  private explode(pr: Projectile): void {
    const hits = this.queryEnemies(pr.x, pr.y, pr.blast + 46);
    for (const e of hits) {
      if (!e.active) continue;
      const d = Math.sqrt(dist2(e.x, e.y, pr.x, pr.y));
      if (d <= pr.blast + e.radius) {
        const inv = 1 / Math.max(d, 1);
        this.dealDamage(e, pr.damage, (e.x - pr.x) * inv * 160, (e.y - pr.y) * inv * 160);
      }
    }
    const ring = this.spawnHazard('ring');
    ring.x = pr.x;
    ring.y = pr.y;
    ring.maxR = pr.blast;
    ring.r = pr.blast * 0.4;
    ring.dur = 0.28;
    ring.color = 0xff7a3c;
    this.emitSfx('hit');
  }

  private updateHazards(dt: number): void {
    const p = this.player;
    for (const h of this.hazards) {
      h.t += dt;
      if (h.follow) {
        h.x = p.x;
        h.y = p.y;
      }

      switch (h.kind) {
        case 'ring': {
          const prevR = h.r;
          h.r = h.maxR * Math.min(h.t / h.dur, 1);
          if (h.hostile) {
            if (h.data === 0 && dist2(p.x, p.y, h.x, h.y) <= (h.r + p.radius) ** 2) {
              h.data = 1;
              this.applyPlayerDamage(h.damage - p.stats.armor);
            }
          } else {
            const hits = this.queryEnemies(h.x, h.y, h.r + 48);
            for (const e of hits) {
              if (!e.active || h.hitCd.has(e)) continue;
              const d = Math.sqrt(dist2(e.x, e.y, h.x, h.y));
              // 环带扫过判定：命中介于上一帧半径与当前半径之间的敌人
              if (d <= h.r + e.radius && d >= prevR - e.radius) {
                h.hitCd.set(e, 1e9); // 一圈只结算一次
                const inv = 1 / Math.max(d, 1);
                this.dealDamage(e, h.damage, (e.x - h.x) * inv * h.knockback, (e.y - h.y) * inv * h.knockback);
              }
            }
          }
          break;
        }
        case 'beam': {
          // 以光束中点做网格粗查询，再按点到线段距离精判
          const mx = h.x + Math.cos(h.angle) * h.maxR * 0.5;
          const my = h.y + Math.sin(h.angle) * h.maxR * 0.5;
          const hits = this.queryEnemies(mx, my, h.maxR * 0.5 + h.width);
          for (const e of hits) {
            if (!e.active) continue;
            if ((h.hitCd.get(e) ?? 0) > this.time) continue;
            if (beamHits(h, e.x, e.y, e.radius)) {
              h.hitCd.set(e, this.time + Math.max(h.tickEvery, 0.05));
              this.dealDamage(e, h.damage);
            }
          }
          break;
        }
        case 'strike': {
          // 前段警示圈，末段 0.12s 内落雷判定一次
          if (h.data === 0 && h.t >= h.dur - 0.12) {
            h.data = 1;
            const hits = this.queryEnemies(h.x, h.y, h.r + 46);
            for (const e of hits) {
              if (e.active && dist2(e.x, e.y, h.x, h.y) <= (h.r + e.radius) ** 2) {
                this.dealDamage(e, h.damage);
              }
            }
            this.emitSfx('thunder');
          }
          break;
        }
        case 'spiral': {
          h.angle += h.spin * dt;
          h.r = h.maxR * Math.min(1, (h.t / h.dur) ** 0.7); // 先快后慢展开
          const blades = Math.max(1, Math.round(h.data));
          for (let i = 0; i < blades; i++) {
            const pos = spiralBladePos(h, i);
            const hits = this.queryEnemies(pos.x, pos.y, 16 + 46);
            for (const e of hits) {
              if (!e.active) continue;
              if ((h.hitCd.get(e) ?? 0) > this.time) continue;
              if (dist2(e.x, e.y, pos.x, pos.y) <= (16 + e.radius) ** 2) {
                h.hitCd.set(e, this.time + Math.max(h.tickEvery, 0.05));
                this.dealDamage(e, h.damage);
              }
            }
          }
          break;
        }
        case 'aura':
          // 糯米阵不生成实体（常驻判定在 weapons-runtime 的 aura 行为内），仅为枚举完备
          break;
        case 'chain':
        case 'sweep':
          // 纯表现体：伤害在触发时的行为策略内即时结算完毕
          break;
      }

      if (h.t >= h.dur) h.active = false;
    }
  }

  private updatePickups(dt: number): void {
    const p = this.player;
    const magnet = p.stats.magnet;
    for (const pk of this.pickups) {
      pk.t += dt;
      const d2v = dist2(pk.x, pk.y, p.x, p.y);
      if (d2v < magnet * magnet) {
        const d = Math.sqrt(d2v) || 1;
        const step = PICKUP_MAGNET_SPEED * dt;
        pk.x += ((p.x - pk.x) / d) * step;
        pk.y += ((p.y - pk.y) / d) * step;
      }
      if (d2v < 26 * 26) {
        pk.active = false;
        if (pk.kind === 'xp') {
          this.addXp(pk.value);
          this.emitSfx('pickup');
        } else if (pk.kind === 'heal') {
          p.hp = Math.min(p.stats.maxHp, p.hp + DROPS.healValue);
          this.emitSfx('heal');
        } else if (pk.kind === 'bomb') {
          for (const e of this.enemies) this.dealDamage(e, DROPS.bombDamage);
          this.emitSfx('bomb');
        }
      }
    }
  }

  private addXp(v: number): void {
    const p = this.player;
    p.xp += v * p.stats.xpGain;
    let leveled = false;
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext;
      p.level++;
      p.xpToNext = xpToNext(p.level);
      leveled = true;
    }
    // V2：升级不再打断战斗（三选一挪到关卡切换），自动小幅成长
    if (leveled) this.refreshStats();
  }

  private applyPlayerDamage(raw: number): void {
    const p = this.player;
    if (p.invuln > 0 || this.state !== 'PLAYING') return;
    const dmg = Math.max(1, Math.round(raw));
    p.hp -= dmg;
    p.invuln = PLAYER.invulnTime;
    this.events.onPlayerHit?.(dmg);
    this.emitSfx('hurt');

    // 焰珠：受击反炸一圈
    if (this.orbIds.includes('flame') && this.flameCd <= 0) {
      this.flameCd = 3;
      const ring = this.spawnHazard('ring');
      ring.x = p.x;
      ring.y = p.y;
      ring.maxR = 130;
      ring.r = 20;
      ring.dur = 0.35;
      ring.damage = 30;
      ring.knockback = 260;
      ring.color = 0xff9a3c;
      this.emitSfx('bell');
    }

    if (p.hp <= 0) {
      p.hp = 0;
      this.state = 'GAME_OVER';
      this.events.onGameOver?.();
    }
  }

  private killEnemy(e: Enemy): void {
    e.active = false;
    this.kills++;
    if (this.mode === 'stages') this.stageKills++;
    this.events.onEnemyKilled?.(e);
    this.emitSfx('kill');

    // 血珠：诛邪回血
    if (this.orbIds.includes('blood')) {
      const p = this.player;
      p.hp = Math.min(p.stats.maxHp, p.hp + 1);
    }

    // 噬之鬼面：食魄疗己（闯幽冥）
    if (this.mode === 'stages' && this.maskLevels.fang) {
      const p = this.player;
      p.hp = Math.min(p.stats.maxHp, p.hp + 0.5 * this.maskLevels.fang);
    }

    // 术士汲魂：被咒死的敌人精气被抽走，回 2 点生命（配合汲魂粒子的“吸取感”）
    if (this.classId === 'warlock' && e.curseUntil > this.time) {
      const p = this.player;
      p.hp = Math.min(p.stats.maxHp, p.hp + 2);
    }

    // 猎人丰收：灵犬咬死的猎物魂魄翻倍（两颗各含全额）
    const petKill = e.lastHitSource === 'pet';

    // 蚀魂咒传染：被咒死的敌人把疫病传给邻近者（术士范围更大）
    if (e.curseUntil > this.time && e.curseDps > 0) {
      const spreadR = this.classId === 'warlock' ? 170 : 110;
      const near = this.queryEnemies(e.x, e.y, spreadR + 46);
      for (const o of near) {
        if (!o.active || o === e) continue;
        if (dist2(o.x, o.y, e.x, e.y) > (spreadR + o.radius) ** 2) continue;
        o.curseDps = Math.max(o.curseDps, e.curseDps * 0.7);
        o.curseUntil = Math.max(o.curseUntil, this.time + 2);
        o.curseAcc = 0;
      }
      // 传染视觉：紫色疫环
      const ring = this.spawnHazard('ring');
      ring.x = e.x;
      ring.y = e.y;
      ring.maxR = spreadR;
      ring.r = spreadR * 0.5;
      ring.dur = 0.3;
      ring.color = 0x9a5ac8;
    }
    e.curseDps = 0;
    e.curseUntil = 0;

    if (e.def.boss) {
      // Boss 掉一大捧魂魄，散落拾取有仪式感
      const gems = 4;
      for (let i = 0; i < gems; i++) {
        const a = (i * TAU) / gems;
        this.dropPickup('xp', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, Math.round(e.def.xp / gems));
      }
      this.dropPickup('heal', e.x, e.y + 24, 0);
      this.boss = null;
    } else if (e.elite) {
      this.dropPickup('xp', e.x, e.y, Math.round(e.def.xp * ELITE.xpMult));
      this.dropPickup(this.rng.next() < 0.5 ? 'heal' : 'bomb', e.x + 16, e.y, 0);
    } else {
      // 闯幽冥不掉魂魄（该模式无升级，成长来自过门奖励）；无尽照旧
      const xpMult = petKill && this.mode === 'endless' ? 2 : 1;
      if (xpMult > 1) {
        this.dropPickup('xp', e.x - 8, e.y, e.def.xp);
        this.dropPickup('xp', e.x + 8, e.y, e.def.xp);
      } else if (this.mode === 'endless') {
        this.dropPickup('xp', e.x, e.y, e.def.xp);
      }
      const roll = this.rng.next();
      if (roll < DROPS.healChance) this.dropPickup('heal', e.x, e.y, 0);
      else if (roll < DROPS.healChance + DROPS.bombChance) this.dropPickup('bomb', e.x, e.y, 0);
    }
  }

  private updateFloaters(dt: number): void {
    for (const f of this.floaters) f.t += dt;
  }

  // ------------------------------------------------ 帧末压实（尸体归还对象池）

  private compactEnemies(): void {
    let w = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.active) {
        this.enemies[w++] = e;
      } else {
        e.hitCd.clear();
        this.enemyPool.release(e);
      }
    }
    this.enemies.length = w;
  }

  private compactProjectiles(): void {
    let w = 0;
    for (let i = 0; i < this.projectiles.length; i++) {
      const pr = this.projectiles[i];
      if (pr.active) {
        this.projectiles[w++] = pr;
      } else {
        pr.hit.clear();
        this.projPool.release(pr);
      }
    }
    this.projectiles.length = w;
  }

  private compactHazards(): void {
    let w = 0;
    for (let i = 0; i < this.hazards.length; i++) {
      const h = this.hazards[i];
      if (h.active) {
        this.hazards[w++] = h;
      } else {
        h.hitCd.clear();
        h.points = undefined;
        this.hazardPool.release(h);
      }
    }
    this.hazards.length = w;
  }

  private compactPickups(): void {
    let w = 0;
    for (let i = 0; i < this.pickups.length; i++) {
      const pk = this.pickups[i];
      if (pk.active) this.pickups[w++] = pk;
      else this.pickupPool.release(pk);
    }
    this.pickups.length = w;
  }
}
