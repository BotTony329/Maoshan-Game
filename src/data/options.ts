/**
 * 升级选项的展示文案 —— 把 UpgradeOption 翻译成卡片所需的
 * 标题 / 描述 / 等级标识 / 主题色，供 UI 层直接消费。
 */
import { WEAPONS } from './weapons';
import { PASSIVES } from './passives';
import type { UpgradeOption } from '../game/types';

export interface OptionView {
  title: string;
  desc: string;
  tag: string;      // 右上角等级标签，如 “Lv2”
  kindLabel: string; // 类型徽标，如 “新武器”
  color: number;
  icon: string;     // 贴图键
}

export function describeOption(option: UpgradeOption): OptionView {
  switch (option.kind) {
    case 'weapon-new': {
      const def = WEAPONS[option.id];
      return {
        title: def.name, desc: def.desc, tag: 'Lv1',
        kindLabel: '新武器', color: def.color, icon: def.texture,
      };
    }
    case 'weapon-upgrade': {
      const def = WEAPONS[option.id];
      const note = def.levels[option.fromLevel]?.note ?? '威力提升';
      return {
        title: def.name, desc: note, tag: `Lv${option.fromLevel + 1}`,
        kindLabel: '武器升阶', color: def.color, icon: def.texture,
      };
    }
    case 'passive-new': {
      const def = PASSIVES[option.id];
      return {
        title: def.name, desc: def.desc, tag: 'Lv1',
        kindLabel: '新法宝', color: def.color, icon: def.texture,
      };
    }
    case 'passive-upgrade': {
      const def = PASSIVES[option.id];
      return {
        title: def.name, desc: def.desc, tag: `Lv${option.fromLevel + 1}`,
        kindLabel: '法宝精修', color: def.color, icon: def.texture,
      };
    }
    case 'heal':
      return {
        title: '清心咒', desc: '静心凝神，回复 50 点生命', tag: '',
        kindLabel: '补给', color: 0x7fd88f, icon: 'icon_heal',
      };
    case 'bomb':
      return {
        title: '一挂爆竹', desc: '对场上所有妖邪造成 80 点伤害', tag: '',
        kindLabel: '补给', color: 0xff7a3c, icon: 'icon_bomb',
      };
  }
}
