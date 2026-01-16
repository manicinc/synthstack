<template>
  <div class="pricing-table-block">
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

    <q-markup-table
      v-if="block.data?.items"
      flat
      bordered
    >
      <thead>
        <tr>
          <th class="text-left">
            Item
          </th>
          <th class="text-left">
            Description
          </th>
          <th class="text-right">
            Quantity
          </th>
          <th class="text-right">
            Rate
          </th>
          <th class="text-right">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in block.data.items"
          :key="index"
        >
          <td>{{ item.name }}</td>
          <td>{{ item.description }}</td>
          <td class="text-right">
            {{ item.quantity }}
          </td>
          <td class="text-right">
            {{ formatCurrency(item.rate) }}
          </td>
          <td class="text-right">
            {{ formatCurrency(item.quantity * item.rate) }}
          </td>
        </tr>
      </tbody>
      <tfoot v-if="block.data?.show_total">
        <tr>
          <td
            colspan="4"
            class="text-right text-weight-bold"
          >
            Subtotal
          </td>
          <td class="text-right text-weight-bold">
            {{ formatCurrency(subtotal) }}
          </td>
        </tr>
        <tr v-if="block.data?.tax_rate">
          <td
            colspan="4"
            class="text-right"
          >
            Tax ({{ block.data.tax_rate }}%)
          </td>
          <td class="text-right">
            {{ formatCurrency(taxAmount) }}
          </td>
        </tr>
        <tr v-if="block.data?.discount">
          <td
            colspan="4"
            class="text-right"
          >
            Discount
          </td>
          <td class="text-right">
            -{{ formatCurrency(block.data.discount) }}
          </td>
        </tr>
        <tr class="total-row">
          <td
            colspan="4"
            class="text-right text-h6"
          >
            Total
          </td>
          <td class="text-right text-h6 text-primary">
            {{ formatCurrency(total) }}
          </td>
        </tr>
      </tfoot>
    </q-markup-table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  block: {
    id: string;
    block_type: string;
    data: {
      heading?: string;
      description?: string;
      items?: Array<{
        name: string;
        description: string;
        quantity: number;
        rate: number;
      }>;
      show_total?: boolean;
      tax_rate?: number;
      discount?: number;
    };
  };
}>();

const subtotal = computed(() => {
  if (!props.block.data?.items) return 0;
  return props.block.data.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
});

const taxAmount = computed(() => {
  if (!props.block.data?.tax_rate) return 0;
  return subtotal.value * (props.block.data.tax_rate / 100);
});

const total = computed(() => {
  return subtotal.value + taxAmount.value - (props.block.data?.discount || 0);
});

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};
</script>

<style scoped lang="scss">
.pricing-table-block {
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

  :deep(.q-markup-table) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

    thead tr {
      background: $grey-2;

      th {
        font-weight: 600;
        color: $grey-9;
      }
    }

    tbody tr {
      &:hover {
        background: $grey-1;
      }
    }

    tfoot tr {
      background: $grey-1;

      &.total-row {
        background: $grey-2;
        border-top: 2px solid $grey-4;
      }
    }
  }
}
</style>
