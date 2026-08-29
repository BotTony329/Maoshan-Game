import Phaser from 'phaser';
import { BASE_WEAPONS } from '../game/weapons/registry';
import { EQUIPMENT, EQUIP_CAP } from '../data/equipment';
import { equipWeapon, toggleEquip, loadSave } from '../game/save';
import { sfx } from '../render/sfx';
import {
  addBackButton,
  addFramedPanel,
  addSceneTitle,
  addScreenBackdrop,
  UI_FONT as FONT,
} from '../render/ui-theme';

/**
 * 背包 —— 主界面的配装页（开局前选，进游戏锁定）。
 * 两模式共用此配置：主武器（择一）+ 装备（≤ EQUIP_CAP）。
 * 只管"配"；购买在鬼市。
 */
export class LoadoutScene extends Phaser.Scene {
  constructor() {
    super('Loadout');
  }

  create(): void {
    const { width } = this.scale;
    // 无头冒烟：?loadout 直达背包页（主菜单点「🎒 背包」同样进入）
    void new URLSearchParams(location.search);
    addScreenBackdrop(this, 'jade');
    addSceneTitle(this, '背  包', '开局前的行头配置——两个模式通用', 'jade');

    const save = loadSave();

    // 主武器（择一）
    addFramedPanel(this, { x: 48, y: 118, width: width - 96, height: 200, tone: 'gold', alpha: 0.8, radius: 14, depth: -1 });
    this.add.text(72, 134, '【主武器】择一装备', {
      fontFamily: FONT, fontSize: '16px', color: '#ffd88a',
    });
    const cw = 178;
    const gap = 12;
    const n = BASE_WEAPONS.length;
    const startX = width / 2 - (cw * n + gap * (n - 1)) / 2;
    BASE_WEAPONS.forEach((def, i) => {
      const owned = def.price === 0 || save.weapons.includes(def.id);
      const active = save.equippedWeapon === def.id;
      const cx = startX + cw / 2 + i * (cw + gap);
      const cy = 210;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(0x1c1a12, 0.97).fillRoundedRect(-cw / 2, -44, cw, 88, 12);
      bg.lineStyle(active ? 3 : 2, active ? 0x9fd88f : def.color, 0.95).strokeRoundedRect(-cw / 2, -44, cw, 88, 12);
      const icon = this.add.image(-cw / 2 + 30, 0, def.texture).setScale(1.15);
      const name = this.add.text(-cw / 2 + 52, -16, def.name, {
        fontFamily: FONT, fontSize: '17px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 3,
      });
      const status = this.add.text(-cw / 2 + 52, 10, !owned ? '未拥有' : active ? '✓ 已装备' : '点选装备', {
        fontFamily: FONT, fontSize: '12px',
        color: !owned ? '#8a7a6a' : active ? '#9fd88f' : '#8a9a86',
      });
      card.add([bg, icon, name, status]);
      card.setSize(cw, 88);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => owned && card.setScale(1.04));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerdown', () => {
        if (!owned) {
          sfx.play('hit');
          return;
        }
        sfx.play('select');
        equipWeapon(def.id);
        this.scene.restart();
      });
    });

    // 装备（≤3）
    addFramedPanel(this, { x: 48, y: 356, width: width - 96, height: 250, tone: 'purple', alpha: 0.72, radius: 14, depth: -1 });
    this.add.text(72, 372, `【装备】勾选携带（≤ ${EQUIP_CAP} 件，两模式通用）`, {
      fontFamily: FONT, fontSize: '16px', color: '#d8c890',
    });
    this.add.text(width - 72, 372, `已携带 ${save.equipped.length}/${EQUIP_CAP}`, {
      fontFamily: FONT, fontSize: '14px', color: '#9fd88f',
    }).setOrigin(1, 0);

    const eqOwned = EQUIPMENT.filter((e) => save.equipment.includes(e.id));
    const ecw = 194;
    const ech = 118;
    const egap = 12;
    const en = Math.max(eqOwned.length, 1);
    const eStartX = width / 2 - (ecw * en + egap * (en - 1)) / 2;

    if (eqOwned.length === 0) {
      this.add.text(width / 2, 452, '还没有装备——去鬼市置办吧', {
        fontFamily: FONT, fontSize: '15px', color: '#6a7a6a',
      }).setOrigin(0.5);
    }

    eqOwned.forEach((eq, i) => {
      const equipped = save.equipped.includes(eq.id);
      const cx = eStartX + ecw / 2 + i * (ecw + egap);
      const cy = 478;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(0x181420, 0.97).fillRoundedRect(-ecw / 2, -ech / 2, ecw, ech, 12);
      bg.lineStyle(equipped ? 3 : 2, equipped ? 0x9fd88f : eq.color, 1).strokeRoundedRect(-ecw / 2, -ech / 2, ecw, ech, 12);
      const icon = this.add.image(-ecw / 2 + 30, 0, eq.icon).setScale(1.25);
      const name = this.add.text(-ecw / 2 + 52, -14, eq.name, {
        fontFamily: FONT, fontSize: '16px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 3,
      });
      const desc = this.add.text(-ecw / 2 + 52, 8, eq.desc, {
        fontFamily: FONT, fontSize: '11px', color: '#a89cb0', wordWrap: { width: ecw - 66 }, lineSpacing: 2,
      });
      const tag = this.add.text(-ecw / 2 + 52, ech / 2 - 18, equipped ? '✓ 携带中' : '点选携带', {
        fontFamily: FONT, fontSize: '11px', color: equipped ? '#9fd88f' : '#7a8a76',
      });
      card.add([bg, icon, name, desc, tag]);
      card.setSize(ecw, ech);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setScale(1.03));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerdown', () => {
        sfx.play('select');
        toggleEquip(eq.id);
        this.scene.restart();
      });
    });

    addBackButton(this, () => {
      sfx.play('select');
      this.scene.start('Menu');
    });
  }
}
