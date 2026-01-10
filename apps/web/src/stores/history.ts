import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface GenerationHistoryItem {
  id: string
  fileName: string
  printerName: string
  filamentName: string
  createdAt: string
  status: 'completed' | 'failed' | 'processing'
  thumbnailUrl?: string
  slicer: 'OrcaSlicer' | 'PrusaSlicer' | 'Cura'
}

export const useHistoryStore = defineStore('history', () => {
  const history = ref<GenerationHistoryItem[]>([
    {
      id: 'gen-1',
      fileName: 'robot_arm_v2.stl',
      printerName: 'Bambu Lab X1 Carbon',
      filamentName: 'Bambu PLA Basic',
      createdAt: '2023-12-01T10:00:00Z',
      status: 'completed',
      slicer: 'OrcaSlicer',
      thumbnailUrl: 'https://placehold.co/100x100/FF6B35/white?text=Robot'
    },
    {
      id: 'gen-2',
      fileName: 'hook_wall_mount.stl',
      printerName: 'Ender 3 V2',
      filamentName: 'Generic PLA',
      createdAt: '2023-12-02T15:30:00Z',
      status: 'completed',
      slicer: 'Cura',
      thumbnailUrl: 'https://placehold.co/100x100/2D9CDB/white?text=Hook'
    },
    {
      id: 'gen-3',
      fileName: 'complex_gear.stl',
      printerName: 'Prusa i3 MK3S+',
      filamentName: 'Prusament PETG',
      createdAt: '2023-12-03T09:15:00Z',
      status: 'failed',
      slicer: 'PrusaSlicer',
      thumbnailUrl: 'https://placehold.co/100x100/B87333/white?text=Gear'
    }
  ])

  function deleteHistoryItem(id: string) {
    const index = history.value.findIndex(item => item.id === id)
    if (index !== -1) {
      history.value.splice(index, 1)
    }
  }

  return {
    history,
    deleteHistoryItem
  }
})





