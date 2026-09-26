(() => {
  const key = "agri:theme";
  const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const saved = (() => {
    try { return localStorage.getItem(key); } catch { return null; }
  })();
  let theme = saved === "dark" || saved === "light" ? saved : (systemDark() ? "dark" : "light");

  function apply(next) {
    theme = next;
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = next === "dark" ? "#141d19" : "#f5eeda";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const dark = next === "dark";
      button.textContent = dark ? "☀️ 日间" : "🌙 夜间";
      button.setAttribute("aria-label", dark ? "切换到日间模式" : "切换到夜间模式");
      button.setAttribute("aria-pressed", String(dark));
      button.title = dark ? "切换到日间模式" : "切换到夜间模式";
    });
  }

  apply(theme);
  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-theme-toggle]")) return;
    apply(theme === "dark" ? "light" : "dark");
    try { localStorage.setItem(key, theme); } catch {}
  });
  document.addEventListener("DOMContentLoaded", () => apply(theme));

  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", (event) => {
    try { if (localStorage.getItem(key)) return; } catch {}
    apply(event.matches ? "dark" : "light");
  });
})();
