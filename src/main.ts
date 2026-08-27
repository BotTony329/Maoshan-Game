import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GhostMarketScene } from './scenes/GhostMarketScene';
import { BankScene } from './scenes/BankScene';
import { DoorScene } from './scenes/DoorScene';
import { ShopScene } from './scenes/ShopScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { ResultScene } from './scenes/ResultScene';
import { PauseScene } from './scenes/PauseScene';

new Phaser.Game({
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game',
  backgroundColor: '#0d120e',
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // 渲染顺序即数组顺序：覆盖层（Doors/LevelUp/Result/Pause）必须排在 Game/UI 之后
  scene: [BootScene, MenuScene, GhostMarketScene, BankScene, GameScene, UIScene, DoorScene, ShopScene, LevelUpScene, ResultScene, PauseScene],
});
