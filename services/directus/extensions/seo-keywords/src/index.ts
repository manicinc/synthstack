import { definePanel } from '@directus/extensions-sdk';
import PanelComponent from './panel.vue';

export default definePanel({
  id: 'seo-keywords',
  name: 'SEO Keywords',
  icon: 'key',
  description: 'Manage target keywords for SEO optimization, track rankings, and generate improvements',
  component: PanelComponent,
  options: [
    {
      field: 'height',
      name: 'Height',
      type: 'integer',
      meta: {
        interface: 'input',
        width: 'half',
      },
      schema: {
        default_value: 600,
      },
    },
    {
      field: 'apiUrl',
      name: 'API URL',
      type: 'string',
      meta: {
        interface: 'input',
        width: 'half',
        note: 'API Gateway URL (e.g., http://localhost:3003)',
      },
      schema: {
        default_value: 'http://localhost:3003',
      },
    },
    {
      field: 'defaultView',
      name: 'Default View',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'All Keywords', value: 'all' },
            { text: 'Targeting', value: 'targeting' },
            { text: 'Optimizing', value: 'optimizing' },
            { text: 'Ranking', value: 'ranking' },
          ],
        },
        width: 'half',
      },
      schema: {
        default_value: 'all',
      },
    },
    {
      field: 'showResearchButton',
      name: 'Show Research Button',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        width: 'half',
      },
      schema: {
        default_value: true,
      },
    },
  ],
  minWidth: 20,
  minHeight: 16,
});
