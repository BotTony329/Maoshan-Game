import Phaser from 'phaser';
import { session } from '../game/session';
import { sfx } from '../render/sfx';
import { stageTheme } from '../data/config';
import type { DoorId } from '../game/types';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/**
 * 亮门抉择 —— 风格猜谜：每扇门只有视觉语言，没有文字说明。
 * 石门=寻常路 / 挂灯青木=补给 / 爪痕黄门=小怪房 / 骷髅赤铁=Boss / 钱币蓝门=冥品商店。
 * 门后是什么，走了才知道。
 */
export class DoorScene extends Phaser.Scene {
  constructor() {
    super('Doors');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x060a08, 0.82);

    const theme = stageTheme(session.world.stage);
    this.add
      .text(width / 2, 120, `—— 第 ${session.world.stage} 境 · ${theme.name} 已清 ——`, {
        fontFamily: FONT, fontSize: '34px', color: '#e8d8a0', stroke: '#141a14', strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 166, '前路分岔。门后的东西，自己看。', {
        fontFamily: FONT, fontSize: '17px', color: '#8fa08a',
      })
      .setOrigin(0.5);

    const doors = session.world.pendingDoors;
    const dw = 150;
    const gap = 56;
    const startX = width / 2 - (dw * doors.length + gap * (doors.length - 1)) / 2;
    const cy = height / 2 + 60;

    doors.forEach((door, i) => {
      const cx = startX + dw / 2 + i * (dw + gap);
      // 门贴图即谜面：纹理键 = door_{门种}
      const card = this.add.container(cx, cy);
      const img = this.add.image(0, 0, `door_${door.id}`).setScale(1.25);
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.45).fillEllipse(0, 128, 110, 22);
      card.add([shadow, img]);
      card.setSize(dw, 220);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => {
        this.tweens.add({ targets: card, scale: 1.08, duration: 90 });
        img.setTint(0xfff2cc);
      });
      card.on('pointerout', () => {
        this.tweens.add({ targets: card, scale: 1, duration: 90 });
        img.clearTint();
      });
      card.on('pointerdown', () => this.choose(door.id));

      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, duration: 240, delay: i * 120, ease: 'Back.easeOut' });

      this.input.keyboard?.on('keydown-ONE', () => this.choose(doors[0]?.id));
      this.input.keyboard?.on('keydown-TWO', () => this.choose(doors[1]?.id));
      this.input.keyboard?.on('keydown-THREE', () => this.choose(doors[2]?.id));
    });
  }

  private choose(id?: DoorId): void {
    if (!id) return;
    sfx.play('select');
    session.world.chooseDoor(id);
    this.scene.stop(); // World 随后发 onReward / onShop，GameScene 会接手
  }
}
