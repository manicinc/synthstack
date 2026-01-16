<script setup lang="ts">
/**
 * DirectusSEOPreview
 * Mock preview of the SEO Keywords Directus extension
 */

interface Keyword {
  id: string
  keyword: string
  volume: number
  difficulty: number
  status: 'targeting' | 'optimizing' | 'ranking' | 'researched'
  position?: number
  category: 'primary' | 'secondary' | 'long_tail'
}

const keywords: Keyword[] = [
  { id: '1', keyword: 'vue saas boilerplate', volume: 1200, difficulty: 35, status: 'ranking', position: 3, category: 'primary' },
  { id: '2', keyword: 'directus admin panel', volume: 890, difficulty: 42, status: 'optimizing', category: 'primary' },
  { id: '3', keyword: 'langgraph workflow automation', volume: 450, difficulty: 28, status: 'targeting', category: 'secondary' },
  { id: '4', keyword: 'stripe subscription starter kit', volume: 320, difficulty: 55, status: 'researched', category: 'long_tail' },
  { id: '5', keyword: 'ai agent platform template', volume: 680, difficulty: 38, status: 'targeting', category: 'secondary' },
]

const stats = {
  total: 47,
  targeting: 12,
  optimizing: 8,
  ranking: 15
}

function getDifficultyClass(difficulty: number) {
  if (difficulty <= 30) return 'easy'
  if (difficulty <= 50) return 'medium'
  return 'hard'
}

function getStatusClass(status: string) {
  return `status-${status}`
}
</script>

<template>
  <div class="seo-preview">
    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Total Keywords</span>
      </div>
      <div class="stat targeting">
        <span class="stat-value">{{ stats.targeting }}</span>
        <span class="stat-label">Targeting</span>
      </div>
      <div class="stat optimizing">
        <span class="stat-value">{{ stats.optimizing }}</span>
        <span class="stat-label">Optimizing</span>
      </div>
      <div class="stat ranking">
        <span class="stat-value">{{ stats.ranking }}</span>
        <span class="stat-label">Ranking</span>
      </div>
    </div>

    <!-- Keywords Table -->
    <div class="keywords-table">
      <div class="table-header">
        <span class="col-keyword">Keyword</span>
        <span class="col-volume">Volume</span>
        <span class="col-difficulty">Difficulty</span>
        <span class="col-status">Status</span>
        <span class="col-position">Position</span>
      </div>
      <div 
        v-for="kw in keywords" 
        :key="kw.id" 
        class="table-row"
      >
        <span class="col-keyword">
          <span class="keyword-text">"{{ kw.keyword }}"</span>
          <span class="keyword-category">{{ kw.category.replace('_', ' ') }}</span>
        </span>
        <span class="col-volume">
          <q-icon
            name="search"
            size="12px"
          />
          {{ kw.volume.toLocaleString() }}
        </span>
        <span class="col-difficulty">
          <div
            class="difficulty-bar"
            :class="getDifficultyClass(kw.difficulty)"
          >
            <div
              class="difficulty-fill"
              :style="{ width: kw.difficulty + '%' }"
            />
          </div>
          <span class="difficulty-value">{{ kw.difficulty }}</span>
        </span>
        <span class="col-status">
          <span
            class="status-badge"
            :class="getStatusClass(kw.status)"
          >
            {{ kw.status }}
          </span>
        </span>
        <span class="col-position">
          <template v-if="kw.position">
            <span class="position-badge">#{{ kw.position }}</span>
          </template>
          <template v-else>
            <span class="position-na">—</span>
          </template>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.seo-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-bar {
  display: flex;
  gap: 32px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;

  @media (max-width: 600px) {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &.targeting .stat-value { color: #3b82f6; }
  &.optimizing .stat-value { color: #f59e0b; }
  &.ranking .stat-value { color: #10b981; }
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
}

.keywords-table {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 100px 140px 100px 80px;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;

  @media (max-width: 768px) {
    display: none;
  }
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 100px 140px 100px 80px;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  transition: background 0.2s ease;
  cursor: pointer;

  &:hover {
    background: rgba(139, 92, 246, 0.08);
  }

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
}

.col-keyword {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.keyword-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
}

.keyword-category {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: capitalize;
}

.col-volume {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  font-family: 'JetBrains Mono', monospace;

  .q-icon {
    color: rgba(255, 255, 255, 0.4);
  }
}

.col-difficulty {
  display: flex;
  align-items: center;
  gap: 10px;
}

.difficulty-bar {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;

  .difficulty-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  &.easy .difficulty-fill { background: #10b981; }
  &.medium .difficulty-fill { background: #f59e0b; }
  &.hard .difficulty-fill { background: #ef4444; }
}

.difficulty-value {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  min-width: 24px;
  text-align: right;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: capitalize;

  &.status-targeting {
    background: rgba(59, 130, 246, 0.2);
    color: #60a5fa;
  }

  &.status-optimizing {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
  }

  &.status-ranking {
    background: rgba(16, 185, 129, 0.2);
    color: #34d399;
  }

  &.status-researched {
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
  }
}

.position-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 24px;
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.position-na {
  color: rgba(255, 255, 255, 0.3);
}

// Light mode
:global(.body--light) {
  .stats-bar {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .stat-value {
    color: #1e293b;
  }

  .stat-label {
    color: #64748b;
  }

  .keywords-table {
    background: rgba(0, 0, 0, 0.01);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .table-header {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);
    color: #64748b;
  }

  .table-row {
    border-color: rgba(0, 0, 0, 0.05);

    &:hover {
      background: rgba(139, 92, 246, 0.05);
    }
  }

  .keyword-text {
    color: #1e293b;
  }

  .keyword-category {
    color: #64748b;
  }

  .col-volume {
    color: #334155;
  }

  .difficulty-bar {
    background: rgba(0, 0, 0, 0.08);
  }

  .difficulty-value {
    color: #475569;
  }
}
</style>


