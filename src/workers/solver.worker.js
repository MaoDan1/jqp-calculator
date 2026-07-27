// src/workers/solver.worker.js

function calculateDamageScore(combo, selectedCards = []) {
  // 1. 移除虚假打底伤害，从 0 开始纯净计算
  let score = 0; 
  const spiritCounts = {};
  let activeSkill = '无';
  // 🌟 新增：专门用于跨模块传递数据的独立变量
  let dynamicIceValue = 0;
  
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
      // 1/5 效果：基础伤害
      const baseDamage = 38144;
      
      // 2/5 ~ 5/5 效果：基础伤害提高 37.5%
      const levelMultiplier = 1 + (lvl - 1) * 0.375;
      
      // 3/5 效果判定：生效间隔缩短 10 秒
      const interval = lvl >= 3 ? (30 - 10) : 30;
      
      // 1/5 效果：进入战斗 (首发 1 次) 及之后每 interval 秒获得效果
      let casts = 1 + Math.floor(240 / interval);
      
      // 5/5 效果：凝冰霜华期间释放 4 道寒潮 (按4分钟2.5次大招计算)
      if (lvl >= 5 && activeSkill === '凝冰霜华') {
        casts += (4 * 2.5); 
      }
      
      // 核算总直伤
      score += baseDamage * levelMultiplier * casts * dynamicGlobalMultiplier;
      
      // 3/5 效果：对命中的敌人累加 2000 玄冰值
      if (lvl >= 3) {
        // 传递给底层的玄冰激化函数
        dynamicIceValue = casts * 2000;
      }
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
  score += calcIceIntensify(spiritCounts, dynamicIceValue);
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

  // 🌟 直接加上外部传进来的真实玄冰值
  iceValue += dynamicIceValue;
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
  if (has('fire_1') || has('fire_2') || has('fire_3') || has('fire_4') || has('fire_5')) {
    // 岁兽 (fire_3)：燃烧生效频率提高80% (基础3秒缩短至约1.67秒)
    const tickInterval = has('fire_3') ? (3 / 1.8) : 3;
    
    let currentStacks = 1; // 初始默认 1 层
    let totalBurnTicks = 0;
    let totalExplosions = 0;
    let totalExplodedStacks = 0;
    let fire1Damage = 0;
    
    let applyAttempts = 1; // 记录总计尝试施加燃烧的次数 (用于二尾妖狐)
    let lastBaseApplyCount = 0;
    let pendingExplosionTime = -1; // -1表示当前没有正在倒计时的爆燃
    
    // 开启 4分钟 (240秒) 的时间轴模拟
    for (let t = 0; t <= combatTime; t += tickInterval) {
      // 1. 基础施加逻辑：假设玩家攻击或其他常驻机制，每 8 秒稳定施加 1 次
      let currentBaseApplyCount = Math.floor(t / 8);
      let newBaseApplies = currentBaseApplyCount - lastBaseApplyCount;
      if (newBaseApplies > 0) {
        applyAttempts += newBaseApplies;
        currentStacks += newBaseApplies;
        lastBaseApplyCount = currentBaseApplyCount;
      }

      // 2. 六尾魔狐 (fire_5) 延时爆燃结算：检查是否达到 1.5 秒的引爆时间
      if (pendingExplosionTime !== -1 && t >= pendingExplosionTime) {
        totalExplosions++;
        // 引爆目标身上"额外"燃烧效果 (即总层数 - 1)
        let detStacks = Math.max(0, currentStacks - 1);
        totalExplodedStacks += detStacks;
        currentStacks = 1; // 爆燃后重置为 1 层
        pendingExplosionTime = -1;
      }

      // 3. 层数上限控制 (最高 8 层)
      if (currentStacks > 8) currentStacks = 8;

      // 4. 猩红巨蚁 (fire_1) 伤害结算：每额外1层提高5%
      let multiplier = 1 + (currentStacks - 1) * 0.05;
      fire1Damage += 3169 * multiplier;
      totalBurnTicks++;

      // 5. 岁兽 (fire_3) 核心联动：造成伤害时 100% 概率额外叠加 1 层
      if (has('fire_3')) {
        applyAttempts += 1;
        currentStacks += 1;
      }
      
      // 6. 六尾魔狐 (fire_5) 触发检测：叠加至 6 层以上，且不在倒计时中
      if (has('fire_5') && currentStacks >= 6 && pendingExplosionTime === -1) {
        // 挂载一个 1.5 秒后的定时炸弹
        pendingExplosionTime = t + 1.5;
      }
    }

    // ========== 核算并汇总天火系最终伤害 ==========
    
    // 1. 猩红巨蚁本体伤害
    if (has('fire_1')) totalDmg += fire1Damage;
    
    // 2. 二尾妖狐 (fire_4)：尝试添加/叠加即刻造成 5280 伤害
    if (has('fire_4')) {
      totalDmg += applyAttempts * 5280;
    }
    
    // 3. 六尾魔狐 (fire_5)：引爆额外层数，每层造成 11505 伤害
    if (has('fire_5')) {
      totalDmg += totalExplodedStacks * 11505;
    }

    // 4. 猛虎 (fire_2) 充能与激化联动
    if (has('fire_2')) {
      let tianhuoValue = 0;
      tianhuoValue += totalBurnTicks * 140;   // 燃烧伤害 +140
      tianhuoValue += totalExplosions * 760;  // 触发爆燃 +760

      const intensifyTriggers = Math.floor(tianhuoValue / 10000);
      let baseIntensifyDamage = 195905;
      
      // 继承外部的机巧石增伤乘区
      if (spiritCounts['神火迸发'] >= 3) baseIntensifyDamage *= 1.2;
      if (spiritCounts['赤焰天环'] >= 5) baseIntensifyDamage *= (8 / 5);
      
      totalDmg += intensifyTriggers * baseIntensifyDamage;
    }
  }

 // ==================== ❄️ 玄冰系 (冰箭/风暴/碎裂/激化) ====================
  if (has('ice_1') || has('ice_2') || has('ice_3') || has('ice_4') || has('ice_5')) {
    let totalArrows = 0;
    let totalStorms = 0;
    let stormCd = 0; // 齐昊风暴的当前剩余CD

    // 🌟 开启 4分钟 (240秒) 时间轴模拟，精准计算高频冰箭与风暴的减CD联动
    for (let t = 0; t <= combatTime; t++) {
      let arrowsThisTick = 0;
      
      // 1. 燕虹 (ice_1)：每 6 秒发射 1 枚冰箭
      if (has('ice_1') && t % 6 === 0) arrowsThisTick += 1;
      
      // 2. 文敏 (ice_3)：战斗中每经过 10 秒，召唤 3 枚冰箭
      if (has('ice_3') && t > 0 && t % 10 === 0) arrowsThisTick += 3;

      totalArrows += arrowsThisTick;

      // 3. 齐昊 (ice_5)：玄冰风暴 (60秒内置冷却)
      if (has('ice_5')) {
        // CD 就绪，释放风暴
        if (stormCd <= 0) {
          totalStorms++;
          stormCd = 60; // 释放后重置为 60 秒
        }
        
        // 冰箭造成伤害时，风暴冷却时间缩短 2 秒 (当秒立刻生效)
        if (arrowsThisTick > 0) {
          stormCd -= (2 * arrowsThisTick);
        }
        
        // 自然时间流逝 1 秒
        stormCd -= 1;
      }
    }

    // ========== 伤害与倍率核算 ==========

    // 文敏 (ice_3) 提高 40% 冰箭伤害，左归 (ice_4) 提高 20% 冰箭与风暴伤害
    const arrowMult = 1 + (has('ice_3') ? 0.40 : 0) + (has('ice_4') ? 0.20 : 0);
    const stormMult = 1 + (has('ice_4') ? 0.20 : 0);

    // 1. 冰箭与风暴本体伤害
    // 燕虹冰箭基础伤害为 6900
    totalDmg += totalArrows * 6900 * arrowMult;
    // 齐昊风暴基础伤害为 184040
    totalDmg += totalStorms * 184040 * stormMult;

    // 2. 左归 (ice_4) 碎裂联动
    let totalShatters = 0;
    if (has('ice_4')) {
      const totalHits = totalArrows + totalStorms;
      totalShatters = totalHits * 0.30; // 30% 期望触发概率
      // 碎裂对目标造成额外 12120 伤害 (碎裂属于额外固定伤害，不吃前面的技能增伤)
      totalDmg += totalShatters * 12120;
    }

    // 3. 上官策 (ice_2) 核心联动：核算玄冰值与激化伤害
    if (has('ice_2')) {
      let xuanbingValue = 0;
      
      xuanbingValue += totalArrows * 200;    // 冰箭每次叠加 200 点
      xuanbingValue += totalShatters * 200;  // 碎裂每次叠加 200 点
      xuanbingValue += totalStorms * 2000;   // 风暴每次叠加 2000 点

      // 满 10000 触发一次玄冰激化
      const intensifyTriggers = Math.floor(xuanbingValue / 10000);
      
      // 玄冰激化单次基础伤害
      const baseIceIntensifyDamage = 128861; 
      
      totalDmg += intensifyTriggers * baseIceIntensifyDamage;
    }
  }

  // ==================== 🌱 苍木系 (脉冲/激化) ====================
  if (has('wood_1') || has('wood_2') || has('wood_3') || has('wood_4') || has('wood_5')) {
    // 1. 六合镜 (wood_5)：脉冲基础 CD 从 15秒 减为 10秒 (缩短5秒)
    const baseInterval = has('wood_5') ? 10 : 15;
    
    // 基础触发事件次数 (4分钟240秒内，每10/15秒触发一次)
    let triggerEvents = has('wood_1') ? Math.floor(combatTime / baseInterval) : 0;
    
    // 2. 神木骰 (wood_3) 联动：开局6秒内额外触发 3 次脉冲事件
    if (has('wood_3')) {
      triggerEvents += 3;
    }

    // 3. 六合镜 (wood_5) 联动：每次脉冲触发时，额外触发 2 次 (即1次变3次)，且为 100% 效能
    // 算出整场战斗中，真实打在敌人身上的脉冲总次数
    const totalPulses = triggerEvents * (has('wood_5') ? 3 : 1);

    // 4. 林峰 (wood_4) 联动：单体模型下，苍木伤害提高 80%
    const woodMultiplier = 1 + (has('wood_4') ? 0.80 : 0);

    // ========== 伤害与激化核算 ==========

    // 1. 折扇 (wood_1) 基础脉冲伤害
    if (has('wood_1')) {
      // 当前六合镜带来的额外脉冲也是100%伤害效能
      totalDmg += totalPulses * 13992 * woodMultiplier;
    }

    // 2. 神木骰 (wood_3) 附加伤害
    if (has('wood_3')) {
      // 脉冲造成伤害时，额外造成 17165 伤害，此效果可重复生效
      // 意味着每一道真实的脉冲命中，都会带出这笔巨额附加伤
      totalDmg += totalPulses * 17165 * woodMultiplier;
    }

    // 3. 清凉珠 (wood_2) 核心联动：核算苍木值与激化伤害
    if (has('wood_2')) {
      // 每次脉冲命中敌人增加 400 点苍木值
      let cangmuValue = totalPulses * 400;

      // 满 10000 触发一次苍木激化
      const intensifyTriggers = Math.floor(cangmuValue / 10000);

      // 继承底层的单次苍木激化基础伤害
      const baseWoodIntensifyDamage = 440568; 

      totalDmg += intensifyTriggers * baseWoodIntensifyDamage;
    }
  }

  // ==================== ⚡ 神雷系 (连锁闪电/过载/激化) ====================
  if (has('thunder_1') || has('thunder_2') || has('thunder_3') || has('thunder_4') || has('thunder_5')) {
    let t1Procs = 0;
    let t5Procs = 0;

    // 🌟 开启 4分钟 (240秒) 时间轴模拟
    // 精准分离 12秒常规闪电 和 30秒狂雷爆发 的独立时间轴
    for (let t = 0; t <= combatTime; t++) {
      // 1. 引雷幡 (thunder_1)：12秒内置冷却
      if (has('thunder_1') && t % 12 === 0) {
        t1Procs++;
      }
      // 2. 紫电螭吻 (thunder_5)：进入战斗及其之后的每30秒，释放狂雷
      if (has('thunder_5') && t % 30 === 0) {
        t5Procs++;
      }
    }

    // ========== 核心打击数与等效伤害核算 ==========

    // 1. T1 常规闪电打击数
    // 基础触发 1 次，如果携带 T5，100% 概率额外触发 1 次 (合计 2 次)
    const hitsPerT1 = 1 + (has('thunder_5') ? 1 : 0);
    
    // 2. 真实总命中次数 (用于算充能和过载)
    // 常规闪电次数 + 狂雷次数 (每次狂雷连续释放 3 次)
    const totalLightningHits = (t1Procs * hitsPerT1) + (t5Procs * 3);
    
    // 3. 等效伤害总打击数 (将狂雷 120% 的效能倍率折算进去)
    const equivalentDamageHits = (t1Procs * hitsPerT1) + (t5Procs * 3 * 1.2);
    
    // 4. 总事件触发次数 (用于计算雷魄晶过载的施加次数)
    const totalProcEvents = t1Procs + t5Procs;

    // 5. 连雷壁 (thunder_4) 联动：单体模型下，神雷伤害无条件提高 60%
    const thunderMultiplier = 1 + (has('thunder_4') ? 0.60 : 0);

    // ========== 最终伤害与激化落地 ==========

    // A. 连锁闪电 / 狂雷 本体伤害
    if (has('thunder_1') || has('thunder_5')) {
      // 基础伤害 13800[cite: 1]
      totalDmg += equivalentDamageHits * 13800 * thunderMultiplier;
    }

    // B. 雷魄晶 (thunder_3) 联动：静电过载
    if (has('thunder_3')) {
      // 每次触发事件（无论是常规还是狂雷）都会施加过载，8秒内造成 23012 伤害
      totalDmg += totalProcEvents * 23012 * thunderMultiplier;
    }

    // C. 紫霄葫 (thunder_2) 核心联动：神雷值与激化
    if (has('thunder_2')) {
      // 每次连锁闪电命中敌人，累加 560 神雷值
      let shenleiValue = totalLightningHits * 560;

      // 满 10000 触发一次神雷激化[cite: 2]
      const intensifyTriggers = Math.floor(shenleiValue / 10000);

      // 神雷激化单次基础伤害 187610 (延续之前提取的底层数据)
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