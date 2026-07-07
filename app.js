// ===== State =====
let currentUser = null;
let expenses = [];
let unsubscribeExpenses = null;
let trendChart = null;
let categoryChart = null;
let currentRange = "day";

const CATEGORY_META = {
  Food:          { icon: "🍔", color: "#f97316" },
  Travel:        { icon: "🚗", color: "#3b82f6" },
  Shopping:      { icon: "🛍️", color: "#ec4899" },
  Bills:         { icon: "💡", color: "#eab308" },
  Health:        { icon: "💊", color: "#22c55e" },
  Entertainment: { icon: "🎬", color: "#8b5cf6" },
  Education:     { icon: "📚", color: "#14b8a6" },
  Other:         { icon: "📦", color: "#64748b" },
};

// ===== DOM refs =====
const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userPhoto = document.getElementById("userPhoto");
const userName = document.getElementById("userName");
const expenseForm = document.getElementById("expenseForm");
const dateInput = document.getElementById("date");
const expenseListEl = document.getElementById("expenseList");
const emptyState = document.getElementById("emptyState");
const filterCategory = document.getElementById("filterCategory");
const trendToggle = document.getElementById("trendToggle");
const toast = document.getElementById("toast");

// Default date = today
dateInput.value = new Date().toISOString().slice(0, 10);

// ===== Auth =====
googleLoginBtn.addEventListener("click", () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((err) => {
    showToast("Login failed: " + err.message);
  });
});

logoutBtn.addEventListener("click", () => {
  auth.signOut();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUser = user;
    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    userPhoto.src = user.photoURL || "";
    userName.textContent = user.displayName || user.email;
    subscribeExpenses();
  } else {
    currentUser = null;
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
      unsubscribeExpenses = null;
    }
    expenses = [];
    appShell.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  }
});

// ===== Firestore =====
function subscribeExpenses() {
  if (unsubscribeExpenses) unsubscribeExpenses();

  unsubscribeExpenses = db
    .collection("users")
    .doc(currentUser.uid)
    .collection("expenses")
    .orderBy("date", "desc")
    .onSnapshot(
      (snapshot) => {
        expenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderAll();
      },
      (err) => {
        console.error(err);
        showToast("Error loading expenses: " + err.message);
      }
    );
}

expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("amount").value);
  const category = document.getElementById("category").value;
  const date = document.getElementById("date").value;
  const note = document.getElementById("note").value.trim();

  if (!amount || amount <= 0) {
    showToast("Please enter a valid amount");
    return;
  }

  try {
    await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("expenses")
      .add({
        amount,
        category,
        date,
        note,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    expenseForm.reset();
    dateInput.value = new Date().toISOString().slice(0, 10);
    showToast("Expense added 🎉");
  } catch (err) {
    showToast("Error adding expense: " + err.message);
  }
});

async function deleteExpense(id) {
  try {
    await db
      .collection("users")
      .doc(currentUser.uid)
      .collection("expenses")
      .doc(id)
      .delete();
    showToast("Expense deleted");
  } catch (err) {
    showToast("Error deleting: " + err.message);
  }
}

// ===== Rendering =====
function renderAll() {
  renderStats();
  renderList();
  renderTrendChart();
  renderCategoryChart();
}

function toDateOnly(str) {
  // str is "YYYY-MM-DD" -> local Date at midnight
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

function renderStats() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let today = 0, week = 0, month = 0, total = 0;

  expenses.forEach((exp) => {
    const d = toDateOnly(exp.date);
    total += exp.amount;
    if (exp.date === todayStr) today += exp.amount;
    if (d >= weekStart) week += exp.amount;
    if (d >= monthStart) month += exp.amount;
  });

  document.getElementById("statToday").textContent = formatCurrency(today);
  document.getElementById("statWeek").textContent = formatCurrency(week);
  document.getElementById("statMonth").textContent = formatCurrency(month);
  document.getElementById("statTotal").textContent = formatCurrency(total);
}

function renderList() {
  const filter = filterCategory.value;
  const filtered = filter === "all" ? expenses : expenses.filter((e) => e.category === filter);

  expenseListEl.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No expenses yet. Add your first one above! 🎉";
    expenseListEl.appendChild(empty);
    return;
  }

  filtered.forEach((exp) => {
    const meta = CATEGORY_META[exp.category] || CATEGORY_META.Other;
    const item = document.createElement("div");
    item.className = "expense-item";
    item.innerHTML = `
      <div class="expense-icon" style="background:${meta.color}">${meta.icon}</div>
      <div class="expense-info">
        <div class="expense-category">${exp.category}</div>
        ${exp.note ? `<div class="expense-note">${escapeHtml(exp.note)}</div>` : ""}
        <div class="expense-date">${formatDate(exp.date)}</div>
      </div>
      <div class="expense-amount">${formatCurrency(exp.amount)}</div>
      <button class="expense-delete" title="Delete" data-id="${exp.id}">✕</button>
    `;
    expenseListEl.appendChild(item);
  });

  expenseListEl.querySelectorAll(".expense-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteExpense(btn.dataset.id));
  });
}

filterCategory.addEventListener("change", renderList);

// ===== Charts =====
trendToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".toggle-btn");
  if (!btn) return;
  trendToggle.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  currentRange = btn.dataset.range;
  renderTrendChart();
});

function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue("--text").trim() || "#2b2540",
    muted: styles.getPropertyValue("--text-muted").trim() || "#6b6483",
  };
}

function renderTrendChart() {
  const ctx = document.getElementById("trendChart");
  const { labels, data } = buildTrendData(currentRange);
  const colors = getThemeColors();

  const gradient = ctx.getContext("2d").createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, "rgba(139, 92, 246, 0.5)");
  gradient.addColorStop(1, "rgba(236, 72, 153, 0.05)");

  if (trendChart) trendChart.destroy();
  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Spending",
          data,
          borderColor: "#8b5cf6",
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: "#ec4899",
          pointBorderColor: "#fff",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => "₹" + ctx.parsed.y.toFixed(2),
          },
        },
      },
      scales: {
        x: { ticks: { color: colors.muted }, grid: { display: false } },
        y: {
          ticks: { color: colors.muted, callback: (v) => "₹" + v },
          grid: { color: "rgba(128,128,128,0.1)" },
        },
      },
    },
  });
}

function buildTrendData(range) {
  const now = new Date();

  if (range === "day") {
    // last 7 days
    const labels = [];
    const map = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      labels.push(d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }));
      map[key] = 0;
    }
    expenses.forEach((exp) => {
      if (map.hasOwnProperty(exp.date)) map[exp.date] += exp.amount;
    });
    return { labels, data: Object.values(map) };
  }

  if (range === "week") {
    // last 6 weeks
    const labels = [];
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      const ws = startOfWeek(d);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      labels.push(
        ws.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      );
      buckets.push({ start: ws, end: we, total: 0 });
    }
    expenses.forEach((exp) => {
      const d = toDateOnly(exp.date);
      const bucket = buckets.find((b) => d >= b.start && d <= b.end);
      if (bucket) bucket.total += exp.amount;
    });
    return { labels, data: buckets.map((b) => b.total) };
  }

  // month: last 6 months
  const labels = [];
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }));
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), total: 0 });
  }
  expenses.forEach((exp) => {
    const d = toDateOnly(exp.date);
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth());
    if (bucket) bucket.total += exp.amount;
  });
  return { labels, data: buckets.map((b) => b.total) };
}

function renderCategoryChart() {
  const ctx = document.getElementById("categoryChart");
  const totals = {};
  expenses.forEach((exp) => {
    totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
  });

  const labels = Object.keys(totals);
  const data = Object.values(totals);
  const colors = labels.map((cat) => (CATEGORY_META[cat] || CATEGORY_META.Other).color);
  const themeColors = getThemeColors();

  if (categoryChart) categoryChart.destroy();

  if (labels.length === 0) {
    return;
  }

  categoryChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: "transparent",
          borderWidth: 2,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      cutout: "62%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: themeColors.text, padding: 14, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ₹${ctx.parsed.toFixed(2)}`,
          },
        },
      },
    },
  });
}

// ===== Helpers =====
function formatCurrency(n) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  return toDateOnly(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
