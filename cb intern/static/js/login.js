document.addEventListener("DOMContentLoaded", () => {
    initPasswordToggle();
    initPolicyChecker();
    initCaptcha();
    initRateLimitCountdown();
    initForgotPassword();

    const errorAlert = document.querySelector(".alert-error");
    if (errorAlert) {
        showToast(errorAlert.textContent.trim(), "error");
    }
});

 
/* Show / hide password                                                  */
 
function initPasswordToggle() {
    const toggle = document.getElementById("toggle-password");
    const input = document.getElementById("password");
    if (!toggle || !input) return;

    const eyeIcon = toggle.querySelector(".icon-eye");
    const eyeOffIcon = toggle.querySelector(".icon-eye-off");

    toggle.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        eyeIcon.hidden = !showing;
        eyeOffIcon.hidden = showing;
        toggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
}

 
/* Live password policy / strength checker                               */
 
function initPolicyChecker() {
    const input = document.getElementById("policy-password");
    const bar = document.getElementById("strength-bar");
    const label = document.getElementById("strength-label");
    const checklist = document.getElementById("policy-checklist");
    if (!input || !bar || !label || !checklist) return;

    const items = {
        length: checklist.querySelector('[data-rule="length"]'),
        upper: checklist.querySelector('[data-rule="upper"]'),
        lower: checklist.querySelector('[data-rule="lower"]'),
        digit: checklist.querySelector('[data-rule="digit"]'),
        special: checklist.querySelector('[data-rule="special"]'),
    };

    input.addEventListener("input", () => {
        const value = input.value;

        const rules = {
            length: value.length >= 8,
            upper: /[A-Z]/.test(value),
            lower: /[a-z]/.test(value),
            digit: /[0-9]/.test(value),
            special: /[^A-Za-z0-9]/.test(value),
        };

        let passedCount = 0;
        for (const [rule, passed] of Object.entries(rules)) {
            const li = items[rule];
            const icon = li.querySelector(".rule-icon");
            if (passed) {
                li.classList.add("valid");
                icon.innerHTML = "&#10003;";
                passedCount++;
            } else {
                li.classList.remove("valid");
                icon.innerHTML = "&#10007;";
            }
        }

        // Strength scoring: 0-5 rules passed
        let percent = 0;
        let strengthText = "—";
        let color = "var(--red)";

        if (value.length === 0) {
            percent = 0;
            strengthText = "—";
        } else if (passedCount <= 2) {
            percent = 33;
            strengthText = "Weak";
            color = "var(--red)";
        } else if (passedCount <= 4) {
            percent = 66;
            strengthText = "Moderate";
            color = "var(--amber)";
        } else {
            percent = 100;
            strengthText = "Strong";
            color = "var(--green)";
        }

        bar.style.width = percent + "%";
        bar.style.backgroundColor = color;
        label.textContent = "Strength: " + strengthText;
    });
}

 
/* CAPTCHA rendering on <canvas> + refresh                                */
 
function drawCaptcha(canvas, text) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#0c1320";
    ctx.fillRect(0, 0, w, h);

    // Noise lines
    for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = `rgba(45, 212, 255, ${0.08 + Math.random() * 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.lineTo(Math.random() * w, Math.random() * h);
        ctx.stroke();
    }

    // Noise dots
    for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }

    // Characters
    const colors = ["#2dd4ff", "#34d399", "#ffb84d", "#ff5d6c", "#7fe6ff"];
    const charWidth = w / text.length;

    for (let i = 0; i < text.length; i++) {
        ctx.save();
        const x = charWidth * i + charWidth / 2;
        const y = h / 2 + (Math.random() * 10 - 5);
        ctx.translate(x, y);
        ctx.rotate((Math.random() * 30 - 15) * Math.PI / 180);
        ctx.font = "bold 28px 'JetBrains Mono', monospace";
        ctx.fillStyle = colors[i % colors.length];
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text[i], 0, 0);
        ctx.restore();
    }
}

function initCaptcha() {
    const canvas = document.getElementById("captcha-canvas");
    const refreshBtn = document.getElementById("refresh-captcha");
    if (!canvas) return;

    const initialText = canvas.dataset.captcha || "";
    drawCaptcha(canvas, initialText);

    if (refreshBtn) {
        refreshBtn.addEventListener("click", async () => {
            try {
                const res = await fetch("/api/captcha/refresh");
                const data = await res.json();
                canvas.dataset.captcha = data.captcha;
                drawCaptcha(canvas, data.captcha);
                const input = document.getElementById("captcha");
                if (input) input.value = "";
                showToast("CAPTCHA refreshed", "info");
            } catch (err) {
                showToast("Could not refresh CAPTCHA", "error");
            }
        });
    }
}

 
/* Rate-limit countdown                                                   */
 
function initRateLimitCountdown() {
    const alertBox = document.getElementById("rate-limit-alert");
    if (!alertBox) return;

    let remaining = parseInt(alertBox.dataset.remaining || "0", 10);
    const countdownEl = document.getElementById("rate-countdown");

    const timer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            clearInterval(timer);
            window.location.reload();
            return;
        }
        if (countdownEl) countdownEl.textContent = remaining;
    }, 1000);
}

 
/* Forgot password simulation                                            */
 
function initForgotPassword() {
    const link = document.getElementById("forgot-link");
    const message = document.getElementById("forgot-message");
    if (!link || !message) return;

    link.addEventListener("click", (e) => {
        e.preventDefault();
        message.hidden = !message.hidden;
        if (!message.hidden) {
            showToast("Password reset simulated — check the message below.", "info");
        }
    });
}
