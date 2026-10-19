
document.addEventListener("DOMContentLoaded", () => {
    const $ = (selector, parent = document) => parent.querySelector(selector);
    const $$ = (selector, parent = document) =>
        [...parent.querySelectorAll(selector)];

    const taskForm =
        $("#taskForm") ||
        $(".task-form") ||
        $("form");

    const taskInput =
        $("#taskInput") ||
        $("#taskTitle") ||
        $('.task-form input[type="text"]') ||
        $(".task-input-wrap input");

    const taskList =
        $("#taskList") ||
        $(".task-list") ||
        $("#tasksContainer");

    const searchInput =
        $("#taskSearch") ||
        $(".task-search") ||
        $('input[placeholder*="Search"]');

    const categoryInput =
        $("#taskCategory") ||
        $('select[name="category"]');

    const priorityInput =
        $("#taskPriority") ||
        $('select[name="priority"]');

    const dueDateInput =
        $("#taskDueDate") ||
        $('input[type="date"]');

    const sortInput =
        $("#taskSort") ||
        $(".sort-select select");

    const STORAGE_KEY = "my-codelab-todo-tasks-v1";

    let tasks = loadTasks();
    let activeFilter = "all";
    let activeCategory = "all";
    let editingId = null;

    function loadTasks() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    }

    function saveTasks() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        renderTasks();
        updateDashboard();
    }

    function makeId() {
        return Date.now().toString(36) +
            Math.random().toString(36).slice(2, 9);
    }

    function escapeHTML(value = "") {
        return String(value).replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function formatDate(dateString) {
        if (!dateString) return "No due date";

        const date = new Date(dateString + "T00:00:00");

        return date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }

    function isOverdue(task) {
        if (!task.dueDate || task.completed) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return new Date(task.dueDate + "T00:00:00") < today;
    }

    function getSelectedValue(element, fallback) {
        return element?.value?.trim() || fallback;
    }

    function getTaskText(task) {
        return task.title.toLowerCase();
    }

    function renderTasks() {
        if (!taskList) return;

        const search = searchInput?.value.trim().toLowerCase() || "";

        let visibleTasks = tasks.filter(task => {
            const matchesSearch =
                getTaskText(task).includes(search) ||
                String(task.category || "").toLowerCase().includes(search);

            const matchesFilter =
                activeFilter === "all" ||
                (activeFilter === "active" && !task.completed) ||
                (activeFilter === "completed" && task.completed) ||
                (activeFilter === "pending" && !task.completed) ||
                (activeFilter === "overdue" && isOverdue(task));

            const matchesCategory =
                activeCategory === "all" ||
                task.category === activeCategory;

            return matchesSearch && matchesFilter && matchesCategory;
        });

        const sortValue = sortInput?.value || "newest";

        visibleTasks.sort((a, b) => {
            if (sortValue === "oldest") return a.createdAt - b.createdAt;
            if (sortValue === "alphabetical") {
                return a.title.localeCompare(b.title);
            }
            if (sortValue === "dueDate") {
                return (a.dueDate || "9999-12-31")
                    .localeCompare(b.dueDate || "9999-12-31");
            }
            if (sortValue === "priority") {
                const rank = { high: 0, medium: 1, low: 2 };
                return (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3);
            }

            return b.createdAt - a.createdAt;
        });

        if (!visibleTasks.length) {
            const hasTasks = tasks.length > 0;

            taskList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${hasTasks ? "🔎" : "✓"}</div>
          <h3>${hasTasks ? "No matching tasks" : "Your task list is empty"}</h3>
          <p>${hasTasks
                    ? "Try another search or filter."
                    : "Add your first task to get started."}</p>
        </div>
      `;
            updateTaskCount(0);
            return;
        }

        taskList.innerHTML = visibleTasks.map(task => {
            const priority = ["low", "medium", "high"].includes(task.priority)
                ? task.priority
                : "medium";

            return `
        <article class="task-item ${task.completed ? "completed" : ""}"
          data-task-id="${escapeHTML(task.id)}">
          <label class="task-check">
            <input type="checkbox" data-action="toggle"
              ${task.completed ? "checked" : ""}
              aria-label="Mark ${escapeHTML(task.title)} as complete">
            <span class="checkmark"></span>
          </label>

          <div class="task-content">
            <h3 class="task-title">${escapeHTML(task.title)}</h3>
            <div class="task-meta">
              <span class="task-category">${escapeHTML(task.category || "General")}</span>
              <span class="task-priority ${priority}">
                ${escapeHTML(priority)}
              </span>
              <span class="task-due-date ${isOverdue(task) ? "overdue" : ""}">
                ${escapeHTML(formatDate(task.dueDate))}
                ${isOverdue(task) ? " · Overdue" : ""}
              </span>
            </div>
          </div>

          <div class="task-actions">
            <button type="button" data-action="edit"
              aria-label="Edit task" title="Edit task">✎</button>
            <button type="button" data-action="delete"
              aria-label="Delete task" title="Delete task">×</button>
          </div>
        </article>
      `;
        }).join("");

        updateTaskCount(visibleTasks.length);
    }

    function updateTaskCount(count) {
        $$(".task-count-badge, #taskCount, [data-task-count]").forEach(el => {
            el.textContent = count;
        });

        const footer = $(".task-list-footer");
        if (footer) {
            footer.textContent =
                `${count} task${count === 1 ? "" : "s"} shown`;
        }
    }

    function updateDashboard() {
        const total = tasks.length;

        const completed = tasks.filter(task => task.completed).length;

        const pending = total - completed;

        const percent = total > 0
            ? Math.round((completed / total) * 100)
            : 0;

        // Update the percentage inside your circle
        const progressPercent = document.getElementById("progressPercent");

        if (progressPercent) {
            progressPercent.textContent = `${percent}%`;
        }

        // Update the circular progress indicator
        const progressCircle = document.getElementById("progressCircle");

        if (progressCircle) {
            progressCircle.style.background = `
            conic-gradient(
                var(--primary, #635bff) ${percent}%,
                #e9eaf2 ${percent}%
            )
        `;

            progressCircle.setAttribute(
                "aria-label",
                `${percent} percent complete`
            );
        }

        // Update task statistics
        const statistics = {
            "#totalTasks": total,
            "#completedTasks": completed,
            "#pendingTasks": pending
        };

        Object.entries(statistics).forEach(([selector, value]) => {
            document.querySelectorAll(selector).forEach(element => {
                element.textContent = value;
            });
        });

        // Update progress bars
        document.querySelectorAll(".progress-bar-fill").forEach(bar => {
            bar.style.width = `${percent}%`;
        });

        // Update completion labels
        document.querySelectorAll(".progress-label").forEach(label => {
            label.textContent = `${completed} of ${total} completed`;
        });
    }

    function resetForm() {
        taskForm?.reset();
        editingId = null;

        const submitButton = taskForm?.querySelector(
            'button[type="submit"], button:not([type])'
        );

        if (submitButton) {
            submitButton.textContent = "Add Task";
            submitButton.removeAttribute("data-editing");
        }

        const cancelButton = $("#cancelEdit");
        if (cancelButton) cancelButton.hidden = true;
    }

    function addOrUpdateTask(event) {
        event.preventDefault();

        const title = taskInput?.value.trim();

        if (!title) {
            taskInput?.focus();
            taskInput?.setCustomValidity("Please enter a task name.");
            taskInput?.reportValidity();
            return;
        }

        taskInput.setCustomValidity("");

        const taskData = {
            title,
            category: getSelectedValue(categoryInput, "General"),
            priority: getSelectedValue(priorityInput, "medium").toLowerCase(),
            dueDate: dueDateInput?.value || ""
        };

        if (editingId) {
            tasks = tasks.map(task =>
                task.id === editingId
                    ? { ...task, ...taskData }
                    : task
            );
        } else {
            tasks.unshift({
                id: makeId(),
                ...taskData,
                completed: false,
                createdAt: Date.now()
            });
        }

        resetForm();
        saveTasks();
    }

    if (taskForm && taskInput) {
        taskForm.addEventListener("submit", addOrUpdateTask);
        taskInput.addEventListener("input", () => {
            taskInput.setCustomValidity("");
        });
    }

    taskList?.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;

        const item = button.closest("[data-task-id]");
        if (!item) return;

        const id = item.dataset.taskId;
        const task = tasks.find(entry => entry.id === id);
        if (!task) return;

        const action = button.dataset.action;

        if (action === "delete") {
            if (!confirm(`Delete "${task.title}"?`)) return;

            tasks = tasks.filter(entry => entry.id !== id);

            if (editingId === id) resetForm();

            saveTasks();
        }

        if (action === "edit") {
            if (!taskForm || !taskInput) {
                alert("Add a task form with a task title input to edit tasks.");
                return;
            }

            editingId = id;
            taskInput.value = task.title;

            if (categoryInput) categoryInput.value = task.category || "General";
            if (priorityInput) priorityInput.value = task.priority || "medium";
            if (dueDateInput) dueDateInput.value = task.dueDate || "";

            const submitButton = taskForm.querySelector(
                'button[type="submit"], button:not([type])'
            );

            if (submitButton) submitButton.textContent = "Save Changes";

            const cancelButton = $("#cancelEdit");
            if (cancelButton) cancelButton.hidden = false;

            taskInput.focus();
            taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });

    taskList?.addEventListener("change", event => {
        const checkbox = event.target.closest('[data-action="toggle"]');
        if (!checkbox) return;

        const item = checkbox.closest("[data-task-id]");
        const task = tasks.find(entry => entry.id === item?.dataset.taskId);
        if (!task) return;

        task.completed = checkbox.checked;
        saveTasks();
    });

    $("#cancelEdit")?.addEventListener("click", resetForm);

    searchInput?.addEventListener("input", renderTasks);
    sortInput?.addEventListener("change", renderTasks);

    $$(".filter-btn, [data-filter]").forEach(button => {
        button.addEventListener("click", () => {
            activeFilter =
                button.dataset.filter ||
                button.dataset.status ||
                button.getAttribute("data-filter") ||
                "all";

            $$(".filter-btn, [data-filter]").forEach(btn => {
                btn.classList.remove("active");
                btn.setAttribute("aria-pressed", "false");
            });

            button.classList.add("active");
            button.setAttribute("aria-pressed", "true");
            renderTasks();
        });
    });

    $$("[data-category-filter]").forEach(button => {
        button.addEventListener("click", () => {
            activeCategory = button.dataset.categoryFilter || "all";

            $$("[data-category-filter]").forEach(btn => {
                btn.classList.toggle("active", btn === button);
            });

            renderTasks();
        });
    });


    // Clear completed tasks
    const clearCompletedButton = document.getElementById("clearCompleted");

    if (clearCompletedButton) {
        clearCompletedButton.addEventListener("click", function () {
            const completedCount = tasks.filter(task => task.completed).length;

            if (completedCount === 0) {
                alert("There are no completed tasks to clear!");
                return;
            }

            const confirmClear = confirm(
                `Delete ${completedCount} completed task(s)?`
            );

            if (!confirmClear) return;

            tasks = tasks.filter(task => !task.completed);

            saveTasks();

           
        });
    }


    // Clear all tasks
    const clearAllButton = document.getElementById("clearAllTask");

    if (clearAllButton) {
        clearAllButton.addEventListener("click", function () {
            if (tasks.length === 0) {
                alert("Your task list is already empty!");
                return;
            }

            const confirmClear = confirm(
                "Are you sure you want to delete ALL tasks? This cannot be undone."
            );

            if (!confirmClear) return;

            tasks = [];

            saveTasks();

           
        });
    }

    $("#exportTasks")?.addEventListener("click", () => {
        const blob = new Blob(
            [JSON.stringify(tasks, null, 2)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "my-codelab-tasks.json";
        link.click();

        URL.revokeObjectURL(url);
    });

    $("#importTasks")?.addEventListener("change", async event => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const imported = JSON.parse(await file.text());

            if (!Array.isArray(imported)) {
                throw new Error("The file must contain a task list.");
            }

            const validTasks = imported
                .filter(task => task && typeof task.title === "string")
                .map(task => ({
                    id: makeId(),
                    title: task.title.trim(),
                    category: task.category || "General",
                    priority: ["low", "medium", "high"].includes(task.priority)
                        ? task.priority
                        : "medium",
                    dueDate: task.dueDate || "",
                    completed: Boolean(task.completed),
                    createdAt: Date.now()
                }))
                .filter(task => task.title);

            if (!confirm(`Import ${validTasks.length} task(s)?`)) return;

            tasks = [...validTasks, ...tasks];
            saveTasks();
        } catch {
            alert("Could not import this file. Please select a valid task export.");
        } finally {
            event.target.value = "";
        }
    });

    const menuToggle =
        $("#menuToggle") ||
        $(".menu-toggle") ||
        $(".navbar-toggle");

    const mobileMenu =
        $("#navLinks") ||
        $(".nav-links") ||
        $(".navbar-links");

    menuToggle?.addEventListener("click", () => {
        const open = mobileMenu?.classList.toggle("open") || false;

        menuToggle.classList.toggle("active", open);
        menuToggle.setAttribute("aria-expanded", String(open));
    });

    $$(".nav-links a, .navbar-links a").forEach(link => {
        link.addEventListener("click", () => {
            mobileMenu?.classList.remove("open");
            menuToggle?.classList.remove("active");
            menuToggle?.setAttribute("aria-expanded", "false");
        });
    });

    $$("[data-theme-toggle], #themeToggle, .theme-toggle").forEach(button => {
        button.addEventListener("click", () => {
            const current = document.documentElement.dataset.theme ||
                document.body.dataset.theme ||
                "light";

            const next = current === "dark" ? "light" : "dark";

            document.documentElement.dataset.theme = next;
            document.body.dataset.theme = next;
            localStorage.setItem("my-codelab-todo-theme", next);
        });
    });

    const savedTheme = localStorage.getItem("my-codelab-todo-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
        document.documentElement.dataset.theme = savedTheme;
        document.body.dataset.theme = savedTheme;
    }

    $$("[data-scroll-to]").forEach(button => {
        button.addEventListener("click", () => {
            const target = $(button.dataset.scrollTo);
            target?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    $("#currentYear")?.replaceChildren(
        document.createTextNode(String(new Date().getFullYear()))
    );

    renderTasks();
    updateDashboard();
});
