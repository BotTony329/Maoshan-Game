import Phaser from 'phaser';
import { buildTextures } from '../render/textures';
import { EXTERNAL_ART } from '../render/external-art';

/** 启动场景：程序化生成全部贴图后进入主菜单 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const [key, path] of EXTERNAL_ART) this.load.image(key, path);
  }

  create(): void {
    // 外部美术沿用原贴图键；buildTextures 会只补齐尚未交付的程序化资产。
    buildTextures(this);
    this.scene.start('Menu');
  }
}
