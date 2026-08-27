import Phaser from 'phaser';
import { FX, STOCKS, WEALTH_PRODUCTS, GODSLAYER_PRICE } from '../data/finance';
import {
  loadSave, openAccount, exchangeToMingbi, exchangeToCopper,
  buyStock, sellStock, buyWealth, financeTick,
} from '../game/save';
import { Rng } from '../core/math';
import { sfx } from '../render/sfx';
import {
  addBackButton,
  addFramedPanel,
  addSceneTitle,
  addScreenBackdrop,
  addSectionLabel,
  addTextButton,
  UI_FONT as FONT,
} from '../render/ui-theme';

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
    addScreenBackdrop(this, 'blue');
    addSceneTitle(this, '天 地 银 行', '冥不通商，唯通财 · 阴股有风险，入市需谨慎', 'blue');

    // 账户栏
    const save = loadSave();
    if (!save.finance.accountOpen) {
      this.renderOpenAccount();
      return;
    }
    this.renderAccount();

    addBackButton(this, () => {
      sfx.play('select');
      this.scene.start('Menu');
    });
  }

  // ------------------------------------------------ 开户引导

  private renderOpenAccount(): void {
    const { width } = this.scale;
    addFramedPanel(this, { x: width / 2 - 310, y: 148, width: 620, height: 390, tone: 'blue', alpha: 0.92, radius: 16 });
    this.add.image(width / 2, 225, 'icon_gold').setScale(2.8);
    this.add
      .text(width / 2, 292, '孟婆柜台 · 开一册阴司账簿', {
        fontFamily: FONT, fontSize: '27px', color: '#e8d8a0', stroke: '#090b0f', strokeThickness: 5,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, 342, `开户即送 ${FX.signupBonus} 冥币。冥币虽买不了货，却能在阴司钱庄生钱。`, {
        fontFamily: FONT, fontSize: '15px', color: '#a6b7ca',
      })
      .setOrigin(0.5);

    addTextButton(this, {
      x: width / 2,
      y: 416,
      width: 330,
      height: 60,
      label: '开  户  ·  领 100 冥币',
      tone: 'blue',
      fontSize: 21,
      onTap: () => {
        openAccount();
        sfx.play('levelup');
        this.scene.restart();
      },
    });

    addBackButton(this, () => {
      sfx.play('select');
      this.scene.start('Menu');
    });
  }

  // ------------------------------------------------ 主界面

  private renderAccount(): void {
    const { width } = this.scale;

    addFramedPanel(this, { x: width - 370, y: 16, width: 338, height: 104, tone: 'blue', alpha: 0.92, radius: 10 });
    this.goldText = this.add.text(width - 50, 34, '', {
      fontFamily: FONT, fontSize: '19px', color: '#ffd88a', stroke: '#0a0c12', strokeThickness: 4,
    }).setOrigin(1, 0.5);
    this.mingbiText = this.add.text(width - 50, 64, '', {
      fontFamily: FONT, fontSize: '16px', color: '#9fd8ff', stroke: '#0a0c12', strokeThickness: 4,
    }).setOrigin(1, 0.5);
    this.rateText = this.add.text(width - 50, 94, '', {
      fontFamily: FONT, fontSize: '14px', color: '#8a9ab0',
    }).setOrigin(1, 0.5);

    this.bankButton('500 文 → 冥币', 178, 112, () => {
      const got = exchangeToMingbi(500);
      if (got > 0) sfx.play('pickup');
      this.refreshAll();
    });
    this.bankButton('50 冥币 → 铜钱', 386, 112, () => {
      const got = exchangeToCopper(50);
      if (got > 0) sfx.play('pickup');
      this.refreshAll();
    });
    this.bankButton('推进行情 · 模拟一局', 616, 112, () => {
      const report = financeTick(new Rng(Date.now() % 2147483647));
      if (report.length > 0) sfx.play('levelup');
      this.refreshAll();
    });

    addFramedPanel(this, { x: 48, y: 148, width: 720, height: 394, tone: 'blue', alpha: 0.86, radius: 12 });
    addSectionLabel(this, 72, 168, '地府 A 股 · 冥币计价 / 局间波动', 'blue');
    this.add.text(72, 202, '阴股', { fontFamily: FONT, fontSize: '12px', color: '#71859a' });
    this.add.text(236, 202, '现价', { fontFamily: FONT, fontSize: '12px', color: '#71859a' });
    this.add.text(326, 202, '涨跌', { fontFamily: FONT, fontSize: '12px', color: '#71859a' });
    this.add.text(420, 202, '持仓', { fontFamily: FONT, fontSize: '12px', color: '#71859a' });
    STOCKS.forEach((s, i) => this.renderStockRow(s.id, s.name, 234 + i * 68));

    addFramedPanel(this, { x: 792, y: 148, width: 440, height: 394, tone: 'jade', alpha: 0.86, radius: 12 });
    addSectionLabel(this, 816, 168, '地府理财 · 到期结算', 'jade');
    WEALTH_PRODUCTS.forEach((p, i) => this.renderWealthRow(p.id, 216 + i * 76));

    addSectionLabel(this, 816, 454, '传说目标', 'gold');
    const legendaryOwned = loadSave().legendary.includes('godslayer');
    this.add.image(838, 504, 'icon_godslayer').setScale(1.35);
    this.add.text(870, 478, legendaryOwned
      ? '弑神枪已在你手——去鬼市装备它，荡涤满屏吧。'
      : `弑神枪 · 荡涤满屏\n鬼市标价 ${GODSLAYER_PRICE.toLocaleString()} 文`, {
      fontFamily: FONT, fontSize: '15px', color: '#ffd88a', lineSpacing: 7,
    }).setOrigin(0, 0);

    addFramedPanel(this, { x: 48, y: 560, width: 1184, height: 72, tone: 'gold', alpha: 0.76, radius: 10 });
    this.reportText = this.add.text(72, 582, '', {
      fontFamily: FONT, fontSize: '13px', color: '#a5ad9e', lineSpacing: 4, wordWrap: { width: 1136 },
    });

    this.refreshAll();
  }

  private bankButton(label: string, x: number, y: number, onTap: () => void): void {
    addTextButton(this, { x, y, width: 190, height: 38, label, tone: 'blue', fontSize: 14, onTap });
  }

  private tradeButton(label: string, x: number, y: number, onTap: () => void): void {
    addTextButton(this, {
      x, y, width: 54, height: 30, label, tone: 'blue', fontSize: 12,
      onTap: () => {
        onTap();
        sfx.play('select');
      },
    });
  }

  private renderStockRow(id: string, name: string, y: number): void {
    this.add.rectangle(406, y + 8, 684, 52, 0x0b1118, 0.48).setStrokeStyle(1, 0x365064, 0.42);
    this.add.text(72, y, name, { fontFamily: FONT, fontSize: '17px', color: '#f0e8d0' });
    this.priceTexts[id] = this.add.text(236, y, '', { fontFamily: FONT, fontSize: '17px', color: '#e8f0f8' });
    this.deltaTexts[id] = this.add.text(326, y, '', { fontFamily: FONT, fontSize: '15px' });
    this.holdingTexts[id] = this.add.text(420, y, '', { fontFamily: FONT, fontSize: '13px', color: '#8a9ab0' });

    this.tradeButton('买10', 548, y + 8, () => buyStock(id, 10));
    this.tradeButton('买百', 608, y + 8, () => buyStock(id, 100));
    this.tradeButton('卖10', 668, y + 8, () => sellStock(id, 10));
    this.tradeButton('卖百', 728, y + 8, () => sellStock(id, 100));
  }

  private renderWealthRow(pid: string, y: number): void {
    const p = WEALTH_PRODUCTS.find((w) => w.id === pid)!;
    this.add.rectangle(1012, y + 14, 392, 62, 0x0d1612, 0.46).setStrokeStyle(1, 0x41604d, 0.4);
    this.add.text(816, y, p.name, { fontFamily: FONT, fontSize: '16px', color: '#f0e8d0' });
    this.add.text(816, y + 27, `期限 ${p.runs} 局 · 收益 +${Math.round(p.rate * 100)}%${p.risk > 0 ? ` · 违约 ${Math.round(p.risk * 100)}%` : ' · 稳健'}`, {
      fontFamily: FONT, fontSize: '12px', color: '#8a9ab0',
    });
    this.tradeButton('存300', 1110, y + 12, () => {
      if (buyWealth(pid, 300)) sfx.play('levelup');
      this.refreshAll();
    });
    this.tradeButton('存千', 1170, y + 12, () => {
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
