import { definePanel } from '@directus/extensions-sdk';
import PanelComponent from './panel.vue';

export default definePanel({
  id: 'invoice-manager',
  name: 'Invoice Manager',
  icon: 'receipt_long',
  description: 'Manage invoices with Stripe integration',
  component: PanelComponent,
  options: [
    {
      field: 'showQuickActions',
      name: 'Show Quick Actions',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
        options: {
          label: 'Display quick action buttons'
        }
      },
      schema: {
        default_value: true
      }
    },
    {
      field: 'defaultFilter',
      name: 'Default Filter',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        width: 'half',
        options: {
          choices: [
            { text: 'All Invoices', value: 'all' },
            { text: 'Draft', value: 'draft' },
            { text: 'Sent', value: 'sent' },
            { text: 'Overdue', value: 'overdue' },
            { text: 'Paid', value: 'paid' }
          ]
        }
      },
      schema: {
        default_value: 'all'
      }
    },
    {
      field: 'itemsPerPage',
      name: 'Items Per Page',
      type: 'integer',
      meta: {
        interface: 'input',
        width: 'half',
        options: {
          placeholder: '10'
        }
      },
      schema: {
        default_value: 10
      }
    }
  ],
  minWidth: 18,
  minHeight: 12
});
