/**
 * @file ProjectDetailPage.vue
 * @description Project detail page with tabs for overview, todos, milestones, and marketing plans.
 * Includes inline AI copilot integration for project-specific assistance.
 */
<template>
  <q-page class="project-detail-page">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="row justify-center items-center"
      style="min-height: 400px"
    >
      <q-spinner-dots
        size="50px"
        color="primary"
      />
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="text-center q-pa-xl"
    >
      <q-icon
        name="error_outline"
        size="64px"
        color="negative"
      />
      <h5 class="q-mt-md">
        Project not found
      </h5>
      <p class="text-grey-6">
        The project you're looking for doesn't exist or you don't have access.
      </p>
      <q-btn
        color="primary"
        label="Back to Projects"
        @click="$router.push({ name: 'projects' })"
      />
    </div>

    <!-- Project Content -->
    <template v-else-if="project">
      <!-- Header -->
      <div class="project-header q-pa-md">
        <div class="row items-center q-mb-sm">
          <q-btn
            flat
            round
            icon="arrow_back"
            class="q-mr-sm"
            @click="$router.push({ name: 'projects' })"
          />
          <q-badge
            :color="getStatusColor(project.status)"
            :label="project.status"
            class="text-capitalize q-mr-sm"
          />
          <q-badge
            v-if="project.isSystem"
            color="deep-purple"
            text-color="white"
            outline
            class="q-mr-md"
          >
            <q-icon
              name="verified"
              size="12px"
              class="q-mr-xs"
            />
            Example Project
          </q-badge>
          <q-space />
          <q-btn
            flat
            icon="edit"
            label="Edit"
            class="q-mr-sm"
            @click="showEditDialog = true"
          />
          <q-btn-dropdown
            flat
            icon="more_vert"
          >
            <q-list>
              <q-item
                v-close-popup
                clickable
                @click="archiveProject"
              >
                <q-item-section avatar>
                  <q-icon name="archive" />
                </q-item-section>
                <q-item-section>Archive</q-item-section>
              </q-item>
              <!-- Hide delete option for system projects -->
              <q-item
                v-if="!project.isSystem"
                v-close-popup
                clickable
                @click="showDeleteDialog = true"
              >
                <q-item-section avatar>
                  <q-icon
                    name="delete"
                    color="negative"
                  />
                </q-item-section>
                <q-item-section class="text-negative">
                  Delete
                </q-item-section>
              </q-item>
              <q-item
                v-else
                disable
                class="text-grey-5"
              >
                <q-item-section avatar>
                  <q-icon name="lock" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Protected</q-item-label>
                  <q-item-label caption>
                    System project
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
        <h1 class="text-h4 q-mb-xs">
          {{ project.name }}
        </h1>
        <p class="text-grey-7 q-mb-sm">
          {{ project.description || 'No description' }}
        </p>

        <!-- Project Tags -->
        <div class="row items-center q-mb-md q-gutter-xs">
          <q-badge
            v-for="tag in project.tags || []"
            :key="tag.name"
            :color="tag.color"
            text-color="white"
            class="cursor-pointer"
            @click="editTags"
          >
            {{ tag.name }}
            <q-tooltip>Click to edit tags</q-tooltip>
          </q-badge>
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="add"
            color="grey"
            @click="editTags"
          >
            <q-tooltip>Add tags</q-tooltip>
          </q-btn>
        </div>

        <!-- Progress Stats -->
        <div class="row q-col-gutter-md">
          <div class="col-6 col-md-3">
            <q-card
              flat
              bordered
              class="stat-card"
            >
              <q-card-section class="text-center">
                <div class="text-h5 text-primary">
                  {{ todoStats.completed }}/{{ todoStats.total }}
                </div>
                <div class="text-caption text-grey-6">
                  Todos Completed
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-md-3">
            <q-card
              flat
              bordered
              class="stat-card"
            >
              <q-card-section class="text-center">
                <div class="text-h5 text-warning">
                  {{ todoStats.inProgress }}
                </div>
                <div class="text-caption text-grey-6">
                  In Progress
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-md-3">
            <q-card
              flat
              bordered
              class="stat-card"
            >
              <q-card-section class="text-center">
                <div class="text-h5 text-info">
                  {{ milestones.length }}
                </div>
                <div class="text-caption text-grey-6">
                  Milestones
                </div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-6 col-md-3">
            <q-card
              flat
              bordered
              class="stat-card"
            >
              <q-card-section class="text-center">
                <div class="text-h5 text-positive">
                  {{ Math.round(progressPercent) }}%
                </div>
                <div class="text-caption text-grey-6">
                  Overall Progress
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <q-tabs
        v-model="activeTab"
        class="project-tabs"
        active-color="primary"
        indicator-color="primary"
        align="left"
      >
        <q-tab
          name="todos"
          icon="check_circle"
          label="Todos"
        />
        <q-tab
          name="milestones"
          icon="flag"
          label="Milestones"
        />
        <q-tab
          name="progress"
          icon="emoji_events"
          label="Progress"
        />
        <q-tab
          name="team"
          icon="group"
          label="Team"
        />
        <q-tab
          name="marketing"
          icon="campaign"
          label="Marketing Plans"
        />
        <q-tab
          name="documents"
          icon="description"
          label="Documents"
        />
        <!-- COMMUNITY: AI Assistant tab removed (PRO feature) -->
        <q-tab
          name="settings"
          icon="settings"
          label="Settings"
        />
      </q-tabs>

      <q-separator />

      <q-tab-panels
        v-model="activeTab"
        animated
        class="q-pa-md"
      >
        <!-- Todos Tab -->
        <q-tab-panel name="todos">
          <div class="row items-center q-mb-md">
            <div class="col">
              <h5 class="q-mb-none">
                Todos
              </h5>
            </div>
            <div class="col-auto q-gutter-sm">
              <q-btn
                flat
                color="secondary"
                icon="auto_awesome"
                label="AI Suggest"
                :loading="suggestingTodos"
                @click="suggestTodos"
              />
              <q-btn
                color="primary"
                icon="add"
                label="Add Todo"
                @click="showTodoDialog = true"
              />
            </div>
          </div>

          <!-- Todo Filters -->
          <div class="row q-col-gutter-sm q-mb-md">
            <div class="col">
              <q-btn-toggle
                v-model="todoFilter"
                toggle-color="primary"
                :options="todoFilterOptions"
                spread
                flat
                no-caps
              />
            </div>
          </div>

          <!-- Todos List -->
          <q-list
            v-if="filteredTodos.length > 0"
            separator
          >
            <q-item
              v-for="todo in filteredTodos"
              :key="todo.id"
              class="todo-item"
            >
              <q-item-section avatar>
                <q-btn
                  flat
                  round
                  dense
                  :icon="getTodoStatusIcon(todo.status)"
                  :color="getTodoStatusColor(todo.status)"
                  @click="cycleTodoStatus(todo)"
                >
                  <q-tooltip>{{ getTodoStatusLabel(todo.status) }} - Click to change</q-tooltip>
                </q-btn>
              </q-item-section>

              <q-item-section>
                <q-item-label :class="getTodoTitleClass(todo.status)">
                  {{ todo.title }}
                </q-item-label>
                <q-item-label
                  v-if="todo.description"
                  caption
                >
                  {{ todo.description }}
                </q-item-label>
                <div class="row items-center q-gutter-xs q-mt-xs">
                  <q-item-label
                    v-if="todo.dueDate"
                    caption
                  >
                    <q-icon
                      name="event"
                      size="xs"
                      class="q-mr-xs"
                    />
                    Due: {{ formatDate(todo.dueDate) }}
                  </q-item-label>
                  <!-- GitHub Issue Link -->
                  <q-chip
                    v-if="todo.githubIssueNumber"
                    dense
                    size="sm"
                    color="blue-2"
                    text-color="blue-10"
                    icon="bug_report"
                    clickable
                    @click="openGitHubLink(todo.githubIssueUrl)"
                  >
                    #{{ todo.githubIssueNumber }}
                    <q-tooltip>Open GitHub Issue #{{ todo.githubIssueNumber }}</q-tooltip>
                  </q-chip>
                  <!-- GitHub PR Link -->
                  <q-chip
                    v-if="todo.githubPrNumber"
                    dense
                    size="sm"
                    color="purple-2"
                    text-color="purple-10"
                    icon="merge_type"
                    clickable
                    @click="openGitHubLink(todo.githubPrUrl)"
                  >
                    PR #{{ todo.githubPrNumber }}
                    <q-tooltip>Open GitHub PR #{{ todo.githubPrNumber }}</q-tooltip>
                  </q-chip>
                </div>
              </q-item-section>

              <q-item-section side>
                <div class="row items-center q-gutter-xs">
                  <q-chip
                    :color="getTodoStatusColor(todo.status)"
                    text-color="white"
                    dense
                    size="sm"
                    :icon="getTodoStatusIcon(todo.status)"
                  >
                    {{ getTodoStatusLabel(todo.status) }}
                  </q-chip>
                  <q-chip
                    :color="getPriorityColor(todo.priority)"
                    text-color="white"
                    dense
                    size="sm"
                    :icon="getPriorityIcon(todo.priority)"
                  >
                    {{ getPriorityLabel(todo.priority) }}
                  </q-chip>
                  <q-btn
                    flat
                    round
                    dense
                    icon="link"
                    @click="linkTodoToGitHub(todo)"
                  >
                    <q-tooltip>Link to GitHub Issue</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="edit"
                    @click="editTodo(todo)"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="deleteTodo(todo)"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>

          <div
            v-else
            class="text-center q-pa-lg text-grey-6"
          >
            <q-icon
              name="check_circle_outline"
              size="48px"
            />
            <p class="q-mt-md">
              No todos yet. Add one or let AI suggest some!
            </p>
            <!-- Debug info for system projects -->
            <p
              v-if="project?.isSystem"
              class="text-caption q-mt-sm"
            >
              System project: {{ todos.length }} todos loaded, filter: {{ todoFilter }}
            </p>
            <q-btn
              v-if="project?.isSystem"
              flat
              size="sm"
              color="grey"
              icon="refresh"
              label="Reset Demo Session"
              class="q-mt-sm"
              @click="resetDemoSession"
            />
          </div>
        </q-tab-panel>

        <!-- Milestones Tab -->
        <q-tab-panel name="milestones">
          <!-- Header with Actions -->
          <div class="row items-center q-mb-lg">
            <div class="col">
              <h5 class="q-mb-none">
                Milestones
              </h5>
              <p class="text-grey-6 text-caption q-mb-none">
                Track project phases and deliverables
              </p>
            </div>
            <div class="col-auto q-gutter-sm">
              <q-btn
                flat
                color="secondary"
                icon="auto_awesome"
                label="AI Suggest"
                :loading="suggestingMilestones"
                @click="suggestMilestones"
              />
              <q-btn
                color="primary"
                icon="add"
                label="Add Milestone"
                @click="showMilestoneDialog = true"
              />
            </div>
          </div>

          <!-- Stats Cards -->
          <div
            v-if="milestones.length > 0"
            class="row q-col-gutter-md q-mb-lg"
          >
            <div class="col-6 col-sm-3">
              <q-card
                flat
                bordered
                class="text-center q-pa-sm"
              >
                <div class="text-h5 text-primary">
                  {{ milestones.length }}
                </div>
                <div class="text-caption text-grey-7">
                  Total
                </div>
              </q-card>
            </div>
            <div class="col-6 col-sm-3">
              <q-card
                flat
                bordered
                class="text-center q-pa-sm"
              >
                <div class="text-h5 text-blue">
                  {{ milestoneStats.inProgress }}
                </div>
                <div class="text-caption text-grey-7">
                  In Progress
                </div>
              </q-card>
            </div>
            <div class="col-6 col-sm-3">
              <q-card
                flat
                bordered
                class="text-center q-pa-sm"
              >
                <div class="text-h5 text-green">
                  {{ milestoneStats.completed }}
                </div>
                <div class="text-caption text-grey-7">
                  Completed
                </div>
              </q-card>
            </div>
            <div class="col-6 col-sm-3">
              <q-card
                flat
                bordered
                class="text-center q-pa-sm"
              >
                <div
                  class="text-h5"
                  :class="milestoneStats.overdue > 0 ? 'text-red' : 'text-grey'"
                >
                  {{ milestoneStats.overdue }}
                </div>
                <div class="text-caption text-grey-7">
                  Overdue
                </div>
              </q-card>
            </div>
          </div>

          <!-- Filter Tabs -->
          <q-tabs
            v-if="milestones.length > 0"
            v-model="milestoneFilter"
            dense
            class="text-grey-7 q-mb-md"
            active-color="primary"
            indicator-color="primary"
            align="left"
            narrow-indicator
          >
            <q-tab
              name="all"
              label="All"
            />
            <q-tab
              name="upcoming"
              label="Upcoming"
            />
            <q-tab
              name="in_progress"
              label="In Progress"
            />
            <q-tab
              name="completed"
              label="Completed"
            />
            <q-tab
              name="missed"
              label="Missed"
            />
          </q-tabs>

          <!-- Milestone Cards Grid -->
          <div
            v-if="filteredMilestones.length > 0"
            class="row q-col-gutter-md"
          >
            <div
              v-for="milestone in filteredMilestones"
              :key="milestone.id"
              class="col-12 col-md-6 col-lg-4"
            >
              <q-card
                flat
                bordered
                class="milestone-card full-height"
              >
                <!-- Status Header -->
                <q-card-section class="q-pb-none">
                  <div class="row items-center q-mb-sm">
                    <q-chip
                      :color="getMilestoneColor(milestone.status)"
                      text-color="white"
                      dense
                      size="sm"
                      :icon="getMilestoneIcon(milestone.status)"
                    >
                      {{ getMilestoneLabel(milestone.status) }}
                    </q-chip>
                    <q-space />
                    <!-- Overdue/At Risk Indicator -->
                    <q-chip
                      v-if="getMilestoneRisk(milestone) === 'overdue'"
                      color="red"
                      text-color="white"
                      dense
                      size="sm"
                      icon="warning"
                    >
                      Overdue
                    </q-chip>
                    <q-chip
                      v-else-if="getMilestoneRisk(milestone) === 'at_risk'"
                      color="orange"
                      text-color="white"
                      dense
                      size="sm"
                      icon="schedule"
                    >
                      At Risk
                    </q-chip>
                  </div>
                  <div class="text-subtitle1 text-weight-medium">
                    {{ milestone.title }}
                  </div>
                </q-card-section>

                <!-- Description -->
                <q-card-section
                  v-if="milestone.description"
                  class="q-pt-sm q-pb-sm"
                >
                  <p class="text-grey-7 text-body2 q-mb-none ellipsis-2-lines">
                    {{ milestone.description }}
                  </p>
                </q-card-section>

                <!-- Target Date & Progress -->
                <q-card-section class="q-pt-sm">
                  <div
                    v-if="milestone.targetDate"
                    class="q-mb-sm"
                  >
                    <div class="row items-center justify-between q-mb-xs">
                      <span class="text-caption text-grey-7">
                        <q-icon
                          name="event"
                          size="xs"
                          class="q-mr-xs"
                        />
                        {{ formatDate(milestone.targetDate) }}
                      </span>
                      <span
                        class="text-caption"
                        :class="getMilestoneDateClass(milestone)"
                      >
                        {{ getMilestoneTimeRemaining(milestone) }}
                      </span>
                    </div>
                    <!-- Progress Bar -->
                    <q-linear-progress
                      :value="getMilestoneProgress(milestone)"
                      :color="getMilestoneProgressColor(milestone)"
                      rounded
                      size="6px"
                      class="q-mt-xs"
                    />
                  </div>
                  <div
                    v-else
                    class="text-caption text-grey-5 text-italic"
                  >
                    No target date set
                  </div>
                </q-card-section>

                <!-- Actions -->
                <q-separator />
                <q-card-actions>
                  <q-btn-dropdown
                    flat
                    dense
                    color="primary"
                    label="Status"
                    icon="swap_horiz"
                    size="sm"
                  >
                    <q-list dense>
                      <q-item
                        v-for="status in milestoneStatusOptions"
                        :key="status.value"
                        v-close-popup
                        clickable
                        :active="milestone.status === status.value"
                        @click="updateMilestoneStatus(milestone, status.value)"
                      >
                        <q-item-section avatar>
                          <q-icon
                            :name="status.icon"
                            :color="status.color"
                            size="sm"
                          />
                        </q-item-section>
                        <q-item-section>{{ status.label }}</q-item-section>
                      </q-item>
                    </q-list>
                  </q-btn-dropdown>
                  <q-space />
                  <q-btn
                    flat
                    dense
                    icon="edit"
                    size="sm"
                    @click="editMilestone(milestone)"
                  >
                    <q-tooltip>Edit</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    dense
                    icon="delete"
                    color="negative"
                    size="sm"
                    @click="deleteMilestone(milestone)"
                  >
                    <q-tooltip>Delete</q-tooltip>
                  </q-btn>
                </q-card-actions>
              </q-card>
            </div>
          </div>

          <!-- Empty State for Filter -->
          <div
            v-else-if="milestones.length > 0"
            class="text-center q-pa-lg text-grey-6"
          >
            <q-icon
              name="filter_alt_off"
              size="48px"
            />
            <p class="q-mt-md">
              No milestones match the current filter.
            </p>
            <q-btn
              flat
              color="primary"
              label="Show All"
              @click="milestoneFilter = 'all'"
            />
          </div>

          <!-- Empty State - No Milestones -->
          <div
            v-else
            class="text-center q-pa-xl text-grey-6"
          >
            <q-icon
              name="flag"
              size="64px"
            />
            <p class="text-h6 q-mt-md">
              No milestones yet
            </p>
            <p class="text-body2">
              Create milestones to track major project phases and deliverables.
            </p>
            <div class="q-mt-md q-gutter-sm">
              <q-btn
                color="primary"
                icon="add"
                label="Add Milestone"
                @click="showMilestoneDialog = true"
              />
              <q-btn
                flat
                color="secondary"
                icon="auto_awesome"
                label="Let AI Suggest"
                :loading="suggestingMilestones"
                @click="suggestMilestones"
              />
            </div>
          </div>
        </q-tab-panel>

        <!-- Progress & Gamification Tab -->
        <q-tab-panel name="progress">
          <div class="row items-center q-mb-md">
            <div class="col">
              <h5 class="q-mb-none">
                Progress & Achievements
              </h5>
              <p class="text-grey-6 text-caption">
                Track your points, streaks, and achievements
              </p>
            </div>
          </div>

          <!-- Loading State -->
          <div
            v-if="gamificationStore.isLoading"
            class="text-center q-pa-lg"
          >
            <q-spinner-dots
              size="40px"
              color="primary"
            />
            <p class="text-grey-6 q-mt-md">
              Loading...
            </p>
          </div>

          <!-- Stats Overview -->
          <template v-else-if="gamificationStore.stats">
            <GamificationStats
              :stats="gamificationStore.stats"
              :loading="gamificationStore.isLoading"
              class="q-mb-lg"
              @refresh="loadGamificationData"
            />

            <!-- Active Sprint -->
            <div
              v-if="gamificationStore.activeSprints.length > 0"
              class="q-mb-lg"
            >
              <div class="text-subtitle1 q-mb-sm">
                Current Sprint
              </div>
              <SprintCard
                :sprint="gamificationStore.activeSprints[0]"
                :completed-tasks="0"
                @start="handleSprintStart"
                @complete="handleSprintComplete"
                @edit="handleSprintEdit"
                @retrospective="handleSprintRetrospective"
              />
            </div>

            <!-- Sprints Section -->
            <div
              v-if="gamificationStore.sprints.length > 0"
              class="q-mb-lg"
            >
              <div class="text-subtitle1 q-mb-sm">
                All Sprints
              </div>
              <div class="row q-col-gutter-md">
                <div
                  v-for="sprint in gamificationStore.sprints"
                  :key="sprint.id"
                  class="col-12 col-md-6"
                >
                  <SprintCard
                    :sprint="sprint"
                    :show-actions="sprint.status !== 'completed'"
                    @start="handleSprintStart"
                    @complete="handleSprintComplete"
                    @edit="handleSprintEdit"
                    @retrospective="handleSprintRetrospective"
                  />
                </div>
              </div>
            </div>

            <!-- Leaderboard -->
            <div class="q-mb-lg">
              <ProjectLeaderboard
                :project-id="project?.id || ''"
                :entries="gamificationStore.leaderboard"
              />
            </div>

            <!-- Achievements -->
            <div class="q-mb-lg">
              <div class="text-subtitle1 q-mb-sm">
                Achievements
              </div>
              <div
                v-if="gamificationStore.achievements.length > 0"
                class="row q-col-gutter-sm"
              >
                <div
                  v-for="achievement in gamificationStore.achievements"
                  :key="achievement.id"
                  class="col-6 col-sm-4 col-md-3"
                >
                  <AchievementBadge :achievement="achievement" />
                </div>
              </div>
              <div
                v-else
                class="text-center q-pa-lg text-grey-6"
              >
                <q-icon
                  name="emoji_events"
                  size="48px"
                />
                <p class="q-mt-md">
                  Complete tasks to unlock achievements!
                </p>
              </div>
            </div>
          </template>

          <!-- No Stats State -->
          <div
            v-else
            class="text-center q-pa-xl text-grey-6"
          >
            <q-icon
              name="bar_chart"
              size="64px"
            />
            <p class="text-h6 q-mt-md">
              Progress tracking unavailable
            </p>
            <p class="text-body2 q-mb-md">
              Gamification stats could not be loaded.
            </p>
            <q-btn
              color="primary"
              icon="refresh"
              label="Retry"
              @click="loadGamificationData"
            />
          </div>
        </q-tab-panel>

        <!-- Team Members Tab -->
        <q-tab-panel name="team">
          <div class="row items-center q-mb-md">
            <div class="col">
              <h5 class="q-mb-none">
                Team Members
              </h5>
              <p class="text-grey-6 text-caption">
                Manage who has access to this project
              </p>
            </div>
            <div class="col-auto">
              <q-btn
                color="primary"
                icon="person_add"
                label="Invite Member"
                :disable="isGuestUser"
                @click="showInviteDialog = true"
              >
                <q-tooltip v-if="isGuestUser">
                  Sign up for a free account to invite team members
                </q-tooltip>
              </q-btn>
            </div>
          </div>

          <!-- Guest User Warning -->
          <q-banner
            v-if="isGuestUser"
            class="bg-orange-2 text-grey-9 q-mb-md"
            rounded
          >
            <template #avatar>
              <q-icon
                name="lock"
                color="warning"
              />
            </template>
            <div class="text-body2">
              <strong>Team management is not available for guest users.</strong>
              <div class="text-caption q-mt-xs">
                Please sign up for a free account to invite and manage team members.
              </div>
            </div>
            <template #action>
              <q-btn
                flat
                dense
                label="Sign Up Free"
                color="warning"
                @click="router.push('/register')"
              />
            </template>
          </q-banner>

          <!-- Current Members -->
          <div class="q-mb-lg">
            <div class="text-subtitle1 q-mb-sm">
              Current Members ({{ teamMembers.length }})
            </div>
            <q-list
              v-if="teamMembers.length > 0"
              bordered
              separator
            >
              <q-item
                v-for="member in teamMembers"
                :key="member.id"
                class="q-py-md"
              >
                <q-item-section avatar>
                  <q-avatar
                    :color="getAvailabilityColor(member.profile?.availability)"
                    text-color="white"
                    size="48px"
                  >
                    {{ getMemberInitials(member) }}
                  </q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">
                    {{ getMemberDisplayName(member) }}
                  </q-item-label>
                  <q-item-label caption>
                    {{ member.profile?.role_title || member.role }}
                  </q-item-label>
                  <q-item-label caption class="q-mt-xs">
                    <q-badge
                      :color="getRoleColor(member.role)"
                      :label="member.role"
                      class="text-capitalize q-mr-xs"
                    />
                    <q-badge
                      :color="getAvailabilityColor(member.profile?.availability)"
                      :label="member.profile?.availability || 'available'"
                      class="text-capitalize q-mr-xs"
                    />
                    <q-badge
                      v-if="member.profile?.capacity_percent !== undefined && member.profile?.capacity_percent < 100"
                      color="blue-grey"
                      :label="`${member.profile?.capacity_percent}% capacity`"
                    />
                  </q-item-label>
                  <q-item-label
                    v-if="member.profile?.skills?.length > 0"
                    caption
                    class="q-mt-xs"
                  >
                    <q-chip
                      v-for="skill in member.profile.skills.slice(0, 4)"
                      :key="skill"
                      size="sm"
                      dense
                      color="grey-3"
                      text-color="grey-8"
                      class="q-mr-xs"
                    >
                      {{ skill }}
                    </q-chip>
                    <span v-if="member.profile.skills.length > 4" class="text-grey-6">
                      +{{ member.profile.skills.length - 4 }} more
                    </span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="more_vert"
                  >
                    <q-menu>
                      <q-list style="min-width: 180px">
                        <q-item
                          v-close-popup
                          clickable
                          @click="editMemberProfile(member)"
                        >
                          <q-item-section avatar>
                            <q-icon name="edit" />
                          </q-item-section>
                          <q-item-section>Edit Profile</q-item-section>
                        </q-item>
                        <q-item
                          v-if="!isGuestUser && member.role !== 'owner'"
                          v-close-popup
                          clickable
                          @click="changeRole(member)"
                        >
                          <q-item-section avatar>
                            <q-icon name="admin_panel_settings" />
                          </q-item-section>
                          <q-item-section>Change Role</q-item-section>
                        </q-item>
                        <q-separator v-if="!isGuestUser && member.role !== 'owner'" />
                        <q-item
                          v-if="!isGuestUser && member.role !== 'owner'"
                          v-close-popup
                          clickable
                          @click="removeMember(member)"
                        >
                          <q-item-section avatar>
                            <q-icon name="person_remove" color="negative" />
                          </q-item-section>
                          <q-item-section class="text-negative">
                            Remove
                          </q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
            <div
              v-else
              class="text-center q-pa-md text-grey-6"
            >
              <q-icon
                name="group"
                size="48px"
              />
              <p class="q-mt-md">
                No team members yet
              </p>
            </div>
          </div>

          <!-- Pending Invitations -->
          <div v-if="!isGuestUser">
            <div class="text-subtitle1 q-mb-sm">
              Pending Invitations
              <q-badge
                v-if="pendingInvitations.length > 0"
                :label="pendingInvitations.length"
                color="warning"
              />
            </div>
            <q-list
              v-if="pendingInvitations.length > 0"
              bordered
              separator
            >
              <q-item
                v-for="invitation in pendingInvitations"
                :key="invitation.id"
              >
                <q-item-section avatar>
                  <q-avatar
                    color="grey"
                    text-color="white"
                    icon="mail"
                  />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ invitation.email }}</q-item-label>
                  <q-item-label caption>
                    <q-badge
                      color="warning"
                      label="pending"
                    />
                    <span class="q-ml-sm text-grey-6">
                      Invited {{ formatDate(invitation.date_created) }}
                    </span>
                    <span class="q-ml-sm text-grey-6">
                      • Expires {{ formatDate(invitation.expires_at) }}
                    </span>
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <div class="row q-gutter-sm">
                    <q-btn
                      flat
                      dense
                      icon="content_copy"
                      color="primary"
                      @click="copyInviteLink(invitation)"
                    >
                      <q-tooltip>Copy invitation link</q-tooltip>
                    </q-btn>
                    <q-btn
                      flat
                      dense
                      icon="cancel"
                      color="negative"
                      @click="cancelInvitation(invitation)"
                    >
                      <q-tooltip>Cancel invitation</q-tooltip>
                    </q-btn>
                  </div>
                </q-item-section>
              </q-item>
            </q-list>
            <div
              v-else
              class="text-center q-pa-md text-grey-6"
            >
              <q-icon
                name="pending"
                size="32px"
              />
              <p class="q-mt-sm">
                No pending invitations
              </p>
            </div>
          </div>
        </q-tab-panel>

        <!-- Marketing Plans Tab -->
        <q-tab-panel name="marketing">
          <div class="row items-center q-mb-md">
            <div class="col">
              <h5 class="q-mb-none">
                Marketing Plans
              </h5>
            </div>
            <div class="col-auto q-gutter-sm">
              <q-btn
                flat
                color="secondary"
                icon="auto_awesome"
                label="AI Generate"
                :loading="generatingPlan"
                @click="generateMarketingPlan"
              />
              <q-btn
                color="primary"
                icon="add"
                label="Add Plan"
                @click="showMarketingDialog = true"
              />
            </div>
          </div>

          <!-- Marketing Plans List -->
          <div
            v-if="marketingPlans.length > 0"
            class="row q-col-gutter-md"
          >
            <div
              v-for="plan in marketingPlans"
              :key="plan.id"
              class="col-12 col-md-6"
            >
              <q-card>
                <q-card-section>
                  <div class="row items-center q-mb-sm">
                    <q-badge
                      :color="getPlanStatusColor(plan.status)"
                      :label="plan.status"
                      class="text-capitalize"
                    />
                    <q-space />
                    <q-btn
                      flat
                      round
                      dense
                      icon="more_vert"
                    >
                      <q-menu>
                        <q-list style="min-width: 120px">
                          <q-item
                            v-close-popup
                            clickable
                            @click="editMarketingPlan(plan)"
                          >
                            <q-item-section>Edit</q-item-section>
                          </q-item>
                          <q-item
                            v-close-popup
                            clickable
                            @click="deleteMarketingPlan(plan)"
                          >
                            <q-item-section class="text-negative">
                              Delete
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </q-menu>
                    </q-btn>
                  </div>
                  <div class="text-h6">
                    {{ plan.title }}
                  </div>
                  <div
                    v-if="plan.budget"
                    class="text-caption text-grey-6 q-mt-xs"
                  >
                    Budget: ${{ plan.budget.toLocaleString() }}
                  </div>
                  <div
                    v-if="plan.startDate || plan.endDate"
                    class="text-caption text-grey-6"
                  >
                    {{ formatDate(plan.startDate) }} - {{ formatDate(plan.endDate) }}
                  </div>
                </q-card-section>
                <q-card-section
                  v-if="plan.content"
                  class="q-pt-none"
                >
                  <pre class="plan-content text-body2">{{ JSON.stringify(plan.content, null, 2) }}</pre>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div
            v-else
            class="text-center q-pa-lg text-grey-6"
          >
            <q-icon
              name="campaign"
              size="48px"
            />
            <p class="q-mt-md">
              No marketing plans yet. Let AI generate one for you!
            </p>
          </div>
        </q-tab-panel>

        <!-- Documents Tab -->
        <q-tab-panel name="documents">
          <div class="row items-center q-mb-md">
            <div class="col">
              <h5 class="q-mb-none">
                Documents
              </h5>
              <p class="text-grey-6 text-caption">
                Upload documents, notes, and files to index in RAG for AI-powered Q&A
              </p>
            </div>
            <div class="col-auto">
              <q-btn
                color="primary"
                icon="upload_file"
                label="Upload Document"
                @click="showUploadDialog = true"
              />
            </div>
          </div>

          <!-- Document List -->
          <div
            v-if="documentsLoading"
            class="row justify-center q-pa-lg"
          >
            <q-spinner-dots
              size="48px"
              color="primary"
            />
          </div>

          <div
            v-else-if="documents.length > 0"
            class="q-gutter-md"
          >
            <q-card
              v-for="doc in documents"
              :key="doc.id"
              flat
              bordered
              class="document-card"
            >
              <q-card-section class="row items-center">
                <q-icon
                  :name="getFileIcon(doc.file_type)"
                  size="32px"
                  class="q-mr-md"
                  color="primary"
                />
                <div class="col">
                  <div class="text-subtitle1">
                    {{ doc.filename }}
                  </div>
                  <div class="text-caption text-grey-6">
                    {{ formatFileSize(doc.file_size) }} • {{ doc.file_type.toUpperCase() }} •
                    Uploaded {{ formatDate(doc.date_created) }}
                  </div>
                  <div
                    v-if="doc.rag_indexed"
                    class="q-mt-xs"
                  >
                    <q-chip
                      dense
                      size="sm"
                      color="positive"
                      text-color="white"
                      icon="check_circle"
                    >
                      Indexed in RAG
                    </q-chip>
                  </div>
                  <div
                    v-else
                    class="q-mt-xs"
                  >
                    <q-chip
                      dense
                      size="sm"
                      color="warning"
                      text-color="white"
                      icon="pending"
                    >
                      Indexing...
                    </q-chip>
                  </div>
                </div>
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  @click="deleteDocument(doc.id)"
                >
                  <q-tooltip>Delete document</q-tooltip>
                </q-btn>
              </q-card-section>
            </q-card>
          </div>

          <div
            v-else
            class="text-center q-pa-lg text-grey-6"
          >
            <q-icon
              name="description"
              size="48px"
            />
            <p class="q-mt-md">
              No documents uploaded yet. Upload text files, PDFs, or markdown to enable AI Q&A!
            </p>
          </div>
        </q-tab-panel>

        <!-- COMMUNITY: AI Copilot Tab removed (PRO feature) -->

        <!-- Settings Tab -->
        <q-tab-panel name="settings">
          <div class="row items-center q-mb-md">
            <div class="col">
              <h5 class="q-mb-none">
                Project Settings
              </h5>
              <p class="text-grey-6 text-caption">
                Configure project integrations and preferences
              </p>
            </div>
          </div>

          <!-- GitHub Integration Section -->
          <q-card
            flat
            bordered
            class="q-mb-lg"
          >
            <q-card-section>
              <div class="row items-center q-mb-md">
                <q-icon
                  name="mdi-github"
                  size="32px"
                  class="q-mr-sm"
                />
                <div class="col">
                  <div class="text-h6">
                    GitHub Integration
                  </div>
                  <div class="text-caption text-grey-6">
                    Link this project to a GitHub repository
                  </div>
                </div>
                <router-link
                  :to="{ name: 'integrations' }"
                  class="text-primary text-caption"
                >
                  Manage Global Settings
                  <q-icon
                    name="open_in_new"
                    size="12px"
                  />
                </router-link>
              </div>

              <!-- PAT Source Toggle -->
              <q-banner
                v-if="!githubLinked"
                class="bg-grey-2 q-mb-md"
                rounded
                dense
              >
                <div class="row items-center">
                  <div class="col">
                    <div class="text-body2">
                      GitHub Authentication
                    </div>
                    <div class="text-caption text-grey-6">
                      {{ useGlobalPAT ? 'Using your global GitHub account' : 'Using a project-specific PAT' }}
                    </div>
                  </div>
                  <q-btn-toggle
                    v-model="useGlobalPAT"
                    toggle-color="primary"
                    :options="[
                      { label: 'Global', value: true },
                      { label: 'Project', value: false }
                    ]"
                    dense
                    unelevated
                    @update:model-value="saveUseGlobalPAT"
                  />
                </div>
              </q-banner>

              <!-- Global PAT Selected - Show Status -->
              <div v-if="useGlobalPAT && !githubLinked">
                <div
                  v-if="loadingGlobalGitHub"
                  class="text-center q-pa-md"
                >
                  <q-spinner-dots
                    size="32px"
                    color="primary"
                  />
                </div>

                <!-- Global PAT Connected -->
                <div
                  v-else-if="globalGitHubIntegration?.isValid"
                  class="q-pa-md bg-green-1 rounded-borders q-mb-md"
                >
                  <div class="row items-center q-mb-md">
                    <q-avatar size="40px">
                      <img :src="globalGitHubIntegration.avatarUrl || 'https://github.com/ghost.png'">
                    </q-avatar>
                    <div class="q-ml-md">
                      <div class="text-body1 text-weight-medium">
                        {{ globalGitHubIntegration.username }}
                      </div>
                      <div class="text-caption text-grey-7">
                        <code>{{ globalGitHubIntegration.patHint }}</code>
                      </div>
                    </div>
                    <q-space />
                    <q-chip
                      color="green"
                      text-color="white"
                      size="sm"
                      dense
                    >
                      Connected
                    </q-chip>
                  </div>

                  <q-input
                    v-model="githubRepoInput"
                    label="Repository (owner/repo)"
                    placeholder="e.g., facebook/react"
                    outlined
                    dense
                    class="q-mb-md"
                    :rules="[val => !val || /^[\w-]+\/[\w.-]+$/.test(val) || 'Format: owner/repo']"
                  >
                    <template #prepend>
                      <q-icon name="link" />
                    </template>
                  </q-input>

                  <div class="row q-col-gutter-sm q-mb-md">
                    <div class="col-6">
                      <q-input
                        v-model="githubDefaultBranch"
                        label="Default Branch"
                        outlined
                        dense
                      />
                    </div>
                    <div class="col-6">
                      <q-toggle
                        v-model="githubSyncEnabled"
                        label="Enable Auto-Sync"
                        color="primary"
                      />
                    </div>
                  </div>

                  <div class="row q-col-gutter-sm q-mb-md">
                    <div class="col-6">
                      <q-toggle
                        v-model="githubSyncIssues"
                        label="Sync Issues"
                        color="primary"
                      />
                    </div>
                    <div class="col-6">
                      <q-toggle
                        v-model="githubSyncPRs"
                        label="Sync Pull Requests"
                        color="primary"
                      />
                    </div>
                  </div>

                  <q-btn
                    color="primary"
                    icon="link"
                    label="Link Repository"
                    :loading="linkingGithub"
                    :disable="!githubRepoInput || !/^[\w-]+\/[\w.-]+$/.test(githubRepoInput)"
                    @click="linkGithubRepo"
                  />
                </div>

                <!-- Global PAT Not Connected -->
                <div
                  v-else
                  class="q-pa-md bg-amber-1 rounded-borders q-mb-md text-center"
                >
                  <q-icon
                    name="warning"
                    size="48px"
                    color="amber-8"
                    class="q-mb-sm"
                  />
                  <div class="text-body1 q-mb-sm">
                    No Global GitHub Connection
                  </div>
                  <div class="text-body2 text-grey-7 q-mb-md">
                    Connect your GitHub account in Integrations to use your global PAT,
                    or switch to a project-specific PAT below.
                  </div>
                  <q-btn
                    color="primary"
                    icon="extension"
                    label="Go to Integrations"
                    :to="{ name: 'integrations' }"
                    class="q-mr-sm"
                  />
                  <q-btn
                    outline
                    color="grey-8"
                    label="Use Project PAT"
                    @click="useGlobalPAT = false; saveUseGlobalPAT(false)"
                  />
                </div>
              </div>

              <!-- Project-Specific PAT Selected -->
              <div
                v-if="!useGlobalPAT && !githubLinked"
                class="q-pa-md bg-grey-2 rounded-borders"
              >
                <div class="text-body2 q-mb-md">
                  <q-icon
                    name="info"
                    color="info"
                    class="q-mr-xs"
                  />
                  Enter a project-specific GitHub PAT to connect this repository.
                </div>

                <q-input
                  v-model="githubPATInput"
                  label="GitHub Personal Access Token"
                  placeholder="ghp_..."
                  type="password"
                  outlined
                  dense
                  class="q-mb-md"
                  :rules="[val => !val || /^(ghp_|github_pat_|gho_)[\w]+$/.test(val) || 'Invalid PAT format']"
                >
                  <template #prepend>
                    <q-icon name="key" />
                  </template>
                  <template #hint>
                    Create a PAT at <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                    >github.com/settings/tokens</a> with 'repo' scope
                  </template>
                </q-input>

                <q-input
                  v-model="githubRepoInput"
                  label="Repository (owner/repo)"
                  placeholder="e.g., facebook/react"
                  outlined
                  dense
                  class="q-mb-md"
                  :rules="[val => !val || /^[\w-]+\/[\w.-]+$/.test(val) || 'Format: owner/repo']"
                >
                  <template #prepend>
                    <q-icon name="link" />
                  </template>
                  <template #hint>
                    Enter your GitHub repository in format: owner/repo
                  </template>
                </q-input>

                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-6">
                    <q-input
                      v-model="githubDefaultBranch"
                      label="Default Branch"
                      outlined
                      dense
                    />
                  </div>
                  <div class="col-6">
                    <q-toggle
                      v-model="githubSyncEnabled"
                      label="Enable Auto-Sync"
                      color="primary"
                    />
                  </div>
                </div>

                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-6">
                    <q-toggle
                      v-model="githubSyncIssues"
                      label="Sync Issues"
                      color="primary"
                    />
                  </div>
                  <div class="col-6">
                    <q-toggle
                      v-model="githubSyncPRs"
                      label="Sync Pull Requests"
                      color="primary"
                    />
                  </div>
                </div>

                <q-btn
                  color="primary"
                  icon="link"
                  label="Link Repository"
                  :loading="linkingGithub"
                  :disable="!githubPATInput || !githubRepoInput || !/^(ghp_|github_pat_|gho_)[\w]+$/.test(githubPATInput) || !/^[\w-]+\/[\w.-]+$/.test(githubRepoInput)"
                  @click="linkGithubRepo"
                />
              </div>

              <!-- Linked State -->
              <div v-if="githubLinked">
                <q-list
                  bordered
                  separator
                >
                  <q-item>
                    <q-item-section avatar>
                      <q-avatar
                        color="positive"
                        text-color="white"
                        icon="check_circle"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ project?.github_repo }}</q-item-label>
                      <q-item-label caption>
                        <q-badge
                          color="grey"
                          :label="`Branch: ${project?.github_default_branch || 'main'}`"
                          class="q-mr-xs"
                        />
                        <q-badge
                          :color="project?.github_sync_enabled ? 'positive' : 'grey'"
                          :label="project?.github_sync_enabled ? 'Auto-sync enabled' : 'Auto-sync disabled'"
                        />
                      </q-item-label>
                      <q-item-label
                        v-if="project?.github_last_synced_at"
                        caption
                      >
                        Last synced: {{ formatDate(project.github_last_synced_at) }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="row q-gutter-xs">
                        <q-btn
                          flat
                          dense
                          icon="sync"
                          color="primary"
                          :loading="syncingGithub"
                          @click="syncGithubData"
                        >
                          <q-tooltip>Sync now</q-tooltip>
                        </q-btn>
                        <q-btn
                          flat
                          dense
                          icon="link_off"
                          color="negative"
                          @click="unlinkGithubRepo"
                        >
                          <q-tooltip>Unlink repository</q-tooltip>
                        </q-btn>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>

                <!-- GitHub Issues -->
                <div class="q-mt-lg">
                  <div class="row items-center q-mb-md">
                    <div class="col">
                      <div class="text-subtitle1">
                        GitHub Issues
                      </div>
                      <div class="text-caption text-grey-6">
                        Cached issues from {{ project?.github_repo }}
                      </div>
                    </div>
                    <div class="col-auto">
                      <q-btn
                        flat
                        dense
                        icon="refresh"
                        label="Refresh"
                        color="primary"
                        :loading="loadingIssues"
                        @click="fetchGithubIssues"
                      />
                    </div>
                  </div>

                  <div
                    v-if="loadingIssues"
                    class="text-center q-pa-lg"
                  >
                    <q-spinner-dots
                      size="48px"
                      color="primary"
                    />
                  </div>

                  <q-list
                    v-else-if="githubIssues.length > 0"
                    bordered
                    separator
                  >
                    <q-item
                      v-for="issue in githubIssues"
                      :key="issue.id"
                      clickable
                      :href="issue.html_url"
                      target="_blank"
                    >
                      <q-item-section avatar>
                        <q-avatar
                          :color="issue.state === 'open' ? 'positive' : 'grey'"
                          text-color="white"
                        >
                          #{{ issue.github_issue_id }}
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ issue.title }}</q-item-label>
                        <q-item-label caption>
                          <q-badge
                            :color="issue.state === 'open' ? 'positive' : 'grey'"
                            :label="issue.state"
                            class="q-mr-xs"
                          />
                          <span
                            v-if="issue.created_by_github_user"
                            class="q-mr-xs"
                          >
                            by {{ issue.created_by_github_user }}
                          </span>
                          <span class="text-grey-6">
                            • {{ formatDate(issue.github_created_at) }}
                          </span>
                        </q-item-label>
                        <q-item-label
                          v-if="issue.labels && issue.labels.length > 0"
                          caption
                        >
                          <q-chip
                            v-for="label in issue.labels.slice(0, 3)"
                            :key="label"
                            dense
                            size="sm"
                            color="grey-4"
                            text-color="dark"
                            class="q-mr-xs"
                          >
                            {{ label }}
                          </q-chip>
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <div class="row items-center q-gutter-sm">
                          <q-chip
                            v-if="issue.linked_pr_count > 0"
                            dense
                            size="sm"
                            color="purple-3"
                            text-color="purple-10"
                            icon="merge_type"
                            :label="`${issue.linked_pr_count} PR${issue.linked_pr_count > 1 ? 's' : ''}`"
                          />
                          <q-icon
                            name="open_in_new"
                            color="grey-6"
                          />
                        </div>
                      </q-item-section>
                    </q-item>
                  </q-list>

                  <div
                    v-else
                    class="text-center q-pa-lg text-grey-6"
                  >
                    <q-icon
                      name="inbox"
                      size="48px"
                    />
                    <p class="q-mt-md">
                      No issues found
                    </p>
                  </div>
                </div>

                <!-- GitHub Pull Requests -->
                <div class="q-mt-lg">
                  <div class="row items-center q-mb-md">
                    <div class="col">
                      <div class="text-subtitle1">
                        GitHub Pull Requests
                      </div>
                      <div class="text-caption text-grey-6">
                        Cached PRs from {{ project?.github_repo }}
                      </div>
                    </div>
                    <div class="col-auto">
                      <q-btn
                        flat
                        dense
                        icon="refresh"
                        label="Refresh"
                        color="primary"
                        :loading="loadingPRs"
                        @click="fetchGithubPRs"
                      />
                    </div>
                  </div>

                  <div
                    v-if="loadingPRs"
                    class="text-center q-pa-lg"
                  >
                    <q-spinner-dots
                      size="48px"
                      color="primary"
                    />
                  </div>

                  <q-list
                    v-else-if="githubPRs.length > 0"
                    bordered
                    separator
                  >
                    <q-item
                      v-for="pr in githubPRs"
                      :key="pr.id"
                      clickable
                      :href="pr.html_url"
                      target="_blank"
                    >
                      <q-item-section avatar>
                        <q-avatar
                          :color="pr.merged ? 'purple' : pr.state === 'open' ? 'positive' : 'grey'"
                          text-color="white"
                        >
                          #{{ pr.github_pr_id }}
                        </q-avatar>
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ pr.title }}</q-item-label>
                        <q-item-label caption>
                          <q-badge
                            v-if="pr.merged"
                            color="purple"
                            label="merged"
                            class="q-mr-xs"
                          />
                          <q-badge
                            v-else
                            :color="pr.state === 'open' ? 'positive' : 'grey'"
                            :label="pr.state"
                            class="q-mr-xs"
                          />
                          <span
                            v-if="pr.draft"
                            class="q-mr-xs"
                          >
                            <q-badge
                              color="warning"
                              label="draft"
                            />
                          </span>
                          <span
                            v-if="pr.created_by_github_user"
                            class="q-mr-xs"
                          >
                            by {{ pr.created_by_github_user }}
                          </span>
                          <span class="text-grey-6">
                            • {{ formatDate(pr.github_created_at) }}
                          </span>
                        </q-item-label>
                        <q-item-label caption>
                          <span class="text-grey-6">
                            {{ pr.head_branch }} → {{ pr.base_branch }}
                          </span>
                          <span
                            v-if="pr.additions || pr.deletions"
                            class="q-ml-sm"
                          >
                            <span class="text-positive">+{{ pr.additions }}</span>
                            <span class="text-negative q-ml-xs">-{{ pr.deletions }}</span>
                          </span>
                        </q-item-label>
                        <!-- Linked Issues -->
                        <q-item-label
                          v-if="pr.linked_issue_numbers && pr.linked_issue_numbers.length > 0"
                          caption
                        >
                          <q-chip
                            v-for="issueNum in pr.linked_issue_numbers.slice(0, 4)"
                            :key="issueNum"
                            dense
                            size="sm"
                            color="blue-2"
                            text-color="blue-10"
                            icon="bug_report"
                            class="q-mr-xs"
                            :title="getLinkTypeDescription(pr.link_sources, issueNum)"
                          >
                            #{{ issueNum }}
                          </q-chip>
                          <q-chip
                            v-if="pr.linked_issue_numbers.length > 4"
                            dense
                            size="sm"
                            color="grey-3"
                            text-color="grey-8"
                          >
                            +{{ pr.linked_issue_numbers.length - 4 }} more
                          </q-chip>
                        </q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-icon
                          name="open_in_new"
                          color="grey-6"
                        />
                      </q-item-section>
                    </q-item>
                  </q-list>

                  <div
                    v-else
                    class="text-center q-pa-lg text-grey-6"
                  >
                    <q-icon
                      name="inbox"
                      size="48px"
                    />
                    <p class="q-mt-md">
                      No pull requests found
                    </p>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-tab-panel>
      </q-tab-panels>
    </template>

    <!-- Edit Project Dialog -->
    <q-dialog
      v-model="showEditDialog"
      persistent
    >
      <q-card style="width: min(400px, 90vw)">
        <q-card-section class="row items-center">
          <div class="text-h6">
            Edit Project
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="editForm.name"
            label="Project Name"
            outlined
            :rules="[val => !!val || 'Name is required']"
            class="q-mb-md"
          />
          <q-input
            v-model="editForm.description"
            label="Description"
            outlined
            type="textarea"
            rows="3"
            class="q-mb-md"
          />
          <q-select
            v-model="editForm.status"
            :options="['active', 'completed', 'archived']"
            label="Status"
            outlined
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="primary"
            label="Save"
            :loading="saving"
            @click="saveProject"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Tags Dialog -->
    <q-dialog
      v-model="showTagsDialog"
      persistent
    >
      <q-card style="width: min(450px, 90vw)">
        <q-card-section class="row items-center">
          <div class="text-h6">
            Edit Project Tags
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <!-- Current Tags -->
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">
              Current Tags
            </div>
            <div
              v-if="editingTags.length === 0"
              class="text-grey-6 text-caption"
            >
              No tags yet. Add one below.
            </div>
            <div
              v-else
              class="q-gutter-xs"
            >
              <q-chip
                v-for="(tag, index) in editingTags"
                :key="tag.name"
                :color="tag.color"
                text-color="white"
                removable
                @remove="removeTag(index)"
              >
                {{ tag.name }}
              </q-chip>
            </div>
          </div>

          <q-separator class="q-mb-md" />

          <!-- Add New Tag -->
          <div class="text-subtitle2 q-mb-sm">
            Add New Tag
          </div>
          <div class="row q-col-gutter-sm items-end">
            <div class="col-7">
              <q-input
                v-model="newTagName"
                label="Tag name"
                outlined
                dense
                maxlength="50"
                @keyup.enter="addTag"
              />
            </div>
            <div class="col-3">
              <q-select
                v-model="newTagColor"
                :options="tagColorOptions"
                label="Color"
                outlined
                dense
                emit-value
                map-options
              >
                <template #option="{ opt, itemProps }">
                  <q-item v-bind="itemProps">
                    <q-item-section avatar>
                      <q-badge
                        :color="opt.value"
                        class="q-pa-xs"
                      />
                    </q-item-section>
                    <q-item-section>{{ opt.label }}</q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
            <div class="col-2">
              <q-btn
                color="primary"
                icon="add"
                dense
                :disable="!newTagName.trim()"
                @click="addTag"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="primary"
            label="Save Tags"
            :loading="savingTags"
            @click="saveTags"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Todo Dialog -->
    <q-dialog
      v-model="showTodoDialog"
      persistent
    >
      <q-card style="width: min(400px, 90vw)">
        <q-card-section class="row items-center">
          <div class="text-h6">
            {{ editingTodo ? 'Edit Todo' : 'Add Todo' }}
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="todoForm.title"
            label="Title"
            outlined
            :rules="[val => !!val || 'Title is required']"
            class="q-mb-md"
          />
          <q-input
            v-model="todoForm.description"
            label="Description"
            outlined
            type="textarea"
            rows="2"
            class="q-mb-md"
          />
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6">
              <q-select
                v-model="todoForm.status"
                :options="todoStatusOptions"
                label="Status"
                outlined
                emit-value
                map-options
              >
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-icon
                        :name="scope.opt.icon"
                        :color="scope.opt.color"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template #selected-item="scope">
                  <q-icon
                    :name="getTodoStatusIcon(scope.opt.value)"
                    :color="getTodoStatusColor(scope.opt.value)"
                    class="q-mr-sm"
                  />
                  {{ scope.opt.label }}
                </template>
              </q-select>
            </div>
            <div class="col-6">
              <q-select
                v-model="todoForm.priority"
                :options="priorityOptions"
                label="Priority"
                outlined
                emit-value
                map-options
              >
                <template #option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar>
                      <q-icon
                        :name="getPriorityIcon(scope.opt.value)"
                        :color="getPriorityColor(scope.opt.value)"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
                <template #selected-item="scope">
                  <q-icon
                    :name="getPriorityIcon(scope.opt.value)"
                    :color="getPriorityColor(scope.opt.value)"
                    class="q-mr-sm"
                  />
                  {{ scope.opt.label }}
                </template>
              </q-select>
            </div>
          </div>
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6">
              <q-input
                v-model="todoForm.dueDate"
                label="Due Date"
                outlined
                type="date"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="todoForm.githubIssueNumber"
                label="GitHub Issue #"
                outlined
                type="number"
                :hint="project?.github_repo ? `Links to ${project.github_repo}` : 'No repo configured'"
              >
                <template #prepend>
                  <q-icon
                    name="bug_report"
                    color="blue"
                  />
                </template>
              </q-input>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
            @click="resetTodoForm"
          />
          <q-btn
            color="primary"
            label="Save"
            :loading="savingTodo"
            @click="saveTodo"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Milestone Dialog -->
    <q-dialog
      v-model="showMilestoneDialog"
      persistent
    >
      <q-card style="width: min(400px, 90vw)">
        <q-card-section class="row items-center">
          <div class="text-h6">
            {{ editingMilestone ? 'Edit Milestone' : 'Add Milestone' }}
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="milestoneForm.title"
            label="Title"
            outlined
            :rules="[val => !!val || 'Title is required']"
            class="q-mb-md"
          />
          <q-input
            v-model="milestoneForm.description"
            label="Description"
            outlined
            type="textarea"
            rows="2"
            class="q-mb-md"
          />
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input
                v-model="milestoneForm.targetDate"
                label="Target Date"
                outlined
                type="date"
              />
            </div>
            <div class="col-6">
              <q-select
                v-model="milestoneForm.status"
                :options="['upcoming', 'in_progress', 'completed', 'missed']"
                label="Status"
                outlined
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
            @click="resetMilestoneForm"
          />
          <q-btn
            color="primary"
            label="Save"
            :loading="savingMilestone"
            @click="saveMilestone"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- GitHub Link Dialog -->
    <q-dialog
      v-model="showGitHubLinkDialog"
      persistent
    >
      <q-card style="width: min(400px, 90vw)">
        <q-card-section class="row items-center">
          <q-icon
            name="link"
            size="sm"
            class="q-mr-sm"
          />
          <div class="text-h6">
            Link to GitHub
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <q-banner
            v-if="!project?.github_repo"
            class="bg-warning-1 text-warning-10 q-mb-md"
            rounded
            dense
          >
            <template #avatar>
              <q-icon
                name="warning"
                color="warning"
              />
            </template>
            No GitHub repository is configured for this project.
            Go to Settings tab to add one.
          </q-banner>

          <q-input
            v-model.number="gitHubLinkForm.issueNumber"
            label="Issue Number"
            outlined
            type="number"
            :prefix="project?.github_repo ? '#' : ''"
            hint="Enter the GitHub issue number (e.g., 42)"
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon
                name="bug_report"
                color="blue"
              />
            </template>
            <template
              v-if="gitHubLinkForm.issueNumber && project?.github_repo"
              #append
            >
              <q-btn
                flat
                round
                dense
                icon="open_in_new"
                @click="openGitHubLink(`https://github.com/${project.github_repo}/issues/${gitHubLinkForm.issueNumber}`)"
              >
                <q-tooltip>Preview link</q-tooltip>
              </q-btn>
            </template>
          </q-input>

          <q-input
            v-model.number="gitHubLinkForm.prNumber"
            label="Pull Request Number (optional)"
            outlined
            type="number"
            :prefix="project?.github_repo ? 'PR #' : ''"
            hint="Enter the GitHub PR number if this todo has an associated PR"
          >
            <template #prepend>
              <q-icon
                name="merge_type"
                color="purple"
              />
            </template>
            <template
              v-if="gitHubLinkForm.prNumber && project?.github_repo"
              #append
            >
              <q-btn
                flat
                round
                dense
                icon="open_in_new"
                @click="openGitHubLink(`https://github.com/${project.github_repo}/pull/${gitHubLinkForm.prNumber}`)"
              >
                <q-tooltip>Preview link</q-tooltip>
              </q-btn>
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            v-if="gitHubLinkForm.issueNumber || gitHubLinkForm.prNumber"
            flat
            color="negative"
            label="Remove Links"
            @click="gitHubLinkForm.issueNumber = null; gitHubLinkForm.prNumber = null"
          />
          <q-btn
            color="primary"
            label="Save"
            @click="saveGitHubLink"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Marketing Plan Dialog -->
    <q-dialog
      v-model="showMarketingDialog"
      persistent
    >
      <q-card style="width: min(500px, 90vw)">
        <q-card-section class="row items-center">
          <div class="text-h6">
            {{ editingMarketingPlan ? 'Edit Marketing Plan' : 'Add Marketing Plan' }}
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="marketingForm.title"
            label="Title"
            outlined
            :rules="[val => !!val || 'Title is required']"
            class="q-mb-md"
          />
          <q-input
            v-model.number="marketingForm.budget"
            label="Budget"
            outlined
            type="number"
            prefix="$"
            class="q-mb-md"
          />
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-6">
              <q-input
                v-model="marketingForm.startDate"
                label="Start Date"
                outlined
                type="date"
              />
            </div>
            <div class="col-6">
              <q-input
                v-model="marketingForm.endDate"
                label="End Date"
                outlined
                type="date"
              />
            </div>
          </div>
          <q-select
            v-model="marketingForm.status"
            :options="['draft', 'active', 'completed']"
            label="Status"
            outlined
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
            @click="resetMarketingForm"
          />
          <q-btn
            color="primary"
            label="Save"
            :loading="savingMarketing"
            @click="saveMarketingPlan"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirmation Dialog -->
    <q-dialog v-model="showDeleteDialog">
      <q-card style="min-width: 350px">
        <q-card-section class="row items-center">
          <q-avatar
            icon="warning"
            color="negative"
            text-color="white"
          />
          <span class="q-ml-sm text-h6">Delete Project</span>
        </q-card-section>

        <q-card-section>
          Are you sure you want to delete <strong>{{ project?.name }}</strong>?
          This will also delete all todos, milestones, and marketing plans.
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="negative"
            label="Delete"
            :loading="deleting"
            @click="confirmDelete"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Upload Document Dialog -->
    <q-dialog v-model="showUploadDialog">
      <q-card style="min-width: 450px">
        <q-card-section class="row items-center">
          <q-avatar
            icon="upload_file"
            color="primary"
            text-color="white"
          />
          <span class="q-ml-sm text-h6">Upload Document</span>
        </q-card-section>

        <q-card-section>
          <p class="text-grey-7">
            Upload text files, PDFs, markdown, or other documents to index in RAG for AI-powered Q&A.
          </p>

          <q-file
            v-model="uploadFile"
            label="Select document"
            filled
            counter
            max-file-size="10485760"
            accept=".txt,.pdf,.md,.markdown,.doc,.docx,.json,.csv"
            @rejected="onFileRejected"
          >
            <template #prepend>
              <q-icon name="attach_file" />
            </template>
            <template #hint>
              Max 10MB. Allowed: txt, pdf, md, markdown, doc, docx, json, csv
            </template>
          </q-file>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="primary"
            label="Upload"
            :loading="uploadingDocument"
            :disable="!uploadFile"
            @click="handleUpload"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Invite Member Dialog -->
    <q-dialog
      v-model="showInviteDialog"
      persistent
    >
      <q-card style="width: min(450px, 90vw)">
        <q-card-section class="row items-center">
          <q-avatar
            icon="person_add"
            color="primary"
            text-color="white"
          />
          <span class="q-ml-sm text-h6">Invite Team Member</span>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <q-input
            v-model="inviteEmail"
            label="Email Address"
            outlined
            dense
            type="email"
            :rules="[val => !!val || 'Email is required', val => /.+@.+\..+/.test(val) || 'Invalid email']"
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="email" />
            </template>
          </q-input>

          <q-select
            v-model="inviteRole"
            :options="roleOptions"
            label="Role"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="badge" />
            </template>
          </q-select>

          <div class="text-caption text-grey-7">
            The user will receive an invitation link valid for 7 days. They must create an account or sign in to accept.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
            @click="resetInviteForm"
          />
          <q-btn
            color="primary"
            label="Send Invitation"
            icon-right="send"
            :loading="sendingInvite"
            :disable="!inviteEmail || !/.+@.+\..+/.test(inviteEmail)"
            @click="sendInvitation"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Member Profile Edit Dialog -->
    <q-dialog v-model="showProfileDialog" persistent>
      <q-card style="min-width: 500px; max-width: 90vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">
            Edit Member Profile
          </div>
          <q-space />
          <q-btn
            v-close-popup
            icon="close"
            flat
            round
            dense
          />
        </q-card-section>

        <q-card-section>
          <div v-if="editingMember" class="q-mb-md">
            <div class="row items-center q-gutter-sm">
              <q-avatar
                :color="getAvailabilityColor(editingMember.profile?.availability)"
                text-color="white"
                size="40px"
              >
                {{ getMemberInitials(editingMember) }}
              </q-avatar>
              <div>
                <div class="text-weight-medium">{{ getMemberDisplayName(editingMember) }}</div>
                <div class="text-caption text-grey">{{ editingMember.user?.email }}</div>
              </div>
            </div>
          </div>

          <!-- Role Title -->
          <q-input
            v-model="profileForm.roleTitle"
            label="Role Title"
            outlined
            dense
            class="q-mb-md"
            placeholder="e.g., Lead Developer, Marketing Manager"
            hint="Your job title or role in this project"
          />

          <!-- Skills -->
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Skills</div>
            <div class="row q-gutter-sm q-mb-sm">
              <q-chip
                v-for="skill in profileForm.skills"
                :key="skill"
                removable
                color="primary"
                text-color="white"
                @remove="removeSkill(skill)"
              >
                {{ skill }}
              </q-chip>
            </div>
            <q-input
              v-model="newSkill"
              outlined
              dense
              placeholder="Add a skill (press Enter)"
              @keyup.enter="addSkill"
            >
              <template #append>
                <q-btn
                  flat
                  dense
                  icon="add"
                  :disable="!newSkill.trim()"
                  @click="addSkill"
                />
              </template>
            </q-input>
          </div>

          <!-- Expertise Areas -->
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Expertise Areas</div>
            <div class="row q-gutter-sm">
              <q-chip
                v-for="area in expertiseAreaOptions"
                :key="area"
                clickable
                :outline="!profileForm.expertiseAreas.includes(area)"
                :color="profileForm.expertiseAreas.includes(area) ? 'primary' : 'grey-4'"
                :text-color="profileForm.expertiseAreas.includes(area) ? 'white' : 'grey-8'"
                @click="
                  profileForm.expertiseAreas.includes(area)
                    ? profileForm.expertiseAreas = profileForm.expertiseAreas.filter(a => a !== area)
                    : profileForm.expertiseAreas.push(area)
                "
              >
                {{ area }}
              </q-chip>
            </div>
          </div>

          <!-- Availability & Capacity -->
          <div class="row q-gutter-md q-mb-md">
            <div class="col">
              <div class="text-subtitle2 q-mb-sm">Availability</div>
              <q-btn-toggle
                v-model="profileForm.availability"
                spread
                no-caps
                :options="availabilityOptions"
                toggle-color="primary"
              />
            </div>
            <div class="col">
              <div class="text-subtitle2 q-mb-sm">
                Capacity: {{ profileForm.capacityPercent }}%
              </div>
              <q-slider
                v-model="profileForm.capacityPercent"
                :min="0"
                :max="100"
                :step="10"
                label
                label-always
                color="primary"
              />
            </div>
          </div>

          <!-- Preferred Task Types -->
          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm">Preferred Task Types</div>
            <div class="row q-gutter-sm">
              <q-chip
                v-for="taskType in taskTypeOptions"
                :key="taskType"
                clickable
                :outline="!profileForm.preferredTaskTypes.includes(taskType)"
                :color="profileForm.preferredTaskTypes.includes(taskType) ? 'secondary' : 'grey-4'"
                :text-color="profileForm.preferredTaskTypes.includes(taskType) ? 'white' : 'grey-8'"
                @click="
                  profileForm.preferredTaskTypes.includes(taskType)
                    ? profileForm.preferredTaskTypes = profileForm.preferredTaskTypes.filter(t => t !== taskType)
                    : profileForm.preferredTaskTypes.push(taskType)
                "
              >
                {{ taskType }}
              </q-chip>
            </div>
          </div>

          <!-- Bio -->
          <q-input
            v-model="profileForm.bio"
            label="Short Bio"
            outlined
            type="textarea"
            rows="3"
            placeholder="Tell the team a bit about yourself..."
            hint="Optional: A brief description that helps AI understand your background"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            v-close-popup
            flat
            label="Cancel"
          />
          <q-btn
            color="primary"
            label="Save Profile"
            :loading="savingProfile"
            @click="saveProfile"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
/**
 * @component ProjectDetailPage
 * @description Detailed project view with tabs for todos, milestones, marketing plans, and AI assistant.
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useProjectsStore } from '@/stores/projects'
// COMMUNITY: Copilot store and service removed (PRO feature)
import { useAuthStore } from '@/stores/auth'
import { useGamificationStore } from '@/stores/gamification'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'
import type { Project, Todo, Milestone, MarketingPlan, ProjectStatus, TodoStatus, TodoPriority, MilestoneStatus, MarketingPlanStatus, ProjectTag, TagColor } from '@/services/api'
import GamificationStats from '@/components/gamification/GamificationStats.vue'
import SprintCard from '@/components/gamification/SprintCard.vue'
import ProjectLeaderboard from '@/components/gamification/ProjectLeaderboard.vue'
import AchievementBadge from '@/components/gamification/AchievementBadge.vue'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const projectsStore = useProjectsStore()
// COMMUNITY: copilotStore removed (PRO feature)
const authStore = useAuthStore()
const gamificationStore = useGamificationStore()

// State
const loading = ref(true)
const error = ref(false)
const activeTab = ref('todos')
const todoFilter = ref<TodoStatus | 'all'>('all')
const milestoneFilter = ref<MilestoneStatus | 'all'>('all')

// Dialogs
const showEditDialog = ref(false)
const showDeleteDialog = ref(false)
const showTodoDialog = ref(false)
const showMilestoneDialog = ref(false)
const showMarketingDialog = ref(false)
const showInviteDialog = ref(false)
const showTagsDialog = ref(false)

// Tags editing
const editingTags = ref<ProjectTag[]>([])
const newTagName = ref('')
const newTagColor = ref<TagColor>('primary')
const savingTags = ref(false)

/** Color options for tag selector */
const tagColorOptions = [
  { label: 'Blue', value: 'primary' },
  { label: 'Purple', value: 'secondary' },
  { label: 'Pink', value: 'accent' },
  { label: 'Green', value: 'positive' },
  { label: 'Red', value: 'negative' },
  { label: 'Cyan', value: 'info' },
  { label: 'Orange', value: 'warning' },
  { label: 'Dark', value: 'dark' },
  { label: 'Grey', value: 'grey' }
]

// Form states
const saving = ref(false)
const deleting = ref(false)
const savingTodo = ref(false)
const savingMilestone = ref(false)
const savingMarketing = ref(false)
const suggestingTodos = ref(false)
const suggestingMilestones = ref(false)
const generatingPlan = ref(false)

// Editing items
const editingTodo = ref<Todo | null>(null)
const editingMilestone = ref<Milestone | null>(null)
const editingMarketingPlan = ref<MarketingPlan | null>(null)

// Chat
const chatMessages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const chatInput = ref('')

// Documents
const documents = ref<any[]>([])
const documentsLoading = ref(false)
const showUploadDialog = ref(false)
const uploadingDocument = ref(false)
const uploadFile = ref<File | null>(null)

// Team Management
const teamMembers = ref<any[]>([])
const pendingInvitations = ref<any[]>([])
const teamMembersLoading = ref(false)
const inviteEmail = ref('')
const inviteRole = ref('member')
const sendingInvite = ref(false)

// Member Profile Editing
const showProfileDialog = ref(false)
const editingMember = ref<any>(null)
const savingProfile = ref(false)
const profileForm = ref({
  roleTitle: '',
  skills: [] as string[],
  expertiseAreas: [] as string[],
  availability: 'available' as 'available' | 'busy' | 'away',
  capacityPercent: 100,
  preferredTaskTypes: [] as string[],
  bio: ''
})
const newSkill = ref('')

// Predefined options for profile fields
const availabilityOptions = [
  { label: 'Available', value: 'available', color: 'positive' },
  { label: 'Busy', value: 'busy', color: 'warning' },
  { label: 'Away', value: 'away', color: 'grey' }
]
const expertiseAreaOptions = [
  'Frontend', 'Backend', 'Full Stack', 'DevOps', 'Design', 'Marketing',
  'SEO', 'Content', 'Research', 'Data Analysis', 'Project Management'
]
const taskTypeOptions = [
  'Development', 'Code Review', 'Testing', 'Documentation', 'Design',
  'Content Writing', 'Marketing', 'Research', 'Planning', 'Support'
]

// GitHub Integration
const useGlobalPAT = ref(true)
const globalGitHubIntegration = ref<{
  username: string
  avatarUrl: string | null
  patHint: string
  isValid: boolean
} | null>(null)
const loadingGlobalGitHub = ref(false)
const githubPATInput = ref('')
const githubRepoInput = ref('')
const githubDefaultBranch = ref('main')
const githubSyncEnabled = ref(true)
const githubSyncIssues = ref(true)
const githubSyncPRs = ref(true)
const linkingGithub = ref(false)
const syncingGithub = ref(false)
const githubIssues = ref<any[]>([])
const githubPRs = ref<any[]>([])
const loadingIssues = ref(false)
const loadingPRs = ref(false)

interface ProjectDocument {
  id: string
  project_id: string
  filename: string
  file_type: string
  file_size: number
  file_hash: string
  rag_indexed: boolean
  rag_collection?: string
  date_created: string
  date_updated: string
}
const chatLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

// Forms
const editForm = ref({
  name: '',
  description: '',
  status: 'active' as ProjectStatus
})

const todoForm = ref({
  title: '',
  description: '',
  status: 'pending' as TodoStatus,
  priority: 'medium' as TodoPriority,
  dueDate: '',
  githubIssueNumber: null as number | null,
})

// Todo status options for dropdown
const todoStatusOptions = [
  { label: 'To Do', value: 'pending', icon: 'radio_button_unchecked', color: 'grey' },
  { label: 'In Progress', value: 'in_progress', icon: 'pending', color: 'blue' },
  { label: 'In Review', value: 'review', icon: 'rate_review', color: 'purple' },
  { label: 'Blocked', value: 'blocked', icon: 'block', color: 'red' },
  { label: 'Completed', value: 'completed', icon: 'check_circle', color: 'green' },
  { label: 'Cancelled', value: 'cancelled', icon: 'cancel', color: 'grey' },
]

// Priority options for dropdown
const priorityOptions = [
  { label: 'Low', value: 'low', icon: 'arrow_downward', color: 'grey' },
  { label: 'Medium', value: 'medium', icon: 'remove', color: 'info' },
  { label: 'High', value: 'high', icon: 'arrow_upward', color: 'warning' },
  { label: 'Urgent', value: 'urgent', icon: 'priority_high', color: 'negative' },
]

// Milestone status options for dropdown
const milestoneStatusOptions = [
  { label: 'Upcoming', value: 'upcoming' as MilestoneStatus, icon: 'schedule', color: 'grey' },
  { label: 'In Progress', value: 'in_progress' as MilestoneStatus, icon: 'play_circle', color: 'primary' },
  { label: 'Completed', value: 'completed' as MilestoneStatus, icon: 'check_circle', color: 'positive' },
  { label: 'Missed', value: 'missed' as MilestoneStatus, icon: 'cancel', color: 'negative' },
]

const milestoneForm = ref({
  title: '',
  description: '',
  targetDate: '',
  status: 'upcoming' as MilestoneStatus
})

const marketingForm = ref({
  title: '',
  budget: 0,
  startDate: '',
  endDate: '',
  status: 'draft' as MarketingPlanStatus
})

// Computed
const project = computed(() => projectsStore.currentProject)
const todos = computed(() => projectsStore.todos)
const milestones = computed(() => projectsStore.milestones)
const marketingPlans = computed(() => projectsStore.marketingPlans)

// Check if user is a guest
const isGuestUser = computed(() => {
  return authStore.user?.isGuest === true
})

const filteredTodos = computed(() => {
  if (todoFilter.value === 'all') return todos.value
  return todos.value.filter(t => t.status === todoFilter.value)
})

const sortedMilestones = computed(() => {
  return [...milestones.value].sort((a, b) => {
    if (!a.targetDate) return 1
    if (!b.targetDate) return -1
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  })
})

// Filtered milestones based on status filter
const filteredMilestones = computed(() => {
  if (milestoneFilter.value === 'all') {
    return sortedMilestones.value
  }
  return sortedMilestones.value.filter(m => m.status === milestoneFilter.value)
})

// Milestone statistics
const milestoneStats = computed(() => {
  const now = new Date()
  return {
    upcoming: milestones.value.filter(m => m.status === 'upcoming').length,
    inProgress: milestones.value.filter(m => m.status === 'in_progress').length,
    completed: milestones.value.filter(m => m.status === 'completed').length,
    missed: milestones.value.filter(m => m.status === 'missed').length,
    overdue: milestones.value.filter(m => {
      if (!m.targetDate || m.status === 'completed' || m.status === 'missed') return false
      return new Date(m.targetDate) < now
    }).length,
  }
})

const todoStats = computed(() => {
  const total = todos.value.length
  const completed = todos.value.filter(t => t.status === 'completed').length
  const inProgress = todos.value.filter(t => t.status === 'in_progress').length
  return { total, completed, inProgress }
})

const progressPercent = computed(() => {
  if (todoStats.value.total === 0) return 0
  return (todoStats.value.completed / todoStats.value.total) * 100
})

const githubLinked = computed(() => {
  return !!project.value?.github_repo
})

// Helper functions
function getStatusColor(status: ProjectStatus): string {
  switch (status) {
    case 'active': return 'primary'
    case 'completed': return 'positive'
    case 'archived': return 'grey'
    default: return 'grey'
  }
}

function getPriorityColor(priority: TodoPriority): string {
  switch (priority) {
    case 'urgent': return 'negative'
    case 'high': return 'warning'
    case 'medium': return 'info'
    case 'low': return 'grey'
    default: return 'grey'
  }
}

// Priority icons - using flag/arrow indicators
function getPriorityIcon(priority: TodoPriority): string {
  switch (priority) {
    case 'urgent': return 'priority_high'  // Double exclamation
    case 'high': return 'arrow_upward'     // Up arrow
    case 'medium': return 'remove'         // Horizontal line (neutral)
    case 'low': return 'arrow_downward'    // Down arrow
    default: return 'remove'
  }
}

function getPriorityLabel(priority: TodoPriority): string {
  switch (priority) {
    case 'urgent': return 'Urgent'
    case 'high': return 'High'
    case 'medium': return 'Medium'
    case 'low': return 'Low'
    default: return priority
  }
}

// Todo status icons matching GitHub issues
function getTodoStatusIcon(status: TodoStatus): string {
  switch (status) {
    case 'pending': return 'radio_button_unchecked'
    case 'in_progress': return 'pending'
    case 'review': return 'rate_review'
    case 'blocked': return 'block'
    case 'completed': return 'check_circle'
    case 'cancelled': return 'cancel'
    default: return 'radio_button_unchecked'
  }
}

function getTodoStatusColor(status: TodoStatus): string {
  switch (status) {
    case 'pending': return 'grey'
    case 'in_progress': return 'blue'
    case 'review': return 'purple'
    case 'blocked': return 'red'
    case 'completed': return 'green'
    case 'cancelled': return 'grey-6'
    default: return 'grey'
  }
}

function getTodoStatusLabel(status: TodoStatus): string {
  switch (status) {
    case 'pending': return 'To Do'
    case 'in_progress': return 'In Progress'
    case 'review': return 'In Review'
    case 'blocked': return 'Blocked'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

function getTodoTitleClass(status: TodoStatus): string {
  if (status === 'completed') return 'text-strike text-grey-6'
  if (status === 'cancelled') return 'text-strike text-grey-5'
  if (status === 'blocked') return 'text-red-8'
  return ''
}

// Todo filter options with icons
const todoFilterOptions = [
  { label: 'All', value: 'all', icon: 'list' },
  { label: 'To Do', value: 'pending', icon: 'radio_button_unchecked' },
  { label: 'In Progress', value: 'in_progress', icon: 'pending' },
  { label: 'Review', value: 'review', icon: 'rate_review' },
  { label: 'Blocked', value: 'blocked', icon: 'block' },
  { label: 'Done', value: 'completed', icon: 'check_circle' },
]

// Status cycle order for clicking through statuses
const todoStatusCycle: TodoStatus[] = ['pending', 'in_progress', 'review', 'completed']

async function cycleTodoStatus(todo: Todo): Promise<void> {
  if (!project.value) return

  // If blocked or cancelled, just toggle to pending
  if (todo.status === 'blocked' || todo.status === 'cancelled') {
    try {
      await projectsStore.updateTodo(project.value.id, todo.id, { status: 'pending' })
    } catch {
      $q.notify({ type: 'negative', message: 'Failed to update todo status' })
    }
    return
  }

  // Find current index and move to next in cycle
  const currentIndex = todoStatusCycle.indexOf(todo.status)
  const nextIndex = (currentIndex + 1) % todoStatusCycle.length
  const newStatus = todoStatusCycle[nextIndex]

  try {
    await projectsStore.updateTodo(project.value.id, todo.id, { status: newStatus })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update todo status' })
  }
}

function openGitHubLink(url?: string): void {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// GitHub linking dialog state
const showGitHubLinkDialog = ref(false)
const gitHubLinkForm = ref({
  todoId: '',
  issueNumber: null as number | null,
  prNumber: null as number | null,
})

function linkTodoToGitHub(todo: Todo): void {
  gitHubLinkForm.value = {
    todoId: todo.id,
    issueNumber: todo.githubIssueNumber || null,
    prNumber: todo.githubPrNumber || null,
  }
  showGitHubLinkDialog.value = true
}

async function saveGitHubLink(): Promise<void> {
  if (!project.value || !gitHubLinkForm.value.todoId) return

  try {
    const updates: Partial<Todo> = {}

    // Build GitHub URLs from project's github_repo if available
    const repoBase = project.value.github_repo
      ? `https://github.com/${project.value.github_repo}`
      : null

    if (gitHubLinkForm.value.issueNumber) {
      updates.githubIssueNumber = gitHubLinkForm.value.issueNumber
      if (repoBase) {
        updates.githubIssueUrl = `${repoBase}/issues/${gitHubLinkForm.value.issueNumber}`
      }
    } else {
      updates.githubIssueNumber = undefined
      updates.githubIssueUrl = undefined
    }

    if (gitHubLinkForm.value.prNumber) {
      updates.githubPrNumber = gitHubLinkForm.value.prNumber
      if (repoBase) {
        updates.githubPrUrl = `${repoBase}/pull/${gitHubLinkForm.value.prNumber}`
      }
    } else {
      updates.githubPrNumber = undefined
      updates.githubPrUrl = undefined
    }

    await projectsStore.updateTodo(project.value.id, gitHubLinkForm.value.todoId, updates)
    showGitHubLinkDialog.value = false
    $q.notify({ type: 'positive', message: 'GitHub link updated' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update GitHub link' })
  }
}

function getMilestoneColor(status: MilestoneStatus): string {
  switch (status) {
    case 'completed': return 'positive'
    case 'in_progress': return 'primary'
    case 'missed': return 'negative'
    case 'upcoming': return 'grey'
    default: return 'grey'
  }
}

function getMilestoneIcon(status: MilestoneStatus): string {
  switch (status) {
    case 'completed': return 'check_circle'
    case 'in_progress': return 'play_circle'
    case 'missed': return 'cancel'
    case 'upcoming': return 'schedule'
    default: return 'flag'
  }
}

function getMilestoneLabel(status: MilestoneStatus): string {
  switch (status) {
    case 'completed': return 'Completed'
    case 'in_progress': return 'In Progress'
    case 'missed': return 'Missed'
    case 'upcoming': return 'Upcoming'
    default: return status
  }
}

function getMilestoneRisk(milestone: Milestone): 'overdue' | 'at_risk' | 'ok' {
  if (!milestone.targetDate || milestone.status === 'completed' || milestone.status === 'missed') {
    return 'ok'
  }
  const now = new Date()
  const target = new Date(milestone.targetDate)
  const daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysRemaining < 0) return 'overdue'
  if (daysRemaining <= 3) return 'at_risk'
  return 'ok'
}

function getMilestoneTimeRemaining(milestone: Milestone): string {
  if (!milestone.targetDate) return ''
  if (milestone.status === 'completed') return 'Done'
  if (milestone.status === 'missed') return 'Missed'

  const now = new Date()
  const target = new Date(milestone.targetDate)
  const daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysRemaining < 0) {
    const overdue = Math.abs(daysRemaining)
    return overdue === 1 ? '1 day overdue' : `${overdue} days overdue`
  }
  if (daysRemaining === 0) return 'Due today'
  if (daysRemaining === 1) return '1 day left'
  if (daysRemaining <= 7) return `${daysRemaining} days left`
  if (daysRemaining <= 30) {
    const weeks = Math.floor(daysRemaining / 7)
    return weeks === 1 ? '1 week left' : `${weeks} weeks left`
  }
  const months = Math.floor(daysRemaining / 30)
  return months === 1 ? '1 month left' : `${months} months left`
}

function getMilestoneDateClass(milestone: Milestone): string {
  const risk = getMilestoneRisk(milestone)
  if (risk === 'overdue') return 'text-red text-weight-medium'
  if (risk === 'at_risk') return 'text-orange text-weight-medium'
  return 'text-grey-7'
}

function getMilestoneProgress(milestone: Milestone): number {
  if (!milestone.targetDate) return 0
  if (milestone.status === 'completed') return 1
  if (milestone.status === 'missed') return 1

  const now = new Date()
  const target = new Date(milestone.targetDate)
  const created = new Date(milestone.createdAt)
  const totalTime = target.getTime() - created.getTime()
  const elapsedTime = now.getTime() - created.getTime()

  if (totalTime <= 0) return 1
  return Math.min(1, Math.max(0, elapsedTime / totalTime))
}

function getMilestoneProgressColor(milestone: Milestone): string {
  if (milestone.status === 'completed') return 'positive'
  if (milestone.status === 'missed') return 'negative'

  const risk = getMilestoneRisk(milestone)
  if (risk === 'overdue') return 'negative'
  if (risk === 'at_risk') return 'warning'
  return 'primary'
}

async function updateMilestoneStatus(milestone: Milestone, newStatus: MilestoneStatus): Promise<void> {
  if (!project.value) return
  try {
    await projectsStore.updateMilestone(project.value.id, milestone.id, { status: newStatus })
    $q.notify({ type: 'positive', message: `Milestone marked as ${getMilestoneLabel(newStatus)}` })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update milestone status' })
  }
}

function getPlanStatusColor(status: MarketingPlanStatus): string {
  switch (status) {
    case 'active': return 'primary'
    case 'completed': return 'positive'
    case 'draft': return 'grey'
    default: return 'grey'
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not set'
  return new Date(dateStr).toLocaleDateString()
}

function getLinkTypeDescription(linkSources: any[], issueNum: number): string {
  if (!linkSources || !Array.isArray(linkSources)) return ''
  const link = linkSources.find((l: any) => l.issue === issueNum)
  if (!link) return ''

  const typeLabels: Record<string, string> = {
    'branch': 'Linked from branch name',
    'title_closes': 'Closes (from title)',
    'title': 'Mentioned in title',
    'body_closes': 'Closes (from body)',
    'body_reference': 'Referenced in body',
    'body_mention': 'Mentioned in body',
    'closes': 'Closes issue',
    'reference': 'References issue',
    'mention': 'Mentions issue'
  }

  return typeLabels[link.type] || `Linked via ${link.type}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string): string {
  switch (fileType.toLowerCase()) {
    case 'pdf': return 'picture_as_pdf'
    case 'md':
    case 'markdown': return 'article'
    case 'txt': return 'description'
    case 'doc':
    case 'docx': return 'description'
    case 'json': return 'code'
    case 'csv': return 'table_chart'
    default: return 'insert_drive_file'
  }
}

function getRoleColor(role: string): string {
  switch (role) {
    case 'owner': return 'deep-purple'
    case 'admin': return 'primary'
    case 'member': return 'info'
    case 'viewer': return 'grey'
    default: return 'grey'
  }
}

function getAvailabilityColor(availability?: string): string {
  switch (availability) {
    case 'available': return 'positive'
    case 'busy': return 'warning'
    case 'away': return 'grey'
    default: return 'positive'
  }
}

function getMemberDisplayName(member: any): string {
  if (member.user?.first_name && member.user?.last_name) {
    return `${member.user.first_name} ${member.user.last_name}`
  }
  return member.user?.email?.split('@')[0] || 'Unknown'
}

function getMemberInitials(member: any): string {
  if (member.user?.first_name && member.user?.last_name) {
    return `${member.user.first_name[0]}${member.user.last_name[0]}`.toUpperCase()
  }
  return member.user?.email?.charAt(0).toUpperCase() || '?'
}

/**
 * Open profile edit dialog for a team member
 */
function editMemberProfile(member: any): void {
  editingMember.value = member
  // Pre-populate form with existing profile data
  const profile = member.profile || {}
  profileForm.value = {
    roleTitle: profile.roleTitle || '',
    skills: [...(profile.skills || [])],
    expertiseAreas: [...(profile.expertiseAreas || [])],
    availability: profile.availability || 'available',
    capacityPercent: profile.capacityPercent ?? 100,
    preferredTaskTypes: [...(profile.preferredTaskTypes || [])],
    bio: profile.bio || ''
  }
  newSkill.value = ''
  showProfileDialog.value = true
}

/**
 * Add a skill to the profile form
 */
function addSkill(): void {
  const skill = newSkill.value.trim()
  if (skill && !profileForm.value.skills.includes(skill)) {
    profileForm.value.skills.push(skill)
  }
  newSkill.value = ''
}

/**
 * Remove a skill from the profile form
 */
function removeSkill(skill: string): void {
  profileForm.value.skills = profileForm.value.skills.filter(s => s !== skill)
}

/**
 * Save member profile to the API
 */
async function saveProfile(): Promise<void> {
  if (!project.value || !editingMember.value) return

  savingProfile.value = true
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/members/${editingMember.value.id}/profile`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(profileForm.value)
      }
    )

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Profile updated successfully' })
      showProfileDialog.value = false
      editingMember.value = null
      // Refresh team members to show updated profile
      await fetchTeamMembers()
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Failed to update profile')
    }
  } catch (error: any) {
    logError('Failed to save profile:', error)
    $q.notify({ type: 'negative', message: error.message || 'Failed to update profile' })
  } finally {
    savingProfile.value = false
  }
}

// Role options for invite dropdown
const roleOptions = [
  { label: 'Admin', value: 'admin', description: 'Can manage project settings and team' },
  { label: 'Member', value: 'member', description: 'Can view and edit project content' },
  { label: 'Viewer', value: 'viewer', description: 'Read-only access' }
]

// Project actions
async function saveProject(): Promise<void> {
  if (!project.value || !editForm.value.name.trim()) return

  saving.value = true
  try {
    await projectsStore.updateProject(project.value.id, editForm.value)
    showEditDialog.value = false
    $q.notify({ type: 'positive', message: 'Project updated' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update project' })
  } finally {
    saving.value = false
  }
}

async function archiveProject(): Promise<void> {
  if (!project.value) return
  try {
    await projectsStore.updateProject(project.value.id, { status: 'archived' })
    $q.notify({ type: 'positive', message: 'Project archived' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to archive project' })
  }
}

async function confirmDelete(): Promise<void> {
  if (!project.value) return

  deleting.value = true
  try {
    await projectsStore.deleteProject(project.value.id)
    router.push({ name: 'projects' })
    $q.notify({ type: 'positive', message: 'Project deleted' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to delete project' })
  } finally {
    deleting.value = false
  }
}

// Tag actions
function editTags(): void {
  if (!project.value) return
  editingTags.value = [...(project.value.tags || [])]
  newTagName.value = ''
  newTagColor.value = 'primary'
  showTagsDialog.value = true
}

function addTag(): void {
  const name = newTagName.value.trim().toLowerCase()
  if (!name) return

  // Check for duplicate
  if (editingTags.value.some(t => t.name === name)) {
    $q.notify({ type: 'warning', message: 'Tag already exists' })
    return
  }

  editingTags.value.push({ name, color: newTagColor.value })
  newTagName.value = ''
}

function removeTag(index: number): void {
  editingTags.value.splice(index, 1)
}

async function saveTags(): Promise<void> {
  if (!project.value) return

  savingTags.value = true
  try {
    await projectsStore.updateProject(project.value.id, { tags: editingTags.value })
    showTagsDialog.value = false
    $q.notify({ type: 'positive', message: 'Tags updated' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update tags' })
  } finally {
    savingTags.value = false
  }
}

// Todo actions
function editTodo(todo: Todo): void {
  editingTodo.value = todo
  todoForm.value = {
    title: todo.title,
    description: todo.description || '',
    status: todo.status,
    priority: todo.priority,
    dueDate: todo.dueDate ? todo.dueDate.split('T')[0] : '',
    githubIssueNumber: todo.githubIssueNumber || null,
  }
  showTodoDialog.value = true
}

function resetTodoForm(): void {
  editingTodo.value = null
  todoForm.value = {
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    dueDate: '',
    githubIssueNumber: null,
  }
}

async function saveTodo(): Promise<void> {
  if (!project.value || !todoForm.value.title.trim()) return

  savingTodo.value = true
  try {
    // Build todo data with GitHub URL if issue number provided
    const todoData: Partial<Todo> & { title: string } = {
      title: todoForm.value.title,
      description: todoForm.value.description,
      status: todoForm.value.status,
      priority: todoForm.value.priority,
      dueDate: todoForm.value.dueDate || undefined,
    }

    // Add GitHub integration fields
    if (todoForm.value.githubIssueNumber) {
      todoData.githubIssueNumber = todoForm.value.githubIssueNumber
      if (project.value.github_repo) {
        todoData.githubIssueUrl = `https://github.com/${project.value.github_repo}/issues/${todoForm.value.githubIssueNumber}`
      }
    } else {
      todoData.githubIssueNumber = undefined
      todoData.githubIssueUrl = undefined
    }

    if (editingTodo.value) {
      await projectsStore.updateTodo(project.value.id, editingTodo.value.id, todoData)
    } else {
      await projectsStore.createTodo(project.value.id, todoData)
    }
    showTodoDialog.value = false
    resetTodoForm()
    $q.notify({ type: 'positive', message: editingTodo.value ? 'Todo updated' : 'Todo created' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save todo' })
  } finally {
    savingTodo.value = false
  }
}

async function toggleTodoStatus(todo: Todo): Promise<void> {
  if (!project.value) return
  const newStatus: TodoStatus = todo.status === 'completed' ? 'pending' : 'completed'
  try {
    await projectsStore.updateTodo(project.value.id, todo.id, { status: newStatus })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to update todo' })
  }
}

async function deleteTodo(todo: Todo): Promise<void> {
  if (!project.value) return
  try {
    await projectsStore.deleteTodo(project.value.id, todo.id)
    $q.notify({ type: 'positive', message: 'Todo deleted' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to delete todo' })
  }
}

async function suggestTodos(): Promise<void> {
  if (!project.value) return

  suggestingTodos.value = true
  try {
    const suggestions = await projectsStore.suggestTodos(project.value.id)
    if (suggestions && suggestions.length > 0) {
      $q.dialog({
        title: 'AI Todo Suggestions',
        message: 'Would you like to add these suggested todos?',
        html: true,
        options: {
          type: 'checkbox',
          model: suggestions,
          items: suggestions.map(s => ({ label: s, value: s }))
        },
        cancel: true,
        persistent: true
      }).onOk(async (selected: string[]) => {
        for (const title of selected) {
          await projectsStore.createTodo(project.value!.id, { title, priority: 'medium' })
        }
        $q.notify({ type: 'positive', message: `Added ${selected.length} todos` })
      })
    } else {
      $q.notify({ type: 'info', message: 'No suggestions available' })
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to get suggestions' })
  } finally {
    suggestingTodos.value = false
  }
}

// Milestone actions
function editMilestone(milestone: Milestone): void {
  editingMilestone.value = milestone
  milestoneForm.value = {
    title: milestone.title,
    description: milestone.description || '',
    targetDate: milestone.targetDate ? milestone.targetDate.split('T')[0] : '',
    status: milestone.status
  }
  showMilestoneDialog.value = true
}

function resetMilestoneForm(): void {
  editingMilestone.value = null
  milestoneForm.value = { title: '', description: '', targetDate: '', status: 'upcoming' }
}

async function saveMilestone(): Promise<void> {
  if (!project.value || !milestoneForm.value.title.trim()) return

  savingMilestone.value = true
  try {
    if (editingMilestone.value) {
      await projectsStore.updateMilestone(project.value.id, editingMilestone.value.id, milestoneForm.value)
    } else {
      await projectsStore.createMilestone(project.value.id, milestoneForm.value)
    }
    showMilestoneDialog.value = false
    resetMilestoneForm()
    $q.notify({ type: 'positive', message: editingMilestone.value ? 'Milestone updated' : 'Milestone created' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save milestone' })
  } finally {
    savingMilestone.value = false
  }
}

async function deleteMilestone(milestone: Milestone): Promise<void> {
  if (!project.value) return
  try {
    await projectsStore.deleteMilestone(project.value.id, milestone.id)
    $q.notify({ type: 'positive', message: 'Milestone deleted' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to delete milestone' })
  }
}

async function suggestMilestones(): Promise<void> {
  if (!project.value) return

  suggestingMilestones.value = true
  try {
    const suggestions = await projectsStore.suggestMilestones(project.value.id)
    if (suggestions && suggestions.length > 0) {
      $q.dialog({
        title: 'AI Milestone Suggestions',
        message: 'Would you like to add these suggested milestones?',
        options: {
          type: 'checkbox',
          model: suggestions,
          items: suggestions.map(s => ({ label: s, value: s }))
        },
        cancel: true,
        persistent: true
      }).onOk(async (selected: string[]) => {
        for (const title of selected) {
          await projectsStore.createMilestone(project.value!.id, { title })
        }
        $q.notify({ type: 'positive', message: `Added ${selected.length} milestones` })
      })
    } else {
      $q.notify({ type: 'info', message: 'No suggestions available' })
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to get suggestions' })
  } finally {
    suggestingMilestones.value = false
  }
}

// Marketing plan actions
function editMarketingPlan(plan: MarketingPlan): void {
  editingMarketingPlan.value = plan
  marketingForm.value = {
    title: plan.title,
    budget: plan.budget || 0,
    startDate: plan.startDate ? plan.startDate.split('T')[0] : '',
    endDate: plan.endDate ? plan.endDate.split('T')[0] : '',
    status: plan.status
  }
  showMarketingDialog.value = true
}

function resetMarketingForm(): void {
  editingMarketingPlan.value = null
  marketingForm.value = { title: '', budget: 0, startDate: '', endDate: '', status: 'draft' }
}

async function saveMarketingPlan(): Promise<void> {
  if (!project.value || !marketingForm.value.title.trim()) return

  savingMarketing.value = true
  try {
    if (editingMarketingPlan.value) {
      await projectsStore.updateMarketingPlan(project.value.id, editingMarketingPlan.value.id, marketingForm.value)
    } else {
      await projectsStore.createMarketingPlan(project.value.id, marketingForm.value)
    }
    showMarketingDialog.value = false
    resetMarketingForm()
    $q.notify({ type: 'positive', message: editingMarketingPlan.value ? 'Plan updated' : 'Plan created' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to save plan' })
  } finally {
    savingMarketing.value = false
  }
}

async function deleteMarketingPlan(plan: MarketingPlan): Promise<void> {
  if (!project.value) return
  try {
    await projectsStore.deleteMarketingPlan(project.value.id, plan.id)
    $q.notify({ type: 'positive', message: 'Plan deleted' })
  } catch {
    $q.notify({ type: 'negative', message: 'Failed to delete plan' })
  }
}

async function generateMarketingPlan(): Promise<void> {
  if (!project.value) return

  generatingPlan.value = true
  try {
    const goals = await new Promise<string>((resolve) => {
      $q.dialog({
        title: 'Generate Marketing Plan',
        message: 'Describe your marketing goals (optional):',
        prompt: {
          model: '',
          type: 'textarea'
        },
        cancel: true,
        persistent: true
      }).onOk((data: string) => resolve(data))
    })

    await projectsStore.generateMarketingPlan(project.value.id, goals)
    $q.notify({ type: 'positive', message: 'Marketing plan generated' })
  } catch {
    // Dialog was cancelled or failed
  } finally {
    generatingPlan.value = false
  }
}

// Document functions
async function fetchDocuments(): Promise<void> {
  if (!project.value) return

  documentsLoading.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/documents`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      documents.value = data.data || []
    } else {
      throw new Error('Failed to fetch documents')
    }
  } catch (error) {
    logError('Failed to fetch documents:', error)
    $q.notify({ type: 'negative', message: 'Failed to load documents' })
  } finally {
    documentsLoading.value = false
  }
}

async function uploadDocument(file: File): Promise<void> {
  if (!project.value) return

  uploadingDocument.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    })

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Document uploaded successfully' })
      await fetchDocuments()
      showUploadDialog.value = false
    } else {
      const error = await response.json()
      throw new Error(error.error?.message || 'Upload failed')
    }
  } catch (error: any) {
    logError('Failed to upload document:', error)
    $q.notify({ type: 'negative', message: error.message || 'Failed to upload document' })
  } finally {
    uploadingDocument.value = false
  }
}

async function deleteDocument(docId: string): Promise<void> {
  if (!project.value) return

  try {
    await $q.dialog({
      title: 'Delete Document',
      message: 'Are you sure you want to delete this document? This will also remove it from the RAG index.',
      cancel: true,
      persistent: false
    })

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/documents/${docId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Document deleted' })
      await fetchDocuments()
    } else {
      throw new Error('Delete failed')
    }
  } catch (error) {
    if (error !== undefined) {
      logError('Failed to delete document:', error)
      $q.notify({ type: 'negative', message: 'Failed to delete document' })
    }
  }
}

async function handleUpload(): Promise<void> {
  if (!uploadFile.value) return
  await uploadDocument(uploadFile.value)
  uploadFile.value = null
}

function onFileRejected(): void {
  $q.notify({
    type: 'negative',
    message: 'File rejected. Please check the file size and type.'
  })
}

// Team Management Functions
async function fetchTeamMembers(): Promise<void> {
  if (!project.value || isGuestUser.value) return

  teamMembersLoading.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/members`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      teamMembers.value = data.data || []
    } else {
      throw new Error('Failed to fetch team members')
    }
  } catch (error) {
    logError('Failed to fetch team members:', error)
    $q.notify({ type: 'negative', message: 'Failed to load team members' })
  } finally {
    teamMembersLoading.value = false
  }
}

async function fetchPendingInvitations(): Promise<void> {
  if (!project.value || isGuestUser.value) return

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/invitations`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      pendingInvitations.value = (data.data || []).filter((inv: any) => inv.status === 'pending')
    } else {
      throw new Error('Failed to fetch invitations')
    }
  } catch (error) {
    logError('Failed to fetch invitations:', error)
  }
}

async function sendInvitation(): Promise<void> {
  if (!project.value || !inviteEmail.value || isGuestUser.value) return

  sendingInvite.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/members/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        email: inviteEmail.value,
        role: inviteRole.value
      })
    })

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Invitation sent successfully' })
      showInviteDialog.value = false
      resetInviteForm()
      await fetchPendingInvitations()
    } else {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send invitation')
    }
  } catch (error: any) {
    logError('Failed to send invitation:', error)
    $q.notify({ type: 'negative', message: error.message || 'Failed to send invitation' })
  } finally {
    sendingInvite.value = false
  }
}

function resetInviteForm(): void {
  inviteEmail.value = ''
  inviteRole.value = 'member'
}

async function removeMember(member: any): Promise<void> {
  if (!project.value || isGuestUser.value) return

  try {
    await $q.dialog({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove ${member.user?.email} from this project?`,
      cancel: true,
      persistent: false
    })

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/members/${member.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Team member removed' })
      await fetchTeamMembers()
    } else {
      throw new Error('Failed to remove member')
    }
  } catch (error) {
    if (error !== undefined) {
      logError('Failed to remove member:', error)
      $q.notify({ type: 'negative', message: 'Failed to remove team member' })
    }
  }
}

async function changeRole(member: any): Promise<void> {
  if (!project.value || isGuestUser.value) return

  try {
    const newRole = await new Promise<string>((resolve, reject) => {
      $q.dialog({
        title: 'Change Role',
        message: `Select new role for ${member.user?.email}:`,
        options: {
          type: 'radio',
          model: member.role,
          items: roleOptions.map(r => ({ label: r.label, value: r.value }))
        },
        cancel: true,
        persistent: true
      }).onOk((data: string) => resolve(data))
        .onCancel(() => reject())
    })

    if (newRole === member.role) return

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/members/${member.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ role: newRole })
    })

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Role updated successfully' })
      await fetchTeamMembers()
    } else {
      throw new Error('Failed to update role')
    }
  } catch (error) {
    if (error !== undefined) {
      logError('Failed to change role:', error)
      $q.notify({ type: 'negative', message: 'Failed to update role' })
    }
  }
}

async function cancelInvitation(invitation: any): Promise<void> {
  if (!project.value || isGuestUser.value) return

  try {
    await $q.dialog({
      title: 'Cancel Invitation',
      message: `Are you sure you want to cancel the invitation for ${invitation.email}?`,
      cancel: true,
      persistent: false
    })

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/invitations/${invitation.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Invitation cancelled' })
      await fetchPendingInvitations()
    } else {
      throw new Error('Failed to cancel invitation')
    }
  } catch (error) {
    if (error !== undefined) {
      logError('Failed to cancel invitation:', error)
      $q.notify({ type: 'negative', message: 'Failed to cancel invitation' })
    }
  }
}

async function copyInviteLink(invitation: any): Promise<void> {
  // For now, just copy the token
  // In production, this would be a full URL like: https://app.synthstack.com/accept-invite?token=xxx
  const inviteUrl = `${window.location.origin}/accept-invite?token=${invitation.token}`

  try {
    await navigator.clipboard.writeText(inviteUrl)
    $q.notify({
      type: 'positive',
      message: 'Invitation link copied to clipboard',
      icon: 'content_copy'
    })
  } catch (error) {
    logError('Failed to copy link:', error)
    $q.notify({ type: 'negative', message: 'Failed to copy invitation link' })
  }
}

// GitHub Integration Functions
async function loadGlobalGitHubIntegration(): Promise<void> {
  loadingGlobalGitHub.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/integrations/github`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      globalGitHubIntegration.value = data.integration || null
    } else if (response.status === 404) {
      globalGitHubIntegration.value = null
    }
  } catch (error) {
    logError('Failed to load global GitHub integration:', error)
    globalGitHubIntegration.value = null
  } finally {
    loadingGlobalGitHub.value = false
  }
}

async function saveUseGlobalPAT(value: boolean): Promise<void> {
  if (!project.value) return

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/github/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ use_global_pat: value })
    })

    if (response.ok) {
      const data = await response.json()
      $q.notify({
        type: 'positive',
        message: data.message || (value ? 'Using global GitHub PAT' : 'Using project-specific PAT')
      })
      await loadProject()
    } else {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Failed to update setting')
    }
  } catch (error: any) {
    logError('Failed to save useGlobalPAT:', error)
    $q.notify({
      type: 'negative',
      message: error.message || 'Failed to update GitHub PAT setting'
    })
    // Revert the toggle
    useGlobalPAT.value = !value
  }
}

async function linkGithubRepo(): Promise<void> {
  if (!project.value || !githubRepoInput.value) return
  // If using project-specific PAT, require the PAT input
  if (!useGlobalPAT.value && !githubPATInput.value) return

  linkingGithub.value = true
  try {
    const payload: Record<string, any> = {
      repo: githubRepoInput.value,
      default_branch: githubDefaultBranch.value,
      sync_enabled: githubSyncEnabled.value,
      sync_issues: githubSyncIssues.value,
      sync_prs: githubSyncPRs.value,
      use_global_pat: useGlobalPAT.value
    }

    // Only include PAT if using project-specific PAT
    if (!useGlobalPAT.value && githubPATInput.value) {
      payload.pat = githubPATInput.value
    }

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/github/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const data = await response.json()
      $q.notify({
        type: 'positive',
        message: data.message || 'Repository linked successfully'
      })

      // Reload project to get updated data
      await loadProject()

      // Fetch issues and PRs if sync is enabled
      if (githubSyncEnabled.value) {
        await Promise.all([
          fetchGithubIssues(),
          fetchGithubPRs()
        ])
      }
    } else {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to link repository')
    }
  } catch (error: any) {
    logError('Failed to link GitHub repository:', error)
    $q.notify({
      type: 'negative',
      message: error.message || 'Failed to link repository. Make sure you have connected your GitHub account and have access to this repository.'
    })
  } finally {
    linkingGithub.value = false
  }
}

async function unlinkGithubRepo(): Promise<void> {
  if (!project.value) return

  try {
    await $q.dialog({
      title: 'Unlink GitHub Repository',
      message: 'Are you sure you want to unlink this repository? Cached issues and PRs will be removed.',
      cancel: true,
      persistent: false
    })

    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/github/unlink`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Repository unlinked successfully' })

      // Clear local data
      githubIssues.value = []
      githubPRs.value = []
      githubPATInput.value = ''
      githubRepoInput.value = ''

      // Reload project
      await loadProject()
    } else {
      throw new Error('Failed to unlink repository')
    }
  } catch (error) {
    if (error !== undefined) {
      logError('Failed to unlink repository:', error)
      $q.notify({ type: 'negative', message: 'Failed to unlink repository' })
    }
  }
}

async function syncGithubData(): Promise<void> {
  if (!project.value) return

  syncingGithub.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/github/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      $q.notify({ type: 'positive', message: 'Sync started successfully' })

      // Wait a moment for sync to complete
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Reload data
      await Promise.all([
        fetchGithubIssues(),
        fetchGithubPRs(),
        loadProject()
      ])
    } else {
      const error = await response.json()
      throw new Error(error.error?.message || 'Sync failed')
    }
  } catch (error: any) {
    logError('Failed to sync GitHub data:', error)
    $q.notify({ type: 'negative', message: error.message || 'Failed to sync GitHub data' })
  } finally {
    syncingGithub.value = false
  }
}

async function fetchGithubIssues(): Promise<void> {
  if (!project.value || !githubLinked.value) return

  loadingIssues.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/github/issues`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      githubIssues.value = data.data || []
    } else {
      throw new Error('Failed to fetch issues')
    }
  } catch (error) {
    logError('Failed to fetch GitHub issues:', error)
    $q.notify({ type: 'negative', message: 'Failed to load GitHub issues' })
  } finally {
    loadingIssues.value = false
  }
}

async function fetchGithubPRs(): Promise<void> {
  if (!project.value || !githubLinked.value) return

  loadingPRs.value = true
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/projects/${project.value.id}/github/prs`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    if (response.ok) {
      const data = await response.json()
      githubPRs.value = data.data || []
    } else {
      throw new Error('Failed to fetch pull requests')
    }
  } catch (error) {
    logError('Failed to fetch GitHub PRs:', error)
    $q.notify({ type: 'negative', message: 'Failed to load GitHub pull requests' })
  } finally {
    loadingPRs.value = false
  }
}

// COMMUNITY: Chat functions removed (PRO feature - AI Copilot not available)

// Reset demo session and reload todos
async function resetDemoSession(): Promise<void> {
  const projectId = route.params.id as string
  if (!projectId) return

  projectsStore.clearDemoSession()
  $q.notify({ type: 'info', message: 'Demo session reset, reloading todos...' })
  await projectsStore.fetchTodos(projectId)
}

// Load project data
async function loadProject(): Promise<void> {
  const projectId = route.params.id as string
  if (!projectId) {
    error.value = true
    loading.value = false
    return
  }

  loading.value = true
  error.value = false

  try {
    // fetchProject already loads todos, milestones, and marketing plans internally
    // Don't call them again to avoid race conditions
    await projectsStore.fetchProject(projectId)

    if (!projectsStore.currentProject) {
      error.value = true
    } else {
      // Initialize edit form
      editForm.value = {
        name: projectsStore.currentProject.name,
        description: projectsStore.currentProject.description || '',
        status: projectsStore.currentProject.status
      }
      // Related data (todos, milestones, marketing plans) already loaded by fetchProject
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

// Gamification functions
async function loadGamificationData(): Promise<void> {
  if (!project.value) return

  try {
    await Promise.all([
      gamificationStore.fetchStats(project.value.id),
      gamificationStore.fetchAchievements(),
      gamificationStore.fetchSprints(project.value.id),
      gamificationStore.fetchLeaderboard(project.value.id)
    ])
  } catch (err) {
    logError('Failed to load gamification data:', err)
  }
}

function handleSprintStart(sprint: any): void {
  if (!project.value) return
  gamificationStore.startSprint(project.value.id, sprint.id)
    .then(() => {
      $q.notify({ type: 'positive', message: 'Sprint started!' })
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: 'Failed to start sprint' })
    })
}

function handleSprintComplete(sprint: any): void {
  if (!project.value) return
  gamificationStore.completeSprint(project.value.id, sprint.id)
    .then(() => {
      $q.notify({ type: 'positive', message: 'Sprint completed! Great work!' })
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: 'Failed to complete sprint' })
    })
}

function handleSprintEdit(sprint: any): void {
  // TODO: Open sprint edit dialog
  $q.notify({ type: 'info', message: 'Sprint editing coming soon!' })
}

function handleSprintRetrospective(sprint: any): void {
  // TODO: Open retrospective dialog
  $q.notify({ type: 'info', message: 'Retrospective feature coming soon!' })
}

// Watch for route changes
watch(() => route.params.id, () => {
  loadProject()
})

// Watch for tab changes to fetch documents, team members, GitHub data, and gamification
watch(activeTab, (newTab) => {
  if (newTab === 'documents' && documents.value.length === 0) {
    fetchDocuments()
  }
  if (newTab === 'team' && !isGuestUser.value) {
    if (teamMembers.value.length === 0) {
      fetchTeamMembers()
    }
    if (pendingInvitations.value.length === 0) {
      fetchPendingInvitations()
    }
  }
  if (newTab === 'settings') {
    // Load global GitHub integration for the toggle
    if (!globalGitHubIntegration.value && !loadingGlobalGitHub.value) {
      loadGlobalGitHubIntegration()
    }
    // Initialize useGlobalPAT from project data
    if (project.value) {
      useGlobalPAT.value = project.value.use_global_pat !== false
    }
    // Load GitHub data if linked
    if (githubLinked.value) {
      if (githubIssues.value.length === 0) {
        fetchGithubIssues()
      }
      if (githubPRs.value.length === 0) {
        fetchGithubPRs()
      }
    }
  }
  if (newTab === 'progress' && project.value) {
    loadGamificationData()
  }
})

onMounted(() => {
  loadProject()
})
</script>

<style lang="scss" scoped>
.project-detail-page {
  max-width: 1200px;
  margin: 0 auto;
}

.project-header {
  background: linear-gradient(135deg, rgba(var(--q-primary-rgb), 0.05), rgba(var(--q-secondary-rgb), 0.05));
  border-radius: 8px;
}

// Tabs styling for dark/light mode
.project-tabs {
  background: #f5f5f5;

  :deep(.q-tab) {
    color: #555;

    &.q-tab--active {
      color: var(--q-primary);
    }
  }
}

// Dark mode tabs
.body--dark .project-tabs {
  background: #1e1e1e;

  :deep(.q-tab) {
    color: rgba(255, 255, 255, 0.7);

    &.q-tab--active {
      color: var(--q-primary);
    }
  }
}

.stat-card {
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
  }
}

.todo-item {
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.02);
  }
}

.plan-content {
  background: var(--q-grey-2);
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  font-size: 12px;
  max-height: 200px;
}

.copilot-panel {
  min-height: 500px;
}

.copilot-card {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-message {
  display: flex;
  gap: 12px;
  align-items: flex-start;

  &.user {
    flex-direction: row-reverse;

    .message-content {
      background: var(--q-primary);
      color: white;
    }
  }

  &.assistant {
    .message-content {
      background: var(--q-grey-3);
    }
  }
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
}

.message-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
