<template>
  <q-btn-dropdown
    :icon="icon"
    :label="label"
    :outline="outline"
    :flat="flat"
    :dense="dense"
    :color="color"
    :loading="exporting"
  >
    <q-list dense>
      <q-item-label header>
        Export Format
      </q-item-label>
      
      <q-item 
        v-close-popup 
        clickable 
        @click="exportAs('csv')"
      >
        <q-item-section avatar>
          <q-icon
            name="table_chart"
            color="primary"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>CSV</q-item-label>
          <q-item-label caption>
            Spreadsheet compatible
          </q-item-label>
        </q-item-section>
      </q-item>
      
      <q-item 
        v-close-popup 
        clickable 
        @click="exportAs('json')"
      >
        <q-item-section avatar>
          <q-icon
            name="data_object"
            color="secondary"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>JSON</q-item-label>
          <q-item-label caption>
            Machine readable
          </q-item-label>
        </q-item-section>
      </q-item>
      
      <q-item 
        v-close-popup 
        clickable 
        :disable="!pdfEnabled"
        @click="exportAs('pdf')"
      >
        <q-item-section avatar>
          <q-icon
            name="picture_as_pdf"
            :color="pdfEnabled ? 'negative' : 'grey'"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>PDF Report</q-item-label>
          <q-item-label caption>
            {{ pdfEnabled ? 'Formatted report' : 'Coming soon' }}
          </q-item-label>
        </q-item-section>
      </q-item>
      
      <q-separator />
      
      <q-item-label header>
        Time Range
      </q-item-label>
      
      <q-item 
        v-close-popup 
        clickable 
        @click="setRange('day')"
      >
        <q-item-section>
          <q-item-label>Last 24 Hours</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon 
            v-if="selectedRange === 'day'" 
            name="check" 
            color="positive" 
          />
        </q-item-section>
      </q-item>
      
      <q-item 
        v-close-popup 
        clickable 
        @click="setRange('week')"
      >
        <q-item-section>
          <q-item-label>Last 7 Days</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon 
            v-if="selectedRange === 'week'" 
            name="check" 
            color="positive" 
          />
        </q-item-section>
      </q-item>
      
      <q-item 
        v-close-popup 
        clickable 
        @click="setRange('month')"
      >
        <q-item-section>
          <q-item-label>Last 30 Days</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon 
            v-if="selectedRange === 'month'" 
            name="check" 
            color="positive" 
          />
        </q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue'
import { useQuasar } from 'quasar'
import { dashboardService } from '@/services/dashboard'
import { devLog, devWarn, devError, logError } from '@/utils/devLogger'

interface Props {
  /** Type of data being exported */
  dataType: 'workflow-analytics' | 'copilot-usage' | 'dashboard-overview'
  /** Button icon */
  icon?: string
  /** Button label */
  label?: string
  /** Use outline style */
  outline?: boolean
  /** Use flat style */
  flat?: boolean
  /** Dense button */
  dense?: boolean
  /** Button color */
  color?: string
  /** Enable PDF export */
  pdfEnabled?: boolean
  /** Initial time range */
  initialRange?: 'day' | 'week' | 'month'
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'download',
  label: 'Export',
  outline: true,
  flat: false,
  dense: false,
  color: undefined,
  pdfEnabled: false,
  initialRange: 'week',
})

const emit = defineEmits<{
  (e: 'exported', format: string): void
  (e: 'error', error: Error): void
}>()

const $q = useQuasar()

const exporting = ref(false)
const selectedRange = ref(props.initialRange)

function setRange(range: 'day' | 'week' | 'month') {
  selectedRange.value = range
}

async function exportAs(format: 'csv' | 'json' | 'pdf') {
  exporting.value = true
  
  try {
    const blob = await dashboardService.exportData(
      props.dataType, 
      format, 
      selectedRange.value
    )
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const extension = format === 'pdf' ? 'pdf' : format
    link.download = `${props.dataType}-${selectedRange.value}-${timestamp}.${extension}`
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    $q.notify({
      type: 'positive',
      message: `Export downloaded successfully`,
      icon: 'download_done',
    })
    
    emit('exported', format)
  } catch (error) {
    logError('Export failed:', error)

    $q.notify({
      type: 'negative',
      message: 'Export failed. Please try again.',
      icon: 'error',
    })
    
    emit('error', error instanceof Error ? error : new Error('Export failed'))
  } finally {
    exporting.value = false
  }
}
</script>

<style lang="scss" scoped>
.q-item-label[header] {
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
}
</style>


