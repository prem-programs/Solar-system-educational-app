document.addEventListener('DOMContentLoaded', () => {
  // ─── Canvas Starfield ──────────────────────────────────────────────────────
  const canvas = document.getElementById('starfield');
  const ctx = canvas.getContext('2d');

  let W, H;
  const NUM_STARS = 800;
  let stars = [];

  function resizeCanvas() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < NUM_STARS; i++) {
      const baseAlpha = 0.25 + Math.random() * 0.55;
      stars.push({
        x:       Math.random() * W,
        y:       Math.random() * H,
        r:       Math.random() * 1.2 + 0.3,
        vx:      (Math.random() - 0.5) * 0.03,
        vy:      (Math.random() - 0.5) * 0.03,
        baseAlpha,
        alpha:   baseAlpha,
        phase:   Math.random() * Math.PI * 2,
        freq:    0.0003 + Math.random() * 0.0005
      });
    }
  }

  function drawStars(ts) {
    ctx.clearRect(0, 0, W, H);

    for (let s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0)  s.x = W;
      if (s.x > W)  s.x = 0;
      if (s.y < 0)  s.y = H;
      if (s.y > H)  s.y = 0;

      // Smooth sine-based twinkle
      s.alpha = s.baseAlpha + Math.sin(ts * s.freq + s.phase) * 0.18;
      s.alpha = Math.max(0.1, Math.min(0.9, s.alpha));
    }

    // Draw stars
    for (let s of stars) {
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ─── Main RAF loop ────────────────────────────────────────────────────────
  function mainLoop(ts) {
    drawStars(ts);
    render3D();
    requestAnimationFrame(mainLoop);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ─── 3-D interaction state ─────────────────────────────────────────────────
  let isDragging = false;
  let prevPos    = { x: 0, y: 0 };

  let targetRotX  = 60,  currentRotX  = 60;
  let targetRotZ  = -30, currentRotZ  = -30;

  const BASE_ZOOM = 0.65;
  let targetZoom  = BASE_ZOOM, currentZoom  = BASE_ZOOM;

  let targetPanX  = 0, currentPanX  = 0;
  let targetPanY  = 0, currentPanY  = 0;

  const LERP_ROT  = 0.06;
  const LERP_ZOOM = 0.05;
  const LERP_PAN  = 0.06;

  const solarSystem = document.getElementById('solar-system');
  solarSystem.style.willChange = 'transform';

  let isLocked          = false;
  let lockedPlanetOrbit = null;
  // The planet's position in the solar-system's LOCAL coordinate space (flat plane)
  // captured at the instant of click, relative to the solar-system centre
  let lockedWorldX = 0, lockedWorldY = 0;

  // ─── Input handlers ────────────────────────────────────────────────────────
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.glass-panel') && !e.target.classList.contains('planet')) {
      isDragging = true;
      document.body.style.cursor = 'grabbing';
      if (isLocked) resetView();
    }
    prevPos = { x: e.clientX, y: e.clientY };
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging && !isLocked) {
      const dx = e.clientX - prevPos.x;
      const dy = e.clientY - prevPos.y;
      targetRotZ += dx * 0.35;
      targetRotX -= dy * 0.35;
      targetRotX = Math.max(10, Math.min(targetRotX, 85));
    }
    prevPos = { x: e.clientX, y: e.clientY };
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.cursor = 'default';
  });

  // Touch support
  let lastTouch = null;
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (!e.target.classList.contains('planet') && !e.target.closest('.glass-panel')) {
        if (isLocked) resetView();
      }
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && lastTouch && !isLocked) {
      const dx = e.touches[0].clientX - lastTouch.x;
      const dy = e.touches[0].clientY - lastTouch.y;
      targetRotZ += dx * 0.35;
      targetRotX -= dy * 0.35;
      targetRotX = Math.max(10, Math.min(targetRotX, 85));
      lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  document.addEventListener('wheel', (e) => {
    if (e.target.closest('.glass-panel')) return;
    e.preventDefault();
    if (!isLocked) {
      const delta = e.deltaY < 0 ? 0.06 : -0.06;
      targetZoom = Math.max(0.3, Math.min(targetZoom + delta, 2.5));
    }
  }, { passive: false });

  // ─── Helper: extract the rotation angle from an orbit's computed transform ──
  // The orbit uses `animation: spin ...` which produces a matrix(cos, sin, -sin, cos, 0, 0)
  // We extract the current angle from this.
  function getOrbitAngle(orbitEl) {
    const style = window.getComputedStyle(orbitEl);
    const tr = style.transform || style.webkitTransform || 'none';
    if (tr === 'none') return 0;

    // matrix(a, b, c, d, tx, ty)
    const match = tr.match(/matrix\(([^)]+)\)/);
    if (!match) return 0;
    const vals = match[1].split(',').map(Number);
    const a = vals[0]; // cos(θ)
    const b = vals[1]; // sin(θ)
    return Math.atan2(b, a); // angle in radians
  }

  // ─── 3-D render tick ──────────────────────────────────────────────────────
  function render3D() {
    currentRotX += (targetRotX - currentRotX) * LERP_ROT;
    currentRotZ += (targetRotZ - currentRotZ) * LERP_ROT;
    currentZoom += (targetZoom - currentZoom) * LERP_ZOOM;

    if (isLocked) {
      // Rotate the world-space planet coords into screen space
      const zRad = currentRotZ * (Math.PI / 180);
      const xRad = currentRotX * (Math.PI / 180);

      const x1 =  lockedWorldX * Math.cos(zRad) - lockedWorldY * Math.sin(zRad);
      const y1 =  lockedWorldX * Math.sin(zRad) + lockedWorldY * Math.cos(zRad);
      const y2 = y1 * Math.cos(xRad);

      targetPanX = -x1 * currentZoom;
      targetPanY = -y2 * currentZoom;
    } else {
      targetPanX = 0;
      targetPanY = 0;
    }

    currentPanX += (targetPanX - currentPanX) * LERP_PAN;
    currentPanY += (targetPanY - currentPanY) * LERP_PAN;

    solarSystem.style.transform =
      `translate(${currentPanX}px, ${currentPanY}px) ` +
      `scale(${currentZoom}) ` +
      `rotateX(${currentRotX}deg) ` +
      `rotateZ(${currentRotZ}deg)`;
  }

  // ─── Educational UI ────────────────────────────────────────────────────────
  const planets         = document.querySelectorAll('.planet');
  const orbits          = document.querySelectorAll('.orbit');
  const eduPanel        = document.getElementById('edu-panel');
  const planetTarget    = document.getElementById('planet-target');
  const planetType      = document.getElementById('planet-type');
  const planetDesc      = document.getElementById('planet-desc');
  const planetFacts     = document.getElementById('planet-facts');
  const root            = document.documentElement;

  const nodes = {
    radius:  document.getElementById('planet-radius'),
    mass:    document.getElementById('planet-mass'),
    gravity: document.getElementById('planet-gravity'),
    temp:    document.getElementById('planet-temp'),
    day:     document.getElementById('planet-day'),
    year:    document.getElementById('planet-year')
  };

  const PLANET_COLORS = {
    Mercury: '#c4c4c4',
    Venus:   '#e8c690',
    Earth:   '#4b9fe3',
    Mars:    '#ff6b4a',
    Jupiter: '#d9a46c',
    Saturn:  '#e3cd8f',
    Uranus:  '#8acbe8',
    Neptune: '#4371e8'
  };

  // Pre-built map of orbit radii (half the orbit width = distance from centre to planet)
  const orbitRadii = {};
  orbits.forEach(o => {
    orbitRadii[o.className] = o.offsetWidth / 2;
  });

  function focusPlanet(planet) {
    // Toggle off if already locked
    if (isLocked && planet.classList.contains('locked')) {
      resetView();
      return;
    }

    const orbit = planet.parentElement;

    // ── Step 1: Read orbit's CURRENT rotation angle BEFORE pausing ──────────
    // This tells us exactly where the planet is on its circular path right now.
    const orbitAngle = getOrbitAngle(orbit);
    const orbitRadius = orbit.offsetWidth / 2;

    // The planet sits at the LEFT edge of the orbit (CSS left: -Npx, top: 50%).
    // In the orbit's un-rotated local frame, that's at (-orbitRadius, 0).
    // After the orbit has rotated by `orbitAngle`, the position becomes:
    const localX = -orbitRadius;
    const localY = 0;
    lockedWorldX = localX * Math.cos(orbitAngle) - localY * Math.sin(orbitAngle);
    lockedWorldY = localX * Math.sin(orbitAngle) + localY * Math.cos(orbitAngle);

    // ── Step 2: Pause all animations ────────────────────────────────────────
    isLocked = true;
    lockedPlanetOrbit = orbit;

    planets.forEach(p => p.classList.remove('locked'));
    planet.classList.add('locked');

    // Pause and dim everything
    document.querySelectorAll('.orbit').forEach(o => {
      o.style.animationPlayState = 'paused';
      if (o !== orbit) {
        o.classList.add('dimmed');
      }
    });
    document.querySelectorAll('.planet').forEach(p => {
      p.style.animationPlayState = 'paused';
      if (p !== planet) {
        p.classList.add('dimmed');
      }
    });

    // ── Step 3: Camera ──────────────────────────────────────────────────────
    targetRotX = 55;

    // Compute zoom: we want the planet to appear ~100-130px on screen
    const planetSize = planet.offsetWidth;
    const desiredScreenSize = 110;
    const rawZoom = desiredScreenSize / Math.max(planetSize, 1);
    targetZoom = Math.max(1.4, Math.min(3.8, rawZoom));

    // ── Step 4: Populate panel ──────────────────────────────────────────────
    const name = planet.dataset.name;
    const color = PLANET_COLORS[name] || '#00f2fe';

    planetTarget.textContent = name;
    planetType.textContent   = planet.dataset.type;
    planetDesc.textContent   = planet.dataset.info;

    nodes.radius.textContent  = planet.dataset.radius;
    nodes.mass.textContent    = planet.dataset.mass;
    nodes.gravity.textContent = planet.dataset.gravity;
    nodes.temp.textContent    = planet.dataset.temp;
    nodes.day.textContent     = planet.dataset.day;
    nodes.year.textContent    = planet.dataset.year;

    const rawFacts = planet.dataset.facts || '';
    planetFacts.innerHTML = '';
    rawFacts.split('\\n').forEach(fact => {
      if (!fact.trim()) return;
      const li = document.createElement('li');
      li.textContent = fact.trim();
      planetFacts.appendChild(li);
    });

    // ── Step 5: Theme colour ────────────────────────────────────────────────
    planetType.style.color       = color;
    planetType.style.borderColor = color;
    root.style.setProperty('--neon-cyan', color);
    // Set highlight glow colour for the locked planet
    root.style.setProperty('--planet-glow', color);

    // Active button state
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === name);
    });

    eduPanel.classList.add('active');
  }

  // ── Bind clicks ───────────────────────────────────────────────────────────
  planets.forEach(p => {
    p.addEventListener('click', (e) => {
      e.stopPropagation();
      focusPlanet(p);
    });
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = document.querySelector(`.planet[data-name="${btn.dataset.target}"]`);
      if (target) focusPlanet(target);
    });
  });

  // ── Reset ─────────────────────────────────────────────────────────────────
  function resetView() {
    isLocked          = false;
    lockedPlanetOrbit = null;
    targetZoom  = BASE_ZOOM;
    targetRotX  = 60;
    targetRotZ  = -30;

    planets.forEach(p => {
      p.classList.remove('locked', 'dimmed');
      p.style.animationPlayState = '';
    });
    document.querySelectorAll('.orbit').forEach(o => {
      o.classList.remove('dimmed');
      o.style.animationPlayState = '';
    });

    // Reset nav button active state
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    planetTarget.textContent = 'Solar System';
    planetType.textContent   = 'View Mode';
    planetType.style.color       = '#00f2fe';
    planetType.style.borderColor = '#00f2fe';
    root.style.setProperty('--neon-cyan', '#00f2fe');
    root.style.removeProperty('--planet-glow');

    planetDesc.textContent = 'Click and drag in empty space to rotate the 3D galaxy. Select any celestial body to lock onto its orbit and view telemetry data.';
    Object.values(nodes).forEach(n => (n.textContent = 'N/A'));
    planetFacts.innerHTML = '<li>The solar system formed 4.6 billion years ago.</li><li>Select a planet to explore educational facts.</li>';
    eduPanel.classList.remove('active');
  }

  document.getElementById('reset-view').addEventListener('click', resetView);

  // ─── Kick off ──────────────────────────────────────────────────────────────
  requestAnimationFrame(mainLoop);
});
