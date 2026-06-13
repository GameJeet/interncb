let latestStats = null;

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch("/api/stats");
        const stats = await res.json();
        latestStats = stats;
        renderCounters(stats);
        drawOutcomesChart(stats);
        drawDefenseChart(stats);
        renderThreatLevel(stats);
    } catch (err) {
        showToast("Could not load dashboard stats", "error");
    }
});

// Redraw the canvas charts (which use hard-coded colors, not CSS
// variables) whenever the light/dark theme is toggled.
document.addEventListener("authlab:theme-change", () => {
    if (!latestStats) return;
    drawOutcomesChart(latestStats);
    drawDefenseChart(latestStats);
});

 
/* Theme-aware canvas colors                                              */
 
function themeColors() {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    return {
        text: isLight ? "#16213a" : "#e8f1ff",
        muted: isLight ? "#5b6b85" : "#8a9bb5",
        grid: isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.08)",
    };
}

 
/* Threat level meter                                                     */
 
function renderThreatLevel(stats) {
    const marker = document.getElementById("threat-marker");
    const badge = document.getElementById("threat-badge");
    const desc = document.getElementById("threat-desc");
    if (!marker || !badge) return;

    const score = stats.threat_score || 0;

    let level, position, description;
    if (score === 0) {
        level = "low";
        position = 6;
        description = "No suspicious activity detected yet.";
    } else if (score <= 5) {
        level = "elevated";
        position = 31;
        description = "Minor activity detected — a few failed logins or defense triggers.";
    } else if (score <= 15) {
        level = "high";
        position = 56;
        description = "Notable activity — repeated failures, CAPTCHA triggers or attack simulations.";
    } else {
        level = "critical";
        position = 81;
        description = "Heavy activity detected — multiple attacks and/or account lockouts have occurred.";
    }

    marker.style.left = `${position}%`;

    badge.className = `badge threat-badge-${level}`;
    badge.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    desc.textContent = description;

    document.querySelectorAll(".threat-segment").forEach((seg) => {
        seg.classList.toggle("is-active", seg.dataset.level === level);
    });
}

 
/* Animated counters                                                      */
 
function renderCounters(stats) {
    const map = {
        "stat-total": stats.total_attempts,
        "stat-success": stats.successful_logins,
        "stat-failed": stats.failed_logins,
        "stat-locked": stats.accounts_locked,
        "stat-captcha": stats.captcha_triggers,
        "stat-dict": stats.dictionary_attacks,
        "stat-brute": stats.brute_force_attacks,
    };

    Object.entries(map).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) animateCounter(el, value || 0);
    });
}

function animateCounter(el, target) {
    const duration = 800;
    const start = performance.now();

    function step(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const value = Math.round(eased * target);
        el.textContent = value;
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            el.textContent = target;
        }
    }

    requestAnimationFrame(step);
}

 
/* Bar chart: Successful vs Failed logins                                 */
 
function drawOutcomesChart(stats) {
    const canvas = document.getElementById("chart-outcomes");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const colors = themeColors();

    ctx.clearRect(0, 0, w, h);

    const padding = { top: 24, right: 24, bottom: 36, left: 44 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const data = [
        { label: "Successful", value: stats.successful_logins || 0, color: "#34d399" },
        { label: "Failed", value: stats.failed_logins || 0, color: "#ff5d6c" },
    ];

    const maxValue = Math.max(1, ...data.map(d => d.value));
    const niceMax = Math.ceil(maxValue / 5) * 5 || 5;

    // Axes
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;

    // Horizontal gridlines + labels
    const gridLines = 5;
    ctx.fillStyle = colors.muted;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + chartH - (chartH / gridLines) * i;
        const value = Math.round((niceMax / gridLines) * i);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
        ctx.fillText(value, padding.left - 10, y);
    }

    // Bars
    const barWidth = chartW / data.length * 0.4;
    const gap = chartW / data.length;

    data.forEach((d, i) => {
        const barHeight = (d.value / niceMax) * chartH;
        const x = padding.left + gap * i + (gap - barWidth) / 2;
        const y = padding.top + chartH - barHeight;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, d.color);
        grad.addColorStop(1, "rgba(0,0,0,0.05)");

        ctx.fillStyle = grad;
        roundRect(ctx, x, y, barWidth, barHeight, 6);
        ctx.fill();

        // Value label
        ctx.fillStyle = colors.text;
        ctx.font = "600 13px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(d.value, x + barWidth / 2, y - 6);

        // X label
        ctx.fillStyle = colors.muted;
        ctx.font = "11px 'Inter', sans-serif";
        ctx.textBaseline = "top";
        ctx.fillText(d.label, x + barWidth / 2, padding.top + chartH + 10);
    });
}

 
/* Donut chart: defense activity breakdown                                */
 
function drawDefenseChart(stats) {
    const canvas = document.getElementById("chart-defense");
    const legendEl = document.getElementById("defense-legend");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const colors = themeColors();

    ctx.clearRect(0, 0, w, h);

    const data = [
        { label: "CAPTCHA triggers", value: stats.captcha_triggers || 0, color: "#2dd4ff" },
        { label: "Accounts locked", value: stats.accounts_locked || 0, color: "#ffb84d" },
        { label: "Dictionary attacks", value: stats.dictionary_attacks || 0, color: "#34d399" },
        { label: "Brute-force runs", value: stats.brute_force_attacks || 0, color: "#ff5d6c" },
    ];

    const total = data.reduce((sum, d) => sum + d.value, 0);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 16;
    const innerRadius = radius * 0.6;

    if (total === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = radius - innerRadius;
        ctx.stroke();

        ctx.fillStyle = colors.muted;
        ctx.font = "13px 'Inter', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No defense events yet", cx, cy);
    } else {
        let startAngle = -Math.PI / 2;
        data.forEach((d) => {
            if (d.value === 0) return;
            const sliceAngle = (d.value / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
            ctx.strokeStyle = d.color;
            ctx.lineWidth = radius - innerRadius;
            ctx.stroke();
            startAngle += sliceAngle;
        });

        ctx.fillStyle = colors.text;
        ctx.font = "700 22px 'Space Grotesk', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(total, cx, cy - 6);

        ctx.fillStyle = colors.muted;
        ctx.font = "11px 'Inter', sans-serif";
        ctx.fillText("total events", cx, cy + 16);
    }

    // Legend
    if (legendEl) {
        legendEl.innerHTML = "";
        data.forEach((d) => {
            const span = document.createElement("span");
            span.innerHTML = `<i class="legend-dot" style="background:${d.color}"></i> ${d.label} (${d.value})`;
            legendEl.appendChild(span);
        });
    }
}

 
/* Helper: rounded rectangle                                              */
 
function roundRect(ctx, x, y, width, height, radius) {
    if (height <= 0) height = 0.0001;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
}