import { defineStore } from 'pinia'
import { ref } from 'vue'

export type HotKey = 'visibleCat' | 'visiblePreference' | 'visibleMemo' | 'mirrorMode' | 'penetrable' | 'alwaysOnTop'

export const useShortcutStore = defineStore('shortcut', () => {
  const visibleCat = ref('')
  const visiblePreference = ref('')
  const visibleMemo = ref('')
  const mirrorMode = ref('')
  const penetrable = ref('')
  const alwaysOnTop = ref('')

  return {
    visibleCat,
    visiblePreference,
    visibleMemo,
    mirrorMode,
    penetrable,
    alwaysOnTop,
  }
})
