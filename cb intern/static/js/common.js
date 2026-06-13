function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

 
/* Light / dark theme toggle                                              */
 
document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
        const root = document.documentElement;
        const isLight = root.getAttribute("data-theme") === "light";

        if (isLight) {
            root.removeAttribute("data-theme");
            try { localStorage.setItem("authlab-theme", "dark"); } catch (e) {}
        } else {
            root.setAttribute("data-theme", "light");
            try { localStorage.setItem("authlab-theme", "light"); } catch (e) {}
        }

        document.dispatchEvent(new CustomEvent("authlab:theme-change"));
    });
});