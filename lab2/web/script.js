"use strict";

// Настройки варианта
const X_VALUES = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
const Y_MIN = -5;
const Y_MAX = 3;
const R_MIN = 1;
const R_MAX = 4;
const STORAGE_KEY = "lab2-results";
const API_URL = "/fcgi-bin/lab2.jar";

// Элементы страницы
const form = document.getElementById("point-form");
const xGroup = document.getElementById("x-group");
const rInput = document.getElementById("r-input");
const yInput = document.getElementById("y-input");
const xError = document.getElementById("x-error");
const yError = document.getElementById("y-error");
const rError = document.getElementById("r-error");
const tbody = document.getElementById("results-body");
const emptyMsg = document.getElementById("empty-msg");
const clearBtn = document.getElementById("clear-btn");
const canvas = document.getElementById("plot");
const ctx = canvas.getContext("2d");
const serverError = document.getElementById("server-error");
const submitBtn = document.getElementById("submit-btn");

// Константы холста
const W = canvas.width;
const H = canvas.height;
const CX = W / 2;
const CY = H / 2;
const UNIT = W / 2 / 6;

let selectedX = null;
let selectedR = null;

// LocalStorage
function isValidResult(e) {
    return e !== null && typeof e === "object" &&
        Number.isFinite(e.x) && Number.isFinite(e.y) &&
        Number.isFinite(e.r) && typeof e.hit === "boolean" &&
        Number.isFinite(e.time) && Number.isFinite(e.exec);
}

function loadResults() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!Array.isArray(data)) return [];
        return data.filter(isValidResult);
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

// Кнопки выбора X
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


// Валидация Y и R
function parseNumber(raw, fieldName, min, max) {
    const s = raw.trim().replace(",", ".");
    if (s === "") return {error: `Введите значение ${fieldName}`};
    if (!/^[-+]?\d{1,2}(\.\d{1,10})?$/.test(s)) {
        return {error: `${fieldName} должен быть числом (не более 10 знаков после точки)`};
    }
    const n = Number(s);
    if (!(n > min && n < max)) {
        return {error: `${fieldName} должен быть в интервале (${min}, ${max})`};
    }
    return {value: n};
}

// Запрет ввода лишних символов в Y, R
function sanitize(input, error) {
    input.value = input.value.replace(/[^0-9.,+-]/g, "");
    error.textContent = "";
    input.classList.remove("invalid");
}

yInput.addEventListener("input", () => {
    sanitize(yInput, yError);
});

rInput.addEventListener("input", () => {
    sanitize(rInput, rError);
    const parsedR = parseNumber(rInput.value, "R", R_MIN, R_MAX);
    if (!parsedR.error) {
        selectedR = parsedR.value;
    } else {
        selectedR = null;
    }
    drawPlot();
});

async function readServerError(response) {
    if (response.status === 400) {
        try {
            const body = await response.json();
            if (body && typeof body.error === "string") return body.error;
        } catch (e) {
            // тело не JSON, используем текст по умолчанию
        }
        return "Сервер отклонил запрос";
    }
    if (response.status === 404) return "Адрес сервера не найден";
    if (response.status >= 500) return "Сервер временно недоступен";
    return "Ошибка сервера: " + response.status;
}

// Отправка формы
form.addEventListener("submit", event => {
    event.preventDefault();
    serverError.textContent = "";
    let ok = true;

    if (!X_VALUES.includes(selectedX)) {
        xError.textContent = "Выберите значение X";
        xGroup.classList.add("invalid");
        ok = false;
    }

    const yRes = parseNumber(yInput.value, "Y", Y_MIN, Y_MAX);
    if (yRes.error) {
        yError.textContent = yRes.error;
        yInput.classList.add("invalid");
        ok = false;
    }

    const rRes = parseNumber(rInput.value, "R", R_MIN, R_MAX);
    if (rRes.error) {
        rError.textContent = rRes.error;
        rInput.classList.add("invalid");
        ok = false;
    }

    if (!ok) return;

    const params = new URLSearchParams({
        x: selectedX,
        y: yRes.value,
        r: rRes.value
    });

    submitBtn.disabled = true;

    fetch(`${API_URL}?${params}`)
        .then(async response => {
            if (!response.ok) throw new Error(await readServerError(response));
            return response.json();
        })
        .then(data => {
            if (!isValidResult(data)) throw new Error("Сервер прислал некорректный ответ");
            results.unshift(data);
            saveResults();
            renderTable();
            drawPlot();
        })
        .catch(err => {
            if (err instanceof TypeError) {
                serverError.textContent = "Нет связи с сервером";
            } else if (err instanceof SyntaxError) {
                serverError.textContent = "Сервер прислал некорректный ответ";
            } else {
                serverError.textContent = err.message;
            }
        })
        .finally(() => {
            submitBtn.disabled = false;
        });
});

clearBtn.addEventListener("click", () => {
    results = [];
    serverError.textContent = "";
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
            fmt.format(new Date(e.time)),
            String(e.exec)
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
function px(x) {
    return CX + x * UNIT;
}

function py(y) {
    return CY - y * UNIT;
}

function drawArea(r) {
    ctx.fillStyle = "rgba(51, 153, 255, 0.6)";

    // Четверть круга
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.arc(px(0), py(0), (r) * UNIT, Math.PI, 3 * Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    // Треугольник
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.lineTo(px(r / 2), py(0));
    ctx.lineTo(px(0), py(-r / 2));
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
    ctx.moveTo(0, CY);
    ctx.lineTo(W, CY);
    ctx.moveTo(CX, H);
    ctx.lineTo(CX, 0);
    ctx.stroke();

    // Стрелки
    ctx.beginPath();
    ctx.moveTo(W, CY);
    ctx.lineTo(W - 10, CY - 5);
    ctx.lineTo(W - 10, CY + 5);
    ctx.moveTo(CX, 0);
    ctx.lineTo(CX - 5, 10);
    ctx.lineTo(CX + 5, 10);
    ctx.fill();
    ctx.fillText("x", W - 12, CY - 10);
    ctx.fillText("y", CX + 10, 12);

    // Деления
    for (let i = -5; i <= 5; i++) {
        if (i === 0) continue;
        ctx.beginPath();
        ctx.moveTo(px(i), CY - 4);
        ctx.lineTo(px(i), CY + 4);
        ctx.moveTo(CX - 4, py(i));
        ctx.lineTo(CX + 4, py(i));
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
        ctx.fillText("Введите R,", 8, 20);
        ctx.fillText("чтобы увидеть область", 8, 40);
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