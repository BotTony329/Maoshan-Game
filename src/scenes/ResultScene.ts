import Phaser from 'phaser';
import { Rng } from '../core/math';
import { session } from '../game/session';
import { sfx } from '../render/sfx';
import { addGold, loadSave, recordRun, financeTick } from '../game/save';
import { goldForRun } from '../data/config';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/**
 * 结算覆盖层 —— 搜打撤规则：
 * 撤离成功 = 基础 + 深度 + 门奖金 + 携带赃物 全额入账；
 * 死亡 = 只有基础奖励（携带赃物与奖金尽失）。
 */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(): void {
    const { width, height } = this.scale;
    const victory = session.lastResult.victory;
    const mode = session.lastMode;
    const world = session.world;

    // 结算参数：闯幽冥看是否成功撤离；无尽只有死亡结算
    const extracted = victory && mode === 'stages';
    const greedMult = 1 + 0.15 * (loadSave().masks.greed ?? 0);

    // 铜钱入账 + 金融世界推进（行情/理财/汇率）
    let earned = goldForRun({
      kills: world.kills,
      level: world.player.level,
      mode,
      progress: mode === 'stages' ? world.stage : world.time,
      bonusGold: world.bonusGold,
      carryLoot: world.carryLoot,
      extracted,
    });
    if (mode === 'stages') earned = Math.round(earned * greedMult);
    if (loadSave().equipped.includes('basin')) earned = Math.round(earned * 1.2);
    addGold(earned);
    recordRun(mode, world.time);
    financeTick(new Rng(Date.now() % 2147483647));
    const goldNow = loadSave().gold;

    this.add.rectangle(width / 2, height / 2, width, height, extracted ? 0x0c1a12 : victory ? 0x1a1a0c : 0x0c0a0a, 0.86);

    const title = extracted ? '撤 离 成 功' : victory ? '天 亮 了' : '道 消 身 殒';
    const subtitle = extracted
      ? '活着出去了 —— 赃物与奖金，一分不少'
      : victory
        ? '百邪退散，晨钟响起 —— 此局功德圆满'
        : mode === 'endless'
          ? '尸潮不息，你已走得够远 —— 再探一程？'
          : '携带的赃物尽失 —— 下次，记得撤';
    const color = extracted || victory ? '#ffe9a0' : '#d88a7a';

    this.add
      .text(width / 2, 150, title, {
        fontFamily: FONT, fontSize: '56px', color, stroke: '#141a14', strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 204, subtitle, { fontFamily: FONT, fontSize: '18px', color: '#a8b0a0' })
      .setOrigin(0.5);

    const total = Math.max(0, Math.floor(world.time));
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    const stats: [string, string, string][] = [
      ['存活', `${mm}:${ss}`, '#f0e8d0'],
      ['诛邪', `${world.kills}`, '#f0e8d0'],
      ['道行', `${world.player.level} 重`, '#f0e8d0'],
      ['造伤', `${Math.round(world.damageDealt).toLocaleString()}`, '#f0e8d0'],
      [
        '赃物',
        world.carryLoot > 0
          ? extracted
            ? `${world.carryLoot} 文 · 已入账`
            : `${world.carryLoot} 文 · 尽失`
          : '—',
        extracted ? '#ffd88a' : '#8a7a6a',
      ],
    ];
    stats.forEach(([k, v, c], i) => {
      const y = 264 + i * 38;
      this.add.text(width / 2 - 110, y, k, { fontFamily: FONT, fontSize: '18px', color: '#8fa08a' }).setOrigin(0, 0.5);
      this.add.text(width / 2 + 110, y, v, { fontFamily: FONT, fontSize: '20px', color: c }).setOrigin(1, 0.5);
    });

    // 铜钱入账
    this.add.image(width / 2 - 8, 466, 'icon_gold').setScale(1.1);
    const goldLine = this.add.text(width / 2 + 12, 466, `入账 ${earned} 文 · 身上共 ${goldNow} 文`, {
      fontFamily: FONT, fontSize: '20px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 4,
    }).setOrigin(0, 0.5);
    goldLine.setAlpha(0);
    this.tweens.add({ targets: goldLine, alpha: 1, duration: 400, delay: 350 });

    const label = mode === 'stages' ? '再 闯 一 轮' : '再 入 尸 潮';
    this.makeButton(label, width / 2, 534, () => {
      sfx.play('select');
      session.pendingMode = mode;
      this.scene.stop();
    });
    this.makeButton('逛 逛 鬼 市', width / 2, 600, () => {
      sfx.play('select');
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.stop();
      this.scene.start('Market');
    });
    this.makeButton('回 到 主 菜 单', width / 2, 666, () => {
      sfx.play('select');
      this.scene.stop('Game');
      this.scene.stop('UI');
      this.scene.stop();
      this.scene.start('Menu');
    });
  }

  private makeButton(label: string, x: number, y: number, onTap: () => void): void {
    const c = this.add.container(x, y);
    const w = 280;
    const h = 50;
    const bg = this.add.graphics();
    bg.fillStyle(0x1c241c, 0.95).fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(2, 0xe8c33c, 0.8).strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    const txt = this.add.text(0, 0, label, {
      fontFamily: FONT, fontSize: '21px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 4,
    }).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.06, duration: 80 }));
    c.on('pointerout', () => this.tweens.add({ targets: c, scale: 1, duration: 80 }));
    c.on('pointerdown', onTap);
  }
}
