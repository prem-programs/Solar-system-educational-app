document.addEventListener('DOMContentLoaded', () => {
  // ─── 1. Starfield (2D Canvas) ──────────────────────────────────────────────
  const sfCanvas = document.getElementById('starfield');
  const ctx = sfCanvas.getContext('2d');
  let W, H;
  const NUM_STARS = 800;
  let stars = [];

  function resizeCanvas() {
    W = sfCanvas.width = window.innerWidth;
    H = sfCanvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < NUM_STARS; i++) {
      const baseAlpha = 0.25 + Math.random() * 0.55;
      stars.push({
        x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.03, vy: (Math.random() - 0.5) * 0.03,
        baseAlpha, alpha: baseAlpha, phase: Math.random() * Math.PI * 2,
        freq: 0.0003 + Math.random() * 0.0005
      });
    }
  }

  function drawStars(ts) {
    ctx.clearRect(0, 0, W, H);
    for (let s of stars) {
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      s.alpha = s.baseAlpha + Math.sin(ts * s.freq + s.phase) * 0.18;
      s.alpha = Math.max(0.1, Math.min(0.9, s.alpha));
      ctx.globalAlpha = s.alpha;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ─── 2. WebGL Setup (Three.js) ─────────────────────────────────────────────
  const canvas = document.getElementById('webgl-canvas');
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(0, 0, 110);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Lights
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  const pointLight = new THREE.PointLight(0xffffff, 2.5, 300);
  scene.add(pointLight);

  // ─── 3. Solar System Bodies ────────────────────────────────────────────────
  const planetMeshes = [];

  // Sun (Simple Sphere)
  const sunGeo = new THREE.SphereGeometry(6, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdf80 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  scene.add(sun);

  // Data mapping from old DOM elements
  const planetaryData = [
    { name: 'Mercury', moons: '0', sunDistance: '58 Million km', distance: 11, size: 0.8, speed: 2 * Math.PI / 8, color: 0xc4c4c4, type: 'Terrestrial', radius: '2,439.7 km', mass: '3.30 × 10²³ kg', gravity: '3.7 m/s²', temp: '167°C', day: '59 Earth Days', year: '88 Earth Days', facts: "Temperatures swing wildly from 430°C in the day to -180°C at night.\nIt is the fastest planet, zipping around the Sun at 47 km per second.\nMercury has no atmosphere to trap heat or protect from meteorites.", info: "The smallest planet in our solar system and closest to the Sun." },
    { name: 'Venus', moons: '0', sunDistance: '108 Million km', distance: 16, size: 1.2, speed: 2 * Math.PI / 14, color: 0xe8c690, type: 'Terrestrial', radius: '6,051.8 km', mass: '4.86 × 10²⁴ kg', gravity: '8.87 m/s²', temp: '464°C', day: '243 Earth Days', year: '225 Earth Days', facts: "It is the hottest planet in our solar system due to a runaway greenhouse effect.\nVenus rotates backwards, meaning the Sun rises in the west and sets in the east.\nA day on Venus is longer than its entire year!", info: "Spins slowly in the opposite direction from most planets." },
    { name: 'Earth', moons: '1', sunDistance: '149.6 Million km', distance: 22, size: 1.5, speed: 2 * Math.PI / 22, color: 0x4b9fe3, type: 'Terrestrial', radius: '6,371 km', mass: '5.97 × 10²⁴ kg', gravity: '9.8 m/s²', temp: '15°C', day: '24 Hours', year: '365.25 Days', facts: "The only planet known to harbor life and have abundant liquid water.\nIts magnetic field protects our atmosphere from the harsh solar wind.\nOur atmosphere is 78% nitrogen and 21% oxygen.", info: "Our home planet. The only place inhabited by living things." },
    { name: 'Mars', moons: '2', sunDistance: '228 Million km', distance: 29, size: 1.0, speed: 2 * Math.PI / 35, color: 0xff6b4a, type: 'Terrestrial', radius: '3,389.5 km', mass: '6.41 × 10²³ kg', gravity: '3.71 m/s²', temp: '-65°C', day: '24.6 Hours', year: '687 Earth Days', facts: "Its red appearance comes from rusted iron dust on its surface.\nHome to Olympus Mons, a volcano three times taller than Mount Everest.\nScientists have found evidence that liquid water once flowed here.", info: "A dusty, cold, desert world with a very thin atmosphere." },
    { name: 'Jupiter', moons: '95', sunDistance: '778 Million km', distance: 40, size: 3.5, speed: 2 * Math.PI / 70, color: 0xd9a46c, type: 'Gas Giant', radius: '69,911 km', mass: '1.89 × 10²⁷ kg', gravity: '24.79 m/s²', temp: '-110°C', day: '9.9 Hours', year: '11.8 Earth Years', facts: "It is the largest planet—over 1,300 Earths could fit inside it!\nThe Great Red Spot is a persistent giant storm larger than our entire planet.\nJupiter's strong magnetic field creates massive, beautiful auroras at its poles.", info: "More than twice as massive as the other planets combined." },
    { name: 'Saturn', moons: '146', sunDistance: '1.4 Billion km', distance: 54, size: 2.8, speed: 2 * Math.PI / 120, color: 0xe3cd8f, type: 'Gas Giant', radius: '58,232 km', mass: '5.68 × 10²⁶ kg', gravity: '10.44 m/s²', temp: '-140°C', day: '10.7 Hours', year: '29.4 Earth Years', facts: "Famous for its stunning, complex system of rings made of ice and rock.\nIt is the least dense planet—it could actually float in a giant bathtub of water!\nSaturn has the most moons in the solar system, with 146 confirmed.", info: "Adorned with a dazzling, complex system of icy rings.", hasRings: true },
    { name: 'Uranus', moons: '28', sunDistance: '2.9 Billion km', distance: 68, size: 2.2, speed: 2 * Math.PI / 180, color: 0x8acbe8, type: 'Ice Giant', radius: '25,362 km', mass: '8.68 × 10²⁵ kg', gravity: '8.69 m/s²', temp: '-195°C', day: '17.2 Hours', year: '84 Earth Years', facts: "It rotates completely on its side, making it appear to roll along its orbit.\nUranus holds the record for the coldest minimum atmospheric temperature at -224°C.\nIts pale, icy blue color is caused by atmospheric methane absorbing red light.", info: "Rotates at a nearly 90-degree angle from the plane of its orbit." },
    { name: 'Neptune', moons: '16', sunDistance: '4.5 Billion km', distance: 82, size: 2.0, speed: 2 * Math.PI / 250, color: 0x4371e8, type: 'Ice Giant', radius: '24,622 km', mass: '1.02 × 10²⁶ kg', gravity: '11.15 m/s²', temp: '-200°C', day: '16.1 Hours', year: '164.8 Earth Years', facts: "The farthest planet from the Sun, making it a dark, cold, and icy world.\nWhipped by supersonic wind storms that reach up to 2,000 km/h.\nIt was the first planet predicted by mathematical calculations rather than telescope discovery.", info: "Dark, cold, and whipped by supersonic winds." }
  ];

  const planetsGroup = new THREE.Group();
  scene.add(planetsGroup);

  planetaryData.forEach(p => {
    // Add orbit line
    const pathGeo = new THREE.RingGeometry(p.distance, p.distance + 0.15, 64);
    const pathMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, side: THREE.DoubleSide });
    const orbitPath = new THREE.Mesh(pathGeo, pathMat);
    scene.add(orbitPath);

    // Group to hold planet and UI elements
    const pGroup = new THREE.Group();
    const angle = Math.random() * Math.PI * 2;
    pGroup.position.set(Math.cos(angle) * p.distance, Math.sin(angle) * p.distance, 0);

    // Planet Mesh
    const pGeo = new THREE.SphereGeometry(p.size, 32, 32);
    const pMat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.6 });
    const planetMesh = new THREE.Mesh(pGeo, pMat);
    pGroup.add(planetMesh);

    // Saturn rings
    if (p.hasRings) {
      const ringGeo = new THREE.RingGeometry(p.size * 1.4, p.size * 2.2, 32);
      const ringMat = new THREE.MeshStandardMaterial({ color: p.color, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.5;
      planetMesh.add(ringMesh);
    }

    // --- Highlighting Elements (Hidden by default) ---
    // 1. Glowing Aura
    const glowGeo = new THREE.SphereGeometry(p.size * 1.25, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: p.color,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.visible = false;
    pGroup.add(glowMesh);

    // 2. 2D Target Ring (Faces Camera)
    const ringTargetGeo = new THREE.RingGeometry(p.size * 1.6, p.size * 1.7, 64);
    const ringTargetMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const targetRing = new THREE.Mesh(ringTargetGeo, ringTargetMat);
    targetRing.visible = false;
    pGroup.add(targetRing);

    // 3. 3D Sci-Fi Target Bracket (Octahedron Wireframe)
    const bracketGeo = new THREE.EdgesGeometry(new THREE.OctahedronGeometry(p.size * 2.2));
    const bracketMat = new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.8 });
    const bracketMesh = new THREE.LineSegments(bracketGeo, bracketMat);
    bracketMesh.visible = false;
    pGroup.add(bracketMesh);

    planetMesh.userData = { ...p, currentAngle: angle, pGroup, glowMesh, targetRing, bracketMesh };

    planetsGroup.add(pGroup);
    planetMeshes.push(planetMesh);
  });

  // ─── 4. Interaction & Camera Drag ──────────────────────────────────────────
  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let targetRotX = -Math.PI / 3;
  let targetRotZ = -Math.PI / 6;

  let currentZoom = 1.0;
  let targetZoom = 1.0;

  scene.rotation.x = targetRotX;
  scene.rotation.z = targetRotZ;

  document.addEventListener('wheel', (e) => {
    if (e.target.closest('.glass-panel')) return;
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    targetZoom = Math.max(0.4, Math.min(3.5, targetZoom + delta));
  }, { passive: false });

  document.addEventListener('pointerdown', (e) => {
    if (e.target.tagName !== 'CANVAS') return;
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  document.addEventListener('pointermove', (e) => {
    if (isDragging) {
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      targetRotZ += dx * 0.005;
      targetRotX += dy * 0.005;
      targetRotX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, targetRotX));
    }
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  document.addEventListener('pointerup', () => {
    isDragging = false;
  });

  // ─── 5. Raycasting & Click-to-Info ─────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let lockedPlanet = null;
  const eduPanel = document.getElementById('edu-panel');
  const readAloudBtn = document.getElementById('btn-read-aloud');

  const synth = window.speechSynthesis;

  document.addEventListener('pointerdown', (e) => {
    if (e.target.tagName !== 'CANVAS') return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(planetMeshes);
    if (intersects.length > 0) {
      handlePlanetClick(intersects[0].object);
    }
  });

  function handlePlanetClick(mesh) {
    if (lockedPlanet && lockedPlanet !== mesh) {
      lockedPlanet.userData.glowMesh.visible = false;
      lockedPlanet.userData.targetRing.visible = false;
      lockedPlanet.userData.bracketMesh.visible = false;
    }

    lockedPlanet = mesh;
    lockedPlanet.userData.glowMesh.visible = true;
    lockedPlanet.userData.targetRing.visible = true;
    lockedPlanet.userData.bracketMesh.visible = true;

    targetZoom = 1.6;

    const data = mesh.userData;

    // UI Update
    document.getElementById('planet-target').textContent = data.name;
    document.getElementById('planet-type').textContent = data.type;
    document.getElementById('planet-desc').textContent = data.info;
    document.getElementById('planet-radius').textContent = data.radius;
    document.getElementById('planet-mass').textContent = data.mass;
    document.getElementById('planet-gravity').textContent = data.gravity;
    document.getElementById('planet-temp').textContent = data.temp;
    document.getElementById('planet-day').textContent = data.day;
    document.getElementById('planet-year').textContent = data.year;
    document.getElementById('planet-moons').textContent = data.moons;
    document.getElementById('planet-distance').textContent = data.sunDistance;

    const pColor = '#' + data.color.toString(16).padStart(6, '0');
    document.getElementById('planet-type').style.color = pColor;
    document.getElementById('planet-type').style.borderColor = pColor;
    document.documentElement.style.setProperty('--neon-cyan', pColor);

    const planetFacts = document.getElementById('planet-facts');
    planetFacts.innerHTML = '';
    data.facts.split('\\n').forEach(val => {
      if (!val.trim()) return;
      const li = document.createElement('li');
      li.textContent = val.trim();
      planetFacts.appendChild(li);
    });

    readAloudBtn.style.display = 'block';

    if (synth && synth.speaking) synth.cancel();

    eduPanel.classList.add('active');

    // Sync Gooey Nav visually when clicking on a 3D planet
    const itemIndex = gooeyItems.findIndex(item => item.target === data.name);
    if (itemIndex !== -1 && gooeyNavInstance) {
      gooeyNavInstance.selectItemByIndex(itemIndex);
    }
  }

  // Bind side menu using GooeyNav
  const gooeyItems = planetaryData.map(p => ({ label: p.name, target: p.name, href: '#' }));
  const gooeyNavInstance = new GooeyNav('gooey-nav-wrapper', {
    items: gooeyItems,
    onSelect: (item) => {
      const tName = item.target;
      const tMesh = planetMeshes.find(m => m.userData.name === tName);
      if (tMesh) handlePlanetClick(tMesh);
    }
  });

  // Reset 
  document.getElementById('reset-view').addEventListener('click', () => {
    eduPanel.classList.remove('active');
    if (lockedPlanet) {
      lockedPlanet.userData.glowMesh.visible = false;
      lockedPlanet.userData.targetRing.visible = false;
      lockedPlanet.userData.bracketMesh.visible = false;
    }
    lockedPlanet = null;
    targetZoom = 1.0;
    readAloudBtn.style.display = 'none';
    if (synth && synth.speaking) synth.cancel();

    document.getElementById('planet-target').textContent = 'Solar System';
    document.getElementById('planet-type').textContent = 'View Mode';
    document.documentElement.style.setProperty('--neon-cyan', '#00f2fe');
    
    // Keeping the GooeyNav in its current position instead of clearing it completely
    // so it doesn't 'fade' out when the view is rested/reset.
  });

  // Read Aloud
  readAloudBtn.addEventListener('click', () => {
    if (!lockedPlanet || !synth) return;
    synth.cancel();
    const factText = lockedPlanet.userData.facts.replace(/\\n/g, ". ");
    const utterance = new SpeechSynthesisUtterance(`${lockedPlanet.userData.name}. ${factText}`);
    synth.speak(utterance);
  });

  // ─── 6. Render Loop ────────────────────────────────────────────────────────
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const ts = Date.now();
    const delta = clock.getDelta();

    drawStars(ts);

    planetMeshes.forEach(mesh => {
      const data = mesh.userData;
      data.currentAngle -= data.speed * delta;

      data.pGroup.position.x = Math.cos(data.currentAngle) * data.distance;
      data.pGroup.position.y = Math.sin(data.currentAngle) * data.distance;

      // Self spin
      mesh.rotation.x += 0.01;
      mesh.rotation.y += 0.01;

      // Highlight animations for locked planet
      if (lockedPlanet === mesh) {
        const t = ts * 0.003;
        data.glowMesh.scale.setScalar(1 + Math.sin(t * 1.5) * 0.15); // Pulsate aura
        data.targetRing.quaternion.copy(camera.quaternion); // Always face camera
        data.targetRing.rotation.z += t * 0.2; // Extra 2D spin
        
        data.bracketMesh.rotation.x += 0.005;
        data.bracketMesh.rotation.y += 0.008;
      }
    });

    // Lerp camera angle
    scene.rotation.z += (targetRotZ - scene.rotation.z) * 0.08;
    scene.rotation.x += (targetRotX - scene.rotation.x) * 0.08;

    // Smooth Zoom
    if (Math.abs(currentZoom - targetZoom) > 0.001) {
      currentZoom += (targetZoom - currentZoom) * 0.1;
      camera.zoom = currentZoom;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);
  }

  animate();

  // Initialize GlareHover on the two main UI glass panels
  if (typeof GlareHover !== 'undefined') {
    new GlareHover('.control-panel', {
      glareColor: "#ffffff",
      glareOpacity: 0.3,
      glareAngle: -30,
      glareSize: 300,
      transitionDuration: 800,
      playOnce: false
    });

    new GlareHover('.edu-panel', {
      glareColor: "#ffffff",
      glareOpacity: 0.3,
      glareAngle: -30,
      glareSize: 300,
      transitionDuration: 800,
      playOnce: false
    });
  }
});
