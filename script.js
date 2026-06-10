// DOM elements
const taskForm = document.getElementById('taskForm');
const taskInput = document.getElementById('taskInput');
const dueDateTime = document.getElementById('dueDateTime');
const taskList = document.getElementById('taskList');
const taskCountSpan = document.getElementById('taskCount');
const emptyMsg = document.getElementById('emptyMsg');
const filterBtns = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('themeToggle');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');

// Data
let tasks = [];
let filter = 'all';
let notificationSent = new Set(); // prevent duplicate notifications

// ── NOTIFICATION HELPERS ─────────────────────────────────────
function requestNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

function sendNotification(taskText, dueDisplay) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  
  const notification = new Notification('⏰ Task Due!', {
    body: `"${taskText}" is due ${dueDisplay}.`,
    icon: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' // optional, fallback
  });
  
  // Optional: focus the app when notification is clicked
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

function checkDueDatesAndNotify() {
  if (!tasks.length) return;
  const now = new Date();
  const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
  
  tasks.forEach(task => {
    if (!task.due || task.completed) return;
    const dueDate = new Date(task.due);
    // Notify if due within the next minute AND not already notified
    if (dueDate <= oneMinuteFromNow && dueDate >= now && !notificationSent.has(task.id)) {
      const formatted = formatDueDate(task.due);
      const dueText = formatted ? formatted.display : 'now';
      sendNotification(task.text, dueText);
      notificationSent.add(task.id);
    }
    // Optional: also notify if already overdue but never notified? skip to avoid spam
  });
}

// ── FORMAT DUE DATE (SAME AS BEFORE) ─────────────────────────
function formatDueDate(isoString) {
  if (!isoString) return null;
  const due = new Date(isoString);
  const now = new Date();
  const isOverdue = due < now && !isNaN(due);
  const today = new Date();
  today.setHours(0,0,0,0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let dateStr;
  if (due.toDateString() === today.toDateString()) dateStr = 'Today';
  else if (due.toDateString() === tomorrow.toDateString()) dateStr = 'Tomorrow';
  else dateStr = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  
  const timeStr = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return { display: `${dateStr} at ${timeStr}`, isOverdue };
}

// ── SAVE / LOAD TASKS ────────────────────────────────────────
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
  const data = localStorage.getItem('tasks');
  if (data) tasks = JSON.parse(data);
  else tasks = [];
  // reset notification tracking after load (only for new session)
  notificationSent.clear();
  // also remove old task ids from set that no longer exist
  const taskIds = new Set(tasks.map(t => t.id));
  for (let id of notificationSent) {
    if (!taskIds.has(id)) notificationSent.delete(id);
  }
}

// ── CREATE TASK OBJECT ───────────────────────────────────────
function createTask(text, dueISO) {
  return {
    id: Date.now().toString(),
    text: text.trim(),
    due: dueISO || null,
    completed: false,
  };
}

// ── SORTING ──────────────────────────────────────────────────
function sortTasks(taskArray) {
  return [...taskArray].sort((a,b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;
    if (!b.due) return -1;
    return new Date(a.due) - new Date(b.due);
  });
}

// ── FILTER ───────────────────────────────────────────────────
function getFilteredTasks() {
  let filtered = tasks;
  if (filter === 'active') filtered = tasks.filter(t => !t.completed);
  if (filter === 'completed') filtered = tasks.filter(t => t.completed);
  return sortTasks(filtered);
}

// ── EDIT TASK ────────────────────────────────────────────────
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const newText = prompt('Edit task:', task.text);
  if (newText !== null && newText.trim() !== '') {
    task.text = newText.trim();
    saveTasks();
    render();
  }
}

// ── DELETE ───────────────────────────────────────────────────
function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  notificationSent.delete(id);
  saveTasks();
  render();
}

// ── TOGGLE COMPLETE ──────────────────────────────────────────
function toggleComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    // if completed, remove from notification set to allow re-notification if reopened later
    if (task.completed) notificationSent.delete(id);
    saveTasks();
    render();
  }
}

// ── CLEAR COMPLETED ──────────────────────────────────────────
function clearCompleted() {
  const completedIds = tasks.filter(t => t.completed).map(t => t.id);
  tasks = tasks.filter(t => !t.completed);
  completedIds.forEach(id => notificationSent.delete(id));
  saveTasks();
  render();
}

// ── RENDER ───────────────────────────────────────────────────
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.completed ? 'completed' : ''}`;
  li.dataset.id = task.id;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'task-content';
  
  const textSpan = document.createElement('span');
  textSpan.className = 'task-text';
  textSpan.textContent = task.text;
  textSpan.addEventListener('click', () => toggleComplete(task.id));
  contentDiv.appendChild(textSpan);
  
  if (task.due) {
    const dueInfo = formatDueDate(task.due);
    if (dueInfo) {
      const dueSpan = document.createElement('div');
      dueSpan.className = `task-due ${dueInfo.isOverdue ? 'overdue' : ''}`;
      dueSpan.innerHTML = `📅 ${dueInfo.display}`;
      if (dueInfo.isOverdue) dueSpan.innerHTML += ` (overdue)`;
      contentDiv.appendChild(dueSpan);
    }
  }
  
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'task-actions';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'edit-btn';
  editBtn.textContent = '✏️';
  editBtn.title = 'Edit task';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editTask(task.id);
  });
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '✕';
  deleteBtn.title = 'Delete task';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deleteTask(task.id);
  });
  
  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);
  
  li.appendChild(contentDiv);
  li.appendChild(actionsDiv);
  return li;
}

function render() {
  taskList.innerHTML = '';
  const visible = getFilteredTasks();
  
  visible.forEach(task => {
    taskList.appendChild(createTaskElement(task));
  });
  
  const activeCount = tasks.filter(t => !t.completed).length;
  taskCountSpan.textContent = `${activeCount} task${activeCount !== 1 ? 's' : ''} left`;
  emptyMsg.style.display = visible.length === 0 ? 'block' : 'none';
}

// ── ADD TASK ─────────────────────────────────────────────────
function addTask(text, dueISO) {
  if (!text.trim()) return;
  const newTask = createTask(text, dueISO);
  tasks.unshift(newTask);
  saveTasks();
  render();
}

// ── DARK MODE ────────────────────────────────────────────────
function loadTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    themeToggle.textContent = '🌙';
  }
}
function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
}

// ── START REMINDER CHECKER (every 60 seconds) ─────────────────
let reminderInterval = null;
function startReminderChecker() {
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = setInterval(() => {
    checkDueDatesAndNotify();
  }, 60 * 1000); // check every minute
}

// ── EVENT LISTENERS ──────────────────────────────────────────
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = taskInput.value;
  const due = dueDateTime.value;
  addTask(text, due);
  taskInput.value = '';
  dueDateTime.value = '';
  taskInput.focus();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

clearCompletedBtn.addEventListener('click', clearCompleted);
themeToggle.addEventListener('click', toggleTheme);

// ── INITIALISATION ───────────────────────────────────────────
loadTasks();
loadTheme();
render();
requestNotificationPermission();
startReminderChecker();
// Also run an initial check immediately (for tasks due within the next minute)
setTimeout(() => checkDueDatesAndNotify(), 2000);