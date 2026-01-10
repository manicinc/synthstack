/**
 * SynthStack Workflows Module
 * 
 * PREMIUM FEATURE - Requires Pro or Agency license
 * 
 * Provides workflow management capabilities including:
 * - Workflow list and management
 * - Execution history and logs
 * - Template library
 * - Flow deployment controls
 */

import { defineModule } from '@directus/extensions-sdk';
import ModuleComponent from './module.vue';

export default defineModule({
  id: 'synthstack-workflows',
  name: 'Workflows',
  icon: 'account_tree',
  routes: [
    {
      path: '',
      component: ModuleComponent,
    },
    {
      path: ':id',
      component: () => import('./detail.vue'),
    },
  ],
  preRegisterCheck(user) {
    // Workflows module requires authentication
    return !!user;
  },
});


