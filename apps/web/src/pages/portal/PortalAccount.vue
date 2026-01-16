<template>
  <q-page padding>
    <div class="q-mb-lg">
      <h4 class="text-h4 q-mt-none q-mb-sm">
        Account Settings
      </h4>
      <p class="text-subtitle1 text-grey-7">
        Manage your account information
      </p>
    </div>

    <div class="row q-col-gutter-md">
      <!-- Profile Information -->
      <div class="col-12 col-md-8">
        <q-card
          flat
          bordered
          class="q-mb-md"
        >
          <q-card-section>
            <div class="text-h6 q-mb-md">
              Profile Information
            </div>

            <q-form @submit="updateProfile">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-input
                    v-model="profileForm.first_name"
                    label="First Name"
                    outlined
                    :rules="[val => !!val || 'First name is required']"
                  />
                </div>

                <div class="col-12 col-md-6">
                  <q-input
                    v-model="profileForm.last_name"
                    label="Last Name"
                    outlined
                    :rules="[val => !!val || 'Last name is required']"
                  />
                </div>

                <div class="col-12">
                  <q-input
                    v-model="profileForm.email"
                    label="Email"
                    type="email"
                    outlined
                    :rules="[val => !!val || 'Email is required']"
                  />
                </div>

                <div class="col-12">
                  <q-input
                    v-model="profileForm.phone"
                    label="Phone"
                    outlined
                  />
                </div>

                <div class="col-12">
                  <q-input
                    v-model="profileForm.company"
                    label="Company"
                    outlined
                    readonly
                  />
                </div>

                <div class="col-12 text-right">
                  <q-btn
                    unelevated
                    color="primary"
                    label="Save Changes"
                    type="submit"
                    :loading="savingProfile"
                  />
                </div>
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Change Password -->
        <q-card
          flat
          bordered
          class="q-mb-md"
        >
          <q-card-section>
            <div class="text-h6 q-mb-md">
              Change Password
            </div>

            <q-form @submit="changePassword">
              <div class="row q-col-gutter-md">
                <div class="col-12">
                  <q-input
                    v-model="passwordForm.current_password"
                    label="Current Password"
                    type="password"
                    outlined
                    :rules="[val => !!val || 'Current password is required']"
                  />
                </div>

                <div class="col-12">
                  <q-input
                    v-model="passwordForm.new_password"
                    label="New Password"
                    type="password"
                    outlined
                    :rules="[
                      val => !!val || 'New password is required',
                      val => val.length >= 8 || 'Password must be at least 8 characters'
                    ]"
                  />
                </div>

                <div class="col-12">
                  <q-input
                    v-model="passwordForm.confirm_password"
                    label="Confirm New Password"
                    type="password"
                    outlined
                    :rules="[
                      val => !!val || 'Please confirm your password',
                      val => val === passwordForm.new_password || 'Passwords do not match'
                    ]"
                  />
                </div>

                <div class="col-12 text-right">
                  <q-btn
                    unelevated
                    color="primary"
                    label="Update Password"
                    type="submit"
                    :loading="savingPassword"
                  />
                </div>
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Notification Preferences -->
        <q-card
          flat
          bordered
        >
          <q-card-section>
            <div class="text-h6 q-mb-md">
              Notification Preferences
            </div>

            <q-list>
              <q-item tag="label">
                <q-item-section>
                  <q-item-label>Email Notifications</q-item-label>
                  <q-item-label caption>
                    Receive email updates about your projects
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle v-model="notificationPrefs.email_enabled" />
                </q-item-section>
              </q-item>

              <q-separator spaced />

              <q-item tag="label">
                <q-item-section>
                  <q-item-label>Project Updates</q-item-label>
                  <q-item-label caption>
                    Get notified when project status changes
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle v-model="notificationPrefs.project_updates" />
                </q-item-section>
              </q-item>

              <q-separator spaced />

              <q-item tag="label">
                <q-item-section>
                  <q-item-label>New Messages</q-item-label>
                  <q-item-label caption>
                    Get notified of new conversation messages
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle v-model="notificationPrefs.new_messages" />
                </q-item-section>
              </q-item>

              <q-separator spaced />

              <q-item tag="label">
                <q-item-section>
                  <q-item-label>Invoice Reminders</q-item-label>
                  <q-item-label caption>
                    Receive reminders for upcoming invoices
                  </q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-toggle v-model="notificationPrefs.invoice_reminders" />
                </q-item-section>
              </q-item>
            </q-list>

            <div class="q-mt-md text-right">
              <q-btn
                unelevated
                color="primary"
                label="Save Preferences"
                :loading="savingPreferences"
                @click="updateNotificationPreferences"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Account Overview -->
      <div class="col-12 col-md-4">
        <q-card
          flat
          bordered
          class="q-mb-md"
        >
          <q-card-section class="text-center">
            <q-avatar
              size="100px"
              color="primary"
              text-color="white"
              class="q-mb-md"
            >
              <div class="text-h4">
                {{ getInitials() }}
              </div>
            </q-avatar>

            <div class="text-h6">
              {{ fullName }}
            </div>
            <div class="text-caption text-grey-7">
              {{ profileForm.email }}
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-list dense>
              <q-item>
                <q-item-section avatar>
                  <q-icon name="business" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption>
                    Company
                  </q-item-label>
                  <q-item-label>{{ profileForm.company || 'N/A' }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="phone" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption>
                    Phone
                  </q-item-label>
                  <q-item-label>{{ profileForm.phone || 'N/A' }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item>
                <q-item-section avatar>
                  <q-icon name="calendar_today" />
                </q-item-section>
                <q-item-section>
                  <q-item-label caption>
                    Member Since
                  </q-item-label>
                  <q-item-label>{{ formatDate(accountInfo.created_at) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Account Stats -->
        <q-card
          flat
          bordered
        >
          <q-card-section>
            <div class="text-h6 q-mb-md">
              Account Activity
            </div>

            <q-list dense>
              <q-item>
                <q-item-section>
                  <q-item-label caption>
                    Active Projects
                  </q-item-label>
                  <q-item-label class="text-h6">
                    {{ accountStats.active_projects }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-separator spaced />

              <q-item>
                <q-item-section>
                  <q-item-label caption>
                    Total Invoices
                  </q-item-label>
                  <q-item-label class="text-h6">
                    {{ accountStats.total_invoices }}
                  </q-item-label>
                </q-item-section>
              </q-item>

              <q-separator spaced />

              <q-item>
                <q-item-section>
                  <q-item-label caption>
                    Unread Messages
                  </q-item-label>
                  <q-item-label class="text-h6">
                    {{ accountStats.unread_messages }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar, date } from 'quasar';
import { useAuthStore } from 'src/stores/auth';
import { devLog, devWarn, devError, logError } from '@/utils/devLogger';

const $q = useQuasar();
const authStore = useAuthStore();

const profileForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company: ''
});

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: ''
});

const notificationPrefs = ref({
  email_enabled: true,
  project_updates: true,
  new_messages: true,
  invoice_reminders: true
});

const accountInfo = ref({
  created_at: new Date().toISOString()
});

const accountStats = ref({
  active_projects: 0,
  total_invoices: 0,
  unread_messages: 0
});

const savingProfile = ref(false);
const savingPassword = ref(false);
const savingPreferences = ref(false);

const fullName = computed(() => {
  return `${profileForm.value.first_name} ${profileForm.value.last_name}`.trim() || 'User';
});

const getInitials = () => {
  const first = profileForm.value.first_name?.[0] || '';
  const last = profileForm.value.last_name?.[0] || '';
  return (first + last).toUpperCase() || 'U';
};

const formatDate = (dateStr: string) => {
  return date.formatDate(dateStr, 'MMM D, YYYY');
};

const loadAccountData = async () => {
  // Load account data from API
  try {
    // Mock data for now
    profileForm.value = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1 (555) 123-4567',
      company: 'Acme Corp'
    };

    accountStats.value = {
      active_projects: 3,
      total_invoices: 12,
      unread_messages: 5
    };
  } catch (error) {
    logError('Failed to load account data:', error);
  }
};

const updateProfile = async () => {
  savingProfile.value = true;
  try {
    // API call to update profile
    await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay

    $q.notify({
      type: 'positive',
      message: 'Profile updated successfully',
      position: 'top'
    });
  } catch (error) {
    logError('Failed to update profile:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to update profile',
      position: 'top'
    });
  } finally {
    savingProfile.value = false;
  }
};

const changePassword = async () => {
  savingPassword.value = true;
  try {
    // API call to change password
    await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay

    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: ''
    };

    $q.notify({
      type: 'positive',
      message: 'Password updated successfully',
      position: 'top'
    });
  } catch (error) {
    logError('Failed to change password:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to update password',
      position: 'top'
    });
  } finally {
    savingPassword.value = false;
  }
};

const updateNotificationPreferences = async () => {
  savingPreferences.value = true;
  try {
    // API call to update preferences
    await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay

    $q.notify({
      type: 'positive',
      message: 'Preferences updated successfully',
      position: 'top'
    });
  } catch (error) {
    logError('Failed to update preferences:', error);
    $q.notify({
      type: 'negative',
      message: 'Failed to update preferences',
      position: 'top'
    });
  } finally {
    savingPreferences.value = false;
  }
};

onMounted(() => {
  loadAccountData();
});
</script>

<style scoped lang="scss">
// Component-specific styles
</style>
