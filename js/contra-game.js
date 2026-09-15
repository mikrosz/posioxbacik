/* Clean-room, browser-native Contra-style stage.
 * The reference project is a 6502 disassembly, not a web build. This module
 * keeps its useful behavioural constraints (256x240, 60 Hz, one-pixel input,
 * edge-triggered jump, fixed-point-like gravity) without bundling the ROM.
 */
(function () {
  "use strict";

  const W = 256;
  const H = 240;
  const FRAME = 1000 / 60;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  window.mountContraGame = function mountContraGame(options) {
    const canvas = options.canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    const startButton = options.startButton;
    const status = options.status;
    const controlButtons = options.controlButtons || [];
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;

    const held = new Set();
    const pressed = new Set();
    const listeners = [];
    const actionByCode = {
      ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
      KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down",
      KeyZ: "fire", KeyJ: "fire", KeyX: "jump", KeyK: "jump", Space: "jump"
    };
    const on = (target, type, handler, opts) => { target.addEventListener(type, handler, opts); listeners.push(() => target.removeEventListener(type, handler, opts)); };
    const isHeld = action => held.has(action);
    const consume = action => { const result = pressed.has(action); pressed.delete(action); return result; };

    const backdrop = new Image();
    backdrop.decoding = "async";
    backdrop.src = "./assets/images/contra-jungle-stage.png";

    // The image is a 16:9 still; the game viewport deliberately uses the
    // original NES 4:3 logical frame and pans across the still like a level.
    const platforms = [
      { x: 0, y: 118, w: 82 }, { x: 67, y: 140, w: 124 },
      { x: 0, y: 176, w: 58 }, { x: 113, y: 186, w: 73 },
      { x: 176, y: 161, w: 64 }, { x: 241, y: 186, w: 52 },
      { x: 274, y: 147, w: 56 }, { x: 327, y: 173, w: 34 },
      { x: 364, y: 161, w: 46 }
    ];
    const worldWidth = 426;
    const staticSpawns = [
      { kind: "soldier", x: 91, platform: 1 }, { kind: "soldier", x: 124, platform: 1 },
      { kind: "sniper", x: 154, platform: 1 }, { kind: "soldier", x: 207, platform: 4 },
      { kind: "turret", x: 238, platform: 4 }, { kind: "soldier", x: 280, platform: 5 },
      { kind: "sniper", x: 303, platform: 6 }, { kind: "soldier", x: 337, platform: 7 },
      { kind: "turret", x: 370, platform: 8 }
    ];
    const door = { x: 392, y: 125, w: 14, h: 30, hp: 32, maxHp: 32 };
    const player = { x: 25, y: 96, w: 11, h: 22, vy: 0, onGround: true, face: 1, pose: "stand", inv: 90, fireCooldown: 0 };
    const bullets = [];
    const enemyBullets = [];
    const enemies = [];
    const sparks = [];
    let mode = "ready";
    let frame = 0;
    let score = 0;
    let lives = 3;
    let camera = 0;
    let checkpoint = 25;
    let checkpointPlatform = 0;
    let respawnTimer = 0;
    let clearTimer = 0;
    let raf = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let destroyed = false;

    const setStatus = message => { if (status) status.textContent = message; };
    const setStart = (label, visible) => { startButton.textContent = label; startButton.hidden = !visible; };
    const platformAt = x => platforms.find(platform => x + 5 > platform.x && x + 5 < platform.x + platform.w);
    const spawnEnemy = spec => {
      const platform = platforms[spec.platform] || platforms[1];
      const height = spec.kind === "turret" ? 15 : 20;
      enemies.push({ ...spec, y: platform.y - height, w: spec.kind === "turret" ? 13 : 11, h: height, hp: spec.kind === "turret" ? 3 : 1, vy: 0, grounded: true, cooldown: 35 + (spec.x * 3 | 0) % 70, hitFlash: 0, alive: true });
    };
    const reset = () => {
      score = 0; lives = 3; camera = 0; checkpoint = 25; checkpointPlatform = 0; respawnTimer = 0; clearTimer = 0; frame = 0;
      pressed.clear();
      bullets.length = 0; enemyBullets.length = 0; enemies.length = 0; sparks.length = 0;
      staticSpawns.forEach(spawn => spawnEnemy(spawn));
      Object.assign(player, { x: 25, y: platforms[0].y - player.h, vy: 0, onGround: true, face: 1, pose: "stand", inv: 120, fireCooldown: 0 });
      Object.assign(door, { hp: door.maxHp });
    };

    const addSpark = (x, y, color) => { for (let i = 0; i < 5; i += 1) sparks.push({ x, y, vx: (i - 2) * .35, vy: -.6 - i * .08, life: 18, color }); };
    const harmPlayer = () => {
      if (player.inv > 0 || mode !== "playing") return;
      lives -= 1;
      if (lives <= 0) { mode = "gameover"; setStatus("KONIEC MISJI — NACISNIJ START, ABY PONOWIC"); setStart("SPROBUJ PONOWNIE", true); return; }
      mode = "respawn"; respawnTimer = 75; bullets.length = 0; enemyBullets.length = 0;
      Object.assign(player, { x: checkpoint, y: platforms[checkpointPlatform].y - player.h, vy: 0, onGround: true, inv: 150, pose: "stand" });
      setStatus(`UTRACONO ZYCIE — POZOSTALE: ${String(lives).padStart(2, "0")}`);
    };
    const fire = () => {
      // Regular weapon: one active projectile. The original M/F/S pickups
      // increase capacity/rate; this stage keeps the baseline weapon fair.
      if (mode !== "playing" || player.fireCooldown > 0 || bullets.length >= 1) return;
      let dx = player.face;
      let dy = 0;
      if (isHeld("up") && !isHeld("down")) dy = -1;
      if (isHeld("down") && !isHeld("up")) dy = 1;
      const length = Math.hypot(dx, dy) || 1;
      bullets.push({ x: player.x + (player.face > 0 ? 10 : -4), y: player.y + (dy > 0 ? 14 : 7), vx: dx / length * 4.4, vy: dy / length * 4.4, w: 5, h: 2, life: 90 });
      player.fireCooldown = 10;
      addSpark(player.x + (player.face > 0 ? 12 : -2), player.y + 8, "#ffe87c");
    };
    const jump = () => { if (mode === "playing" && player.onGround && !isHeld("down")) { player.vy = -5.94; player.onGround = false; player.pose = "jump"; } };
    const togglePause = () => { if (mode === "playing") { mode = "paused"; setStatus("PAUZA — P, ESC LUB PRZYCISK, ABY WZNOWIC"); } else if (mode === "paused") { mode = "playing"; setStatus("BIEGNIJ, STRZELAJ I PRZETRWAJ"); } };

    const keyDown = event => {
      const action = actionByCode[event.code];
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(event.code)) event.preventDefault();
      if (event.code === "KeyP" || event.code === "Escape") { event.preventDefault(); if (!event.repeat) togglePause(); return; }
      if (event.code === "Enter" && (mode === "ready" || mode === "gameover")) { event.preventDefault(); startGame(); return; }
      if (!action) return;
      if (!held.has(action)) pressed.add(action);
      held.add(action);
    };
    const keyUp = event => { const action = actionByCode[event.code]; if (action) held.delete(action); };
    on(window, "keydown", keyDown, { passive: false });
    on(window, "keyup", keyUp);

    const buttonDown = event => {
      event.preventDefault();
      const action = event.currentTarget.dataset.contraControl;
      if (!action) return;
      if (!held.has(action)) pressed.add(action);
      held.add(action);
      event.currentTarget.classList.add("is-held");
      if (event.currentTarget.setPointerCapture) event.currentTarget.setPointerCapture(event.pointerId);
    };
    const buttonUp = event => { const action = event.currentTarget.dataset.contraControl; if (action) held.delete(action); event.currentTarget.classList.remove("is-held"); };
    controlButtons.forEach(button => { on(button, "pointerdown", buttonDown, { passive: false }); on(button, "pointerup", buttonUp); on(button, "pointercancel", buttonUp); on(button, "lostpointercapture", buttonUp); });
    on(startButton, "click", () => { if (mode === "clear") return; startGame(); });

    function startGame() {
      if (mode === "ready" || mode === "gameover") reset();
      if (mode !== "playing" && mode !== "respawn") { mode = "playing"; setStatus("BIEGNIJ, STRZELAJ I PRZETRWAJ"); setStart("START GRY", false); }
      canvas.focus({ preventScroll: true });
    }
    const enemyAim = enemy => {
      const sx = enemy.x + enemy.w / 2;
      const sy = enemy.y + enemy.h / 2;
      const dx = player.x + player.w / 2 - sx;
      const dy = player.y + player.h / 2 - sy;
      const angle = Math.round(Math.atan2(dy, dx) / (Math.PI * 2) * 24) * Math.PI * 2 / 24;
      return { vx: Math.cos(angle) * 1.7, vy: Math.sin(angle) * 1.7 };
    };
    const update = () => {
      frame += 1;
      if (mode === "paused" || mode === "ready" || mode === "gameover") return;
      if (mode === "clear") { clearTimer -= 1; if (clearTimer <= 0 && !destroyed) { destroyed = true; options.onClear(); } return; }
      if (mode === "respawn") { respawnTimer -= 1; if (respawnTimer <= 0) { mode = "playing"; setStatus("BIEGNIJ, STRZELAJ I PRZETRWAJ"); } return; }
      if (player.inv > 0) player.inv -= 1;
      if (player.fireCooldown > 0) player.fireCooldown -= 1;
      if (consume("jump")) jump();
      if (isHeld("fire")) fire();

      const left = isHeld("left");
      const right = isHeld("right");
      // Contra's input routine gives left priority when both bits are held.
      const direction = left ? -1 : right ? 1 : 0;
      player.face = direction || player.face;
      player.pose = isHeld("down") && player.onGround ? "crouch" : direction ? "run" : "stand";
      const oldX = player.x;
      player.x = clamp(player.x + direction, 12, worldWidth - player.w - 10);
      const currentPlatform = platformAt(player.x);
      if (!currentPlatform || (player.onGround && player.y + player.h < currentPlatform.y - 1)) player.onGround = false;
      const previousBottom = player.y + player.h;
      if (!player.onGround) { player.vy += .1367; player.y += player.vy; }
      const nextBottom = player.y + player.h;
      if (!player.onGround && player.vy >= 0) {
        const landing = platforms.find(platform => player.x + player.w - 2 > platform.x && player.x + 2 < platform.x + platform.w && previousBottom <= platform.y + 1 && nextBottom >= platform.y);
        if (landing) { player.y = landing.y - player.h; player.vy = 0; player.onGround = true; player.pose = direction ? "run" : "stand"; }
      }
      if (player.y + player.h > 218) { harmPlayer(); return; }
      if (player.x > checkpoint + 38) { checkpoint = player.x; checkpointPlatform = Math.max(0, platforms.findIndex(platform => Math.abs(platform.y - (player.y + player.h)) < 2)); }
      camera = clamp(player.x - 88, 0, worldWidth - W);

      enemies.forEach(enemy => {
        if (!enemy.alive) return;
        if (enemy.hitFlash > 0) enemy.hitFlash -= 1;
        if (enemy.kind === "soldier") {
          const chase = player.x < enemy.x ? -.38 : .38;
          if (Math.abs(player.x - enemy.x) < 150) enemy.x += chase;
          enemy.cooldown -= 1;
        } else if (enemy.kind === "sniper" || enemy.kind === "turret") {
          enemy.cooldown -= 1;
        }
        if (enemy.cooldown <= 0 && Math.abs(player.x - enemy.x) < 190) {
          const velocity = enemyAim(enemy);
          enemyBullets.push({ x: enemy.x + enemy.w / 2, y: enemy.y + 8, vx: velocity.vx, vy: velocity.vy, w: 3, h: 3, life: 160 });
          enemy.cooldown = enemy.kind === "turret" ? 92 : 128;
        }
        if (overlap(player, enemy)) harmPlayer();
      });
      bullets.forEach(bullet => { bullet.x += bullet.vx; bullet.y += bullet.vy; bullet.life -= 1; });
      enemyBullets.forEach(bullet => { bullet.x += bullet.vx; bullet.y += bullet.vy; bullet.life -= 1; if (overlap(player, bullet)) { bullet.life = 0; harmPlayer(); } });
      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const bullet = bullets[i];
        let consumed = false;
        for (let j = enemies.length - 1; j >= 0; j -= 1) {
          const enemy = enemies[j];
          if (enemy.alive && overlap(bullet, enemy)) { enemy.hp -= 1; enemy.hitFlash = 5; bullet.life = 0; consumed = true; addSpark(enemy.x + 5, enemy.y + 8, "#ffda61"); if (enemy.hp <= 0) { enemy.alive = false; score += enemy.kind === "turret" ? 500 : 100; } break; }
        }
        if (!consumed && overlap(bullet, door)) { door.hp -= 1; bullet.life = 0; addSpark(door.x + 7, door.y + 10, "#ff704c"); if (door.hp <= 0) setStatus("BRAMA ZNISZCZONA — DOTRZYJ DO BAZY"); }
      }
      for (let i = bullets.length - 1; i >= 0; i -= 1) if (bullets[i].life <= 0 || bullets[i].x < camera - 20 || bullets[i].x > camera + W + 20) bullets.splice(i, 1);
      for (let i = enemyBullets.length - 1; i >= 0; i -= 1) if (enemyBullets[i].life <= 0 || enemyBullets[i].x < camera - 20 || enemyBullets[i].x > camera + W + 20) enemyBullets.splice(i, 1);
      for (let i = sparks.length - 1; i >= 0; i -= 1) { const spark = sparks[i]; spark.x += spark.vx; spark.y += spark.vy; spark.vy += .04; spark.life -= 1; if (spark.life <= 0) sparks.splice(i, 1); }
      if (door.hp <= 0 && player.x > 378) { mode = "clear"; clearTimer = 80; setStatus("SEKTOR OCZYSZCZONY — ETAP ZALICZONY"); setStart("DALEJ", false); }
      if (player.x < oldX - 2) player.x = oldX;
    };

    const text = (value, x, y, color = "#fff", align = "left") => { ctx.font = "7px monospace"; ctx.textAlign = align; ctx.textBaseline = "top"; ctx.fillStyle = "#000"; ctx.fillText(value, x + 1, y + 1); ctx.fillStyle = color; ctx.fillText(value, x, y); };
    const screenX = worldX => Math.round(worldX - camera);
    const drawBackground = () => {
      if (backdrop.complete && backdrop.naturalWidth) {
        const sourceH = backdrop.naturalHeight;
        const sourceW = Math.min(backdrop.naturalWidth, sourceH * W / H);
        const maxX = backdrop.naturalWidth - sourceW;
        const sourceX = maxX * (camera / (worldWidth - W));
        ctx.drawImage(backdrop, sourceX, 0, sourceW, sourceH, 0, 0, W, H);
      } else {
        const gradient = ctx.createLinearGradient(0, 0, 0, H); gradient.addColorStop(0, "#02050c"); gradient.addColorStop(.64, "#0b3427"); gradient.addColorStop(1, "#0647a9"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);
        platforms.forEach(platform => { ctx.fillStyle = "#55b936"; ctx.fillRect(screenX(platform.x), platform.y, platform.w, 3); ctx.fillStyle = "#4d3b1c"; ctx.fillRect(screenX(platform.x), platform.y + 3, platform.w, 10); });
      }
      ctx.fillStyle = "#0008"; ctx.fillRect(0, 0, W, 16);
    };
    const drawPlayer = () => {
      if (player.inv > 0 && (player.inv >> 2) % 2 === 0) return;
      const x = screenX(player.x); const y = Math.round(player.y); const flip = player.face < 0;
      ctx.save(); if (flip) { ctx.translate(x + player.w, 0); ctx.scale(-1, 1); }
      if (player.pose === "crouch") { ctx.fillStyle = "#d69b61"; ctx.fillRect(2, y + 6, 8, 5); ctx.fillStyle = "#2d52a5"; ctx.fillRect(1, y + 11, 10, 6); ctx.fillStyle = "#111a31"; ctx.fillRect(0, y + 16, 5, 3); ctx.fillRect(7, y + 16, 5, 3); ctx.fillStyle = "#d8dfd8"; ctx.fillRect(9, y + 8, 10, 2); }
      else { ctx.fillStyle = "#e8bf87"; ctx.fillRect(4, y, 6, 6); ctx.fillStyle = "#d83f52"; ctx.fillRect(3, y - 1, 8, 2); ctx.fillStyle = "#c78c59"; ctx.fillRect(2, y + 6, 9, 8); ctx.fillStyle = "#3155ac"; ctx.fillRect(2, y + 14, 4, 8); ctx.fillRect(8, y + 14, 4, 8); ctx.fillStyle = "#11182e"; ctx.fillRect(1, y + 21, 5, 2); ctx.fillRect(8, y + 21, 5, 2); ctx.fillStyle = "#dce4dc"; ctx.fillRect(9, y + 8, 11, 2); }
      ctx.restore();
    };
    const drawEnemy = enemy => {
      if (!enemy.alive || screenX(enemy.x) < -20 || screenX(enemy.x) > W + 20) return;
      const x = screenX(enemy.x); const y = Math.round(enemy.y); ctx.save(); if (enemy.x > player.x) { ctx.translate(x + enemy.w, 0); ctx.scale(-1, 1); }
      if (enemy.hitFlash % 2) ctx.globalAlpha = .4;
      if (enemy.kind === "turret") { ctx.fillStyle = "#324b6e"; ctx.fillRect(1, y + 3, 11, 12); ctx.fillStyle = "#a93640"; ctx.fillRect(3, y + 1, 7, 5); ctx.fillStyle = "#e5dfc0"; ctx.fillRect(9, y + 6, 9, 3); }
      else { ctx.fillStyle = "#f1c38e"; ctx.fillRect(3, y, 6, 6); ctx.fillStyle = enemy.kind === "sniper" ? "#d4d5c7" : "#a83b48"; ctx.fillRect(2, y + 6, 9, 8); ctx.fillStyle = "#334c78"; ctx.fillRect(2, y + 14, 4, 6); ctx.fillRect(8, y + 14, 4, 6); ctx.fillStyle = "#d7d9bd"; ctx.fillRect(9, y + 8, 9, 2); }
      ctx.restore();
    };
    const draw = () => {
      drawBackground();
      if (door.hp > 0 && screenX(door.x) > -18 && screenX(door.x) < W + 18) { ctx.fillStyle = "#ff8746"; ctx.fillRect(screenX(door.x) + 4, door.y + 6, 6, 11); ctx.fillStyle = "#fff0a5"; ctx.fillRect(screenX(door.x) + 5, door.y + 8, 4, 2); }
      enemies.forEach(drawEnemy);
      bullets.forEach(bullet => { ctx.fillStyle = "#fff09a"; ctx.fillRect(screenX(bullet.x), Math.round(bullet.y), bullet.w, bullet.h); });
      enemyBullets.forEach(bullet => { ctx.fillStyle = "#ff806c"; ctx.fillRect(screenX(bullet.x), Math.round(bullet.y), bullet.w, bullet.h); });
      sparks.forEach(spark => { ctx.fillStyle = spark.color; ctx.fillRect(screenX(spark.x), Math.round(spark.y), 2, 2); });
      if (mode !== "respawn" || (respawnTimer >> 2) % 2) drawPlayer();
      text(`SCORE-${String(score).padStart(6, "0")}`, 5, 4, "#ffdc68"); text("STAGE 1", 128, 4, "#f4f0d4", "center"); text(`PLAYER-${String(Math.max(0, lives)).padStart(2, "0")}`, 251, 4, "#ffdc68", "right");
      if (mode === "ready") { ctx.fillStyle = "#000a"; ctx.fillRect(0, 70, W, 95); text("CONTRA // STAGE 1", 128, 88, "#ffdc68", "center"); text("BIEGNIJ, STRZELAJ I PRZETRWAJ", 128, 103, "#fff", "center"); text("START GRY PONIZEJ", 128, 121, "#9fe4ff", "center"); }
      if (mode === "paused") { ctx.fillStyle = "#000b"; ctx.fillRect(0, 78, W, 70); text("PAUZA", 128, 94, "#ffdc68", "center"); text("P / ESC — WZNOW", 128, 110, "#fff", "center"); }
      if (mode === "gameover") { ctx.fillStyle = "#000b"; ctx.fillRect(0, 78, W, 70); text("GAME OVER", 128, 94, "#ff5364", "center"); text("START — JESZCZE RAZ", 128, 110, "#fff", "center"); }
      if (mode === "clear") { ctx.fillStyle = "#0009"; ctx.fillRect(0, 78, W, 70); text("MISSION COMPLETE", 128, 94, "#ffdc68", "center"); text("SEKTOR OCZYSZCZONY", 128, 110, "#fff", "center"); }
    };
    const loop = time => {
      if (destroyed) return;
      accumulator += Math.min(100, time - lastTime); lastTime = time;
      while (accumulator >= FRAME) { update(); accumulator -= FRAME; }
      draw(); raf = requestAnimationFrame(loop);
    };
    reset();
    draw();
    raf = requestAnimationFrame(loop);

    return function destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      listeners.splice(0).forEach(remove => remove());
      held.clear(); pressed.clear();
      controlButtons.forEach(button => button.classList.remove("is-held"));
    };
  };
}());
