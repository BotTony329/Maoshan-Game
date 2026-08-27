import Phaser from 'phaser';
import { session } from '../game/session';
import { describeOption } from '../data/options';
import { sfx } from '../render/sfx';
import type { UpgradeOption } from '../game/types';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/** 关卡奖励三选一（V2 起升级不打断战斗，抉择只发生在过门之后） */
export class LevelUpScene extends Phaser.Scene {
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('LevelUp');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x060a08, 0.78);
    this.add
      .text(width / 2, 130, '—— 此 关 嘉 奖 ——', {
        fontFamily: FONT, fontSize: '38px', color: '#e8d8a0', stroke: '#141a14', strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 172, `深入第 ${session.world.stage} 境，择一而修（点击卡片或按 1 / 2 / 3）`, {
        fontFamily: FONT, fontSize: '16px', color: '#8fa08a',
      })
      .setOrigin(0.5);

    this.buildCards();

    this.input.keyboard?.on('keydown-ONE', () => this.choose(0));
    this.input.keyboard?.on('keydown-TWO', () => this.choose(1));
    this.input.keyboard?.on('keydown-THREE', () => this.choose(2));
  }

  private buildCards(): void {
    for (const card of this.cards) card.destroy();
    this.cards = [];

    const options = session.pendingOptions;
    const { width, height } = this.scale;
    const cw = 216;
    const ch = 300;
    const gap = 40;
    const startX = width / 2 - ((cw + gap) * (options.length - 1)) / 2;

    options.forEach((opt, i) => {
      const view = describeOption(opt);
      const cx = startX + i * (cw + gap);
      const cy = height / 2 + 40;

      const card = this.add.container(cx, cy);

      const bg = this.add.graphics();
      bg.fillStyle(0x161d18, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 14);
      bg.lineStyle(3, view.color, 0.95).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 14);

      const iconBg = this.add.rectangle(0, -ch / 2 + 74, 96, 96, 0x0e1410).setStrokeStyle(2, view.color, 0.6);
      const icon = this.add.image(0, -ch / 2 + 74, view.icon).setScale(2.4);

      const kind = this.add.text(0, -ch / 2 + 138, view.kindLabel, {
        fontFamily: FONT, fontSize: '15px', color: `#${view.color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);

      const title = this.add.text(0, -ch / 2 + 168, view.title, {
        fontFamily: FONT, fontSize: '24px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 4,
      }).setOrigin(0.5);

      const tag = view.tag
        ? this.add.text(cw / 2 - 14, -ch / 2 + 14, view.tag, {
            fontFamily: FONT, fontSize: '14px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 3,
          }).setOrigin(1, 0)
        : null;

      const desc = this.add.text(0, 24, view.desc, {
        fontFamily: FONT, fontSize: '15px', color: '#b8c0b0', align: 'center', wordWrap: { width: cw - 44 }, lineSpacing: 6,
      }).setOrigin(0.5, 0);

      const hotkey = this.add.text(0, ch / 2 - 20, String(i + 1), {
        fontFamily: FONT, fontSize: '14px', color: '#6a7a66',
      }).setOrigin(0.5);

      card.add([bg, iconBg, icon, kind, title, desc, hotkey]);
      if (tag) card.add(tag);

      card.setSize(cw, ch);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.05, duration: 90 }));
      card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 90 }));
      card.on('pointerdown', () => this.choose(i));

      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, duration: 200, delay: i * 90, ease: 'Back.easeOut' });

      this.cards.push(card);
    });
  }

  private choose(index: number): void {
    const options = session.pendingOptions;
    if (index < 0 || index >= options.length) return;
    const opt: UpgradeOption = options[index];
    sfx.play('select');
    session.world.applyUpgrade(opt);
    this.scene.stop();
  }
}
