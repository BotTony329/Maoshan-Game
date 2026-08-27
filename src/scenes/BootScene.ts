import Phaser from 'phaser';
import { buildTextures } from '../render/textures';

/** 启动场景：程序化生成全部贴图后进入主菜单 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    buildTextures(this);
    this.scene.start('Menu');
  }
}
