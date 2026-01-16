/**
 * SynthStack Dashboard Module
 * 
 * FREE FEATURE - Available in all tiers
 * 
 * Provides an overview dashboard for SynthStack integration including:
 * - System status and health
 * - Quick stats (workflows, executions, agents)
 * - Recent activity feed
 * - Quick actions
 */

import { defineModule } from '@directus/extensions-sdk';
import ModuleComponent from './module.vue';

export default defineModule({
  id: 'synthstack-dashboard',
  name: 'SynthStack',
  icon: 'auto_awesome',
  routes: [
    {
      path: '',
      component: ModuleComponent,
    },
  ],
  preRegisterCheck(user) {
    // Dashboard is available to all authenticated users
    return !!user;
  },
});


