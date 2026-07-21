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

  // 1. 主动灵蕴技基础得分
  if (activeSkill === '灼灼天炎') score += 100000;
  else if (activeSkill === '凝冰霜华') score += 133333;
  else if (activeSkill === '青芜浮生') score += 200000;
  else if (activeSkill === '雷佑灵光') score += 150000;

  // 2. 被动灵蕴基础得分计算
  for (const spirit in spiritCounts) {
    const count = spiritCounts[spirit];
    const lvl = count > 5 ? 5 : count;
    const multiplier = 1 + 0.375 * (lvl - 1); 

    if (spirit === '苍林浮生') {
      if (lvl === 1) score += 712000;
      else if (lvl === 2) score += 801000; 
      else if (lvl === 3) score += 1790000; 
      else if (lvl === 4) score += 2013750;
      else score += 2237500;
    } else if (spirit === '烈焰焚身') { 
      score += 590000 * multiplier * (lvl >= 3 ? 1.3 : 1) * (lvl >= 5 ? 1.5 : 1);
    } else if (spirit === '霜寒破裂') { 
      score += 300000 * multiplier * (lvl >= 3 ? 1.5 : 1) * (lvl >= 5 ? 1.2 : 1);
    } else if (spirit === '寒晶刺') { 
      score += 260000 * multiplier * (lvl >= 3 ? 1.3 : 1) * (lvl >= 5 ? 1.2 : 1);
    } else if (spirit === '烈火燎原') {
      if (activeSkill === '灼灼天炎') score += 470000 * multiplier; 
    } else if (spirit === '天火陨星') {
      let spiritScore = 431344 * multiplier;
      if (lvl >= 3) spiritScore += 427360; // 3级及以上DOT收益
      score += spiritScore;
    } else if (spirit === '寒潮冰涌') {
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
      // T3 常规组
      score += 50000 * multiplier; 
    }
  }

// 3. 叠加四元素激化得分
  score += calcFireIntensify(spiritCounts);
  score += calcIceIntensify(spiritCounts);
  score += calcWoodIntensify(spiritCounts, activeSkill); // <-- 传入 activeSkill
  score += calcThunderIntensify(spiritCounts);

  return Math.floor(score);
}

// 1. 天火激化算法（精准按 1级基础 + 3级加成 动态计算）
function calcFireIntensify(spiritCounts) {
  let fireValue = 0;

  if (spiritCounts['天火陨星']) {
    const lvl = Math.min(spiritCounts['天火陨星'], 5);
    
    // 1级起步：开局 + 每20s一次（4分钟共13次），单次2000天火值 -> 基础 26,000 点
    if (lvl >= 1) {
      fireValue += 26000;
    }
    
    // 3级额外加成：10秒内每2秒累加200天火值（单次1000点），4分钟追加约 16,000 点
    if (lvl >= 3) {
      fireValue += 16000;
    }
  }

  // TODO: 如果有其他天火灵蕴，在此追加 fireValue += ...

  // 未达到 10000 门槛不触发激化
  if (fireValue < 10000) return 0;

  // 单次天火激化伤害为 195,905
  // 1级天火陨星（26,000天火值） -> Math.floor(2.6) = 2次激化 (391,810分)
  // 3级天火陨星（42,000天火值） -> Math.floor(4.2) = 4次激化 (783,620分)
  const triggerCount = Math.floor(fireValue / 10000);

  return triggerCount * 195905;
}

// 2. 玄冰激化（动态计算触发次数）
function calcIceIntensify(spiritCounts) {
  let iceValue = 0;

  if (spiritCounts['寒潮冰涌']) {
    const lvl = Math.min(spiritCounts['寒潮冰涌'], 5);
    // 寒潮冰涌 3 级及以上才开始附带 2000 玄冰值
    if (lvl >= 3) {
      iceValue += 26000; // 4分钟触发约 13 次 * 2000
    }
  }

  if (iceValue < 10000) return 0;

  // 单次玄冰激化伤害为 128,861
  const triggerCount = Math.floor(iceValue / 10000);

  return triggerCount * 128861;
}

// 3. 苍木激化算法
function calcWoodIntensify(spiritCounts, activeSkill) {
  let woodValue = 0;

  // 1. 苍林浮生贡献苍木值（3级及以上 4分钟产出约 15000）
  if (spiritCounts['苍林浮生']) {
    const lvl = Math.min(spiritCounts['苍林浮生'], 5);
    if (lvl >= 3) {
      woodValue += 15000;
    }
  }

  // 2. 腐木瘴风 5 级 + 青芜浮生（120s CD，4分钟释放 2.5 次 -> 增加 25000 苍木值）
  if (spiritCounts['腐木瘴风'] >= 5 && activeSkill === '青芜浮生') {
    woodValue += 25000;
  }

  // 未达到 10000 门槛不触发
  if (woodValue < 10000) return 0;

  // 单次苍木激化（敌）伤害为 440,568
  const triggerCount = Math.floor(woodValue / 10000);

  return triggerCount * 440568;
}


// 4. 神雷激化（动态计算触发次数）
function calcThunderIntensify(spiritCounts) {
  let thunderValue = 0;

  if (spiritCounts['五雷珠']) {
    const lvl = Math.min(spiritCounts['五雷珠'], 5);
    if (lvl >= 3) {
      thunderValue += 12000;
    }
  }

  if (thunderValue < 10000) return 0;

  // 单次神雷激化（敌）伤害按 187,610 估算
  const triggerCount = Math.floor(thunderValue / 10000);

  return triggerCount * 187610;
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