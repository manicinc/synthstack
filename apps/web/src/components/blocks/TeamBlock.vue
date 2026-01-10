<template>
  <div class="team-block">
    <h2
      v-if="block.data?.heading"
      class="block-heading"
    >
      {{ block.data.heading }}
    </h2>
    <p
      v-if="block.data?.description"
      class="block-description"
    >
      {{ block.data.description }}
    </p>

    <div
      v-if="block.data?.members"
      class="team-grid"
    >
      <q-card
        v-for="(member, index) in block.data.members"
        :key="index"
        flat
        bordered
        class="team-member-card"
      >
        <q-card-section class="text-center">
          <q-avatar
            size="80px"
            :color="member.avatar_url ? undefined : 'primary'"
            :text-color="member.avatar_url ? undefined : 'white'"
          >
            <img
              v-if="member.avatar_url"
              :src="member.avatar_url"
              :alt="member.name"
            >
            <div
              v-else
              class="text-h5"
            >
              {{ getInitials(member.name) }}
            </div>
          </q-avatar>

          <div class="team-member-name q-mt-md">
            {{ member.name }}
          </div>
          <div class="team-member-role">
            {{ member.role }}
          </div>

          <p
            v-if="member.bio"
            class="team-member-bio q-mt-sm"
          >
            {{ member.bio }}
          </p>

          <div
            v-if="member.email || member.phone"
            class="team-member-contact q-mt-md"
          >
            <q-btn
              v-if="member.email"
              flat
              dense
              round
              icon="email"
              size="sm"
              :href="`mailto:${member.email}`"
            />
            <q-btn
              v-if="member.phone"
              flat
              dense
              round
              icon="phone"
              size="sm"
              :href="`tel:${member.phone}`"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  block: {
    id: string;
    block_type: string;
    data: {
      heading?: string;
      description?: string;
      members?: Array<{
        name: string;
        role: string;
        bio?: string;
        avatar_url?: string;
        email?: string;
        phone?: string;
      }>;
    };
  };
}>();

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
</script>

<style scoped lang="scss">
.team-block {
  .block-heading {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 12px;
    color: $grey-9;
  }

  .block-description {
    font-size: 16px;
    color: $grey-7;
    margin-bottom: 24px;
  }

  .team-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 24px;
  }

  .team-member-card {
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-4px);
    }
  }

  .team-member-name {
    font-size: 18px;
    font-weight: 600;
    color: $grey-9;
  }

  .team-member-role {
    font-size: 14px;
    color: $primary;
    font-weight: 500;
  }

  .team-member-bio {
    font-size: 14px;
    color: $grey-7;
    line-height: 1.6;
  }

  .team-member-contact {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
}
</style>
