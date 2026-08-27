import Phaser from 'phaser';
import { FX, STOCKS, WEALTH_PRODUCTS, GODSLAYER_PRICE } from '../data/finance';
import {
  loadSave, openAccount, exchangeToMingbi, exchangeToCopper,
  buyStock, sellStock, buyWealth, financeTick,
} from '../game/save';
import { Rng } from '../core/math';
import { sfx } from '../render/sfx';

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

/**
 * 地府银行 —— 冥币金融系统主界面。
 * 冥币买不了任何东西：只能炒地府A股、买理财；挣了按当局汇率换回铜钱去鬼市。
 */
export class BankScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private mingbiText!: Phaser.GameObjects.Text;
  private rateText!: Phaser.GameObjects.Text;
  private reportText!: Phaser.GameObjects.Text;
  private holdingTexts: Record<string, Phaser.GameObjects.Text> = {};
  private priceTexts: Record<string, Phaser.GameObjects.Text> = {};
  private deltaTexts: Record<string, Phaser.GameObjects.Text> = {};

  constructor() {
    super('Bank');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#0e1016');

    this.add
      .text(width / 2, 34, '—— 天 地 银 行 ——', {
        fontFamily: FONT, fontSize: '32px', color: '#a8c8e8', stroke: '#0a0c12', strokeThickness: 7,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 66, '冥不通商，唯通财。攒冥币、炒阴股、放贷款——总有一天换得动那杆弑神枪。', {
        fontFamily: FONT, fontSize: '12px', color: '#6a7a96',
      })
      .setOrigin(0.5);

    // 账户栏
    const save = loadSave();
    if (!save.finance.accountOpen) {
      this.renderOpenAccount();
      return;
    }
    this.renderAccount();

    // 返回
    const back = this.add.text(72, height - 36, '← 回主菜单', {
      fontFamily: FONT, fontSize: '18px', color: '#c8b8a0',
    }).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffe9b0'));
    back.on('pointerout', () => back.setColor('#c8b8a0'));
    back.on('pointerdown', () => {
      sfx.play('select');
      this.scene.start('Menu');
    });
  }

  // ------------------------------------------------ 开户引导

  private renderOpenAccount(): void {
    const { width } = this.scale;
    this.add
      .text(width / 2, 220, '孟婆柜台：客官，开户吗？', {
        fontFamily: FONT, fontSize: '26px', color: '#e8d8a0',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 290, `开户即送 ${FX.signupBonus} 冥币开场。冥币虽买不了货，却能生钱。`, {
        fontFamily: FONT, fontSize: '15px', color: '#8a9ab0',
      })
      .setOrigin(0.5);

    const btn = this.add.container(width / 2, 380);
    const bg = this.add.graphics();
    bg.fillStyle(0x1a2430, 0.96).fillRoundedRect(-150, -30, 300, 60, 12);
    bg.lineStyle(2, 0xa8c8e8, 0.9).strokeRoundedRect(-150, -30, 300, 60, 12);
    const txt = this.add.text(0, 0, '开 户（送 100 冥币）', {
      fontFamily: FONT, fontSize: '22px', color: '#f0e8d0',
    }).setOrigin(0.5);
    btn.add([bg, txt]);
    // 容器必须先有尺寸才有碰撞区——漏了就是“点了没反应”
    btn.setSize(300, 60);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1));
    btn.on('pointerdown', () => {
      openAccount();
      sfx.play('levelup');
      this.scene.restart();
    });

    // 开户页也要能反悔离开，别把玩家困在柜台前
    const back = this.add.text(width / 2, 480, '← 回主菜单', {
      fontFamily: FONT, fontSize: '18px', color: '#c8b8a0',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerover', () => back.setColor('#ffe9b0'));
    back.on('pointerout', () => back.setColor('#c8b8a0'));
    back.on('pointerdown', () => {
      sfx.play('select');
      this.scene.start('Menu');
    });
  }

  // ------------------------------------------------ 主界面

  private renderAccount(): void {
    const { width } = this.scale;

    this.goldText = this.add.text(width - 24, 34, '', {
      fontFamily: FONT, fontSize: '19px', color: '#ffd88a', stroke: '#0a0c12', strokeThickness: 4,
    }).setOrigin(1, 0.5);
    this.mingbiText = this.add.text(width - 24, 62, '', {
      fontFamily: FONT, fontSize: '19px', color: '#9fd8ff', stroke: '#0a0c12', strokeThickness: 4,
    }).setOrigin(1, 0.5);
    this.rateText = this.add.text(width - 24, 90, '', {
      fontFamily: FONT, fontSize: '14px', color: '#8a9ab0',
    }).setOrigin(1, 0.5);

    // 兑换按钮
    this.bankButton('换 500 文入冥', width / 2 - 260, 96, () => {
      const got = exchangeToMingbi(500);
      if (got > 0) sfx.play('pickup');
      this.refreshAll();
    });
    this.bankButton('冥币 50 换铜钱', width / 2 - 60, 96, () => {
      const got = exchangeToCopper(50);
      if (got > 0) sfx.play('pickup');
      this.refreshAll();
    });
    this.bankButton('推进行情（模拟过一局）', width / 2 + 200, 96, () => {
      const report = financeTick(new Rng(Date.now() % 2147483647));
      if (report.length > 0) sfx.play('levelup');
      this.refreshAll();
    });

    // A股行情表
    this.add.text(72, 134, '【地府 A 股】（冥币计价，局间波动）', {
      fontFamily: FONT, fontSize: '15px', color: '#a8c8e8',
    });
    STOCKS.forEach((s, i) => this.renderStockRow(s.id, s.name, 164 + i * 52));

    // 理财
    this.add.text(72, 390, '【地府理财】（冥币存本，局期到期结算）', {
      fontFamily: FONT, fontSize: '15px', color: '#c8e8b0',
    });
    WEALTH_PRODUCTS.forEach((p, i) => this.renderWealthRow(p.id, 420 + i * 48));

    // 传说武器预告
    this.add.text(72, 570, '【传说】', {
      fontFamily: FONT, fontSize: '15px', color: '#ffd24a',
    });
    const legendaryOwned = loadSave().legendary.includes('godslayer');
    this.add.text(140, 570, legendaryOwned
      ? '弑神枪已在你手——去鬼市装备它，荡涤满屏吧。'
      : `弑神枪 · 荡涤满屏 —— 鬼市传说位标价 ${GODSLAYER_PRICE.toLocaleString()} 文。存钱吧，客官。`, {
      fontFamily: FONT, fontSize: '15px', color: '#ffd88a',
    });

    // 财经快报
    this.reportText = this.add.text(72, 610, '', {
      fontFamily: FONT, fontSize: '13px', color: '#8a9ab0', lineSpacing: 4,
    });

    this.refreshAll();
  }

  private bankButton(label: string, x: number, y: number, onTap: () => void): void {
    const c = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x18202c, 0.96).fillRoundedRect(-95, -18, 190, 36, 8);
    bg.lineStyle(1.5, 0xa8c8e8, 0.8).strokeRoundedRect(-95, -18, 190, 36, 8);
    const txt = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: '15px', color: '#e8f0f8' }).setOrigin(0.5);
    c.add([bg, txt]);
    c.setSize(190, 36);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => c.setScale(1.05));
    c.on('pointerout', () => c.setScale(1));
    c.on('pointerdown', onTap);
  }

  private tradeButton(label: string, x: number, y: number, onTap: () => void): void {
    const txt = this.add.text(x, y, label, {
      fontFamily: FONT, fontSize: '14px', color: '#9fd8ff',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    txt.on('pointerover', () => txt.setColor('#e8f7ff'));
    txt.on('pointerout', () => txt.setColor('#9fd8ff'));
    txt.on('pointerdown', () => {
      onTap();
      sfx.play('select');
    });
  }

  private renderStockRow(id: string, name: string, y: number): void {
    this.add.text(72, y, name, { fontFamily: FONT, fontSize: '17px', color: '#f0e8d0' });
    this.priceTexts[id] = this.add.text(230, y, '', { fontFamily: FONT, fontSize: '17px', color: '#e8f0f8' });
    this.deltaTexts[id] = this.add.text(330, y, '', { fontFamily: FONT, fontSize: '15px' });
    this.holdingTexts[id] = this.add.text(440, y, '', { fontFamily: FONT, fontSize: '14px', color: '#8a9ab0' });

    this.tradeButton('买10', 560, y, () => buyStock(id, 10));
    this.tradeButton('买100', 625, y, () => buyStock(id, 100));
    this.tradeButton('卖10', 695, y, () => sellStock(id, 10));
    this.tradeButton('卖100', 765, y, () => sellStock(id, 100));
  }

  private renderWealthRow(pid: string, y: number): void {
    const p = WEALTH_PRODUCTS.find((w) => w.id === pid)!;
    this.add.text(72, y, p.name, { fontFamily: FONT, fontSize: '16px', color: '#f0e8d0' });
    this.add.text(210, y, `期限 ${p.runs} 局 · 收益 +${Math.round(p.rate * 100)}%${p.risk > 0 ? ` · 违约 ${Math.round(p.risk * 100)}%` : ' · 稳健'}`, {
      fontFamily: FONT, fontSize: '13px', color: '#8a9ab0',
    });
    this.tradeButton('存 300', 620, y, () => {
      if (buyWealth(pid, 300)) sfx.play('levelup');
      this.refreshAll();
    });
    this.tradeButton('存 1000', 700, y, () => {
      if (buyWealth(pid, 1000)) sfx.play('levelup');
      this.refreshAll();
    });
  }

  private refreshAll(): void {
    const save = loadSave();
    const f = save.finance;
    this.goldText.setText(`铜钱 ${save.gold}`);
    this.mingbiText.setText(`冥币 ${f.mingbi}`);
    this.rateText.setText(`汇率 1 冥币 = ${f.rate} 文`);

    // 持仓总值
    let portfolio = 0;
    for (const st of STOCKS) {
      const p = f.prices[st.id];
      const held = f.holdings[st.id] ?? 0;
      portfolio += held * p.price;
      this.priceTexts[st.id]?.setText(`${p.price} 冥`);
      const pct = ((p.price - p.prev) / p.prev) * 100;
      this.deltaTexts[st.id]?.setText(`${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`);
      this.deltaTexts[st.id]?.setColor(pct >= 0 ? '#7fd88f' : '#e86a5a');
      this.holdingTexts[st.id]?.setText(held > 0 ? `持仓 ${held} 股` : '未持仓');
    }
    const inWealth = f.wealth.reduce((sum, h) => sum + h.principal, 0);
    this.mingbiText.setText(`冥币 ${f.mingbi}（持仓折 ${portfolio} + 理财在途 ${inWealth}）`);

    this.reportText.setText(f.lastReport.length > 0 ? `上局快报：${f.lastReport.join('　')}` : '快报：尚无行情记录，推进一次行情看看。');
  }
}
