/**
 * 道途（职业）—— 鬼市独家内容：改变起手武器、外观与天赋，一局只能选一个。
 * 价格即解锁门槛，购买后永久可选用。
 */
import type { ClassDef } from '../game/types';

export const CLASSES: Record<string, ClassDef> = {
  taoist: {
    id: 'taoist',
    name: '茅山道士',
    title: '飞符问道，中正平和',
    trait: '经验获取 +10%',
    price: 0,
    color: 0x5d8aa8,
    texture: 'player_taoist',
    startWeapon: 'talisman',
  },
  shaman: {
    id: 'shaman',
    name: '萨满',
    title: '通灵引雷，链缚群邪',
    trait: '起手【电符】· 闪电链连跳 +4 次且跳距更远',
    price: 400,
    color: 0x6cc8d8,
    texture: 'player_shaman',
    startWeapon: 'spark_talisman',
  },
  warrior: {
    id: 'warrior',
    name: '武士',
    title: '一刃横扫，寸步不让',
    trait: '起手【关刀】· 范围 +30%/护甲+2，一扫三敌返冷却',
    price: 400,
    color: 0xc25a3a,
    texture: 'player_warrior',
    startWeapon: 'guandao',
  },
  hunter: {
    id: 'hunter',
    name: '猎人',
    title: '驰骋山野，灵犬相随',
    trait: '起手【猎弓】· 灵犬扑咬妖邪，犬杀猎物魂魄翻倍',
    price: 500,
    color: 0x8aa858,
    texture: 'player_hunter',
    startWeapon: 'hunting_bow',
  },
  warlock: {
    id: 'warlock',
    name: '术士',
    title: '蚀魂汲气，死者传染',
    trait: '起手【蚀魂咒】· 汲魂：咒杀回血，被咒者承伤 +25%',
    price: 600,
    color: 0x9a5ac8,
    texture: 'player_warlock',
    startWeapon: 'soul_curse',
  },
};

export const CLASS_LIST = Object.values(CLASSES);

/** 职业默认项 */
export const DEFAULT_CLASS = 'taoist';
