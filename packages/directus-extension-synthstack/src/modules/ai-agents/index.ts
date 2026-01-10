/**
 * SynthStack AI Agents Panel
 * 
 * PREMIUM FEATURE - Requires Pro or Agency license
 * 
 * Provides AI Co-Founders management panel including:
 * - Agent configuration and status
 * - Conversation history
 * - Performance metrics
 * - Agent invocation testing
 */

import { definePanel } from '@directus/extensions-sdk';
import PanelComponent from './panel.vue';

export default definePanel({
  id: 'synthstack-ai-agents',
  name: 'AI Agents',
  icon: 'smart_toy',
  description: 'Manage and monitor AI Co-Founders',
  component: PanelComponent,
  options: [
    {
      field: 'showMetrics',
      name: 'Show Metrics',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
      },
      schema: {
        default_value: true,
      },
    },
    {
      field: 'agentFilter',
      name: 'Filter Agents',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        width: 'half',
        options: {
          choices: [
            { text: 'All Agents', value: 'all' },
            { text: 'Active Only', value: 'active' },
            { text: 'By Category', value: 'category' },
          ],
        },
      },
      schema: {
        default_value: 'all',
      },
    },
  ],
  minWidth: 12,
  minHeight: 8,
});


