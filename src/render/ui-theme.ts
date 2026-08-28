import Phaser from 'phaser';

export const UI_FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';

export const UI_COLORS = {
  ink: 0x090c0b,
  panel: 0x121713,
  panelRaised: 0x1a211b,
  gold: 0xd8b74a,
  goldLight: 0xffe4a0,
  jade: 0x89b89a,
  purple: 0xb783d0,
  blue: 0x8ebfe4,
  red: 0xcf5349,
  text: '#f0e8d0',
  muted: '#89958c',
} as const;

export type UiTone = 'gold' | 'purple' | 'blue' | 'red' | 'jade';

const TONE_COLOR: Record<UiTone, number> = {
  gold: UI_COLORS.gold,
  purple: UI_COLORS.purple,
  blue: UI_COLORS.blue,
  red: UI_COLORS.red,
  jade: UI_COLORS.jade,
};

const TONE_FILL: Record<UiTone, number> = {
  gold: 0x211b10,
  purple: 0x1d1422,
  blue: 0x111a24,
  red: 0x241414,
  jade: 0x132019,
};

export interface PanelSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  tone?: UiTone;
  alpha?: number;
  radius?: number;
  depth?: number;
}

export function toneColor(tone: UiTone): number {
  return TONE_COLOR[tone];
}

export function wrapChineseText(text: string, maxChars: number): string {
  const chars = Array.from(text);
  const lines: string[] = [];
  for (let i = 0; i < chars.length; i += maxChars) lines.push(chars.slice(i, i + maxChars).join(''));
  return lines.join('\n');
}

export function addScreenBackdrop(scene: Phaser.Scene, tone: UiTone): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const accent = toneColor(tone);
  const graphics = scene.add.graphics().setDepth(-20);

  graphics.fillStyle(UI_COLORS.ink, 1).fillRect(0, 0, width, height);
  graphics.fillStyle(TONE_FILL[tone], 0.72).fillRect(0, 0, width, height);
  graphics.fillStyle(0x000000, 0.28).fillRect(0, height * 0.64, width, height * 0.36);

  graphics.lineStyle(1, accent, 0.06);
  for (let x = -height; x < width; x += 88) {
    graphics.lineBetween(x, 0, x + height, height);
  }
  for (let x = 52; x < width; x += 118) {
    graphics.strokeCircle(x, 104 + (x % 3) * 146, 18);
    graphics.strokeCircle(x, 104 + (x % 3) * 146, 8);
  }

  graphics.fillStyle(0x000000, 0.32);
  graphics.fillRect(0, 0, width, 6);
  graphics.fillRect(0, height - 6, width, 6);
  return graphics;
}

export function addFramedPanel(scene: Phaser.Scene, spec: PanelSpec): Phaser.GameObjects.Graphics {
  const tone = spec.tone ?? 'gold';
  const accent = toneColor(tone);
  const radius = spec.radius ?? 12;
  const graphics = scene.add.graphics().setDepth(spec.depth ?? 0);

  graphics.fillStyle(0x000000, 0.36).fillRoundedRect(spec.x + 5, spec.y + 7, spec.width, spec.height, radius);
  graphics.fillStyle(TONE_FILL[tone], spec.alpha ?? 0.94).fillRoundedRect(spec.x, spec.y, spec.width, spec.height, radius);
  graphics.lineStyle(2, accent, 0.86).strokeRoundedRect(spec.x, spec.y, spec.width, spec.height, radius);
  graphics.lineStyle(1, accent, 0.24).strokeRoundedRect(spec.x + 5, spec.y + 5, spec.width - 10, spec.height - 10, Math.max(2, radius - 4));
  drawCornerMarks(graphics, spec.x, spec.y, spec.width, spec.height, accent);
  return graphics;
}

export function addSceneTitle(
  scene: Phaser.Scene,
  title: string,
  subtitle: string,
  tone: UiTone,
): Phaser.GameObjects.Container {
  const { width } = scene.scale;
  const accent = toneColor(tone);
  const container = scene.add.container(width / 2, 40);
  const ornament = scene.add.graphics();
  ornament.lineStyle(2, accent, 0.78).lineBetween(-224, 0, -112, 0).lineBetween(112, 0, 224, 0);
  ornament.fillStyle(accent, 0.9).fillCircle(-102, 0, 4).fillCircle(102, 0, 4);
  const heading = scene.add.text(0, -4, title, {
    fontFamily: UI_FONT,
    fontSize: '34px',
    color: `#${accent.toString(16).padStart(6, '0')}`,
    stroke: '#080a09',
    strokeThickness: 7,
  }).setOrigin(0.5);
  const caption = scene.add.text(0, 30, subtitle, {
    fontFamily: UI_FONT,
    fontSize: '12px',
    color: UI_COLORS.muted,
    letterSpacing: 1,
  }).setOrigin(0.5);
  container.add([ornament, heading, caption]);
  return container;
}

export function addSectionLabel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  tone: UiTone,
): Phaser.GameObjects.Text {
  const accent = toneColor(tone);
  const text = scene.add.text(x, y, label, {
    fontFamily: UI_FONT,
    fontSize: '15px',
    color: `#${accent.toString(16).padStart(6, '0')}`,
    stroke: '#090b09',
    strokeThickness: 3,
  });
  scene.add.graphics()
    .lineStyle(1, accent, 0.48)
    .lineBetween(x, y + 24, x + Math.max(116, text.width + 28), y + 24);
  return text;
}

export interface ButtonSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  tone?: UiTone;
  fontSize?: number;
  onTap: () => void;
}

export function addTextButton(scene: Phaser.Scene, spec: ButtonSpec): Phaser.GameObjects.Container {
  const tone = spec.tone ?? 'gold';
  const accent = toneColor(tone);
  const container = scene.add.container(spec.x, spec.y);
  const background = scene.add.graphics();
  const draw = (hovered: boolean) => {
    background.clear();
    background.fillStyle(hovered ? TONE_FILL[tone] + 0x080808 : TONE_FILL[tone], 0.98)
      .fillRoundedRect(-spec.width / 2, -spec.height / 2, spec.width, spec.height, 8);
    background.lineStyle(hovered ? 2.5 : 1.5, hovered ? UI_COLORS.goldLight : accent, hovered ? 1 : 0.8)
      .strokeRoundedRect(-spec.width / 2, -spec.height / 2, spec.width, spec.height, 8);
  };
  draw(false);
  const text = scene.add.text(0, 0, spec.label, {
    fontFamily: UI_FONT,
    fontSize: `${spec.fontSize ?? 15}px`,
    color: UI_COLORS.text,
    stroke: '#080a09',
    strokeThickness: 3,
  }).setOrigin(0.5);
  container.add([background, text]);
  container.setSize(spec.width, spec.height).setInteractive({ useHandCursor: true });
  container.on('pointerover', () => {
    draw(true);
    scene.tweens.add({ targets: container, scale: 1.035, duration: 80 });
  });
  container.on('pointerout', () => {
    draw(false);
    scene.tweens.add({ targets: container, scale: 1, duration: 80 });
  });
  container.on('pointerdown', spec.onTap);
  return container;
}

export function addBackButton(scene: Phaser.Scene, onTap: () => void): Phaser.GameObjects.Container {
  return addTextButton(scene, {
    x: 112,
    y: scene.scale.height - 34,
    width: 176,
    height: 38,
    label: '←  回主菜单',
    tone: 'gold',
    fontSize: 17,
    onTap,
  });
}

function drawCornerMarks(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
): void {
  const inset = 9;
  const arm = 11;
  graphics.lineStyle(2, color, 0.72);
  const corners = [
    [x + inset, y + inset, 1, 1],
    [x + width - inset, y + inset, -1, 1],
    [x + inset, y + height - inset, 1, -1],
    [x + width - inset, y + height - inset, -1, -1],
  ] as const;
  for (const [cx, cy, sx, sy] of corners) {
    graphics.lineBetween(cx, cy, cx + arm * sx, cy);
    graphics.lineBetween(cx, cy, cx, cy + arm * sy);
  }
}
