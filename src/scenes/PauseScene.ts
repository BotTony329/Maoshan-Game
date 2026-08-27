import Phaser from 'phaser';
import { sfx } from '../render/sfx';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/** 暂停覆盖层：GameScene 自行 pause，本场景提供继续/重开/退出 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x060a08, 0.72);
    this.add
      .text(width / 2, height / 2 - 120, '暂 停', {
        fontFamily: FONT, fontSize: '52px', color: '#e8d8a0', stroke: '#141a14', strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.button('继 续 (ESC)', height / 2 - 20, () => {
      this.scene.resume('Game');
      this.scene.stop();
    });
    this.button('回 主菜单', height / 2 + 48, () => {
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.stop();
      this.scene.start('Menu');
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.resume('Game');
      this.scene.stop();
    });
  }

  private button(label: string, y: number, onTap: () => void): void {
    const txt = this.add
      .text(this.scale.width / 2, y, label, {
        fontFamily: FONT, fontSize: '24px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    txt.on('pointerover', () => txt.setColor('#ffd88a'));
    txt.on('pointerout', () => txt.setColor('#f0e8d0'));
    txt.on('pointerdown', () => {
      sfx.play('select');
      onTap();
    });
  }
}
