
"use strict";

const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = "devtrack-tasks-v2";
const STATUSES = ["Backlog", "In Progress", "In Review", "Completed"];

const modal = $("#taskModal");
const form = $("#taskForm");
const titleInput = $("#taskTitle");
const descriptionInput = $("#taskDescription");
const statusInput = $("#taskStatus");
const dateInput = $("#taskDueDate");
const searchInput = $("#globalSearch");
const errorMessage = $("#formError");

const columns = [...document.querySelectorAll(".kanban-column")];

const today = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

dateInput.min = today();

// Sample data is used only on the first visit.
const sampleTasks = [
  { id: "sample-1", title: "Plan dashboard layout", description: "Define sections and page structure.", status: "Backlog", dueDate: "" },
  { id: "sample-2", title: "Define project milestones", description: "Break work into small phases.", status: "Backlog", dueDate: "" },
  { id: "sample-3", title: "Build dashboard structure", description: "Create semantic HTML and responsive layout.", status: "In Progress", dueDate: "" },
  { id: "sample-4", title: "Practice JavaScript DOM", description: "Learn selectors and events.", status: "In Progress", dueDate: "" },
  { id: "sample-5", title: "Check responsive layout", description: "Test on desktop and mobile.", status: "In Review", dueDate: "" },
  { id: "sample-6", title: "Create GitHub repository", description: "Track project changes with Git.", status: "Completed", dueDate: "" }
];

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return sampleTasks;

    const data = JSON.parse(saved);

    if (!Array.isArray(data)) throw new Error("Invalid saved task data");

    return data.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      STATUSES.includes(task.status)
    );
  } catch (error) {
    console.error("Could not load tasks:", error);
    alert("Saved tasks could not be read. Check the browser console.");
    return sampleTasks;
  }
}

let tasks = loadTasks();
let activity = ["DevTrack workspace opened."];

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error("Could not save tasks:", error);
    alert("Could not save changes. Browser storage may be full or disabled.");
    return false;
  }
}

function recordActivity(message) {
  activity.unshift(message);
  activity = activity.slice(0, 5);
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

// Build a card safely using textContent, not HTML strings.
function createTaskCard(task) {
  const card = makeElement("article", "task-card");
  card.dataset.id = task.id;

  card.append(makeElement("h4", "", task.title));

  const badgeClass = {
    "Backlog": "status-backlog",
    "In Progress": "status-progress",
    "In Review": "status-review",
    "Completed": "status-completed"
  }[task.status];

  card.append(makeElement("span", `status-badge ${badgeClass}`, task.status));

  if (task.description) {
    card.append(makeElement("p", "", task.description));
  }

  if (task.dueDate) {
    const time = makeElement("time", "", `Due ${task.dueDate}`);
    time.dateTime = task.dueDate;
    card.append(time);
  }

  const select = makeElement("select", "task-status-select");
  select.setAttribute("aria-label", `Status for ${task.title}`);

  STATUSES.forEach(status => {
    const option = makeElement("option", "", status);
    option.value = status;
    select.append(option);
  });

  select.value = task.status;
  card.append(select);

  const removeButton = makeElement("button", "delete-task", "Delete");
  removeButton.type = "button";
  removeButton.setAttribute("aria-label", `Delete ${task.title}`);
  card.append(removeButton);

  return card;
}

function renderBoard() {
  const query = searchInput.value.trim().toLowerCase();
  let visibleCount = 0;

  columns.forEach(column => {
    const status = column.dataset.status;
    const list = column.querySelector(".task-list");
    const empty = column.querySelector(".empty-state");

    list.replaceChildren();

    const matching = tasks.filter(task => {
      const text = `${task.title} ${task.description}`.toLowerCase();
      return task.status === status && text.includes(query);
    });

    matching.forEach(task => list.append(createTaskCard(task)));

    column.querySelector(".column-count").textContent = matching.length;
    empty.hidden = matching.length > 0 || query.length > 0;
    visibleCount += matching.length;
  });

  $("#searchEmpty").hidden = !query || visibleCount > 0;
  $("#taskTotal").textContent = `${tasks.length} task${tasks.length === 1 ? "" : "s"}`;
}

function renderStatistics() {
  const completed = tasks.filter(task => task.status === "Completed").length;
  const active = tasks.filter(task =>
    ["In Progress", "In Review"].includes(task.status)
  ).length;

  const rate = tasks.length ? Math.round(completed / tasks.length * 100) : 0;

  $("#totalProjects").textContent =
    document.querySelectorAll(".project-card").length;
  $("#activeTasks").textContent = active;
  $("#completedTasks").textContent = completed;
  $("#completionRate").textContent = `${rate}%`;
  $("#analyticsText").textContent = `${rate}% of tasks completed`;
  $("#analyticsProgress").value = rate;
}

function renderDeadlines() {
  const list = $("#deadlineList");
  list.replaceChildren();

  const upcoming = tasks
    .filter(task => task.dueDate && task.status !== "Completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  if (!upcoming.length) {
    list.append(makeElement("li", "muted", "No upcoming deadlines."));
    return;
  }

  upcoming.forEach(task => {
    list.append(makeElement("li", "", `${task.title} — ${task.dueDate}`));
  });
}

function renderActivity() {
  const list = $("#activityList");
  list.replaceChildren();

  activity.forEach(message => list.append(makeElement("li", "", message)));
}

function render() {
  renderBoard();
  renderStatistics();
  renderDeadlines();
  renderActivity();
}

// Open and reset the creation form.
function openModal() {
  form.reset();
  errorMessage.textContent = "";
  dateInput.min = today();
  modal.showModal();
  titleInput.focus();
}

function closeModal() {
  modal.close();
  errorMessage.textContent = "";
}

$("#addTaskButton").addEventListener("click", openModal);
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);

form.addEventListener("submit", event => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const status = statusInput.value;
  const dueDate = dateInput.value;

  if (!title) {
    errorMessage.textContent = "Please enter a task title.";
    titleInput.focus();
    return;
  }

  if (!STATUSES.includes(status)) {
    errorMessage.textContent = "Please choose a valid status.";
    return;
  }

  if (dueDate && dueDate < today()) {
    errorMessage.textContent = "Due date cannot be in the past.";
    dateInput.focus();
    return;
  }

  const task = {
    id: crypto.randomUUID(),
    title,
    description,
    status,
    dueDate
  };

  tasks.push(task);

  if (!saveTasks()) {
    tasks.pop();
    return;
  }

  recordActivity(`Created task: ${title}`);
  render();
  closeModal();
});

// Search updates the board as the user types.
searchInput.addEventListener("input", renderBoard);

// One listener handles every task's status and delete controls.
$("#task-board").addEventListener("change", event => {
  if (!event.target.matches(".task-status-select")) return;

  const card = event.target.closest(".task-card");
  const task = tasks.find(item => item.id === card?.dataset.id);
  const newStatus = event.target.value;

  if (!task || !STATUSES.includes(newStatus)) return;

  const oldStatus = task.status;
  task.status = newStatus;

  if (!saveTasks()) {
    task.status = oldStatus;
    render();
    return;
  }

  recordActivity(`Moved "${task.title}" to ${newStatus}`);
  render();
});

$("#task-board").addEventListener("click", event => {
  const button = event.target.closest(".delete-task");
  if (!button) return;

  const card = button.closest(".task-card");
  const task = tasks.find(item => item.id === card?.dataset.id);
  if (!task) return;

  if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return;

  const oldTasks = tasks;
  tasks = tasks.filter(item => item.id !== task.id);

  if (!saveTasks()) {
    tasks = oldTasks;
    return;
  }

  recordActivity(`Deleted task: ${task.title}`);
  render();
});

// Close the dialog by clicking its backdrop.
modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

// Initial render.
render();
