import { definePanel } from '@directus/extensions-sdk';
import PanelComponent from './panel.vue';

export default definePanel({
  id: 'crm-pipeline',
  name: 'CRM Pipeline',
  icon: 'trending_up',
  description: 'Visual sales pipeline with drag-and-drop Kanban board',
  component: PanelComponent,
  options: [
    {
      field: 'showMetrics',
      name: 'Show Metrics',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
        options: {
          label: 'Display pipeline metrics'
        }
      },
      schema: {
        default_value: true
      }
    },
    {
      field: 'groupBy',
      name: 'Group By',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        width: 'half',
        options: {
          choices: [
            { text: 'Stage', value: 'stage' },
            { text: 'Organization', value: 'organization' },
            { text: 'Owner', value: 'owner' }
          ]
        }
      },
      schema: {
        default_value: 'stage'
      }
    },
    {
      field: 'defaultView',
      name: 'Default View',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        width: 'half',
        options: {
          choices: [
            { text: 'Kanban Board', value: 'kanban' },
            { text: 'List View', value: 'list' }
          ]
        }
      },
      schema: {
        default_value: 'kanban'
      }
    }
  ],
  minWidth: 24,
  minHeight: 16
});
