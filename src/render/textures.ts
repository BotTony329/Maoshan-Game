/**
 * 程序化贴图工厂 —— 全部美术资产用 Canvas 2D 代码绘制，零外部素材依赖。
 *
 * 美术方向：Q 版平涂 + 深色描边的“水墨志怪”风格，剪影可读性优先
 * （弹幕游戏的怪物必须在混乱中一眼可辨）。
 * 换正式美术时，只需替换这里的贴图键，场景层代码不动。
 */
import Phaser from 'phaser';

type Ctx = CanvasRenderingContext2D;

// ---------------------------------------------------------------- 通用小工具

const OUTLINE = '#10141a';

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function fillStroke(c: Ctx, fill: string, stroke = OUTLINE, lw = 2): void {
  c.fillStyle = fill;
  c.fill();
  c.strokeStyle = stroke;
  c.lineWidth = lw;
  c.stroke();
}

function ell(c: Ctx, x: number, y: number, rx: number, ry: number): void {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/**
 * Q 版僵尸通用画法：前伸双臂 + 长袍 + 官帽 + 额符。
 * 各僵尸种类的差异靠配色与少量特征件表达。
 */
interface JiangshiOpts {
  robe: string;      // 袍子
  skin: string;      // 皮肤
  hat: string;       // 帽子
  hatBall: string;   // 帽顶珠
  eyes: string;      // 眼睛
  arms?: string;     // 手臂色（默认同袍）
  extra?: (c: Ctx) => void;
}

function drawJiangshi(c: Ctx, w: number, h: number, o: JiangshiOpts): void {
  const cx = w / 2;
  const armY = h * 0.42;

  // 前伸的双臂（僵尸标志性剪影）
  c.beginPath();
  rr(c, 1, armY - 3, w * 0.42, 6, 3);
  fillStroke(c, o.arms ?? o.robe);
  c.beginPath();
  rr(c, w * 0.58, armY - 3, w * 0.42 - 1, 6, 3);
  fillStroke(c, o.arms ?? o.robe);

  // 长袍（上窄下宽）
  c.beginPath();
  c.moveTo(cx - w * 0.26, h * 0.36);
  c.lineTo(cx + w * 0.26, h * 0.36);
  c.lineTo(cx + w * 0.36, h - 1);
  c.lineTo(cx - w * 0.36, h - 1);
  c.closePath();
  fillStroke(c, o.robe);

  // 衣摆一道缝线
  c.beginPath();
  c.moveTo(cx, h * 0.6);
  c.lineTo(cx, h - 3);
  c.strokeStyle = 'rgba(0,0,0,0.35)';
  c.lineWidth = 1.5;
  c.stroke();

  // 头
  ell(c, cx, h * 0.26, w * 0.24, h * 0.17);
  fillStroke(c, o.skin);

  // 呆滞双眼 + 张口
  c.fillStyle = o.eyes;
  c.fillRect(cx - w * 0.13, h * 0.24, 3, 3);
  c.fillRect(cx + w * 0.13 - 3, h * 0.24, 3, 3);
  c.fillStyle = '#3a2430';
  rr(c, cx - 3.5, h * 0.315, 7, 4, 2);
  c.fill();

  // 官帽（斗笠式）
  c.beginPath();
  c.moveTo(cx - w * 0.27, h * 0.15);
  c.lineTo(cx + w * 0.27, h * 0.15);
  c.lineTo(cx, h * 0.02);
  c.closePath();
  fillStroke(c, o.hat);
  ell(c, cx, h * 0.02, 2.6, 2.6);
  fillStroke(c, o.hatBall);

  // 额头黄符（斜贴）
  c.save();
  c.translate(cx + w * 0.08, h * 0.2);
  c.rotate(0.25);
  c.fillStyle = '#f0dc8a';
  c.fillRect(-2.5, -5, 5, 10);
  c.strokeStyle = '#c33';
  c.lineWidth = 1;
  c.strokeRect(-1.5, -3, 3, 5);
  c.restore();

  o.extra?.(c);
}

// ---------------------------------------------------------------- 贴图注册

export function buildTextures(scene: Phaser.Scene): void {
  const add = (key: string, w: number, h: number, draw: (c: Ctx) => void): void => {
    if (scene.textures.exists(key)) return;
    const tex = scene.textures.createCanvas(key, w, h);
    if (!tex) return;
    const c = tex.getContext();
    draw(c);
    tex.refresh();
  };

  buildGround(scene, add);
  buildPlayer(scene, add);
  buildEnemies(scene, add);
  buildProjectiles(scene, add);
  buildPickups(scene, add);
  buildDecor(scene, add);
  buildIcons(scene, add);
  buildOrbIcons(scene, add);
  buildDoors(scene, add);
  buildMaskIcons(scene, add);
  buildFx(scene, add);
}

type Adder = (key: string, w: number, h: number, draw: (c: Ctx) => void) => void;

// ---------------------------------------------------------------- 地面

function buildGround(scene: Phaser.Scene, add: Adder): void {
  void scene;
  /** 公共底子：撒碎点 */
  const speckle = (c: Ctx, colors: string[], n: number, seed: number) => {
    let sd = seed;
    const rnd = () => {
      sd = (sd * 16807) % 2147483647;
      return sd / 2147483647;
    };
    for (let i = 0; i < n; i++) {
      c.fillStyle = colors[Math.floor(rnd() * colors.length)];
      const x = rnd() * 128;
      const y = rnd() * 128;
      const r = 1 + rnd() * 2.5;
      ell(c, x, y, r, r * 0.7);
      c.fill();
    }
  };

  // 第1境 人间·乱葬岗：暗苔草地 + 石板
  add('ground_s1', 128, 128, (c) => {
    c.fillStyle = '#141b16';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#17201a';
    c.fillRect(0, 0, 64, 64);
    c.fillRect(64, 64, 64, 64);
    speckle(c, ['#1b251d', '#10160f', '#1d2a1f', '#0e140f'], 90, 9);
    for (let i = 0; i < 6; i++) {
      c.fillStyle = '#232c25';
      rr(c, (i * 37) % 116, (i * 53) % 116, 10 + (i % 3) * 4, 8, 3);
      c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.4)';
      c.lineWidth = 1;
      c.stroke();
    }
  });

  // 第2境 黄泉路：紫土路 + 彼岸花瓣
  add('ground_s2', 128, 128, (c) => {
    c.fillStyle = '#1c1522';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#221a2b';
    c.fillRect(64, 0, 64, 64);
    c.fillRect(0, 64, 64, 64);
    speckle(c, ['#2a1f36', '#161020', '#30223f'], 70, 21);
    // 彼岸花瓣
    for (let i = 0; i < 8; i++) {
      const x = (i * 47 + 13) % 128;
      const y = (i * 71 + 29) % 128;
      c.fillStyle = i % 2 ? '#7a3a5a' : '#5a2a4a';
      ell(c, x, y, 2.4, 1.2);
      c.fill();
    }
  });

  // 第3境 忘川河畔：幽绿水波
  add('ground_s3', 128, 128, (c) => {
    c.fillStyle = '#0e1e22';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#122429';
    c.fillRect(0, 0, 64, 64);
    c.fillRect(64, 64, 64, 64);
    speckle(c, ['#16303a', '#0a161a', '#1a3a44'], 60, 33);
    c.strokeStyle = 'rgba(120,200,220,0.22)';
    c.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
      const y = (i * 19 + 8) % 128;
      c.beginPath();
      c.moveTo((i * 31) % 96, y);
      c.quadraticCurveTo(((i * 31) % 96) + 16, y - 5, ((i * 31) % 96) + 32, y);
      c.stroke();
    }
  });

  // 第4境 恶狗村：暗红血土 + 白骨
  add('ground_s4', 128, 128, (c) => {
    c.fillStyle = '#221410';
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#281812';
    c.fillRect(64, 0, 64, 64);
    c.fillRect(0, 64, 64, 64);
    speckle(c, ['#301c14', '#180e0a', '#38201a'], 70, 45);
    // 散骨
    for (let i = 0; i < 5; i++) {
      const x = (i * 53 + 17) % 118;
      const y = (i * 37 + 41) % 118;
      c.strokeStyle = 'rgba(216,200,180,0.5)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 7, y + 4);
      c.stroke();
      ell(c, x - 1, y - 1, 1.8, 1.8);
      c.fillStyle = 'rgba(216,200,180,0.5)';
      c.fill();
    }
  });

  // 第5境 鬼门关：赤岩砖墙
  add('ground_s5', 128, 128, (c) => {
    c.fillStyle = '#241014';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 2;
    for (let row = 0; row < 8; row++) {
      const y = row * 16;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(128, y);
      c.stroke();
      for (let col = 0; col < 4; col++) {
        const x = col * 32 + (row % 2 ? 16 : 0);
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y + 16);
        c.stroke();
        if ((row + col) % 3 === 0) {
          c.fillStyle = '#2e161c';
          c.fillRect(x + 2, y + 2, 28, 12);
        }
      }
    }
    speckle(c, ['#3a1a20', '#1a0a0e'], 40, 57);
  });

  // 第6境 阎罗殿：鎏金殿砖
  add('ground_s6', 128, 128, (c) => {
    c.fillStyle = '#1c180e';
    c.fillRect(0, 0, 128, 128);
    // 菱形金砖
    c.strokeStyle = 'rgba(216,183,74,0.30)';
    c.lineWidth = 1.6;
    for (let i = -2; i < 6; i++) {
      c.beginPath();
      c.moveTo(i * 32, 0);
      c.lineTo(i * 32 + 64, 64);
      c.lineTo(i * 32, 128);
      c.lineTo(i * 32 - 64, 64);
      c.closePath();
      c.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const x = (i * 43 + 21) % 120;
      const y = (i * 29 + 11) % 120;
      c.fillStyle = 'rgba(216,183,74,0.14)';
      c.fillRect(x, y, 8, 8);
    }
    speckle(c, ['#2a2414', '#121008'], 40, 69);
  });

  // 兼容旧引用：默认地面
  add('ground_tile', 128, 128, (c) => {
    c.drawImage(scene.textures.get('ground_s1').getSourceImage() as CanvasImageSource, 0, 0);
  });
}

// ---------------------------------------------------------------- 主角与道途皮肤

/** 职业皮肤调色：同一套道士画法，换袍色/头饰即成新职业 */
interface TaoistSkin {
  robe: string;
  belt: string;
  trim: string;
  head: 'crown' | 'feather' | 'band' | 'hood' | 'horns';
  skin?: string;
}

function drawTaoist(c: Ctx, o: TaoistSkin): void {
  const cx = 19;
  const skin = o.skin ?? '#f2c9a2';
  // 拂尘（右手侧，白丝 + 柄）
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(cx + 12, 24);
  c.lineTo(cx + 17, 12);
  c.stroke();
  c.strokeStyle = '#e8e4d8';
  c.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(cx + 17, 12);
    c.lineTo(cx + 13 + i * 2, 4 + (i % 2) * 2);
    c.stroke();
  }

  // 道袍
  c.beginPath();
  c.moveTo(cx - 10, 18);
  c.lineTo(cx + 10, 18);
  c.lineTo(cx + 14, 45);
  c.lineTo(cx - 14, 45);
  c.closePath();
  fillStroke(c, o.robe);
  c.strokeStyle = o.trim;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(cx - 12.5, 43.5);
  c.lineTo(cx + 12.5, 43.5);
  c.stroke();
  // 腰封
  c.fillStyle = o.belt;
  c.fillRect(cx - 11, 27, 22, 5);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 1.2;
  c.strokeRect(cx - 11, 27, 22, 5);
  ell(c, cx, 29.5, 2.4, 2.4);
  fillStroke(c, '#e8e4d8');

  // 头
  ell(c, cx, 12, 9.5, 9);
  fillStroke(c, skin);
  c.beginPath();
  c.arc(cx, 9, 9.2, Math.PI * 0.95, Math.PI * 2.05);
  c.fillStyle = '#232833';
  c.fill();

  // 头饰（职业标识）
  switch (o.head) {
    case 'crown':
      // 发髻 + 金冠（茅山道士）
      ell(c, cx, 1.5, 3.6, 3);
      fillStroke(c, '#232833');
      c.fillStyle = '#d8b74a';
      rr(c, cx - 3.2, 0.4, 6.4, 2.6, 1);
      c.fill();
      break;
    case 'feather':
      // 萨满：羽饰
      ell(c, cx, 1.5, 3.6, 3);
      fillStroke(c, '#232833');
      c.beginPath();
      c.moveTo(cx + 1, 1);
      c.quadraticCurveTo(cx + 6, -4, cx + 9, -1);
      c.quadraticCurveTo(cx + 5, 2, cx + 1, 3);
      c.closePath();
      fillStroke(c, '#6cc8d8', '#2a6c7c', 1.2);
      break;
    case 'band':
      // 武士：额带
      c.fillStyle = '#c23b2a';
      rr(c, cx - 9, 6.5, 18, 3.2, 1.5);
      c.fill();
      c.strokeStyle = OUTLINE;
      c.lineWidth = 1;
      c.strokeRect(cx - 9, 6.5, 18, 3.2);
      c.beginPath();
      c.moveTo(cx + 8, 7);
      c.lineTo(cx + 14, 5);
      c.lineTo(cx + 13, 9);
      c.closePath();
      fillStroke(c, '#c23b2a', OUTLINE, 1);
      break;
    case 'hood':
      // 猎人：兜帽
      c.beginPath();
      c.arc(cx, 9, 10.5, Math.PI * 0.9, Math.PI * 2.1);
      c.lineTo(cx + 8, 14);
      c.quadraticCurveTo(cx, 17, cx - 8, 14);
      c.closePath();
      fillStroke(c, '#5a6b3a', OUTLINE, 1.6);
      break;
    case 'horns':
      // 术士：双角 + 灰白肤色
      c.beginPath();
      c.moveTo(cx - 7, 5);
      c.lineTo(cx - 10, -2);
      c.lineTo(cx - 3, 2);
      c.closePath();
      fillStroke(c, '#3a2438', OUTLINE, 1.2);
      c.beginPath();
      c.moveTo(cx + 7, 5);
      c.lineTo(cx + 10, -2);
      c.lineTo(cx + 3, 2);
      c.closePath();
      fillStroke(c, '#3a2438', OUTLINE, 1.2);
      break;
  }

  // 闭目养神的两道眉眼 + 山羊胡
  c.strokeStyle = '#4a3626';
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(cx - 3.6, 12.5, 2, 0.15, Math.PI - 0.15);
  c.stroke();
  c.beginPath();
  c.arc(cx + 3.6, 12.5, 2, 0.15, Math.PI - 0.15);
  c.stroke();
  c.beginPath();
  c.moveTo(cx, 19);
  c.lineTo(cx, 23);
  c.stroke();
}

function buildPlayer(scene: Phaser.Scene, add: Adder): void {
  void scene;
  const skins: Record<string, TaoistSkin> = {
    player_taoist: { robe: '#3d4f73', belt: '#2a3650', trim: '#d8b74a', head: 'crown' },
    player_shaman: { robe: '#2e5a5e', belt: '#1e3c40', trim: '#6cc8d8', head: 'feather' },
    player_warrior: { robe: '#7a3028', belt: '#4a1c18', trim: '#e8b088', head: 'band' },
    player_hunter: { robe: '#5a6b3a', belt: '#3a4426', trim: '#c8b87a', head: 'hood' },
    player_warlock: { robe: '#3a2a4e', belt: '#241a32', trim: '#9a5ac8', head: 'horns', skin: '#c8b8c8' },
  };
  for (const [key, skin] of Object.entries(skins)) {
    add(key, 38, 48, (c) => drawTaoist(c, skin));
  }
}

// ---------------------------------------------------------------- 敌人

function buildEnemies(scene: Phaser.Scene, add: Adder): void {
  void scene;

  add('enemy_jiangshi', 32, 42, (c) => {
    drawJiangshi(c, 32, 42, {
      robe: '#5a6b70', skin: '#9fb89a', hat: '#3a4258', hatBall: '#c23b3b', eyes: '#d84343',
    });
  });

  add('enemy_hopper', 32, 42, (c) => {
    drawJiangshi(c, 32, 42, {
      robe: '#6b5a78', skin: '#b0a0c0', hat: '#4a3a58', hatBall: '#e8b23c', eyes: '#ffd84a',
      extra: (c2) => {
        // 跳尸：龇牙
        c2.fillStyle = '#e8e4d8';
        c2.fillRect(13.4, 13.4, 2, 2.4);
        c2.fillRect(16.6, 13.4, 2, 2.4);
      },
    });
  });

  add('enemy_flying', 38, 32, (c) => {
    const cx = 19;
    // 蝠翼
    c.beginPath();
    c.moveTo(cx - 4, 14);
    c.lineTo(cx - 18, 8);
    c.lineTo(cx - 14, 16);
    c.lineTo(cx - 17, 20);
    c.lineTo(cx - 4, 20);
    c.closePath();
    fillStroke(c, '#4a3b52');
    c.beginPath();
    c.moveTo(cx + 4, 14);
    c.lineTo(cx + 18, 8);
    c.lineTo(cx + 14, 16);
    c.lineTo(cx + 17, 20);
    c.lineTo(cx + 4, 20);
    c.closePath();
    fillStroke(c, '#4a3b52');
    // 小尸身
    ell(c, cx, 16, 7, 10);
    fillStroke(c, '#8ba886');
    ell(c, cx, 10, 5.5, 5);
    fillStroke(c, '#9fb89a');
    c.fillStyle = '#d84343';
    c.fillRect(cx - 3.4, 9, 2.4, 2.4);
    c.fillRect(cx + 1, 9, 2.4, 2.4);
    // 额符
    c.fillStyle = '#f0dc8a';
    c.fillRect(cx - 1.2, 11.5, 2.4, 4);
  });

  add('enemy_white', 38, 46, (c) => {
    drawJiangshi(c, 38, 46, {
      robe: '#c9c4b8', skin: '#e8e4d8', hat: '#8a2f2f', hatBall: '#f0dc8a', eyes: '#ff3b3b',
      extra: (c2) => {
        // 白毛僵：白毛披发 + 獠牙
        c2.strokeStyle = '#e8e4d8';
        c2.lineWidth = 1.4;
        for (const sx of [-16, -12, 12, 16]) {
          c2.beginPath();
          c2.moveTo(19 + sx * 0.55, 8);
          c2.lineTo(19 + sx, 18);
          c2.stroke();
        }
        c2.fillStyle = '#e8e4d8';
        c2.fillRect(15.5, 14.6, 2.4, 3);
        c2.fillRect(20.1, 14.6, 2.4, 3);
      },
    });
  });

  add('enemy_taotie', 58, 46, (c) => {
    const cx = 29;
    // 兽身
    ell(c, cx, 30, 20, 14);
    fillStroke(c, '#4a4438');
    // 四短足
    c.fillStyle = '#3a352c';
    for (const lx of [-14, -6, 6, 14]) {
      rr(c, cx + lx - 3, 40, 6, 6, 2);
      c.fill();
    }
    // 巨首
    ell(c, cx, 17, 16, 13);
    fillStroke(c, '#5a5244');
    // 双角
    c.beginPath();
    c.moveTo(cx - 12, 8);
    c.quadraticCurveTo(cx - 20, 2, cx - 14, -1 + 6);
    c.quadraticCurveTo(cx - 13, 4, cx - 8, 7);
    c.closePath();
    fillStroke(c, '#8a7d5a');
    c.beginPath();
    c.moveTo(cx + 12, 8);
    c.quadraticCurveTo(cx + 20, 2, cx + 14, 5);
    c.quadraticCurveTo(cx + 13, 4, cx + 8, 7);
    c.closePath();
    fillStroke(c, '#8a7d5a');
    // 血口獠牙
    c.beginPath();
    ell(c, cx, 23, 11, 5.5);
    fillStroke(c, '#5c1f1f');
    c.fillStyle = '#e8e4d8';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(cx - 9 + i * 4.5, 18.5);
      c.lineTo(cx - 7 + i * 4.5, 23);
      c.lineTo(cx - 5 + i * 4.5, 18.5);
      c.closePath();
      c.fill();
    }
    // 双目
    c.fillStyle = '#ffd84a';
    ell(c, cx - 7, 13, 3, 2.4);
    c.fill();
    ell(c, cx + 7, 13, 3, 2.4);
    c.fill();
    c.fillStyle = '#20180c';
    c.fillRect(cx - 8, 12.2, 1.8, 1.8);
    c.fillRect(cx + 6.2, 12.2, 1.8, 1.8);
    // 云雷纹
    c.strokeStyle = 'rgba(232,228,216,0.4)';
    c.lineWidth = 1.2;
    c.strokeRect(cx - 3, 28, 6, 4);
  });

  add('enemy_luocha', 34, 40, (c) => {
    const cx = 17;
    // 尾巴
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(cx + 6, 34);
    c.quadraticCurveTo(cx + 16, 30, cx + 14, 22);
    c.stroke();
    // 身体
    ell(c, cx, 26, 9, 12);
    fillStroke(c, '#a83232');
    // 头 + 双角
    ell(c, cx, 12, 8.5, 8);
    fillStroke(c, '#c04545');
    c.beginPath();
    c.moveTo(cx - 7, 6);
    c.lineTo(cx - 10, -1);
    c.lineTo(cx - 3, 3);
    c.closePath();
    fillStroke(c, '#e8d8b0');
    c.beginPath();
    c.moveTo(cx + 7, 6);
    c.lineTo(cx + 10, -1);
    c.lineTo(cx + 3, 3);
    c.closePath();
    fillStroke(c, '#e8d8b0');
    // 怒目獠牙
    c.fillStyle = '#ffd84a';
    c.fillRect(cx - 4.6, 10, 3, 2.6);
    c.fillRect(cx + 1.6, 10, 3, 2.6);
    c.fillStyle = '#20180c';
    c.fillRect(cx - 3.8, 10.8, 1.4, 1.4);
    c.fillRect(cx + 2.4, 10.8, 1.4, 1.4);
    c.fillStyle = '#e8e4d8';
    c.fillRect(cx - 2.6, 16.4, 2, 2.4);
    c.fillRect(cx + 0.8, 16.4, 2, 2.4);
  });

  add('enemy_huli', 38, 40, (c) => {
    const cx = 17;
    // 三条尾巴（橙尖）
    for (const [dx, dy] of [[-10, -2], [0, -6], [10, -2]] as const) {
      c.beginPath();
      ell(c, cx + dx, 30 + dy, 4.5, 9);
      fillStroke(c, '#e8e4d8');
      ell(c, cx + dx, 22 + dy, 3.2, 3.4);
      c.fillStyle = '#e8843c';
      c.fill();
    }
    // 身
    ell(c, cx, 28, 8, 9);
    fillStroke(c, '#f2eee2');
    // 头（狐面尖耳）
    ell(c, cx, 14, 8.5, 7.5);
    fillStroke(c, '#f2eee2');
    c.beginPath();
    c.moveTo(cx - 8, 9);
    c.lineTo(cx - 6.5, -1);
    c.lineTo(cx - 1.5, 6);
    c.closePath();
    fillStroke(c, '#f2eee2');
    c.beginPath();
    c.moveTo(cx + 8, 9);
    c.lineTo(cx + 6.5, -1);
    c.lineTo(cx + 1.5, 6);
    c.closePath();
    fillStroke(c, '#f2eee2');
    // 内耳橙
    c.fillStyle = '#e8843c';
    c.beginPath();
    c.moveTo(cx - 6.4, 6.5);
    c.lineTo(cx - 5.8, 1.5);
    c.lineTo(cx - 3.2, 5.6);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(cx + 6.4, 6.5);
    c.lineTo(cx + 5.8, 1.5);
    c.lineTo(cx + 3.2, 5.6);
    c.closePath();
    c.fill();
    // 狐目（勾魂眯眼）
    c.strokeStyle = '#c23b3b';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(cx - 5.5, 12.5);
    c.lineTo(cx - 1.8, 14);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + 5.5, 12.5);
    c.lineTo(cx + 1.8, 14);
    c.stroke();
    // 尖吻
    c.fillStyle = '#3a3230';
    ell(c, cx, 17.5, 1.6, 1.2);
    c.fill();
  });

  add('enemy_shikki', 34, 44, (c) => {
    drawJiangshi(c, 34, 44, {
      robe: '#4a5468', skin: '#8a9aa8', hat: '#2a3242', hatBall: '#8a95a8', eyes: '#9fd8ff',
      extra: (c2) => {
        // 尸傀：身上捆着符咒绳线
        c2.strokeStyle = '#c9b98a';
        c2.lineWidth = 1.4;
        c2.beginPath();
        c2.moveTo(10, 20);
        c2.lineTo(24, 26);
        c2.moveTo(24, 20);
        c2.lineTo(10, 26);
        c2.stroke();
      },
    });
  });

  // ---- Boss：旱魃 ----
  add('enemy_hangu', 66, 76, (c) => {
    const cx = 33;
    // 焰状散发
    c.fillStyle = '#c23b2a';
    for (const [dx, h2] of [[-22, 14], [-14, 22], [-6, 26], [4, 24], [12, 18], [20, 12]] as const) {
      c.beginPath();
      c.moveTo(cx + dx * 0.5, 16);
      c.lineTo(cx + dx, 16 + h2);
      c.lineTo(cx + dx * 0.2, 20 + h2 * 0.4);
      c.closePath();
      c.fill();
    }
    // 王袍
    c.beginPath();
    c.moveTo(cx - 16, 30);
    c.lineTo(cx + 16, 30);
    c.lineTo(cx + 26, 73);
    c.lineTo(cx - 26, 73);
    c.closePath();
    fillStroke(c, '#7a2430');
    // 金纹缘边
    c.strokeStyle = '#d8b74a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx - 23, 70);
    c.lineTo(cx + 23, 70);
    c.stroke();
    // 双臂前伸（爪）
    c.beginPath();
    rr(c, 2, 32, 24, 8, 4);
    fillStroke(c, '#5c2a34');
    c.beginPath();
    rr(c, 40, 32, 24, 8, 4);
    fillStroke(c, '#5c2a34');
    // 头
    ell(c, cx, 20, 14, 12.5);
    fillStroke(c, '#b8848a');
    // 眼（赤红）
    c.fillStyle = '#ff3b2a';
    c.fillRect(cx - 8, 17, 5, 4);
    c.fillRect(cx + 3, 17, 5, 4);
    c.fillStyle = '#2a0c0c';
    c.fillRect(cx - 6.4, 18, 1.8, 1.8);
    c.fillRect(cx + 4.6, 18, 1.8, 1.8);
    // 额封大符
    c.save();
    c.translate(cx + 5, 24);
    c.rotate(0.3);
    c.fillStyle = '#f0dc8a';
    c.fillRect(-4, -8, 8, 16);
    c.strokeStyle = '#c23b3b';
    c.lineWidth = 1.4;
    c.strokeRect(-2.6, -5, 5.2, 9);
    c.restore();
    // 高冠
    c.fillStyle = '#3a2430';
    c.beginPath();
    c.moveTo(cx - 13, 11);
    c.lineTo(cx + 13, 11);
    c.lineTo(cx + 7, -2);
    c.lineTo(cx - 7, -2);
    c.closePath();
    fillStroke(c, '#3a2430');
    ell(c, cx, 0, 3.4, 3.4);
    fillStroke(c, '#d8b74a');
  });

  // ---- Boss：尸王 ----
  add('enemy_shiwang', 84, 92, (c) => {
    const cx = 42;
    // 披风
    c.beginPath();
    c.moveTo(cx - 26, 34);
    c.lineTo(cx + 26, 34);
    c.lineTo(cx + 36, 88);
    c.lineTo(cx - 36, 88);
    c.closePath();
    fillStroke(c, '#2f3a4e');
    // 巨臂
    c.beginPath();
    rr(c, 1, 38, 30, 12, 6);
    fillStroke(c, '#4a5a48');
    c.beginPath();
    rr(c, 53, 38, 30, 12, 6);
    fillStroke(c, '#4a5a48');
    // 躯干
    ell(c, cx, 58, 22, 26);
    fillStroke(c, '#5a6b58');
    // 胸口符印
    c.fillStyle = '#f0dc8a';
    c.save();
    c.translate(cx, 56);
    c.rotate(0.1);
    c.fillRect(-6, -12, 12, 24);
    c.strokeStyle = '#c23b3b';
    c.lineWidth = 1.6;
    c.strokeRect(-4, -8, 8, 15);
    c.restore();
    // 头
    ell(c, cx, 22, 16, 14);
    fillStroke(c, '#7a9578');
    // 獠牙大口
    c.beginPath();
    ell(c, cx, 30, 9, 4.5);
    fillStroke(c, '#2c1f1f');
    c.fillStyle = '#e8e4d8';
    c.fillRect(cx - 7, 26.4, 3, 4.4);
    c.fillRect(cx + 4, 26.4, 3, 4.4);
    // 凶目
    c.fillStyle = '#ffd84a';
    c.fillRect(cx - 10, 18, 6, 4.4);
    c.fillRect(cx + 4, 18, 6, 4.4);
    c.fillStyle = '#20180c';
    c.fillRect(cx - 8, 19.2, 2.4, 2.4);
    c.fillRect(cx + 5.6, 19.2, 2.4, 2.4);
    // 金冠
    c.fillStyle = '#d8b74a';
    c.beginPath();
    c.moveTo(cx - 16, 10);
    c.lineTo(cx - 16, 2);
    c.lineTo(cx - 10, 6);
    c.lineTo(cx - 5, 0);
    c.lineTo(cx, 6);
    c.lineTo(cx + 5, 0);
    c.lineTo(cx + 10, 6);
    c.lineTo(cx + 16, 2);
    c.lineTo(cx + 16, 10);
    c.closePath();
    fillStroke(c, '#d8b74a', '#7a5c1c', 1.6);
  });
}

// ---------------------------------------------------------------- 弹幕

function buildProjectiles(scene: Phaser.Scene, add: Adder): void {
  void scene;

  add('proj_talisman', 18, 28, (c) => {
    c.fillStyle = '#f0dc8a';
    rr(c, 2, 1, 14, 26, 2);
    fillStroke(c, '#f0dc8a', '#8a6c1c', 1.6);
    c.strokeStyle = '#c23b3b';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(5, 5);
    c.lineTo(13, 9);
    c.moveTo(5, 12);
    c.lineTo(13, 16);
    c.moveTo(6, 20);
    c.lineTo(12, 23);
    c.stroke();
  });

  add('proj_coin', 26, 26, (c) => {
    ell(c, 13, 13, 10, 10);
    fillStroke(c, '#e8c33c', '#7a5c14', 2);
    c.fillStyle = '#7a5c14';
    c.fillRect(10, 10, 6, 6);
    // 方孔钱外缘亮线
    c.strokeStyle = '#f7e8a8';
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(13, 13, 7.6, Math.PI * 0.4, Math.PI * 1.4);
    c.stroke();
  });

  add('proj_fireball', 20, 20, (c) => {
    ell(c, 10, 11, 7, 7.5);
    fillStroke(c, '#ff7a3c', '#a83c14', 2);
    ell(c, 10, 12, 3.6, 4);
    c.fillStyle = '#ffd84a';
    c.fill();
    // 尾焰
    c.beginPath();
    c.moveTo(6, 4);
    c.quadraticCurveTo(3, 1, 8, 2.4);
    c.closePath();
    c.fillStyle = '#ffb03c';
    c.fill();
  });

  add('proj_ink', 24, 24, (c) => {
    // 墨刃：弯月形
    c.beginPath();
    c.arc(12, 12, 10, Math.PI * 0.15, Math.PI * 0.95, false);
    c.arc(12, 12, 4.5, Math.PI * 0.95, Math.PI * 0.15, true);
    c.closePath();
    fillStroke(c, '#3a3f5c', '#141826', 1.6);
    c.strokeStyle = 'rgba(159,216,255,0.7)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(12, 12, 8, Math.PI * 0.3, Math.PI * 0.7);
    c.stroke();
  });

  add('proj_fire', 24, 26, (c) => {
    // 火符：黄符裹焰，拖一条火尾
    c.beginPath();
    c.moveTo(2, 6);
    c.quadraticCurveTo(9, 10, 12, 13);
    c.quadraticCurveTo(9, 16, 3, 18);
    c.closePath();
    c.fillStyle = 'rgba(255,122,60,0.75)';
    c.fill();
    c.fillStyle = '#f0dc8a';
    rr(c, 8, 4, 10, 18, 2);
    fillStroke(c, '#f0dc8a', '#a8441c', 1.6);
    c.strokeStyle = '#c23b3b';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(10, 8); c.lineTo(16, 11);
    c.moveTo(10, 14); c.lineTo(16, 17);
    c.stroke();
    // 符头火苗
    ell(c, 13, 5, 4, 3);
    c.fillStyle = '#ffb03c';
    c.fill();
    ell(c, 13, 4, 2, 1.6);
    c.fillStyle = '#ffe9a0';
    c.fill();
  });

  add('proj_wand', 20, 20, (c) => {
    // 星火：四芒星 + 白芯
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 9 : 3.4;
      const x = 10 + Math.cos(a) * r;
      const y = 10 + Math.sin(a) * r;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
    fillStroke(c, '#ffd84a', '#a86c1c', 1.4);
    ell(c, 10, 10, 2.6, 2.6);
    c.fillStyle = '#fff8dc';
    c.fill();
  });

  add('proj_curse', 22, 22, (c) => {
    // 咒火：紫焰幽球 + 白芯眼
    ell(c, 11, 11, 8, 9);
    fillStroke(c, '#6a3a9a', '#2a1244', 1.8);
    ell(c, 11, 12, 4.6, 5.2);
    c.fillStyle = '#9a5ac8';
    c.fill();
    ell(c, 11, 11, 2, 2.4);
    c.fillStyle = '#e8d0ff';
    c.fill();
    // 上蹿火苗
    c.beginPath();
    c.moveTo(8, 3);
    c.quadraticCurveTo(11, -2, 14, 3);
    c.quadraticCurveTo(11, 5, 8, 3);
    c.closePath();
    c.fillStyle = '#b87ae8';
    c.fill();
  });

  // 桃木剑（环绕弹幕体）
  add('fx_sword', 34, 10, (c) => {
    c.beginPath();
    rr(c, 2, 3, 24, 4, 2);
    fillStroke(c, '#c88a5a', '#5c3a22', 1.6);
    // 剑尖
    c.beginPath();
    c.moveTo(26, 2);
    c.lineTo(33, 5);
    c.lineTo(26, 8);
    c.closePath();
    fillStroke(c, '#e8b088', '#5c3a22', 1.4);
    // 剑格与柄
    c.fillStyle = '#d8b74a';
    c.fillRect(7, 1, 3, 8);
    c.fillStyle = '#6b4a2c';
    c.fillRect(1, 3, 6, 4);
    c.strokeStyle = 'rgba(255,220,140,0.8)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(10, 4);
    c.lineTo(24, 4);
    c.stroke();
  });
}

// ---------------------------------------------------------------- 拾取物

function buildPickups(scene: Phaser.Scene, add: Adder): void {
  void scene;

  // 魂魄（经验）：青蓝鬼火
  add('pickup_xp', 16, 18, (c) => {
    c.beginPath();
    c.moveTo(8, 1);
    c.quadraticCurveTo(14, 8, 11, 13);
    c.quadraticCurveTo(10, 17, 8, 17);
    c.quadraticCurveTo(6, 17, 5, 13);
    c.quadraticCurveTo(2, 8, 8, 1);
    c.closePath();
    fillStroke(c, '#7fd0ff', '#2a5c8a', 1.6);
    ell(c, 8, 11, 3, 3.6);
    c.fillStyle = '#e8f7ff';
    c.fill();
  });

  // 血馒头（回血）
  add('pickup_heal', 20, 20, (c) => {
    ell(c, 10, 12, 8.5, 6.5);
    fillStroke(c, '#e8e0d0', '#8a6c5a', 1.8);
    ell(c, 10, 7, 6, 4);
    fillStroke(c, '#f5eee0', '#8a6c5a', 1.6);
    c.fillStyle = '#d84a3a';
    ell(c, 10, 7, 1.8, 1.4);
    c.fill();
    // 冒出的热气
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(7, 3.4);
    c.quadraticCurveTo(9, 1, 7, -0.5 + 2);
    c.stroke();
  });

  // 爆竹（清屏）
  add('pickup_bomb', 20, 26, (c) => {
    c.fillStyle = '#c23b2a';
    for (const dx of [-5, 0, 5]) {
      rr(c, 6 + dx, 6, 4.6, 16, 2);
      fillStroke(c, '#c23b2a', '#6c1c12', 1.4);
      c.fillStyle = '#f0dc8a';
      c.fillRect(6.8 + dx, 20, 3, 2);
      c.fillStyle = '#c23b2a';
    }
    c.strokeStyle = '#8a6c1c';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(10, 6);
    c.quadraticCurveTo(10, 2, 13, 2);
    c.stroke();
  });
}

// ---------------------------------------------------------------- 场景装饰

function buildDecor(scene: Phaser.Scene, add: Adder): void {
  void scene;

  add('decor_tombstone', 34, 40, (c) => {
    // 墓碑
    c.beginPath();
    c.moveTo(6, 39);
    c.lineTo(6, 12);
    c.quadraticCurveTo(6, 2, 17, 2);
    c.quadraticCurveTo(28, 2, 28, 12);
    c.lineTo(28, 39);
    c.closePath();
    fillStroke(c, '#5a6058', '#1a201a', 2);
    // 碑文
    c.strokeStyle = 'rgba(20,26,20,0.7)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(17, 8);
    c.lineTo(17, 30);
    c.moveTo(12, 14);
    c.lineTo(22, 14);
    c.moveTo(12, 20);
    c.lineTo(22, 20);
    c.stroke();
    // 底座
    c.fillStyle = '#464c44';
    c.fillRect(2, 35, 30, 5);
  });

  add('decor_pine', 52, 72, (c) => {
    // 孤松：三层塔冠 + 曲干
    c.strokeStyle = '#3a3230';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(26, 70);
    c.quadraticCurveTo(24, 52, 27, 40);
    c.stroke();
    const layer = (y: number, w: number) => {
      c.beginPath();
      c.moveTo(26, y);
      c.lineTo(26 - w, y + 16);
      c.lineTo(26 + w, y + 16);
      c.closePath();
      fillStroke(c, '#2c4434', '#14201a', 2);
    };
    layer(4, 10);
    layer(20, 15);
    layer(38, 19);
  });

  add('decor_lantern', 22, 36, (c) => {
    // 石灯：柱 + 灯室 + 暖光
    c.fillStyle = '#4a5048';
    c.fillRect(8, 20, 6, 15);
    c.strokeStyle = '#1a201a';
    c.strokeRect(8, 20, 6, 15);
    c.beginPath();
    rr(c, 3, 10, 16, 11, 2);
    fillStroke(c, '#5a6058', '#1a201a', 2);
    c.fillStyle = '#ffd88a';
    c.fillRect(7, 13, 8, 6);
    c.beginPath();
    c.moveTo(1, 10);
    c.lineTo(21, 10);
    c.lineTo(17, 4);
    c.lineTo(5, 4);
    c.closePath();
    fillStroke(c, '#464c44', '#1a201a', 2);
  });

  // 边界界碑（arena 边缘柱）
  add('decor_pillar', 18, 46, (c) => {
    c.beginPath();
    rr(c, 3, 4, 12, 40, 3);
    fillStroke(c, '#3e443c', '#141a14', 2);
    c.strokeStyle = 'rgba(232,228,216,0.35)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(9, 10);
    c.lineTo(9, 36);
    c.stroke();
    c.fillStyle = '#5a6058';
    c.fillRect(1, 42, 16, 4);
  });

  // 灵犬（猎人道途宠物）
  add('pet_hound', 34, 26, (c) => {
    // 尾巴
    c.beginPath();
    c.moveTo(5, 12);
    c.quadraticCurveTo(-2, 8, 1, 3);
    c.quadraticCurveTo(4, 8, 8, 9);
    c.closePath();
    fillStroke(c, '#8a7458', OUTLINE, 1.6);
    // 身体
    ell(c, 16, 14, 11, 7);
    fillStroke(c, '#a8906c', OUTLINE, 1.8);
    // 四腿（奔跑姿）
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.4;
    for (const [x, tilt] of [[9, -1], [14, 1], [20, -1], [24, 1]] as const) {
      c.beginPath();
      c.moveTo(x, 19);
      c.lineTo(x + tilt * 2, 25);
      c.stroke();
    }
    // 头 + 竖耳
    ell(c, 27, 9, 6, 5.5);
    fillStroke(c, '#a8906c', OUTLINE, 1.8);
    c.beginPath();
    c.moveTo(24, 4);
    c.lineTo(22.5, -2);
    c.lineTo(27, 2);
    c.closePath();
    fillStroke(c, '#6b5a42', OUTLINE, 1.2);
    // 吻部与红眼
    ell(c, 32.4, 10.5, 2.4, 1.8);
    fillStroke(c, '#c8b090', OUTLINE, 1.2);
    c.fillStyle = '#d84343';
    ell(c, 28.6, 8, 1.5, 1.5);
    c.fill();
    // 项圈铜铃
    c.strokeStyle = '#c23b3b';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(22, 5);
    c.quadraticCurveTo(23, 11, 21.5, 14);
    c.stroke();
  });
}

// ---------------------------------------------------------------- 图标（卡片/背包栏）

interface IconSpec {
  key: string;
  bg: string;
  draw: (c: Ctx) => void;
}

function buildIcons(scene: Phaser.Scene, add: Adder): void {
  void scene;

  const frame = (c: Ctx, bg: string) => {
    c.beginPath();
    rr(c, 1, 1, 30, 30, 7);
    fillStroke(c, bg, OUTLINE, 2);
  };

  const specs: IconSpec[] = [
    {
      key: 'icon_talisman', bg: '#4a4232',
      draw: (c) => {
        c.fillStyle = '#f0dc8a';
        rr(c, 11, 4, 10, 24, 2);
        c.fill();
        c.strokeStyle = '#c23b3b';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(13, 9); c.lineTo(19, 13);
        c.moveTo(13, 15); c.lineTo(19, 19);
        c.stroke();
      },
    },
    {
      key: 'icon_sword', bg: '#503c2c',
      draw: (c) => {
        c.save();
        c.translate(16, 16);
        c.rotate(-Math.PI / 4);
        c.fillStyle = '#e8b088';
        c.beginPath();
        c.moveTo(-3, -14); c.lineTo(3, -14); c.lineTo(2, 6); c.lineTo(-2, 6);
        c.closePath();
        fillStroke(c, '#e8b088', '#5c3a22', 1.4);
        c.fillStyle = '#d8b74a';
        c.fillRect(-6, 6, 12, 3);
        c.fillStyle = '#6b4a2c';
        c.fillRect(-2, 9, 4, 6);
        c.restore();
      },
    },
    {
      key: 'icon_rice', bg: '#3e4432',
      draw: (c) => {
        c.fillStyle = '#f0e8d0';
        const dots = [[16, 10], [10, 16], [22, 16], [13, 22], [19, 22], [16, 16]];
        for (const [x, y] of dots) {
          ell(c, x, y, 3.4, 3);
          fillStroke(c, '#f0e8d0', '#8a8264', 1.2);
        }
      },
    },
    {
      key: 'icon_coin', bg: '#4a4228',
      draw: (c) => {
        ell(c, 16, 16, 10, 10);
        fillStroke(c, '#e8c33c', '#7a5c14', 2);
        c.fillStyle = '#4a4228';
        c.fillRect(12.5, 12.5, 7, 7);
      },
    },
    {
      key: 'icon_mirror', bg: '#2c3a4a',
      draw: (c) => {
        // 八边形宝镜
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          const x = 16 + Math.cos(a) * 12;
          const y = 16 + Math.sin(a) * 12;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.closePath();
        fillStroke(c, '#9fd8ff', '#2a5c8a', 2);
        c.strokeStyle = '#e8f7ff';
        c.lineWidth = 1.4;
        c.beginPath();
        c.arc(16, 16, 6, 0, Math.PI * 2);
        c.stroke();
      },
    },
    {
      key: 'icon_bell', bg: '#3c3450',
      draw: (c) => {
        c.beginPath();
        c.moveTo(8, 22);
        c.quadraticCurveTo(8, 8, 16, 7);
        c.quadraticCurveTo(24, 8, 24, 22);
        c.closePath();
        fillStroke(c, '#c9a2ff', '#5c3a8a', 1.8);
        c.fillRect(6, 22, 20, 3);
        ell(c, 16, 27, 2.4, 2);
        fillStroke(c, '#c9a2ff', '#5c3a8a', 1.2);
      },
    },
    {
      key: 'icon_thunder', bg: '#2c3a50',
      draw: (c) => {
        c.beginPath();
        c.moveTo(18, 3);
        c.lineTo(9, 17);
        c.lineTo(15, 17);
        c.lineTo(12, 29);
        c.lineTo(23, 13);
        c.lineTo(16, 13);
        c.closePath();
        fillStroke(c, '#8fd3ff', '#2a5c8a', 1.6);
      },
    },
    {
      key: 'icon_ink', bg: '#26283a',
      draw: (c) => {
        c.strokeStyle = '#8a90c0';
        c.lineWidth = 3.4;
        c.beginPath();
        c.arc(16, 16, 9, 0, Math.PI * 1.4);
        c.stroke();
        c.strokeStyle = '#5a5f8c';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(16, 16, 4, Math.PI, Math.PI * 2.3);
        c.stroke();
      },
    },
    {
      key: 'icon_fire', bg: '#4a2418',
      draw: (c) => {
        c.fillStyle = '#f0dc8a';
        rr(c, 11, 5, 10, 22, 2);
        fillStroke(c, '#f0dc8a', '#a8441c', 1.6);
        c.strokeStyle = '#c23b3b';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(13, 10); c.lineTo(19, 14);
        c.moveTo(13, 17); c.lineTo(19, 21);
        c.stroke();
        c.beginPath();
        c.moveTo(16, 1);
        c.quadraticCurveTo(21, 4, 16, 7);
        c.quadraticCurveTo(12, 4, 16, 1);
        c.closePath();
        fillStroke(c, '#ff9a3c', '#a8441c', 1.2);
      },
    },
    {
      key: 'icon_spark', bg: '#1c2c44',
      draw: (c) => {
        c.beginPath();
        c.moveTo(20, 4);
        c.lineTo(12, 15);
        c.lineTo(17, 15);
        c.lineTo(11, 28);
        c.lineTo(23, 13);
        c.lineTo(17, 13);
        c.closePath();
        fillStroke(c, '#8fd3ff', '#2a5c8a', 1.6);
        c.strokeStyle = '#e8f7ff';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(8, 6);
        c.lineTo(11, 10);
        c.moveTo(23, 22);
        c.lineTo(20, 19);
        c.stroke();
      },
    },
    {
      key: 'icon_guandao', bg: '#1e3428',
      draw: (c) => {
        // 关刀剪影：长杆 + 弯月刃 + 红缨
        c.strokeStyle = '#6b4a2c';
        c.lineWidth = 3.4;
        c.beginPath();
        c.moveTo(9, 29);
        c.lineTo(19, 9);
        c.stroke();
        c.beginPath();
        c.moveTo(14, 3);
        c.quadraticCurveTo(28, 6, 26, 16);
        c.quadraticCurveTo(20, 13, 17, 8);
        c.closePath();
        fillStroke(c, '#bfe8d0', '#2a5c40', 1.6);
        // 背刺
        c.beginPath();
        c.moveTo(15, 8);
        c.lineTo(11, 12);
        c.lineTo(14, 12);
        c.closePath();
        fillStroke(c, '#bfe8d0', '#2a5c40', 1.2);
        ell(c, 15, 9, 2, 2);
        c.fillStyle = '#c23b3b';
        c.fill();
      },
    },
    {
      key: 'icon_wand', bg: '#3a2c14',
      draw: (c) => {
        c.strokeStyle = '#8a5c3a';
        c.lineWidth = 3.4;
        c.beginPath();
        c.moveTo(7, 29);
        c.lineTo(20, 12);
        c.stroke();
        c.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? 7 : 2.6;
          const x = 21 + Math.cos(a) * r;
          const y = 9 + Math.sin(a) * r;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.closePath();
        fillStroke(c, '#ffd84a', '#a86c1c', 1.4);
      },
    },
    {
      key: 'icon_kuijia', bg: '#2c3038',
      draw: (c) => {
        // 甲胄：胸甲片 + 铆钉
        c.beginPath();
        c.moveTo(16, 5);
        c.lineTo(26, 9);
        c.lineTo(25, 19);
        c.quadraticCurveTo(23, 26, 16, 29);
        c.quadraticCurveTo(9, 26, 7, 19);
        c.lineTo(7, 9);
        c.closePath();
        fillStroke(c, '#8a95a8', '#2a303a', 2);
        c.strokeStyle = '#3e4654';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(16, 9);
        c.lineTo(16, 27);
        c.moveTo(9, 15);
        c.lineTo(23, 15);
        c.stroke();
        c.fillStyle = '#3e4654';
        for (const [x, y] of [[10, 11], [22, 11], [12, 22], [20, 22]] as const) {
          ell(c, x, y, 1.6, 1.6);
          c.fill();
        }
      },
    },
    {
      key: 'icon_bow', bg: '#3a3424',
      draw: (c) => {
        // 弓身 + 弦 + 搭箭
        c.strokeStyle = '#8a5c3a';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(12, 16, 12, -Math.PI * 0.42, Math.PI * 0.42);
        c.stroke();
        c.strokeStyle = '#e8e4d8';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(17, 5);
        c.lineTo(17, 27);
        c.stroke();
        c.strokeStyle = '#c8a86a';
        c.lineWidth = 2.4;
        c.beginPath();
        c.moveTo(8, 16);
        c.lineTo(26, 16);
        c.stroke();
        c.beginPath();
        c.moveTo(26, 16);
        c.lineTo(21, 13);
        c.moveTo(26, 16);
        c.lineTo(21, 19);
        c.stroke();
      },
    },
    {
      key: 'icon_curse', bg: '#2a1a3e',
      draw: (c) => {
        // 骷髅咒符
        ell(c, 16, 13, 8, 7.5);
        fillStroke(c, '#c8b8d8', '#3a2450', 1.8);
        c.fillStyle = '#3a2450';
        ell(c, 12.6, 12, 2.2, 2.6);
        c.fill();
        ell(c, 19.4, 12, 2.2, 2.6);
        c.fill();
        c.fillRect(15, 17, 2, 2.4);
        // 下颚牙
        c.fillStyle = '#c8b8d8';
        c.fillRect(12, 19.5, 8, 3);
        c.strokeStyle = '#3a2450';
        c.lineWidth = 1;
        for (const x of [14, 16, 18]) {
          c.beginPath();
          c.moveTo(x, 19.5);
          c.lineTo(x, 22.5);
          c.stroke();
        }
        // 双角小符
        c.strokeStyle = '#9a5ac8';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(10, 7);
        c.quadraticCurveTo(8, 3, 11, 2);
        c.moveTo(22, 7);
        c.quadraticCurveTo(24, 3, 21, 2);
        c.stroke();
      },
    },
    {
      key: 'icon_gold', bg: '#3e3418',
      draw: (c) => {
        ell(c, 16, 16, 11, 11);
        fillStroke(c, '#e8c33c', '#7a5c14', 2);
        c.fillStyle = '#3e3418';
        c.fillRect(12, 12, 8, 8);
        c.strokeStyle = '#f7e8a8';
        c.lineWidth = 1.4;
        c.beginPath();
        c.arc(16, 16, 8, Math.PI * 0.4, Math.PI * 1.4);
        c.stroke();
      },
    },
    {
      key: 'icon_hammer', bg: '#1e3428',
      draw: (c) => {
        // 雷纹巨锤：斜柄 + 方锤头 + 雷纹
        c.strokeStyle = '#6b4a2c';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(7, 28);
        c.lineTo(18, 14);
        c.stroke();
        c.beginPath();
        rr(c, 14, 2, 14, 14, 2);
        fillStroke(c, '#8a9aa8', '#2a3644', 2);
        c.strokeStyle = '#8fd3ff';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(18, 5);
        c.lineTo(22, 9);
        c.lineTo(18, 9);
        c.lineTo(23, 13);
        c.stroke();
      },
    },
    {
      key: 'icon_staff_mage', bg: '#14283c',
      draw: (c) => {
        // 法师杖：杖身 + 顶部冰晶
        c.strokeStyle = '#5c4a2c';
        c.lineWidth = 3.4;
        c.beginPath();
        c.moveTo(8, 29);
        c.lineTo(20, 13);
        c.stroke();
        // 冰晶（六角雪花）
        c.strokeStyle = '#bfe8ff';
        c.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          c.beginPath();
          c.moveTo(21, 9);
          c.lineTo(21 + Math.cos(a) * 8, 9 + Math.sin(a) * 8);
          c.stroke();
        }
        ell(c, 21, 9, 2.6, 2.6);
        c.fillStyle = '#f0fbff';
        c.fill();
      },
    },
    {
      key: 'icon_staff_summon', bg: '#22301c',
      draw: (c) => {
        // 召唤师杖：杖身 + 顶部小骷髅
        c.strokeStyle = '#4a3e2c';
        c.lineWidth = 3.4;
        c.beginPath();
        c.moveTo(9, 29);
        c.lineTo(19, 12);
        c.stroke();
        ell(c, 18, 8, 6, 5.5);
        fillStroke(c, '#d8d0c0', '#3a3226', 1.6);
        c.fillStyle = '#3a3226';
        ell(c, 15.8, 7, 1.6, 2);
        c.fill();
        ell(c, 20.2, 7, 1.6, 2);
        c.fill();
        c.fillRect(16.4, 11, 3.2, 2);
      },
    },
    {
      key: 'icon_godslayer', bg: '#3a2c10',
      draw: (c) => {
        // 弑神枪：斜置金枪 + 缨穗
        c.save();
        c.translate(16, 16);
        c.rotate(-Math.PI / 4);
        c.beginPath();
        c.moveTo(-2.6, -14);
        c.lineTo(2.6, -14);
        c.lineTo(1.4, 12);
        c.lineTo(-1.4, 12);
        c.closePath();
        fillStroke(c, '#ffd24a', '#8a6414', 1.6);
        // 枪尖
        c.beginPath();
        c.moveTo(-3.4, -13);
        c.lineTo(0, -15 + 0.01);
        c.lineTo(3.4, -13);
        c.lineTo(0, -5);
        c.closePath();
        fillStroke(c, '#fff0b0', '#8a6414', 1.2);
        // 枪杆纹
        c.strokeStyle = '#8a6414';
        c.lineWidth = 1;
        for (const y of [0, 4, 8]) {
          c.beginPath();
          c.moveTo(-1.4, y);
          c.lineTo(1.4, y);
          c.stroke();
        }
        // 红缨
        c.fillStyle = '#d84343';
        ell(c, 0, 13, 3, 2.4);
        c.fill();
        c.restore();
      },
    },
    {
      key: 'icon_robe', bg: '#2c3a4a',
      draw: (c) => {
        c.beginPath();
        c.moveTo(10, 6);
        c.lineTo(22, 6);
        c.lineTo(25, 28);
        c.lineTo(7, 28);
        c.closePath();
        fillStroke(c, '#5d8aa8', '#1a2c3a', 1.8);
        c.strokeStyle = '#e8e4d8';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(16, 6);
        c.lineTo(16, 28);
        c.stroke();
      },
    },
    {
      key: 'icon_shoes', bg: '#443c2c',
      draw: (c) => {
        c.beginPath();
        rr(c, 6, 14, 9, 10, 3);
        fillStroke(c, '#b8a06a', '#4a3c20', 1.6);
        c.beginPath();
        rr(c, 17, 14, 9, 10, 3);
        fillStroke(c, '#b8a06a', '#4a3c20', 1.6);
        c.strokeStyle = '#4a3c20';
        c.lineWidth = 1.2;
        for (const x of [8, 11, 19, 22]) {
          c.beginPath();
          c.moveTo(x, 16);
          c.lineTo(x, 22);
          c.stroke();
        }
      },
    },
    {
      key: 'icon_cinnabar', bg: '#4a2c2c',
      draw: (c) => {
        c.save();
        c.translate(16, 16);
        c.rotate(Math.PI / 4);
        c.fillStyle = '#8a5c3a';
        c.fillRect(-2, -2, 4, 14);
        c.beginPath();
        c.moveTo(-4, -2);
        c.lineTo(0, -12);
        c.lineTo(4, -2);
        c.closePath();
        fillStroke(c, '#d23c3c', '#5c1c1c', 1.4);
        c.restore();
      },
    },
    {
      key: 'icon_bronze_bell', bg: '#3c3450',
      draw: (c) => {
        c.beginPath();
        c.moveTo(9, 23);
        c.quadraticCurveTo(9, 9, 16, 8);
        c.quadraticCurveTo(23, 9, 23, 23);
        c.closePath();
        fillStroke(c, '#d8b74a', '#7a5c1c', 1.8);
        c.fillRect(7, 23, 18, 3);
        c.fillStyle = '#7a5c1c';
        c.fillRect(15, 4, 2, 4);
      },
    },
    {
      key: 'icon_yinyang', bg: '#2c4438',
      draw: (c) => {
        ell(c, 16, 16, 11, 11);
        fillStroke(c, '#e8e4d8', '#1a201a', 1.6);
        c.fillStyle = '#2a3230';
        c.beginPath();
        c.arc(16, 16, 11, Math.PI / 2, Math.PI * 1.5);
        c.quadraticCurveTo(16, 16 - 5.5, 16, 16);
        c.quadraticCurveTo(16, 16 + 5.5, 5 + 16 - 11 - 5, 16 + 11);
        c.closePath();
        c.fill();
        ell(c, 16, 10.5, 2, 2);
        c.fillStyle = '#e8e4d8';
        c.fill();
        ell(c, 16, 21.5, 2, 2);
        c.fillStyle = '#2a3230';
        c.fill();
      },
    },
    {
      key: 'icon_gourd', bg: '#3e3a2c',
      draw: (c) => {
        ell(c, 16, 21, 7.5, 7);
        fillStroke(c, '#d8b25c', '#6c5220', 1.8);
        ell(c, 16, 11, 5, 5);
        fillStroke(c, '#d8b25c', '#6c5220', 1.8);
        c.strokeStyle = '#4a6c2c';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(16, 6);
        c.quadraticCurveTo(19, 3, 22, 4);
        c.stroke();
        c.strokeStyle = '#8a6c2c';
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(16, 16);
        c.lineTo(16, 19);
        c.stroke();
      },
    },
    {
      key: 'icon_scripture', bg: '#443e2c',
      draw: (c) => {
        c.beginPath();
        rr(c, 7, 6, 18, 20, 2);
        fillStroke(c, '#e8d28a', '#6c5a24', 1.8);
        c.strokeStyle = '#8a7434';
        c.lineWidth = 1.2;
        for (const y of [11, 15, 19]) {
          c.beginPath();
          c.moveTo(10, y);
          c.lineTo(22, y);
          c.stroke();
        }
        c.fillStyle = '#c23b3b';
        ell(c, 16, 23, 1.8, 1.8);
        c.fill();
      },
    },
    {
      key: 'icon_armor', bg: '#2c3a4a',
      draw: (c) => {
        c.beginPath();
        c.moveTo(16, 4);
        c.lineTo(27, 9);
        c.quadraticCurveTo(26, 22, 16, 28);
        c.quadraticCurveTo(6, 22, 5, 9);
        c.closePath();
        fillStroke(c, '#9fd8ff', '#2a5c8a', 1.8);
        c.strokeStyle = '#e8f7ff';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(16, 9);
        c.lineTo(16, 24);
        c.moveTo(10, 13);
        c.lineTo(22, 13);
        c.stroke();
      },
    },
    {
      key: 'icon_heal', bg: '#2c4434',
      draw: (c) => {
        c.beginPath();
        rr(c, 13, 7, 6, 18, 2);
        fillStroke(c, '#7fd88f', '#2a5c3a', 1.4);
        c.beginPath();
        rr(c, 7, 13, 18, 6, 2);
        fillStroke(c, '#7fd88f', '#2a5c3a', 1.4);
      },
    },
    {
      key: 'icon_bomb', bg: '#4a2c2c',
      draw: (c) => {
        c.fillStyle = '#c23b2a';
        rr(c, 10, 10, 5, 16, 2);
        c.fill();
        rr(c, 17, 10, 5, 16, 2);
        c.fill();
        c.strokeStyle = '#6c1c12';
        c.lineWidth = 1.2;
        c.strokeRect(10, 10, 5, 16);
        c.strokeRect(17, 10, 5, 16);
        c.strokeStyle = '#8a6c1c';
        c.lineWidth = 1.6;
        c.beginPath();
        c.moveTo(16, 10);
        c.quadraticCurveTo(16, 5, 21, 4);
        c.stroke();
        // 火花
        c.fillStyle = '#ffd84a';
        ell(c, 23, 4, 2, 2);
        c.fill();
      },
    },
  ];

  for (const s of specs) {
    add(s.key, 32, 32, (c) => {
      frame(c, s.bg);
      c.save();
      c.translate(0, 0);
      s.draw(c);
      c.restore();
    });
  }
}

// ---------------------------------------------------------------- 关卡之门（风格猜谜：看门识路）

/**
 * 五扇门各有一套视觉语言，玩家靠风格猜门后：
 * 石门=寻常路 / 挂灯青木门=补给 / 爪痕黄门=小怪房 / 骷髅赤铁门=Boss / 钱币蓝门=冥品商店。
 * 刻意不写文字——门后的未知就是玩法。
 */
function buildDoors(scene: Phaser.Scene, add: Adder): void {
  void scene;
  const W = 132;
  const H = 200;

  /** 门框底子 */
  const frame = (c: Ctx, door: string, frameColor: string, skew = 0) => {
    c.save();
    if (skew !== 0) {
      c.translate(W / 2, H / 2);
      c.rotate(skew);
      c.translate(-W / 2, -H / 2);
    }
    // 门体
    c.beginPath();
    c.moveTo(10, H - 6);
    c.lineTo(10, 44);
    c.quadraticCurveTo(W / 2, 4, W - 10, 44);
    c.lineTo(W - 10, H - 6);
    c.closePath();
    fillStroke(c, door, OUTLINE, 3);
    // 门缝
    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(W / 2, 26);
    c.lineTo(W / 2, H - 12);
    c.stroke();
    c.restore();
    void frameColor;
  };

  // 下行之路：灰绿石门，朴素无奇
  add('door_next', W, H, (c) => {
    frame(c, '#4a5c50', '#2a3a30');
    c.strokeStyle = 'rgba(255,255,255,0.10)';
    c.lineWidth = 1.4;
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(18, 60 + i * 30);
      c.lineTo(W - 18, 64 + i * 30);
      c.stroke();
    }
    // 石苔
    c.fillStyle = 'rgba(90,140,90,0.30)';
    ell(c, 24, 50, 7, 4);
    c.fill();
    ell(c, W - 30, 150, 6, 3.4);
    c.fill();
  });

  // 补给站：青木门 + 挂灯笼 + 门边货袋
  add('door_supply', W, H, (c) => {
    frame(c, '#2e5c54', '#1a3a34');
    // 灯笼
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(W / 2, 8);
    c.lineTo(W / 2, 20);
    c.stroke();
    ell(c, W / 2, 30, 10, 11);
    fillStroke(c, '#ffb03c', '#8a4c1c', 2);
    ell(c, W / 2, 30, 4.5, 5);
    c.fillStyle = '#ffe08a';
    c.fill();
    // 货袋
    ell(c, 26, H - 24, 9, 10);
    fillStroke(c, '#c8b070', '#5c4a2c', 1.8);
    c.strokeStyle = '#5c4a2c';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(22, H - 34);
    c.quadraticCurveTo(26, H - 40, 30, H - 34);
    c.stroke();
  });

  // 小怪房：歪斜黄门 + 三道爪痕
  add('door_mob', W, H, (c) => {
    frame(c, '#8a7a2e', '#4a3e18', -0.05);
    // 爪痕
    c.strokeStyle = '#c23b2a';
    c.lineWidth = 3.4;
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(34 + i * 16, 58 + i * 6);
      c.lineTo(52 + i * 16, 132 + i * 6);
      c.stroke();
    }
    // 缺角
    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.moveTo(W - 28, H - 6);
    c.lineTo(W - 6, H - 30);
    c.lineTo(W - 6, H - 6);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = 'source-over';
    // 尖牙徽记
    c.fillStyle = '#e8e4d8';
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(38 + i * 12, 34);
      c.lineTo(43 + i * 12, 46);
      c.lineTo(48 + i * 12, 34);
      c.closePath();
      c.fill();
    }
  });

  // Boss 房：高大赤铁门 + 骷髅双角
  add('door_boss', W, H, (c) => {
    frame(c, '#3a1418', '#140508');
    // 铁箍
    c.fillStyle = '#1a0c0e';
    c.fillRect(10, 60, W - 20, 10);
    c.fillRect(10, 140, W - 20, 10);
    // 骷髅
    ell(c, W / 2, 92, 16, 14);
    fillStroke(c, '#d8d0c0', '#201014', 2);
    c.fillStyle = '#d84343';
    ell(c, W / 2 - 6.5, 90, 3.4, 4);
    c.fill();
    ell(c, W / 2 + 6.5, 90, 3.4, 4);
    c.fill();
    c.fillStyle = '#201014';
    c.fillRect(W / 2 - 4, 100, 8, 5);
    // 双角
    c.strokeStyle = '#e8d8b0';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(W / 2 - 14, 80);
    c.quadraticCurveTo(W / 2 - 26, 66, W / 2 - 20, 54);
    c.stroke();
    c.beginPath();
    c.moveTo(W / 2 + 14, 80);
    c.quadraticCurveTo(W / 2 + 26, 66, W / 2 + 20, 54);
    c.stroke();
    // 门缝红光
    c.strokeStyle = 'rgba(255,70,50,0.8)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(W / 2, 30);
    c.lineTo(W / 2, H - 10);
    c.stroke();
  });

  // 冥品商店：蓝漆钱庄门 + 方孔铜钱 + 布幌
  add('door_shop', W, H, (c) => {
    frame(c, '#1e3a5c', '#0e2036');
    // 布幌
    c.fillStyle = '#28486c';
    c.fillRect(18, 22, W - 36, 20);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 1.6;
    c.strokeRect(18, 22, W - 36, 20);
    // 铜钱徽记
    ell(c, W / 2, 88, 22, 22);
    fillStroke(c, '#e8c33c', '#7a5c14', 2.4);
    c.fillStyle = '#1e3a5c';
    c.fillRect(W / 2 - 6, 82, 12, 12);
    // 票号纹
    c.strokeStyle = '#9fd8ff';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(28, 132);
    c.lineTo(W - 28, 132);
    c.moveTo(28, 144);
    c.lineTo(W - 40, 144);
    c.stroke();
    // 坠铜钱
    c.strokeStyle = '#7a5c14';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(W - 22, 20);
    c.lineTo(W - 22, 44);
    c.stroke();
    ell(c, W - 22, 50, 6, 6);
    fillStroke(c, '#e8c33c', '#7a5c14', 1.6);
  });
}

// ---------------------------------------------------------------- 鬼面具（闯关页）

function buildMaskIcons(scene: Phaser.Scene, add: Adder): void {
  void scene;
  /** 鬼面通用画法：桃形面具 + 主题色 + 眼洞獠牙 */
  const maskFace = (c: Ctx, color: string, dark: string, deco: (c2: Ctx) => void) => {
    c.beginPath();
    c.moveTo(16, 3);
    c.quadraticCurveTo(29, 8, 27, 19);
    c.quadraticCurveTo(25, 28, 16, 29);
    c.quadraticCurveTo(7, 28, 5, 19);
    c.quadraticCurveTo(3, 8, 16, 3);
    c.closePath();
    fillStroke(c, color, OUTLINE, 2);
    // 眼洞
    c.fillStyle = '#1a0e12';
    ell(c, 11, 13, 3.2, 3.8);
    c.fill();
    ell(c, 21, 13, 3.2, 3.8);
    c.fill();
    // 嘴
    c.strokeStyle = '#1a0e12';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(11, 23);
    c.lineTo(21, 23);
    c.stroke();
    deco(c);
    void dark;
  };

  add('mask_rage', 32, 32, (c) => maskFace(c, '#a83c2a', '', (c2) => {
    c2.strokeStyle = '#1a0e12';
    c2.lineWidth = 1.4;
    c2.beginPath();
    c2.moveTo(9, 8);
    c2.lineTo(13, 11);
    c2.moveTo(23, 8);
    c2.lineTo(19, 11);
    c2.stroke();
  }));
  add('mask_guard', 32, 32, (c) => maskFace(c, '#4a7a5c', '', (c2) => {
    c2.strokeStyle = '#c8e0c8';
    c2.lineWidth = 1.4;
    c2.strokeRect(9, 18, 14, 7);
  }));
  add('mask_swift', 32, 32, (c) => maskFace(c, '#7ab8b8', '', (c2) => {
    c2.strokeStyle = '#e8ffff';
    c2.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      c2.beginPath();
      c2.moveTo(4 + i * 2, 10 + i * 5);
      c2.lineTo(14 + i * 2, 10 + i * 5);
      c2.stroke();
    }
  }));
  add('mask_vitality', 32, 32, (c) => maskFace(c, '#b8506e', '', (c2) => {
    c2.fillStyle = '#ffdce8';
    c2.beginPath();
    c2.moveTo(16, 9);
    c2.quadraticCurveTo(21, 15, 16, 20);
    c2.quadraticCurveTo(11, 15, 16, 9);
    c2.closePath();
    c2.fill();
  }));
  add('mask_fang', 32, 32, (c) => maskFace(c, '#3a3f5c', '', (c2) => {
    c2.fillStyle = '#e8e4d8';
    c2.beginPath();
    c2.moveTo(12, 23);
    c2.lineTo(14, 28);
    c2.lineTo(16, 23);
    c2.closePath();
    c2.fill();
    c2.beginPath();
    c2.moveTo(16, 23);
    c2.lineTo(18, 28);
    c2.lineTo(20, 23);
    c2.closePath();
    c2.fill();
  }));
  add('mask_greed', 32, 32, (c) => maskFace(c, '#b8923a', '', (c2) => {
    ell(c2, 11, 13, 2, 2.4);
    c2.fillStyle = '#ffe9a0';
    c2.fill();
    ell(c2, 21, 13, 2, 2.4);
    c2.fill();
    c2.strokeStyle = '#ffe9a0';
    c2.lineWidth = 1.4;
    c2.beginPath();
    c2.moveTo(12, 23);
    c2.lineTo(20, 23);
    c2.stroke();
  }));
}

// ---------------------------------------------------------------- 宝珠（鬼市独家道具）

function buildOrbIcons(scene: Phaser.Scene, add: Adder): void {
  void scene;

  /** 珠体底子：深色圆珠 + 高光 + 主题内焰 */
  const bead = (c: Ctx, color: string, glow: string, symbol: (c2: Ctx) => void) => {
    ell(c, 16, 16, 12, 12);
    fillStroke(c, color, OUTLINE, 2);
    ell(c, 16, 16, 8, 8);
    c.fillStyle = glow;
    c.fill();
    ell(c, 11.5, 11, 3, 3);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.fill();
    symbol(c);
  };

  add('orb_blood', 32, 32, (c) => {
    bead(c, '#5c1f1f', '#a83232', (c2) => {
      c2.fillStyle = '#ffb0a0';
      c2.beginPath();
      c2.moveTo(16, 21);
      c2.quadraticCurveTo(8, 14, 12, 10);
      c2.quadraticCurveTo(16, 7, 20, 10);
      c2.quadraticCurveTo(24, 14, 16, 21);
      c2.closePath();
      c2.fill();
    });
  });

  add('orb_thunder', 32, 32, (c) => {
    bead(c, '#1c3450', '#2a5c8a', (c2) => {
      c2.beginPath();
      c2.moveTo(18, 8);
      c2.lineTo(12, 17);
      c2.lineTo(16, 17);
      c2.lineTo(13, 25);
      c2.lineTo(21, 14);
      c2.lineTo(17, 14);
      c2.closePath();
      fillStroke(c2, '#bfe8ff', '#8fd3ff', 1.2);
    });
  });

  add('orb_ghost', 32, 32, (c) => {
    bead(c, '#1e3040', '#3a6c8a', (c2) => {
      // 小鬼火
      c2.beginPath();
      c2.moveTo(16, 8);
      c2.quadraticCurveTo(22, 14, 19, 20);
      c2.quadraticCurveTo(18, 25, 16, 25);
      c2.quadraticCurveTo(14, 25, 13, 20);
      c2.quadraticCurveTo(10, 14, 16, 8);
      c2.closePath();
      fillStroke(c2, '#b0e8ff', '#7fd0ff', 1.2);
      ell(c2, 16, 17, 2, 2.2);
      c2.fillStyle = '#f0fbff';
      c2.fill();
    });
  });

  add('orb_flame', 32, 32, (c) => {
    bead(c, '#5c2c14', '#a85c2a', (c2) => {
      c2.beginPath();
      c2.moveTo(16, 7);
      c2.quadraticCurveTo(23, 14, 20, 20);
      c2.quadraticCurveTo(18, 25, 16, 25);
      c2.quadraticCurveTo(14, 25, 12, 20);
      c2.quadraticCurveTo(9, 14, 16, 7);
      c2.closePath();
      c2.fillStyle = '#ff9a3c';
      c2.fill();
      ell(c2, 16, 19, 3, 3.6);
      c2.fillStyle = '#ffe08a';
      c2.fill();
    });
  });

  add('orb_wind', 32, 32, (c) => {
    bead(c, '#2a4030', '#4a8a5c', (c2) => {
      c2.strokeStyle = '#d8f8e0';
      c2.lineWidth = 2.2;
      c2.beginPath();
      c2.moveTo(8, 12);
      c2.quadraticCurveTo(18, 8, 24, 12);
      c2.stroke();
      c2.beginPath();
      c2.moveTo(9, 18);
      c2.quadraticCurveTo(19, 15, 25, 19);
      c2.stroke();
      c2.beginPath();
      c2.moveTo(11, 24);
      c2.quadraticCurveTo(18, 22, 22, 25);
      c2.stroke();
    });
  });
}

function buildFx(scene: Phaser.Scene, add: Adder): void {
  void scene;

  // 通用小圆点粒子
  add('fx_dot', 8, 8, (c) => {
    ell(c, 4, 4, 3.2, 3.2);
    c.fillStyle = '#e8e4d8';
    c.fill();
  });

  // 邪气烟雾团
  add('fx_smoke', 20, 20, (c) => {
    ell(c, 10, 10, 8, 8);
    c.fillStyle = 'rgba(40,48,44,0.85)';
    c.fill();
    ell(c, 7, 8, 4, 4);
    c.fillStyle = 'rgba(70,80,74,0.7)';
    c.fill();
  });

  // 天雷主柱
  add('fx_bolt', 36, 96, (c) => {
    c.strokeStyle = '#bfe8ff';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(20, 0);
    c.lineTo(12, 30);
    c.lineTo(22, 34);
    c.lineTo(10, 68);
    c.lineTo(20, 70);
    c.lineTo(14, 96);
    c.stroke();
    c.strokeStyle = '#8fd3ff';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(16, 0);
    c.lineTo(24, 40);
    c.lineTo(18, 60);
    c.stroke();
  });
}
