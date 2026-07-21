// src/constants/config.js

export const PRESET_SHAPES = [
  { id: 'shape_I', name: '一字型', matrix: [[1, 1, 1, 1]] },
  { id: 'shape_O', name: '田字型', matrix: [[1, 1], [1, 1]] },
  { id: 'shape_T', name: 'T字型', matrix: [[1, 1, 1], [0, 1, 0]] },
  { id: 'shape_L', name: 'L字型', matrix: [[1, 0, 0], [1, 1, 1]] },
  { id: 'shape_J', name: '反L型', matrix: [[0, 0, 1], [1, 1, 1]] },
  { id: 'shape_C', name: '匠心石', matrix: [[1, 1], [1, 1]] }
];

export const SPIRIT_DICT = {
  '无': { element: '无', color: '#4c566a' },
  '天火陨星': { element: '天火', color: '#d08770' },
  '赤焰天环': { element: '天火', color: '#d08770' },
  '神火迸发': { element: '天火', color: '#d08770' },
  '烈火燎原': { element: '天火', color: '#d08770' },
  '烈焰焚身': { element: '天火', color: '#d08770' },
  '凛霜寒涌': { element: '玄冰', color: '#88c0d0' },
  '霜寒破裂': { element: '玄冰', color: '#88c0d0' },
  '寒晶刺':   { element: '玄冰', color: '#88c0d0' },
  '霜刺寒雨': { element: '玄冰', color: '#5e81ac' },
  '神木骰':   { element: '苍木', color: '#a3be8c' },
  '腐木瘴风': { element: '苍木', color: '#a3be8c' },
  '木引青灵': { element: '苍木', color: '#a3be8c' },
  '苍林浮生': { element: '苍木', color: '#a3be8c' }, 
  '五雷珠':   { element: '神雷', color: '#b48ead' },
  '惊雷戟':   { element: '神雷', color: '#b48ead' },
  '雷霆震击': { element: '神雷', color: '#b48ead' },
  '天雷护佑': { element: '神雷', color: '#b48ead' },
  '九霄雷动': { element: '神雷', color: '#b48ead' }
};

export const SPIRIT_SKILL_DICT = {
  '灼灼天炎': { element: '天火', color: '#d08770' },
  '凝冰霜华': { element: '玄冰', color: '#5e81ac' },
  '青芜浮生': { element: '苍木', color: '#a3be8c' },
  '雷佑灵光': { element: '神雷', color: '#b48ead' }, 
  '无': { element: '无', color: '#4c566a' }
};

export const OPTIONS = {
  resonances: ['天火共鸣', '玄冰共鸣', '苍木共鸣', '神雷共鸣'],
  qualities: ['凡品', '良品', '珍品', '灵品'],
  attributes: ['专精', '会心', '调息', '元御']
};

export const getSpiritColor = (spiritName, alpha = 1) => {
  const hex = SPIRIT_DICT[spiritName]?.color || '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getSpiritSkillColor = (skillName, alpha = 1) => {
  const hex = SPIRIT_SKILL_DICT[skillName]?.color || '#ffffff';
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};