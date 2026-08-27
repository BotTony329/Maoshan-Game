import Phaser from 'phaser';
import { session } from '../game/session';
import { PASSIVES } from '../data/passives';
import { stageTheme } from '../data/config';
import type { Player, WeaponSlot } from '../game/types';

type Txt = Phaser.GameObjects.Text;

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/** HUD 覆盖层：经验条 / 计时 / 击杀 / 血条 / 法器栏 / Boss 条 / 受击红晕 */
export class UIScene extends Phaser.Scene {
  private world = session.world;

  private xpFill!: Phaser.GameObjects.Rectangle;
  private levelText!: Txt;
  private timeText!: Txt;
  private killText!: Txt;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Txt;
  private buildRows!: Phaser.GameObjects.Container;
  private bossBar!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Rectangle;
  private bossName!: Txt;
  private banner!: Txt;
  private stageText!: Txt;
  private vignette!: Phaser.GameObjects.Rectangle;

  private lastBuildKey = '';
  private lastBossRef: unknown = null;

  constructor() {
    super('UI');
  }

  create(): void {
    const { width, height } = this.scale;

    // 顶部经验条
    this.add.rectangle(0, 0, width, 18, 0x141a14).setOrigin(0);
    this.xpFill = this.add.rectangle(0, 2, 0, 14, 0xe8c33c).setOrigin(0);
    this.levelText = this.add.text(12, 24, '', {
      fontFamily: FONT, fontSize: '17px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 4,
    });

    this.timeText = this.add
      .text(width / 2, 30, '00:00', {
        fontFamily: FONT, fontSize: '30px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 6,
      })
      .setOrigin(0.5, 0);
    this.stageText = this.add
      .text(width / 2, 64, '', {
        fontFamily: FONT, fontSize: '14px', color: '#d8c890', stroke: '#141a14', strokeThickness: 4,
      })
      .setOrigin(0.5, 0);

    this.killText = this.add
      .text(width - 14, 30, '', {
        fontFamily: FONT, fontSize: '20px', color: '#d8b0a0', stroke: '#141a14', strokeThickness: 4,
      })
      .setOrigin(1, 0);

    this.buildRows = this.add.container(0, 0);

    // 底部血条
    this.add.rectangle(width / 2, height - 34, 330, 26, 0x141a14, 0.85).setStrokeStyle(2, 0x3a443a);
    this.hpFill = this.add.rectangle(width / 2 - 161, height - 34, 318, 20, 0x7fd88f).setOrigin(0, 0.5);
    this.hpText = this.add
      .text(width / 2, height - 34, '', {
        fontFamily: FONT, fontSize: '15px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Boss 血条
    this.bossBar = this.add.container(width / 2, 92).setVisible(false);
    const bossBg = this.add.rectangle(0, 0, 560, 20, 0x141a14, 0.9).setStrokeStyle(2, 0x7a2430);
    this.bossFill = this.add.rectangle(-274, 0, 544, 14, 0xc23b3a).setOrigin(0, 0.5);
    this.bossName = this.add
      .text(0, -24, '', { fontFamily: FONT, fontSize: '17px', color: '#ffb0a0', stroke: '#141a14', strokeThickness: 4 })
      .setOrigin(0.5, 1);
    this.bossBar.add([bossBg, this.bossFill, this.bossName]);

    // Boss 现身横幅
    this.banner = this.add
      .text(width / 2, 210, '', {
        fontFamily: FONT, fontSize: '44px', color: '#ff8a7a', stroke: '#141a14', strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 受击红晕
    this.vignette = this.add.rectangle(width / 2, height / 2, width, height, 0xc23b2a, 0).setDepth(100);

    this.add
      .text(12, height - 12, 'WASD 移动 · M 静音 · ESC 暂停', {
        fontFamily: FONT, fontSize: '12px', color: '#6a7a66',
      })
      .setOrigin(0, 1);
  }

  update(): void {
    this.world = session.world;
    const p = this.world.player;

    const xpRatio = Phaser.Math.Clamp(p.xp / p.xpToNext, 0, 1);
    this.xpFill.width = (this.scale.width - 4) * xpRatio;
    this.levelText.setText(`${CLASS_NAMES[this.world.classId] ?? '茅山道士'} · 道 ${p.level} 重`);

    if (this.world.mode === 'stages') {
      const theme = stageTheme(this.world.stage);
      const goal = this.world.stageIsBoss ? 'Boss' : `${Math.min(this.world.stageKills, this.world.stageTarget)}/${this.world.stageTarget}`;
      this.timeText.setText(`斩杀 ${goal}`);
      this.stageText.setText(`第${this.world.stage}境 · ${theme.name}`);
      this.killText.setText(`诛邪 ${this.world.kills}`);
    } else {
      const total = Math.max(0, Math.floor(this.world.time));
      this.timeText.setText(`${pad(Math.floor(total / 60))}:${pad(total % 60)}`);
      this.stageText.setText('无尽尸潮');
      this.killText.setText(`诛邪 ${this.world.kills}`);
    }

    const ratio = Phaser.Math.Clamp(p.hp / p.stats.maxHp, 0, 1);
    this.hpFill.width = 318 * ratio;
    this.hpFill.fillColor = ratio > 0.5 ? 0x7fd88f : ratio > 0.25 ? 0xe8c33c : 0xd84a3a;
    this.hpText.setText(`${Math.ceil(p.hp)} / ${Math.round(p.stats.maxHp)}`);

    this.syncBuildRows(p);

    // Boss 条 + 横幅
    const boss = this.world.boss;
    if (boss && boss.active) {
      if (this.lastBossRef !== boss) {
        this.lastBossRef = boss;
        this.banner.setText(`${boss.def.name} · 现身`).setAlpha(0);
        this.tweens.add({ targets: this.banner, alpha: 1, duration: 250, yoyo: true, hold: 1200 });
        this.bossBar.setVisible(true);
      }
      this.bossFill.width = 544 * Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);
      this.bossName.setText(boss.def.name);
    } else {
      this.lastBossRef = null;
      this.bossBar.setVisible(false);
    }

    // 受击红晕（跟随无敌帧出现并淡出）
    const target = p.invuln > 0.3 ? 0.2 : 0;
    this.vignette.alpha += (target - this.vignette.alpha) * 0.2;
  }

  /**
   * 法器栏：第一行武器、第二行法宝。
   * 内容签名没变就不重建（文本对象创建较贵，不能每帧来）。
   */
  private syncBuildRows(p: Player): void {
    const key = [
      p.weapons.map((s) => `${s.def.id}:${s.level}`).join(','),
      [...p.passives].map(([id, lv]) => `${id}:${lv}`).join(','),
    ].join('|');
    if (key === this.lastBuildKey) return;
    this.lastBuildKey = key;

    this.buildRows.removeAll(true);

    const slotEntry = (x: number, y: number, icon: string, color: number, level: number) => {
      const bg = this.add.rectangle(x, y, 28, 28, 0x141a14, 0.85).setStrokeStyle(1.5, color, 0.9);
      const img = this.add.image(x, y, icon).setScale(0.78);
      const lv = this.add.text(x + 9, y + 9, String(level), {
        fontFamily: FONT, fontSize: '11px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 2,
      });
      this.buildRows.add([bg, img, lv]);
    };

    p.weapons.forEach((s: WeaponSlot, i: number) => {
      slotEntry(22 + i * 34, 58, s.def.texture, s.def.color, s.level);
    });

    let j = 0;
    for (const [passiveId, level] of p.passives) {
      const def = PASSIVES[passiveId];
      if (!def || j >= 6) break;
      slotEntry(22 + j * 34, 92, def.texture, def.color, level);
      j++;
    }
  }
}

const pad = (n: number): string => String(n).padStart(2, '0');

import { CLASSES } from '../data/classes';
const CLASS_NAMES: Record<string, string> = Object.fromEntries(
  Object.values(CLASSES).map((c) => [c.id, c.name]),
);
