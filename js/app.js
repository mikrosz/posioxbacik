/* GAME CONFIG — tutaj podmieniaj treści, odpowiedzi, cyfry, PIN-y i ścieżki audio. */
const GAME_CONFIG = {
  posio: {
    playerName: "POSIO", gameTitle: "SECURITY PROTOCOL", finalPin: "738",
    stages: [
      { id: 1, title: "PROTOKÓŁ 01", puzzleText: "PLACEHOLDER — tutaj znajdzie się zagadka POSIO nr 1.", answer: "test1", digit: "7", audio: "audio/posio_01.mp3" },
      { id: 2, title: "PROTOKÓŁ 02", puzzleText: "PLACEHOLDER — tutaj znajdzie się zagadka POSIO nr 2.", answer: "test2", digit: "3", audio: "audio/posio_02.mp3" },
      { id: 3, title: "PROTOKÓŁ 03", puzzleText: "PLACEHOLDER — tutaj znajdzie się zagadka POSIO nr 3.", answer: "test3", digit: "8", audio: "audio/posio_03.mp3" }
    ], finalAudio: "audio/posio_final.mp3"
  },
  bacik: {
    playerName: "BACIK", gameTitle: "SECURITY PROTOCOL", finalPin: "421",
    stages: [
      { id: 1, title: "PROTOKÓŁ 01", puzzleText: "PLACEHOLDER — tutaj znajdzie się zagadka BACIKA nr 1.", answer: "test1", digit: "4", audio: "audio/bacik_01.mp3" },
      { id: 2, title: "PROTOKÓŁ 02", puzzleText: "PLACEHOLDER — tutaj znajdzie się zagadka BACIKA nr 2.", answer: "test2", digit: "2", audio: "audio/bacik_02.mp3" },
      { id: 3, title: "PROTOKÓŁ 03", puzzleText: "PLACEHOLDER — tutaj znajdzie się zagadka BACIKA nr 3.", answer: "test3", digit: "1", audio: "audio/bacik_03.mp3" }
    ], finalAudio: "audio/bacik_final.mp3"
  }
};

const params = new URLSearchParams(window.location.search);
const playerId = params.get("player");
const debugMode = params.get("debug") === "1";
const config = GAME_CONFIG[playerId];
const app = document.querySelector("#app");
const storageKey = `security_game_${playerId}`;
let state;
let glitchTimer;
let glitchBurstTimer;
let backgroundAudio;

function defaultState() { return { screen: "start", currentStage: 0, completedStages: [], digits: [], completed: false }; }
function loadState() { try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(storageKey) || "null") }; } catch { return defaultState(); } }
function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
function animatedPlayerName(name) { return [...name].map((letter, index) => `<span class="logo-letter letter-${index + 1}">${escapeHtml(letter)}</span>`).join(""); }
function glitchSlices() { return `<span class="glitch-field" aria-hidden="true"></span>`; }
function render(markup, screenClass = "") { clearTimeout(glitchTimer); clearTimeout(glitchBurstTimer); clearInterval(glitchTimer); clearInterval(glitchBurstTimer); if (backgroundAudio) { backgroundAudio.pause(); backgroundAudio = null; } document.querySelectorAll(".glitch-canvas").forEach(canvas => canvas.remove()); app.innerHTML = `<section class="screen ${screenClass}">${markup}</section>`; }
function startLogoGlitch() {
  const targets = [...document.querySelectorAll(".glitch-target")];
  if (!targets.length) return;
  const colors = ["#ff174f", "#00eaff", "#2455ff", "#ffffff"];
  const fillTarget = target => {
    const isLabel = target.classList.contains("eyebrow");
    const bounds = target.getBoundingClientRect();
    const extension = isLabel ? 0 : bounds.width * .36;
    let canvas = target._glitchCanvas;
    if (!canvas) { canvas = document.createElement("canvas"); canvas.className = "glitch-canvas"; document.body.appendChild(canvas); target._glitchCanvas = canvas; }
    const width = Math.max(1, bounds.width + extension);
    const height = Math.max(1, bounds.height);
    canvas.style.position = "absolute";
    canvas.style.left = `${bounds.left + window.scrollX - extension / 2}px`;
    canvas.style.top = `${bounds.top + window.scrollY}px`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    context.scale(ratio, ratio);
    const styles = getComputedStyle(target);
    context.font = styles.font;
    context.textBaseline = "alphabetic";
    const baseline = height * .78;
    const textOffset = isLabel ? 0 : width * .13;
    const fragmentCount = isLabel ? 120 : 96;
    for (let index = 0; index < fragmentCount; index += 1) {
      const top = Math.random() * (height - 1);
      const stripHeight = .5 + Math.random() * Math.max(1, height * .045);
      const shiftRange = isLabel ? 28 : 62;
      const shift = Math.round(Math.random() * shiftRange - shiftRange / 2);
      const sliceWidth = width * (.08 + Math.random() * .58);
      const sliceLeft = Math.max(0, Math.min(width - sliceWidth, Math.random() * width));
      context.save();
      context.beginPath();
      context.rect(sliceLeft, top, sliceWidth, stripHeight);
      context.clip();
      context.globalCompositeOperation = "lighter";
      context.fillStyle = colors[index % colors.length];
      context.fillText(target.dataset.text, textOffset + shift, baseline);
      context.restore();
    }
  };
  const trigger = () => {
    clearTimeout(glitchBurstTimer);
    targets.forEach(target => { target.classList.add("glitch-active"); fillTarget(target); });
    const duration = 80 + Math.pow(Math.random(), 3) * 680;
    const startedAt = performance.now();
    const burst = () => {
      if (!targets.every(target => document.body.contains(target))) { clearTimeout(glitchBurstTimer); return; }
      targets.forEach(fillTarget);
      if (performance.now() - startedAt >= duration) {
        targets.forEach(target => { target.classList.remove("glitch-active"); if (target._glitchCanvas) { target._glitchCanvas.remove(); target._glitchCanvas = null; } });
        glitchTimer = setTimeout(trigger, 900 + Math.random() * 2300);
        return;
      }
      glitchBurstTimer = setTimeout(burst, 16 + Math.random() * 30);
    };
    glitchBurstTimer = setTimeout(burst, 14 + Math.random() * 24);
  };
  glitchTimer = setTimeout(trigger, 350);
}
function header(label = "SECURITY PROTOCOL") { return `<header class="topbar"><span class="brand player-name">${escapeHtml(config.playerName)}</span><div class="topbar-right"><small>${label}</small><button class="home-button" data-action="home" aria-label="Wróć do ekranu startowego">START</button></div></header>`; }
function debugPanel() { if (!debugMode) return ""; return `<aside class="debug"><div class="debug-title">DEBUG / ${escapeHtml(playerId)}</div><div class="debug-grid"><button class="button" data-debug="reset">RESET GAME</button><button class="button" data-debug="skip">SKIP STAGE</button><button class="button" data-debug="clear">CLEAR STORAGE</button><button class="button" data-stage="0">GO TO STAGE 1</button><button class="button" data-stage="1">GO TO STAGE 2</button><button class="button" data-stage="2">GO TO STAGE 3</button><button class="button" data-debug="final">GO TO FINAL</button></div></aside>`; }
function footer() { return `<footer class="footer">LOCAL NODE // ${escapeHtml(playerId)} // OFFLINE MODE</footer>`; }

function showInvalid() {
  app.innerHTML = `<section class="screen"><div class="content"><div class="hero-mark">×</div><span class="eyebrow">ACCESS CONTROL</span><h1>INVALID<br>ACCESS LINK</h1><p class="message">Użyj kodu QR przypisanego do Twojego pudełka.</p></div></section>`;
}
function showStart() {
  state.screen = "start"; saveState();
  render(`<div class="content start-content"><span class="eyebrow glitch-target" data-text="IDENTITY VERIFIED">IDENTITY VERIFIED${glitchSlices()}</span><h1 class="player-name glitch-target" data-text="${escapeHtml(config.playerName)}">${animatedPlayerName(config.playerName)}${glitchSlices()}</h1><p class="subtitle">${escapeHtml(config.gameTitle)}</p><p class="message">Dostęp do zawartości został zablokowany.<br><br>Aby odzyskać kod dostępu, przejdź procedurę weryfikacji.</p><div class="actions"><button class="button" data-action="start">ROZPOCZNIJ</button></div></div>${footer()}${debugPanel()}`, playerId === "posio" ? "start-page" : "");
  startLogoGlitch();
  bindDebug();
}
function showBriefing() {
  state.screen = "briefing"; saveState();
  render(`${header("SYSTEM INITIALIZED")}<div class="content"><span class="eyebrow">SECURITY PROTOCOL</span><h2>POŁĄCZENIE<br>AKTYWNE</h2><p class="message">Tożsamość potwierdzona.<br><br>Rozpoczynam procedurę odzyskiwania kodu dostępu. Przygotuj się na trzy etapy weryfikacji.</p><div class="actions"><button class="button" data-action="briefing">KONTYNUUJ</button></div></div>${footer()}${debugPanel()}`);
  bindDebug();
}
function showIntroAudio() {
  state.screen = "intro-audio"; saveState();
  render(`<div class="transition-screen" aria-hidden="true"><div class="loading-glitch"></div></div>`, "zmuda-transition");
  const audio = new Audio("./audio/wszystkowtemacie.mp3");
  audio.preload = "auto";
  backgroundAudio = audio;
  let finished = false;
  const finish = () => { if (finished) return; finished = true; backgroundAudio = null; showBriefing(); };
  const fallback = () => { if (finished) return; finished = true; console.warn("Brak pliku audio lub nie można go odtworzyć: audio/wszystkowtemacie.mp3"); setTimeout(() => { backgroundAudio = null; showBriefing(); }, 1000); };
  audio.addEventListener("ended", finish, { once: true });
  audio.addEventListener("error", fallback, { once: true });
  audio.addEventListener("canplaythrough", () => { document.querySelector(".loading-glitch")?.remove(); audio.play().catch(fallback); }, { once: true });
  audio.load();
}
function pinPreview() { return config.stages.map((_, i) => `<span class="pin-box ${state.digits[i] ? "digit-reveal" : "hidden"}">${state.digits[i] || "_"}</span>`).join(""); }
function showJumpGame() {
  state.screen = "stage"; saveState();
  render(`${header("PROTOKÓŁ 01 / 03")}<div class="content"><div class="progress-wrap"><div class="progress-label"><span>POSTĘP PROCEDURY</span><span>1 / ${config.stages.length}</span></div><div class="progress-track"><div class="progress-bar" style="width:0%"></div></div></div><div class="stage-kicker">PROTOKÓŁ 01</div><div class="game-panel"><div class="game-heading"><h2>PRZEBIJ SIĘ<br>PRZEZ PLOTKI</h2><span class="game-score" id="game-score">0 / 8</span></div><p class="game-instruction">Kliknij przycisk, aby ZMUDA przeskakiwał przez płotki.</p><canvas id="jump-game" width="900" height="430" aria-label="Gra zręcznościowa — przeskakiwanie przez płotki"></canvas><button class="button jump-button" data-game-action="jump">SKOK</button><div class="game-feedback" id="game-feedback" role="status"></div></div><div class="pin-title">PIN</div><div class="pin-row">${pinPreview()}</div></div>${footer()}${debugPanel()}`);
  startJumpGame(); bindDebug();
}
function startJumpGame() {
  const canvas = document.querySelector("#jump-game"); const context = canvas.getContext("2d"); const playerImage = new Image(); playerImage.src = "./assets/images/gra%20zmuda.png";
  const player = { x: 92, y: 0, width: 100, height: 125, velocity: 0, jumping: false }; let obstacles = []; let score = 0; let elapsed = 0; let lastTime = performance.now(); let running = true; let animationId;
  const ground = 355; const jump = () => { if (running && !player.jumping) { player.velocity = -690; player.jumping = true; } };
  document.querySelector("[data-game-action='jump']").addEventListener("click", jump);
  const keyHandler = event => { if (event.code === "Space") { event.preventDefault(); jump(); } }; window.addEventListener("keydown", keyHandler);
  const finish = () => { window.removeEventListener("keydown", keyHandler); cancelAnimationFrame(animationId); };
  const fail = () => { running = false; finish(); const feedback = document.querySelector("#game-feedback"); feedback.textContent = "KOLIZJA — SPRÓBUJ PONOWNIE"; feedback.classList.add("game-fail"); const button = document.querySelector("[data-game-action='jump']"); button.textContent = "SPRÓBUJ PONOWNIE"; button.onclick = () => showJumpGame(); };
  const win = () => { running = false; finish(); const stage = config.stages[0]; state.digits[0] = stage.digit; state.completedStages = [...new Set([...state.completedStages, stage.id])]; state.currentStage = 1; saveState(); document.querySelector("#game-feedback").textContent = "WERYFIKACJA ZAKOŃCZONA"; const button = document.querySelector("[data-game-action='jump']"); button.textContent = "DALEJ"; button.onclick = () => playAudio(stage.audio, false); };
  const draw = time => { if (!running) return; const delta = Math.min((time - lastTime) / 1000, .04); lastTime = time; elapsed += delta; player.velocity += 1800 * delta; player.y += player.velocity * delta; if (player.y >= 0) { player.y = 0; player.velocity = 0; player.jumping = false; } if (elapsed > 1.05 && (!obstacles.length || obstacles[obstacles.length - 1].x < 560)) obstacles.push({ x: canvas.width + 20, width: 24, height: 63 }); obstacles.forEach(obstacle => { obstacle.x -= (290 + Math.min(score, 5) * 12) * delta; }); obstacles = obstacles.filter(obstacle => obstacle.x > -60); const hitbox = { x: player.x + 20, y: ground - player.height + player.y + 12, width: 46, height: player.height - 18 }; for (const obstacle of obstacles) { const obstacleBox = { x: obstacle.x, y: ground - obstacle.height, width: obstacle.width, height: obstacle.height }; if (hitbox.x < obstacleBox.x + obstacleBox.width && hitbox.x + hitbox.width > obstacleBox.x && hitbox.y < obstacleBox.y + obstacleBox.height && hitbox.y + hitbox.height > obstacleBox.y) return fail(); } if (obstacles.some(obstacle => !obstacle.counted && obstacle.x + obstacle.width < player.x)) { obstacles.filter(obstacle => !obstacle.counted && obstacle.x + obstacle.width < player.x).forEach(obstacle => { obstacle.counted = true; score += 1; }); document.querySelector("#game-score").textContent = `${score} / 8`; if (score >= 8) return win(); } context.clearRect(0, 0, canvas.width, canvas.height); context.fillStyle = "#050505"; context.fillRect(0, 0, canvas.width, canvas.height); context.strokeStyle = "#8b5cf655"; context.lineWidth = 2; context.beginPath(); context.moveTo(0, ground + 1); context.lineTo(canvas.width, ground + 1); context.stroke(); if (playerImage.complete) context.drawImage(playerImage, player.x, ground - player.height + player.y, player.width, player.height); context.fillStyle = "#8b5cf6"; obstacles.forEach(obstacle => { context.fillRect(obstacle.x, ground - obstacle.height, obstacle.width, obstacle.height); context.fillRect(obstacle.x - 8, ground - obstacle.height, obstacle.width + 16, 7); }); animationId = requestAnimationFrame(draw); }; requestAnimationFrame(draw);
}
function showStage() {
  const index = state.currentStage; const stage = config.stages[index];
  if (!stage) return showFinalAudio();
  if (index === 0) return showJumpGame();
  state.screen = "stage"; saveState();
  render(`${header(`PROTOKÓŁ ${String(index + 1).padStart(2, "0")} / 03`)}<div class="content"><div class="progress-wrap"><div class="progress-label"><span>POSTĘP PROCEDURY</span><span>${index + 1} / ${config.stages.length}</span></div><div class="progress-track"><div class="progress-bar" style="width:${(index / config.stages.length) * 100}%"></div></div></div><div class="stage-kicker">${escapeHtml(stage.title)}</div><div class="puzzle-panel" id="puzzle-panel"><h2>Weryfikacja danych</h2><p class="puzzle-text">${escapeHtml(stage.puzzleText)}</p><form class="answer-form" id="answer-form"><label class="label" for="answer">ODPOWIEDŹ</label><input class="answer-input" id="answer" name="answer" autocomplete="off" autocapitalize="none" spellcheck="false" required><button class="button" type="submit">SPRAWDŹ</button><div class="feedback" id="feedback" role="status"></div></form></div><div class="pin-title">PIN</div><div class="pin-row">${pinPreview()}</div></div>${footer()}${debugPanel()}`);
  document.querySelector("#answer-form").addEventListener("submit", e => checkAnswer(e, stage));
  bindDebug();
}
function checkAnswer(event, stage) {
  event.preventDefault(); const input = document.querySelector("#answer"); const form = document.querySelector("#answer-form"); const feedback = document.querySelector("#feedback");
  if (input.value.trim().toLowerCase() !== stage.answer.trim().toLowerCase()) { feedback.textContent = "ODPOWIEDŹ NIEPRAWIDŁOWA"; document.querySelector("#puzzle-panel").classList.remove("shake"); void document.querySelector("#puzzle-panel").offsetWidth; document.querySelector("#puzzle-panel").classList.add("shake"); input.focus(); return; }
  input.disabled = true; form.querySelector("button").disabled = true; feedback.textContent = "WERYFIKACJA...";
  setTimeout(() => { feedback.textContent = "DOSTĘP CZĘŚCIOWO PRZYZNANY"; state.digits[state.currentStage] = stage.digit; state.completedStages = [...new Set([...state.completedStages, stage.id])]; saveState(); setTimeout(() => playAudio(stage.audio, false), 400); }, 700);
}
function formatTime(seconds) { if (!Number.isFinite(seconds)) return "00:00"; return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; }
function playAudio(path, isFinal, onComplete = null, customLabel = "") {
  const transmissionLabel = customLabel || (isFinal ? "TRANSMISJA KOŃCOWA" : "TRANSMISJA PRZYCHODZĄCA");
  const finish = () => onComplete ? onComplete() : audioFinished(isFinal);
  render(`${header(transmissionLabel)}<div class="content"><div class="audio-panel" id="audio-panel"><div class="eyebrow">${transmissionLabel}</div><div class="audio-state">▶ ODTWARZANIE WIADOMOŚCI</div><div class="audio-meta"><span id="audio-current">00:00</span><span id="audio-duration">--:--</span></div><div class="audio-track"><div class="audio-progress" id="audio-progress"></div></div><div class="feedback" id="audio-feedback"></div><audio id="game-audio" preload="metadata"></audio></div></div>${footer()}${debugPanel()}`);
  const audio = document.querySelector("#game-audio"); let finished = false;
  const fallback = () => { if (finished) return; finished = true; console.warn(`Brak pliku audio lub nie można go odtworzyć: ${path}`); document.querySelector("#audio-feedback").innerHTML = "[ BRAK PLIKU AUDIO — TRYB TESTOWY ]"; setTimeout(finish, 1000); };
  audio.addEventListener("error", fallback, { once: true }); audio.addEventListener("ended", () => { if (!finished) { finished = true; finish(); } });
  audio.addEventListener("loadedmetadata", () => { document.querySelector("#audio-duration").textContent = formatTime(audio.duration); });
  audio.addEventListener("timeupdate", () => { document.querySelector("#audio-current").textContent = formatTime(audio.currentTime); document.querySelector("#audio-progress").style.width = `${audio.duration ? audio.currentTime / audio.duration * 100 : 0}%`; });
  audio.src = `./${path}`; audio.play().catch(fallback); bindDebug();
}
function audioFinished(isFinal) { if (isFinal) { state.completed = true; state.screen = "complete"; saveState(); showComplete(); } else { state.currentStage += 1; saveState(); showDigit(); } }
function showDigit() { render(`${header()}<div class="content"><span class="eyebrow">WERYFIKACJA ZAKOŃCZONA</span><h2>CYFRA ODSZYFROWANA</h2><div class="pin-title" style="margin-top:32px">PIN</div><div class="pin-row">${pinPreview()}</div><div class="actions"><button class="button" data-action="next">DALEJ</button></div></div>${footer()}${debugPanel()}`); bindDebug(); }
function showFinalAudio() { state.screen = "final-audio"; saveState(); playAudio(config.finalAudio, true); }
function showComplete() { render(`${header("ACCESS GRANTED")}<div class="content"><div class="final-panel"><div class="eyebrow">PROCEDURA ZAKOŃCZONA</div><h1>ACCESS<br>GRANTED</h1><div class="pin-title" style="margin-top:34px">KOD DOSTĘPU</div><div class="final-pin">${escapeHtml(config.finalPin)}</div><p class="message">Procedura zakończona.<br>Możesz otworzyć kłódkę.</p></div></div>${footer()}${debugPanel()}`); bindDebug(); }
function bindDebug() { document.querySelectorAll("[data-action]").forEach(b => b.addEventListener("click", () => b.dataset.action === "start" ? showIntroAudio() : b.dataset.action === "briefing" ? showStage() : b.dataset.action === "home" ? (state = defaultState(), saveState(), showStart()) : b.dataset.action === "next" ? (state.currentStage >= config.stages.length ? showFinalAudio() : showStage()) : null)); document.querySelectorAll("[data-debug]").forEach(b => b.addEventListener("click", () => { const action = b.dataset.debug; if (action === "reset" || action === "clear") { localStorage.removeItem(storageKey); state = defaultState(); showStart(); } else if (action === "skip" && state.currentStage < config.stages.length) { state.digits[state.currentStage] = config.stages[state.currentStage].digit; state.completedStages = [...new Set([...state.completedStages, config.stages[state.currentStage].id])]; state.currentStage = Math.min(state.currentStage + 1, config.stages.length); saveState(); showStage(); } else if (action === "final") { state.currentStage = config.stages.length; saveState(); showFinalAudio(); } })); document.querySelectorAll("[data-stage]").forEach(b => b.addEventListener("click", () => { state.currentStage = Number(b.dataset.stage); state.screen = "stage"; saveState(); showStage(); })); }

if (!config) showInvalid();
else { state = loadState(); if (state.completed) showComplete(); else if (state.screen === "stage") showStage(); else if (state.screen === "briefing") showBriefing(); else if (state.screen === "intro-audio") showIntroAudio(); else if (state.screen === "final-audio") showFinalAudio(); else if (state.currentStage > 0) showDigit(); else showStart(); }
