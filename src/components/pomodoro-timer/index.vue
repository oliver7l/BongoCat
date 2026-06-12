<script setup lang="ts">
import { usePomodoroStore } from '@/stores/pomodoro'

const pomodoroStore = usePomodoroStore()

const phaseLabels: Record<string, string> = {
  work: '🍅',
  shortBreak: '☕',
  longBreak: '🌴',
}
</script>

<template>
  <Transition name="popup-slide">
    <div
      v-if="pomodoroStore.showPopover"
      class="pomodoro-popup"
    >
      <div class="popup-header">
        <span class="popup-title">{{ phaseLabels[pomodoroStore.currentPhase] }} {{ pomodoroStore.formattedTime }}</span>
        <button
          class="popup-close"
          @click="pomodoroStore.showPopover = false"
        >
          <span class="i-lucide:x size-3.5" />
        </button>
      </div>

      <div
        class="progress-bar"
        :style="{ width: pomodoroStore.progress + '%' }"
      />

      <div class="popup-body">
        <div class="timer-display">
          <span class="time-text">{{ pomodoroStore.formattedTime }}</span>
        </div>

        <div class="timer-controls">
          <button
            class="ctrl-btn primary"
            @click="pomodoroStore.toggle"
          >
            {{ pomodoroStore.isRunning ? '⏸ 暂停' : '▶ 开始' }}
          </button>
          <button
            class="ctrl-btn"
            @click="pomodoroStore.nextPhase"
          >
            ⏭ 跳过
          </button>
        </div>

        <div class="session-row">
          <span
            v-for="i in pomodoroStore.settings.longBreakInterval"
            :key="i"
            class="session-dot"
            :class="{ completed: i <= pomodoroStore.currentSession - 1 }"
          >
            🍅
          </span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pomodoro-popup {
  position: fixed;
  bottom: 76px;
  right: 12px;
  width: 220px;
  background: rgba(20, 20, 28, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  color: #e8e8ed;
  font-size: 12px;
  z-index: 999;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
}

.popup-title {
  font-weight: 600;
  font-size: 12px;
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

.progress-bar {
  height: 2px;
  background: rgba(99, 102, 241, 0.7);
  transition: width 0.5s linear;
}

.popup-body {
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timer-display {
  text-align: center;
}

.time-text {
  font-size: 32px;
  font-weight: bold;
  font-family: monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

.timer-controls {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.ctrl-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.15s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.ctrl-btn.primary {
  background: rgba(99, 102, 241, 0.4);
  border-color: rgba(99, 102, 241, 0.3);
}

.ctrl-btn.primary:hover {
  background: rgba(99, 102, 241, 0.6);
}

.session-row {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.session-dot {
  font-size: 11px;
  opacity: 0.3;
  transition: opacity 0.3s;
}

.session-dot.completed {
  opacity: 1;
}

/* Same slide animation as memo popup */
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
