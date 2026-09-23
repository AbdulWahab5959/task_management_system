/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "task-priority-badge--low",
    "task-priority-badge--medium",
    "task-priority-badge--high",
    "task-priority-badge--urgent",
    "task-priority-select--low",
    "task-priority-select--medium",
    "task-priority-select--high",
    "task-priority-select--urgent",
    "task-status-select--todo",
    "task-status-select--in_progress",
    "task-status-select--done",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

