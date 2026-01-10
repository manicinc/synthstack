<template>
  <div class="seo-dashboard">
    <header class="page-header">
      <div class="header-content">
        <h1>SEO Dashboard</h1>
        <p class="subtitle">
          Track your keyword rankings and SERP performance
        </p>
      </div>
      <div class="header-actions">
        <q-btn
          flat
          icon="refresh"
          label="Refresh"
          :loading="loading"
          @click="loadDashboard"
        />
      </div>
    </header>

    <!-- Quota Widget -->
    <div
      v-if="dashboard"
      class="quota-card"
    >
      <div class="quota-info">
        <span class="quota-label">API Usage</span>
        <span class="quota-value">{{ dashboard.quota.used }} / {{ dashboard.quota.limit }}</span>
      </div>
      <q-linear-progress
        :value="quotaUsagePercent / 100"
        :color="quotaUsagePercent > 80 ? 'negative' : quotaUsagePercent > 50 ? 'warning' : 'primary'"
        class="quota-bar"
      />
      <span class="quota-remaining">{{ dashboard.quota.remaining }} searches remaining this month</span>
    </div>

    <!-- Stats Grid -->
    <div
      v-if="dashboard"
      class="stats-grid"
    >
      <div class="stat-card">
        <div class="stat-icon">
          <q-icon
            name="tag"
            color="primary"
            size="24px"
          />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ dashboard.stats.totalKeywords }}</span>
          <span class="stat-label">Total Keywords</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <q-icon
            name="leaderboard"
            color="teal"
            size="24px"
          />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ dashboard.stats.trackedKeywords }}</span>
          <span class="stat-label">With Rankings</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <q-icon
            name="emoji_events"
            color="amber"
            size="24px"
          />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ dashboard.stats.topTenCount }}</span>
          <span class="stat-label">Page 1 Rankings</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <q-icon
            name="trending_up"
            color="green"
            size="24px"
          />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ dashboard.stats.avgPosition || '-' }}</span>
          <span class="stat-label">Avg Position</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="dashboard-content">
      <!-- Keywords Table -->
      <div class="section keywords-section">
        <div class="section-header">
          <h2>Tracked Keywords</h2>
          <q-btn
            flat
            dense
            icon="add"
            label="Add Keyword"
            color="primary"
            to="/app/seo/keywords"
          />
        </div>

        <q-table
          :rows="dashboard?.keywords || []"
          :columns="keywordColumns"
          row-key="id"
          :loading="loading"
          flat
          class="keywords-table"
          :pagination="{ rowsPerPage: 10 }"
        >
          <template #body-cell-position="props">
            <q-td :props="props">
              <q-badge
                :color="getPositionColor(props.row.current_position)"
                :label="props.row.current_position ? `#${props.row.current_position}` : 'N/A'"
              />
            </q-td>
          </template>

          <template #body-cell-best="props">
            <q-td :props="props">
              <span
                v-if="props.row.best_position"
                class="best-position"
              >
                #{{ props.row.best_position }}
              </span>
              <span
                v-else
                class="text-grey"
              >-</span>
            </q-td>
          </template>

          <template #body-cell-lastCheck="props">
            <q-td :props="props">
              <span
                v-if="props.row.last_serp_check_at"
                class="last-check"
              >
                {{ formatDate(props.row.last_serp_check_at) }}
              </span>
              <span
                v-else
                class="text-grey"
              >Never</span>
            </q-td>
          </template>

          <template #body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                flat
                dense
                icon="search"
                color="primary"
                :loading="checkingKeyword === props.row.id"
                :disable="!canCheck"
                @click="checkKeyword(props.row.id)"
              >
                <q-tooltip>Check ranking now</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                icon="history"
                color="grey"
                @click="showHistory(props.row.id, props.row.keyword)"
              >
                <q-tooltip>View history</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </div>

      <!-- Recent Changes -->
      <div
        v-if="dashboard?.recentChanges?.length"
        class="section changes-section"
      >
        <div class="section-header">
          <h2>Recent Position Changes</h2>
        </div>

        <div class="changes-list">
          <div
            v-for="change in dashboard.recentChanges"
            :key="change.keywordId"
            class="change-item"
          >
            <div class="change-keyword">
              {{ change.keyword }}
            </div>
            <div class="change-positions">
              <span class="old-position">#{{ change.previousPosition }}</span>
              <q-icon
                name="arrow_forward"
                size="16px"
              />
              <span class="new-position">#{{ change.currentPosition }}</span>
            </div>
            <q-badge
              :color="change.change > 0 ? 'green' : change.change < 0 ? 'red' : 'grey'"
              :label="change.change > 0 ? `+${change.change}` : change.change.toString()"
            />
          </div>
        </div>
      </div>

      <!-- Competitors -->
      <div class="section competitors-section">
        <div class="section-header">
          <h2>Competitors ({{ competitors.length }})</h2>
          <q-btn
            flat
            dense
            icon="add"
            label="Add"
            color="primary"
            @click="showAddCompetitor = true"
          />
        </div>

        <div
          v-if="competitors.length"
          class="competitors-list"
        >
          <div
            v-for="competitor in competitors"
            :key="competitor.id"
            class="competitor-item"
          >
            <div class="competitor-info">
              <span class="competitor-domain">{{ competitor.domain }}</span>
              <span
                v-if="competitor.name !== competitor.domain"
                class="competitor-name"
              >
                {{ competitor.name }}
              </span>
            </div>
            <q-btn
              flat
              dense
              icon="delete"
              color="negative"
              @click="deleteCompetitor(competitor.id)"
            />
          </div>
        </div>
        <div
          v-else
          class="empty-state"
        >
          <p>No competitors added yet.</p>
          <q-btn
            flat
            label="Add your first competitor"
            color="primary"
            @click="showAddCompetitor = true"
          />
        </div>
      </div>
    </div>

    <!-- History Dialog -->
    <q-dialog v-model="historyDialog">
      <q-card class="history-card">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            Ranking History: {{ historyKeyword }}
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <div
            v-if="historyLoading"
            class="text-center q-pa-md"
          >
            <q-spinner size="32px" />
          </div>
          <div
            v-else-if="currentHistory.length"
            class="history-list"
          >
            <div
              v-for="(entry, i) in currentHistory"
              :key="i"
              class="history-entry"
            >
              <span class="history-date">{{ formatDate(entry.checkedAt) }}</span>
              <q-badge
                :color="getPositionColor(entry.position)"
                :label="entry.position ? `#${entry.position}` : 'N/A'"
              />
              <div
                v-if="entry.features.length"
                class="history-features"
              >
                <q-chip
                  v-for="feature in entry.features.slice(0, 3)"
                  :key="feature"
                  size="sm"
                  dense
                >
                  {{ feature }}
                </q-chip>
              </div>
            </div>
          </div>
          <div
            v-else
            class="empty-state"
          >
            <p>No ranking history available.</p>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Add Competitor Dialog -->
    <q-dialog v-model="showAddCompetitor">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">
            Add Competitor
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            v-model="newCompetitor.domain"
            label="Domain"
            placeholder="example.com"
            dense
            outlined
          />
          <q-input
            v-model="newCompetitor.name"
            label="Name (optional)"
            placeholder="Competitor Name"
            dense
            outlined
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="primary"
            label="Add"
            :loading="loading"
            @click="addNewCompetitor"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSerpTracking, type RankingHistoryEntry } from '@/composables/useSerpTracking';

const {
  loading,
  error,
  dashboard,
  competitors,
  canCheck,
  quotaUsagePercent,
  fetchDashboard,
  fetchCompetitors,
  checkKeywordRanking,
  fetchRankingHistory,
  addCompetitor,
  removeCompetitor,
  getPositionColor,
} = useSerpTracking();

// State
const checkingKeyword = ref<string | null>(null);
const historyDialog = ref(false);
const historyKeyword = ref('');
const historyLoading = ref(false);
const currentHistory = ref<RankingHistoryEntry[]>([]);
const showAddCompetitor = ref(false);
const newCompetitor = ref({ domain: '', name: '' });

// Table columns
const keywordColumns = [
  { name: 'keyword', label: 'Keyword', field: 'keyword', align: 'left' as const, sortable: true },
  { name: 'position', label: 'Position', field: 'current_position', align: 'center' as const, sortable: true },
  { name: 'best', label: 'Best', field: 'best_position', align: 'center' as const, sortable: true },
  { name: 'frequency', label: 'Check Freq', field: 'check_frequency', align: 'center' as const },
  { name: 'lastCheck', label: 'Last Check', field: 'last_serp_check_at', align: 'center' as const },
  { name: 'actions', label: 'Actions', field: 'id', align: 'center' as const },
];

// Methods
async function loadDashboard() {
  await fetchDashboard();
  await fetchCompetitors();
}

async function checkKeyword(keywordId: string) {
  checkingKeyword.value = keywordId;
  try {
    await checkKeywordRanking(keywordId);
    await loadDashboard();
  } finally {
    checkingKeyword.value = null;
  }
}

async function showHistory(keywordId: string, keyword: string) {
  historyKeyword.value = keyword;
  historyDialog.value = true;
  historyLoading.value = true;
  currentHistory.value = [];

  try {
    currentHistory.value = await fetchRankingHistory(keywordId);
  } finally {
    historyLoading.value = false;
  }
}

async function addNewCompetitor() {
  if (!newCompetitor.value.domain) return;

  await addCompetitor(newCompetitor.value.domain, newCompetitor.value.name);
  newCompetitor.value = { domain: '', name: '' };
  showAddCompetitor.value = false;
}

async function deleteCompetitor(id: string) {
  await removeCompetitor(id);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Load on mount
onMounted(loadDashboard);
</script>

<style scoped lang="scss">
.seo-dashboard {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
  }

  .subtitle {
    margin: 4px 0 0;
    color: var(--text-secondary);
  }
}

.quota-card {
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 24px;

  .quota-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .quota-label {
    font-weight: 600;
  }

  .quota-value {
    font-weight: 700;
    color: var(--primary);
  }

  .quota-bar {
    height: 8px;
    border-radius: 4px;
  }

  .quota-remaining {
    display: block;
    margin-top: 8px;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--surface-2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-content {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .stat-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
}

.dashboard-content {
  display: grid;
  gap: 24px;
}

.section {
  background: var(--surface-1);
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }
}

.keywords-table {
  background: transparent;
}

.best-position {
  color: var(--teal);
  font-weight: 600;
}

.last-check {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;

  .change-keyword {
    flex: 1;
    font-weight: 500;
  }

  .change-positions {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;

    .old-position {
      color: var(--text-secondary);
    }

    .new-position {
      font-weight: 600;
    }
  }
}

.competitors-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.competitor-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;

  .competitor-info {
    display: flex;
    flex-direction: column;
  }

  .competitor-domain {
    font-weight: 600;
  }

  .competitor-name {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);

  p {
    margin: 0 0 12px;
  }
}

.history-card {
  min-width: 400px;
  max-width: 600px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: 8px;

  .history-date {
    min-width: 120px;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .history-features {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-left: auto;
  }
}
</style>
