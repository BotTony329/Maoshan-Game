import Phaser from 'phaser';
import { BASE_WEAPONS } from '../game/weapons/registry';
import { EQUIPMENT, EQUIP_CAP } from '../data/equipment';
import { MASKS, MASK_MAX_LEVEL, maskPrice } from '../data/masks';
import { GODSLAYER_PRICE } from '../data/finance';
import { buy, equipWeapon, toggleEquip, loadSave, buyLegendary, buyMask } from '../game/save';
import { sfx } from '../render/sfx';
import {
  addBackButton,
  addFramedPanel,
  addSceneTitle,
  addScreenBackdrop,
  UI_FONT as FONT,
  wrapChineseText,
} from '../render/ui-theme';

/**
 * 鬼市 —— 分页商店：
 * 闯关页「鬼面具」：闯幽冥专属人物强化，买了常驻生效；
 * 无尽页「主武器 + 宝珠」：配置出战流派。
 * 切页整页重建（scene.restart），状态全在存档里，零泄漏。
 */
export class GhostMarketScene extends Phaser.Scene {
  private tab: 'stages' | 'endless' = 'stages';
  private goldText!: Phaser.GameObjects.Text;

  constructor() {
    super('Market');
  }

  create(): void {
    const { width } = this.scale;
    // 无头冒烟：?tab=endless 直接落在武器库页
    if (new URLSearchParams(location.search).get('tab') === 'endless') this.tab = 'endless';
    addScreenBackdrop(this, 'purple');
    addSceneTitle(this, '鬼  市', '只卖修行路上得不着的东西', 'purple');
    addFramedPanel(this, { x: 48, y: 158, width: width - 96, height: 438, tone: 'purple', alpha: 0.72, radius: 14, depth: -1 });

    addFramedPanel(this, { x: width - 196, y: 18, width: 164, height: 46, tone: 'gold', alpha: 0.92, radius: 9 });
    this.goldText = this.add.text(width - 62, 36, '', {
      fontFamily: FONT, fontSize: '21px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 5,
    }).setOrigin(1, 0.5);
    this.add.image(width - 52, 36, 'icon_gold').setScale(0.8).setOrigin(1, 0.5);

    this.makeTab('闯关 · 鬼面具', width / 2 - 130, 'stages');
    this.makeTab('无尽 · 武器与宝珠', width / 2 + 130, 'endless');

    addBackButton(this, () => {
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
    this.add.text(72, 176, '【鬼面具】闯幽冥专属人物强化 —— 买下常驻生效，等级越高加成越猛', {
      fontFamily: FONT, fontSize: '16px', color: '#d8c890',
    });

    const cw = 182;
    const ch = 320;
    const gap = 12;
    const n = MASKS.length;
    const startX = width / 2 - (cw * n + gap * (n - 1)) / 2;

    MASKS.forEach((m, i) => {
      const lv = save.masks[m.id] ?? 0;
      const maxed = lv >= MASK_MAX_LEVEL;
      const cx = startX + cw / 2 + i * (cw + gap);
      const cy = 360;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(0x1c1520, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
      bg.lineStyle(2.5, m.color, 0.9).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);

      const icon = this.add.image(0, -ch / 2 + 72, m.icon).setScale(2.65);
      const name = this.add.text(0, -ch / 2 + 128, m.name, {
        fontFamily: FONT, fontSize: '19px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 4,
      }).setOrigin(0.5);
      const per = this.add.text(0, -ch / 2 + 152, m.perLevel, {
        fontFamily: FONT, fontSize: '14px', color: '#c8e8c0',
      }).setOrigin(0.5);
      const desc = this.add.text(0, 20, m.desc, {
        fontFamily: FONT, fontSize: '13px', color: '#a99bb0', align: 'center',
        wordWrap: { width: cw - 28 },
      }).setOrigin(0.5, 0);

      const pips = this.add.text(0, 92, '◆'.repeat(lv) + '◇'.repeat(MASK_MAX_LEVEL - lv), {
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

    });
  }

  // ------------------------------------------------ 无尽页：武器库 + 宝珠 + 传说

  private renderEndless(): void {
    const { width } = this.scale;
    this.renderLegendary(width);

    this.add.text(72, 210, '【武器库】装备主武器——决定你的流派与专属强化', {
      fontFamily: FONT, fontSize: '16px', color: '#d8c890',
    });
    this.renderArsenal();
    this.add.text(72, 412, '【装备】两模式通用（购买后回主界面·背包勾选携带）', {
      fontFamily: FONT, fontSize: '16px', color: '#d8c890',
    });
    this.renderEquipment();
  }

  private renderLegendary(width: number): void {
    const save = loadSave();
    const owned = save.legendary.includes('godslayer');
    const strip = this.add.container(width / 2, 176);
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

  private renderArsenal(): void {
    const save = loadSave();
    const { width } = this.scale;
    console.log('[arsenal] count =', BASE_WEAPONS.length, 'save.weapons =', JSON.stringify(save.weapons));
    const cw = 182;
    const ch = 176;
    const gap = 12;
    const n = BASE_WEAPONS.length;
    const startX = width / 2 - (cw * n + gap * (n - 1)) / 2;

    BASE_WEAPONS.forEach((def, i) => {
      const owned = def.price === 0 || save.weapons.includes(def.id);
      const active = save.equippedWeapon === def.id;
      const cx = startX + cw / 2 + i * (cw + gap);
      const cy = 310;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(active ? 0x22301c : 0x1c1520, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
      bg.lineStyle(active ? 3 : 2, active ? 0x9fd88f : def.color, active ? 1 : 0.9)
        .strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);

      const iconBg = this.add.rectangle(0, -47, 48, 48, 0x101612, 0.9).setStrokeStyle(1.5, def.color, 0.55);
      const icon = this.add.image(0, -47, def.texture).setScale(1.22);
      const name = this.add.text(0, -12, def.name, {
        fontFamily: FONT, fontSize: '17px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 4,
      }).setOrigin(0.5);
      const desc = this.add.text(0, 9, wrapChineseText(def.desc, 11), {
        fontFamily: FONT, fontSize: '12px', color: '#a89cb0', align: 'center',
        lineSpacing: 2,
      }).setOrigin(0.5, 0).setMaxLines(2);
      const status = this.add.text(0, ch / 2 - 18, '', {
        fontFamily: FONT, fontSize: '15px', stroke: '#141a14', strokeThickness: 4,
      }).setOrigin(0.5);

      if (!owned) {
        status.setText(`${def.price} 文 购买`).setColor('#ffd88a');
      } else if (active) {
        status.setText('✓ 已装备').setColor('#9fd88f');
      } else {
        status.setText('已拥有').setColor('#8a9a86');
      }

      card.add([bg, iconBg, icon, name, desc, status]);
      card.setSize(cw, ch);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setScale(1.03));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerdown', () => {
        if (owned) {
          sfx.play('hit');
          return;
        }
        if (buy('weapon', def.id, def.price ?? 0)) {
          sfx.play('levelup');
          equipWeapon(def.id); // 鬼市买下即入库；装备去主界面背包页
          this.refreshGold();
          this.scene.restart();
        } else {
          this.flashGold();
        }
      });

    });
  }

  private renderEquipment(): void {
    const save = loadSave();
    const { width } = this.scale;
    const cw = 194;
    const ch = 128;
    const gap = 12;
    const n = EQUIPMENT.length;
    const startX = width / 2 - (cw * n + gap * (n - 1)) / 2;

    EQUIPMENT.forEach((orb, i) => {
      const owned = save.equipment.includes(orb.id);
      const equipped = save.equipped.includes(orb.id);
      const cx = startX + cw / 2 + i * (cw + gap);
      const cy = 500;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(equipped ? 0x22301c : 0x1c1520, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);
      bg.lineStyle(equipped ? 3 : 2, equipped ? 0x9fd88f : orb.color, 1)
        .strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 12);

      const icon = this.add.image(-cw / 2 + 32, 0, orb.icon).setScale(1.6);
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
          if (buy('equip', orb.id, orb.price)) {
            sfx.play('levelup');
            toggleEquip(orb.id);
          } else {
            this.flashGold();
            return;
          }
        } else {
          sfx.play('select');
          toggleEquip(orb.id);
        }
        this.refreshGold();
        this.scene.restart();
      });

    });

    this.add.text(width - 72, 412, `已携带 ${save.equipped.length}/${EQUIP_CAP}`, {
      fontFamily: FONT, fontSize: '14px', color: '#9fd88f',
    }).setOrigin(1, 0);
  }
}
