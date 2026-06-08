// ── SELECT ELEMENTS ──────────────────────────────────────────
const taskForm   = document.getElementById('taskForm')
const taskInput  = document.getElementById('taskInput')
const taskList   = document.getElementById('taskList')
const taskCount  = document.getElementById('taskCount')
const emptyMsg   = document.getElementById('emptyMsg')
const filterBtns = document.querySelectorAll('.filter-btn')

// ── DATA ─────────────────────────────────────────────────────
let tasks  = []       // the ONE source of truth — all tasks live here
let filter = 'all'    // current filter: 'all', 'active', or 'completed'

// ── SAVE AND LOAD ────────────────────────────────────────────
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks))
}

function loadTasks() {
  const data = localStorage.getItem('tasks')
  if (data) {
    tasks = JSON.parse(data)
  }
}

// ── CREATE A TASK OBJECT ─────────────────────────────────────
function createTask(text) {
  return {
    id:        Date.now().toString(),
    text:      text,
    completed: false,
  }
}

// ── FILTER HELPER ────────────────────────────────────────────
function getFilteredTasks() {
  if (filter === 'active') {
    return tasks.filter(task => !task.completed)
  }
  if (filter === 'completed') {
    return tasks.filter(task => task.completed)
  }
  return tasks
}

// ── BUILD ONE TASK ELEMENT ───────────────────────────────────
function createTaskElement(task) {
  const li = document.createElement('li')
  li.className = 'task-item' + (task.completed ? ' completed' : '')
  li.dataset.id = task.id

  const span = document.createElement('span')
  span.className   = 'task-text'
  span.textContent = task.text
  span.addEventListener('click', () => toggleComplete(task.id))

  const deleteBtn = document.createElement('button')
  deleteBtn.className   = 'delete-btn'
  deleteBtn.textContent = '✕'
  deleteBtn.addEventListener('click', () => deleteTask(task.id))

  li.appendChild(span)
  li.appendChild(deleteBtn)
  return li
}

// ── RENDER ───────────────────────────────────────────────────
function render() {
  taskList.innerHTML = ''
  const visible = getFilteredTasks()

  visible.forEach(task => {
    const li = createTaskElement(task)
    taskList.appendChild(li)
  })

  emptyMsg.style.display = visible.length === 0 ? 'block' : 'none'

  const active = tasks.filter(t => !t.completed).length
  taskCount.textContent = `${active} task${active !== 1 ? 's' : ''} left`
}

// ── ADD TASK ─────────────────────────────────────────────────
function addTask(text) {
  if (!text) return
  const newTask = createTask(text)
  tasks.unshift(newTask)
  saveTasks()
  render()
}

// ── DELETE TASK ──────────────────────────────────────────────
function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id)
  saveTasks()
  render()
}

// ── TOGGLE COMPLETE ──────────────────────────────────────────
function toggleComplete(id) {
  const task = tasks.find(task => task.id === id)
  if (task) {
    task.completed = !task.completed
    saveTasks()
    render()
  }
}

// ── EVENTS ───────────────────────────────────────────────────
taskForm.addEventListener('submit', (event) => {
  event.preventDefault()
  const text = taskInput.value.trim()
  addTask(text)
  taskInput.value = ''
})

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter
    filterBtns.forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    render()
  })
})

// ── STARTUP ──────────────────────────────────────────────────
loadTasks()
render()