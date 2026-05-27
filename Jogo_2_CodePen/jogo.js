const { useState, useEffect, useRef, useCallback } = React;

const CANVAS_W = 800;
const CANVAS_H = 600;
const WORLD_W = 2400;
const WORLD_H = 2400;
const SEGMENT_RADIUS = 10;
const FOOD_COUNT = 250;
const BOT_COUNT = 8;
const SPEED = 2.8;
const BOOST_SPEED = 5.2;
const TURN_SPEED = 0.07;

function randomColor() {
  const palettes = [
    ['#ff6b6b','#ff8e8e'],['#4ecdc4','#6ee3da'],['#45b7d1','#68ccdf'],
    ['#96ceb4','#b3dfc8'],['#feca57','#fed676'],['#ff9ff3','#ffb3f7'],
    ['#54a0ff','#74b5ff'],['#5f27cd','#7c48e0'],['#01cbd4','#22dde5'],
    ['#ff3f34','#ff6962'],
  ];
  return palettes[Math.floor(Math.random() * palettes.length)];
}

function randomPos(margin = 100) {
  return {
    x: margin + Math.random() * (WORLD_W - margin * 2),
    y: margin + Math.random() * (WORLD_H - margin * 2),
  };
}

function createSnake(id, name, isPlayer = false) {
  const pos = randomPos();
  const angle = Math.random() * Math.PI * 2;
  const colors = randomColor();
  const segments = [];
  for (let i = 0; i < 20; i++) {
    segments.push({
      x: pos.x - Math.cos(angle) * i * (SEGMENT_RADIUS * 1.6),
      y: pos.y - Math.sin(angle) * i * (SEGMENT_RADIUS * 1.6),
    });
  }
  return { id, name, segments, angle, colors, isPlayer, boosting: false, score: segments.length, alive: true, botAngleTarget: angle };
}

function createFood(count = FOOD_COUNT) {
  const foods = [];
  for (let i = 0; i < count; i++) {
    const pos = randomPos(20);
    foods.push({
      id: Math.random(),
      x: pos.x,
      y: pos.y,
      r: 4 + Math.random() * 5,
      color: `hsl(${Math.floor(Math.random()*360)},85%,60%)`,
      value: 1,
    });
  }
  return foods;
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const BOT_NAMES = ['Víbora','Cobra','Naja','Mamba','Pitão','Bôa','Anaconda','Cascavel','Jararaca','Sucuri'];

function SlitherGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: CANVAS_W / 2, y: CANVAS_H / 2, boost: false });
  const [gamePhase, setGamePhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [killedBy, setKilledBy] = useState('');

  const initGame = useCallback(() => {
    const player = createSnake('player', 'Você', true);
    const bots = BOT_NAMES.slice(0, BOT_COUNT).map((name, i) => createSnake('bot_' + i, name));
    stateRef.current = {
      player,
      bots,
      foods: createFood(),
      camera: { x: player.segments[0].x - CANVAS_W / 2, y: player.segments[0].y - CANVAS_H / 2 },
    };
  }, []);

  const startGame = useCallback(() => {
    initGame();
    setGamePhase('playing');
    setScore(0);
    setKilledBy('');
  }, [initGame]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };
    const handleMouseDown = (e) => { if (e.button === 0) mouseRef.current.boost = true; };
    const handleMouseUp = () => { mouseRef.current.boost = false; };
    const handleTouch = (e) => {
      e.preventDefault();
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = t.clientX - rect.left;
      mouseRef.current.y = t.clientY - rect.top;
      mouseRef.current.boost = e.touches.length > 1;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchend', () => { mouseRef.current.boost = false; });

    function spawnFood(x, y, count) {
      count = count || 3;
      const st = stateRef.current;
      for (let i = 0; i < count; i++) {
        st.foods.push({
          id: Math.random(),
          x: x + (Math.random() - 0.5) * 60,
          y: y + (Math.random() - 0.5) * 60,
          r: 5 + Math.random() * 7,
          color: 'hsl(' + Math.floor(Math.random() * 360) + ',90%,55%)',
          value: 2,
        });
      }
    }

    function updateBot(bot) {
      if (!bot.alive) return;
      const head = bot.segments[0];
      const st = stateRef.current;

      let nearestFood = null, nearestFoodDist = 999999;
      for (let i = 0; i < st.foods.length; i++) {
        const f = st.foods[i];
        const d = dist(head, f);
        if (d < nearestFoodDist) { nearestFoodDist = d; nearestFood = f; }
      }

      const ph = st.player.segments[0];
      const dToPlayer = dist(head, ph);
      let avoidAngle = null;
      if (dToPlayer < 120 && st.player.alive) {
        avoidAngle = Math.atan2(head.y - ph.y, head.x - ph.x);
      }

      const margin = 150;
      let wallAvoid = null;
      if (head.x < margin) wallAvoid = 0;
      else if (head.x > WORLD_W - margin) wallAvoid = Math.PI;
      else if (head.y < margin) wallAvoid = Math.PI / 2;
      else if (head.y > WORLD_H - margin) wallAvoid = -Math.PI / 2;

      let targetAngle = bot.botAngleTarget;
      if (wallAvoid !== null) targetAngle = wallAvoid;
      else if (avoidAngle !== null) targetAngle = avoidAngle;
      else if (nearestFood) targetAngle = Math.atan2(nearestFood.y - head.y, nearestFood.x - head.x);

      let da = targetAngle - bot.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      bot.angle += Math.sign(da) * Math.min(Math.abs(da), TURN_SPEED);

      const speed = bot.boosting ? BOOST_SPEED : SPEED;
      const newHead = {
        x: Math.max(5, Math.min(WORLD_W - 5, head.x + Math.cos(bot.angle) * speed)),
        y: Math.max(5, Math.min(WORLD_H - 5, head.y + Math.sin(bot.angle) * speed)),
      };
      bot.segments.unshift(newHead);

      let ate = false;
      for (let i = st.foods.length - 1; i >= 0; i--) {
        const f = st.foods[i];
        if (dist(newHead, f) < SEGMENT_RADIUS + f.r) {
          st.foods.splice(i, 1);
          bot.score += f.value;
          ate = true;
          break;
        }
      }
      if (!ate) {
        if (bot.boosting && bot.segments.length > 10) {
          const tail = bot.segments.pop();
          spawnFood(tail.x, tail.y, 1);
          bot.segments.pop();
        } else {
          bot.segments.pop();
        }
      }
      bot.botAngleTarget = targetAngle;
    }

    function checkCollisions(snake, allSnakes) {
      if (!snake.alive) return;
      const head = snake.segments[0];

      if (head.x < 5 || head.x > WORLD_W - 5 || head.y < 5 || head.y > WORLD_H - 5) {
        snake.alive = false;
        spawnFood(head.x, head.y, Math.floor(snake.segments.length / 3));
        return;
      }

      for (let s = 0; s < allSnakes.length; s++) {
        const other = allSnakes[s];
        if (other.id === snake.id || !other.alive) continue;
        for (let i = 5; i < other.segments.length; i += 3) {
          const seg = other.segments[i];
          if (dist(head, seg) < SEGMENT_RADIUS * 1.7) {
            snake.alive = false;
            spawnFood(head.x, head.y, Math.floor(snake.segments.length / 3));
            if (snake.isPlayer) setKilledBy(other.name);
            return;
          }
        }
        if (dist(head, other.segments[0]) < SEGMENT_RADIUS * 2.5) {
          const loser = snake.segments.length <= other.segments.length ? snake : other;
          loser.alive = false;
          spawnFood(loser.segments[0].x, loser.segments[0].y, Math.floor(loser.segments.length / 3));
          if (loser.isPlayer) setKilledBy(other.name);
          return;
        }
      }
    }

    function drawGrid(ctx, cam) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      const startX = -((cam.x % gridSize) + gridSize) % gridSize;
      const startY = -((cam.y % gridSize) + gridSize) % gridSize;
      ctx.beginPath();
      for (let x = startX; x < CANVAS_W; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H);
      }
      for (let y = startY; y < CANVAS_H; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y);
      }
      ctx.stroke();
    }

    function drawSnake(ctx, snake, cam) {
      if (!snake.alive || snake.segments.length === 0) return;
      const segs = snake.segments;
      const bodyColor = snake.colors[0];
      const glowColor = snake.colors[1];

      for (let i = segs.length - 1; i >= 0; i--) {
        const seg = segs[i];
        const sx = seg.x - cam.x;
        const sy = seg.y - cam.y;
        if (sx < -40 || sx > CANVAS_W + 40 || sy < -40 || sy > CANVAS_H + 40) continue;
        const t = i / segs.length;
        const radius = SEGMENT_RADIUS * (1 - t * 0.35);
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? glowColor : bodyColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const head = segs[0];
      const hx = head.x - cam.x;
      const hy = head.y - cam.y;
      const angle = snake.angle;
      const eyeOffset = SEGMENT_RADIUS * 0.55;
      const eyeRadius = SEGMENT_RADIUS * 0.35;
      const perp = angle + Math.PI / 2;

      const sides = [-1, 1];
      for (let s = 0; s < sides.length; s++) {
        const side = sides[s];
        const ex = hx + Math.cos(angle) * eyeOffset * 0.6 + Math.cos(perp) * side * eyeOffset * 0.55;
        const ey = hy + Math.sin(angle) * eyeOffset * 0.6 + Math.sin(perp) * side * eyeOffset * 0.55;
        ctx.beginPath();
        ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + Math.cos(angle) * 1.5, ey + Math.sin(angle) * 1.5, eyeRadius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
      }

      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(snake.name, hx, hy - SEGMENT_RADIUS - 6);
    }

    function drawFood(ctx, food, cam) {
      const fx = food.x - cam.x;
      const fy = food.y - cam.y;
      if (fx < -20 || fx > CANVAS_W + 20 || fy < -20 || fy > CANVAS_H + 20) return;
      ctx.beginPath();
      ctx.arc(fx, fy, food.r, 0, Math.PI * 2);
      ctx.fillStyle = food.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fx - food.r * 0.3, fy - food.r * 0.3, food.r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }

    function drawMinimap(ctx, state) {
      const mw = 120, mh = 120, mx = CANVAS_W - mw - 10, my = CANVAS_H - mh - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(mx, my, mw, mh);
      ctx.fill();
      ctx.stroke();

      const scaleX = mw / WORLD_W, scaleY = mh / WORLD_H;

      for (let i = 0; i < state.foods.length; i++) {
        const f = state.foods[i];
        if (Math.random() > 0.15) continue;
        ctx.beginPath();
        ctx.arc(mx + f.x * scaleX, my + f.y * scaleY, 1, 0, Math.PI * 2);
        ctx.fillStyle = f.color;
        ctx.fill();
      }

      for (let i = 0; i < state.bots.length; i++) {
        const bot = state.bots[i];
        if (!bot.alive) continue;
        const h = bot.segments[0];
        ctx.beginPath();
        ctx.arc(mx + h.x * scaleX, my + h.y * scaleY, 3, 0, Math.PI * 2);
        ctx.fillStyle = bot.colors[0];
        ctx.fill();
      }

      if (state.player.alive) {
        const ph = state.player.segments[0];
        ctx.beginPath();
        ctx.arc(mx + ph.x * scaleX, my + ph.y * scaleY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#ff0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText('MAPA', mx + mw / 2, my + 10);
    }

    function drawHUD(ctx, player, allSnakes) {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.textAlign = 'left';
      ctx.fillText('⭐ ' + player.segments.length, 12, 28);

      const sorted = allSnakes.filter(function(s) { return s.alive; }).sort(function(a, b) { return b.segments.length - a.segments.length; });
      const playerRank = sorted.findIndex(function(s) { return s.isPlayer; }) + 1;
      ctx.font = '12px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('🏆 #' + playerRank + ' / ' + sorted.length, 12, 48);

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(CANVAS_W - 150, 8, 142, 110);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'right';
      ctx.fillText('RANKING', CANVAS_W - 10, 24);
      ctx.font = '10px monospace';
      for (let i = 0; i < Math.min(5, sorted.length); i++) {
        const s = sorted[i];
        ctx.fillStyle = s.isPlayer ? '#ffd700' : 'rgba(255,255,255,0.75)';
        ctx.fillText((i + 1) + '. ' + s.name.slice(0, 9) + ' ' + s.segments.length, CANVAS_W - 10, 40 + i * 16);
      }

      ctx.textAlign = 'center';
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText('Clique/toque para acelerar', CANVAS_W / 2, CANVAS_H - 10);
    }

    function loop() {
      const st = stateRef.current;
      if (!st) return;
      const player = st.player;
      const bots = st.bots;
      const foods = st.foods;

      if (player.alive) {
        player.boosting = mouseRef.current.boost && player.segments.length > 12;
        const targetAngle = Math.atan2(mouseRef.current.y - CANVAS_H / 2, mouseRef.current.x - CANVAS_W / 2);
        let da = targetAngle - player.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        player.angle += Math.sign(da) * Math.min(Math.abs(da), TURN_SPEED);

        const speed = player.boosting ? BOOST_SPEED : SPEED;
        const head = player.segments[0];
        const newHead = {
          x: Math.max(5, Math.min(WORLD_W - 5, head.x + Math.cos(player.angle) * speed)),
          y: Math.max(5, Math.min(WORLD_H - 5, head.y + Math.sin(player.angle) * speed)),
        };
        player.segments.unshift(newHead);

        let ate = false;
        for (let i = foods.length - 1; i >= 0; i--) {
          if (dist(newHead, foods[i]) < SEGMENT_RADIUS + foods[i].r) {
            player.score += foods[i].value;
            foods.splice(i, 1);
            ate = true;
            break;
          }
        }
        if (!ate) {
          if (player.boosting && player.segments.length > 10) {
            const tail = player.segments.pop();
            spawnFood(tail.x, tail.y, 1);
            player.segments.pop();
          } else {
            player.segments.pop();
          }
        }

        st.camera.x += (newHead.x - CANVAS_W / 2 - st.camera.x) * 0.12;
        st.camera.y += (newHead.y - CANVAS_H / 2 - st.camera.y) * 0.12;
        setScore(player.segments.length);
      }

      for (let i = 0; i < bots.length; i++) updateBot(bots[i]);

      for (let i = 0; i < bots.length; i++) {
        if (!bots[i].alive) {
          bots[i] = createSnake('bot_' + i, BOT_NAMES[i % BOT_NAMES.length]);
        }
      }

      if (foods.length < FOOD_COUNT * 0.6) {
        const newFoods = createFood(Math.floor(FOOD_COUNT * 0.4));
        for (let i = 0; i < newFoods.length; i++) st.foods.push(newFoods[i]);
      }

      const allSnakes = [player].concat(bots);
      for (let i = 0; i < allSnakes.length; i++) checkCollisions(allSnakes[i], allSnakes);

      if (!player.alive) {
        setGamePhase('dead');
        return;
      }

      ctx.fillStyle = '#0a0e1a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      drawGrid(ctx, st.camera);

      ctx.strokeStyle = 'rgba(255,100,100,0.3)';
      ctx.lineWidth = 8;
      ctx.strokeRect(-st.camera.x, -st.camera.y, WORLD_W, WORLD_H);

      for (let i = 0; i < st.foods.length; i++) drawFood(ctx, st.foods[i], st.camera);
      for (let i = 0; i < bots.length; i++) drawSnake(ctx, bots[i], st.camera);
      drawSnake(ctx, player, st.camera);
      drawMinimap(ctx, st);
      drawHUD(ctx, player, allSnakes);

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);

    return function() {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gamePhase]);

  const overlayStyle = {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'rgba(5,8,20,0.90)',
    gap: 16, zIndex: 10,
  };

  const btnStyle = {
    padding: '14px 48px', fontSize: 18, fontWeight: 'bold',
    background: 'linear-gradient(135deg,#00c9ff,#92fe9d)',
    border: 'none', borderRadius: 8, cursor: 'pointer',
    color: '#0a1a0a', letterSpacing: 2,
  };

  const textStyle = { fontFamily: "'Courier New', monospace", color: '#fff' };

  return (
    <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H, margin: '0 auto', background: '#0a0e1a', borderRadius: 12, overflow: 'hidden' }}>
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: 'block' }} />

      {gamePhase === 'menu' && (
        <div style={overlayStyle}>
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: 4, background: 'linear-gradient(135deg,#00c9ff,#92fe9d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SLITHER
          </div>
          <div style={{ ...textStyle, fontSize: 12, letterSpacing: 4, opacity: 0.5, marginTop: -12 }}>
            .IO CLONE
          </div>
          <div style={{ ...textStyle, fontSize: 13, opacity: 0.6, textAlign: 'center', lineHeight: 2, marginTop: 8 }}>
            🖱️ Mova o mouse para guiar sua cobra<br/>
            🖱️ Clique (segure) para dar boost<br/>
            💥 Faça inimigos baterem em você<br/>
            🍎 Coma comida para crescer
          </div>
          <button style={btnStyle} onClick={startGame}>▶ JOGAR</button>
        </div>
      )}

      {gamePhase === 'dead' && (
        <div style={overlayStyle}>
          <div style={{ ...textStyle, fontSize: 44, fontWeight: 900, color: '#ff4757' }}>💀 MORREU!</div>
          {killedBy && (
            <div style={{ ...textStyle, fontSize: 15, opacity: 0.7 }}>
              Eliminado por <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{killedBy}</span>
            </div>
          )}
          <div style={{ ...textStyle, fontSize: 24, color: '#92fe9d', fontWeight: 'bold' }}>
            ⭐ Pontuação final: {score}
          </div>
          <button style={btnStyle} onClick={startGame}>🔄 JOGAR NOVAMENTE</button>
        </div>
      )}
    </div>
  );
}

window.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(<SlitherGame />, document.getElementById('root'));
});