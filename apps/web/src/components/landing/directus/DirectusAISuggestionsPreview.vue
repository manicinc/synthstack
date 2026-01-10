<script setup lang="ts">
/**
 * DirectusAISuggestionsPreview
 * Mock preview of the AI Suggestions Directus extension
 */

interface Suggestion {
  id: string
  type: 'blog_post' | 'seo' | 'marketing' | 'pr'
  title: string
  description: string
  agent: string
  agentIcon: string
  status: 'pending' | 'approved' | 'dismissed'
  priority: 'high' | 'medium' | 'low'
}

const suggestions: Suggestion[] = [
  {
    id: '1',
    type: 'blog_post',
    title: 'How to Build AI Workflows with LangGraph',
    description: 'Draft blog post covering workflow automation best practices with code examples.',
    agent: 'Content Writer',
    agentIcon: 'edit',
    status: 'pending',
    priority: 'high'
  },
  {
    id: '2',
    type: 'seo',
    title: 'Optimize "Vue SaaS Boilerplate" page',
    description: 'Add schema markup and improve meta description for better CTR.',
    agent: 'SEO Analyst',
    agentIcon: 'search',
    status: 'pending',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'marketing',
    title: 'Launch Product Hunt campaign',
    description: 'Optimal launch window detected: Tuesday 12:01 AM PST. Assets ready.',
    agent: 'Marketing Lead',
    agentIcon: 'campaign',
    status: 'approved',
    priority: 'high'
  },
  {
    id: '4',
    type: 'pr',
    title: 'Refactor auth middleware',
    description: 'Detected duplicate code in 3 files. PR ready for review.',
    agent: 'Code Reviewer',
    agentIcon: 'code',
    status: 'pending',
    priority: 'low'
  }
]

const stats = {
  total: 24,
  pending: 8,
  approved: 12,
  today: 4
}

function getTypeIcon(type: string) {
  const icons: Record<string, string> = {
    blog_post: 'article',
    seo: 'trending_up',
    marketing: 'campaign',
    pr: 'code'
  }
  return icons[type] || 'lightbulb'
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    blog_post: '#10B981',
    seo: '#8B5CF6',
    marketing: '#EC4899',
    pr: '#3B82F6'
  }
  return colors[type] || '#6366F1'
}
</script>

<template>
  <div class="ai-suggestions-preview">
    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Total</span>
      </div>
      <div class="stat pending">
        <span class="stat-value">{{ stats.pending }}</span>
        <span class="stat-label">Pending</span>
      </div>
      <div class="stat approved">
        <span class="stat-value">{{ stats.approved }}</span>
        <span class="stat-label">Approved</span>
      </div>
      <div class="stat today">
        <span class="stat-value">{{ stats.today }}</span>
        <span class="stat-label">Today</span>
      </div>
    </div>

    <!-- Suggestions List -->
    <div class="suggestions-list">
      <div 
        v-for="suggestion in suggestions" 
        :key="suggestion.id" 
        class="suggestion-card"
        :class="{ 'is-approved': suggestion.status === 'approved' }"
      >
        <div class="card-left">
          <div 
            class="type-icon" 
            :style="{ background: getTypeColor(suggestion.type) }"
          >
            <q-icon
              :name="getTypeIcon(suggestion.type)"
              size="18px"
              color="white"
            />
          </div>
        </div>
        <div class="card-content">
          <div class="card-header">
            <span class="suggestion-title">{{ suggestion.title }}</span>
            <span 
              v-if="suggestion.priority === 'high'" 
              class="priority-badge"
            >
              High Priority
            </span>
          </div>
          <p class="suggestion-description">
            {{ suggestion.description }}
          </p>
          <div class="card-meta">
            <span class="agent-info">
              <q-icon
                :name="suggestion.agentIcon"
                size="12px"
              />
              {{ suggestion.agent }}
            </span>
            <span class="type-badge">{{ suggestion.type.replace('_', ' ') }}</span>
          </div>
        </div>
        <div class="card-actions">
          <button 
            class="action-btn approve" 
            :class="{ 'is-active': suggestion.status === 'approved' }"
          >
            <q-icon
              name="check"
              size="16px"
            />
          </button>
          <button class="action-btn dismiss">
            <q-icon
              name="close"
              size="16px"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-suggestions-preview {
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

  &.pending .stat-value { color: #f59e0b; }
  &.approved .stat-value { color: #10b981; }
  &.today .stat-value { color: #ec4899; }
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

.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-card {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  &.is-approved {
    border-color: rgba(16, 185, 129, 0.3);
    background: rgba(16, 185, 129, 0.05);
  }

  @media (max-width: 600px) {
    flex-wrap: wrap;
  }
}

.card-left {
  flex-shrink: 0;
}

.type-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.suggestion-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #fff;
}

.priority-badge {
  padding: 2px 8px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
}

.suggestion-description {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 10px;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);

  .q-icon {
    color: #a5b4fc;
  }
}

.type-badge {
  font-size: 0.7rem;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: capitalize;
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;

  @media (max-width: 600px) {
    flex-direction: row;
    width: 100%;
    justify-content: flex-end;
  }
}

.action-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  &.approve:hover,
  &.approve.is-active {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(16, 185, 129, 0.5);
    color: #34d399;
  }

  &.dismiss:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.5);
    color: #f87171;
  }
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

  .suggestion-card {
    background: #fff;
    border-color: rgba(0, 0, 0, 0.08);

    &:hover {
      background: #fff;
      border-color: rgba(0, 0, 0, 0.15);
    }

    &.is-approved {
      background: rgba(16, 185, 129, 0.03);
    }
  }

  .suggestion-title {
    color: #1e293b;
  }

  .suggestion-description {
    color: #475569;
  }

  .agent-info {
    color: #64748b;

    .q-icon {
      color: #6366f1;
    }
  }

  .type-badge {
    background: rgba(0, 0, 0, 0.05);
    color: #475569;
  }

  .action-btn {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.1);
    color: #64748b;

    &:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #1e293b;
    }
  }
}
</style>


