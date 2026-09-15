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
let collisionTimer;
let fleetTurnTimer;
let backgroundAudio;
let activeScreenDisposer;

function defaultState() { return { screen: "start", currentStage: 0, completedStages: [], digits: [], completed: false }; }
function loadState() { try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(storageKey) || "null") }; } catch { return defaultState(); } }
function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
function animatedPlayerName(name) { return [...name].map((letter, index) => `<span class="logo-letter letter-${index + 1}">${escapeHtml(letter)}</span>`).join(""); }
function glitchSlices() { return `<span class="glitch-field" aria-hidden="true"></span>`; }
function render(markup, screenClass = "") { if (activeScreenDisposer) { try { activeScreenDisposer(); } catch (error) { console.warn("Nie udało się zatrzymać poprzedniego ekranu gry", error); } activeScreenDisposer = null; } clearTimeout(glitchTimer); clearTimeout(glitchBurstTimer); clearTimeout(collisionTimer); clearTimeout(fleetTurnTimer); clearInterval(glitchTimer); clearInterval(glitchBurstTimer); if (backgroundAudio) { backgroundAudio.pause(); backgroundAudio = null; } document.querySelectorAll(".glitch-canvas").forEach(canvas => canvas.remove()); app.innerHTML = `<section class="screen ${screenClass}">${markup}</section>`; }
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
  const finish = () => { if (finished) return; finished = true; backgroundAudio = null; showStage(); };
  const fallback = () => { if (finished) return; finished = true; console.warn("Brak pliku audio lub nie można go odtworzyć: audio/wszystkowtemacie.mp3"); setTimeout(() => { backgroundAudio = null; showStage(); }, 1000); };
  audio.addEventListener("ended", finish, { once: true });
  audio.addEventListener("error", fallback, { once: true });
  let started = false;
  const startPlayback = () => { if (started) return; started = true; document.querySelector(".loading-glitch")?.remove(); audio.play().catch(fallback); };
  audio.addEventListener("canplay", startPlayback, { once: true });
  audio.addEventListener("canplaythrough", startPlayback, { once: true });
  audio.src = "./audio/wszystkowtemacie.mp3";
  audio.load();
}
function pinPreview() { return config.stages.map((_, i) => `<span class="pin-box ${state.digits[i] ? "digit-reveal" : "hidden"}">${state.digits[i] || "_"}</span>`).join(""); }
function showJumpGame() {
  state.screen = "stage"; saveState();
  render(`${header("PROTOKÓŁ 01 / 03")}<div class="content game-content"><div class="game-panel"><span class="game-score" id="game-score">0 / 8</span><canvas id="jump-game" width="900" height="560" aria-label="Gra zręcznościowa — przeskakiwanie przez płotki"></canvas><img class="collision-gif" id="collision-gif" src="./assets/images/zderzenie.gif" alt="" hidden><button class="button game-start-button" data-game-action="begin">START GRY</button><button class="button jump-button" data-game-action="jump" disabled>SKOK</button><div class="game-feedback" id="game-feedback" role="status"></div></div></div>${footer()}${debugPanel()}`);
  startJumpGame(); bindDebug();
}
function startJumpGame() {
  const canvas = document.querySelector("#jump-game");
  const context = canvas.getContext("2d");
  const playerImage = new Image();
  const runnerImage = new Image();
  const gameAudio = new Audio("./audio/zesraciesi%C4%99zestrachu.mp3");
  gameAudio.preload = "auto";
  gameAudio.loop = false;
  gameAudio.load();
  playerImage.src = "./assets/images/gra%20zmuda.png";
  runnerImage.src = "./assets/images/chlopieczestrzelnicy.png";
  const player = { x: 62, y: 0, width: 360, height: 450, velocity: 0, jumping: false };
  const runner = { x: 345, y: 0, width: 270, height: 360, velocity: 0, jumping: false };
  let obstacles = [];
  let score = 0;
  let elapsed = 0;
  let lastTime = performance.now();
  let running = false;
  let chasing = false;
  let animationId;
  const ground = 475;
  const jump = () => {
    if (running && !chasing && !player.jumping) {
      player.velocity = -1000;
      player.jumping = true;
    }
  };
  const jumpButton = document.querySelector("[data-game-action='jump']");
  const skipButton = document.createElement("button");
  skipButton.className = "button secondary game-skip-button";
  skipButton.textContent = "POMIŃ GRĘ";
  jumpButton.after(skipButton);
  jumpButton.addEventListener("click", jump);
  skipButton.addEventListener("click", () => { running = false; finish(); const stage = config.stages[0]; state.digits[0] = stage.digit; state.completedStages = [...new Set([...state.completedStages, stage.id])]; state.currentStage = 1; saveState(); showGameDigit(stage.digit); });
  document.querySelector("[data-game-action='begin']").addEventListener("click", () => {
    running = true;
    lastTime = performance.now();
    document.querySelector("[data-game-action='begin']").hidden = true;
    jumpButton.disabled = false;
    gameAudio.currentTime = 0;
    gameAudio.play().catch(() => {});
    animationId = requestAnimationFrame(draw);
  });
  const keyHandler = event => {
    if (event.code === "Space") { event.preventDefault(); jump(); }
  };
  window.addEventListener("keydown", keyHandler);
  const finish = () => { window.removeEventListener("keydown", keyHandler); cancelAnimationFrame(animationId); gameAudio.pause(); gameAudio.currentTime = 0; };
  const fail = () => {
    running = false;
    finish();
    const feedback = document.querySelector("#game-feedback");
    feedback.textContent = "KOLIZJA — SPRÓBUJ PONOWNIE";
    feedback.classList.add("game-fail");
    const button = document.querySelector("[data-game-action='jump']");
    button.textContent = "SPRÓBUJ PONOWNIE";
    button.onclick = () => showJumpGame();
  };
  const completeWin = () => {
    running = false;
    finish();
    const stage = config.stages[0];
    state.digits[0] = stage.digit;
    state.completedStages = [...new Set([...state.completedStages, stage.id])];
    state.currentStage = 1;
    saveState();
    showGameDigit(stage.digit);
  };
  const win = () => {
    chasing = true;
    running = true;
    obstacles = [];
    jumpButton.disabled = true;
    collisionTimer = setTimeout(() => {
      chasing = false;
      running = false;
      finish();
      const collisionGif = document.querySelector("#collision-gif");
      collisionGif.hidden = false;
      collisionTimer = setTimeout(completeWin, 2800);
    }, 700);
    animationId = requestAnimationFrame(draw);
  };
  const draw = time => {
    if (!running) return;
    const delta = Math.min((time - lastTime) / 1000, .04);
    lastTime = time;
    elapsed += delta;
    if (chasing) player.x = Math.min(player.x + 420 * delta, runner.x - 60);
    player.velocity += 1600 * delta;
    player.y += player.velocity * delta;
    if (player.y >= 0) { player.y = 0; player.velocity = 0; player.jumping = false; }
    if (elapsed > 1.05 && (!obstacles.length || obstacles[obstacles.length - 1].x < 380)) obstacles.push({ x: canvas.width + 20, width: 24, height: 63 });
    const gameSpeed = 220 + Math.min(score, 7) * 32;
    obstacles.forEach(obstacle => { obstacle.x -= gameSpeed * delta; });
    obstacles = obstacles.filter(obstacle => obstacle.x > -60);

    const nextObstacle = obstacles.find(obstacle => obstacle.x > runner.x && obstacle.x - runner.x < 155);
    if (nextObstacle && !runner.jumping) { runner.velocity = -820; runner.jumping = true; }
    runner.velocity += 1600 * delta;
    runner.y += runner.velocity * delta;
    if (runner.y >= 0) { runner.y = 0; runner.velocity = 0; runner.jumping = false; }

    const hitbox = { x: player.x + 105, y: ground - player.height + player.y + 250, width: 105, height: 145 };
    for (const obstacle of obstacles) {
      const obstacleBox = { x: obstacle.x, y: ground - obstacle.height, width: obstacle.width, height: obstacle.height };
      if (hitbox.x < obstacleBox.x + obstacleBox.width && hitbox.x + hitbox.width > obstacleBox.x && hitbox.y < obstacleBox.y + obstacleBox.height && hitbox.y + hitbox.height > obstacleBox.y) return fail();
    }
    if (obstacles.some(obstacle => !obstacle.counted && obstacle.x + obstacle.width < player.x)) {
      obstacles.filter(obstacle => !obstacle.counted && obstacle.x + obstacle.width < player.x).forEach(obstacle => { obstacle.counted = true; score += 1; });
      document.querySelector("#game-score").textContent = `${score} / 8`;
      if (score >= 8) return win();
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#050505";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#8b5cf655";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, ground + 1);
    context.lineTo(canvas.width, ground + 1);
    context.stroke();
    if (runnerImage.complete) context.drawImage(runnerImage, runner.x, ground - runner.height + runner.y + 120, runner.width, runner.height);
    if (playerImage.complete) context.drawImage(playerImage, player.x, ground - player.height + player.y + 165, player.width, player.height);
    context.fillStyle = "#8b5cf6";
    obstacles.forEach(obstacle => {
      context.fillRect(obstacle.x, ground - obstacle.height, obstacle.width, obstacle.height);
      context.fillRect(obstacle.x - 8, ground - obstacle.height, obstacle.width + 16, 7);
    });
    animationId = requestAnimationFrame(draw);
  };
}
function showGameDigit(digit) {
  state.screen = "stage"; saveState();
  render(`${header("PROTOKÓŁ 01 / 03")}<div class="content game-digit-content"><div class="eyebrow">KOD DO KŁÓDKI</div><h2>CYFRA ODSZYFROWANA</h2><div class="game-digit">${escapeHtml(digit)}</div><div class="fleet-status">PRZEJŚCIE DO KOLEJNEGO ETAPU</div></div>${footer()}${debugPanel()}`);
  collisionTimer = setTimeout(showFleetTransition, 2400);
}
function showFleetTransition() {
  state.screen = "fleet-transition"; saveState();
  render(`${header("PROTOKÓŁ 02 / 03")}<div class="fleet-transition-screen" aria-label="Ekran przejściowy"><img class="captain-gotenhafen" src="./assets/images/kapitangotenhafen.gif" alt="Kapitan Gotenhafen"></div>${footer()}${debugPanel()}`, "fleet-transition");
  const audio = new Audio("./audio/gotenhafen.mp3");
  audio.preload = "auto";
  backgroundAudio = audio;
  let finished = false;
  const finish = () => { if (finished) return; finished = true; backgroundAudio = null; showBattleshipGame(); };
  const fallback = () => { if (finished) return; finished = true; backgroundAudio = null; setTimeout(showBattleshipGame, 1000); };
  audio.addEventListener("ended", finish, { once: true });
  audio.addEventListener("error", fallback, { once: true });
  let started = false;
  const startPlayback = () => { if (started) return; started = true; audio.play().catch(fallback); };
  audio.addEventListener("canplay", startPlayback, { once: true });
  audio.addEventListener("canplaythrough", startPlayback, { once: true });
  audio.src = "./audio/gotenhafen.mp3";
  audio.load();
}
function showBattleshipGame() {
  state.screen = "stage"; saveState();
  const makeGrid = (name, own = false) => Array.from({ length: 64 }, (_, index) => { const row = Math.floor(index / 8); const column = String.fromCharCode(65 + index % 8); const coordinate = `${column}${row + 1}`; const shipCells = new Set([0, 1, 2, 3, 20, 21, 22, 32, 33, 34, 53, 54]); return `<button class="fleet-cell${own && shipCells.has(index) ? " fleet-ship" : ""}" data-fleet-${name}="${index}" data-coordinate="${coordinate}" aria-label="${own ? "Twoje pole" : "Cel"} ${coordinate}" disabled></button>`; }).join("");
  render(`${header("PROTOKÓŁ 02 / 03")}<div class="content fleet-content"><div class="fleet-panel"><div class="fleet-score" id="fleet-score">0 / 12</div><div class="fleet-card" id="fleet-card"><div class="fleet-card-inner" id="fleet-card-inner"><div class="fleet-card-face fleet-front"><div class="fleet-label">WODY PRZECIWNIKA <span>— NAMIERZANIE</span></div><div class="fleet-grid" id="enemy-grid">${makeGrid("enemy")}</div></div><div class="fleet-card-face fleet-back"><div class="fleet-label">TWOJA FLOTA <span>— STATUS</span></div><div class="fleet-grid" id="player-grid">${makeGrid("player", true)}</div></div></div></div><div class="fleet-status" id="fleet-status">NACIŚNIJ START, ABY ROZPOCZĄĆ</div><button class="button fleet-start" id="fleet-start">START BITWY</button><button class="button fleet-next" id="fleet-next" hidden>DALEJ</button></div></div>${footer()}${debugPanel()}`);
  startBattleshipGame(); bindDebug();
}
function startBattleshipGame() {
  const enemyGrid = document.querySelector("#enemy-grid");
  const playerGrid = document.querySelector("#player-grid");
  const startButton = document.querySelector("#fleet-start");
  const nextButton = document.querySelector("#fleet-next");
  const skipButton = document.createElement("button");
  skipButton.className = "button secondary game-skip-button";
  skipButton.textContent = "POMIŃ GRĘ";
  startButton.after(skipButton);
  const status = document.querySelector("#fleet-status");
  const score = document.querySelector("#fleet-score");
  const fleetCard = document.querySelector("#fleet-card-inner");
  const hitAudioGood = new Audio("./audio/jest%20dobrze.mp3");
  const hitAudioNo = new Audio("./audio/No.mp3");
  const hitAudioUss = new Audio("./audio/uss%20zmuda.mp3");
  const hitAudioOJeny = new Audio("./audio/o%20jeny.mp3");
  const hitAudioHahaha = new Audio("./audio/hahaha.mp3");
  const hitAudioFinal = new Audio("./audio/Tykurwo.mp3");
  const hitAudios = [hitAudioGood, hitAudioNo, hitAudioUss, hitAudioOJeny, hitAudioHahaha];
  hitAudios.forEach(audio => { audio.preload = "auto"; audio.load(); });
  hitAudioFinal.preload = "auto";
  hitAudioFinal.load();
  let hitCommentIndex = 0;
  const enemyFleet = new Set([0, 1, 2, 3, 20, 21, 22, 32, 33, 34, 53, 54]);
  let playerFleet = new Set([0, 1, 2, 3, 20, 21, 22, 32, 33, 34, 53, 54]);
  const enemyShots = [32, 24, 33, 40, 16, 8, 34, 48, 12, 60];
  let hits = 0;
  let enemyTurn = 0;
  let started = false;
  let finished = false;
  let playerTurn = false;
  skipButton.addEventListener("click", () => { finished = true; playerTurn = false; clearTimeout(fleetTurnTimer); state.digits[1] = config.stages[1].digit; state.completedStages = [...new Set([...state.completedStages, config.stages[1].id])]; state.currentStage = 2; saveState(); showStage(); });
  const enemyCells = [...enemyGrid.querySelectorAll("[data-fleet-enemy]")];
  const playerCells = [...playerGrid.querySelectorAll("[data-fleet-player]")];
  const setStatus = message => { status.textContent = message; };
  const endGame = () => {
    finished = true;
    playerTurn = false;
    enemyCells.forEach(cell => { cell.disabled = true; });
    state.digits[1] = config.stages[1].digit;
    state.completedStages = [...new Set([...state.completedStages, config.stages[1].id])];
    state.currentStage = 2;
    saveState();
    setStatus("FLOTA PRZECIWNIKA ZNISZCZONA");
    nextButton.hidden = false;
    nextButton.addEventListener("click", () => playAudio(config.stages[1].audio, false), { once: true });
  };
  const enemyAttack = () => {
    if (enemyTurn >= enemyShots.length) { playerTurn = true; setStatus("TWOJA TURA — NAMIERZ OKRĘT"); return; }
    const target = enemyShots[enemyTurn++];
    const playerCell = playerCells[target];
    if (!playerCell) { playerTurn = true; setStatus("TWOJA TURA — NAMIERZ OKRĘT"); return; }
    playerCell.classList.add(playerFleet.has(target) ? "fleet-hit-player" : "fleet-miss-player");
    if (target === 26) setStatus("FLOTA USZKODZONA — TWOJA TURA");
    else if (playerFleet.has(target)) setStatus("TRAFIENIE. TWOJA TURA.");
    else setStatus("PRZECIWNIK SPUDŁOWAŁ. TWOJA TURA.");
    playerTurn = true;
  };
  const beginComputerTurn = () => {
    setStatus("KARTA OBRACA SIĘ — KOMPUTER MYŚLI...");
    fleetTurnTimer = setTimeout(() => fleetCard.classList.add("is-player"), 900);
    fleetTurnTimer = setTimeout(() => {
      enemyAttack();
      setStatus("KOMPUTER ODDAŁ STRZAŁ — KARTA WRACA");
      fleetTurnTimer = setTimeout(() => fleetCard.classList.remove("is-player"), 850);
    }, 3200);
  };
  const fire = event => {
    const cell = event.currentTarget;
    if (!started || finished || !playerTurn || cell.classList.contains("fleet-hit") || cell.classList.contains("fleet-miss")) return;
    const target = Number(cell.dataset.fleetEnemy);
    playerTurn = false;
    if (enemyFleet.has(target)) {
      cell.classList.add("fleet-hit");
      hits += 1;
      score.textContent = `${hits} / 12`;
      const hitAudio = hits === 12 ? hitAudioFinal : hitAudios[hitCommentIndex++ % hitAudios.length];
      hitAudio.currentTime = 0;
      if (hits === 12) { hitAudio.play().catch(() => {}); return endGame(); }
      setStatus("TRAFIENIE. PRZECIWNIK ODPOWIADA...");
      let audioFinished = false;
      const continueAfterAudio = () => { if (audioFinished) return; audioFinished = true; beginComputerTurn(); };
      hitAudio.addEventListener("ended", continueAfterAudio, { once: true });
      hitAudio.play().catch(continueAfterAudio);
      fleetTurnTimer = setTimeout(continueAfterAudio, 8000);
      return;
    } else {
      cell.classList.add("fleet-miss");
      setStatus("PUDŁO. PRZECIWNIK ODPOWIADA...");
    }
    fleetTurnTimer = setTimeout(beginComputerTurn, 900);
  };
  enemyCells.forEach(cell => cell.addEventListener("click", fire));
  startButton.addEventListener("click", () => {
    started = true;
    startButton.hidden = true;
    enemyCells.forEach(cell => { cell.disabled = false; });
    playerTurn = true;
    setStatus("TWOJA TURA — NAMIERZ OKRĘT");
  });
}
function showContraGame() {
  state.screen = "stage"; saveState();
  render(`${header("PROTOKOL 03 / 03")}<div class="content contra-content"><div class="contra-panel"><div class="contra-viewport"><canvas id="contra-game" tabindex="0" aria-label="Gra zręcznościowa w stylu Contra"></canvas></div><div class="contra-status" id="contra-status">NACISNIJ START, ABY ROZPOCZAC</div><div class="contra-keyboard">← → RUCH · ↑ ↓ CELOWANIE · Z STRZAL · X / SPACJA SKOK · P PAUZA</div><button class="button contra-start" id="contra-start">START GRY</button><div class="contra-controls" aria-label="Sterowanie grą"><div class="contra-pad"><button class="button secondary" data-contra-control="up" aria-label="Celuj w górę">▲</button><button class="button secondary" data-contra-control="left" aria-label="Ruch w lewo">◀</button><button class="button secondary" data-contra-control="down" aria-label="Celuj w dół">▼</button><button class="button secondary" data-contra-control="right" aria-label="Ruch w prawo">▶</button></div><div class="contra-actions"><button class="button secondary" data-contra-control="jump">A<br><small>SKOK</small></button><button class="button secondary" data-contra-control="fire">B<br><small>STRZAL</small></button></div></div></div></div>${footer()}${debugPanel()}`, "contra-screen");
  startContraGame(); bindDebug();
}
function startContraGame() {
  if (typeof window.mountContraGame === "function") {
    activeScreenDisposer = window.mountContraGame({
      canvas: document.querySelector("#contra-game"),
      startButton: document.querySelector("#contra-start"),
      status: document.querySelector("#contra-status"),
      controlButtons: [...document.querySelectorAll("[data-contra-control]")],
      onClear: () => {
        const stage = config.stages[2];
        state.digits[2] = stage.digit;
        state.completedStages = [...new Set([...state.completedStages, stage.id])];
        state.currentStage = 3;
        saveState();
        showDigit();
      }
    });
    return;
  }
  const canvas = document.querySelector("#contra-game"); const ctx = canvas.getContext("2d");
  const start = document.querySelector("#contra-start"); const status = document.querySelector("#contra-status");
  const scoreText = document.querySelector("#contra-score"); const livesText = document.querySelector("#contra-lives");
  const keys = new Set(); const bullets = []; const enemies = []; let raf = 0; let running = false; let won = false; let score = 0; let lives = 3; let last = 0; let spawn = 0; let shot = 0; let scroll = 0;
  const player = { x: 118, y: 195, w: 42, h: 72, vy: 0, grounded: false, dir: 1 };
  const platforms = [{ x: 0, y: 267, w: 180, h: 14 }, { x: 260, y: 320, w: 176, h: 14 }, { x: 425, y: 373, w: 116, h: 14 }, { x: 608, y: 354, w: 140, h: 14 }, { x: 740, y: 383, w: 120, h: 14 }, { x: 812, y: 355, w: 148, h: 14 }];
  const backdrop = new Image();
  backdrop.src = "./assets/images/contra-jungle-stage.png";
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const drawRect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const draw = () => {
    if (backdrop.complete && backdrop.naturalWidth) ctx.drawImage(backdrop, 0, 0, canvas.width, canvas.height);
    else { ctx.fillStyle = "#071014"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.fillStyle = "#00000022"; ctx.fillRect(0, 0, canvas.width, 74);
    bullets.forEach(b => { drawRect(b.x, b.y, 15, 4, "#ffe267"); drawRect(b.x - b.v / 90, b.y + 1, 8, 2, "#ff704f"); });
    enemies.forEach(e => { drawRect(e.x + 10, e.y + 5, 17, 16, "#f3c88e"); drawRect(e.x + 8, e.y + 21, 23, 22, "#a93442"); drawRect(e.x + 3, e.y + 42, 11, 10, "#314d77"); drawRect(e.x + 24, e.y + 42, 11, 10, "#314d77"); drawRect(e.x - 11, e.y + 27, 23, 5, "#d6d4b6"); drawRect(e.x - 18, e.y + 28, 8, 3, "#ffdb5e"); });
    drawRect(player.x + 12, player.y, 18, 15, "#edc692"); drawRect(player.x + 8, player.y + 15, 26, 26, "#d7a86e"); drawRect(player.x + 6, player.y + 41, 12, 28, "#3f5db8"); drawRect(player.x + 24, player.y + 41, 12, 28, "#3f5db8"); drawRect(player.x + 3, player.y + 65, 17, 7, "#151c36"); drawRect(player.x + 23, player.y + 65, 17, 7, "#151c36"); drawRect(player.x + 29, player.y + 22, 31, 6, "#d8ded5"); drawRect(player.x + 59, player.y + 23, 11, 4, "#ffe36a"); drawRect(player.x + 8, player.y + 8, 26, 3, "#e34b52");
  };
  const jump = () => { if (running && player.grounded) { player.vy = -455; player.grounded = false; } };
  const fire = () => { if (running && shot <= 0) { bullets.push({ x: player.x + (player.dir > 0 ? 28 : -12), y: player.y + 21, v: player.dir * 650, w: 15, h: 4 }); shot = .18; } };
  const keyDown = e => { if (["ArrowUp", "Space"].includes(e.code)) e.preventDefault(); keys.add(e.code); if (e.code === "ArrowUp" || e.code === "Space") jump(); if (e.code === "KeyZ" || e.code === "KeyX") fire(); };
  const keyUp = e => keys.delete(e.code); window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);
  document.querySelectorAll("[data-contra]").forEach(button => { const action = button.dataset.contra; button.addEventListener("pointerdown", e => { e.preventDefault(); if (action === "jump") jump(); if (action === "fire") fire(); }); });
  const reset = () => { score = 0; lives = 3; scroll = 0; spawn = 0; shot = 0; bullets.length = 0; enemies.length = 0; player.x = 118; player.y = 195; player.vy = 0; scoreText.textContent = "000000"; livesText.textContent = "03"; };
  const finish = () => { if (won) return; won = true; running = false; cancelAnimationFrame(raf); window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); state.digits[2] = config.stages[2].digit; state.completedStages = [...new Set([...state.completedStages, config.stages[2].id])]; state.currentStage = 3; saveState(); status.textContent = "SEKTOR OCZYSZCZONY"; start.hidden = false; start.textContent = "DALEJ"; start.onclick = showDigit; };
  const loop = now => { if (!running) return; const dt = Math.min(.034, (now - last) / 1000 || .016); last = now; scroll += 120 * dt; spawn -= dt; shot -= dt; player.vy += 1050 * dt; player.y += player.vy * dt; player.grounded = false; platforms.forEach(p => { if (player.vy >= 0 && player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h >= p.y && player.y + player.h <= p.y + p.h + 18) { player.y = p.y - player.h; player.vy = 0; player.grounded = true; } }); if (spawn <= 0 && enemies.length < 5) { const p = platforms[1 + Math.floor(Math.random() * (platforms.length - 1))]; enemies.push({ x: 970, y: p.y - 52, w: 38, h: 52, speed: 105 + score * 12 }); spawn = Math.max(.65, 1.5 - score * .05); } bullets.forEach(b => b.x += b.v * dt); for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].x < -40 || bullets[i].x > 1000) bullets.splice(i, 1); enemies.forEach(e => e.x -= e.speed * dt); for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].x < -60) enemies.splice(i, 1); for (let i = enemies.length - 1; i >= 0; i--) { for (let j = bullets.length - 1; j >= 0; j--) if (hit(bullets[j], enemies[i])) { enemies.splice(i, 1); bullets.splice(j, 1); score++; scoreText.textContent = String(score * 1250).padStart(6, "0"); break; } } if (enemies.some(e => hit(player, e))) { lives--; livesText.textContent = String(Math.max(0, lives)).padStart(2, "0"); if (lives <= 0) { running = false; status.textContent = "KONIEC MISJI"; start.hidden = false; start.textContent = "SPROBUJ PONOWNIE"; start.onclick = () => { reset(); start.hidden = true; running = true; last = performance.now(); raf = requestAnimationFrame(loop); }; } } if (score >= 8) finish(); draw(); if (running) raf = requestAnimationFrame(loop); };
  backdrop.addEventListener("load", draw, { once: true });
  start.addEventListener("click", () => { reset(); running = true; start.hidden = true; status.textContent = "BIEGNIJ, STRZELAJ I PRZETRWAJ"; last = performance.now(); raf = requestAnimationFrame(loop); }, { once: true }); draw();
}
function showStage() {
  const index = state.currentStage; const stage = config.stages[index];
  if (!stage) return showFinalAudio();
  if (index === 0) return showJumpGame();
  if (index === 1) return showBattleshipGame();
  if (index === 2) return showContraGame();
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
  const audio = document.querySelector("#game-audio"); audio.preload = "auto"; let finished = false;
  const fallback = () => { if (finished) return; finished = true; console.warn(`Brak pliku audio lub nie można go odtworzyć: ${path}`); document.querySelector("#audio-feedback").innerHTML = "[ BRAK PLIKU AUDIO — TRYB TESTOWY ]"; setTimeout(finish, 1000); };
  audio.addEventListener("error", fallback, { once: true }); audio.addEventListener("ended", () => { if (!finished) { finished = true; finish(); } });
  audio.addEventListener("loadedmetadata", () => { document.querySelector("#audio-duration").textContent = formatTime(audio.duration); });
  audio.addEventListener("timeupdate", () => { document.querySelector("#audio-current").textContent = formatTime(audio.currentTime); document.querySelector("#audio-progress").style.width = `${audio.duration ? audio.currentTime / audio.duration * 100 : 0}%`; });
  let started = false;
  const startPlayback = () => { if (started) return; started = true; audio.play().catch(fallback); };
  audio.addEventListener("canplay", startPlayback, { once: true });
  audio.addEventListener("canplaythrough", startPlayback, { once: true });
  audio.src = `./${path}`; audio.load(); bindDebug();
}
function audioFinished(isFinal) { if (isFinal) { state.completed = true; state.screen = "complete"; saveState(); showComplete(); } else { state.currentStage += 1; saveState(); showDigit(); } }
function showDigit() { render(`${header()}<div class="content"><span class="eyebrow">WERYFIKACJA ZAKOŃCZONA</span><h2>CYFRA ODSZYFROWANA</h2><div class="pin-title" style="margin-top:32px">PIN</div><div class="pin-row">${pinPreview()}</div><div class="actions"><button class="button" data-action="next">DALEJ</button></div></div>${footer()}${debugPanel()}`); bindDebug(); }
function showFinalAudio() { state.screen = "final-audio"; saveState(); playAudio(config.finalAudio, true); }
function showComplete() { render(`${header("ACCESS GRANTED")}<div class="content"><div class="final-panel"><div class="eyebrow">PROCEDURA ZAKOŃCZONA</div><h1>ACCESS<br>GRANTED</h1><div class="pin-title" style="margin-top:34px">KOD DOSTĘPU</div><div class="final-pin">${escapeHtml(config.finalPin)}</div><p class="message">Procedura zakończona.<br>Możesz otworzyć kłódkę.</p></div></div>${footer()}${debugPanel()}`); bindDebug(); }
function bindDebug() { document.querySelectorAll("[data-action]").forEach(b => b.addEventListener("click", () => b.dataset.action === "start" ? showIntroAudio() : b.dataset.action === "briefing" ? showStage() : b.dataset.action === "home" ? (state = defaultState(), saveState(), showStart()) : b.dataset.action === "next" ? (state.currentStage >= config.stages.length ? showFinalAudio() : showStage()) : null)); document.querySelectorAll("[data-debug]").forEach(b => b.addEventListener("click", () => { const action = b.dataset.debug; if (action === "reset" || action === "clear") { localStorage.removeItem(storageKey); state = defaultState(); showStart(); } else if (action === "skip" && state.currentStage < config.stages.length) { state.digits[state.currentStage] = config.stages[state.currentStage].digit; state.completedStages = [...new Set([...state.completedStages, config.stages[state.currentStage].id])]; state.currentStage = Math.min(state.currentStage + 1, config.stages.length); saveState(); showStage(); } else if (action === "final") { state.currentStage = config.stages.length; saveState(); showFinalAudio(); } })); document.querySelectorAll("[data-stage]").forEach(b => b.addEventListener("click", () => { state.currentStage = Number(b.dataset.stage); state.screen = "stage"; saveState(); showStage(); })); }

if (!config) showInvalid();
else { state = loadState(); if (state.completed) showComplete(); else if (state.screen === "stage") showStage(); else if (state.screen === "briefing") showStage(); else if (state.screen === "intro-audio") showIntroAudio(); else if (state.screen === "fleet-transition") showFleetTransition(); else if (state.screen === "final-audio") showFinalAudio(); else if (state.currentStage > 0) showDigit(); else showStart(); }
