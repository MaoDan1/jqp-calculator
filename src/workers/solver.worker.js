// src/workers/solver.worker.js

function calculateDamageScore(combo, selectedCards = []) {
  // 1. 移除虚假打底伤害，从 0 开始纯净计算
  let score = 0; 
  const spiritCounts = {};
  let activeSkill = '无';
  
  for (let i = 0; i < combo.length; i++) {
    const stone = combo[i];
    if (stone.spirit && stone.spirit !== '无') spiritCounts[stone.spirit] = (spiritCounts[stone.spirit] || 0) + 1;
    if (stone.spiritSkill && stone.spiritSkill !== '无') activeSkill = stone.spiritSkill;
  }

  // (移除了主动技能的硬编码送分，因为大招本身的收益应该体现在它触发的机巧石联动里)

  // 2. 被动灵蕴基础得分计算
  for (const spirit in spiritCounts) {
    const count = spiritCounts[spirit];
    const lvl = count > 5 ? 5 : count;
    const multiplier = 1 + 0.375 * (lvl - 1); 

    // ==================== 🌟 动态全局乘区计算 ====================
    let dynamicGlobalMultiplier = 1.0;

    // 【烈火燎原】5级联动：灼灼天炎使所有灵蕴伤害提高 33%，持续 15 秒
    if (spiritCounts['烈火燎原'] >= 5 && activeSkill === '灼灼天炎') {
      const triggerCount = 2.5; 
      const buffUptime = Math.min(1, (15 * triggerCount) / 240); 
      dynamicGlobalMultiplier += (0.33 * buffUptime);
    }

    // ========== 机巧石独立伤害核算 ==========
    if (spirit === '苍林浮生') {
      const summonCount = Math.floor(240 / 20);
      let damagePerSummon = 0;
      let levelMultiplier = 1;

      if (lvl < 3) {
        damagePerSummon = 10022 * 6; 
        levelMultiplier = 1 + 0.125 * (lvl - 1);
      } else {
        damagePerSummon = 145000;
        levelMultiplier = 1.25; 
        if (lvl > 3) {
          levelMultiplier += 0.135 * (lvl - 3);
        }
      }
      
      let totalDamage = damagePerSummon * summonCount * levelMultiplier;
      score += totalDamage * dynamicGlobalMultiplier; 
      // 修改点：直接乘刚刚计算的全局动态乘区 dynamicGlobalMultiplier (这里修正了原代码中未生效的bug)

    } else if (spirit === '烈焰焚身') { 
      let singleLayerDamage = 13000 * multiplier;
      
      // 3 级与 5 级的机制质变加成（直接作用于 DOT 伤害）
      if (lvl >= 3) singleLayerDamage *= 1.3;
      if (lvl >= 5) singleLayerDamage *= 1.5;

      // 单目标打桩场景：固定 3 层【焚尽】，每 15 秒 1 跳
      const burnStacks = 3; 
      const burnTickCount = 16; 
      let totalBurnDamage = singleLayerDamage * burnStacks * burnTickCount;

      // 5 级联动：主动技能【灼灼天炎】
      if (lvl >= 5 && activeSkill === '灼灼天炎') {
        totalBurnDamage += singleLayerDamage * 12 * 2.5;
      }

      // ==================== 🌟 新增：六尾魔狐 (fire_5) 跨模块联动 ====================
      // 3 级质变：六尾魔狐每次触发爆燃，额外添加 2 层烈焰焚身效果
      if (lvl >= 3 && selectedCards && selectedCards.includes('fire_5')) {
        // 同步 calcDanqingDamage 中的爆燃频率（240秒 / 6 = 40次）
        const totalExplosions = Math.floor(240 / 6); 
        // 40 次爆燃 × 每次 2 层
        totalBurnDamage += singleLayerDamage * 2 * totalExplosions;
      }

      score += totalBurnDamage * dynamicGlobalMultiplier;
    } else if (spirit === '霜寒破裂') { 
      const baseDamage = 60632;
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      let elementalCasts = 0;
      
      if (selectedCards && selectedCards.includes('ice_5')) {
        let totalArrows = selectedCards.includes('ice_1') ? Math.floor(240 / 6) : 0;
        if (selectedCards.includes('ice_3')) {
          totalArrows += Math.floor(240 / 14) * 3;
        }
        elementalCasts += Math.floor((240 + totalArrows * 2) / 60);
      }
      
      if (lvl >= 5 && activeSkill === '凝冰霜华') {
        elementalCasts += 2.5; 
      }
      
      if (elementalCasts > 0) {
        let totalDamage = baseDamage * levelMultiplier * elementalCasts;
        if (lvl >= 3) totalDamage += 76692 * elementalCasts;
        score += totalDamage * dynamicGlobalMultiplier;
      }

    } else if (spirit === '寒晶刺') { 
      const baseDamagePerThorn = 10992;
      const thornsPerTrigger = 3; 
      const baseTriggerDamage = baseDamagePerThorn * thornsPerTrigger; 
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      
      let totalArrows = 0;
      if (selectedCards && selectedCards.includes('ice_1')) totalArrows += Math.floor(240 / 6);
      if (selectedCards && selectedCards.includes('ice_3')) totalArrows += Math.floor(240 / 14) * 3;
      
      let triggerCount = Math.floor(totalArrows / 10);
      
      if (lvl >= 5) {
        let appearanceCount = 0;
        if (selectedCards && selectedCards.includes('ice_5')) appearanceCount += Math.floor((240 + totalArrows * 2) / 60);
        if (activeSkill === '凝冰霜华') appearanceCount += 2.5; 
        triggerCount += appearanceCount * 2;
      }

      if (triggerCount > 0) {
        let totalDamage = baseTriggerDamage * levelMultiplier * triggerCount;
        if (lvl >= 3) {
          const totalHits = triggerCount * 3;
          const shatterBaseDamage = 8484; 
          let shatterMultiplier = 1;
          if (selectedCards && selectedCards.includes('ice_4')) shatterMultiplier += 0.14;
          totalDamage += totalHits * shatterBaseDamage * shatterMultiplier;
        }
        score += totalDamage * dynamicGlobalMultiplier;
      }

    } else if (spirit === '烈火燎原') {
      const baseTickDamage = 29308;
      const duration = 8; 
      const baseTriggerDamage = baseTickDamage * duration; 
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      
      let triggerCount = 0;
      if (activeSkill === '灼灼天炎') triggerCount = 2.5; 
      
      if (triggerCount > 0) {
        let totalDamage = baseTriggerDamage * levelMultiplier * triggerCount;
        
        if (lvl >= 3) {
          const extraTianhuoValue = duration * 1500 * triggerCount;
          const intensifyTriggers = Math.floor(extraTianhuoValue / 10000);
          
          let baseIntensifyDamage = 195905;
          if (spiritCounts['神火迸发'] >= 3) baseIntensifyDamage *= 1.2;
          if (spiritCounts['赤焰天环'] >= 5) baseIntensifyDamage *= (8 / 5);
          
          totalDamage += intensifyTriggers * baseIntensifyDamage;
        }
        score += totalDamage * dynamicGlobalMultiplier;
      }

    } else if (spirit === '天火陨星') {
      const baseDamage = 26594;
      const baseTriggerCount = Math.floor(240 / 20) + 1; 
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      const valuePerMeteor = lvl >= 3 ? 3000 : 2000; 
      
      let baseTianhuoValue = baseTriggerCount * valuePerMeteor;
      
      if (spiritCounts['烈火燎原'] >= 3 && activeSkill === '灼灼天炎') {
        baseTianhuoValue += 2.5 * 8 * 1500; 
      }
      if (selectedCards && selectedCards.includes('fire_2')) {
        baseTianhuoValue += 31600; 
      }
      
      let finalMeteorCount = baseTriggerCount;
      if (lvl >= 5) {
        const totalIntensifies = Math.floor(baseTianhuoValue / (10000 - valuePerMeteor));
        finalMeteorCount += totalIntensifies;
      }
      
      let totalDamage = baseDamage * levelMultiplier * finalMeteorCount;
      if (lvl >= 3) {
        const dotTickDamage = 5342;
        const ticksPerTrigger = 5; 
        totalDamage += (dotTickDamage * ticksPerTrigger) * finalMeteorCount;
      }
      
      score += totalDamage * dynamicGlobalMultiplier;

    } else if (spirit === '寒潮冰涌') {
      const baseDamage = 38144;
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      let casts = lvl >= 3 ? 13 : 9; 
      if (lvl >= 5 && activeSkill === '凝冰霜华') casts += 10; 
      score += baseDamage * levelMultiplier * casts * dynamicGlobalMultiplier;

    } else if (spirit === '神木骰') {
      score += 150000 * dynamicGlobalMultiplier;
    } else if (spirit === '五雷珠') {
      score += 130000 * dynamicGlobalMultiplier; 
    } else if (spirit === '惊雷戟') {
      score += 20000 * dynamicGlobalMultiplier; 
    } else if (spirit === '赤焰天环') {
      let baseHit = 3080 * multiplier;
      if (lvl >= 3) baseHit *= 2;
      let hitsPerIntensify = lvl >= 5 ? 8 : 5;
      let totalDamagePerIntensify = baseHit * hitsPerIntensify;

      let fireValue = 0;
      if (spiritCounts['天火陨星']) {
        const meteorLvl = Math.min(spiritCounts['天火陨星'], 5);
        if (meteorLvl >= 1) fireValue += 26000;
        if (meteorLvl >= 3) fireValue += 16000;
      }
      const triggerCount = Math.floor(fireValue / 10000);
      score += totalDamagePerIntensify * triggerCount * dynamicGlobalMultiplier;

    } else if (spirit === '神火迸发') {
      let singleEruption = 65290 * multiplier;
      if (lvl >= 5) singleEruption *= 2; 
      
      let fireValue = 0;
      if (spiritCounts['天火陨星']) {
        const meteorLvl = Math.min(spiritCounts['天火陨星'], 5);
        if (meteorLvl >= 1) fireValue += 26000;
        if (meteorLvl >= 3) fireValue += 16000;
      }
      const triggerCount = Math.floor(fireValue / 10000);
      score += singleEruption * triggerCount * dynamicGlobalMultiplier;

    } else if (spirit === '裂地崩') {
      let totalDamage = 207708 * multiplier * 2.5;
      if (lvl >= 3) totalDamage += 86610 * 2.5;
      if (lvl >= 5) totalDamage += 2887 * 20;
      score += totalDamage * dynamicGlobalMultiplier;

    } else {
      // 3. 移除未知石头的保底高分，防止无机制的废石头扰乱评级
      score += 0; 
    }
  }

  // 4. 叠加四元素激化得分 (激化基础伤害不吃石头自身的增伤乘区，保持原样)
  score += calcFireIntensify(spiritCounts);
  score += calcIceIntensify(spiritCounts);
  score += calcWoodIntensify(spiritCounts, activeSkill); 
  score += calcThunderIntensify(spiritCounts);

  // 5. 丹青绘灵卡牌加成计算
  if (selectedCards && selectedCards.length > 0) {
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