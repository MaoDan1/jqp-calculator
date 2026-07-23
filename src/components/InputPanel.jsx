import React, { useState } from 'react';
import { DANQING_CARDS } from '../constants/cards';

export default function InputPanel({ selectedCards, setSelectedCards /* ...其他状态 */ }) {
  // 当前激活的 Tab：'jiqiao' | 'jiangxin' | 'danqing'
  const [activeTab, setActiveTab] = useState('jiqiao');

  // 切换选中卡牌
  const toggleCard = (cardId) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  return (
    <div className="input-panel">
      {/* 1. 顶部 Tab 导航栏 */}
      <div className="tab-header" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
        <button 
          className={`tab-btn ${activeTab === 'jiqiao' ? 'active' : ''}`}
          onClick={() => setActiveTab('jiqiao')}
        >
          ✦ 机巧石
        </button>
        <button 
          className={`tab-btn ${activeTab === 'jiangxin' ? 'active' : ''}`}
          onClick={() => setActiveTab('jiangxin')}
        >
          ❖ 匠心石
        </button>
        <button 
          className={`tab-btn ${activeTab === 'danqing' ? 'active' : ''}`}
          onClick={() => setActiveTab('danqing')}
        >
          ❖ 丹青
        </button>
      </div>

      {/* 2. Tab 内容区域 */}
      <div className="tab-content" style={{ marginTop: '16px' }}>
        {/* 机巧石录入界面 */}
        {activeTab === 'jiqiao' && (
          <div className="jiqiao-form">
            {/* ... 原有的录入机巧石表单控件 ... */}
          </div>
        )}

        {/* 匠心石界面 */}
        {activeTab === 'jiangxin' && (
          <div className="jiangxin-form">
            {/* ... 匠心石相关配置 ... */}
          </div>
        )}

        {/* 丹青绘灵卡牌选择界面 (5x4 网格阵列) */}
        {activeTab === 'danqing' && (
          <div className="danqing-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {DANQING_CARDS.map((card) => {
              const isSelected = selectedCards.includes(card.id);
              return (
                <div
                  key={card.id}
                  onClick={() => toggleCard(card.id)}
                  style={{
                    border: isSelected ? `2px solid ${card.color}` : '1px solid #444',
                    borderRadius: '8px',
                    padding: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? `${card.color}22` : '#1a1a1a',
                    boxShadow: isSelected ? `0 0 10px ${card.color}aa` : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ color: card.color, fontWeight: 'bold', fontSize: '12px' }}>
                    {card.element} · {card.cost}
                  </div>
                  <div style={{ fontSize: '11px', color: '#ccc', marginTop: '4px' }}>
                    {card.name}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}