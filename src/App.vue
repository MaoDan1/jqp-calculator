<template>
  <div class="jiqiaopan-container">
    <div class="header">
      <h2>机巧盘排盘求解器</h2>
    </div>

    <!-- ==================== 终极五列展开布局 ==================== -->
    <div class="main-content">
      
      <!-- 第 1 列：本套方案所用机巧石 (图1) -->
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

      <!-- 第 2 列：伤害与属性面板 (图2) -->
      <div class="col-stats">
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

      <!-- 第 4 列：录入机巧石表单 (图4) -->
      <div class="col-input">
        <div class="section-tabs">
          <button :class="{ active: activeTab === 'jiqiao' }" @click="activeTab = 'jiqiao'">✦ 机巧石</button>
          <button :class="{ active: activeTab === 'jiangxin' }" @click="activeTab = 'jiangxin'">❖ 匠心石</button>
        </div>

        <div class="panel-box stone-creator">
          <h4 class="panel-title">录入{{ activeTab === 'jiqiao' ? '机巧石' : '匠心石' }}</h4>
          
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
      </div>

      <!-- 第 5 列：机巧石库存列表 (图3) -->
      <div class="col-inventory">
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

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

// 【引入模块】：确保你的路径正确
import { PRESET_SHAPES, SPIRIT_DICT, SPIRIT_SKILL_DICT, OPTIONS, getSpiritColor, getSpiritSkillColor } from './constants/config.js';
import SolverWorker from './workers/solver.worker.js?worker'; 

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

const currentBoardView = computed(() => {
  if (allSolutions.value.length === 0) {
    const emptyBoard = Array.from({ length: 7 }, () => Array(6).fill(-1));
    validCells.value.forEach(([r, c]) => emptyBoard[r][c] = 0);
    return emptyBoard;
  }
  return allSolutions.value[currentSolutionIndex.value].grid;
});

const currentExpectedDamage = computed(() => allSolutions.value.length === 0 ? 0 : allSolutions.value[currentSolutionIndex.value].damage);
// 替换为带有置顶排序逻辑的新代码：
const currentSolutionStones = computed(() => {
  if (allSolutions.value.length === 0) return [];
  
  // 浅拷贝一份数组进行排序，避免修改原始数据
  const stones = [...allSolutions.value[currentSolutionIndex.value].stones];
  
  return stones.sort((a, b) => {
    // 如果 a 是匠心石，把它排在前面
    if (a.shapeId === 'shape_C' && b.shapeId !== 'shape_C') return -1;
    // 如果 b 是匠心石，把它排在前面
    if (b.shapeId === 'shape_C' && a.shapeId !== 'shape_C') return 1;
    // 其他机巧石保持原有顺序
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
  } else {
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

// 【新增】：根据格子内的 UID 获取悬停提示文本
const getStoneTooltip = (cellVal) => {
  // 如果是空位(-1)或者未填入石头的格子(0)，不显示任何提示
  if (cellVal === -1 || cellVal === 0) return '';
  
  // 从当前已拼好的石头列表中，找到对应 uid 的那块石头
  const stone = currentSolutionStones.value.find(s => s.uid === cellVal);
  if (!stone) return '';

  // 区分匠心石和普通机巧石的提示文案
  if (stone.shapeId === 'shape_C') {
    return `[匠心石] ${stone.resonance} · ${stone.quality}\n主动技能：${stone.spiritSkill}`;
  } else {
    // 灵活展示，如果没有被动灵蕴则显示为"无"
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

  calculationWorker.postMessage({
    inventory: JSON.parse(JSON.stringify(inventory.value)),
    target: targetStonesCount.value,
    validCells: sortedValidCells
  });
};

onMounted(() => { if (inventory.value.length >= targetStonesCount.value) startSolving(); });
onUnmounted(() => { if (calculationWorker) calculationWorker.terminate(); });
</script>

<style scoped>
/* ==================== 5列宽屏布局与全套美化 CSS ==================== */

.jiqiaopan-container { 
  font-family: 'Helvetica Neue', Arial, sans-serif; 
  /* 放开容器宽度，支撑5列并排 */
  max-width: 1750px; 
  margin: 0 auto; 
  padding: 20px; 
  color: #e5e9f0; 
}

.header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid #3b4252; padding-bottom: 10px; }
.header h2 { margin: 0 0 10px 0; color: #d8dee9; }

/* 核心 Flex 展开布局 */
.main-content { 
  display: flex; 
  gap: 20px; 
  align-items: flex-start; 
  justify-content: center; 
  flex-wrap: wrap; /* 屏幕不够宽时允许优雅换行 */
}

/* 定义每一列的最佳定宽 */
.col-used-stones { width: 280px; flex-shrink: 0; }
.col-stats { width: 320px; flex-shrink: 0; }
.col-board { width: 340px; flex-shrink: 0; }
.col-input { width: 300px; flex-shrink: 0; }
.col-inventory { width: 320px; flex-shrink: 0; }

/* 统一面板风格 */
.panel-box {
  background-color: #2e3440;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  margin-bottom: 15px;
}
.panel-title { margin: 0 0 15px 0; font-size: 15px; color: #eceff4; border-bottom: 1px solid #4c566a; padding-bottom: 8px; }
.sub-title { margin: 15px 0 10px 0; font-size: 14px; color: #eceff4; border-bottom: 1px dashed #4c566a; padding-bottom: 5px; }
.sub-title:first-child { margin-top: 0; }

/* 第 1 列：方案石头 */
.used-stones-list { display: flex; flex-direction: column; gap: 8px; }
.used-stone-item { display: flex; align-items: center; gap: 10px; background: #3b4252; padding: 10px; border-radius: 6px; border-left: 3px solid #4c566a;}
/* 【修复】：给左侧方案列表的形状框设定死宽度 56px，防止一字型挤压右侧 */
.used-shape-badge { 
  background: #2e3440; 
  border-radius: 4px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  width: 56px;         /* 强制固定宽度 */
  height: 44px;        /* 强制固定高度 */
  flex-shrink: 0;      /* 绝对不允许被挤压 */
}

/* 第 2 列：伤害与属性 */
.empty-details { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 500px; border: 2px dashed #4c566a; border-radius: 8px; background-color: rgba(46, 52, 64, 0.3); text-align: center; }
.empty-icon { font-size: 40px; margin-bottom: 10px; opacity: 0.5; }
.empty-details p { color: #d8dee9; font-weight: bold; margin: 0 0 5px 0; }
.empty-sub { font-size: 12px; color: #4c566a; line-height: 1.5; }
.damage-highlight { background: linear-gradient(135deg, rgba(208, 135, 112, 0.15), rgba(191, 97, 106, 0.15)); border: 1px solid rgba(208, 135, 112, 0.5); border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 15px; }
.dmg-label { display: block; color: #ebcb8b; font-size: 12px; font-weight: bold; margin-bottom: 8px; }
.dmg-value { font-size: 28px; font-weight: bold; color: #eceff4; text-shadow: 0 2px 4px rgba(0,0,0,0.5);}
.stats-panel { display: flex; flex-direction: column; gap: 10px; }
.spirit-list { display: flex; flex-direction: column; gap: 8px; }
.spirit-item { display: flex; justify-content: space-between; align-items: center; background: #3b4252; padding: 8px 12px; border-radius: 4px; border-left: 4px solid transparent; }
.spirit-name { font-weight: bold; font-size: 13px; }
.level-info { display: flex; align-items: baseline; gap: 4px; }
.spirit-level { font-size: 15px; font-weight: bold; color: #eceff4; }
.max-level { font-size: 12px; color: #4c566a; }
.overflow-warn { font-size: 12px; color: #bf616a; margin-left: 5px;}
.stat-value { font-size: 12px; color: #8fbcbb; margin-left: 8px; background: rgba(143, 188, 187, 0.15); padding: 2px 6px; border-radius: 4px;}
.empty-stats { font-size: 12px; color: #4c566a; font-style: italic; }

/* 第 3 列：中心棋盘 */
.level-control { margin-bottom: 15px; display: flex; align-items: center; justify-content: center; gap: 10px; background: #2e3440; padding: 10px 15px; border-radius: 8px; border: 1px solid #4c566a; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.level-control label { color: #ebcb8b; font-weight: bold; font-size: 15px;}
.level-control select { padding: 6px 12px; background: #3b4252; color: #eceff4; border: 1px solid #4c566a; border-radius: 4px; outline: none; font-size: 14px; cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23eceff4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 14px; padding-right: 30px; }
.level-control select:hover { border-color: #88c0d0; }
.board-container { display: flex; justify-content: center; margin-bottom: 20px;}
.board { display: flex; flex-direction: column; background-color: transparent; padding: 4px; }
.board-row { display: flex; }
.board-cell { width: 48px; height: 48px; box-sizing: border-box; }
.controls { width: 100%; text-align: center; }
.status-panel p { margin: 0 0 10px 0; font-size: 14px;}
.limit-note { font-size: 12px; color: #4c566a; margin-top: 5px; }
.solve-btn { width: 100%; padding: 14px; background-color: #88c0d0; color: #2e3440; font-size: 15px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.2);}
.solve-btn:hover:not(:disabled) { background-color: #8fbcbb; transform: translateY(-1px); }
.solve-btn:disabled { background-color: #4c566a; color: #ebcb8b; cursor: not-allowed; box-shadow: none;}
.solution-nav { margin-top: 15px; display: flex; justify-content: space-between; align-items: center; background-color: #2e3440; padding: 10px 15px; border-radius: 6px; }
.solution-nav button { background: #434c5e; color: #eceff4; border: 1px solid #4c566a; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.solution-nav button:hover:not(:disabled) { background: #4c566a; border-color: #88c0d0; color: #88c0d0; }
.solution-nav button:disabled { background: #3b4252; color: #4c566a; border-color: transparent; cursor: not-allowed; opacity: 0.7; }
.solution-count { font-size: 14px; color: #a3be8c; font-weight: bold;}
.no-solution { margin-top: 15px; background: #2e3440; padding: 15px; border-radius: 6px;}

/* 第 4 列：录入与页签 */
.section-tabs { display: flex; background: #2e3440; border-radius: 8px; overflow: hidden; margin-bottom: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.section-tabs button { flex: 1; background: transparent; border: none; color: #8fbcbb; padding: 14px; font-size: 15px; font-weight: bold; cursor: pointer; transition: all 0.2s; border-bottom: 3px solid transparent; }
.section-tabs button:hover { background: #3b4252; }
.section-tabs button.active { background: #3b4252; color: #ebcb8b; border-bottom: 3px solid #ebcb8b; }
/* 【修复】：把按钮之间的间距稍微收拢一点 */
.shape-selector { 
  display: flex; 
  gap: 5px; 
  justify-content: space-between; 
}

.shape-option { 
  flex: 1; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  background-color: #3b4252; 
  border: 2px solid #4c566a; 
  border-radius: 6px; 
  padding: 6px 0; /* 稍微调小上下内边距 */
  cursor: pointer; 
  transition: all 0.2s; 
}

.shape-option:hover { background-color: #434c5e; border-color: #8fbcbb; }
.shape-option.active { background-color: #4c566a; border-color: #eceff4; box-shadow: 0 0 8px rgba(236, 239, 244, 0.3); }
/* 【关键修复】：解除表单中图标的死宽度，并整体缩小 85%，让它们乖乖待在框里 */
.shape-selector .shape-preview {
  width: auto;
  flex-shrink: 1;
  transform: scale(0.85); 
}
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group.full-width { grid-column: span 2; }
.form-group label { font-size: 12px; color: #d8dee9; }
.form-group select { padding: 8px 12px; background-color: #3b4252; color: #eceff4; border: 1px solid #4c566a; border-radius: 4px; outline: none; cursor: pointer; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23eceff4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 14px; transition: all 0.2s; }
.form-group select:hover, .form-group select:focus { border-color: #88c0d0; }
.add-btn { width: 100%; padding: 12px; background-color: #a3be8c; color: #2e3440; font-size: 14px; font-weight: bold; border: none; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.2s;}
.add-btn:hover { background-color: #8fbcbb; transform: translateY(-1px);}

/* 第 5 列：背包列表 */
.inventory-list-container { flex: 1; height: 500px; display: flex; flex-direction: column; }
.inventory-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.clear-btn { background: transparent; color: #bf616a; border: 1px solid #bf616a; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
.clear-btn:hover { background: #bf616a; color: #eceff4; }
/* 【修复】：把原来的 padding-right: 5px 改大，给右侧的滚动条留出充足的空间 */
.inventory-list { 
  display: flex; 
  flex-direction: column; 
  gap: 10px; 
  overflow-y: auto; 
  padding-right: 15px; /* 这里加宽到了 15px */
  flex: 1;
}
.inventory-item { display: flex; align-items: center; background-color: #3b4252; padding: 10px; border-radius: 6px; position: relative; border-left: 3px solid #434c5e; transition: all 0.2s; }
.inventory-item:hover { background-color: #434c5e; border-left-color: #88c0d0; }

/* 通用组件渲染 */
/* 【修复】：给右侧背包列表及其他地方的形状预览也设定死宽度 */
.shape-preview { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center;
  width: 56px;         /* 容纳 4*12px = 48px 的一字型游刃有余 */
  flex-shrink: 0; 
}
.preview-row { display: flex; }
.preview-cell { width: 12px; height: 12px; }
.item-info { margin-left: 15px; flex: 1; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; }
.tag { font-size: 11px; padding: 2px 6px; border-radius: 3px; font-weight: bold;}
.tag.quality { background-color: #4c566a; color: #eceff4; }
.tag.quality.凡品 { color: #d8dee9; }
.tag.quality.良品 { color: #a3be8c; }
.tag.quality.珍品 { color: #b48ead; }
.tag.quality.灵品 { color: #ebcb8b; }
.tag.resonance { background-color: #434c5e; color: #eceff4; }
.tag.attribute { background-color: #434c5e; color: #eceff4; }
.delete-btn { position: absolute; right: 10px; top: 10px; width: 24px; height: 24px; background: #bf616a; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.2s;}
.delete-btn:hover { background-color: #d08770; transform: scale(1.1); }
.empty-inventory { text-align: center; color: #4c566a; padding: 20px 0; font-size: 13px;}

/* 颜色 */
.shape_I { background-color: #88c0d0; } .shape_O { background-color: #ebcb8b; } .shape_T { background-color: #b48ead; } .shape_L { background-color: #d08770; } .shape_J { background-color: #5e81ac; } .shape_C { background-color: #ebcb8b; border: 1px solid #d08770; } 
::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #2e3440; border-radius: 3px;} ::-webkit-scrollbar-thumb { background: #4c566a; border-radius: 3px; } ::-webkit-scrollbar-thumb:hover { background: #434c5e; }

/* ==================== 棋盘悬浮提示框 (Tooltip) 美化 ==================== */

/* 1. 确保格子本身可以作为定位锚点，并且悬停时层级最高，防止被旁边格子挡住 */
.board-cell { 
  width: 48px; 
  height: 48px; 
  box-sizing: border-box; 
  position: relative; 
}
.board-cell:hover {
  z-index: 50; 
}

/* 2. 提示框的主体 (背景、文字、边框、阴影) */
.board-cell[data-tooltip]:not([data-tooltip=""]):hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 10px); /* 悬浮在格子正上方 */
  left: 50%;
  transform: translateX(-50%);
  background-color: #2e3440;
  color: #eceff4;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #4c566a;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
  white-space: pre-wrap; /* 允许文本中的 \n 正常换行 */
  font-size: 13px;
  line-height: 1.6;
  z-index: 100;
  width: max-content;
  pointer-events: none; /* 防止鼠标移上去时提示框闪烁 */
}

/* 3. 提示框底部的小三角指针 */
.board-cell[data-tooltip]:not([data-tooltip=""]):hover::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background-color: #2e3440;
  border-bottom: 1px solid #4c566a;
  border-right: 1px solid #4c566a;
  z-index: 101;
  pointer-events: none;
}


</style>



<!-- ==================== 【终极修复】全局背景色 ==================== -->
<!-- 去掉 scoped 属性，这部分样式将直接强行覆盖浏览器默认的 html 和 body 白色底色 -->
<style>
html, body {
  margin: 0;
  padding: 0;
  background-color: #1a1c23; /* 赛博修仙深色背景 */
  color: #e5e9f0;
  /* 平滑滚动体验 */
  scroll-behavior: smooth;
  /* 防止不同浏览器滚动条挤压页面宽度 */
  overflow-x: hidden;
}
</style>