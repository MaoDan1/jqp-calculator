// src/workers/solver.worker.js

function calculateDamageScore(combo, selectedCards = []) {
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
      const woodMultiplier = 1 + 0.125 * (lvl - 1);
      score += 712000 * woodMultiplier;
    } else if (spirit === '烈焰焚身') { 
} else if (spirit === '烈焰焚身') {
      // 1. 基础单层 DOT 伤害（13,000），带通用等级倍率 multiplier
      let singleLayerDamage = 13000 * multiplier;

      // 2. 3 级与 5 级的机制质变加成（直接作用于 DOT 伤害）
      if (lvl >= 3) singleLayerDamage *= 1.3;
      if (lvl >= 5) singleLayerDamage *= 1.5;

      // 3. 单目标打桩场景：固定 3 层【焚尽】
      const burnStacks = 3; 

      // 4. 4 分钟（240 秒）打桩触发次数：240s / 15s = 16 次
      const burnTickCount = 16; 

      // 5. 最终总得分 = 单层伤害 × 3层 × 16次
      let totalBurnDamage = singleLayerDamage * burnStacks * burnTickCount;

      // 4. 【新增】：5 级烈焰焚身 + 主动技能【灼灼天炎】联动
      // 4 分钟按释放 2.5 次灼灼天炎计算，每次瞬间赋予 12 层焚尽
      if (lvl >= 5 && activeSkill === '灼灼天炎') {
      totalBurnDamage += singleLayerDamage * 12 * 2.5;
      }
      // 5. 计入总得分
      score += totalBurnDamage;
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
      // 1. 基础单次伤害
      const baseDamage = 38144;
      
      // 2. 专属等级伤害倍率：1级为1，之后每级提升 37.5%
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      
      // 3. 计算 4 分钟 (240秒) 内的触发次数
      // 1~2级 CD 30秒 (9次)，3级及以上 CD 20秒 (13次)
      let casts = lvl >= 3 ? 13 : 9; 
      
      // 4. 5级联动机制
      if (lvl >= 5 && activeSkill === '凝冰霜华') {
        // 凝冰霜华持续期间放4道，按4分钟放2.5次大招计算，额外触发 10 次
        casts += 10; 
      }
      // 5. 汇总得分并乘上全局 multiplier
      score += baseDamage * levelMultiplier * casts * multiplier;
    } else if (spirit === '神木骰') {
      score += 150000 * multiplier;
    } else if (spirit === '五雷珠') {
      score += 130000 * multiplier; 
    } else if (spirit === '惊雷戟') {
      score += 20000 * multiplier; 
    } else if (spirit === '雷霆震击') {
      score += 0;
    } else if (spirit === '赤焰天环') {
      // 1. 基础单次伤害（3,080），带通用等级倍率加成
      let baseHit = 3080 * multiplier;

      // 2. 3级及以上：额外触发1次（2倍伤害）
      if (lvl >= 3) {
        baseHit *= 2;
      }

      // 3. 计算单次天火激化期间的触发次数
      // 1~4级：10秒内每2秒1次 = 5次
      // 5级：间隔变为1.5秒，时间延长至12秒 = 8次
      let hitsPerIntensify = lvl >= 5 ? 8 : 5;
      let totalDamagePerIntensify = baseHit * hitsPerIntensify;

      // 4. 计算 4 分钟内天火激化总触发次数（依天火值产出而定）
      let fireValue = 0;
      if (spiritCounts['天火陨星']) {
        const meteorLvl = Math.min(spiritCounts['天火陨星'], 5);
        if (meteorLvl >= 1) fireValue += 26000;
        if (meteorLvl >= 3) fireValue += 16000;
      }
      const triggerCount = Math.floor(fireValue / 10000);

      // 5. 只有触发了天火激化，赤焰天环才生效
      score += totalDamagePerIntensify * triggerCount;
    } else if (spirit === '神火迸发') {
      // 1. 先计算单次喷发的伤害（结合等级倍率与5级二次喷发）
      let singleEruption = 65290 * multiplier;
      if (lvl >= 5) {
        singleEruption *= 2; // 5级额外造成 1 次伤害
      }

      // 2. 计算 4 分钟内天火激化的触发次数（目前由天火陨星等产出天火值）
      let fireValue = 0;
      if (spiritCounts['天火陨星']) {
        const meteorLvl = Math.min(spiritCounts['天火陨星'], 5);
        if (meteorLvl >= 1) fireValue += 26000;
        if (meteorLvl >= 3) fireValue += 16000;
      }
      const triggerCount = Math.floor(fireValue / 10000);

      // 只有触发了天火激化，神火迸发才会跟着喷发
      score += singleEruption * triggerCount;
    } else if (spirit === '裂地崩') {
      // 1. 基础释放伤害（207,708），4分钟树人召唤约 2.5 次
      let totalDamage = 207708 * multiplier * 2.5;

      // 2. 3级及以上解锁 DOT（30秒内每秒 2887 伤害，单次回响总伤害 86,610）
      if (lvl >= 3) {
        totalDamage += 86610 * 2.5;
      }

      // 3. 5级解锁召唤物攻击提前触发回响（按 4 分钟召唤物攻击频繁触发，约额外结算 20 次回响）
      if (lvl >= 5) {
        totalDamage += 2887 * 20;
      }

      score += totalDamage;
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

  // 4. 丹青绘灵卡牌加成计算
  if (selectedCards && selectedCards.length > 0) {
    selectedCards.forEach(cardId => {
      // 可在此根据卡牌属性或费用，向总 score 中叠加对应系数或加成
      //score += 50000; 
    });
  }


  return Math.floor(score);
}

// 1. 天火激化算法（精准按 1级基础 + 3级加成 动态计算）
function calcFireIntensify(spiritCounts) {
  let fireValue = 0;

  if (spiritCounts['天火陨星']) {
    const lvl = Math.min(spiritCounts['天火陨星'], 5);
    if (lvl >= 1) fireValue += 26000;
    if (lvl >= 3) fireValue += 16000;
  }

  if (fireValue < 10000) return 0;

  const triggerCount = Math.floor(fireValue / 10000);

  // 基础单次激化伤害 195,905
  let baseIntensifyDamage = 195905;

  // 神火迸发 3 级及以上：天火激化基础伤害提高 20%
  if (spiritCounts['神火迸发'] >= 3) {
    baseIntensifyDamage *= 1.2;
  }
  if (spiritCounts['赤焰天环'] >= 5) baseIntensifyDamage *= (8 / 5);

  return triggerCount * baseIntensifyDamage;
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
    if (lvl >= 5) {
      woodValue += 11000;
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
// 1. 获取主线程传过来的 selectedCards (如果没有传则默认为空数组 [])
  const selectedCards = e.data.selectedCards || [];

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
    combinations[i]._score = calculateDamageScore(combinations[i], selectedCards);
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