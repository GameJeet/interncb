document.addEventListener("DOMContentLoaded", () => {
    initModeToggle();
    initDictionaryAttack();
    initBruteForce();
});

 
/* Attacker / Defender mode toggle                                        */
 
function initModeToggle() {
    const buttons = document.querySelectorAll(".mode-btn");
    const attackerPanel = document.getElementById("panel-attacker");
    const defenderPanel = document.getElementById("panel-defender");
    if (!buttons.length) return;

    const applyMode = (mode) => {
        document.body.classList.toggle("theme-attacker", mode === "attacker");
        document.body.classList.toggle("theme-defender", mode === "defender");
        attackerPanel.hidden = mode !== "attacker";
        defenderPanel.hidden = mode !== "defender";
    };

    buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
            buttons.forEach((b) => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            applyMode(btn.dataset.mode);
        });
    });

    // Apply the theme matching whichever mode is active on page load.
    const initialBtn = document.querySelector(".mode-btn.active");
    applyMode(initialBtn ? initialBtn.dataset.mode : "attacker");
}

 
/* Dictionary attack simulator                                           */
 
function initDictionaryAttack() {
    const startBtn = document.getElementById("dict-start");
    const targetSelect = document.getElementById("dict-target");
    const output = document.getElementById("dict-output");
    const progressFill = document.getElementById("dict-progress");
    const progressLabel = document.getElementById("dict-progress-label");
    if (!startBtn) return;

    startBtn.addEventListener("click", async () => {
        const target = targetSelect.value;

        startBtn.disabled = true;
        progressFill.style.width = "0%";
        progressLabel.textContent = "Connecting to target...";
        output.innerHTML = "";
        appendLine(output, `Targeting account: ${target}`, "info");
        appendLine(output, `Loading internal wordlist...`, "info");

        let result;
        try {
            const res = await fetch("/api/dictionary-attack", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: target }),
            });
            result = await res.json();
        } catch (err) {
            appendLine(output, "Request failed. Is the server running?", "fail");
            startBtn.disabled = false;
            return;
        }

        if (result.error) {
            appendLine(output, `Error: ${result.error}`, "fail");
            startBtn.disabled = false;
            return;
        }

        const attempts = result.attempts;
        const total = attempts.length;

        for (let i = 0; i < total; i++) {
            await delay(350);
            const attempt = attempts[i];
            progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
            progressLabel.textContent = `Attempt ${i + 1} of ${total}`;

            if (attempt.success) {
                appendLine(output, `Trying password: "${attempt.password}"`, "try");
                await delay(200);
                appendLine(output, `Password "${attempt.password}" matches account "${target}"!`, "success");
            } else {
                appendLine(output, `Trying password: "${attempt.password}" — denied`, "fail");
            }
        }

        await delay(150);
        if (result.cracked) {
            progressLabel.textContent = "Credentials found";
            appendLine(output, `Attack complete: credentials compromised.`, "success");
            showToast(`Dictionary attack cracked "${target}"'s password!`, "warning");
        } else {
            progressLabel.textContent = "No match in wordlist";
            appendLine(output, `Attack complete: no match found in wordlist.`, "info");
            showToast(`Dictionary attack against "${target}" failed — strong password.`, "success");
        }

        startBtn.disabled = false;
    });
}

 
/* Brute force demonstration                                              */
 
let bruteForceStopped = false;

function initBruteForce() {
    const startBtn = document.getElementById("brute-start");
    const stopBtn = document.getElementById("brute-stop");
    const targetSelect = document.getElementById("brute-target");
    const output = document.getElementById("brute-output");
    const progressFill = document.getElementById("brute-progress");
    const currentEl = document.getElementById("brute-current");
    const countEl = document.getElementById("brute-count");
    const statusEl = document.getElementById("brute-status");
    if (!startBtn) return;

    startBtn.addEventListener("click", async () => {
        const target = targetSelect.value;

        startBtn.disabled = true;
        stopBtn.disabled = false;
        bruteForceStopped = false;

        output.innerHTML = "";
        progressFill.style.width = "0%";
        countEl.textContent = "0";
        currentEl.textContent = "—";
        statusEl.textContent = "Running";

        appendLine(output, `Targeting account: ${target}`, "info");
        appendLine(output, `Cycling through candidate password list...`, "info");

        let result;
        try {
            const res = await fetch("/api/brute-force", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: target }),
            });
            result = await res.json();
        } catch (err) {
            appendLine(output, "Request failed. Is the server running?", "fail");
            startBtn.disabled = false;
            stopBtn.disabled = true;
            statusEl.textContent = "Error";
            return;
        }

        if (result.error) {
            appendLine(output, `Error: ${result.error}`, "fail");
            startBtn.disabled = false;
            stopBtn.disabled = true;
            statusEl.textContent = "Error";
            return;
        }

        const attempts = result.attempts;
        const total = attempts.length;

        for (let i = 0; i < total; i++) {
            if (bruteForceStopped) {
                statusEl.textContent = "Stopped";
                appendLine(output, `Simulation stopped by user after ${i} attempts.`, "info");
                showToast("Brute-force simulation stopped", "info");
                break;
            }

            await delay(220);
            const attempt = attempts[i];

            currentEl.textContent = attempt.password;
            countEl.textContent = i + 1;
            progressFill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;

            if (attempt.success) {
                appendLine(output, `Trying "${attempt.password}" — match found!`, "success");
                statusEl.textContent = "Cracked";
            } else {
                appendLine(output, `Trying "${attempt.password}" — denied`, "fail");
            }

            if (attempt.success) break;
        }

        if (!bruteForceStopped) {
            if (result.cracked) {
                appendLine(output, `Simulation complete: password discovered.`, "success");
                showToast(`Brute-force simulation cracked "${target}"'s password!`, "warning");
            } else {
                statusEl.textContent = "No match";
                appendLine(output, `Simulation complete: no match found.`, "info");
                showToast(`Brute-force simulation against "${target}" found no match.`, "success");
            }
        }

        startBtn.disabled = false;
        stopBtn.disabled = true;
    });

    stopBtn.addEventListener("click", () => {
        bruteForceStopped = true;
        stopBtn.disabled = true;
    });
}

 
/* Helpers                                                                */
 
function appendLine(container, text, kind) {
    const p = document.createElement("p");
    p.className = "term-line" + (kind ? ` term-${kind}` : "");
    p.textContent = text;
    container.appendChild(p);
    container.scrollTop = container.scrollHeight;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}