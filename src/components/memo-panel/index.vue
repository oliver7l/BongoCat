<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { nextTick, ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VueMarkdown from 'vue-markdown-render'

import { useMemoStore } from '@/stores/memo'
import { usePomodoroStore } from '@/stores/pomodoro'

const memoStore = useMemoStore()
const pomodoroStore = usePomodoroStore()
const { t } = useI18n()
const inputValue = ref('')
const editingId = ref<string | null>(null)
const editValue = ref('')
const inputRef = ref<HTMLTextAreaElement>()
const searchInputRef = ref<HTMLInputElement>()
const pasteConfirmVisible = ref(false)
const previewIds = ref<Set<string>>(new Set())

const shouldShiftUp = computed(() => pomodoroStore.showPopover)
const panelRef = ref<HTMLDivElement>()

function handleSubmit() {
  const content = inputValue.value.trim()
  if (!content) return
  memoStore.addItem(content)
  inputValue.value = ''
  pasteConfirmVisible.value = false
  nextTick(() => inputRef.value?.focus())
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
  if (e.key === 'Escape') {
    if (pasteConfirmVisible.value) {
      pasteConfirmVisible.value = false
      inputValue.value = ''
    } else {
      memoStore.hide()
    }
  }
}

function handlePaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text')
  if (!text?.trim()) return
  inputValue.value = text
  pasteConfirmVisible.value = true
  nextTick(() => inputRef.value?.focus())
}

function discardPaste() {
  inputValue.value = ''
  pasteConfirmVisible.value = false
  inputRef.value?.focus()
}

function startEdit(item: { id: string; content: string }) {
  editingId.value = item.id
  editValue.value = item.content
}

function saveEdit(id: string) {
  const trimmed = editValue.value.trim()
  if (trimmed) {
    memoStore.updateItem(id, trimmed)
  } else {
    memoStore.removeItem(id)
  }
  editingId.value = null
  editValue.value = ''
}

function cancelEdit() {
  editingId.value = null
  editValue.value = ''
}

function togglePreview(id: string) {
  const next = new Set(previewIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  previewIds.value = next
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return t('components.memoPanel.justNow')
  if (minutes < 60) return t('components.memoPanel.minutesAgo', { n: minutes })

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('components.memoPanel.hoursAgo', { n: hours })

  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hh}:${mm}`
}

function handleSearchShortcut(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}

function renderTagLink(tag: string) {
  memoStore.activeTag = memoStore.activeTag === tag ? null : tag
}

// Click outside to dismiss
useEventListener('pointerdown', (e: PointerEvent) => {
  if (!memoStore.visible) return
  if (!panelRef.value) return
  if (panelRef.value.contains(e.target as Node)) return
  // Don't close if clicking the FAB button
  const target = e.target as HTMLElement
  if (target.closest('.fab-btn')) return
  memoStore.hide()
})

watch(() => memoStore.visible, (val) => {
  if (val) {
    pasteConfirmVisible.value = false
    inputValue.value = ''
    nextTick(() => inputRef.value?.focus())
  }
})

useEventListener('keydown', handleSearchShortcut)
</script>

<template>
  <Transition name="popup-slide">
    <div
      v-if="memoStore.visible"
      ref="panelRef"
      class="memo-popup"
      :class="{ 'memo-shifted': shouldShiftUp }"
    >
      <!-- Header -->
      <div class="popup-header">
        <span class="popup-title">{{ t('components.memoPanel.title') }}</span>
        <button
          class="popup-close"
          @click="memoStore.hide()"
        >
          <span class="i-lucide:x size-3.5" />
        </button>
      </div>

      <!-- Search (only show when > 3 items) -->
      <div
        v-if="memoStore.items.length > 3"
        class="popup-search"
      >
        <span class="i-lucide:search size-3 search-icon" />
        <input
          ref="searchInputRef"
          v-model="memoStore.searchQuery"
          class="search-input"
          :placeholder="t('components.memoPanel.searchPlaceholder')"
        >
      </div>

      <!-- Tags -->
      <div
        v-if="memoStore.allTags.length > 0"
        class="popup-tags"
      >
        <button
          class="tag-chip"
          :class="{ active: !memoStore.activeTag }"
          @click="memoStore.activeTag = null"
        >
          {{ t('components.memoPanel.all') }}
        </button>
        <button
          v-for="[tag, count] in memoStore.allTags"
          :key="tag"
          class="tag-chip"
          :class="{ active: memoStore.activeTag === tag }"
          @click="memoStore.activeTag = memoStore.activeTag === tag ? null : tag"
        >
          #{{ tag }} <span class="tag-count">{{ count }}</span>
        </button>
      </div>

      <!-- Input -->
      <div class="popup-input">
        <textarea
          ref="inputRef"
          v-model="inputValue"
          class="memo-textarea"
          :placeholder="t('components.memoPanel.placeholder')"
          rows="2"
          @keydown="handleKeydown"
          @paste="handlePaste"
        />
        <button
          class="memo-add-btn"
          :disabled="!inputValue.trim()"
          @click="handleSubmit"
        >
          {{ t('components.memoPanel.add') }}
        </button>
      </div>

      <!-- Paste confirm -->
      <Transition name="popup-slide">
        <div
          v-if="pasteConfirmVisible"
          class="paste-confirm"
        >
          <span class="paste-icon">📋</span>
          <span class="paste-text">{{ t('components.memoPanel.pasteConfirm') }}</span>
          <button
            class="memo-btn memo-btn-sm memo-btn-primary"
            @click="handleSubmit"
          >
            {{ t('components.memoPanel.confirm') }}
          </button>
          <button
            class="memo-btn memo-btn-sm"
            @click="discardPaste"
          >
            {{ t('components.memoPanel.discard') }}
          </button>
        </div>
      </Transition>

      <!-- List -->
      <div
        v-if="memoStore.sortedItems.length > 0"
        class="popup-list"
      >
        <div
          v-for="item in memoStore.sortedItems"
          :key="item.id"
          class="memo-item"
        >
          <template v-if="editingId === item.id">
            <textarea
              v-model="editValue"
              class="memo-edit-textarea"
              rows="3"
              @keydown.enter.ctrl="saveEdit(item.id)"
              @keydown.escape="cancelEdit"
            />
            <div class="memo-item-actions">
              <button
                class="memo-btn memo-btn-sm"
                @click="saveEdit(item.id)"
              >
                {{ t('components.memoPanel.save') }}
              </button>
              <button
                class="memo-btn memo-btn-sm"
                @click="cancelEdit"
              >
                {{ t('components.memoPanel.cancel') }}
              </button>
            </div>
          </template>
          <template v-else>
            <div
              class="memo-item-content"
              :class="{ 'memo-markdown-preview': previewIds.has(item.id) }"
              @dblclick="startEdit(item)"
            >
              <VueMarkdown
                v-if="previewIds.has(item.id)"
                :source="item.content"
              />
              <template v-else>
                {{ item.content }}
              </template>
            </div>
            <div class="memo-item-tags">
              <span
                v-for="tag in item.tags"
                :key="tag"
                class="memo-tag"
                @click="renderTagLink(tag)"
              >#{{ tag }}</span>
            </div>
            <div class="memo-item-footer">
              <span class="memo-item-time">{{ formatDate(item.updatedAt) }}</span>
              <div class="memo-item-actions">
                <button
                  class="memo-btn memo-btn-icon"
                  :title="previewIds.has(item.id) ? t('components.memoPanel.viewText') : t('components.memoPanel.viewMarkdown')"
                  @click="togglePreview(item.id)"
                >
                  <span
                    v-if="previewIds.has(item.id)"
                    class="i-lucide:file-text size-3"
                  />
                  <span
                    v-else
                    class="i-lucide:eye size-3"
                  />
                </button>
                <button
                  class="memo-btn memo-btn-icon"
                  :title="t('components.memoPanel.edit')"
                  @click="startEdit(item)"
                >
                  <span class="i-lucide:pencil size-3" />
                </button>
                <button
                  class="memo-btn memo-btn-icon"
                  :title="t('components.memoPanel.delete')"
                  @click="memoStore.removeItem(item.id)"
                >
                  <span class="i-lucide:trash-2 size-3" />
                </button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Empty -->
      <div
        v-else
        class="popup-empty"
      >
        {{ t('components.memoPanel.empty') }}
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.memo-popup {
  position: fixed;
  bottom: 76px;
  right: 12px;
  width: 300px;
  max-height: 380px;
  background: rgba(20, 20, 28, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #e8e8ed;
  font-size: 12px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}

.memo-shifted {
  bottom: 128px;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.popup-title {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.3px;
}

.popup-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  border-radius: 6px;
  width: 22px;
  height: 22px;
  transition: background 0.15s, color 0.15s;
}

.popup-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.popup-search {
  position: relative;
  padding: 6px 10px 0;
}

.search-icon {
  position: absolute;
  left: 18px;
  top: 14px;
  color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 5px 7px 5px 24px;
  color: #e8e8ed;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.popup-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.tag-chip:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}

.tag-chip.active {
  background: rgba(99, 102, 241, 0.25);
  border-color: rgba(99, 102, 241, 0.4);
  color: #a5b4fc;
}

.tag-count {
  opacity: 0.5;
  font-size: 9px;
}

.popup-input {
  display: flex;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.memo-textarea {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 5px 7px;
  color: #e8e8ed;
  font-size: 11px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  box-sizing: border-box;
}

.memo-textarea::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.memo-textarea:focus {
  border-color: rgba(255, 255, 255, 0.2);
}

.memo-add-btn {
  align-self: flex-end;
  background: rgba(99, 102, 241, 0.6);
  border: none;
  color: #fff;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  transition: background 0.15s;
  white-space: nowrap;
}

.memo-add-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.8);
}

.memo-add-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.paste-confirm {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  background: rgba(99, 102, 241, 0.12);
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  font-size: 10px;
}

.paste-icon {
  font-size: 12px;
}

.paste-text {
  flex: 1;
  color: rgba(255, 255, 255, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 10px;
  transition: background 0.15s, color 0.15s;
}

.memo-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.memo-btn-sm {
  padding: 2px 7px;
  font-size: 10px;
}

.memo-btn-primary {
  background: rgba(99, 102, 241, 0.5);
  color: #fff;
}

.memo-btn-primary:hover {
  background: rgba(99, 102, 241, 0.75);
}

.memo-btn-icon {
  padding: 3px;
  background: transparent;
}

.memo-btn-icon:hover {
  background: rgba(255, 255, 255, 0.12);
}

.popup-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px 0;
}

.popup-list::-webkit-scrollbar {
  width: 3px;
}

.popup-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
}

.memo-item {
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: background 0.1s;
}

.memo-item:last-child {
  border-bottom: none;
}

.memo-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.memo-item-content {
  font-size: 11px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  cursor: text;
  margin-bottom: 3px;
  color: rgba(255, 255, 255, 0.85);
}

.memo-markdown-preview {
  white-space: normal;
}

.memo-markdown-preview :deep(p) {
  margin: 0 0 3px;
}

.memo-markdown-preview :deep(ul),
.memo-markdown-preview :deep(ol) {
  margin: 3px 0;
  padding-left: 14px;
}

.memo-markdown-preview :deep(code) {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 3px;
  border-radius: 2px;
  font-size: 10px;
}

.memo-markdown-preview :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  padding: 6px;
  border-radius: 5px;
  overflow-x: auto;
  margin: 3px 0;
}

.memo-markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.memo-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 3px;
}

.memo-tag {
  font-size: 9px;
  color: rgba(99, 102, 241, 0.6);
  cursor: pointer;
  transition: color 0.15s;
}

.memo-tag:hover {
  color: rgba(99, 102, 241, 0.9);
}

.memo-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.memo-item-time {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.25);
}

.memo-item-actions {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.12s;
}

.memo-item:hover .memo-item-actions {
  opacity: 1;
}

.memo-edit-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 5px;
  padding: 5px 7px;
  color: #e8e8ed;
  font-size: 11px;
  resize: vertical;
  outline: none;
  font-family: inherit;
  line-height: 1.4;
  box-sizing: border-box;
  margin-bottom: 5px;
}

.memo-edit-textarea:focus {
  border-color: rgba(99, 102, 241, 0.5);
}

.popup-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 10px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.25);
}

/* Slide-up popup animation */
.popup-slide-enter-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.popup-slide-leave-active {
  transition: all 0.15s ease-in;
}

.popup-slide-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.popup-slide-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}
</style>
