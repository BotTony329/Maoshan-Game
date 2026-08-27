import Phaser from 'phaser';
import { CLASS_LIST } from '../data/classes';
import { ORB_LIST, ORB_CAP } from '../data/orbs';
import { MASKS, MASK_MAX_LEVEL, maskPrice } from '../data/masks';
import { GODSLAYER_PRICE } from '../data/finance';
import { buy, selectClass, toggleOrb, loadSave, buyLegendary, buyMask } from '../game/save';
import { sfx } from '../render/sfx';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/**
 * 鬼市 —— 分页商店：
 * 闯关页「鬼面具」：闯幽冥专属人物强化，买了常驻生效；
 * 无尽页「道途 + 宝珠」：原有正常商店。
 * 切页整页重建（scene.restart），状态全在存档里，零泄漏。
 */
export class GhostMarketScene extends Phaser.Scene {
  private tab: 'stages' | 'endless' = 'stages';
  private goldText!: Phaser.GameObjects.Text;

  constructor() {
    super('Market');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#120c16');

    this.add
      .text(width / 2, 40, '—— 鬼  市 ——', {
        fontFamily: FONT, fontSize: '36px', color: '#c8a0e8', stroke: '#141a14', strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 78, '卖的全是修行路上得不着的东西。', {
        fontFamily: FONT, fontSize: '13px', color: '#8a7a96',
      })
      .setOrigin(0.5);

    this.goldText = this.add.text(width - 62, 36, '', {
      fontFamily: FONT, fontSize: '21px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 5,
    }).setOrigin(1, 0.5);
    this.add.image(width - 52, 36, 'icon_gold').setScale(0.8).setOrigin(1, 0.5);

    this.makeTab('闯关 · 鬼面具', width / 2 - 130, 'stages');
    this.makeTab('无尽 · 道途与宝珠', width / 2 + 130, 'endless');

    const back = this.add.text(72, height - 36, '← 回主菜单', {
      fontFamily: FONT, fontSize: '18px', color: '#c8b8a0',
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffe9b0'));
    back.on('pointerout', () => back.setColor('#c8b8a0'));
    back.on('pointerdown', () => {
      sfx.play('select');
      this.scene.start('Menu');
    });

    this.refreshGold();
    if (this.tab === 'stages') this.renderMasks();
    else this.renderEndless();
  }

  private makeTab(label: string, x: number, target: 'stages' | 'endless'): void {
    const active = this.tab === target;
    const tb = this.add.container(x, 122);
    const tbg = this.add.graphics();
    tbg.fillStyle(active ? 0x3a2440 : 0x241a26, 0.96).fillRoundedRect(-112, -20, 224, 40, 10);
    tbg.lineStyle(active ? 2.5 : 1.5, active ? 0xc8a0e8 : 0x6a4a7a, 1).strokeRoundedRect(-112, -20, 224, 40, 10);
    const ttx = this.add.text(0, 0, label, {
      fontFamily: FONT, fontSize: '18px', color: active ? '#f0e0ff' : '#9a7aa8',
    }).setOrigin(0.5);
    tb.add([tbg, ttx]);
    tb.setSize(224, 40);
    tb.setInteractive({ useHandCursor: true });
    tb.on('pointerdown', () => {
      if (this.tab === target) return;
      sfx.play('select');
      this.tab = target;
      this.scene.restart();
    });
  }

  private refreshGold(): void {
    this.goldText.setText(`${loadSave().gold} 文`);
  }

  private flashGold(): void {
    this.tweens.add({ targets: this.goldText, x: '+=6', duration: 45, yoyo: true, repeat: 3 });
    sfx.play('hurt');
  }

  // ------------------------------------------------ 闯关页：鬼面具

  private renderMasks(): void {
    const { width } = this.scale;
    const save = loadSave();
    this.add.text(72, 168, '【鬼面具】闯幽冥专属人物强化 —— 买下常驻生效，等级越高加成越猛', {
      fontFamily: FONT, fontSize: '16px', color: '#d8c890',
    });

    const cw = 182;
    const ch = 240;
    const gap = 12;
    const n = MASKS.length;
    const startX = width / 2 - (cw * n + gap * (n - 1)) / 2;

    MASKS.forEach((m, i) => {
      const lv = save.masks[m.id] ?? 0;
      const maxed = lv >= MASK_MAX_LEVEL;
      const cx = startX + cw / 2 + i * (cw + gap);
      const cy = 300;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(0x1c1520, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
      bg.lineStyle(2.5, m.color, 0.9).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);

      const icon = this.add.image(0, -ch / 2 + 58, m.icon).setScale(2.2);
      const name = this.add.text(0, -ch / 2 + 104, m.name, {
        fontFamily: FONT, fontSize: '19px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 4,
      }).setOrigin(0.5);
      const per = this.add.text(0, -ch / 2 + 126, m.perLevel, {
        fontFamily: FONT, fontSize: '14px', color: '#c8e8c0',
      }).setOrigin(0.5);
      const desc = this.add.text(0, 30, m.desc, {
        fontFamily: FONT, fontSize: '12px', color: '#8a7a96', align: 'center',
        wordWrap: { width: cw - 28 },
      }).setOrigin(0.5, 0);

      const pips = this.add.text(0, 72, '◆'.repeat(lv) + '◇'.repeat(MASK_MAX_LEVEL - lv), {
        fontFamily: FONT, fontSize: '13px', color: '#c8a0e8',
      }).setOrigin(0.5);

      const status = this.add.text(0, ch / 2 - 26, maxed ? '已圆满' : `${maskPrice(lv + 1)} 文 · 升至 Lv${lv + 1}`, {
        fontFamily: FONT, fontSize: maxed ? '16px' : '15px',
        color: maxed ? '#9fd88f' : '#ffd88a', stroke: '#141a14', strokeThickness: 3,
      }).setOrigin(0.5);

      card.add([bg, icon, name, per, desc, pips, status]);
      card.setSize(cw, ch);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setScale(1.04));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerdown', () => {
        if (maxed) {
          sfx.play('hit');
          return;
        }
        if (buyMask(m.id)) {
          sfx.play('levelup');
          this.refreshGold();
          this.scene.restart();
        } else {
          this.flashGold();
        }
      });

      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, duration: 170, delay: i * 60, ease: 'Back.easeOut' });
    });
  }

  // ------------------------------------------------ 无尽页：道途 + 宝珠 + 传说

  private renderEndless(): void {
    const { width } = this.scale;
    this.renderLegendary(width);

    this.add.text(72, 168, '【道途】择一入世', {
      fontFamily: FONT, fontSize: '16px', color: '#d8c890',
    });
    this.renderClasses();
    this.add.text(72, 352, `【宝珠】携带 ≤ ${ORB_CAP} 颗（点击勾选/取消）`, {
      fontFamily: FONT, fontSize: '16px', color: '#d8c890',
    });
    this.renderOrbs();
  }

  private renderLegendary(width: number): void {
    const save = loadSave();
    const owned = save.legendary.includes('godslayer');
    const strip = this.add.container(width / 2, 116);
    const bg = this.add.graphics();
    bg.fillStyle(0x2a2010, 0.95).fillRoundedRect(-560, -16, 1120, 32, 8);
    bg.lineStyle(1.5, 0xffd24a, owned ? 0.9 : 0.55).strokeRoundedRect(-560, -16, 1120, 32, 8);
    const icon = this.add.image(-540, 0, 'icon_godslayer').setScale(0.85);
    const text = this.add.text(-516, 0, owned
      ? '传说 · 弑神枪已入手 —— 出场自带，荡涤满屏'
      : `传说 · 弑神枪「枪出荡涤满屏」—— 标价 ${GODSLAYER_PRICE.toLocaleString()} 文（冥币换不来，得靠钱生钱）`, {
      fontFamily: FONT, fontSize: '13px', color: owned ? '#ffe9a0' : '#c9a85c',
    });
    strip.add([bg, icon, text]);
    if (!owned) {
      strip.setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-560, -16, 1120, 32), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
      strip.on('pointerdown', () => {
        if (buyLegendary('godslayer', GODSLAYER_PRICE)) {
          sfx.play('victory');
          this.scene.restart();
        } else {
          this.flashGold();
        }
      });
    }
  }

  private renderClasses(): void {
    const save = loadSave();
    const { width } = this.scale;
    const cw = 218;
    const ch = 168;
    const gap = 14;
    const n = CLASS_LIST.length;
    const startX = width / 2 - (cw * n + gap * (n - 1)) / 2;

    CLASS_LIST.forEach((cls, i) => {
      const owned = cls.price === 0 || save.classes.includes(cls.id);
      const active = save.activeClass === cls.id;
      const cx = startX + cw / 2 + i * (cw + gap);
      const cy = 268;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(active ? 0x22301c : 0x1c1520, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
      bg.lineStyle(active ? 3 : 2, active ? 0x9fd88f : cls.color, active ? 1 : 0.9)
        .strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);

      const portrait = this.add.image(-cw / 2 + 40, -16, cls.texture).setScale(1.15);
      const name = this.add.text(-cw / 2 + 74, -ch / 2 + 22, cls.name, {
        fontFamily: FONT, fontSize: '20px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 4,
      });
      const title = this.add.text(-cw / 2 + 74, -ch / 2 + 48, cls.title, {
        fontFamily: FONT, fontSize: '12px', color: '#a89cb0', wordWrap: { width: cw - 90 },
      });
      const trait = this.add.text(-cw / 2 + 14, 16, cls.trait, {
        fontFamily: FONT, fontSize: '13px', color: '#c8e8c0', wordWrap: { width: cw - 28 }, lineSpacing: 4,
      });
      const status = this.add.text(0, ch / 2 - 18, '', {
        fontFamily: FONT, fontSize: '16px', stroke: '#141a14', strokeThickness: 4,
      }).setOrigin(0.5);

      if (!owned) {
        status.setText(`${cls.price} 文 购买`).setColor('#ffd88a');
      } else if (active) {
        status.setText('✓ 此身入世').setColor('#9fd88f');
      } else {
        status.setText('点选启用').setColor('#8a9a86');
      }

      card.add([bg, portrait, name, title, trait, status]);
      card.setSize(cw, ch);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setScale(1.03));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerdown', () => {
        if (!owned) {
          if (buy('class', cls.id, cls.price)) {
            sfx.play('levelup');
            selectClass(cls.id);
          } else {
            this.flashGold();
            return;
          }
        } else {
          sfx.play('select');
          selectClass(cls.id);
        }
        this.refreshGold();
        this.scene.restart();
      });

      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, duration: 170, delay: i * 60, ease: 'Back.easeOut' });
    });
  }

  private renderOrbs(): void {
    const save = loadSave();
    const { width } = this.scale;
    const cw = 218;
    const ch = 128;
    const gap = 14;
    const n = ORB_LIST.length;
    const startX = width / 2 - (cw * n + gap * (n - 1)) / 2;

    ORB_LIST.forEach((orb, i) => {
      const owned = save.orbs.includes(orb.id);
      const equipped = save.equippedOrbs.includes(orb.id);
      const cx = startX + cw / 2 + i * (cw + gap);
      const cy = 462;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(equipped ? 0x22301c : 0x1c1520, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
      bg.lineStyle(equipped ? 3 : 2, equipped ? 0x9fd88f : orb.color, 1)
        .strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);

      const icon = this.add.image(-cw / 2 + 32, 0, orb.texture).setScale(1.6);
      const name = this.add.text(-cw / 2 + 58, -ch / 2 + 16, orb.name, {
        fontFamily: FONT, fontSize: '18px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 4,
      });
      const desc = this.add.text(-cw / 2 + 58, -ch / 2 + 42, orb.desc, {
        fontFamily: FONT, fontSize: '12px', color: '#a89cb0', wordWrap: { width: cw - 74 }, lineSpacing: 3,
      });

      const status = owned
        ? this.add.text(0, ch / 2 - 16, equipped ? '✓ 携带中' : '点选携带', {
            fontFamily: FONT, fontSize: '14px', color: equipped ? '#9fd88f' : '#8a9a86',
          }).setOrigin(0.5)
        : this.add.text(0, ch / 2 - 16, `${orb.price} 文 购买`, {
            fontFamily: FONT, fontSize: '15px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 4,
          }).setOrigin(0.5);

      card.add([bg, icon, name, desc, status]);
      card.setSize(cw, ch);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setScale(1.03));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerdown', () => {
        if (!owned) {
          if (buy('orb', orb.id, orb.price)) {
            sfx.play('levelup');
            toggleOrb(orb.id);
          } else {
            this.flashGold();
            return;
          }
        } else {
          sfx.play('select');
          toggleOrb(orb.id);
        }
        this.refreshGold();
        this.scene.restart();
      });

      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, duration: 170, delay: 200 + i * 60, ease: 'Back.easeOut' });
    });

    this.add.text(width - 72, 352, `已携带 ${save.equippedOrbs.length}/${ORB_CAP}`, {
      fontFamily: FONT, fontSize: '14px', color: '#9fd88f',
    }).setOrigin(1, 0);
  }
}
