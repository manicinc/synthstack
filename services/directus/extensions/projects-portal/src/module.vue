<template>
	<private-view title="Projects Dashboard">
		<template #headline>
			<v-breadcrumb :items="[{ name: 'Projects', to: '/projects-portal' }]" />
		</template>

		<template #title-outer:prepend>
			<v-button class="header-icon" rounded disabled icon secondary>
				<v-icon name="folder" />
			</v-button>
		</template>

		<template #actions>
			<v-button v-tooltip="'Refresh'" icon rounded @click="loadProjects">
				<v-icon name="refresh" />
			</v-button>
		</template>

		<div class="projects-portal">
			<!-- Loading State -->
			<v-progress-linear v-if="loading" indeterminate />

			<!-- Projects Table -->
			<div v-else-if="projects.length > 0" class="projects-table">
				<v-table
					:headers="headers"
					:items="projects"
					:loading="loading"
					show-resize
					@click:row="openProject"
				>
					<template #[`item.name`]="{ item }">
						<div class="project-name">
							<v-icon name="folder" small class="project-icon" />
							<strong>{{ item.name }}</strong>
						</div>
					</template>

					<template #[`item.milestones`]="{ item }">
						<div class="milestones">
							<template v-for="(milestone, i) in item.milestones" :key="i">
								<div
									class="milestone-dot"
									:class="{
										'completed': milestone.isComplete,
										'current': milestone.isCurrent,
										'pending': !milestone.isComplete && !milestone.isCurrent
									}"
								>
									<v-icon
										v-if="milestone.isComplete"
										name="check"
										x-small
										class="check-icon"
									/>
								</div>
								<div
									v-if="i < item.milestones.length - 1"
									class="milestone-line"
									:class="{ 'completed': milestone.isComplete }"
								/>
							</template>
						</div>
					</template>

					<template #[`item.due_date`]="{ item }">
						<div class="due-date">
							<div class="date-text">{{ formatDate(item.due_date) }}</div>
							<div class="relative-time">{{ getRelativeTime(item.due_date) }}</div>
						</div>
					</template>

					<template #[`item.actions`]="{ item }">
						<v-button
							icon
							rounded
							secondary
							@click.stop="openProject(item)"
						>
							<v-icon name="arrow_forward" />
						</v-button>
					</template>
				</v-table>
			</div>

			<!-- Empty State -->
			<v-info v-else icon="folder" title="No projects yet" center>
				<template #append>
					<v-button @click="createProject">Create First Project</v-button>
				</template>
			</v-info>
		</div>
	</private-view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useRouter } from 'vue-router';

const api = useApi();
const router = useRouter();

const loading = ref(true);
const projects = ref([]);

const headers = [
	{ text: 'Project Name', value: 'name', width: 300 },
	{ text: 'Status', value: 'milestones', width: 200 },
	{ text: 'Due Date', value: 'due_date', width: 150 },
	{ text: '', value: 'actions', width: 100, align: 'right' },
];

async function loadProjects() {
	loading.value = true;
	try {
		const response = await api.get('/items/projects', {
			params: {
				fields: [
					'id',
					'name',
					'due_date',
					'todos.id',
					'todos.name',
					'todos.status',
					'todos.is_milestone',
				],
				filter: {
					status: {
						_neq: 'archived',
					},
				},
				deep: {
					todos: {
						_filter: {
							is_milestone: {
								_eq: true,
							},
						},
						_sort: ['sort', 'created_at'],
					},
				},
			},
		});

		projects.value = response.data.data.map((project: any) => ({
			id: project.id,
			name: project.name,
			due_date: project.due_date,
			milestones: (project.todos || []).map((todo: any) => ({
				name: todo.name,
				isComplete: todo.status === 'completed',
				isCurrent: ['in_progress', 'in_review'].includes(todo.status),
			})),
		}));
	} catch (error) {
		console.error('Failed to load projects:', error);
	} finally {
		loading.value = false;
	}
}

function openProject(project: any) {
	router.push(`/content/projects/${project.id}`);
}

function createProject() {
	router.push('/content/projects/+');
}

function formatDate(dateString: string) {
	if (!dateString) return '';
	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function getRelativeTime(dateString: string) {
	if (!dateString) return '';
	const date = new Date(dateString);
	const now = new Date();
	const diffTime = date.getTime() - now.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return `${Math.abs(diffDays)} days overdue`;
	} else if (diffDays === 0) {
		return 'Due today';
	} else if (diffDays === 1) {
		return 'Due tomorrow';
	} else if (diffDays <= 7) {
		return `Due in ${diffDays} days`;
	} else if (diffDays <= 30) {
		return `Due in ${Math.ceil(diffDays / 7)} weeks`;
	} else {
		return `Due in ${Math.ceil(diffDays / 30)} months`;
	}
}

onMounted(() => {
	loadProjects();
});
</script>

<style scoped>
.projects-portal {
	padding: var(--content-padding);
	padding-top: 0;
}

.projects-table {
	background-color: var(--theme--background);
	border-radius: var(--theme--border-radius);
	overflow: hidden;
}

.project-name {
	display: flex;
	align-items: center;
	gap: 12px;
}

.project-icon {
	color: var(--theme--primary);
}

.milestones {
	display: flex;
	align-items: center;
	gap: 8px;
}

.milestone-dot {
	width: 20px;
	height: 20px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.milestone-dot.pending {
	border: 2px solid var(--theme--border-color);
	background: transparent;
}

.milestone-dot.current {
	border: 2px dashed var(--theme--primary);
	width: 32px;
	height: 32px;
}

.milestone-dot.completed {
	background: var(--theme--primary);
	border: none;
}

.check-icon {
	color: white;
}

.milestone-line {
	height: 2px;
	width: 12px;
	background: var(--theme--border-color);
	flex-shrink: 0;
}

.milestone-line.completed {
	background: var(--theme--primary);
}

.due-date {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.date-text {
	font-size: 14px;
	color: var(--theme--foreground);
}

.relative-time {
	font-size: 12px;
	color: var(--theme--foreground-subdued);
}
</style>
