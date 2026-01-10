<template>
  <div class="seo-keywords-panel" :style="{ height: height + 'px' }">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-left">
        <h2 class="panel-title">SEO Keywords</h2>
        <div class="stats" v-if="stats">
          <span class="stat">
            <span class="stat-value">{{ stats.total }}</span> total
          </span>
          <span class="stat targeting">
            <span class="stat-value">{{ stats.byStatus?.targeting || 0 }}</span> targeting
          </span>
          <span class="stat optimizing">
            <span class="stat-value">{{ stats.byStatus?.optimizing || 0 }}</span> optimizing
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="showResearchButton" class="btn btn-primary" @click="showResearchModal = true">
          <span class="icon">search</span>
          Research
        </button>
        <button class="btn btn-secondary" @click="showAddModal = true">
          <span class="icon">add</span>
          Add
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <div class="filter-group">
        <select v-model="filters.status" @change="loadKeywords" class="filter-select">
          <option value="">All Status</option>
          <option value="researched">Researched</option>
          <option value="targeting">Targeting</option>
          <option value="optimizing">Optimizing</option>
          <option value="ranking">Ranking</option>
          <option value="archived">Archived</option>
        </select>
        <select v-model="filters.category" @change="loadKeywords" class="filter-select">
          <option value="">All Categories</option>
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
          <option value="long_tail">Long Tail</option>
          <option value="question">Question</option>
        </select>
        <select v-model="filters.priority" @change="loadKeywords" class="filter-select">
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div class="search-box">
        <span class="icon">search</span>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search keywords..."
          @input="debouncedSearch"
        />
      </div>
    </div>

    <!-- Keywords List -->
    <div class="keywords-container" v-if="!loading">
      <div v-if="keywords.length === 0" class="empty-state">
        <span class="icon">key_off</span>
        <p>No keywords found</p>
        <button class="btn btn-primary" @click="showResearchButton ? (showResearchModal = true) : (showAddModal = true)">
          {{ showResearchButton ? 'Research Keywords' : 'Add Keyword' }}
        </button>
      </div>

      <div v-else class="keywords-list">
        <div
          v-for="keyword in keywords"
          :key="keyword.id"
          class="keyword-card"
          :class="{ selected: selectedKeywords.includes(keyword.id) }"
          @click="toggleSelection(keyword.id)"
        >
          <div class="keyword-checkbox">
            <input
              type="checkbox"
              :checked="selectedKeywords.includes(keyword.id)"
              @click.stop
              @change="toggleSelection(keyword.id)"
            />
          </div>
          <div class="keyword-content">
            <div class="keyword-main">
              <span class="keyword-text">"{{ keyword.keyword }}"</span>
              <div class="keyword-badges">
                <span v-if="keyword.category" class="badge badge-category">{{ keyword.category }}</span>
                <span :class="['badge', 'badge-priority', 'priority-' + keyword.priority]">
                  {{ keyword.priority }}
                </span>
                <span v-if="keyword.currentPosition" class="badge badge-position">
                  #{{ keyword.currentPosition }}
                </span>
              </div>
            </div>
            <div class="keyword-meta">
              <span v-if="keyword.volumeEstimate" class="meta-item">
                <span class="icon">trending_up</span>
                {{ keyword.volumeEstimate }}
              </span>
              <span v-if="keyword.competition" class="meta-item">
                <span class="icon">speed</span>
                {{ keyword.competition }} competition
              </span>
              <span v-if="keyword.searchIntent" class="meta-item">
                <span class="icon">psychology</span>
                {{ keyword.searchIntent }}
              </span>
            </div>
            <div v-if="keyword.targetUrl" class="keyword-url">
              <span class="icon">link</span>
              {{ keyword.targetUrl }}
            </div>
          </div>
          <div class="keyword-status">
            <span :class="['status-badge', 'status-' + keyword.status]">
              {{ formatStatus(keyword.status) }}
            </span>
          </div>
          <div class="keyword-actions" @click.stop>
            <button class="action-btn" @click="editKeyword(keyword)" title="Edit">
              <span class="icon">edit</span>
            </button>
            <button class="action-btn" @click="runAudit(keyword)" title="Audit">
              <span class="icon">fact_check</span>
            </button>
            <button class="action-btn danger" @click="deleteKeyword(keyword)" title="Delete">
              <span class="icon">delete</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Bulk Actions -->
      <div v-if="selectedKeywords.length > 0" class="bulk-actions">
        <span class="selection-count">{{ selectedKeywords.length }} selected</span>
        <button class="btn btn-secondary" @click="bulkUpdateStatus('targeting')">
          <span class="icon">gps_fixed</span>
          Set Targeting
        </button>
        <button class="btn btn-secondary" @click="bulkUpdateStatus('optimizing')">
          <span class="icon">tune</span>
          Set Optimizing
        </button>
        <button class="btn btn-primary" @click="runBulkAudit">
          <span class="icon">fact_check</span>
          Run Audit
        </button>
        <button class="btn btn-danger" @click="bulkDelete">
          <span class="icon">delete</span>
          Delete
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Loading keywords...</p>
    </div>

    <!-- Research Modal -->
    <div v-if="showResearchModal" class="modal-overlay" @click.self="showResearchModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>Research Keywords</h3>
          <button class="close-btn" @click="showResearchModal = false">
            <span class="icon">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Topic *</label>
            <input
              type="text"
              v-model="researchForm.topic"
              placeholder="e.g., AI content generation"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Industry *</label>
            <input
              type="text"
              v-model="researchForm.industry"
              placeholder="e.g., SaaS, Marketing Technology"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Target Audience</label>
            <input
              type="text"
              v-model="researchForm.audience"
              placeholder="e.g., Marketing teams, Content creators"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Content Type</label>
            <select v-model="researchForm.contentType" class="form-input">
              <option value="blog">Blog Posts</option>
              <option value="landing">Landing Pages</option>
              <option value="docs">Documentation</option>
              <option value="product">Product Pages</option>
            </select>
          </div>
          <div class="form-group">
            <label>Competitor URLs (optional)</label>
            <textarea
              v-model="researchForm.competitors"
              placeholder="Enter competitor URLs, one per line"
              class="form-input"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showResearchModal = false">Cancel</button>
          <button
            class="btn btn-primary"
            @click="performResearch"
            :disabled="researchLoading || !researchForm.topic || !researchForm.industry"
          >
            <span v-if="researchLoading" class="spinner-small"></span>
            {{ researchLoading ? 'Researching...' : 'Research Keywords' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingKeyword ? 'Edit Keyword' : 'Add Keyword' }}</h3>
          <button class="close-btn" @click="closeAddModal">
            <span class="icon">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Keyword *</label>
            <input
              type="text"
              v-model="keywordForm.keyword"
              placeholder="Enter keyword"
              class="form-input"
              :disabled="!!editingKeyword"
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select v-model="keywordForm.category" class="form-input">
                <option value="">Select...</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="long_tail">Long Tail</option>
                <option value="question">Question</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select v-model="keywordForm.priority" class="form-input">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Search Intent</label>
              <select v-model="keywordForm.searchIntent" class="form-input">
                <option value="">Select...</option>
                <option value="informational">Informational</option>
                <option value="transactional">Transactional</option>
                <option value="navigational">Navigational</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div class="form-group">
              <label>Competition</label>
              <select v-model="keywordForm.competition" class="form-input">
                <option value="">Select...</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Volume Estimate</label>
            <input
              type="text"
              v-model="keywordForm.volumeEstimate"
              placeholder="e.g., 1K-10K"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Target URL</label>
            <input
              type="text"
              v-model="keywordForm.targetUrl"
              placeholder="URL to optimize for this keyword"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea
              v-model="keywordForm.notes"
              placeholder="Additional notes..."
              class="form-input"
              rows="2"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeAddModal">Cancel</button>
          <button
            class="btn btn-primary"
            @click="saveKeyword"
            :disabled="!keywordForm.keyword"
          >
            {{ editingKeyword ? 'Update' : 'Add' }} Keyword
          </button>
        </div>
      </div>
    </div>

    <!-- Error Toast -->
    <div v-if="error" class="error-toast">
      <span class="icon">error</span>
      {{ error }}
      <button @click="error = null" class="close-btn-small">
        <span class="icon">close</span>
      </button>
    </div>

    <!-- Success Toast -->
    <div v-if="success" class="success-toast">
      <span class="icon">check_circle</span>
      {{ success }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue';

interface Keyword {
  id: string;
  userId: string;
  keyword: string;
  category: string | null;
  searchIntent: string | null;
  volumeEstimate: string | null;
  competition: string | null;
  difficultyScore: number | null;
  status: string;
  priority: string;
  targetUrl: string | null;
  currentPosition: number | null;
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

export default defineComponent({
  props: {
    height: {
      type: Number,
      default: 600,
    },
    apiUrl: {
      type: String,
      default: 'http://localhost:3003',
    },
    defaultView: {
      type: String,
      default: 'all',
    },
    showResearchButton: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const keywords = ref<Keyword[]>([]);
    const stats = ref<Stats | null>(null);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const success = ref<string | null>(null);
    const selectedKeywords = ref<string[]>([]);

    // Filters
    const filters = ref({
      status: props.defaultView === 'all' ? '' : props.defaultView,
      category: '',
      priority: '',
    });
    const searchQuery = ref('');

    // Modals
    const showResearchModal = ref(false);
    const showAddModal = ref(false);
    const editingKeyword = ref<Keyword | null>(null);
    const researchLoading = ref(false);

    // Forms
    const researchForm = ref({
      topic: '',
      industry: '',
      audience: '',
      contentType: 'blog',
      competitors: '',
    });

    const keywordForm = ref({
      keyword: '',
      category: '',
      priority: 'medium',
      searchIntent: '',
      competition: '',
      volumeEstimate: '',
      targetUrl: '',
      notes: '',
    });

    // Debounce search
    let searchTimeout: ReturnType<typeof setTimeout>;
    const debouncedSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadKeywords();
      }, 300);
    };

    // API calls
    const apiCall = async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${props.apiUrl}/api/v1/seo${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      if (response.status === 204) return null;
      return response.json();
    };

    const loadKeywords = async () => {
      loading.value = true;
      error.value = null;

      try {
        const params = new URLSearchParams();
        if (filters.value.status) params.set('statuses', filters.value.status);
        if (filters.value.category) params.set('categories', filters.value.category);
        if (filters.value.priority) params.set('priorities', filters.value.priority);
        if (searchQuery.value) params.set('search', searchQuery.value);

        const result = await apiCall(`/keywords?${params}`);
        keywords.value = result.keywords || [];
      } catch (err: any) {
        error.value = err.message || 'Failed to load keywords';
      } finally {
        loading.value = false;
      }
    };

    const loadStats = async () => {
      try {
        stats.value = await apiCall('/stats');
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };

    const toggleSelection = (id: string) => {
      const index = selectedKeywords.value.indexOf(id);
      if (index >= 0) {
        selectedKeywords.value.splice(index, 1);
      } else {
        selectedKeywords.value.push(id);
      }
    };

    const formatStatus = (status: string) => {
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    };

    const editKeyword = (keyword: Keyword) => {
      editingKeyword.value = keyword;
      keywordForm.value = {
        keyword: keyword.keyword,
        category: keyword.category || '',
        priority: keyword.priority,
        searchIntent: keyword.searchIntent || '',
        competition: keyword.competition || '',
        volumeEstimate: keyword.volumeEstimate || '',
        targetUrl: keyword.targetUrl || '',
        notes: keyword.notes || '',
      };
      showAddModal.value = true;
    };

    const closeAddModal = () => {
      showAddModal.value = false;
      editingKeyword.value = null;
      keywordForm.value = {
        keyword: '',
        category: '',
        priority: 'medium',
        searchIntent: '',
        competition: '',
        volumeEstimate: '',
        targetUrl: '',
        notes: '',
      };
    };

    const saveKeyword = async () => {
      try {
        if (editingKeyword.value) {
          await apiCall(`/keywords/${editingKeyword.value.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              category: keywordForm.value.category || undefined,
              priority: keywordForm.value.priority,
              searchIntent: keywordForm.value.searchIntent || undefined,
              competition: keywordForm.value.competition || undefined,
              volumeEstimate: keywordForm.value.volumeEstimate || undefined,
              targetUrl: keywordForm.value.targetUrl || undefined,
              notes: keywordForm.value.notes || undefined,
            }),
          });
          showSuccess('Keyword updated');
        } else {
          await apiCall('/keywords', {
            method: 'POST',
            body: JSON.stringify({
              keyword: keywordForm.value.keyword,
              category: keywordForm.value.category || undefined,
              priority: keywordForm.value.priority,
              searchIntent: keywordForm.value.searchIntent || undefined,
              competition: keywordForm.value.competition || undefined,
              volumeEstimate: keywordForm.value.volumeEstimate || undefined,
              targetUrl: keywordForm.value.targetUrl || undefined,
              notes: keywordForm.value.notes || undefined,
            }),
          });
          showSuccess('Keyword added');
        }
        closeAddModal();
        loadKeywords();
        loadStats();
      } catch (err: any) {
        error.value = err.message || 'Failed to save keyword';
      }
    };

    const deleteKeyword = async (keyword: Keyword) => {
      if (!confirm(`Delete keyword "${keyword.keyword}"?`)) return;

      try {
        await apiCall(`/keywords/${keyword.id}`, { method: 'DELETE' });
        showSuccess('Keyword deleted');
        loadKeywords();
        loadStats();
      } catch (err: any) {
        error.value = err.message || 'Failed to delete keyword';
      }
    };

    const runAudit = async (keyword: Keyword) => {
      // TODO: Implement audit modal/flow
      showSuccess('Audit feature coming soon');
    };

    const bulkUpdateStatus = async (status: string) => {
      try {
        await apiCall('/keywords/bulk-status', {
          method: 'POST',
          body: JSON.stringify({
            keywordIds: selectedKeywords.value,
            status,
          }),
        });
        showSuccess(`Updated ${selectedKeywords.value.length} keywords`);
        selectedKeywords.value = [];
        loadKeywords();
        loadStats();
      } catch (err: any) {
        error.value = err.message || 'Failed to update keywords';
      }
    };

    const runBulkAudit = () => {
      // TODO: Implement bulk audit
      showSuccess('Bulk audit feature coming soon');
    };

    const bulkDelete = async () => {
      if (!confirm(`Delete ${selectedKeywords.value.length} keywords?`)) return;

      try {
        for (const id of selectedKeywords.value) {
          await apiCall(`/keywords/${id}`, { method: 'DELETE' });
        }
        showSuccess(`Deleted ${selectedKeywords.value.length} keywords`);
        selectedKeywords.value = [];
        loadKeywords();
        loadStats();
      } catch (err: any) {
        error.value = err.message || 'Failed to delete keywords';
      }
    };

    const performResearch = async () => {
      researchLoading.value = true;
      error.value = null;

      try {
        const result = await apiCall('/keywords/research', {
          method: 'POST',
          body: JSON.stringify({
            topic: researchForm.value.topic,
            industry: researchForm.value.industry,
            audience: researchForm.value.audience || undefined,
            contentType: researchForm.value.contentType,
            competitors: researchForm.value.competitors || undefined,
            saveResults: true,
          }),
        });

        showSuccess(`Found ${result.keywords?.length || 0} keywords`);
        showResearchModal.value = false;
        researchForm.value = {
          topic: '',
          industry: '',
          audience: '',
          contentType: 'blog',
          competitors: '',
        };
        loadKeywords();
        loadStats();
      } catch (err: any) {
        error.value = err.message || 'Failed to research keywords';
      } finally {
        researchLoading.value = false;
      }
    };

    const showSuccess = (message: string) => {
      success.value = message;
      setTimeout(() => {
        success.value = null;
      }, 3000);
    };

    // Watch for filter changes
    watch(
      () => props.defaultView,
      (newView) => {
        filters.value.status = newView === 'all' ? '' : newView;
        loadKeywords();
      }
    );

    onMounted(() => {
      loadKeywords();
      loadStats();
    });

    return {
      keywords,
      stats,
      loading,
      error,
      success,
      selectedKeywords,
      filters,
      searchQuery,
      showResearchModal,
      showAddModal,
      editingKeyword,
      researchLoading,
      researchForm,
      keywordForm,
      debouncedSearch,
      loadKeywords,
      toggleSelection,
      formatStatus,
      editKeyword,
      closeAddModal,
      saveKeyword,
      deleteKeyword,
      runAudit,
      bulkUpdateStatus,
      runBulkAudit,
      bulkDelete,
      performResearch,
    };
  },
});
</script>

<style scoped>
.seo-keywords-panel {
  display: flex;
  flex-direction: column;
  background: var(--theme--background);
  color: var(--theme--foreground);
  font-family: var(--theme--fonts--sans--font-family);
  overflow: hidden;
}

/* Header */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--theme--border-color);
  background: var(--theme--background-subdued);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.stat-value {
  font-weight: 600;
  color: var(--theme--foreground);
}

.stat.targeting .stat-value {
  color: #3b82f6;
}

.stat.optimizing .stat-value {
  color: #8b5cf6;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn .icon {
  font-family: 'Material Icons';
  font-size: 18px;
}

.btn-primary {
  background: var(--theme--primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--theme--background-accent);
  color: var(--theme--foreground);
}

.btn-secondary:hover {
  background: var(--theme--background-normal);
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* Filters */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--theme--background);
  border-bottom: 1px solid var(--theme--border-color);
  gap: 16px;
}

.filter-group {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 6px 12px;
  font-size: 13px;
  border: 1px solid var(--theme--border-color);
  border-radius: 4px;
  background: var(--theme--background);
  color: var(--theme--foreground);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--theme--background-subdued);
  border: 1px solid var(--theme--border-color);
  border-radius: 4px;
}

.search-box .icon {
  font-family: 'Material Icons';
  font-size: 18px;
  color: var(--theme--foreground-subdued);
}

.search-box input {
  border: none;
  background: transparent;
  color: var(--theme--foreground);
  font-size: 13px;
  min-width: 200px;
}

.search-box input::placeholder {
  color: var(--theme--foreground-subdued);
}

.search-box input:focus {
  outline: none;
}

/* Keywords List */
.keywords-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.keywords-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.keyword-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--theme--background-subdued);
  border: 1px solid var(--theme--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.keyword-card:hover {
  background: var(--theme--background-normal);
}

.keyword-card.selected {
  border-color: var(--theme--primary);
  background: var(--theme--primary-background);
}

.keyword-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.keyword-content {
  flex: 1;
  min-width: 0;
}

.keyword-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.keyword-text {
  font-weight: 500;
  font-size: 14px;
}

.keyword-badges {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  text-transform: capitalize;
}

.badge-category {
  background: var(--theme--background-accent);
  color: var(--theme--foreground);
}

.badge-priority {
  color: white;
}

.badge-priority.priority-high {
  background: #ef4444;
}

.badge-priority.priority-medium {
  background: #f59e0b;
}

.badge-priority.priority-low {
  background: #6b7280;
}

.badge-position {
  background: #10b981;
  color: white;
}

.keyword-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item .icon {
  font-family: 'Material Icons';
  font-size: 14px;
}

.keyword-url {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--theme--primary);
  margin-top: 4px;
}

.keyword-url .icon {
  font-family: 'Material Icons';
  font-size: 14px;
}

.keyword-status {
  padding: 0 16px;
}

.status-badge {
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 12px;
  text-transform: capitalize;
}

.status-researched {
  background: #e5e7eb;
  color: #374151;
}

.status-targeting {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-optimizing {
  background: #ede9fe;
  color: #6d28d9;
}

.status-ranking {
  background: #d1fae5;
  color: #047857;
}

.status-archived {
  background: #f3f4f6;
  color: #6b7280;
}

.keyword-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--theme--foreground-subdued);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--theme--background-accent);
  color: var(--theme--foreground);
}

.action-btn.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.action-btn .icon {
  font-family: 'Material Icons';
  font-size: 18px;
}

/* Bulk Actions */
.bulk-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--theme--background-subdued);
  border-top: 1px solid var(--theme--border-color);
  margin-top: auto;
}

.selection-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--theme--foreground-subdued);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--theme--foreground-subdued);
}

.empty-state .icon {
  font-family: 'Material Icons';
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0 0 16px;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--theme--foreground-subdued);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--theme--border-color);
  border-top-color: var(--theme--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--theme--background);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--theme--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--theme--foreground-subdued);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--theme--background-subdued);
}

.close-btn .icon {
  font-family: 'Material Icons';
  font-size: 20px;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid var(--theme--border-color);
  border-radius: 6px;
  background: var(--theme--background);
  color: var(--theme--foreground);
}

.form-input:focus {
  outline: none;
  border-color: var(--theme--primary);
}

textarea.form-input {
  resize: vertical;
  min-height: 60px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--theme--border-color);
  background: var(--theme--background-subdued);
}

/* Toasts */
.error-toast,
.success-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 1001;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-toast {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.success-toast {
  background: #d1fae5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.error-toast .icon,
.success-toast .icon {
  font-family: 'Material Icons';
  font-size: 18px;
}

.close-btn-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  margin-left: 8px;
  color: inherit;
}

.close-btn-small .icon {
  font-size: 16px;
}

/* Icon helper */
.icon {
  font-family: 'Material Icons';
  font-style: normal;
  font-weight: normal;
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
</style>
