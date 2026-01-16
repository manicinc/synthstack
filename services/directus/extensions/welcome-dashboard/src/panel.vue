<template>
  <div class="welcome-dashboard">
    <!-- Greeting Section -->
    <div v-if="showGreeting" class="greeting-section">
      <div class="greeting-content">
        <div class="greeting-icon">
          <v-icon :name="greetingIcon" x-large />
        </div>
        <div class="greeting-text">
          <h1 class="greeting-title">{{ greetingMessage }}</h1>
          <p class="greeting-subtitle">{{ randomMessage }}</p>
          <p v-if="customMessage" class="custom-message">{{ customMessage }}</p>
        </div>
      </div>
      <div class="user-info">
        <div class="user-stat">
          <span class="stat-label">Last Login</span>
          <span class="stat-value">{{ lastLogin }}</span>
        </div>
        <div class="user-stat">
          <span class="stat-label">Active Since</span>
          <span class="stat-value">{{ memberSince }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Links -->
    <div v-if="showQuickLinks" class="quick-links">
      <h3 class="section-title">Quick Actions</h3>
      <div class="links-grid">
        <a
          v-for="link in quickLinks"
          :key="link.id"
          :href="link.url"
          class="quick-link-card"
        >
          <div class="link-icon" :style="{ background: link.color }">
            <v-icon :name="link.icon" />
          </div>
          <div class="link-content">
            <span class="link-title">{{ link.title }}</span>
            <span class="link-description">{{ link.description }}</span>
          </div>
        </a>
      </div>
    </div>

    <!-- Recent Activity -->
    <div v-if="showRecentActivity" class="recent-activity">
      <h3 class="section-title">Recent Activity</h3>
      <div v-if="activities.length > 0" class="activity-timeline">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="activity-item"
        >
          <div class="activity-icon" :style="{ background: activity.color }">
            <v-icon :name="activity.icon" small />
          </div>
          <div class="activity-content">
            <span class="activity-title">{{ activity.title }}</span>
            <span class="activity-description">{{ activity.description }}</span>
            <span class="activity-time">{{ activity.time }}</span>
          </div>
        </div>
      </div>
      <v-notice v-else type="info">
        No recent activity to display.
      </v-notice>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';

interface Props {
  showGreeting?: boolean;
  showQuickLinks?: boolean;
  showRecentActivity?: boolean;
  customMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showGreeting: true,
  showQuickLinks: true,
  showRecentActivity: true,
  customMessage: ''
});

const api = useApi();
const { useUserStore } = useStores();
const userStore = useUserStore();

// State
const currentUser = computed(() => userStore.currentUser);
const activities = ref<any[]>([]);

// Time-based greeting logic
const timeOfDay = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening';
});

const greetingIcon = computed(() => {
  const icons: Record<string, string> = {
    morning: 'wb_sunny',
    afternoon: 'light_mode',
    evening: 'nights_stay'
  };
  return icons[timeOfDay.value];
});

// Greeting messages by time of day
const greetingMessages: Record<string, string[]> = {
  morning: [
    "Good morning",
    "Rise and shine",
    "Top of the morning",
    "Morning",
    "Good to see you this morning",
    "Welcome back this morning",
    "Bright and early",
    "Fresh start this morning",
    "Morning sunshine",
    "Hello, morning person",
    "Early bird gets the worm",
    "Good morning, champion",
    "Starting strong this morning",
    "Morning, go-getter",
    "Greetings, early riser"
  ],
  afternoon: [
    "Good afternoon",
    "Afternoon",
    "Welcome back this afternoon",
    "Good to see you",
    "Hope you're having a great day",
    "Afternoon, productivity hero",
    "Keeping the momentum going",
    "Afternoon hustle time",
    "Midday greetings",
    "Afternoon, achiever",
    "Making progress this afternoon",
    "Crushing it this afternoon",
    "Afternoon excellence",
    "Welcome to peak productivity",
    "Good afternoon, superstar"
  ],
  evening: [
    "Good evening",
    "Evening",
    "Welcome back this evening",
    "Still going strong",
    "Burning the midnight oil",
    "Evening, night owl",
    "Late night productivity",
    "Evening, dedicated one",
    "Finishing strong",
    "Evening grind time",
    "Committed to excellence",
    "Evening warrior",
    "Working late, working great",
    "Night shift champion",
    "Evening excellence"
  ]
};

const greetingMessage = computed(() => {
  const messages = greetingMessages[timeOfDay.value];
  const message = messages[Math.floor(Math.random() * messages.length)];
  const firstName = currentUser.value?.first_name || 'there';
  return `${message}, ${firstName}!`;
});

// Random motivational messages
const motivationalMessages = [
  "Let's make today count.",
  "Ready to build something amazing?",
  "Your next big win starts here.",
  "Time to turn ideas into reality.",
  "Let's ship something great today.",
  "Innovation happens right here.",
  "Today is full of possibilities.",
  "Let's create something extraordinary.",
  "Your best work is ahead of you.",
  "Make it happen.",
  "Dream big, build bigger.",
  "Progress over perfection.",
  "Every project is a new opportunity.",
  "Let's build the future.",
  "Your creativity makes the difference.",
  "Turning vision into reality.",
  "Excellence is the standard.",
  "Let's elevate the game.",
  "Making magic happen.",
  "Build with purpose.",
  "Quality is non-negotiable.",
  "Innovation is calling.",
  "Time to level up.",
  "Creating value, one project at a time.",
  "Your impact matters."
];

const randomMessage = computed(() => {
  return motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
});

// User info
const lastLogin = computed(() => {
  if (!currentUser.value?.last_access) return 'N/A';
  return formatRelativeTime(new Date(currentUser.value.last_access));
});

const memberSince = computed(() => {
  if (!currentUser.value?.date_created) return 'N/A';
  return new Date(currentUser.value.date_created).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
});

// Quick links
const quickLinks = ref([
  {
    id: 'create-project',
    title: 'New Project',
    description: 'Start a new project',
    icon: 'add_circle',
    color: '#6366F1',
    url: '/admin/content/projects/+'
  },
  {
    id: 'create-invoice',
    title: 'Create Invoice',
    description: 'Bill a client',
    icon: 'receipt_long',
    color: '#10B981',
    url: '/admin/content/invoices/+'
  },
  {
    id: 'add-deal',
    title: 'New Deal',
    description: 'Add to pipeline',
    icon: 'trending_up',
    color: '#F59E0B',
    url: '/admin/content/deals/+'
  },
  {
    id: 'create-organization',
    title: 'New Organization',
    description: 'Add a client',
    icon: 'business',
    color: '#3B82F6',
    url: '/admin/content/organizations/+'
  },
  {
    id: 'view-analytics',
    title: 'Analytics',
    description: 'View insights',
    icon: 'bar_chart',
    color: '#8B5CF6',
    url: '/admin/insights/analytics'
  },
  {
    id: 'copilot',
    title: 'AI Copilot',
    description: 'Get AI assistance',
    icon: 'smart_toy',
    color: '#EC4899',
    url: '/admin/insights/ai-copilot'
  }
]);

// Methods
async function loadRecentActivity() {
  try {
    // Get recent activity from directus_activity
    const response = await api.get('/activity', {
      params: {
        filter: {
          user: { _eq: currentUser.value?.id }
        },
        sort: ['-timestamp'],
        limit: 5,
        fields: ['id', 'action', 'collection', 'timestamp', 'comment']
      }
    });

    activities.value = response.data.data.map((activity: any) => {
      const actionData = getActivityDisplay(activity.action, activity.collection);
      return {
        id: activity.id,
        title: actionData.title,
        description: activity.comment || actionData.description,
        time: formatRelativeTime(new Date(activity.timestamp)),
        icon: actionData.icon,
        color: actionData.color
      };
    });
  } catch (error) {
    console.error('Failed to load recent activity:', error);
    activities.value = [];
  }
}

function getActivityDisplay(action: string, collection: string) {
  const displays: Record<string, any> = {
    create: {
      title: `Created ${formatCollection(collection)}`,
      description: `New ${formatCollection(collection)} created`,
      icon: 'add_circle',
      color: '#10B981'
    },
    update: {
      title: `Updated ${formatCollection(collection)}`,
      description: `Modified ${formatCollection(collection)}`,
      icon: 'edit',
      color: '#3B82F6'
    },
    delete: {
      title: `Deleted ${formatCollection(collection)}`,
      description: `Removed ${formatCollection(collection)}`,
      icon: 'delete',
      color: '#EF4444'
    },
    login: {
      title: 'Logged in',
      description: 'Started a new session',
      icon: 'login',
      color: '#6366F1'
    }
  };

  return displays[action] || {
    title: formatCollection(collection),
    description: `${action} action`,
    icon: 'info',
    color: '#94A3B8'
  };
}

function formatCollection(collection: string): string {
  if (!collection) return 'item';
  return collection
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

// Load data on mount
onMounted(() => {
  if (props.showRecentActivity) {
    loadRecentActivity();
  }
});
</script>

<style scoped>
.welcome-dashboard {
  padding: var(--content-padding);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
  overflow-y: auto;
}

/* Greeting Section */
.greeting-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px;
  background: linear-gradient(135deg, var(--theme--primary) 0%, var(--theme--primary-accent) 100%);
  border-radius: var(--theme--border-radius-large);
  color: white;
  gap: 24px;
}

.greeting-content {
  display: flex;
  align-items: center;
  gap: 24px;
  flex: 1;
}

.greeting-icon {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.greeting-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.greeting-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.greeting-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.custom-message {
  font-size: 14px;
  opacity: 0.8;
  margin: 4px 0 0 0;
  font-style: italic;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--theme--border-radius);
  backdrop-filter: blur(10px);
  min-width: 200px;
}

.user-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
}

/* Quick Links */
.quick-links {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--theme--foreground);
  margin: 0;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.quick-link-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--theme--background);
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
}

.quick-link-card:hover {
  border-color: var(--theme--primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.link-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.link-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.link-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--theme--foreground);
}

.link-description {
  font-size: 13px;
  color: var(--theme--foreground-subdued);
}

/* Recent Activity */
.recent-activity {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: start;
  gap: 16px;
  padding: 16px;
  background: var(--theme--background);
  border: 1px solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  transition: border-color 0.2s;
}

.activity-item:hover {
  border-color: var(--theme--border-color);
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.activity-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.activity-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--theme--foreground);
}

.activity-description {
  font-size: 13px;
  color: var(--theme--foreground-subdued);
}

.activity-time {
  font-size: 12px;
  color: var(--theme--foreground-subdued);
}

/* Responsive */
@media (max-width: 768px) {
  .greeting-section {
    flex-direction: column;
    align-items: start;
  }

  .user-info {
    width: 100%;
  }

  .links-grid {
    grid-template-columns: 1fr;
  }
}
</style>
