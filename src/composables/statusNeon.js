const neonByStatus = {
  inbox: {
    border: 'border-l-indigo-400',
    dot: 'bg-indigo-400 shadow-[0_0_10px_rgb(129_140_248/0.75)]',
    header: 'neon-group-header neon-inbox',
    thead: 'neon-thead neon-inbox',
    row: 'neon-row neon-inbox',
    rowAlt: 'neon-row-alt neon-inbox',
    badge: 'neon-count neon-inbox',
    location: 'neon-location neon-inbox',
    iconBtn: 'neon-icon-btn neon-inbox',
    subtaskPanel: 'neon-subtask-panel neon-inbox',
    title: 'neon-title neon-inbox',
  },
  todo: {
    border: 'border-l-violet-400',
    dot: 'bg-violet-400 shadow-[0_0_10px_rgb(167_139_250/0.75)]',
    header: 'neon-group-header neon-todo',
    thead: 'neon-thead neon-todo',
    row: 'neon-row neon-todo',
    rowAlt: 'neon-row-alt neon-todo',
    badge: 'neon-count neon-todo',
    location: 'neon-location neon-todo',
    iconBtn: 'neon-icon-btn neon-todo',
    subtaskPanel: 'neon-subtask-panel neon-todo',
    title: 'neon-title neon-todo',
  },
  in_progress: {
    border: 'border-l-cyan-400',
    dot: 'bg-cyan-400 shadow-[0_0_10px_rgb(34_211_238/0.75)]',
    header: 'neon-group-header neon-progress',
    thead: 'neon-thead neon-progress',
    row: 'neon-row neon-progress',
    rowAlt: 'neon-row-alt neon-progress',
    badge: 'neon-count neon-progress',
    location: 'neon-location neon-progress',
    iconBtn: 'neon-icon-btn neon-progress',
    subtaskPanel: 'neon-subtask-panel neon-progress',
    title: 'neon-title neon-progress',
  },
  done: {
    border: 'border-l-emerald-400',
    dot: 'bg-emerald-400 shadow-[0_0_10px_rgb(52_211_153/0.75)]',
    header: 'neon-group-header neon-done',
    thead: 'neon-thead neon-done',
    row: 'neon-row neon-done',
    rowAlt: 'neon-row-alt neon-done',
    badge: 'neon-count neon-done',
    location: 'neon-location neon-done',
    iconBtn: 'neon-icon-btn neon-done',
    subtaskPanel: 'neon-subtask-panel neon-done',
    title: 'neon-title neon-done',
  },
  archived: {
    border: 'border-l-fuchsia-400/60',
    dot: 'bg-fuchsia-400/70 shadow-[0_0_8px_rgb(232_121_249/0.5)]',
    header: 'neon-group-header neon-archived',
    thead: 'neon-thead neon-archived',
    row: 'neon-row neon-archived',
    rowAlt: 'neon-row-alt neon-archived',
    badge: 'neon-count neon-archived',
    location: 'neon-location neon-archived',
    iconBtn: 'neon-icon-btn neon-archived',
    subtaskPanel: 'neon-subtask-panel neon-archived',
    title: 'neon-title neon-archived',
  },
}

export function getStatusNeon(status) {
  return neonByStatus[status] || neonByStatus.todo
}

export function getStatusNeonClass(status) {
  const map = {
    inbox: 'neon-inbox',
    todo: 'neon-todo',
    in_progress: 'neon-progress',
    done: 'neon-done',
    archived: 'neon-archived',
  }

  return map[status] || 'neon-todo'
}
