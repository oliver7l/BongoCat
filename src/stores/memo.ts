import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export interface MemoItem {
  id: string
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export const useMemoStore = defineStore('memo', () => {
  const enabled = ref(true)
  const visible = ref(false)
  const items = ref<MemoItem[]>([])
  const searchQuery = ref('')
  const activeTag = ref<string | null>(null)

  const allTags = computed(() => {
    const tagMap = new Map<string, number>()
    for (const item of items.value) {
      for (const tag of item.tags) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
      }
    }
    return [...tagMap.entries()].sort((a, b) => b[1] - a[1])
  })

  const filteredItems = computed(() => {
    let result = items.value

    if (activeTag.value) {
      result = result.filter(item => item.tags.includes(activeTag.value!))
    }

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(item =>
        item.content.toLowerCase().includes(query),
      )
    }

    return result
  })

  const sortedItems = computed(() => {
    return [...filteredItems.value].sort((a, b) => b.updatedAt - a.updatedAt)
  })

  function extractTags(content: string): string[] {
    const matches = content.match(/#[\w\u4e00-\u9fff-]+/g)
    if (!matches) return []
    return [...new Set(matches.map(t => t.slice(1)))]
  }

  function addItem(content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    items.value.push({
      id: crypto.randomUUID(),
      content: trimmed,
      tags: extractTags(trimmed),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  function removeItem(id: string) {
    const index = items.value.findIndex(item => item.id === id)
    if (index === -1) return
    items.value.splice(index, 1)
  }

  function updateItem(id: string, content: string) {
    const item = items.value.find(item => item.id === id)
    if (!item) return
    item.content = content.trim()
    item.tags = extractTags(item.content)
    item.updatedAt = Date.now()
  }

  function clearAll() {
    items.value = []
    activeTag.value = null
  }

  function toggle() {
    visible.value = !visible.value
  }

  function show() {
    visible.value = true
  }

  function hide() {
    visible.value = false
  }

  return {
    enabled,
    visible,
    items,
    searchQuery,
    activeTag,
    allTags,
    filteredItems,
    sortedItems,
    extractTags,
    addItem,
    removeItem,
    updateItem,
    clearAll,
    toggle,
    show,
    hide,
  }
}, {
  tauri: {
    filterKeys: ['enabled', 'visible', 'items', 'searchQuery', 'activeTag'],
  },
})
