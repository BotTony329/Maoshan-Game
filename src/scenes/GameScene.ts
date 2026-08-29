import Phaser from 'phaser';
import { ARENA, stageTheme } from '../data/config';
import { World } from '../game/world';
import { computeWeaponStats, spiralBladePos } from '../game/weapons/shared';
import { session } from '../game/session';
import { loadSave } from '../game/save';
import { sfx } from '../render/sfx';
import { TAU } from '../core/math';
import { AUTOTEST } from '../render/autotest';
import type { Enemy, Hazard } from '../game/types';
type Img = Phaser.GameObjects.Image;
type Txt = Phaser.GameObjects.Text;
type RitualKind = 'ring' | 'beam' | 'sweep' | 'blizzard';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';


/**
 * 主战斗场景 —— 逻辑权威是 session.world（纯 TS），
 * 本场景只做三件事：喂输入、调 world.update(dt)、把实体数组同步成画面。
 */
export class GameScene extends Phaser.Scene {
  private world = session.world;

  private playerSprite!: Img;
  private allySprites: Img[] = [];
  private playerHpGfx!: Phaser.GameObjects.Graphics;
  private hazardGfx!: Phaser.GameObjects.Graphics;
  private stageTintRect!: Phaser.GameObjects.Rectangle;
  private groundTile!: Phaser.GameObjects.TileSprite;
  private shownStage = -1;
  /** 无头冒烟：?noauto 冻结自动抉择，用于截取门/奖励界面 */
  private noAuto = false;
  /** 无头冒烟：?shopdoor 强制进店 */
  private shopForce = false;
  private burstEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private smokeEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // 与 world.* 一一对齐的精灵数组（多退少补，走共享对象池）
  private enemySprites: Img[] = [];
  private projSprites: Img[] = [];
  private pickupSprites: Img[] = [];
  private floaterTexts: Txt[] = [];
  private boltSprites: Img[] = [];
  private totemSprites: Img[] = [];
  private ritualSprites: Record<RitualKind, Img[]> = { ring: [], beam: [], sweep: [], blizzard: [] };
  private orbitBlades: Img[] = [];

  private spritePool: Img[] = [];
  private textPool: Txt[] = [];

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Game');
  }

  create(): void {
    // 开新局：新建 World（旧局对象整体丢弃，天然免残留）
    this.world = new World(Date.now() % 2147483647, {
      onDoors: () => {
        if (!this.scene.isActive('Doors')) this.scene.launch('Doors');
      },
      onShop: () => {
        if (!this.scene.isActive('Shop')) this.scene.launch('Shop');
      },
      onReward: (options) => {
        session.pendingOptions = options;
        if (!this.scene.isActive('LevelUp')) this.scene.launch('LevelUp');
      },
      onSfx: (name) => {
        sfx.play(name);
        if (name === 'bomb') this.cameras.main.flash(160, 255, 240, 200);
      },
      onEnemyKilled: (e) => this.burst(e),
      onPlayerHit: () => this.cameras.main.shake(110, 0.006),
      onBossSpawned: () => this.cameras.main.shake(300, 0.004),
      onGameOver: () => this.endRun(false),
      onVictory: () => this.endRun(true),
    });
    session.world = this.world;
    // 鬼市配置：装备的主武器/宝珠/传说/面具
    // 无头冒烟可用 ?weapon=id&orbs=id1,id2 覆盖
    const save = loadSave();
    let loadout = { weaponId: save.equippedWeapon, equips: save.equipped, extraWeapons: save.legendary, masks: save.masks };
    if (AUTOTEST) {
      const sp = new URLSearchParams(location.search);
      this.noAuto = sp.has('noauto');
      this.shopForce = sp.has('shopdoor');
      loadout = {
        weaponId: sp.get('weapon') ?? save.equippedWeapon,
        equips: sp.has('orbs') ? sp.get('orbs')!.split(',') : save.equipped,
        extraWeapons: sp.has('godslayer') ? ['godslayer'] : save.legendary,
        masks: save.masks,
      };
    }
    this.world.start(session.pendingMode, loadout);

    this.buildArena();
    this.buildEmitters();

    this.playerSprite = this.add.image(this.world.player.x, this.world.player.y, 'player_taoist').setDepth(15);
    this.playerHpGfx = this.add.graphics().setDepth(30);
    this.hazardGfx = this.add.graphics().setDepth(6);

    // 关卡氛围染色层（每关换色，从人间杀穿地府）
    this.stageTintRect = this.add
      .rectangle(ARENA.width / 2, ARENA.height / 2, ARENA.width, ARENA.height, stageTheme(1).tint, 0.22)
      .setDepth(-9);

    this.cameras.main.setBounds(0, 0, ARENA.width, ARENA.height);
    this.cameras.main.startFollow(this.playerSprite, true, 0.12, 0.12);
    this.cameras.main.setBackgroundColor('#0d120e');

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,ESC,M') as Record<string, Phaser.Input.Keyboard.Key>;

    if (!this.scene.isActive('UI')) this.scene.launch('UI');

    // 无头冒烟测试（演示用，不影响正常游玩）
    if (AUTOTEST) {
      // ?ff=秒数：启动时先同步快进逻辑层（跳过无意义的前期等待，直接拍中期战局）
      const ff = Number(new URLSearchParams(location.search).get('ff') ?? 0);
      if (ff > 0) {
        const step = 1 / 30;
        const steps = Math.floor(Math.min(ff, 3000) * 30);
        for (let i = 0; i < steps; i++) {
          const st = this.world.state;
          if (st === 'DOORS') {
            if (this.noAuto) break; // 拍门界面用：停在亮门瞬间
            this.world.chooseDoor(this.world.pendingDoors[0]?.id ?? 'next');
          } else if (st === 'REWARD') {
            if (this.noAuto) break;
            const opts = session.pendingOptions;
            this.world.applyUpgrade(opts[i % Math.max(opts.length, 1)] ?? { kind: 'heal' });
          }
          if (this.world.state !== 'PLAYING') break;
          this.driveAuto(i * step);
          // 演示局定期回满血，保证长局截图时角色存活
          if (i % 60 === 0) this.world.player.hp = this.world.player.stats.maxHp;
          this.world.update(step);
        }
      }
    }
  }

  /**
   * 自动驾驶：绕场心做大圈走位（朝圆周上稍前方的锚点移动），
   * 不碰墙角、顺路扫过魂魄，接近真实玩家的走砍节奏。
   * 调用时机必须在 readInput() 之后，否则键盘读取会把这里的输入覆盖掉。
   */
  private driveAuto(time: number): void {
    const p = this.world.player;
    const a = time * 0.22;
    const tx = ARENA.width / 2 + Math.cos(a + 0.9) * 520;
    const ty = ARENA.height / 2 + Math.sin(a + 0.9) * 520;
    const dx = tx - p.x;
    const dy = ty - p.y;
    const i = this.world.input;
    i.right = dx > 24;
    i.left = dx < -24;
    i.down = dy > 24;
    i.up = dy < -24;
  }

  // ------------------------------------------------ 场景搭建

  private buildArena(): void {
    this.groundTile = this.add
      .tileSprite(ARENA.width / 2, ARENA.height / 2, ARENA.width, ARENA.height, 'ground_s1')
      .setDepth(-10);

    // 固定种子撒装饰：坟碑 / 孤松 / 石灯
    const rng = new Phaser.Math.RandomDataGenerator(['maoshan-decor']);
    const scatter = (key: string, count: number, scaleRange: [number, number]) => {
      for (let i = 0; i < count; i++) {
        const x = rng.between(60, ARENA.width - 60);
        const y = rng.between(60, ARENA.height - 60);
        this.add
          .image(x, y, key)
          .setScale(rng.realInRange(scaleRange[0], scaleRange[1]))
          .setAlpha(0.92)
          .setDepth(1 + y * 0.001)
          .setFlipX(rng.frac() > 0.5);
      }
    };
    scatter('decor_tombstone', 26, [0.85, 1.25]);
    scatter('decor_pine', 12, [0.9, 1.3]);
    scatter('decor_lantern', 12, [0.9, 1.1]);

    // 边界界碑
    for (let x = 120; x < ARENA.width; x += 260) {
      this.add.image(x, 16, 'decor_pillar').setDepth(2);
      this.add.image(x + 90, ARENA.height - 16, 'decor_pillar').setDepth(2 + ARENA.height * 0.001);
    }
    for (let y = 260; y < ARENA.height; y += 260) {
      this.add.image(16, y, 'decor_pillar').setDepth(2 + y * 0.001).setAngle(90);
      this.add.image(ARENA.width - 16, y + 90, 'decor_pillar').setDepth(2 + y * 0.001).setAngle(90);
    }

    // 边界描线
    this.add.graphics().setDepth(-5).lineStyle(6, 0x2a3328, 1).strokeRect(3, 3, ARENA.width - 6, ARENA.height - 6);
  }

  private buildEmitters(): void {
    this.burstEmitter = this.add.particles(0, 0, 'fx_dot', {
      speed: { min: 40, max: 150 },
      lifespan: 340,
      scale: { start: 1.1, end: 0 },
      quantity: 6,
      emitting: false,
      blendMode: 'ADD',
      tint: [0xffd88a, 0xe8e4d8, 0xa8d8b0],
    }).setDepth(20);

    this.smokeEmitter = this.add.particles(0, 0, 'fx_smoke', {
      speed: { min: 10, max: 50 },
      lifespan: 520,
      scale: { start: 0.9, end: 0.1 },
      alpha: { start: 0.7, end: 0 },
      quantity: 3,
      emitting: false,
    }).setDepth(19);
  }

  private burst(e: Enemy): void {
    this.burstEmitter.emitParticleAt(e.x, e.y, e.def.boss ? 26 : e.elite ? 12 : 6);
    this.smokeEmitter.emitParticleAt(e.x, e.y, e.def.boss ? 10 : 3);

    // 汲魂（术士杖专属）：被咒死的敌人，魂焰从尸体被抽向施术者——“吸取感”的核心画面
    if (this.world.hasSpecial('warlock_staff', 'siphon') && e.curseUntil > 0) {
      const p = this.world.player;
      for (let i = 0; i < 3; i++) {
        const wisp = this.add
          .image(e.x + Phaser.Math.Between(-8, 8), e.y + Phaser.Math.Between(-8, 8), 'proj_curse')
          .setScale(0.5)
          .setDepth(21)
          .setTint(0xc8a0ff);
        this.tweens.add({
          targets: wisp,
          x: p.x + Phaser.Math.Between(-10, 10),
          y: p.y + Phaser.Math.Between(-12, 4),
          scale: 0.2,
          alpha: 0.15,
          duration: 300 + i * 70,
          delay: i * 45,
          ease: 'Quad.easeIn',
          onComplete: () => wisp.destroy(),
        });
      }
    }
  }

  private endRun(victory: boolean): void {
    session.lastResult = { victory };
    session.lastMode = this.world.mode;
    this.time.delayedCall(victory ? 400 : 800, () => {
      if (!this.scene.isActive('Result')) this.scene.launch('Result');
    });
  }

  // ------------------------------------------------ 每帧

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 1 / 30);
    this.readInput();

    if (AUTOTEST) {
      // ?shopdoor：亮门时强制进冥品商店（截商店界面用）
      if (this.noAuto && this.world.state === 'DOORS' && this.shopForce) {
        this.world.chooseDoor('shop');
      }
    }
    if (AUTOTEST && !this.noAuto) {
      if (this.world.state === 'DOORS') {
        this.world.chooseDoor(this.world.pendingDoors[0]?.id ?? 'next');
      } else if (this.world.state === 'REWARD') {
        const opts = session.pendingOptions;
        this.world.applyUpgrade(opts[Math.floor(this.world.time * 7) % Math.max(opts.length, 1)] ?? { kind: 'heal' });
      } else if (this.world.state === 'PLAYING') {
        this.driveAuto(this.world.time);
      }
    }

    this.world.update(dt);
    this.syncAll();
    this.syncStageTheme();

    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) sfx.toggleMute();
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC) && this.world.state === 'PLAYING') {
      this.scene.launch('Pause');
      this.scene.pause();
    }
  }

  private readInput(): void {
    const k = this.keys;
    const i = this.world.input;
    i.up = k.W.isDown || k.UP.isDown;
    i.down = k.S.isDown || k.DOWN.isDown;
    i.left = k.A.isDown || k.LEFT.isDown;
    i.right = k.D.isDown || k.RIGHT.isDown;
  }

  // ------------------------------------------------ 实体同步（逻辑 → 画面）

  private obtainSprite(key: string, depth: number): Img {
    const img = this.spritePool.pop() ?? this.add.image(0, 0, key);
    img.setTexture(key).setVisible(true).setDepth(depth).clearTint().setAlpha(1).setScale(1).setRotation(0).setOrigin(0.5);
    return img;
  }

  private syncAll(): void {
    this.syncEnemies();
    this.syncPlayer();
    this.syncAllies();
    this.syncProjectiles();
    this.syncPickups();
    this.syncFloaters();
    this.syncWeaponVisuals();
    this.syncHazards();
  }

  /** 召唤物同步：对齐 world.allies（多退少补，走精灵池） */
  private syncAllies(): void {
    const allies = this.world.allies;
    while (this.allySprites.length > allies.length) {
      const img = this.allySprites.pop()!;
      img.setVisible(false);
      this.spritePool.push(img);
    }
    for (let i = 0; i < allies.length; i++) {
      const a = allies[i];
      const texture = a.kind === 'skelldog' ? 'pet_skelldog' : 'pet_hound';
      let img = this.allySprites[i];
      if (!img) {
        img = this.obtainSprite(texture, 11);
        this.allySprites[i] = img;
      }
      img.setTexture(texture).clearTint();
      img.setPosition(a.x, a.y - Math.abs(Math.sin(this.world.time * 10 + i)) * 2);
      img.setDepth(11);
      img.setFlipX(a.faceX < 0);
      img.setRotation(a.faceY * 0.15);
    }
  }

  private syncEnemies(): void {
    const enemies = this.world.enemies;
    while (this.enemySprites.length > enemies.length) {
      const img = this.enemySprites.pop()!;
      img.setVisible(false);
      this.spritePool.push(img);
    }
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      let img = this.enemySprites[i];
      if (!img) {
        img = this.obtainSprite(e.def.texture, 10 + e.y * 0.001);
        this.enemySprites[i] = img;
      }
      img.setTexture(e.def.texture);
      img.setPosition(e.x, e.y);
      img.setDepth(10 + e.y * 0.001);
      img.setScale(e.radius / e.def.radius);
      // 受击白闪 > 被咒紫罩（术士汲魂目标一眼可辨）> 减速冷色
      if (e.flash > 0) img.setTintFill(0xffffff);
      else if (e.curseUntil > this.world.time) img.setTint(0xb87ae8);
      else if (this.world.time < e.slowUntil) img.setTint(0x9fc8e8);
      else img.clearTint();
      // 小跳动作：蓄力/腾空用轻微缩放表达
      if (e.def.id === 'hopper' && e.ai.phase === 1) img.setScale(img.scaleX * 1.08, img.scaleY * 0.92);
    }
  }

  private syncPlayer(): void {
    const p = this.world.player;
    const moving = this.world.input.up || this.world.input.down || this.world.input.left || this.world.input.right;
    const bob = moving ? Math.abs(Math.sin(this.world.time * 11)) * 2.2 : 0;
    this.playerSprite.setPosition(p.x, p.y - bob);

    // 无敌帧闪烁
    this.playerSprite.setAlpha(p.invuln > 0 ? 0.45 + Math.sin(this.world.time * 42) * 0.25 : 1);

    // 脚下血条
    const g = this.playerHpGfx;
    g.clear();
    const ratio = Phaser.Math.Clamp(p.hp / p.stats.maxHp, 0, 1);
    const bw = 34;
    g.fillStyle(0x141a14, 0.85).fillRect(p.x - bw / 2 - 1, p.y + 22, bw + 2, 6);
    g.fillStyle(ratio > 0.5 ? 0x7fd88f : ratio > 0.25 ? 0xe8c33c : 0xd84a3a, 1)
      .fillRect(p.x - bw / 2, p.y + 23, bw * ratio, 4);
  }

  private syncProjectiles(): void {
    const projs = this.world.projectiles;
    while (this.projSprites.length > projs.length) {
      const img = this.projSprites.pop()!;
      img.setVisible(false);
      this.spritePool.push(img);
    }
    for (let i = 0; i < projs.length; i++) {
      const pr = projs[i];
      let img = this.projSprites[i];
      if (!img) {
        img = this.obtainSprite('proj_talisman', 16);
        this.projSprites[i] = img;
      }
      const key =
        pr.kind === 'talisman' ? 'proj_talisman'
        : pr.kind === 'coin' ? 'proj_coin'
        : pr.kind === 'fireball' ? 'proj_fireball'
        : pr.kind === 'fire' ? 'proj_fire'
        : pr.kind === 'wand' ? 'proj_wand'
        : pr.kind === 'curse' ? 'proj_curse'
        : 'proj_ink';
      img.setTexture(key);
      img.setPosition(pr.x, pr.y);
      img.setDepth(16);
      img.setRotation(pr.kind === 'ink' ? this.world.time * 9 + i : pr.rotation);
      if (pr.friendly) img.clearTint();
      else img.setTint(0xffb0a0);
    }
  }

  private syncPickups(): void {
    const pickups = this.world.pickups;
    while (this.pickupSprites.length > pickups.length) {
      const img = this.pickupSprites.pop()!;
      img.setVisible(false);
      this.spritePool.push(img);
    }
    for (let i = 0; i < pickups.length; i++) {
      const pk = pickups[i];
      let img = this.pickupSprites[i];
      if (!img) {
        img = this.obtainSprite('pickup_xp', 7);
        this.pickupSprites[i] = img;
      }
      if (pk.kind === 'treasure') {
        img.setTexture('pickup_treasure');
        img.setPosition(pk.x, pk.y + Math.sin(pk.t * 3 + i) * 2);
        img.setDepth(7);
        img.setScale(1.5);
      } else {
        img.setTexture(pk.kind === 'xp' ? 'pickup_xp' : pk.kind === 'heal' ? 'pickup_heal' : 'pickup_bomb');
        img.setPosition(pk.x, pk.y + Math.sin(pk.t * 3 + i) * 2);
        img.setDepth(7);
        if (pk.kind === 'xp' && pk.value >= 10) img.setScale(1.45); // 精英大魂魄
      }
    }
  }

  private syncFloaters(): void {
    const floaters = this.world.floaters;
    while (this.floaterTexts.length > floaters.length) {
      const t = this.floaterTexts.pop()!;
      t.setVisible(false);
      this.textPool.push(t);
    }
    for (let i = 0; i < floaters.length; i++) {
      const f = floaters[i];
      let t = this.floaterTexts[i];
      if (!t) {
        t = this.textPool.pop() ?? this.add.text(0, 0, '', {
          fontFamily: FONT, fontSize: '14px', color: '#ffe9b0', stroke: '#141a14', strokeThickness: 3,
        }).setOrigin(0.5);
        this.floaterTexts[i] = t;
      }
      t.setVisible(true);
      t.setText(String(f.amount));
      t.setPosition(f.x, f.y - f.t * 46);
      t.setDepth(40);
      t.setAlpha(1 - f.t / 0.7);
    }
  }

  /** 桃木剑环绕体：读取 slot.state（行为策略每帧写入） */
  private syncWeaponVisuals(): void {
    const p = this.world.player;
    const bladeSlots: { angle: number; radius: number; count: number }[] = [];

    for (const slot of p.weapons) {
      const s = computeWeaponStats(slot, p);
      if (slot.def.id === 'peach_sword') {
        bladeSlots.push({ angle: slot.state.angle, radius: slot.state.radius, count: s.amount });
      }
    }

    const bladeNeed = bladeSlots.reduce((sum, b) => sum + b.count, 0);
    while (this.orbitBlades.length > bladeNeed) {
      const img = this.orbitBlades.pop()!;
      img.setVisible(false);
      this.spritePool.push(img);
    }
    let bi = 0;
    for (const bs of bladeSlots) {
      for (let i = 0; i < bs.count; i++) {
        const a = bs.angle + (i * TAU) / bs.count;
        let img = this.orbitBlades[bi];
        if (!img) {
          img = this.obtainSprite('fx_sword', 14);
          this.orbitBlades[bi] = img;
        }
        img.setPosition(p.x + Math.cos(a) * bs.radius, p.y + Math.sin(a) * bs.radius);
        img.setRotation(a + Math.PI / 2); // 剑尖朝切线方向
        bi++;
      }
    }
  }

  private syncHazards(): void {
    const g = this.hazardGfx;
    g.clear();
    const strikes: Hazard[] = []; // 已落雷、需要画雷柱的
    const totems: Hazard[] = [];
    const rings: Hazard[] = [];
    const beams: Hazard[] = [];
    const sweeps: Hazard[] = [];
    const blizzards: Hazard[] = [];

    for (const h of this.world.hazards) {
      const life = 1 - h.t / h.dur;
      switch (h.kind) {
        case 'ring': {
          rings.push(h);
          g.lineStyle(6, h.color, Math.max(life, 0.15)).strokeCircle(h.x, h.y, h.r);
          g.lineStyle(2, 0xffffff, Math.max(life * 0.5, 0.08)).strokeCircle(h.x, h.y, Math.max(h.r - 6, 1));
          g.fillStyle(h.color, Math.max(life * 0.08, 0.02)).fillCircle(h.x, h.y, h.r);
          break;
        }
        case 'beam': {
          beams.push(h);
          g.save();
          g.translateCanvas(h.x, h.y);
          g.rotateCanvas(h.angle);
          const hw = h.width / 2;
          g.fillStyle(h.color, Math.max(life * 0.75, 0.2)).fillRect(0, -hw, h.maxR, hw * 2);
          g.fillStyle(0xffffff, Math.max(life * 0.6, 0.15)).fillRect(0, -hw * 0.4, h.maxR, hw * 0.8);
          g.restore();
          break;
        }
        case 'strike': {
          if (h.data === 0) {
            // 警示圈：外圈定界 + 内圈收缩读谱
            const k = h.t / h.dur;
            g.lineStyle(2.5, 0xffd84a, 0.9).strokeCircle(h.x, h.y, h.r);
            g.lineStyle(1.5, 0xd84a3a, 0.7).strokeCircle(h.x, h.y, h.r * (1 - k));
            g.fillStyle(0xffd84a, 0.1).fillCircle(h.x, h.y, h.r);
          } else {
            // 落雷闪燃 + 雷柱
            const flash = Math.max(1 - (h.t - (h.dur - 0.12)) / 0.12, 0);
            g.fillStyle(0xfff4c8, flash * 0.55).fillCircle(h.x, h.y, h.r);
            g.lineStyle(3, 0xffd84a, flash).strokeCircle(h.x, h.y, h.r * (0.6 + 0.4 * flash));
            strikes.push(h);
          }
          break;
        }
        case 'spiral': {
          const blades = Math.max(1, Math.round(h.data));
          for (let i = 0; i < blades; i++) {
            const pos = spiralBladePos(h, i);
            g.fillStyle(h.color, 0.9).fillCircle(pos.x, pos.y, 11);
            g.fillStyle(0x9fd8ff, 0.5).fillCircle(pos.x, pos.y, 5);
          }
          break;
        }
        case 'chain': {
          // 闪电链：折线主干 + 白芯，端点打光
          const pts = h.points ?? [];
          const life2 = Math.max(1 - h.t / h.dur, 0);
          if (pts.length >= 2) {
            for (let i = 0; i < pts.length - 1; i++) {
              const a = pts[i];
              const b = pts[i + 1];
              g.lineStyle(5, h.color, 0.85 * life2).lineBetween(a.x, a.y, b.x, b.y);
              g.lineStyle(2, 0xffffff, 0.9 * life2).lineBetween(a.x, a.y, b.x, b.y);
            }
            for (const pt of pts) {
              g.fillStyle(h.color, 0.55 * life2).fillCircle(pt.x, pt.y, 7);
            }
          }
          break;
        }
        case 'sweep': {
          sweeps.push(h);
          // 震地波：全周扩张环 + 放射裂纹（360° 震击）
          const life3 = Math.max(1 - h.t / h.dur, 0);
          const rr3 = h.r * (0.35 + 0.65 * (1 - life3));
          g.fillStyle(h.color, 0.22 * life3).fillCircle(h.x, h.y, rr3);
          g.lineStyle(3.5, h.color, 0.85 * life3).strokeCircle(h.x, h.y, rr3);
          g.lineStyle(1.5, 0xffffff, 0.55 * life3).strokeCircle(h.x, h.y, rr3 * 0.82);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU + 0.3;
            const r1 = rr3 * 0.4;
            const r2 = rr3 * 0.92;
            g.lineStyle(2, h.color, 0.5 * life3);
            g.lineBetween(h.x + Math.cos(a) * r1, h.y + Math.sin(a) * r1, h.x + Math.cos(a) * r2, h.y + Math.sin(a) * r2);
          }
          break;
        }
        case 'totem': {
          // 正式图腾精灵承载主体，Graphics 只保留范围反馈与瞬时电击。
          const pulse = 0.6 + Math.sin(this.world.time * 8) * 0.3;
          g.fillStyle(h.color, 0.25 * pulse).fillCircle(h.x, h.y, h.r + 4);
          totems.push(h);
          const pts = h.points;
          if (pts && pts.length >= 2) {
            g.lineStyle(2.5, 0x8fd3ff, 0.9).lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
            g.lineStyle(1, 0xffffff, 0.7).lineBetween(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
          }
          break;
        }
        case 'blizzard': {
          blizzards.push(h);
          // 暴风雪：冰蓝区域 + 环绕雪点
          g.fillStyle(0x9fd8ff, 0.14).fillCircle(h.x, h.y, h.r);
          g.lineStyle(2, 0xbfe8ff, 0.5).strokeCircle(h.x, h.y, h.r);
          for (let i = 0; i < 8; i++) {
            const a = this.world.time * 2.2 + (i * TAU) / 8;
            const rr2 = h.r * (0.35 + 0.55 * ((i % 4) / 4));
            g.fillStyle(0xe8f7ff, 0.75)
              .fillCircle(h.x + Math.cos(a) * rr2, h.y + Math.sin(a * 1.3) * rr2 * 0.8, 2.2);
          }
          break;
        }
        case 'aura':
          break;
      }
    }

    this.syncRitualArt('ring', rings, 'fx_soul_ring', (img, h, i) => {
      const life = Math.max(1 - h.t / h.dur, 0.12);
      img.setPosition(h.x, h.y).setDisplaySize(h.r * 2.08, h.r * 2.08)
        .setRotation(this.world.time * 0.35 + i * 0.4).setAlpha(life * 0.24);
    });
    this.syncRitualArt('beam', beams, 'fx_bagua_seal', (img, h) => {
      const life = Math.max(1 - h.t / h.dur, 0.18);
      img.setPosition(h.x, h.y).setScale(0.72 + life * 0.16)
        .setRotation(h.angle + this.world.time * 0.45).setAlpha(life * 0.8);
    });
    this.syncRitualArt('blizzard', blizzards, 'fx_blizzard_flake', (img, h, i) => {
      const life = Math.max(1 - h.t / h.dur, 0.2);
      const size = Math.min(h.r * 0.62, 86);
      img.setPosition(h.x, h.y).setDisplaySize(size, size)
        .setRotation(this.world.time * 0.55 + i).setAlpha(life * 0.68);
    });
    this.syncTotems(totems);
    this.syncBolts(strikes);
    this.drawAura();
  }

  /** 正式法阵贴图叠在判定图形上；对象池避免高频技能反复分配精灵。 */
  private syncRitualArt(
    kind: RitualKind,
    hazards: Hazard[],
    texture: string,
    configure: (image: Img, hazard: Hazard, index: number) => void,
  ): void {
    const sprites = this.ritualSprites[kind];
    while (sprites.length > hazards.length) {
      const img = sprites.pop()!;
      img.setVisible(false);
      this.spritePool.push(img);
    }
    for (let i = 0; i < hazards.length; i++) {
      let img = sprites[i];
      if (!img) {
        img = this.obtainSprite(texture, 7);
        sprites[i] = img;
      }
      img.setTexture(texture).setDepth(7).clearTint();
      configure(img, hazards[i], i);
    }
  }

  private syncTotems(totems: Hazard[]): void {
    while (this.totemSprites.length > totems.length) {
      const img = this.totemSprites.pop()!;
      img.setVisible(false);
      this.spritePool.push(img);
    }
    for (let i = 0; i < totems.length; i++) {
      const h = totems[i];
      let img = this.totemSprites[i];
      if (!img) {
        img = this.obtainSprite('summon_totem', 7);
        this.totemSprites[i] = img;
      }
      const pulse = 1 + Math.sin(this.world.time * 8 + i) * 0.035;
      img.setTexture('summon_totem').setPosition(h.x, h.y - 25).setScale(pulse).setAlpha(0.96);
    }
  }

  private syncBolts(strikes: Hazard[]): void {
    while (this.boltSprites.length > strikes.length) {
      const img = this.boltSprites.pop()!;
      img.setVisible(false);
      this.spritePool.push(img);
    }
    for (let i = 0; i < strikes.length; i++) {
      const h = strikes[i];
      let img = this.boltSprites[i];
      if (!img) {
        img = this.obtainSprite('fx_bolt', 8);
        img.setOrigin(0.5, 1);
        this.boltSprites[i] = img;
      }
      img.setPosition(h.x, h.y + 6);
      img.setAlpha(Math.random() * 0.3 + 0.7);
    }
  }

  /** 关卡主题：换境时改染色层，营造“从人间杀穿地府”的推进感 */
  private syncStageTheme(): void {
    if (this.world.stage === this.shownStage) return;
    this.shownStage = this.world.stage;
    if (this.world.stage < 1) return;
    const theme = stageTheme(this.world.stage);
    this.stageTintRect.fillColor = theme.tint;
    // 每境独立地面
    const groundIndex = ((this.world.stage - 1) % 6) + 1;
    this.groundTile.setTexture(`ground_s${groundIndex}`);
    this.cameras.main.flash(220, 30, 26, 40);
  }

  /** 糯米阵光环（必须在 hazardGfx.clear() 之后画） */
  private drawAura(): void {
    const p = this.world.player;
    for (const slot of p.weapons) {
      if (slot.def.id !== 'rice_ward') continue;
      const r = slot.state.radius;
      if (!r) continue;
      this.hazardGfx.fillStyle(0xe8e2c9, 0.06).fillCircle(p.x, p.y, r);
      this.hazardGfx.lineStyle(2, 0xe8e2c9, 0.28).strokeCircle(p.x, p.y, r);
      this.hazardGfx.lineStyle(1, 0xe8e2c9, 0.16).strokeCircle(p.x, p.y, r * 0.66);
    }
  }
}
