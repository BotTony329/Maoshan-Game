/**
 * 自动演示钩子 —— 仅当 URL 带 ?autotest 时激活。
 * 用途：无头浏览器冒烟测试（自动开始、自动走位、自动选升级、败局自动重开），
 * 让 CI / 截图验证能拍到真实战斗画面。正常游玩完全不受影响。
 */
export const AUTOTEST =
  typeof location !== 'undefined' && location.search.includes('autotest');
