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

    // ==================== 🌟 新增：全局机巧石联动动态乘区 ====================
    let dynamicGlobalMultiplier = 1.0;

    // 【烈火燎原】5级联动：灼灼天炎使所有灵蕴伤害提高 33%，持续 15 秒
    if (spiritCounts['烈火燎原'] >= 5 && activeSkill === '灼灼天炎') {
      // 按照 4 分钟 (240秒) 释放 2.5 次主动技能计算
      const triggerCount = 2.5; 
      // 计算 15 秒增伤 buff 在全局战斗中的覆盖率期望
      const buffUptime = Math.min(1, (15 * triggerCount) / 240); 
      // 转化为全局伤害乘区期望 (33% * 覆盖率，约 5.15% 全程提升)
      dynamicGlobalMultiplier += (0.33 * buffUptime);
    }

    if (spirit === '苍林浮生') {
      const woodMultiplier = 1 + 0.125 * (lvl - 1);
      score += 712000 * woodMultiplier;
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
      // 1. 基础单次破裂伤害
      const baseDamage = 60632;
      
      // 2. 专属等级伤害倍率：1级为1，之后每级提升 37.5%
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      
      // 3. 计算 4 分钟 (240秒) 内【冰霜元素】的出现次数
      let elementalCasts = 0;
      
      // 来源 A：丹青【齐昊】(ice_5) 召唤
      // 完美复刻冰箭减 CD 逻辑，以精准对接冰霜元素的出场频率
      if (selectedCards && selectedCards.includes('ice_5')) {
        let totalArrows = selectedCards.includes('ice_1') ? Math.floor(240 / 6) : 0;
        if (selectedCards.includes('ice_3')) {
          totalArrows += Math.floor(240 / 14) * 3;
        }
        // 齐昊内置60秒CD，每支冰箭减2秒
        elementalCasts += Math.floor((240 + totalArrows * 2) / 60);
      }
      
      // 来源 B：5级联动主动技能【凝冰霜华】召唤
      // 按照我们之前定义的模型，4分钟约释放 2.5 次主动大招
      if (lvl >= 5 && activeSkill === '凝冰霜华') {
        elementalCasts += 2.5; 
      }
      
      // 4. 只有当冰霜元素被成功召唤时，才核算伤害
      if (elementalCasts > 0) {
        // 破裂本体总伤
        let totalDamage = baseDamage * levelMultiplier * elementalCasts;
        
        // 3级及以上质变：每次召唤额外附加 DOT 伤害
        if (lvl >= 3) {
          totalDamage += 76692 * elementalCasts;
        }
        
        // 汇总得分并乘上全局通用倍率
        score += totalDamage * multiplier;
      }
    } else if (spirit === '寒晶刺') { 
      // 1. 基础伤害参数
      const baseDamagePerThorn = 10992;
      const thornsPerTrigger = 3; // 每次触发召唤3枚
      const baseTriggerDamage = baseDamagePerThorn * thornsPerTrigger; // 单次触发基础总伤 32976
      
      // 2. 专属等级伤害倍率：1级为1，之后每级提升 37.5%
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      
      // 3. 计算 4 分钟 (240秒) 内丹青【冰箭】的总发射数量
      let totalArrows = 0;
      if (selectedCards && selectedCards.includes('ice_1')) { // 燕虹：每6秒1枚
        totalArrows += Math.floor(240 / 6);
      }
      if (selectedCards && selectedCards.includes('ice_3')) { // 文敏：每14秒3枚
        totalArrows += Math.floor(240 / 14) * 3;
      }
      
      // 根据冰箭数量计算基础触发次数 (每 10 枚触发 1 次)
      let triggerCount = Math.floor(totalArrows / 10);
      
      // 4. 5级联动质变：召唤【冰霜元素】使自身获得 2 层寒晶刺效果 (即白嫖 2 次触发)
      if (lvl >= 5) {
        let appearanceCount = 0;
        
        // 来源 A：齐昊 (ice_5) 召唤 (复用精准减CD逻辑)
        if (selectedCards && selectedCards.includes('ice_5')) {
          appearanceCount += Math.floor((240 + totalArrows * 2) / 60);
        }
        
        // 来源 B：主动技能【凝冰霜华】召唤 (按4分钟2.5次计)
        if (activeSkill === '凝冰霜华') {
          appearanceCount += 2.5; 
        }
        
        // 每次出现冰霜元素，额外提供 2 次寒晶刺触发
        triggerCount += appearanceCount * 2;
      }
      // 5. 核算最终伤害
      if (triggerCount > 0) {
        // 寒晶刺本体总伤
        let totalDamage = baseTriggerDamage * levelMultiplier * triggerCount;
        
        // 3级联动质变：每次造成伤害时 100% 触发【碎裂】
        if (lvl >= 3) {
          // 每次触发有 3 枚刺，意味着每次触发能打出 3 次碎裂！
          const totalHits = triggerCount * 3;
          
          // 碎裂的基础伤害 (与左归丹青中的碎裂伤害 8484 保持一致)
          const shatterBaseDamage = 8484; 
          
          // 如果你希望丹青左归 (ice_4) 的 14% 增伤也能拐到这里的碎裂，可以加上这个乘区
          let shatterMultiplier = 1;
          if (selectedCards && selectedCards.includes('ice_4')) {
            shatterMultiplier += 0.14;
          }
          
          totalDamage += totalHits * shatterBaseDamage * shatterMultiplier;
        }
        
        // 汇总得分并乘上全局通用倍率
        score += totalDamage * multiplier;
      }
    } else if (spirit === '烈火燎原') {
      // 1. 基础伤害参数
      const baseTickDamage = 29308;
      const duration = 8; // 持续8秒，每秒1次，共8次伤害
      const baseTriggerDamage = baseTickDamage * duration; // 单次触发基础总伤 234464
      
      // 2. 专属等级伤害倍率：1级为1，之后每级提升 37.5%
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      
      // 3. 计算 4 分钟 (240秒) 内【灼灼天炎】的触发次数
      // 假设【灼灼天炎】是天火系主动技能，4分钟释放 2.5 次
      let triggerCount = 0;
      if (activeSkill === '灼灼天炎') {
        triggerCount = 2.5; 
      }
      
      // 4. 只有前置条件触发时，才核算这块石头的收益
      if (triggerCount > 0) {
        // 烈火燎原本体总伤
        let totalDamage = baseTriggerDamage * levelMultiplier * triggerCount;
        
        // 3级联动质变：高频产出天火值
        if (lvl >= 3) {
          // 每次触发有 8 跳伤害，每跳 1500，单次触发产出 12000 点天火值！
          // 这意味着每次触发【烈火燎原】都会必定溢出 10000 点触发一次天火激化
          const extraTianhuoValue = duration * 1500 * triggerCount;
          const intensifyTriggers = Math.floor(extraTianhuoValue / 10000);
          
          // 对接天火激化伤害 (读取神火迸发/赤焰天环的增伤)
          let baseIntensifyDamage = 195905;
          if (spiritCounts['神火迸发'] >= 3) baseIntensifyDamage *= 1.2;
          if (spiritCounts['赤焰天环'] >= 5) baseIntensifyDamage *= (8 / 5);
          
          // 将额外触发的激化伤害并入这块石头的总收益中
          totalDamage += intensifyTriggers * baseIntensifyDamage;
        }
    
        // 汇总得分并乘上全局通用倍率
        score += totalDamage * multiplier;
      }
    } else if (spirit === '天火陨星') {
      // 1. 基础伤害参数
      const baseDamage = 26594;
      
      // 基础触发次数：进战1次 + 240秒内每20秒1次 (240/20) = 13次
      const baseTriggerCount = Math.floor(240 / 20) + 1; 
      
      // 2. 专属等级伤害倍率：1级为1，之后每级提升 37.5%
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      
      // 单颗陨星附带的天火值 (1-2级2000，3级及以上因为附带DoT多加1000)
      const valuePerMeteor = lvl >= 3 ? 3000 : 2000; 
      
      // 3. 计算本局战斗的“基础天火值”池 (用于 5 级联动推演)
      let baseTianhuoValue = baseTriggerCount * valuePerMeteor;
      
      // 📡 跨模块数据联动：收集外部环境产出的天火值
      // (1) 烈火燎原 (3级以上)
      if (spiritCounts['烈火燎原'] >= 3 && activeSkill === '灼灼天炎') {
        baseTianhuoValue += 2.5 * 8 * 1500; // 约 30000
      }
      // (2) 丹青猛虎体系 (fire_2)
      if (selectedCards && selectedCards.includes('fire_2')) {
        baseTianhuoValue += 31600; // 巨蚁与六尾的联动产出期望
      }
      
      // 4. 5级联动质变：解开无限套娃！
      let finalMeteorCount = baseTriggerCount;
      
      if (lvl >= 5) {
        // 使用代数公式直接求出最终极限激化次数：I = V_base / (10000 - V_m)
        const totalIntensifies = Math.floor(baseTianhuoValue / (10000 - valuePerMeteor));
        
        // 激化触发时奖励等量的额外陨星
        finalMeteorCount += totalIntensifies;
      }
      
      // 5. 核算最终伤害
      // 陨星本体爆发伤害
      let totalDamage = baseDamage * levelMultiplier * finalMeteorCount;
      
      // 3级联动质变：10秒燃烧DoT (每次陨星附带 5 跳，每跳 5342)
      if (lvl >= 3) {
        const dotTickDamage = 5342;
        const ticksPerTrigger = 5; 
        totalDamage += (dotTickDamage * ticksPerTrigger) * finalMeteorCount;
      }
      
      // 汇总得分并乘上全局通用倍率 (包含了烈火燎原等全局拐)
      score += totalDamage * multiplier;
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
    // 直接调用我们写好的硬核计算模型，传入选中的卡牌数组
    score += calcDanqingDamage(selectedCards, spiritCounts);
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


/**
 * 丹青绘灵伤害计算 (4分钟/240秒 标准单体战斗模型)
 * @param {Array<string>} cards - 选中的丹青卡牌 ID 数组，如 ['fire_1', 'ice_3']
 * @returns {number} - 丹青提供的预期总伤害
 */
function calcDanqingDamage(cards, spiritCounts = {}) {
  if (!cards || cards.length === 0) return 0;

  const has = (id) => cards.includes(id);
  let totalDmg = 0;
  const combatTime = 240; // 4分钟 = 240秒

  // ==================== 🔥 天火系 (燃烧/爆燃/激化) ====================
  if (has('fire_1') || has('fire_2') || has('fire_4') || has('fire_5')) {
    // fire_3 (年兽) 联动：燃烧频率提高20% (3秒缩短至2.5秒)
    const tickInterval = has('fire_3') ? (3 / 1.2) : 3;
    
    let totalBurnTicks = 0;
    let totalExplosions = 0;
    let fire1Damage = 0;
    
    // 遍历 240 秒内的每一次燃烧 Tick，精准模拟层数期望
    for (let t = 0; t <= combatTime; t += tickInterval) {
      // 基础叠加：每 8 秒 1 层 (0秒时默认算第1次叠加)
      let baseAdditions = Math.floor(t / 8) + 1;
      
      // 年兽额外叠加：之前每次燃烧跳伤害时都有 70% 概率额外叠加
      let bonusAdditions = has('fire_3') ? (totalBurnTicks * 0.7) : 0;
      
      // 当前期望层数 (采用小数代表概率期望，最高8层，带年兽十几秒即可满层)
      let currentStacks = Math.min(8, baseAdditions + bonusAdditions);
      
      // 计算当次燃烧伤害
      let multiplier = 1 + (currentStacks - 1) * 0.05;
      fire1Damage += 2209 * multiplier;
      
      totalBurnTicks++; // 记录实际跳字次数
    }

    if (has('fire_1')) {
      totalDmg += fire1Damage;
    }

    // fire_4 (二尾妖狐)：自身尝试添加或叠加燃烧时立刻造成伤害
    if (has('fire_4')) {
      // 基础添加次数：战斗时间 / 8秒 + 1次首发
      let baseAttempts = Math.floor(combatTime / 8) + 1;
      // 年兽额外添加次数：燃烧实际触发次数 * 70%
      let bonusAttempts = has('fire_3') ? (totalBurnTicks * 0.7) : 0;
      
      let totalApplyAttempts = baseAttempts + bonusAttempts;
      totalDmg += totalApplyAttempts * 3960;
    }

    // fire_5 (六尾魔狐)：6层以上爆燃
    if (has('fire_5')) {
      totalExplosions = Math.floor(combatTime / 6);
      totalDmg += totalExplosions * (5 * 8055);
    }

    // fire_2 (猛虎) 核心联动：核算天火值与激化伤害
    if (has('fire_2')) {
      let tianhuoValue = 0;
      tianhuoValue += totalBurnTicks * 100;
      tianhuoValue += totalExplosions * 550;

      const intensifyTriggers = Math.floor(tianhuoValue / 10000);
      let baseIntensifyDamage = 195905;
      
      if (spiritCounts['神火迸发'] >= 3) {
        baseIntensifyDamage *= 1.2;
      }
      if (spiritCounts['赤焰天环'] >= 5) {
        baseIntensifyDamage *= (8 / 5);
      }
      
      totalDmg += intensifyTriggers * baseIntensifyDamage;
    }
  }

  // ==================== ❄️ 玄冰系 (冰箭/风暴/碎裂/激化) ====================
  if (has('ice_1') || has('ice_2') || has('ice_3') || has('ice_4') || has('ice_5')) {
    // 左归(ice_4) 和 文敏(ice_3) 的独立增伤乘区
    const iceMultiplier = 1 + (has('ice_3') ? 0.32 : 0) + (has('ice_4') ? 0.14 : 0);

    // 1. 冰箭次数计算 (燕虹 & 文敏)
    let totalArrows = has('ice_1') ? Math.floor(combatTime / 6) : 0;
    if (has('ice_3')) { 
      totalArrows += Math.floor(combatTime / 14) * 3;
    }

    // 2. 玄冰风暴次数计算 (齐昊)
    let stormCasts = 0;
    if (has('ice_5')) { 
      stormCasts = Math.floor((combatTime + totalArrows * 2) / 60);
    }

    // 3. 基础技能伤害核算
    totalDmg += totalArrows * 5175 * iceMultiplier;
    totalDmg += stormCasts * 128000 * iceMultiplier;

    // 4. 左归 (ice_4) 碎裂联动
    let shatterCasts = 0;
    if (has('ice_4')) {
      const totalHits = totalArrows + stormCasts; 
      shatterCasts = totalHits * 0.30; // 计算期望触发的碎裂次数
      
      totalDmg += shatterCasts * 8484 * iceMultiplier;
    }

    // 5. 上官策 (ice_2) 核心联动：核算玄冰值与激化伤害
    if (has('ice_2')) {
      let xuanbingValue = 0;
      
      // 燕虹和文敏的冰箭：每次 140点
      xuanbingValue += totalArrows * 140;
      // 左归的碎裂：每次 140点
      xuanbingValue += shatterCasts * 140;
      // 齐昊的风暴：每次 1400点
      xuanbingValue += stormCasts * 1400;

      // 满 10000 触发一次玄冰激化
      const intensifyTriggers = Math.floor(xuanbingValue / 10000);

      // 完美对接你的原版玄冰激化单次伤害
      const baseIceIntensifyDamage = 128861; 
      
      // 直接并入丹青总伤
      totalDmg += intensifyTriggers * baseIceIntensifyDamage;
    }
  }

  // ==================== 🌱 苍木系 (脉冲/激化) ====================
  if (has('wood_1') || has('wood_2') || has('wood_3') || has('wood_4') || has('wood_5')) {
    // wood_5 (六合镜)：脉冲基础 CD 从 15秒 减为 13秒
    const baseInterval = has('wood_5') ? 13 : 15;
    const baseCasts = has('wood_1') ? Math.floor(combatTime / baseInterval) : 0;
    
    // wood_4 (林峰) 联动：单体伤害提高 60%
    const woodMultiplier = 1 + (has('wood_4') ? 0.60 : 0);

    // 精准计算整个 4 分钟内脉冲命中敌人的“真实物理次数” (用于算次数和叠加苍木值)
    // 来源：折扇基础触发 + 六合镜额外触发(每次基础带2次额外) + 神木骰开局送3次
    let totalPulseHits = baseCasts;
    if (has('wood_5')) totalPulseHits += baseCasts * 2;
    if (has('wood_3')) totalPulseHits += 3;

    // 1. wood_1 (折扇) 基础脉冲伤害
    if (has('wood_1')) {
      // 注意：六合镜带来的额外 2 次只有 70% 伤害效能，伤害等效于 1.4 倍
      const w1EquivalentCasts = baseCasts + (has('wood_5') ? baseCasts * 1.4 : 0);
      totalDmg += w1EquivalentCasts * 9792 * woodMultiplier;
    }

    // 2. wood_3 (神木骰) 联动伤害
    if (has('wood_3')) {
      // 附加伤害不衰减，完整吃满所有真实脉冲次数
      totalDmg += totalPulseHits * 12865 * woodMultiplier;
    }

    // 3. wood_2 (清凉珠) 核心联动：核算苍木值与激化伤害
    if (has('wood_2')) {
      // 每次脉冲命中敌人增加 280 点苍木值
      let cangmuValue = totalPulseHits * 280;

      // 满 10000 触发一次苍木激化
      const intensifyTriggers = Math.floor(cangmuValue / 10000);

      // 对接图中提取出的原版苍木激化单次伤害
      const baseWoodIntensifyDamage = 440568; 

      totalDmg += intensifyTriggers * baseWoodIntensifyDamage;
    }
  }

  // ==================== ⚡ 神雷系 (连锁闪电/过载/激化) ====================
  if (has('thunder_1') || has('thunder_2') || has('thunder_3') || has('thunder_4') || has('thunder_5')) {
    // thunder_1 (引雷幡) 基础闪电 (12秒CD)
    const baseLightnings = has('thunder_1') ? Math.floor(combatTime / 12) : 0;
    
    // thunder_4 (连雷壁) 联动：单体情况，基础提高 45%
    const thunderMultiplier = 1 + (has('thunder_4') ? 0.45 : 0);

    // thunder_5 (紫电螭吻) 联动：70%概率额外触发1次；每30秒转化为狂雷(等效连续释放 1.8 次)
    let extraT5Lightnings = 0;
    if (has('thunder_5')) {
      extraT5Lightnings += baseLightnings * 0.70;
      extraT5Lightnings += Math.floor(combatTime / 30) * 1.8;
    }

    // 记录单体模型下，连锁闪电真实命中敌人的总次数
    const totalLightnings = baseLightnings + extraT5Lightnings;

    // 1. thunder_1 (引雷幡) 本体伤害
    if (has('thunder_1')) {
      totalDmg += totalLightnings * 9660 * thunderMultiplier;
    }

    // 2. thunder_3 (雷魄晶) 联动：静电过载 (8秒内18404伤害)
    // 假设覆盖率跟随基础闪电触发频率
    if (has('thunder_3')) {
      totalDmg += baseLightnings * 18404 * thunderMultiplier;
    }

    // 3. thunder_2 (紫霄葫) 核心联动：核算神雷值与激化伤害
    if (has('thunder_2')) {
      // 单体模型下，每次连锁闪电命中敌人增加 400 点神雷值
      let shenleiValue = totalLightnings * 400;

      // 满 10000 触发一次神雷激化
      const intensifyTriggers = Math.floor(shenleiValue / 10000);

      // 对接图中提取出的原版神雷激化单次伤害
      const baseThunderIntensifyDamage = 187610; 

      totalDmg += intensifyTriggers * baseThunderIntensifyDamage;
    }
  }

  return Math.floor(totalDmg);
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