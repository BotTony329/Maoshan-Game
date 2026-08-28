import Phaser from 'phaser';
import { session } from '../game/session';
import { PASSIVES } from '../data/passives';
import { stageTheme } from '../data/config';
import type { Player, WeaponSlot } from '../game/types';
import { addFramedPanel, UI_FONT } from '../render/ui-theme';

type Txt = Phaser.GameObjects.Text;

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
  private lootText!: Txt;
  private vignette!: Phaser.GameObjects.Rectangle;

  private lastBuildKey = '';
  private lastBossRef: unknown = null;

  constructor() {
    super('UI');
  }

  create(): void {
    const { width, height } = this.scale;

    addFramedPanel(this, { x: 8, y: 22, width: 232, height: 86, tone: 'gold', alpha: 0.82, radius: 8, depth: -1 });
    addFramedPanel(this, { x: width / 2 - 156, y: 22, width: 312, height: 72, tone: 'gold', alpha: 0.8, radius: 8, depth: -1 });
    addFramedPanel(this, { x: width - 164, y: 22, width: 156, height: 48, tone: 'red', alpha: 0.82, radius: 8, depth: -1 });

    // 顶部道行条保留通栏读数，但加双层边线避免融入深色地面。
    this.add.rectangle(0, 0, width, 18, 0x090c0b, 0.96).setOrigin(0);
    this.xpFill = this.add.rectangle(2, 3, 0, 12, 0xe8c33c).setOrigin(0);
    this.add.rectangle(width / 2, 9, width - 4, 14, 0x000000, 0).setStrokeStyle(1, 0xd8b74a, 0.52);
    this.levelText = this.add.text(16, 28, '', {
      fontFamily: UI_FONT, fontSize: '17px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 4,
    });

    this.timeText = this.add
      .text(width / 2, 30, '00:00', {
        fontFamily: UI_FONT, fontSize: '30px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 6,
      })
      .setOrigin(0.5, 0);
    this.stageText = this.add
      .text(width / 2, 64, '', {
        fontFamily: UI_FONT, fontSize: '14px', color: '#d8c890', stroke: '#141a14', strokeThickness: 4,
      })
      .setOrigin(0.5, 0);

    this.killText = this.add
      .text(width - 22, 33, '', {
        fontFamily: UI_FONT, fontSize: '18px', color: '#ffb0a0', stroke: '#141a14', strokeThickness: 4,
      })
      .setOrigin(1, 0);

    // 搜打撤：携带赃物（闯关模式显示）
    this.lootText = this.add
      .text(width - 22, 60, '', {
        fontFamily: UI_FONT, fontSize: '16px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 4,
      })
      .setOrigin(1, 0);

    this.buildRows = this.add.container(0, 0);

    addFramedPanel(this, { x: width / 2 - 194, y: height - 60, width: 388, height: 48, tone: 'jade', alpha: 0.9, radius: 10, depth: -1 });
    this.add.image(width / 2 - 169, height - 36, 'icon_heal').setScale(0.72);
    this.add.rectangle(width / 2 + 10, height - 36, 326, 24, 0x0b100d, 0.92).setStrokeStyle(2, 0x55705d);
    this.hpFill = this.add.rectangle(width / 2 - 151, height - 36, 318, 18, 0x7fd88f).setOrigin(0, 0.5);
    this.hpText = this.add
      .text(width / 2 + 10, height - 36, '', {
        fontFamily: UI_FONT, fontSize: '15px', color: '#f0e8d0', stroke: '#141a14', strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Boss 血条
    this.bossBar = this.add.container(width / 2, 92).setVisible(false);
    const bossBg = this.add.rectangle(0, 0, 560, 20, 0x141a14, 0.9).setStrokeStyle(2, 0x7a2430);
    this.bossFill = this.add.rectangle(-274, 0, 544, 14, 0xc23b3a).setOrigin(0, 0.5);
    this.bossName = this.add
      .text(0, -24, '', { fontFamily: UI_FONT, fontSize: '17px', color: '#ffb0a0', stroke: '#141a14', strokeThickness: 4 })
      .setOrigin(0.5, 1);
    this.bossBar.add([bossBg, this.bossFill, this.bossName]);

    // Boss 现身横幅
    this.banner = this.add
      .text(width / 2, 210, '', {
        fontFamily: UI_FONT, fontSize: '44px', color: '#ff8a7a', stroke: '#141a14', strokeThickness: 9,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // 受击红晕
    this.vignette = this.add.rectangle(width / 2, height / 2, width, height, 0xc23b2a, 0).setDepth(100);

    this.add
      .text(12, height - 12, 'WASD 移动 · M 静音 · ESC 暂停', {
        fontFamily: UI_FONT, fontSize: '12px', color: '#748073', stroke: '#0b0f0c', strokeThickness: 2,
      })
      .setOrigin(0, 1);
  }

  update(): void {
    this.world = session.world;
    const p = this.world.player;

    const xpRatio = Phaser.Math.Clamp(p.xp / p.xpToNext, 0, 1);
    this.xpFill.width = (this.scale.width - 4) * xpRatio;
    const weaponName = WEAPON_NAMES[p.weapons[0]?.def.id ?? 'rune'] ?? '符文';
    this.levelText.setText(weaponName + (this.world.mode === 'endless' ? ` · 道 ${p.level} 重` : ''));

    if (this.world.mode === 'stages') {
      const theme = stageTheme(this.world.stage);
      const goal = this.world.stageIsBoss ? 'Boss' : `${Math.min(this.world.stageKills, this.world.stageTarget)}/${this.world.stageTarget}`;
      this.timeText.setText(`斩杀 ${goal}`);
      this.stageText.setText(`第${this.world.stage}境 · ${theme.name}`);
      this.killText.setText(`诛邪 ${this.world.kills}`);
      this.lootText.setText(this.world.carryLoot > 0 ? `💰 携带 ${this.world.carryLoot} 文` : '');
    } else {
      this.lootText.setText('');
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
        fontFamily: UI_FONT, fontSize: '11px', color: '#ffd88a', stroke: '#141a14', strokeThickness: 2,
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

import { WEAPONS } from '../game/weapons/registry';
const WEAPON_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(WEAPONS).map(([id, d]) => [id, d.name]),
);
