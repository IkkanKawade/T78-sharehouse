const calendarEl = document.getElementById("calendar");
const monthYearEl = document.getElementById("monthYear");
const modal = document.getElementById("modal");
const selectedDateEl = document.getElementById("selectedDate");
const bookingInfoEl = document.getElementById("bookingInfo");
const userNameInput = document.getElementById("userName");
const reserveBtn = document.getElementById("reserveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const nameSelect = document.getElementById("nameSelect");

let currentDate = new Date();
let selStart = null;
let selEnd = null;

// Local Storage Helpers
const STORAGE_KEY = "sharehouse_bookings";
const getBookings = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
const saveBookings = (obj) => localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));

// 色パレット & 名前→色ハッシュ関数
const COLORS = ["#e74c3c", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6", "#e67e22", "#1abc9c", "#ff66cc", "#8e44ad", "#16a085"];
const colorForName = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(hash) % COLORS.length];
};

function renderCalendar(date = new Date()) {
  calendarEl.innerHTML = "";

  const year = date.getFullYear();
  const month = date.getMonth();

  monthYearEl.textContent = `${year}年 ${month + 1}月`;

  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // list of simple JP holidays (month-1)-day
  const holidays = {
    "0-1": "元日",
    "0-8": "成人の日",
    "1-11": "建国記念の日",
    "2-20": "春分の日",
    "3-29": "昭和の日",
    "4-3": "憲法記念日",
    "4-4": "みどりの日",
    "4-5": "こどもの日",
  };

  // Padding days from previous month
  for (let i = 0; i < startDow; i++) {
    const pad = document.createElement("div");
    calendarEl.appendChild(pad);
  }

  const bookings = getBookings();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${month + 1}-${day}`;

    const dayDiv = document.createElement("div");
    dayDiv.className = "day";
    dayDiv.dataset.date = dateStr;

    if (bookings[dateStr]?.length >= 4) {
      dayDiv.classList.add("full");
    }

    // holiday color
    if (holidays[`${month}-${day}`]) {
      dayDiv.classList.add("holiday");
      dayDiv.title = holidays[`${month}-${day}`];
    }

    const today = new Date();
    if (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayDiv.classList.add("today");
    }

    const numSpan = document.createElement("span");
    numSpan.className = "date-num";
    numSpan.textContent = day;
    dayDiv.appendChild(numSpan);

    // names list preview
    (bookings[dateStr] || []).forEach((n) => {
      const s = document.createElement("span");
      s.className = "name-badge";
      s.textContent = n;
      s.style.background = colorForName(n);
      s.style.color = "#fff";
      dayDiv.appendChild(s);
    });

    dayDiv.onclick = () => {
      if (!selStart) {
        // first click
        selStart = dateStr;
        selEnd = null;
        updateRangeHighlight();
      } else {
        // second click
        selEnd = dateStr;
        updateRangeHighlight();
        openRangeModal(selStart, selEnd);
        selStart = selEnd = null;
        updateRangeHighlight();
      }
    };

    calendarEl.appendChild(dayDiv);
  }
}

function openModal(dateStr) {
  selectedDateEl.textContent = dateStr;
  const bookings = getBookings();
  const count = bookings[dateStr]?.length || 0;
  bookingInfoEl.textContent = `予約数: ${count} / 4`;

  nameSelect.innerHTML = (bookings[dateStr]||[]).map(n=>`<option>${n}</option>`).join("");
  reserveBtn.disabled = count >= 4;
  cancelBtn.disabled = count === 0;

  reserveBtn.onclick = () => {
    const name = userNameInput.value.trim();
    if (!name) return alert("名前を入力してください");

    const bookings = getBookings();
    bookings[dateStr] = bookings[dateStr] || [];
    if (bookings[dateStr].length >= 4) return alert("満室です");

    bookings[dateStr].push(name);
    saveBookings(bookings);
    alert("宿泊料金：1泊1000THB\nご確認ください。※現地支払い");
    closeModal();
    renderCalendar(currentDate);
  };

  cancelBtn.onclick = () => {
    const name = nameSelect.value;
    if(!name) return alert("名前を選択してください");

    const bookings = getBookings();
    if (!bookings[dateStr]) return alert("予約がありません");

    const idx = bookings[dateStr].indexOf(name);
    if (idx === -1) return alert("その名前の予約はありません");

    bookings[dateStr].splice(idx, 1);
    saveBookings(bookings);
    closeModal();
    renderCalendar(currentDate);
  };

  modal.classList.remove("hidden");
  document.body.classList.add("hide-scroll");
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.classList.remove("hide-scroll");
  userNameInput.value = "";
}

document.getElementById("closeModal").onclick = closeModal;
window.onclick = (e) => {
  if (e.target === modal) closeModal();
};

document.getElementById("prevMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar(currentDate);
};

document.getElementById("nextMonth").onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar(currentDate);
};

document.getElementById("todayBtn").onclick = () => {
  currentDate = new Date();
  renderCalendar(currentDate);
};

function updateRangeHighlight() {
  document.querySelectorAll(".day").forEach((d) => d.classList.remove("selected-range"));
  if (!selStart) return;
  const [sY, sM, sD] = selStart.split("-").map(Number);
  const s = new Date(sY, sM - 1, sD);
  let e = s;
  if (selEnd) {
    const [eY, eM, eD] = selEnd.split("-").map(Number);
    e = new Date(eY, eM - 1, eD);
  }
  if (s > e) [s, e] = [e, s];
  document.querySelectorAll(".day").forEach((d) => {
    const dateStr = d.dataset.date;
    if (!dateStr) return;
    const [y, m, dd] = dateStr.split("-").map(Number);
    const cur = new Date(y, m - 1, dd);
    if (cur >= s && cur <= e) d.classList.add("selected-range");
  });
}

function openRangeModal(startStr, endStr) {
  const bookings = getBookings();
  const names = prompt(`選択範囲 ${startStr} 〜 ${endStr} を予約します。名前を入力してください (カンマ区切り)`);
  if (!names) return;
  const nameArr = names.split(/,|、/).map((n) => n.trim()).filter(Boolean);
  let iter = new Date(startStr);
  let endDate = new Date(endStr);
  if (iter > endDate) [iter, endDate] = [endDate, iter];
  while (iter <= endDate) {
    const y = iter.getFullYear();
    const m = iter.getMonth() + 1;
    const d = iter.getDate();
    const key = `${y}-${m}-${d}`;
    bookings[key] = bookings[key] || [];
    nameArr.forEach((n) => {
      if (bookings[key].length < 4 && !bookings[key].includes(n)) bookings[key].push(n);
    });
    iter.setDate(iter.getDate() + 1);
  }
  saveBookings(bookings);
  renderCalendar(currentDate);
}

renderCalendar(currentDate);

// ---- タブ切り替え ----
document.querySelectorAll(".tab-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    // button active
    document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // content active
    const target = btn.dataset.target;
    document.querySelectorAll(".tab-content").forEach((c) => {
      c.classList.toggle("active", c.id === target);
    });
  });
});
