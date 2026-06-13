document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("log-search");
    const filterSelect = document.getElementById("log-filter");
    const refreshBtn = document.getElementById("refresh-logs");
    const clearBtn = document.getElementById("clear-logs");

    loadLogs();

    let debounceTimer;
    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadLogs, 250);
    });

    filterSelect.addEventListener("change", loadLogs);
    refreshBtn.addEventListener("click", loadLogs);

    clearBtn.addEventListener("click", async () => {
        if (!confirm("Clear all attack logs? This cannot be undone.")) return;
        try {
            await fetch("/api/logs/clear", { method: "POST" });
            showToast("Logs cleared", "success");
            loadLogs();
        } catch (err) {
            showToast("Failed to clear logs", "error");
        }
    });

    async function loadLogs() {
        const search = encodeURIComponent(searchInput.value.trim());
        const event = encodeURIComponent(filterSelect.value);

        const exportLink = document.getElementById("export-logs");
        if (exportLink) {
            exportLink.href = `/api/logs/export?search=${search}&event=${event}`;
        }

        try {
            const res = await fetch(`/api/logs?search=${search}&event=${event}`);
            const data = await res.json();
            renderLogs(data.logs);
            updateFilterOptions(data.event_types);
        } catch (err) {
            showToast("Failed to load logs", "error");
        }
    }

    function updateFilterOptions(eventTypes) {
        const current = filterSelect.value;
        const existing = Array.from(filterSelect.options).map((o) => o.value);
        const hasNew = eventTypes.some((e) => !existing.includes(e));
        if (!hasNew) return;

        filterSelect.innerHTML = '<option value="">All events</option>';
        eventTypes.forEach((e) => {
            const opt = document.createElement("option");
            opt.value = e;
            opt.textContent = e;
            filterSelect.appendChild(opt);
        });
        filterSelect.value = current;
    }

    function renderLogs(logs) {
        const tbody = document.getElementById("logs-body");
        const countEl = document.getElementById("logs-count");
        tbody.innerHTML = "";

        if (!logs.length) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4" class="muted">No log entries found.</td></tr>';
            countEl.textContent = "";
            return;
        }

        logs.forEach((log) => {
            const tr = document.createElement("tr");

            const tdTime = document.createElement("td");
            tdTime.className = "timestamp";
            tdTime.textContent = log.timestamp;

            const tdUser = document.createElement("td");
            tdUser.textContent = log.username;

            const tdEvent = document.createElement("td");
            tdEvent.textContent = log.event;

            const tdResult = document.createElement("td");
            const pill = document.createElement("span");
            pill.className = "result-pill " + resultClass(log.result);
            pill.textContent = log.result;
            tdResult.appendChild(pill);

            tr.append(tdTime, tdUser, tdEvent, tdResult);
            tbody.appendChild(tr);
        });

        countEl.textContent = `Showing ${logs.length} log entr${logs.length === 1 ? "y" : "ies"}.`;
    }

    function resultClass(result) {
        const lower = result.toLowerCase();
        if (lower.includes("success") || lower.includes("found")) return "result-success";
        if (lower.includes("fail") || lower.includes("denied") || lower.includes("blocked") || lower.includes("locked")) return "result-failure";
        if (lower.includes("required") || lower.includes("started") || lower.includes("triggered")) return "result-warning";
        return "result-neutral";
    }
});