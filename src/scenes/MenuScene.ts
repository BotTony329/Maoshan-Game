import Phaser from 'phaser';
import { sfx } from '../render/sfx';
import { AUTOTEST } from '../render/autotest';
import { loadSave, openAccount } from '../game/save';
import { WEAPONS } from '../game/weapons/registry';

import { session } from '../game/session';
import { addFramedPanel, UI_FONT } from '../render/ui-theme';

type Mode = 'stages' | 'endless';

/**
 * 主菜单 —— 使用整幅手绘背景（标题/按钮/装饰全部在画里），
 * 代码只做两件事：把真实存据画进左上角账本、在画中按钮的位置铺透明点击区。
 * 背景图 1536×1024，cover 铺满 1280×720（上下裁切）。
 */
export class MenuScene extends Phaser.Scene {
  private bgImg!: Phaser.GameObjects.Image;
  private bgScale = 1;
  private bgOX = 0;
  private bgOY = 0;

  constructor() {
    super('Menu');
  }

  preload(): void {
    this.load.image('menu_bg', 'menu_bg.png');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0b0f0c');

    // cover 铺满
    this.bgImg = this.add.image(0, 0, 'menu_bg').setOrigin(0);
    this.bgScale = Math.max(width / this.bgImg.width, height / this.bgImg.height);
    this.bgImg.setScale(this.bgScale);
    // 顶对齐 + 轻微下沉：保住左上账本面板与最底一扇按钮（画面裁掉的是底部留白）
    this.bgOX = (width - this.bgImg.width * this.bgScale) / 2;
    this.bgOY = -16;
    this.bgImg.setPosition(this.bgOX, this.bgOY);

    const mx = (ix: number) => ix * this.bgScale + this.bgOX;
    const my = (iy: number) => iy * this.bgScale + this.bgOY;

    this.renderLedger(mx, my);

    // 画中四枚按钮 → 透明点击区（悬浮亮框反馈）
    const bx1 = mx(518);
    const bx2 = mx(1022);
    this.menuZone('《地府闯关》', bx1, my(488), bx2 - bx1, my(558) - my(488), () => this.startMode('stages'));
    this.menuZone('《无尽模式》', bx1, my(592), bx2 - bx1, my(662) - my(592), () => this.startMode('endless'));
    this.menuZone('《鬼市》', bx1, my(696), bx2 - bx1, my(766) - my(696), () => {
      sfx.resume();
      sfx.play('select');
      this.scene.start('Market');
    });
    this.menuZone('《天地银行》', bx1, my(800), bx2 - bx1, my(870) - my(800), () => {
      sfx.resume();
      sfx.play('select');
      this.scene.start('Bank');
    });

    // 右上角四枚功能小钮（装饰性，做了轻交互）
    const iconXs = [1180, 1276, 1372, 1468];
    const actions = [
      () => { const m = sfx.toggleMute(); this.toast(m ? '音效：关' : '音效：开'); },
      () => this.toast('战绩就在左上角账本里'),
      () => this.toast('WASD 移动 · 法器全自动 · ESC 暂停'),
      () => this.toast('网页版不用退出，放心玩'),
    ];
    iconXs.forEach((ix, i) => {
      const z = this.add.zone(mx(ix), my(30), 64 * this.bgScale, 66 * this.bgScale).setOrigin(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        sfx.resume();
        sfx.play('select');
        actions[i]();
      });
    });

    // 背包（配装入口）：左下角
    const bag = this.add.container(24, height - 62);
    const bbg = this.add.graphics();
    bbg.fillStyle(0x14100c, 0.92).fillRoundedRect(0, 0, 220, 40, 10);
    bbg.lineStyle(2, 0x8ac9a8, 0.9).strokeRoundedRect(0, 0, 220, 40, 10);
    const btx = this.add.text(110, 20, '🎒 背 包 · 配 装', {
      fontFamily: UI_FONT, fontSize: '17px', color: '#c8e8b8',
    }).setOrigin(0.5);
    bag.add([bbg, btx]);
    bag.setSize(220, 40);
    bag.setInteractive({ useHandCursor: true });
    bag.on('pointerover', () => this.tweens.add({ targets: bag, scale: 1.05, duration: 80 }));
    bag.on('pointerout', () => this.tweens.add({ targets: bag, scale: 1, duration: 80 }));
    bag.on('pointerdown', () => {
      sfx.resume();
      sfx.play('select');
      this.scene.start('Loadout');
    });

    this.add
      .text(width - 14, height - 10, 'v0.2', {
        fontFamily: UI_FONT, fontSize: '11px', color: '#667164',
      })
      .setOrigin(1, 1);

    // 无头冒烟测试：?market / ?bank 直达，否则默认闯幽冥（?mode=endless 可指定）
    if (AUTOTEST) {
      this.time.delayedCall(300, () => {
        const sp = new URLSearchParams(location.search);
        if (sp.has('market')) this.scene.start('Market');
        else if (sp.has('bank')) {
          openAccount();
          this.scene.start('Bank');
        } else if (sp.has('loadout')) {
          this.scene.start('Loadout');
        } else {
          this.startMode(sp.get('mode') === 'endless' ? 'endless' : 'stages');
        }
      });
    }
  }

  /** 左上角账本：风格贴齐画稿（深底+金色回纹框），数据实时读存档 */
  private renderLedger(mx: (n: number) => number, my: (n: number) => number): void {
    const save = loadSave();
    const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    const x1 = mx(24);
    const y1 = my(24);
    const w = mx(324) - x1;
    const h = my(214) - y1;

    addFramedPanel(this, { x: x1, y: y1, width: w, height: h, tone: 'gold', alpha: 0.985, radius: 9 });

    const row = (y: number, icon: string | null, text: string, color: string) => {
      const tx = this.add.text(x1 + 16, y, text, {
        fontFamily: UI_FONT, fontSize: '16px', color, stroke: '#0a0806', strokeThickness: 3,
      });
      if (icon) {
        const ic = this.add.image(x1 + 28, y + 10, icon).setScale(0.62);
        tx.setX(x1 + 52);
        void ic;
      }
    };
    const rowY = [y1 + 18, y1 + 61, y1 + 104];
    row(rowY[0], 'icon_gold', `铜钱 ${save.gold}`, '#ffd88a');
    row(rowY[1], 'icon_scripture', `闯关最佳 ${fmt(save.bestStageTime)}`, '#d8d0b8');
    row(rowY[2], 'icon_curse', `无尽最佳 ${fmt(save.bestEndlessTime)}`, '#d8d0b8');

    this.add
      .text(x1 + 18, y1 + h - 19, `当前武器  ·  ${WEAPONS[save.equippedWeapon]?.name ?? '符文'}`, {
        fontFamily: UI_FONT, fontSize: '12px', color: '#9fd88f', stroke: '#0a0806', strokeThickness: 3,
      });
  }

  /** 画中按钮的透明点击区：悬浮金框反馈 */
  private menuZone(label: string, x: number, y: number, w: number, h: number, onTap: () => void): void {
    const zone = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    const hl = this.add.graphics().setVisible(false);
    hl.lineStyle(3, 0xffe9a0, 0.9).strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, 14);
    zone.on('pointerover', () => {
      hl.setVisible(true);
      this.tweens.add({ targets: zone, scale: 1.0, duration: 60 });
      sfx.resume();
    });
    zone.on('pointerout', () => hl.setVisible(false));
    zone.on('pointerdown', () => {
      sfx.resume();
      sfx.play('select');
      onTap();
    });
    void label;
  }

  private toast(msg: string): void {
    const { width, height } = this.scale;
    const t = this.add
      .text(width / 2, height - 90, msg, {
        fontFamily: UI_FONT, fontSize: '18px', color: '#ffe9b0', stroke: '#0a0806', strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.time.delayedCall(1200, () => {
      this.tweens.add({ targets: t, alpha: 0, duration: 350, onComplete: () => t.destroy() });
    });
  }

  private startMode(mode: Mode): void {
    sfx.resume(); // 用户手势后才能出声
    sfx.play('select');
    session.pendingMode = mode;
    this.scene.start('Game');
  }
}
