import Phaser from 'phaser';
import { SHOP_ITEMS } from '../data/shop';
import { session } from '../game/session';
import { loadSave } from '../game/save';
import { sfx } from '../render/sfx';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/** 冥品商店 —— 门后的局内商店，冥币结算；离店即进入下一关 */
export class ShopScene extends Phaser.Scene {
  private mingbiText!: Phaser.GameObjects.Text;
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x08101a, 0.88);

    this.add
      .text(width / 2, 96, '—— 冥 品 商 店 ——', {
        fontFamily: FONT, fontSize: '38px', color: '#9fd8ff', stroke: '#0a0c12', strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 138, '地府银行分号。收冥币，不收铜钱——买点特殊货再上路。', {
        fontFamily: FONT, fontSize: '15px', color: '#6a7a96',
      })
      .setOrigin(0.5);

    this.mingbiText = this.add.text(width - 24, 96, '', {
      fontFamily: FONT, fontSize: '22px', color: '#9fd8ff', stroke: '#0a0c12', strokeThickness: 5,
    }).setOrigin(1, 0.5);

    const cw = 218;
    const ch = 250;
    const gap = 18;
    const startX = width / 2 - (cw * SHOP_ITEMS.length + gap * (SHOP_ITEMS.length - 1)) / 2;

    SHOP_ITEMS.forEach((item, i) => {
      const cx = startX + cw / 2 + i * (cw + gap);
      const cy = height / 2 + 30;
      const card = this.add.container(cx, cy);
      const bg = this.add.graphics();
      bg.fillStyle(0x101a24, 0.97).fillRoundedRect(-cw / 2, -ch / 2, cw, ch, 14);
      bg.lineStyle(3, item.color, 0.9).strokeRoundedRect(-cw / 2, -ch / 2, cw, ch, 14);

      const icon = this.add.image(0, -ch / 2 + 60, item.icon).setScale(2.2);
      const name = this.add.text(0, -ch / 2 + 118, item.name, {
        fontFamily: FONT, fontSize: '21px', color: '#f0e8d0', stroke: '#0a0c12', strokeThickness: 4,
      }).setOrigin(0.5);
      const desc = this.add.text(0, -ch / 2 + 146, item.desc, {
        fontFamily: FONT, fontSize: '14px', color: '#a8b8c8', align: 'center',
        wordWrap: { width: cw - 36 }, lineSpacing: 5,
      }).setOrigin(0.5, 0);
      const price = this.add.text(0, ch / 2 - 36, `${item.price} 冥币`, {
        fontFamily: FONT, fontSize: '18px', color: '#9fd8ff', stroke: '#0a0c12', strokeThickness: 4,
      }).setOrigin(0.5);
      const hint = this.add.text(0, ch / 2 - 12, '点击购买', {
        fontFamily: FONT, fontSize: '12px', color: '#5a6a7a',
      }).setOrigin(0.5);

      card.add([bg, icon, name, desc, price, hint]);
      card.setSize(cw, ch);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setScale(1.05));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerdown', () => this.tryBuy(item.id));

      card.setScale(0);
      this.tweens.add({ targets: card, scale: 1, duration: 190, delay: i * 80, ease: 'Back.easeOut' });
      this.cards.push(card);
    });

    this.refreshMingbi();

    const leave = this.add.text(width / 2, height - 52, '—— 离店，继续下行 ——', {
      fontFamily: FONT, fontSize: '22px', color: '#c8b8a0',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    leave.on('pointerover', () => leave.setColor('#ffe9b0'));
    leave.on('pointerout', () => leave.setColor('#c8b8a0'));
    leave.on('pointerdown', () => this.leave());
    this.input.keyboard?.once('keydown-ESC', () => this.leave());
  }

  private refreshMingbi(): void {
    this.mingbiText.setText(`冥币 ${loadSave().finance.mingbi}`);
  }

  private tryBuy(itemId: string): void {
    const err = session.world.buyShopItem(itemId);
    if (err) {
      sfx.play('hurt');
      this.mingbiText.setColor('#e86a5a');
      this.time.delayedCall(300, () => this.mingbiText.setColor('#9fd8ff'));
      return;
    }
    sfx.play('levelup');
    this.refreshMingbi();
  }

  private leave(): void {
    sfx.play('select');
    session.world.finishShop();
    this.scene.stop();
  }
}
