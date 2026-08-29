/**
 * World —— 一局游戏的状态容器 + 每帧管线编排。
 *
 * 分层红线：本文件不 import Phaser。渲染层每帧读取这里的公开数组做画面同步，
 * 单元测试直接 new World() + update(dt) 即可驱动完整一局。
 *
 * V3 模块化：所有系统逻辑在 `systems/`（函数式，操作 World 公开状态），
 * 模式差异在 `modes/`（策略接口），武器在 `weapons/`（每武器一模块）。
 * 本文件只做三件事：持有状态、按序调度系统、对渲染层暴露只读视图。
 *
 * 实体生命周期：所有敌/弹/区域/拾取物走对象池；“死亡”只是 active=false +
 * 帧末压实（compact），同一帧内的后续系统据此跳过尸体。
 */
import { Pool } from '../core/pool';
import { Rng, clamp, dist2 } from '../core/math';
import { SpatialGrid } from '../core/spatial-grid';
import {
  ARENA, BASE_STATS, ELITE, LIMITS, PLAYER, globalHpScale, xpToNext,
} from '../data/config';
import { SHOP_ITEMS } from '../data/shop';
import { MASKS } from '../data/masks';
import { EQUIPMENT, EQUIP_CAP } from '../data/equipment';
import { spendMingbi } from './save';
import { ENEMIES } from '../data/enemies';
import { WEAPONS, DEFAULT_WEAPON } from './weapons/registry';
import { updatePlayer, updateOrbTriggers } from './systems/player';
import { updateWeapons } from './systems/weapons';
import { updateSpawner, currentPhase } from './systems/spawner';
import { updateEnemies } from './systems/enemies';
import { updateAllies, spawnAlly } from './systems/allies';
import { updateProjectiles } from './systems/projectiles';
import { updateHazards } from './systems/hazards';
import { updatePickups } from './systems/pickups';
import { updateFloaters } from './systems/floaters';
import { dealDamage } from './systems/combat';
import { generateOptions } from './upgrades';
import { recalcStats } from './stats';
import { modeStrategyFor } from './modes';
import type { RunModeStrategy } from './modes/strategy';
import type {
  Ally, DoorDef, DoorId, Enemy, Floater, Hazard, HazardKind, Pickup, PickupKind, Player,
  Projectile, ProjectileKind, RunMode, RunState, SfxName, UpgradeOption,
} from './types';

export interface WorldEvents {
  onReward?(options: UpgradeOption[]): void;
  onDoors?(): void;
  onShop?(): void;
  onPlayerHit?(dmg: number): void;
  onEnemyKilled?(e: Enemy): void;
  onBossSpawned?(e: Enemy): void;
  onGameOver?(): void;
  onVictory?(): void;
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
  // ---- 进程状态
  state: RunState = 'MENU';
  mode: RunMode = 'stages';
  /** 模式策略：闯幽冥/无尽的差异全部收敛于此 */
  modeStrategy: RunModeStrategy = modeStrategyFor('stages');

  // ---- 鬼市注入的局内配置
  /** 鬼市装备的局内配置（≤ EQUIP_CAP） */
  equips: string[] = [];
  maskLevels: Record<string, number> = {};

  // ---- 通用计数
  time = 0;
  kills = 0;
  damageDealt = 0;
  boss: Enemy | null = null;

  // ---- 闯幽冥进度（模式策略读写）
  stage = 0;
  stageTime = 0;
  stageKills = 0;
  stageTarget = 10;
  stageIsBoss = false;
  bonusGold = 0;
  /** 搜打撤：携带中的赃物（未撤离不入账，死亡尽失） */
  carryLoot = 0;
  spawnRateMult = 1;
  pendingSpawnRate = 1;
  pendingBoss = false;
  pendingDoors: DoorDef[] = [];

  // ---- 无尽进度（模式策略读写）
  endlessEventK = 1;
  endlessBossCount = 0;

  // ---- 升级队列（无尽三选一）
  pendingLevels = 0;

  // ---- 冥品商店局内增益
  furyActive = false;
  shopArmorBonus = 0;

  // ---- 实体
  readonly player: Player = createPlayer();
  readonly enemies: Enemy[] = [];
  readonly projectiles: Projectile[] = [];
  readonly hazards: Hazard[] = [];
  readonly pickups: Pickup[] = [];
  readonly floaters: Floater[] = [];
  /** 召唤物（地狱犬/骷髅犬）——无敌友军 */
  allies: Ally[] = [];
  readonly input = { up: false, down: false, left: false, right: false };

  readonly rng: Rng;
  readonly events: WorldEvents;

  // ---- 内部设施（系统模块经 World API 间接使用）
  private readonly grid = new SpatialGrid<Enemy>(96);
  private readonly scratch: Enemy[] = [];
  private readonly enemyPool = new Pool(createEnemy, 80);
  private readonly projPool = new Pool(createProjectile, 80);
  private readonly hazardPool = new Pool(createHazard, 24);
  private readonly pickupPool = new Pool(createPickup, 80);
  private nextWeaponInstance = 1;
  /** @internal 系统模块读写 */
  eliteTimer = 60;
  /** @internal 系统模块读写 */
  orbThunderT = 6;
  /** @internal 系统模块读写 */
  flameCd = 0;
  /** @internal 系统模块读写 */
  ruleTimers: number[] = [];

  constructor(seed: number = Date.now() % 2147483647, events: WorldEvents = {}) {
    this.rng = new Rng(seed);
    this.events = events;
  }

  /**
   * 开新局（可重复调用，等价于“再来一局”）。
   * @param mode 闯幽冥 / 无尽尸潮
   * @param loadout 鬼市配置：装备的主武器、宝珠、传说、面具
   */
  start(mode: RunMode = 'stages', loadout?: {
    weaponId?: string;
    equips?: string[];
    extraWeapons?: string[];
    masks?: Record<string, number>;
  }): void {
    // 先定模式与策略：策略 init 依赖 mode，refreshStats 的深度补偿依赖 stage
    this.mode = mode;
    this.modeStrategy = modeStrategyFor(mode);

    for (const e of this.enemies) { e.active = false; e.hitCd.clear(); this.enemyPool.release(e); }
    for (const pr of this.projectiles) { pr.hit.clear(); this.projPool.release(pr); }
    for (const h of this.hazards) { h.hitCd.clear(); this.hazardPool.release(h); }
    for (const pk of this.pickups) this.pickupPool.release(pk);
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.hazards.length = 0;
    this.pickups.length = 0;
    this.floaters.length = 0;
    this.allies.length = 0;

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

    // 鬼市配置：装备的主武器（兜底符文）+ 宝珠 + 面具
    this.equips = (loadout?.equips ?? []).filter((id) => EQUIPMENT.some((e) => e.id === id)).slice(0, EQUIP_CAP);
    this.maskLevels = {};
    for (const [id, lv] of Object.entries(loadout?.masks ?? {})) {
      if (MASKS.some((m) => m.id === id) && lv > 0) this.maskLevels[id] = lv;
    }
    const weaponId = loadout?.weaponId && WEAPONS[loadout.weaponId] ? loadout.weaponId : DEFAULT_WEAPON;
    p.weapons.push({ def: WEAPONS[weaponId], level: 1, timer: 0.4, state: {}, instance: this.nextWeaponInstance++, specials: [] });
    // 传说武器（弑神枪等）：入手后每局自带
    for (const id of loadout?.extraWeapons ?? []) {
      if (WEAPONS[id]) p.weapons.push({ def: WEAPONS[id], level: 1, timer: 0.6, state: {}, instance: this.nextWeaponInstance++, specials: [] });
    }

    // 模式私有进度重置（关卡/事件计数等）
    this.modeStrategy.init(this);

    this.time = 0;
    this.bonusGold = 0;
    this.kills = 0;
    this.damageDealt = 0;
    this.boss = null;
    this.nextWeaponInstance = 1;
    this.eliteTimer = 60;
    this.ruleTimers = [];
    this.orbThunderT = 6;
    this.flameCd = 0;
    this.pendingLevels = 0;
    this.furyActive = false;
    this.shopArmorBonus = 0;
    this.refreshStats();
    this.state = 'PLAYING';
  }

  /**
   * 在纯被动结算之上，叠加宝珠、冥品商店增益、鬼面具与等级成长。
   * 每次被动/等级变化后都要走这里，否则加成会被 recalcStats 冲掉。
   */
  refreshStats(): void {
    recalcStats(this.player);
    const s = this.player.stats;
    if (this.equips.includes('ghost')) {
      s.magnet *= 2;
      s.xpGain *= 1.15;
    }
    if (this.equips.includes('wind')) {
      s.speed *= 1.15;
      s.regen += 0.6;
    }
    // 等级成长：+1% 伤害 / +3 生命上限（仅无尽会升级）
    const lv = this.player.level - 1;
    if (lv > 0) {
      s.damage *= 1 + 0.01 * lv;
      s.maxHp += 3 * lv;
    }
    // 冥品商店局内增益
    if (this.furyActive) s.damage *= 1.25;
    s.armor += this.shopArmorBonus;
    // 鬼面具（闯幽冥专属人物强化）+ 深度补偿
    if (this.mode === 'stages') {
      const ml = this.maskLevels;
      if (ml.rage) s.damage *= 1 + 0.08 * ml.rage;
      if (ml.guard) s.armor += 1 * ml.guard;
      if (ml.swift) s.speed *= 1 + 0.05 * ml.swift;
      if (ml.vitality) s.maxHp += 20 * ml.vitality;
      s.damage *= 1 + 0.04 * (this.stage - 1);
    }
    // 布鞋 / 玄铁护符（装备，两模式通用）
    if (this.equips.includes('shoes')) s.speed *= 1.12;
    if (this.equips.includes('charm')) s.armor += 2;
  }

  /** 推进一帧。dt 为秒；钳制由调用方（场景层）负责，测试允许大步进 */
  update(dt: number): void {
    if (this.state !== 'PLAYING') return;

    this.time += dt;
    updatePlayer(this, dt);
    updateWeapons(this, dt);
    updateSpawner(this, dt); // 末尾调 modeStrategy.tick（过关判定/循环劫难）
    this.rebuildGrid();
    updateEnemies(this, dt);
    updateAllies(this, dt);
    updateProjectiles(this, dt);
    updateHazards(this, dt);
    updateOrbTriggers(this, dt);
    updatePickups(this, dt);
    this.compactAll();
    updateFloaters(this, dt);
  }

  /** 经验入库：模式策略决定走升级三选一（无尽）还是忽略（闯幽冥） */
  grantXp(v: number): void {
    this.modeStrategy.grantXp(this, v);
  }

  /** 是否拥有某武器的某专属升级 */
  hasSpecial(weaponId: string, specialId: string): boolean {
    return this.player.weapons.some((s) => s.def.id === weaponId && s.specials.includes(specialId));
  }

  /** 召唤一只召唤物（地狱犬/骷髅犬） */
  spawnAlly(kind: string, x: number, y: number, cap?: number): boolean {
    return spawnAlly(this, kind, x, y, cap);
  }

  /** 成功撤离：活着带着赃物出去，本局以胜利结算 */
  extract(): void {
    if (this.state !== 'DOORS') return;
    this.state = 'VICTORY';
    this.emitSfx('victory');
    this.events.onVictory?.();
  }

  /** 玩家选完关卡/升级奖励后由 UI 调用 */
  applyUpgrade(option: UpgradeOption): void {
    const p = this.player;
    switch (option.kind) {
      case 'weapon-new':
        p.weapons.push({ def: WEAPONS[option.id], level: 1, timer: 0.2, state: {}, instance: this.nextWeaponInstance++, specials: [] });
        break;
      case 'weapon-upgrade': {
        const slot = p.weapons.find((sl) => sl.def.id === option.id);
        if (slot) slot.level = Math.min(slot.level + 1, slot.def.maxLevel);
        break;
      }
      case 'special': {
        const slot = p.weapons.find((sl) => sl.def.id === option.weapon);
        if (slot && !slot.specials.includes(option.id)) slot.specials.push(option.id);
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

    // 无尽模式的多级连升：逐轮弹奖励
    if (this.pendingLevels > 0) {
      this.pendingLevels--;
      if (this.pendingLevels > 0) {
        this.events.onReward?.(generateOptions(p, this.rng));
        return;
      }
    }
    this.state = 'PLAYING';
  }

  // ------------------------------------------------ 行为策略可用的 API

  spawnEnemyAt(defId: string, x: number, y: number, elite = false, hpMult = 1): Enemy {
    const def = ENEMIES[defId];
    if (!def) throw new Error(`未注册的敌人: ${defId}`);
    const e = this.enemyPool.obtain();
    const minute = this.modeStrategy.difficultyMinute(this);
    const scale = def.boss ? 1 : globalHpScale(minute) * currentPhase(this).hpScale;
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
    dealDamage(this, e, amount, kbx, kby, source);
  }

  emitSfx(name: SfxName): void {
    this.events.onSfx?.(name);
  }

  /** 闯幽冥：选门（委托模式策略） */
  chooseDoor(door: DoorId): void {
    if (this.modeStrategy.id !== 'stages') return;
    this.modeStrategy.chooseDoor?.(this, door);
  }

  /** 闯幽冥：离店 */
  finishShop(): void {
    if (this.modeStrategy.id !== 'stages') return;
    this.modeStrategy.finishShop?.(this);
  }

  /** 冥品商店购物：扣冥币、当场生效。返回 null = 成功 */
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

  /** 闯幽冥选门后进入下一关（由 stages 策略调用） */
  enterStage(): void {
    this.stage++;
    this.stageTime = 0;
    this.stageKills = 0;
    this.stageIsBoss = false;
    this.spawnRateMult = this.pendingSpawnRate;
    this.pendingSpawnRate = 1;
    this.ruleTimers = [];
    this.eliteTimer = 60;
    this.compactAll();
  }

  /** 帧末压实：尸体归还对象池 */
  compactAll(): void {
    this.compactEnemies();
    this.compactProjectiles();
    this.compactHazards();
    this.compactPickups();
  }

  private rebuildGrid(): void {
    this.grid.clear();
    for (const e of this.enemies) this.grid.insert(e);
  }

  private compactEnemies(): void {
    let w = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.active) this.enemies[w++] = e;
      else { e.hitCd.clear(); this.enemyPool.release(e); }
    }
    this.enemies.length = w;
  }

  private compactProjectiles(): void {
    let w = 0;
    for (let i = 0; i < this.projectiles.length; i++) {
      const pr = this.projectiles[i];
      if (pr.active) this.projectiles[w++] = pr;
      else { pr.hit.clear(); this.projPool.release(pr); }
    }
    this.projectiles.length = w;
  }

  private compactHazards(): void {
    let w = 0;
    for (let i = 0; i < this.hazards.length; i++) {
      const h = this.hazards[i];
      if (h.active) this.hazards[w++] = h;
      else { h.hitCd.clear(); h.points = undefined; this.hazardPool.release(h); }
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
