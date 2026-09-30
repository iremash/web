"use strict";

// Настройки варианта
const X_VALUES = [-5, -4, -3, -2, -1, 0, 1, 2, 3];
const R_VALUES = [1, 2, 3, 4, 5];
const Y_MIN = -3;
const Y_MAX = 5;
const STORAGE_KEY = "lab1-results";

// Проверка попадания точки в область
function isHit(x, y, r) {
    // I четверть: четверть круга радиуса R/2
    if (x >= 0 && y >= 0) {
        return x * x + y * y <= (r / 2) * (r / 2);
    }
    // II четверть: треугольник
    if (x <= 0 && y >= 0) {
        return y <= x + r / 2;
    }
    // III четверть: прямоугольник
    if (x <= 0 && y <= 0) {
        return x >= -r / 2 && y >= -r;
    }
    // IV четверть: пусто
    return false;
}

// Элементы страницы
const form = document.getElementById("point-form");
const xGroup = document.getElementById("x-group");
const rGroup = document.getElementById("r-group");
const yInput = document.getElementById("y-input");
const xError = document.getElementById("x-error");
const yError = document.getElementById("y-error");
const rError = document.getElementById("r-error");
const tbody = document.getElementById("results-body");
const emptyMsg = document.getElementById("empty-msg");
const clearBtn = document.getElementById("clear-btn");
const canvas = document.getElementById("plot");
const ctx = canvas.getContext("2d");

let selectedX = null;
let selectedR = null;

// LocalStorage
function loadResults() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(data)) return [];
        return data.filter(e =>
            e && Number.isFinite(e.x) && Number.isFinite(e.y) &&
            Number.isFinite(e.r) && typeof e.hit === "boolean" &&
            Number.isFinite(e.time));
    } catch (err) {
        return [];
    }
}

function saveResults() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch (err) {
        console.warn("Не удалось сохранить результаты:", err);
    }
}

let results = loadResults();

// Кнопки выбора X и R
function setupChoiceGroup(group, onSelect) {
    group.addEventListener("click", event => {
        const btn = event.target.closest("button");
        if (!btn || !group.contains(btn)) return;
        group.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        group.classList.remove("invalid");
        onSelect(Number(btn.dataset.value));
    });
}

setupChoiceGroup(xGroup, value => {
    selectedX = value;
    xError.textContent = "";
});

setupChoiceGroup(rGroup, value => {
    selectedR = value;
    rError.textContent = "";
    drawPlot();
});

// Валидация Y
function parseY(raw) {
    const s = raw.trim().replace(",", ".");
    if (s === "") return { error: "Введите значение Y" };
    if (!/^[-+]?\d{1,2}(\.\d{1,10})?$/.test(s)) {
        return { error: "Y должен быть числом (не более 10 знаков после точки)" };
    }
    const y = Number(s);
    if (!(y > Y_MIN && y < Y_MAX)) {
        return { error: `Y должен быть в интервале (${Y_MIN}; ${Y_MAX})` };
    }
    return { value: y };
}

// Запрет ввода лишних символов в Y
yInput.addEventListener("input", () => {
    const cleaned = yInput.value.replace(/[^0-9.,+-]/g, "");
    if (cleaned !== yInput.value) yInput.value = cleaned;
    yError.textContent = "";
    yInput.classList.remove("invalid");
});

// Отправка формы
form.addEventListener("submit", event => {
    event.preventDefault();
    let ok = true;

    if (!X_VALUES.includes(selectedX)) {
        xError.textContent = "Выберите значение X";
        xGroup.classList.add("invalid");
        ok = false;
    }

    const yRes = parseY(yInput.value);
    if (yRes.error) {
        yError.textContent = yRes.error;
        yInput.classList.add("invalid");
        ok = false;
    }

    if (!R_VALUES.includes(selectedR)) {
        rError.textContent = "Выберите значение R";
        rGroup.classList.add("invalid");
        ok = false;
    }

    if (!ok) return;

    results.unshift({
        x: selectedX,
        y: yRes.value,
        r: selectedR,
        hit: isHit(selectedX, yRes.value, selectedR),
        time: Date.now()
    });
    saveResults();
    renderTable();
    drawPlot();
});

clearBtn.addEventListener("click", () => {
    results = [];
    saveResults();
    renderTable();
    drawPlot();
});

// Таблица результатов
function renderTable() {
    const fmt = new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        timeZoneName: "short"
    });

    tbody.textContent = "";
    for (const e of results) {
        const tr = document.createElement("tr");
        const cells = [
            String(e.x),
            String(e.y),
            String(e.r),
            e.hit ? "Попадание" : "Промах",
            fmt.format(new Date(e.time))
        ];
        cells.forEach((text, i) => {
            const td = document.createElement("td");
            td.textContent = text;
            if (i === 3) td.className = e.hit ? "hit" : "miss";
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }
    emptyMsg.classList.toggle("hidden", results.length > 0);
}

// Canvas
const W = canvas.width;
const H = canvas.height;
const CX = W / 2;
const CY = H / 2;
const UNIT = W / 2 / 6;

function px(x) { return CX + x * UNIT; }
function py(y) { return CY - y * UNIT; }

function drawArea(r) {
    ctx.fillStyle = "rgba(51, 153, 255, 0.6)";

    // Четверть круга
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.arc(px(0), py(0), (r / 2) * UNIT, -Math.PI / 2, 0);
    ctx.closePath();
    ctx.fill();

    // Треугольник
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.lineTo(px(-r / 2), py(0));
    ctx.lineTo(px(0), py(r / 2));
    ctx.closePath();
    ctx.fill();

    // Прямоугольник
    ctx.fillRect(px(-r / 2), py(0), (r / 2) * UNIT, r * UNIT);
}

function drawAxes() {
    ctx.strokeStyle = "#222";
    ctx.fillStyle = "#222";
    ctx.lineWidth = 1;
    ctx.font = "12px Arial, sans-serif";

    ctx.beginPath();
    ctx.moveTo(0, CY); ctx.lineTo(W, CY);
    ctx.moveTo(CX, H); ctx.lineTo(CX, 0);
    ctx.stroke();

    // Стрелки
    ctx.beginPath();
    ctx.moveTo(W, CY); ctx.lineTo(W - 10, CY - 5); ctx.lineTo(W - 10, CY + 5);
    ctx.moveTo(CX, 0); ctx.lineTo(CX - 5, 10); ctx.lineTo(CX + 5, 10);
    ctx.fill();
    ctx.fillText("x", W - 12, CY - 10);
    ctx.fillText("y", CX + 10, 12);

    // Деления
    for (let i = -5; i <= 5; i++) {
        if (i === 0) continue;
        ctx.beginPath();
        ctx.moveTo(px(i), CY - 4); ctx.lineTo(px(i), CY + 4);
        ctx.moveTo(CX - 4, py(i)); ctx.lineTo(CX + 4, py(i));
        ctx.stroke();
        ctx.fillText(String(i), px(i) - 5, CY + 16);
        ctx.fillText(String(i), CX + 8, py(i) + 4);
    }
}

function drawPlot() {
    ctx.clearRect(0, 0, W, H);

    if (selectedR !== null) {
        drawArea(selectedR);
    }
    drawAxes();

    if (selectedR === null) {
        ctx.fillStyle = "#7f8796";
        ctx.font = "14px Arial, sans-serif";
        ctx.fillText("Выберите R, чтобы увидеть область", 16, 24);
    }

    // Точки с другим R: бледные и маленькие
    ctx.globalAlpha = 0.3;
    for (const e of results) {
        if (e.r === selectedR) continue;
        ctx.beginPath();
        ctx.arc(px(e.x), py(e.y), 3, 0, Math.PI * 2);
        ctx.fillStyle = e.hit ? "#1e8449" : "#c0392b";
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Точки с текущим R: яркие, крупные, с белой обводкой
    for (const e of results) {
        if (e.r !== selectedR) continue;
        ctx.beginPath();
        ctx.arc(px(e.x), py(e.y), 5, 0, Math.PI * 2);
        ctx.fillStyle = e.hit ? "#1e8449" : "#c0392b";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
    }
    ctx.lineWidth = 1;
}

renderTable();
drawPlot();