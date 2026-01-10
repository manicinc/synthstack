import { defineModule } from '@directus/extensions-sdk';
import ModuleComponent from './module.vue';

export default defineModule({
	id: 'projects-portal',
	name: 'Projects',
	icon: 'folder',
	routes: [
		{
			path: '',
			component: ModuleComponent,
		},
	],
	preRegisterCheck(user, permissions) {
		// Only admins can see this module
		return user.role?.admin_access === true;
	},
});
