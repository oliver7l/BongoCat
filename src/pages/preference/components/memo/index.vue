<script setup lang="ts">
import { InputNumber, SpaceAddon, SpaceCompact, Switch } from 'antdv-next'

import ProListItem from '@/components/pro-list-item/index.vue'
import ProList from '@/components/pro-list/index.vue'
import { useMemoStore } from '@/stores/memo'

const memoStore = useMemoStore()
</script>

<template>
  <ProList :title="$t('pages.preference.memo.title')">
    <ProListItem
      :description="$t('pages.preference.memo.hints.enabled')"
      :title="$t('pages.preference.memo.labels.enabled')"
    >
      <Switch v-model:checked="memoStore.enabled" />
    </ProListItem>
  </ProList>

  <ProList
    v-if="memoStore.items.length > 0"
    :title="$t('pages.preference.memo.labels.manageMemos')"
  >
    <div class="memo-manage-list">
      <div
        v-for="item in memoStore.sortedItems"
        :key="item.id"
        class="memo-manage-item"
      >
        <span class="memo-manage-text">{{ item.content }}</span>
        <button
          class="memo-delete-btn"
          @click="memoStore.removeItem(item.id)"
        >
          <span class="i-lucide:trash-2 size-4" />
        </button>
      </div>
    </div>

    <div class="memo-clear-all">
      <button
        class="memo-clear-btn"
        @click="memoStore.clearAll()"
      >
        <span class="i-lucide:eraser size-4" />
        {{ $t('pages.preference.memo.labels.clearAll') }}
      </button>
      <span class="memo-count">{{ memoStore.items.length }} {{ $t('pages.preference.memo.labels.items') }}</span>
    </div>
  </ProList>
</template>

<style scoped>
.memo-manage-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.memo-manage-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  transition: background 0.15s;
}

.memo-manage-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.memo-manage-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
  white-space: pre-wrap;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-right: 12px;
}

.memo-delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 0.15s, background 0.15s;
}

.memo-delete-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.memo-clear-all {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.memo-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}

.memo-clear-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.memo-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}
</style>
