import { defineInterface } from '@directus/extensions-sdk';
import InterfaceComponent from './interface.vue';

export default defineInterface({
  id: 'visual-editor-link',
  name: 'Visual Editor Link',
  icon: 'edit',
  description: 'Opens the item in the visual editor on the website',
  component: InterfaceComponent,
  options: [
    {
      field: 'websiteUrl',
      name: 'Website URL',
      type: 'string',
      meta: {
        interface: 'input',
        width: 'full',
        options: {
          placeholder: 'https://synthstack.app',
        },
      },
      schema: {
        default_value: 'http://localhost:3050',
      },
    },
    {
      field: 'pathField',
      name: 'Path Field',
      type: 'string',
      meta: {
        interface: 'input',
        width: 'half',
        options: {
          placeholder: 'slug',
        },
      },
      schema: {
        default_value: 'slug',
      },
    },
    {
      field: 'pathPrefix',
      name: 'Path Prefix',
      type: 'string',
      meta: {
        interface: 'input',
        width: 'half',
        options: {
          placeholder: '/blog',
        },
      },
      schema: {
        default_value: '/blog',
      },
    },
  ],
  types: ['alias'],
  localTypes: ['presentation'],
  group: 'other',
});
