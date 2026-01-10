import { definePanel } from '@directus/extensions-sdk';
import PanelComponent from './panel.vue';

export default definePanel({
  id: 'welcome-dashboard',
  name: 'Welcome Dashboard',
  icon: 'waving_hand',
  description: 'Dynamic welcome panel with time-based greetings and personalized messages',
  component: PanelComponent,
  options: [
    {
      field: 'showGreeting',
      name: 'Show Greeting',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
        options: {
          label: 'Display personalized greeting'
        }
      },
      schema: {
        default_value: true
      }
    },
    {
      field: 'showQuickLinks',
      name: 'Show Quick Links',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
        options: {
          label: 'Display quick action links'
        }
      },
      schema: {
        default_value: true
      }
    },
    {
      field: 'showRecentActivity',
      name: 'Show Recent Activity',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
        options: {
          label: 'Display recent activity timeline'
        }
      },
      schema: {
        default_value: true
      }
    },
    {
      field: 'customMessage',
      name: 'Custom Message',
      type: 'text',
      meta: {
        interface: 'input-multiline',
        width: 'full',
        options: {
          placeholder: 'Optional custom message to display'
        }
      }
    }
  ],
  minWidth: 24,
  minHeight: 12
});
