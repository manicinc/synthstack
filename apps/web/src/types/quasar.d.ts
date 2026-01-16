/**
 * @file quasar.d.ts
 * @description Type augmentations for Quasar Framework components
 */

import { VNode } from 'vue'

declare module 'quasar' {
  /**
   * Augment QBtnSlots to include append and prepend slots
   * which are valid slots but missing from the default type definitions
   */
  interface QBtnSlots {
    default: () => VNode[]
    loading: () => VNode[]
    append: () => VNode[]
    prepend: () => VNode[]
  }
}
