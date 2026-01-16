<template>
  <q-inner-loading
    :showing="showing"
    :label="label"
    :label-style="labelStyle"
  >
    <component
      :is="`q-spinner-${spinnerType}`"
      :size="size"
      :color="color"
    />
  </q-inner-loading>
</template>

<script setup lang="ts">
interface Props {
  showing: boolean
  label?: string
  spinnerType?: 'dots' | 'gears' | 'hourglass' | 'infinity' | 'oval' | 'puff' | 'rings' | 'tail'
  color?: string
  size?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Loading...',
  spinnerType: 'dots',
  color: 'primary',
  size: '50px'
})

const labelStyle = {
  fontSize: '1.1em',
  marginTop: '16px'
}
</script>

<style scoped lang="scss">
// Additional styling if needed
</style>
