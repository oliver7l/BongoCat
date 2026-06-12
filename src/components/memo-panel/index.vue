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

const shouldShiftUp = computed(() => pomodoroStore.enabled)

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

useEventListener('keydown', handleSearchShortcut)

watch(() => memoStore.visible, (val) => {
  if (val) {
    pasteConfirmVisible.value = false
    inputValue.value = ''
    nextTick(() => inputRef.value?.focus())
  }
})

function renderTagLink(tag: string) {
  memoStore.activeTag = memoStore.activeTag === tag ? null : tag
}
</script>

<template>
  <Teleport to="body">
    <Transition name="memo-fade">
      <div
        v-if="memoStore.enabled && memoStore.visible"
        class="memo-panel"
        :class="{ 'memo-shifted': shouldShiftUp }"
      >
        <!-- Header -->
        <div class="memo-header">
          <span class="memo-title">{{ t('components.memoPanel.title') }}</span>
          <div class="memo-header-actions">
            <button
              class="memo-btn"
              :title="t('components.memoPanel.clearAll')"
              @click="memoStore.clearAll()"
            >
              <span class="i-lucide:trash-2 size-3.5" />
            </button>
            <button
              class="memo-btn"
              :title="t('components.memoPanel.close')"
              @click="memoStore.hide()"
            >
              <span class="i-lucide:x size-3.5" />
            </button>
          </div>
        </div>

        <!-- Search -->
        <div
          v-if="memoStore.items.length > 3"
          class="memo-search"
        >
          <span class="i-lucide:search size-3.5 search-icon" />
          <input
            ref="searchInputRef"
            v-model="memoStore.searchQuery"
            class="memo-search-input"
            :placeholder="t('components.memoPanel.searchPlaceholder')"
          >
        </div>

        <!-- Tag filter bar -->
        <div
          v-if="memoStore.allTags.length > 0"
          class="memo-tags"
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

        <!-- Input area -->
        <div class="memo-input-area">
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

        <!-- Paste confirm bar -->
        <Transition name="memo-slide">
          <div
            v-if="pasteConfirmVisible"
            class="memo-paste-confirm"
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
          class="memo-list"
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

        <!-- Empty state -->
        <div
          v-else
          class="memo-empty"
        >
          {{ t('components.memoPanel.empty') }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.memo-panel {
  position: fixed;
  bottom: 60px;
  right: 20px;
  width: 340px;
  max-height: 440px;
  background: rgba(20, 20, 28, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #e8e8ed;
  font-size: 13px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.memo-shifted {
  bottom: 110px;
}

.memo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.memo-title {
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.3px;
}

.memo-header-actions {
  display: flex;
  gap: 4px;
}

.memo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  transition: background 0.15s, color 0.15s;
}

.memo-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.memo-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.memo-btn-sm {
  padding: 3px 8px;
  font-size: 11px;
}

.memo-btn-primary {
  background: rgba(99, 102, 241, 0.5);
  color: #fff;
}

.memo-btn-primary:hover {
  background: rgba(99, 102, 241, 0.75);
}

.memo-btn-icon {
  padding: 4px;
  background: transparent;
}

.memo-btn-icon:hover {
  background: rgba(255, 255, 255, 0.12);
}

.memo-search {
  position: relative;
  padding: 8px 12px 0;
}

.search-icon {
  position: absolute;
  left: 20px;
  top: 16px;
  color: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.memo-search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 6px 8px 6px 28px;
  color: #e8e8ed;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}

.memo-search-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.memo-search-input:focus {
  border-color: rgba(255, 255, 255, 0.2);
}

.memo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.55);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
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
  font-size: 10px;
}

.memo-input-area {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.memo-textarea {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 6px 8px;
  color: #e8e8ed;
  font-size: 12px;
  resize: none;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
}

.memo-textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.memo-textarea:focus {
  border-color: rgba(255, 255, 255, 0.2);
}

.memo-add-btn {
  align-self: flex-end;
  background: rgba(99, 102, 241, 0.6);
  border: none;
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.15s;
  white-space: nowrap;
}

.memo-add-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.8);
}

.memo-paste-confirm {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(99, 102, 241, 0.12);
  border-bottom: 1px solid rgba(99, 102, 241, 0.15);
  font-size: 11px;
}

.paste-icon {
  font-size: 14px;
}

.paste-text {
  flex: 1;
  color: rgba(255, 255, 255, 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.memo-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.memo-list::-webkit-scrollbar {
  width: 4px;
}

.memo-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.memo-item {
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.1s;
}

.memo-item:last-child {
  border-bottom: none;
}

.memo-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.memo-item-content {
  font-size: 12px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
  cursor: text;
  margin-bottom: 4px;
  color: rgba(255, 255, 255, 0.85);
}

.memo-markdown-preview {
  white-space: normal;
}

.memo-markdown-preview :deep(p) {
  margin: 0 0 4px;
}

.memo-markdown-preview :deep(ul),
.memo-markdown-preview :deep(ol) {
  margin: 4px 0;
  padding-left: 16px;
}

.memo-markdown-preview :deep(code) {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 11px;
}

.memo-markdown-preview :deep(pre) {
  background: rgba(0, 0, 0, 0.3);
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 4px 0;
}

.memo-markdown-preview :deep(pre code) {
  background: none;
  padding: 0;
}

.memo-item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-bottom: 4px;
}

.memo-tag {
  font-size: 10px;
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
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
}

.memo-item-actions {
  display: flex;
  gap: 2px;
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
  border-radius: 6px;
  padding: 6px 8px;
  color: #e8e8ed;
  font-size: 12px;
  resize: vertical;
  outline: none;
  font-family: inherit;
  line-height: 1.5;
  box-sizing: border-box;
  margin-bottom: 6px;
}

.memo-edit-textarea:focus {
  border-color: rgba(99, 102, 241, 0.5);
}

.memo-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

/* Transitions */
.memo-fade-enter-active,
.memo-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.memo-fade-enter-from,
.memo-fade-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}

.memo-slide-enter-active,
.memo-slide-leave-active {
  transition: all 0.2s ease;
}

.memo-slide-enter-from,
.memo-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
