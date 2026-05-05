/* ==========================================================================
  Espalda Check · rutina gamificada
  Frontend vanilla + localStorage
  - 3 tarjetas con fotos
  - objetivo progresivo de 20 a 100 repeticiones
  - puntos, nivel, racha, historial, calendario y frase secreta
========================================================================== */

const STORAGE_KEY = "espalda-check:v1";

const SECRET_PHRASE = "Los sueños siempre se podrán cumplir desde que estemos juntos, porque eres la motivación más grande y necesaria que cualquier persona podría pedir, todo va a estar bien desde que estés";
const REVEALABLE_CHAR_REGEX = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
const REVEALABLE_TOTAL = [...SECRET_PHRASE].filter((char) => REVEALABLE_CHAR_REGEX.test(char)).length;

const EXERCISES = [
  {
    id: "jalon-pecho",
    title: "Jalón de pecho",
    image: "./assets/ejercicio-jalon-pecho.png",
    badge: "Espalda alta",
    cues: [
      "Siéntate con espalda larga y pecho abierto, sin sacar costillas como pavo real confundido.",
      "Baja los codos hacia las costillas y junta suavemente las escápulas.",
      "Cuello relajado, hombros lejos de las orejas y movimiento lento."
    ]
  },
  {
    id: "rotacion-externa",
    title: "Rotación externa de hombros",
    image: "./assets/ejercicio-rotacion-externa.png",
    badge: "Hombros",
    cues: [
      "Codos cerca del cuerpo, palmas hacia arriba y brazos abriendo hacia los lados.",
      "No empujes el pecho hacia adelante ni arquees la espalda baja.",
      "Busca sensación de activación, no dolor punzante ni pelea con el universo."
    ]
  },
  {
    id: "apertura-nuca",
    title: "Apertura con manos en nuca",
    image: "./assets/ejercicio-apertura-nuca.png",
    badge: "Postura",
    cues: [
      "Manos suaves detrás de la cabeza, sin empujar el cuello hacia adelante.",
      "Abre codos, crece desde la coronilla y junta escápulas con suavidad.",
      "Haz pausas pequeñas. Calidad primero, contador después. Triste pero cierto."
    ]
  }
];

const LEVELS = [
  { xp: 0, name: "Nivel 1 · Espalda despertando" },
  { xp: 120, name: "Nivel 2 · Hombros menos dramáticos" },
  { xp: 320, name: "Nivel 3 · Postura decente" },
  { xp: 650, name: "Nivel 4 · Escápulas con autoestima" },
  { xp: 1100, name: "Nivel 5 · Antijoroba legendario" },
  { xp: 1700, name: "Nivel 6 · Guardián cervical" },
  { xp: 2500, name: "Nivel 7 · Espalda modo jefe" }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  dailyTarget: $("#dailyTarget"),
  totalPoints: $("#totalPoints"),
  streak: $("#streak"),
  levelName: $("#levelName"),
  levelProgressText: $("#levelProgressText"),
  levelProgressBar: $("#levelProgressBar"),
  maskedPhrase: $("#maskedPhrase"),
  phraseProgressText: $("#phraseProgressText"),
  phraseProgressBar: $("#phraseProgressBar"),
  phraseHint: $("#phraseHint"),
  painBefore: $("#painBefore"),
  painAfter: $("#painAfter"),
  painBeforeValue: $("#painBeforeValue"),
  painAfterValue: $("#painAfterValue"),
  painWarning: $("#painWarning"),
  todayTitle: $("#todayTitle"),
  todaySubtitle: $("#todaySubtitle"),
  exerciseGrid: $("#exerciseGrid"),
  calendarTitle: $("#calendarTitle"),
  calendarGrid: $("#calendarGrid"),
  historyList: $("#historyList"),
  toast: $("#toast"),
  btnCompleteDay: $("#btnCompleteDay"),
  btnReset: $("#btnReset"),
  btnClearHistory: $("#btnClearHistory"),
  btnPrevMonth: $("#btnPrevMonth"),
  btnTodayMonth: $("#btnTodayMonth"),
  btnNextMonth: $("#btnNextMonth")
};

let toastTimer = null;
let state = loadState();
let calendarViewDate = new Date(`${getTodayKey()}T00:00:00`);
calendarViewDate.setDate(1);

init();

function init() {
  ensureToday();
  renderExerciseCards();
  bindGlobalEvents();
  render();
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") return normalizeState(saved);
  } catch (error) {
    console.warn("No se pudo leer localStorage:", error);
  }
  return createInitialState();
}

function createInitialState() {
  return normalizeState({
    currentDate: getTodayKey(),
    dailyTarget: 20,
    totalPoints: 0,
    xp: 0,
    streak: 0,
    lastCompletedDate: null,
    completedDays: 0,
    completedToday: false,
    reps: {},
    done: {},
    pain: { before: 0, after: 0 },
    phrase: {
      revealedCount: 0,
      unlockedDates: [],
      unlockedByDate: {}
    },
    history: []
  });
}

function normalizeState(raw) {
  const phrase = raw.phrase && typeof raw.phrase === "object" ? raw.phrase : {};

  const base = {
    currentDate: raw.currentDate || getTodayKey(),
    dailyTarget: clamp(Number(raw.dailyTarget) || 20, 20, 100),
    totalPoints: Math.max(0, Number(raw.totalPoints) || 0),
    xp: Math.max(0, Number(raw.xp) || 0),
    streak: Math.max(0, Number(raw.streak) || 0),
    lastCompletedDate: raw.lastCompletedDate || null,
    completedDays: Math.max(0, Number(raw.completedDays) || 0),
    completedToday: Boolean(raw.completedToday),
    reps: raw.reps && typeof raw.reps === "object" ? raw.reps : {},
    done: raw.done && typeof raw.done === "object" ? raw.done : {},
    pain: raw.pain && typeof raw.pain === "object" ? raw.pain : { before: 0, after: 0 },
    phrase: {
      revealedCount: clamp(Number(phrase.revealedCount) || 0, 0, REVEALABLE_TOTAL),
      unlockedDates: Array.isArray(phrase.unlockedDates) ? [...new Set(phrase.unlockedDates)].filter(Boolean) : [],
      unlockedByDate: phrase.unlockedByDate && typeof phrase.unlockedByDate === "object" ? phrase.unlockedByDate : {}
    },
    history: Array.isArray(raw.history) ? raw.history.slice(0, 60) : []
  };

  EXERCISES.forEach((exercise) => {
    base.reps[exercise.id] = clamp(Number(base.reps[exercise.id]) || 0, 0, 100);
    base.done[exercise.id] = Boolean(base.done[exercise.id]);
  });

  base.pain.before = clamp(Number(base.pain.before) || 0, 0, 10);
  base.pain.after = clamp(Number(base.pain.after) || 0, 0, 10);

  base.history = base.history.map((item) => ({
    date: item.date,
    target: clamp(Number(item.target) || 20, 20, 100),
    totalReps: Math.max(0, Number(item.totalReps) || 0),
    points: Math.max(0, Number(item.points) || 0),
    painBefore: clamp(Number(item.painBefore) || 0, 0, 10),
    painAfter: clamp(Number(item.painAfter) || 0, 0, 10),
    completed: Boolean(item.completed),
    letterUnlocked: Boolean(item.letterUnlocked),
    unlockedLetter: item.unlockedLetter || "",
    note: item.note || ""
  })).filter((item) => item.date);

  return base;
}

function ensureToday() {
  const today = getTodayKey();
  if (state.currentDate === today) return;

  state.currentDate = today;
  state.completedToday = false;
  state.reps = {};
  state.done = {};
  state.pain = { before: 0, after: 0 };

  EXERCISES.forEach((exercise) => {
    state.reps[exercise.id] = 0;
    state.done[exercise.id] = false;
  });

  saveState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderExerciseCards() {
  els.exerciseGrid.innerHTML = EXERCISES.map((exercise) => `
    <article class="exercise-card" data-card="${exercise.id}">
      <div class="exercise-card__media">
        <img src="${exercise.image}" alt="Referencia visual del ejercicio ${escapeHtml(exercise.title)}" loading="lazy" />
        <span class="exercise-card__badge">${escapeHtml(exercise.badge)}</span>
      </div>

      <div class="exercise-card__body">
        <div>
          <h3>${escapeHtml(exercise.title)}</h3>
          <ul class="cue-list">
            ${exercise.cues.map((cue) => `<li>${escapeHtml(cue)}</li>`).join("")}
          </ul>
        </div>

        <div class="rep-panel">
          <div class="rep-count-row">
            <strong><span data-reps="${exercise.id}">0</span>/<span data-target="${exercise.id}">20</span></strong>
            <span data-status="${exercise.id}">Pendiente</span>
          </div>
          <div class="progress" aria-hidden="true"><span data-bar="${exercise.id}"></span></div>
          <div class="rep-buttons">
            <button class="rep-btn" type="button" data-action="add" data-id="${exercise.id}" data-value="-5">-5</button>
            <button class="rep-btn" type="button" data-action="add" data-id="${exercise.id}" data-value="1">+1</button>
            <button class="rep-btn" type="button" data-action="add" data-id="${exercise.id}" data-value="5">+5</button>
            <button class="rep-btn" type="button" data-action="add" data-id="${exercise.id}" data-value="10">+10</button>
          </div>
          <button class="complete-btn" type="button" data-action="complete" data-id="${exercise.id}">Marcar completo</button>
        </div>
      </div>
    </article>
  `).join("");

  els.exerciseGrid.addEventListener("click", handleExerciseClick);
}

function bindGlobalEvents() {
  els.painBefore.addEventListener("input", () => updatePain("before", els.painBefore.value));
  els.painAfter.addEventListener("input", () => updatePain("after", els.painAfter.value));
  els.btnCompleteDay.addEventListener("click", completeDay);
  els.btnReset.addEventListener("click", resetToday);
  els.btnClearHistory.addEventListener("click", clearHistory);
  els.btnPrevMonth.addEventListener("click", () => changeCalendarMonth(-1));
  els.btnTodayMonth.addEventListener("click", goToCurrentMonth);
  els.btnNextMonth.addEventListener("click", () => changeCalendarMonth(1));
}

function handleExerciseClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id, value } = button.dataset;

  if (state.completedToday) {
    showToast("El día ya quedó cerrado. Mañana seguimos, porque hasta las apps descansan.");
    return;
  }

  if (action === "add") addReps(id, Number(value));
  if (action === "complete") completeExercise(id);
}

function updatePain(type, value) {
  state.pain[type] = clamp(Number(value), 0, 10);
  saveState();
  render();
}

function addReps(id, amount) {
  const previous = Number(state.reps[id]) || 0;
  const next = clamp(previous + amount, 0, 100);
  const gained = Math.max(0, next - previous);

  state.reps[id] = next;
  state.done[id] = next >= state.dailyTarget;

  if (gained > 0) addPoints(gained);

  saveState();
  render();

  if (state.done[id] && previous < state.dailyTarget) {
    showToast("Ejercicio completo. La espalda acaba de hacer una mini ovación. 👏");
  }
}

function completeExercise(id) {
  const previous = Number(state.reps[id]) || 0;
  const next = state.dailyTarget;
  const gained = Math.max(0, next - previous);

  state.reps[id] = next;
  state.done[id] = true;

  addPoints(gained + 10);
  saveState();
  render();
  showToast("Marcado completo +10 XP de disciplina humana inexplicable.");
}

function completeDay() {
  if (state.completedToday) {
    showToast("Este día ya estaba cerrado. No vamos a farmear XP como villanos.");
    return;
  }

  const allDone = EXERCISES.every((exercise) => state.done[exercise.id]);
  if (!allDone) {
    showToast("Faltan ejercicios por completar. La app vio todo. Qué pena.");
    return;
  }

  const bonus = 50 + state.streak * 5;
  const letterResult = unlockPhraseLetterIfAllowed();

  addPoints(bonus);

  state.completedToday = true;
  state.completedDays += 1;
  state.streak = calculateNextStreak(state.lastCompletedDate, state.currentDate);
  state.lastCompletedDate = state.currentDate;

  const totalReps = getTotalReps();
  state.history = state.history.filter((item) => item.date !== state.currentDate);
  state.history.unshift({
    date: state.currentDate,
    target: state.dailyTarget,
    totalReps,
    points: totalReps + bonus,
    painBefore: state.pain.before,
    painAfter: state.pain.after,
    completed: true,
    letterUnlocked: letterResult.unlocked,
    unlockedLetter: letterResult.letter || "",
    note: letterResult.note
  });
  state.history = state.history.slice(0, 60);

  if (state.dailyTarget < 100) {
    state.dailyTarget = clamp(state.dailyTarget + 10, 20, 100);
  }

  saveState();
  render();

  if (letterResult.unlocked) {
    showToast(`Día cerrado. Letra desbloqueada: “${letterResult.letter}”. Qué cursi y, molesto admitirlo, bonito.`);
    return;
  }

  if (letterResult.reason === "pain") {
    showToast(`Día cerrado +${bonus} XP. No se desbloqueó letra porque el dolor después quedó en ${state.pain.after}/10.`);
    return;
  }

  showToast(`Día cerrado. +${bonus} XP extra. La frase ya no tenía letras pendientes.`);
}

function unlockPhraseLetterIfAllowed() {
  if (state.phrase.revealedCount >= REVEALABLE_TOTAL) {
    return { unlocked: false, reason: "complete", note: "Frase completa" };
  }

  if (state.phrase.unlockedDates.includes(state.currentDate)) {
    return { unlocked: false, reason: "already", note: "La fecha ya tenía letra" };
  }

  if (state.pain.after > 4) {
    return { unlocked: false, reason: "pain", note: "Sin letra por dolor alto" };
  }

  const letter = getRevealableLetterAt(state.phrase.revealedCount);
  state.phrase.revealedCount += 1;
  state.phrase.unlockedDates.push(state.currentDate);
  state.phrase.unlockedByDate[state.currentDate] = letter;

  return { unlocked: true, reason: "ok", letter, note: "Letra desbloqueada" };
}

function getRevealableLetterAt(revealedCount) {
  let cursor = 0;

  for (const char of SECRET_PHRASE) {
    if (!REVEALABLE_CHAR_REGEX.test(char)) continue;
    if (cursor === revealedCount) return char;
    cursor += 1;
  }

  return "";
}

function resetToday() {
  if (state.completedToday) {
    showToast("El día ya está cerrado. No reinicio para duplicar puntos, que aquí no estamos imprimiendo XP como billetes de mentira.");
    return;
  }

  const ok = confirm("¿Reiniciar solo el progreso de hoy? Los puntos, historial y frase se conservan.");
  if (!ok) return;

  state.reps = {};
  state.done = {};
  state.pain = { before: 0, after: 0 };
  EXERCISES.forEach((exercise) => {
    state.reps[exercise.id] = 0;
    state.done[exercise.id] = false;
  });
  saveState();
  render();
  showToast("Día reiniciado. Otra vuelta al carrusel postural.");
}

function clearHistory() {
  const ok = confirm("¿Borrar historial, puntos, racha y frase? Esto sí es empezar de cero, dramático pero válido.");
  if (!ok) return;

  state = createInitialState();
  calendarViewDate = new Date(`${getTodayKey()}T00:00:00`);
  calendarViewDate.setDate(1);
  saveState();
  render();
  showToast("Historial y frase borrados. La memoria humana también hace eso, pero peor.");
}

function addPoints(points) {
  const safePoints = Math.max(0, Number(points) || 0);
  state.totalPoints += safePoints;
  state.xp += safePoints;
}

function render() {
  const completedCount = EXERCISES.filter((exercise) => state.done[exercise.id]).length;
  const totalReps = getTotalReps();
  const maxRepsToday = state.dailyTarget * EXERCISES.length;
  const painMax = Math.max(state.pain.before, state.pain.after);

  els.dailyTarget.textContent = state.dailyTarget;
  els.totalPoints.textContent = formatNumber(state.totalPoints);
  els.streak.textContent = state.streak;

  els.painBefore.value = state.pain.before;
  els.painAfter.value = state.pain.after;
  els.painBeforeValue.textContent = state.pain.before;
  els.painAfterValue.textContent = state.pain.after;
  els.painWarning.hidden = painMax <= 4;

  els.todayTitle.textContent = `${completedCount} de ${EXERCISES.length} ejercicios listos`;
  els.todaySubtitle.textContent = `Van ${totalReps} de ${maxRepsToday} repeticiones. ${getMotivationText(completedCount, painMax)}`;
  els.btnCompleteDay.disabled = state.completedToday;
  els.btnCompleteDay.textContent = state.completedToday ? "Día cerrado ✓" : "Cerrar día y desbloquear letra";

  renderLevel();
  renderSecretPhrase();
  renderCards();
  renderCalendar();
  renderHistory();
}

function renderSecretPhrase() {
  const progress = clamp((state.phrase.revealedCount / REVEALABLE_TOTAL) * 100, 0, 100);
  const lettersLeft = Math.max(REVEALABLE_TOTAL - state.phrase.revealedCount, 0);
  const todayLetter = state.phrase.unlockedByDate[state.currentDate];

  els.maskedPhrase.textContent = getMaskedPhrase(state.phrase.revealedCount);
  els.phraseProgressText.textContent = `${state.phrase.revealedCount} / ${REVEALABLE_TOTAL} letras`;
  els.phraseProgressBar.style.width = `${progress}%`;

  if (state.phrase.revealedCount >= REVEALABLE_TOTAL) {
    els.phraseHint.textContent = "Frase completa. Nivel sentimental desbloqueado, qué peligro tan humano. 💜";
    return;
  }

  if (todayLetter) {
    els.phraseHint.textContent = `Hoy se desbloqueó la letra “${todayLetter}”. Faltan ${lettersLeft} letras.`;
    return;
  }

  els.phraseHint.textContent = `Completa la rutina de hoy con dolor después máximo 4/10 para revelar la siguiente letra. Faltan ${lettersLeft} letras.`;
}

function getMaskedPhrase(revealedCount) {
  let cursor = 0;
  let output = "";

  for (const char of SECRET_PHRASE) {
    if (!REVEALABLE_CHAR_REGEX.test(char)) {
      output += char;
      continue;
    }

    output += cursor < revealedCount ? char : "_";
    cursor += 1;
  }

  return output;
}

function renderCards() {
  EXERCISES.forEach((exercise) => {
    const reps = Number(state.reps[exercise.id]) || 0;
    const progress = clamp((reps / state.dailyTarget) * 100, 0, 100);
    const done = Boolean(state.done[exercise.id]);

    const card = $(`[data-card="${exercise.id}"]`);
    const repsEl = $(`[data-reps="${exercise.id}"]`);
    const targetEl = $(`[data-target="${exercise.id}"]`);
    const statusEl = $(`[data-status="${exercise.id}"]`);
    const barEl = $(`[data-bar="${exercise.id}"]`);
    const completeBtn = $(`button[data-action="complete"][data-id="${exercise.id}"]`);

    if (!card || !repsEl || !targetEl || !statusEl || !barEl || !completeBtn) return;

    card.classList.toggle("is-done", done);
    repsEl.textContent = reps;
    targetEl.textContent = state.dailyTarget;
    statusEl.textContent = done ? "Listo ✓" : `${Math.max(state.dailyTarget - reps, 0)} faltan`;
    barEl.style.width = `${progress}%`;
    completeBtn.textContent = done ? "Completo ✓" : "Marcar completo";
    completeBtn.disabled = done && reps >= state.dailyTarget;
  });
}

function renderLevel() {
  const current = getCurrentLevel(state.xp);
  const next = getNextLevel(state.xp);
  const currentXp = current.xp;
  const nextXp = next?.xp ?? currentXp + 1000;
  const progress = clamp(((state.xp - currentXp) / (nextXp - currentXp)) * 100, 0, 100);

  els.levelName.textContent = current.name;
  els.levelProgressText.textContent = next ? `${state.xp - currentXp} / ${nextXp - currentXp} XP` : `${state.xp} XP`;
  els.levelProgressBar.style.width = `${progress}%`;
}

function renderCalendar() {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const todayKey = getTodayKey();
  const monthTitle = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(calendarViewDate);
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const cells = [];
  const recordsByDate = getRecordsByDate();

  els.calendarTitle.textContent = capitalize(monthTitle);

  for (let i = 0; i < mondayOffset; i += 1) {
    cells.push(`<div class="calendar-day is-empty" aria-hidden="true"></div>`);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = toDateKey(new Date(year, month, day));
    const record = recordsByDate[dateKey];
    const isToday = dateKey === todayKey;
    const letter = state.phrase.unlockedByDate[dateKey] || record?.unlockedLetter || "";
    const classes = ["calendar-day"];
    if (isToday) classes.push("is-today");
    if (record?.completed) classes.push("is-done");
    if (letter) classes.push("is-letter");

    const status = getCalendarDayStatus(record, letter, isToday);

    cells.push(`
      <div class="${classes.join(" ")}" title="${escapeHtml(status.title)}">
        <span class="calendar-day__number">${day}</span>
        <span class="calendar-day__status">${status.label}</span>
      </div>
    `);
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    for (let i = remainder; i < 7; i += 1) {
      cells.push(`<div class="calendar-day is-empty" aria-hidden="true"></div>`);
    }
  }

  els.calendarGrid.innerHTML = cells.join("");
}

function getCalendarDayStatus(record, letter, isToday) {
  if (letter) {
    return {
      label: `<span class="calendar-day__letter">${escapeHtml(letter)}</span> letra`,
      title: `Letra desbloqueada: ${letter}`
    };
  }

  if (record?.completed) {
    return {
      label: "Hecho",
      title: record.note || "Rutina completada sin letra"
    };
  }

  if (isToday && !state.completedToday) {
    return {
      label: "Hoy",
      title: "Rutina pendiente de hoy"
    };
  }

  return {
    label: "—",
    title: "Sin registro"
  };
}

function getRecordsByDate() {
  return state.history.reduce((map, item) => {
    map[item.date] = item;
    return map;
  }, {});
}

function changeCalendarMonth(delta) {
  calendarViewDate.setMonth(calendarViewDate.getMonth() + delta);
  renderCalendar();
}

function goToCurrentMonth() {
  calendarViewDate = new Date(`${getTodayKey()}T00:00:00`);
  calendarViewDate.setDate(1);
  renderCalendar();
}

function renderHistory() {
  if (!state.history.length) {
    els.historyList.innerHTML = `<p class="empty-state">Todavía no hay registros. El historial no se escribe solo, porque aparentemente nada útil se escribe solo.</p>`;
    return;
  }

  els.historyList.innerHTML = state.history.slice(0, 10).map((item) => {
    const letterText = item.letterUnlocked
      ? ` · letra “${escapeHtml(item.unlockedLetter)}” desbloqueada`
      : item.note
        ? ` · ${escapeHtml(item.note)}`
        : "";

    return `
      <article class="history-item">
        <div>
          <strong>${formatDate(item.date)} · objetivo ${item.target}</strong>
          <small>${item.totalReps} repeticiones · dolor ${item.painBefore}/10 → ${item.painAfter}/10${letterText}</small>
        </div>
        <span class="history-item__points">+${item.points} XP</span>
      </article>
    `;
  }).join("");
}

function getTotalReps() {
  return EXERCISES.reduce((sum, exercise) => sum + (Number(state.reps[exercise.id]) || 0), 0);
}

function getCurrentLevel(xp) {
  return LEVELS.reduce((current, level) => xp >= level.xp ? level : current, LEVELS[0]);
}

function getNextLevel(xp) {
  return LEVELS.find((level) => level.xp > xp) || null;
}

function calculateNextStreak(lastDate, currentDate) {
  if (!lastDate) return 1;
  if (lastDate === currentDate) return state.streak;
  return daysBetween(lastDate, currentDate) === 1 ? state.streak + 1 : 1;
}

function daysBetween(dateA, dateB) {
  const a = new Date(`${dateA}T00:00:00`);
  const b = new Date(`${dateB}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

function getMotivationText(completedCount, painMax) {
  if (painMax > 4) return "Dolor alto: hoy gana el modo suave, no el ego.";
  if (completedCount === 0) return "Empezar ya cuenta más que prometerse una vida nueva cada lunes.";
  if (completedCount < EXERCISES.length) return "Va cogiendo forma. Lento, pero con dignidad.";
  return "Listo para cerrar el día y revelar una letra. El amor, convertido en sistema de recompensas, porque así funciona esta especie.";
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 3200);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-CO").format(value);
}

function formatDate(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  return new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short" }).format(date);
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
