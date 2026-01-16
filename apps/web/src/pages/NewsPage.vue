<template>
  <q-page class="news-page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-content">
        <h1>News & Updates</h1>
        <p>The latest from SynthStack—features, announcements, and more.</p>
      </div>
    </section>

    <!-- News List -->
    <section class="news-section">
      <div class="section-container">
        <div class="news-list">
          <article
            v-for="item in news"
            :key="item.id"
            class="news-item"
          >
            <div class="news-date">
              <span class="month">{{ item.month }}</span>
              <span class="day">{{ item.day }}</span>
              <span class="year">{{ item.year }}</span>
            </div>
            <div class="news-content">
              <q-badge
                :color="typeColor(item.type)"
                class="news-type"
              >
                {{ item.type }}
              </q-badge>
              <h2>{{ item.title }}</h2>
              <p>{{ item.description }}</p>
              <q-btn
                flat
                color="primary"
                label="Read More →"
                class="read-more"
              />
            </div>
          </article>
        </div>

        <!-- Pagination -->
        <div class="pagination">
          <q-btn
            flat
            icon="chevron_left"
            :disable="page === 1"
            @click="page--"
          />
          <span>Page {{ page }} of {{ totalPages }}</span>
          <q-btn
            flat
            icon="chevron_right"
            :disable="page === totalPages"
            @click="page++"
          />
        </div>
      </div>
    </section>

    <!-- Subscribe -->
    <section class="subscribe-section">
      <div class="section-container">
        <div class="subscribe-content">
          <h2>Stay in the loop</h2>
          <p>Get notified about new features and updates.</p>
          <div class="subscribe-form">
            <q-input
              v-model="email"
              outlined
              dense
              placeholder="Enter your email"
            />
            <q-btn
              color="primary"
              label="Subscribe"
            />
          </div>
        </div>
      </div>
    </section>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const page = ref(1)
const totalPages = 3

const news = ref([
  {
    id: 1,
    month: 'Jan',
    day: '13',
    year: '2026',
    type: 'Feature',
    title: 'Strategy Debates (Multi‑Agent Roundtable) is live',
    description: 'Run structured multi-agent debates and generate board-ready Decision Briefs with streaming progress and exports.'
  },
  {
    id: 2,
    month: 'Jan',
    day: '12',
    year: '2026',
    type: 'Update',
    title: 'New setup wizards: Branding + Environment',
    description: 'Generate a complete config.json and production-ready .env files from templates in minutes—no guessing required.'
  },
  {
    id: 3,
    month: 'Dec',
    day: '20',
    year: '2025',
    type: 'Feature',
    title: 'Post-checkout onboarding for Lifetime license buyers',
    description: 'Submit your GitHub username and get repo access via an automated invite flow with verification and next steps.'
  },
  {
    id: 4,
    month: 'Dec',
    day: '05',
    year: '2025',
    type: 'Feature',
    title: 'Workflows & automation improvements',
    description: 'Build repeatable automations and agent-driven workflows with better defaults, clearer limits, and safer execution.'
  },
  {
    id: 5,
    month: 'Nov',
    day: '18',
    year: '2025',
    type: 'Update',
    title: 'Billing + credits polish',
    description: 'Cleaner checkout flows, clearer credit usage, and improved customer portal navigation.'
  }
])

function typeColor(type: string) {
  const colors: Record<string, string> = {
    Feature: 'primary',
    Update: 'teal',
    Announcement: 'orange',
    Maintenance: 'grey'
  }
  return colors[type] || 'grey'
}
</script>

<style lang="scss" scoped>
.news-page {
  --section-padding: 80px 24px;
}

.page-hero {
  padding: 120px 24px 60px;
  text-align: center;
  
  h1 {
    font-size: 3rem;
    margin: 0 0 16px;
  }
  
  p {
    font-size: 1.25rem;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.section-container {
  max-width: 800px;
  margin: 0 auto;
}

.news-section {
  padding: var(--section-padding);
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.news-item {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 32px;
  padding: 32px;
  background: var(--color-bg-secondary);
  border-radius: 16px;
}

.news-date {
  text-align: center;
  
  .month {
    display: block;
    font-size: 0.875rem;
    text-transform: uppercase;
    color: var(--q-primary);
    font-weight: 600;
  }
  
  .day {
    display: block;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1.2;
  }
  
  .year {
    display: block;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
}

.news-content {
  .news-type {
    margin-bottom: 12px;
  }
  
  h2 {
    margin: 0 0 12px;
    font-size: 1.5rem;
  }
  
  p {
    color: var(--color-text-secondary);
    margin: 0 0 16px;
    line-height: 1.7;
  }
  
  .read-more {
    padding-left: 0;
  }
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 48px;
  color: var(--color-text-secondary);
}

.subscribe-section {
  padding: var(--section-padding);
  background: var(--color-bg-secondary);
}

.subscribe-content {
  text-align: center;
  max-width: 500px;
  margin: 0 auto;
  
  h2 {
    margin: 0 0 12px;
    font-size: 1.75rem;
  }
  
  p {
    color: var(--color-text-secondary);
    margin: 0 0 24px;
  }
}

.subscribe-form {
  display: flex;
  gap: 12px;
  
  .q-input {
    flex: 1;
  }
}

@media (max-width: 600px) {
  .news-item {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .news-date {
    display: flex;
    gap: 8px;
    text-align: left;
    
    .day {
      font-size: 1.25rem;
    }
  }
  
  .subscribe-form {
    flex-direction: column;
  }
}
</style>
