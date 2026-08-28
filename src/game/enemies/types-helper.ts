/** 敌人行为策略签名（供注册表与各行为模块共用） */
import type { Enemy } from '../types';
import type { World } from '../world';

export type EnemyBehavior = (e: Enemy, w: World, dt: number) => void;
