<template>
  <div class="jiqiaopan-container">
    <div class="header">
      <h2>机巧盘排盘求解器</h2>
    </div>

    <!-- ==================== 终极五列展开布局 ==================== -->
    <div class="main-content">
      
      <!-- 第 1 列：本套方案所用机巧石 -->
      <div class="col-used-stones" v-if="allSolutions.length > 0">
        <div class="panel-box">
          <h4 class="panel-title">本套方案所用机巧石 (共 {{ targetStonesCount }} 块)</h4>
          <div class="used-stones-list">
            <div class="used-stone-item" v-for="stone in currentSolutionStones" :key="stone.uid">
              <div class="used-shape-badge" :title="stone.name">
                <div class="shape-preview">
                  <div class="preview-row" v-for="(row, rIdx) in stone.matrix" :key="rIdx">
                    <div class="preview-cell" v-for="(val, cIdx) in row" :key="cIdx" :class="{ 'is-solid': val === 1, [stone.shapeId]: val === 1 }"></div>
                  </div>
                </div>
              </div>
              <div class="stone-tags">
                <span class="tag resonance">{{ stone.resonance }}</span>
                <span class="tag quality">{{ stone.quality }}</span>
                <span class="tag attribute" v-if="stone.attribute !== '无'">{{ stone.attribute }}</span>
                <span class="tag spirit" v-if="stone.spirit !== '无'" :style="{ backgroundColor: getSpiritColor(stone.spirit, 0.2), color: getSpiritColor(stone.spirit, 1) }">{{ stone.spirit }}</span>
                <span class="tag spirit-skill" v-if="stone.spiritSkill && stone.spiritSkill !== '无'" :style="{ backgroundColor: getSpiritSkillColor(stone.spiritSkill, 0.15), color: getSpiritSkillColor(stone.spiritSkill, 1), border: '1px solid ' + getSpiritSkillColor(stone.spiritSkill, 0.4) }">技: {{ stone.spiritSkill }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 第 2 列：伤害与属性面板 / 智能建议卡片 -->
      <div class="col-stats">
        
        <!-- 状态 1：有方案时，正常展示排盘数据 -->
        <div class="panel-box" v-if="allSolutions.length > 0">
          <div class="damage-highlight">
            <span class="dmg-label">🔥 4分钟对单预期总伤 (实战加权榜)</span>
            <span class="dmg-value">{{ currentExpectedDamage.toLocaleString() }}</span>
          </div>

          <div class="stats-panel">
            <div class="spirit-stats" v-if="activeSpiritSkills.length > 0">
              <h4 class="sub-title">⚔️ 主动灵蕴技 (匠心石)</h4>
              <div class="spirit-list">
                <div class="spirit-item" v-for="skill in activeSpiritSkills" :key="skill.name" :style="{ borderLeftColor: skill.color }">
                  <span class="spirit-name" :style="{ color: skill.color }">{{ skill.element }} · {{ skill.name }}</span>
                  <div class="level-info"><span class="stat-value" style="margin-left:0;">已激活</span></div>
                </div>
              </div>
            </div>

            <div class="spirit-stats">
              <h4 class="sub-title">📊 基础属性效果</h4>
              <div class="spirit-list" v-if="activeAttributes.length > 0">
                <div class="spirit-item" v-for="attr in activeAttributes" :key="attr.name" style="border-left-color: #d08770;">
                  <span class="spirit-name" style="color: #d08770;">属性 · {{ attr.name }}</span>
                  <div class="level-info">
                    <span class="spirit-level">Lv.{{ attr.level }}</span><span class="max-level"> / 9</span>
                    <span class="stat-value">增加 {{ attr.value }}</span>
                  </div>
                </div>
              </div>
              <div class="empty-stats" v-else>无基础属性加成</div>
            </div>

            <div class="spirit-stats">
              <h4 class="sub-title">✨ 灵蕴激活效果</h4>
              <div class="spirit-list" v-if="activeSpirits.length > 0">
                <div class="spirit-item" v-for="spirit in activeSpirits" :key="spirit.name" :style="{ borderLeftColor: spirit.color }">
                  <span class="spirit-name" :style="{ color: spirit.color }">{{ spirit.element }} · {{ spirit.name }}</span>
                  <div class="level-info">
                    <span class="spirit-level">Lv.{{ spirit.level }}</span><span class="max-level"> / 5</span>
                    <span v-if="spirit.total > 5" class="overflow-warn">(溢出 {{ spirit.total - 5 }})</span>
                  </div>
                </div>
              </div>
              <div class="empty-stats" v-else>无被动灵蕴加成</div>
            </div>
          </div>
        </div>
        
        <!-- 状态 2：无完美方案且差1~2块石头，或满石头无解时，展示建议卡片 -->
        <div class="panel-box" v-else-if="(missingCount > 0 && missingCount <= 2 && !isSolving) || (hasSearched && allSolutions.length === 0)">
           <div class="suggest-section" style="margin-top: 0; background: transparent; border: none; padding: 0;">
             <button class="suggest-btn" @click="startSuggesting" :disabled="isSuggesting">
               {{ isSuggesting ? '正在推演完美拼图组合...' : '💡 寻求完美填满建议' }}
             </button>
             
             <div v-if="suggestResults.length > 0" class="suggest-results" style="margin-top: 20px;">
               <p style="margin-bottom: 15px; font-size: 14px;">建议添加以下形状：</p>
               <div class="suggest-tags">
                 <div v-for="sug in suggestResults" :key="sug.key" class="suggest-tag-visual">
                   <template v-for="(shape, sIdx) in sug.shapes" :key="sIdx">
                     <div class="shape-preview suggest-shape" :title="shape.name">
                       <div class="preview-row" v-for="(row, rIdx) in shape.matrix" :key="rIdx">
                         <div class="preview-cell" v-for="(val, cIdx) in row" :key="cIdx" :class="{ 'is-solid': val === 1, [shape.id]: val === 1 }"></div>
                       </div>
                     </div>
                     <span v-if="sIdx < sug.shapes.length - 1" class="plus-sign">+</span>
                   </template>
                 </div>
               </div>
             </div>
             
             <div v-else-if="hasSuggested && suggestResults.length === 0" class="suggest-results" style="margin-top: 20px;">
               <p style="color: #bf616a;">当前即便补充石头也无法完美填满，建议清空一两块重试。</p>
             </div>
           </div>
        </div>

        <!-- 状态 3：刚开始排盘，缺少大量石头时，展示兜底图标 -->
        <div class="empty-details" v-else>
          <div class="empty-icon">📊</div>
          <p>暂无排盘数据</p>
          <span class="empty-sub" v-if="totalStones < targetStonesCount">当前等级需要至少 {{ targetStonesCount }} 块石头<br>请在右侧继续录入</span>
          <span class="empty-sub" v-else>准备就绪，随时可以进行演算...</span>
        </div>
      </div>

      <!-- 第 3 列：中心棋盘与控制 -->
      <div class="col-board">
        <div class="level-control">
          <label>⛩️ 机巧盘等级：</label>
          <select v-model="jiqiaopanLevel" @change="handleLevelChange">
            <option v-for="l in 7" :key="l" :value="l">{{ l }} 级 (满盘 {{ l + 3 }} 块石)</option>
          </select>
        </div>

        <div class="board-container">
          <div class="board">
            <div class="board-row" v-for="(row, rowIndex) in currentBoardView" :key="rowIndex">
              <div class="board-cell" v-for="(cell, colIndex) in row" :key="colIndex" :class="getCellColorClass(cell)" :style="getCellStyle(cell, rowIndex, colIndex)" :data-tooltip="getStoneTooltip(cell)"></div>
            </div>
          </div>
        </div>

        <div class="controls">
          <div class="status-panel">
            <p>背包总数：<strong>{{ totalStones }}</strong> 块 (含匠心石)</p>
            <button class="solve-btn" :disabled="totalStones < targetStonesCount || isSolving" @click="startSolving">
              {{ isSolving ? searchProgress : (totalStones < targetStonesCount ? `石头不足 (还差 ${targetStonesCount - totalStones} 块)` : '启动核心演算') }}
            </button>
            <p class="limit-note" v-if="totalStones < targetStonesCount">(当前等级需要录入满 {{ targetStonesCount }} 块方可触发自动分析)</p>
            
          </div>

          <div class="solution-nav" v-if="allSolutions.length > 0">
            <button @click="prevSolution" :disabled="currentSolutionIndex === 0">上一方案</button>
            <span class="solution-count">最优解方案 {{ currentSolutionIndex + 1 }} / {{ allSolutions.length }}</span>
            <button @click="nextSolution" :disabled="currentSolutionIndex === allSolutions.length - 1">下一方案</button>
          </div>

          <div class="no-solution" v-else-if="hasSearched && allSolutions.length === 0">
            <p style="color:#d8dee9; margin-bottom: 5px;">当前背包内的石头无法完美填满 {{ jiqiaopanLevel }} 级异形棋盘。</p>
            
          </div>
        </div>
      </div>

      <!-- 第 4 列：功能卡片管理区 (拉长 Tab + 动态卡片切换) -->
      <div class="col-management">
        <!-- 1. 顶部拉长的大 Tab 导航栏 -->
        <div class="section-tabs full-width-tabs">
          <button :class="{ active: activeTab === 'jiqiao' }" @click="activeTab = 'jiqiao'">✦ 机巧石</button>
          <button :class="{ active: activeTab === 'jiangxin' }" @click="activeTab = 'jiangxin'">❖ 匠心石</button>
          <button :class="{ active: activeTab === 'danqing' }" @click="activeTab = 'danqing'">❖ 丹青</button>
        </div>

        <!-- 2. 当选中 机巧石 或 匠心石 时：左右同级显示【录入卡片】和【列表卡片】 -->
        <div class="management-grid" v-if="activeTab === 'jiqiao' || activeTab === 'jiangxin'">
          <!-- 左侧：录入卡片 -->
          <div class="panel-box stone-creator">
            <h4 class="panel-title">录入{{ activeTab === 'jiqiao' ? '机巧石' : '匠心石' }}</h4>
            
            <!-- 机巧石表单 -->
            <div class="form-grid" v-if="activeTab === 'jiqiao'">
              <div class="form-group full-width">
                <label>形状</label>
                <div class="shape-selector">
                  <div v-for="s in PRESET_SHAPES.filter(s => s.id !== 'shape_C')" :key="s.id" class="shape-option" :class="{ 'active': newJiqiao.shapeId === s.id }" @click="newJiqiao.shapeId = s.id" :title="s.name">
                    <div class="shape-preview">
                      <div class="preview-row" v-for="(row, rIdx) in s.matrix" :key="rIdx">
                        <div class="preview-cell" v-for="(val, cIdx) in row" :key="cIdx" :class="{ 'is-solid': val === 1, [s.id]: val === 1 }"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label>共鸣</label>
                <select v-model="newJiqiao.resonance"><option v-for="r in OPTIONS.resonances" :key="r" :value="r">{{r}}</option></select>
              </div>
              <div class="form-group">
                <label>品级</label>
                <select v-model="newJiqiao.quality"><option v-for="q in OPTIONS.qualities" :key="q" :value="q">{{q}}</option></select>
              </div>
              <div class="form-group">
                <label>属性</label>
                <select v-model="newJiqiao.attribute"><option v-for="a in OPTIONS.attributes" :key="a" :value="a">{{a}}</option></select>
              </div>
              <div class="form-group">
                <label>被动灵蕴</label>
                <select v-model="newJiqiao.spirit"><option v-for="sp in availableSpirits" :key="sp" :value="sp">{{sp}} ({{SPIRIT_DICT[sp].element}})</option></select>
              </div>
            </div>

            <!-- 匠心石表单 -->
            <div class="form-grid" v-else>
              <div class="form-group">
                <label>共鸣 (元素)</label>
                <select v-model="newJiangxin.resonance"><option v-for="r in OPTIONS.resonances" :key="r" :value="r">{{r}}</option></select>
              </div>
              <div class="form-group">
                <label>品级</label>
                <select v-model="newJiangxin.quality"><option v-for="q in OPTIONS.qualities" :key="q" :value="q">{{q}}</option></select>
              </div>
              <div class="form-group full-width">
                <label>主动灵蕴技</label>
                <select v-model="newJiangxin.spiritSkill"><option v-for="sk in availableActiveSkills" :key="sk" :value="sk">{{ sk }} ({{ SPIRIT_SKILL_DICT[sk].element }})</option></select>
              </div>
            </div>

            <button class="add-btn" @click="addStone">添加到背包</button>
          </div>

          <!-- 右侧：机巧石列表卡片 -->
          <div class="panel-box inventory-list-container">
            <div class="inventory-header">
              <h4 class="panel-title" style="border:none; margin:0; padding:0;">机巧石列表</h4>
              <button class="clear-btn" v-if="inventory.length > 0" @click="clearInventory">清空全部背包</button>
            </div>
            
            <div class="inventory-list" v-if="displayedInventory.length > 0">
              <div class="inventory-item" v-for="item in displayedInventory" :key="item.uid">
                <div class="shape-preview">
                  <div class="preview-row" v-for="(row, rIdx) in item.matrix" :key="rIdx">
                    <div class="preview-cell" v-for="(val, cIdx) in row" :key="cIdx" :class="{ 'is-solid': val === 1, [item.shapeId]: val === 1 }"></div>
                  </div>
                </div>
                <div class="item-info">
                  <div class="tags">
                    <span class="tag quality" :class="item.quality">{{ item.quality }}</span>
                    <span class="tag resonance">{{ item.resonance }}</span>
                    <span class="tag attribute" v-if="item.attribute !== '无'">{{ item.attribute }}</span>
                    <span class="tag spirit" v-if="item.spirit !== '无'" :style="{ backgroundColor: getSpiritColor(item.spirit, 0.2), color: getSpiritColor(item.spirit, 1) }">{{ item.spirit }}</span>
                    <span class="tag spirit-skill" v-if="item.spiritSkill && item.spiritSkill !== '无'" :style="{ backgroundColor: getSpiritSkillColor(item.spiritSkill, 0.15), color: getSpiritSkillColor(item.spiritSkill, 1), border: '1px solid ' + getSpiritSkillColor(item.spiritSkill, 0.4) }">技: {{ item.spiritSkill }}</span>
                  </div>
                </div>
                <button class="delete-btn" @click="removeStone(item.uid)">×</button>
              </div>
            </div>
            <div class="empty-inventory" v-else>当前页签下没有石块。</div>
          </div>
        </div>

        <!-- 3. 当选中 丹青 时：替换为宽幅丹青卡牌配置面板 -->
        <div class="panel-box danqing-full-card" v-else>
          <h4 class="panel-title">丹青绘灵卡牌激活配置</h4>
          <div class="danqing-hint">点击勾选/取消卡牌（共 20 张）：</div>
          <div class="danqing-grid">
            <div 
              v-for="card in DANQING_CARDS" 
              :key="card.id"
              class="danqing-card-item"
              :class="{ 'selected': selectedCards.includes(card.id) }"
              :style="getCardStyle(card)"
              @click="toggleCard(card.id)"
            >
              <div class="card-element" :style="{ color: card.color }">
                {{ card.element }} · {{ card.cost }}
              </div>
              <div class="card-name">
                {{ card.name }}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

// 【引入模块】
import { PRESET_SHAPES, SPIRIT_DICT, SPIRIT_SKILL_DICT, OPTIONS, getSpiritColor, getSpiritSkillColor } from './constants/config.js';
import SolverWorker from './workers/solver.worker.js?worker'; 
// 引入卡牌配置
import { DANQING_CARDS } from './constants/cards.js';



// 选中的丹青卡牌状态 (本地缓存保存)
const selectedCards = ref(JSON.parse(localStorage.getItem('jiqiaopan_danqing')) || []);

watch(selectedCards, (newVal) => {
  // 依然保留本地缓存功能，刷新网页卡牌选择不会丢
  localStorage.setItem('jiqiaopan_danqing', JSON.stringify(newVal));
  
  // ❌ 删掉或注释掉下面这行，彻底关闭丹青界面的“点一下算一下”
  // triggerAutoSolve(); 
}, { deep: true });

const toggleCard = (cardId) => {
  if (selectedCards.value.includes(cardId)) {
    selectedCards.value = selectedCards.value.filter(id => id !== cardId);
  } else {
    selectedCards.value.push(cardId);
  }
};

const getCardStyle = (card) => {
  const isSelected = selectedCards.value.includes(card.id);
  return {
    borderColor: isSelected ? card.color : '#4c566a',
    backgroundColor: isSelected ? `${card.color}25` : '#3b4252',
    boxShadow: isSelected ? `0 0 8px ${card.color}aa` : 'none',
  };
};

const jiqiaopanLevel = ref(parseInt(localStorage.getItem('jiqiaopan_level')) || 3);
const targetStonesCount = computed(() => jiqiaopanLevel.value + 3);

const validCells = computed(() => {
  const cells = [];
  const level = jiqiaopanLevel.value;
  for(let r=1; r<=4; r++) for(let c=1; c<=4; c++) cells.push([r,c]);
  if (level >= 2) for(let r=1; r<=4; r++) cells.push([r,0]);
  if (level >= 3) for(let r=1; r<=4; r++) cells.push([r,5]);
  if (level >= 4) for(let c=0; c<=3; c++) cells.push([5,c]);
  if (level >= 5) for(let c=0; c<=3; c++) cells.push([6,c]);
  if (level >= 6) { cells.push([5,4]); cells.push([5,5]); cells.push([6,4]); cells.push([6,5]); }
  if (level >= 7) for(let c=1; c<=4; c++) cells.push([0,c]);
  return cells;
});

const handleLevelChange = () => {
  localStorage.setItem('jiqiaopan_level', jiqiaopanLevel.value);
  resetSearchState();
};

const activeTab = ref('jiqiao');

const newJiqiao = ref({ shapeId: PRESET_SHAPES[0].id, resonance: OPTIONS.resonances[0], quality: OPTIONS.qualities[0], attribute: OPTIONS.attributes[0], spirit: '天火陨星' });
const newJiangxin = ref({ resonance: OPTIONS.resonances[0], quality: OPTIONS.qualities[0], spiritSkill: '灼灼天炎' });

const availableSpirits = computed(() => Object.keys(SPIRIT_DICT).filter(k => k !== '无' && SPIRIT_DICT[k].element === newJiqiao.value.resonance.replace('共鸣', '')));
const availableActiveSkills = computed(() => Object.keys(SPIRIT_SKILL_DICT).filter(k => k !== '无' && SPIRIT_SKILL_DICT[k].element === newJiangxin.value.resonance.replace('共鸣', '')));

watch(() => newJiqiao.value.resonance, () => { if (!availableSpirits.value.includes(newJiqiao.value.spirit)) newJiqiao.value.spirit = availableSpirits.value[0]; });
watch(() => newJiangxin.value.resonance, () => { if (!availableActiveSkills.value.includes(newJiangxin.value.spiritSkill)) newJiangxin.value.spiritSkill = availableActiveSkills.value[0]; });

const inventory = ref([]);
let globalStoneId = 1;

const cachedData = localStorage.getItem('jiqiaopan_inventory');
if (cachedData) {
  try {
    inventory.value = JSON.parse(cachedData);
    let maxId = 0;
    inventory.value.forEach(item => { const idNum = parseInt(item.uid.split('-')[1], 10); if (idNum > maxId) maxId = idNum; });
    globalStoneId = maxId + 1;
  } catch (error) { console.error('读取缓存失败:', error); }
}

watch(inventory, (newInventory) => { localStorage.setItem('jiqiaopan_inventory', JSON.stringify(newInventory)); }, { deep: true });

const displayedInventory = computed(() => inventory.value.filter(item => activeTab.value === 'jiqiao' ? item.shapeId !== 'shape_C' : item.shapeId === 'shape_C'));

const allSolutions = ref([]);
const currentSolutionIndex = ref(0);
const isSolving = ref(false);
const searchProgress = ref('');
const hasSearched = ref(false);
let calculationWorker = null; 

const totalStones = computed(() => inventory.value.length);


// ==================== 智能建议系统状态 ====================
const isSuggesting = ref(false);
const hasSuggested = ref(false);
const suggestResults = ref([]);

// 计算当前缺少的石头数量
const missingCount = computed(() => targetStonesCount.value - totalStones.value);

// 监听背包变动：一旦你修改了石头，重置建议结果
watch(inventory, () => {
  hasSuggested.value = false;
  suggestResults.value = [];
}, { deep: true });

// 核心建议算法
const startSuggesting = async () => {
  isSuggesting.value = true;
  hasSuggested.value = false;
  suggestResults.value = [];
  
  const testCases = [];
  const standardShapes = PRESET_SHAPES.filter(s => s.id !== 'shape_C');
  
  const createDummy = (shape) => ({ 
    uid: `dummy-${Date.now()}-${Math.random()}`, 
    shapeId: shape.id, 
    name: shape.name, 
    matrix: shape.matrix, 
    rotations: getUniqueRotations(shape.matrix), 
    resonance: '无', quality: '凡品', attribute: '无', spirit: '无', spiritSkill: '无' 
  });

  if (missingCount.value === 1) {
    // 差1块
    standardShapes.forEach(s1 => {
      // 【修改】：保存整个 shape 对象，而不只是 name
      testCases.push({ addedShapes: [s1], inventory: [...inventory.value, createDummy(s1)] });
    });
  } else if (missingCount.value === 2) {
    // 差2块
    for (let i = 0; i < standardShapes.length; i++) {
      for (let j = i; j < standardShapes.length; j++) {
        testCases.push({
          // 【修改】：保存两个 shape 对象
          addedShapes: [standardShapes[i], standardShapes[j]],
          inventory: [...inventory.value, createDummy(standardShapes[i]), createDummy(standardShapes[j])]
        });
      }
    }
  } else if (missingCount.value === 0) {
    // 满了但无解
    standardShapes.forEach(s1 => {
      testCases.push({ 
        addedShapes: [s1], 
        inventory: [...inventory.value, createDummy(s1)] 
      });
    });
  }

  const sortedValidCells = [...validCells.value].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  const foundSuggestions = [];
  const concurrency = 4;

  for (let i = 0; i < testCases.length; i += concurrency) {
    const batch = testCases.slice(i, i + concurrency);
    const results = await Promise.all(batch.map(tc => {
      return new Promise((resolve) => {
        const tempWorker = new SolverWorker();
        tempWorker.onmessage = (e) => {
          if (e.data.type === 'done') {
            tempWorker.terminate();
            resolve({ success: e.data.results && e.data.results.length > 0, testCase: tc });
          }
        };
        tempWorker.postMessage({
          inventory: JSON.parse(JSON.stringify(tc.inventory)),
          target: targetStonesCount.value,
          validCells: sortedValidCells,
          selectedCards: []
        });
      });
    }));

    results.forEach(res => {
      if (res.success) {
        // 【修改】：使用 ID 拼接作为去重 Key，将图形数组存入结果中
        const shapes = res.testCase.addedShapes;
        const sugKey = shapes.map(s => s.id).sort().join('+');
        
        if (!foundSuggestions.some(item => item.key === sugKey)) {
          foundSuggestions.push({ key: sugKey, shapes: shapes });
        }
      }
    });
  }

  suggestResults.value = foundSuggestions;
  isSuggesting.value = false;
  hasSuggested.value = true;
};

const currentBoardView = computed(() => {
  if (allSolutions.value.length === 0) {
    const emptyBoard = Array.from({ length: 7 }, () => Array(6).fill(-1));
    validCells.value.forEach(([r, c]) => emptyBoard[r][c] = 0);
    return emptyBoard;
  }
  return allSolutions.value[currentSolutionIndex.value].grid;
});

const currentExpectedDamage = computed(() => allSolutions.value.length === 0 ? 0 : allSolutions.value[currentSolutionIndex.value].damage);

const currentSolutionStones = computed(() => {
  if (allSolutions.value.length === 0) return [];
  const stones = [...allSolutions.value[currentSolutionIndex.value].stones];
  return stones.sort((a, b) => {
    if (a.shapeId === 'shape_C' && b.shapeId !== 'shape_C') return -1;
    if (b.shapeId === 'shape_C' && a.shapeId !== 'shape_C') return 1;
    return 0; 
  });
});

const activeSpiritSkills = computed(() => {
  if (currentSolutionStones.value.length === 0) return [];
  const skills = new Set();
  currentSolutionStones.value.forEach(stone => { if (stone.spiritSkill && stone.spiritSkill !== '无') skills.add(stone.spiritSkill); });
  return Array.from(skills).map(name => ({ name, element: SPIRIT_SKILL_DICT[name].element, color: SPIRIT_SKILL_DICT[name].color }));
});

const activeAttributes = computed(() => {
  if (currentSolutionStones.value.length === 0) return [];
  const counts = {};
  currentSolutionStones.value.forEach(stone => { if (stone.attribute && stone.attribute !== '无') counts[stone.attribute] = (counts[stone.attribute] || 0) + 1; });
  return Object.keys(counts).map(name => ({ name, level: Math.min(counts[name], 9), value: Math.min(counts[name], 9) * 540 })).sort((a, b) => b.level - a.level);
});

const activeSpirits = computed(() => {
  if (currentSolutionStones.value.length === 0) return [];
  const counts = {};
  currentSolutionStones.value.forEach(stone => { if (stone.spirit && stone.spirit !== '无') counts[stone.spirit] = (counts[stone.spirit] || 0) + 1; });
  return Object.keys(counts).map(name => ({ name, element: SPIRIT_DICT[name].element, color: SPIRIT_DICT[name].color, total: counts[name], level: Math.min(counts[name], 5) })).sort((a, b) => b.level - a.level); 
});

const matrixToCoords = matrix => {
  let coords = [];
  for (let r = 0; r < matrix.length; r++) for (let c = 0; c < matrix[r].length; c++) if (matrix[r][c] === 1) coords.push([r, c]);
  return coords;
};

const rotateCoords = coords => coords.map(([r, c]) => [c, -r]);
const normalizeCoords = coords => {
  coords.sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  const anchorR = coords[0][0], anchorC = coords[0][1];
  return coords.map(([r, c]) => [r - anchorR, c - anchorC]);
};
const getUniqueRotations = matrix => {
  let currentCoords = matrixToCoords(matrix), unique = [], seen = new Set();
  for (let i = 0; i < 4; i++) {
    let norm = normalizeCoords(currentCoords), str = JSON.stringify(norm);
    if (!seen.has(str)) { seen.add(str); unique.push(norm); }
    currentCoords = rotateCoords(currentCoords);
  }
  return unique;
};

const resetSearchState = () => {
  hasSearched.value = false;
  allSolutions.value = [];
  currentSolutionIndex.value = 0;
  if (calculationWorker) { calculationWorker.terminate(); calculationWorker = null; }
  isSolving.value = false;
};

const triggerAutoSolve = () => { if (totalStones.value >= targetStonesCount.value) startSolving(); else resetSearchState(); };

const addStone = () => {
  if (activeTab.value === 'jiqiao') {
    const shapeInfo = PRESET_SHAPES.find(s => s.id === newJiqiao.value.shapeId);
    inventory.value.push({ uid: `${shapeInfo.id}-${globalStoneId++}`, shapeId: shapeInfo.id, name: shapeInfo.name, matrix: shapeInfo.matrix, rotations: getUniqueRotations(shapeInfo.matrix), resonance: newJiqiao.value.resonance, quality: newJiqiao.value.quality, attribute: newJiqiao.value.attribute, spirit: newJiqiao.value.spirit, spiritSkill: '无' });
  } else if (activeTab.value === 'jiangxin') {
    const shapeInfo = PRESET_SHAPES.find(s => s.id === 'shape_C');
    inventory.value.push({ uid: `${shapeInfo.id}-${globalStoneId++}`, shapeId: shapeInfo.id, name: shapeInfo.name, matrix: shapeInfo.matrix, rotations: getUniqueRotations(shapeInfo.matrix), resonance: newJiangxin.value.resonance, quality: newJiangxin.value.quality, attribute: '无', spirit: '无', spiritSkill: newJiangxin.value.spiritSkill });
  }
  triggerAutoSolve(); 
};

const removeStone = uid => { inventory.value = inventory.value.filter(item => item.uid !== uid); triggerAutoSolve(); };

const clearInventory = () => { if (confirm("这会清空全部机巧石，确定吗？")) { inventory.value = []; globalStoneId = 1; triggerAutoSolve(); } };

const prevSolution = () => { if (currentSolutionIndex.value > 0) currentSolutionIndex.value--; };
const nextSolution = () => { if (currentSolutionIndex.value < allSolutions.value.length - 1) currentSolutionIndex.value++; };

const getCellColorClass = cellVal => { if (cellVal === -1) return 'invalid'; if (cellVal === 0) return 'empty'; return cellVal.split('-')[0]; };

const getCellStyle = (cellVal, r, c) => {
  if (cellVal === -1) return { visibility: 'hidden', border: 'none', background: 'transparent' };
  if (cellVal === 0) return { border: '1px dashed #4c566a', backgroundColor: 'rgba(59, 66, 82, 0.4)' };
  
  const brightness = [0.8, 0.95, 1.1, 1.25][parseInt(cellVal.split('-')[1], 10) % 4];
  const board = currentBoardView.value;
  const topSame = r > 0 && board[r-1][c] === cellVal;
  const bottomSame = r < 6 && board[r+1][c] === cellVal; 
  const leftSame = c > 0 && board[r][c-1] === cellVal;
  const rightSame = c < 5 && board[r][c+1] === cellVal; 
  const ob = 'rgba(255, 255, 255, 0.4)';
  
  return {
    filter: `brightness(${brightness})`,
    borderTop: `1px solid ${topSame ? 'transparent' : ob}`, borderBottom: `1px solid ${bottomSame ? 'transparent' : ob}`,
    borderLeft: `1px solid ${leftSame ? 'transparent' : ob}`, borderRight: `1px solid ${rightSame ? 'transparent' : ob}`,
  };
};

const getStoneTooltip = (cellVal) => {
  if (cellVal === -1 || cellVal === 0) return '';
  const stone = currentSolutionStones.value.find(s => s.uid === cellVal);
  if (!stone) return '';

  if (stone.shapeId === 'shape_C') {
    return `[匠心石] ${stone.resonance} · ${stone.quality}\n主动技能：${stone.spiritSkill}`;
  } else {
    const spiritText = stone.spirit === '无' ? '无' : stone.spirit;
    return `[机巧石] ${stone.resonance} · ${stone.quality} · ${stone.attribute}\n被动灵蕴：${spiritText}`;
  }
};

const startSolving = () => {
  const target = targetStonesCount.value;
  if (totalStones.value < target || isSolving.value) return; 

  isSolving.value = true;
  hasSearched.value = false;
  allSolutions.value = [];
  searchProgress.value = "启动超线程，构筑数据中...";

  if (calculationWorker) { calculationWorker.terminate(); }
  const sortedValidCells = [...validCells.value].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);

  calculationWorker = new SolverWorker();

  calculationWorker.onmessage = (e) => {
    if (e.data.type === 'progress') {
       const pct = Math.floor((e.data.current / e.data.total) * 100);
       searchProgress.value = `多线程搜索最优解... ${pct}%`;
    } else if (e.data.type === 'done') {
       const rawResults = e.data.results;
       const finalSolutions = rawResults.map(res => {
         const grid2D = Array.from({ length: 7 }, () => Array(6).fill(-1));
         sortedValidCells.forEach(([r, c], idx) => { grid2D[r][c] = res.grid1D[idx]; });
         return { grid: grid2D, stones: res.stones, damage: res.damage };
       });

       allSolutions.value = finalSolutions;
       hasSearched.value = true;
       isSolving.value = false;
       calculationWorker.terminate();
       calculationWorker = null;
    }
  };

  // 【核心重点】：将选中的 selectedCards 传给 Worker
  calculationWorker.postMessage({
    inventory: JSON.parse(JSON.stringify(inventory.value)),
    target: targetStonesCount.value,
    validCells: sortedValidCells,
    selectedCards: JSON.parse(JSON.stringify(selectedCards.value))
  });
};

onMounted(() => { if (inventory.value.length >= targetStonesCount.value) startSolving(); });
onUnmounted(() => { if (calculationWorker) calculationWorker.terminate(); });
</script>

<style scoped src="./assets/app.css"></style>

<style>
html, body {
  margin: 0;
  padding: 0;
  background-color: #1a1c23; 
  color: #e5e9f0;
  scroll-behavior: smooth;
  overflow-x: hidden;
}
</style>