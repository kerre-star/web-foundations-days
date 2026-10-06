// ---------- 1. Select the elements we need ----------
const textarea = document.querySelector("#note-text");
const charCount = document.querySelector("#char-count");
const wordCount = document.querySelector("#word-count");
const clearBtn = document.querySelector("#clear-btn");
const themeBtn = document.querySelector("#theme-toggle");

const DRAFT_KEY = "draft";
const THEME_KEY = "theme";
const MAX_CHARS = 200;
const WARNING_AT = 180;

// ---------- 2. Update both counters and the warning classes ----------
function updateCounts() {
  const text = textarea.value;
  const chars = text.length;
  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

  charCount.textContent = `${chars} / ${MAX_CHARS} characters`;
  wordCount.textContent = `${words} words`;

  // Over 180 characters: warning (orange). Over 200: over (red, bold).
  charCount.classList.toggle("warning", chars > WARNING_AT);
  charCount.classList.toggle("over", chars > MAX_CHARS);
}

// ---------- 3. Draft: save on every input, restore on load ----------
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, textarea.value);
}

function restoreDraft() {
  const saved = localStorage.getItem(DRAFT_KEY);
  if (saved !== null) {
    textarea.value = saved;
  }
}

// ---------- 4. Clear everything ----------
function clearAll() {
  textarea.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
  textarea.focus();
}

// ---------- 5. Theme ----------
function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  themeBtn.textContent = isDark ? "Light mode" : "Dark mode";
}

function toggleTheme() {
  const nowDark = !document.body.classList.contains("dark");
  const theme = nowDark ? "dark" : "light";
  applyTheme(theme);
  localStorage.setItem(THEME_KEY, theme);
}

// ---------- 6. Listen for events ----------
textarea.addEventListener("input", () => {
  updateCounts();
  saveDraft();
});

clearBtn.addEventListener("click", clearAll);

textarea.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearAll();
  }
});

themeBtn.addEventListener("click", toggleTheme);

// ---------- 7. On page load: restore draft and theme, then count ----------
restoreDraft();
applyTheme(localStorage.getItem(THEME_KEY) || "light");
updateCounts();
