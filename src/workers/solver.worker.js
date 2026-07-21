// src/workers/solver.worker.js

function calculateDamageScore(combo) {
  let score = 1083333; 
  const spiritCounts = {};
  let activeSkill = '无';
  
  for (let i = 0; i < combo.length; i++) {
    const stone = combo[i];
    if (stone.spirit && stone.spirit !== '无') spiritCounts[stone.spirit] = (spiritCounts[stone.spirit] || 0) + 1;
    if (stone.spiritSkill && stone.spiritSkill !== '无') activeSkill = stone.spiritSkill;
  }

// 主动灵蕴技 4分钟打桩预期伤害加成（已移除不存在的狂雷）
  if (activeSkill === '灼灼天炎') {
    score += 100000;
  } else if (activeSkill === '凝冰霜华') {
    score += 133333; 
  } else if (activeSkill === '青芜浮生') {
    score += 200000; 
  } else if (activeSkill === '雷佑灵光') {
    score += 150000; 
  }

  for (const spirit in spiritCounts) {
    const count = spiritCounts[spirit];
    const lvl = count > 5 ? 5 : count;
    
    // 提取的通用线性倍率：每级增加 37.5%
    const multiplier = 1 + 0.375 * (lvl - 1); 

    if (spirit === '苍林浮生') {
      if (lvl === 1) score += 712000;
      else if (lvl === 2) score += 801000; 
      else if (lvl === 3) score += 1790000; 
      else if (lvl === 4) score += 2013750;
      else score += 2237500;
    } else if (spirit === '天火陨星') {
      score += 26959 * multiplier;
    } else if (spirit === '烈焰焚身') { 
      score += 590000 * multiplier * (lvl >= 3 ? 1.3 : 1) * (lvl >= 5 ? 1.5 : 1);
    } else if (spirit === '霜寒破裂') { 
      score += 300000 * multiplier * (lvl >= 3 ? 1.5 : 1) * (lvl >= 5 ? 1.2 : 1);
    } else if (spirit === '寒晶刺') { 
      score += 260000 * multiplier * (lvl >= 3 ? 1.3 : 1) * (lvl >= 5 ? 1.2 : 1);
    } else if (spirit === '烈火燎原') {
      if (activeSkill === '灼灼天炎') score += 470000 * multiplier; 
    } else if (spirit === '寒潮冰涌') {
      // 触发频率高，5级与凝冰霜华有额外联动
      score += 60000 * multiplier * (lvl >= 3 ? 1.2 : 1) * (lvl >= 5 ? 1.3 : 1);
    } else if (spirit === '神木骰') {
      score += 150000 * multiplier;
    } else if (spirit === '五雷珠') {
      score += 130000 * multiplier; 
    } else if (spirit === '惊雷戟') {
      score += 20000 * multiplier; 
    } else if (spirit === '雷霆震击') {
      score += 0;
    } else {
      // 【新增】：兜底 T3 组
      // 霜刺寒雨、天雷护佑、九霄雷动（及未来新增的未显式声明灵蕴）将自动掉入此分支
      // 设定基础基数为 50000，按通用倍率放大
      score += 50000 * multiplier; 
    }
  }
  return Math.floor(score);
}

self.onmessage = function(e) {
  const inventory = e.data.inventory;
  const target = e.data.target;
  const validCells = e.data.validCells;

  const cellMap = {};
  for(let i=0; i<validCells.length; i++) {
    cellMap[validCells[i][0] + ',' + validCells[i][1]] = i;
  }

  const combinations = [];
  const combo = [];
  function getCombos(start) {
    if (combo.length === target) {
      let hasCore = false;
      for(let k=0; k<combo.length; k++) if(combo[k].shapeId === 'shape_C') { hasCore = true; break; }
      if (hasCore) combinations.push([...combo]);
      return;
    }
    for (let i = start; i < inventory.length; i++) {
      combo.push(inventory[i]);
      getCombos(i + 1);
      combo.pop();
    }
  }
  getCombos(0);

  for(let i=0; i<combinations.length; i++) {
    combinations[i]._score = calculateDamageScore(combinations[i]);
  }
  combinations.sort(function(a, b) { return b._score - a._score; });

  let results = [];
  const board = new Array(validCells.length).fill(-1);

  for (let i = 0; i < combinations.length; i++) {
    if (results.length >= 10) break; 
    
    if (i % 500 === 0) self.postMessage({ type: 'progress', current: i, total: combinations.length });

    const currentCombo = combinations[i];
    const used = new Array(target).fill(false);
    let foundBoard1D = null;

    function dfs() {
      let emptyIdx = -1;
      for(let k=0; k<board.length; k++) { if(board[k] === -1) { emptyIdx = k; break; } }
      
      if (emptyIdx === -1) {
        foundBoard1D = board.slice();
        return true;
      }

      const er = validCells[emptyIdx][0];
      const ec = validCells[emptyIdx][1];

      for (let pIdx = 0; pIdx < target; pIdx++) {
        if (used[pIdx]) continue;
        const piece = currentCombo[pIdx];

        for (let rotIdx = 0; rotIdx < piece.rotations.length; rotIdx++) {
          const rot = piece.rotations[rotIdx];
          let fits = true;
          const coverIndices = [];

          for (let k = 0; k < rot.length; k++) {
            const nr = er + rot[k][0];
            const nc = ec + rot[k][1];
            const cIdx = cellMap[nr + ',' + nc];
            if (cIdx === undefined || board[cIdx] !== -1) {
              fits = false; break;
            }
            coverIndices.push(cIdx);
          }

          if (fits) {
            for (let k = 0; k < coverIndices.length; k++) board[coverIndices[k]] = piece.uid;
            used[pIdx] = true;
            if (dfs()) return true;
            used[pIdx] = false;
            for (let k = 0; k < coverIndices.length; k++) board[coverIndices[k]] = -1;
          }
        }
      }
      return false;
    }

    if (dfs()) {
       results.push({
         grid1D: foundBoard1D,
         stones: currentCombo,
         damage: currentCombo._score
       });
    }
  }

  self.postMessage({ type: 'done', results: results });
};