function initGalaxy() {
  const container = document.getElementById('galaxy-canvas');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  // La cámara arranca muy cerca del centro (dentro del destello) y luego "vuela" hacia atrás
  const finalCameraPos = { x: 0, y: 28, z: 24 };
  camera.position.set(0, 3, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 10;
  controls.maxDistance = 55;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;
  controls.update();

  // Shaders para brillo de partículas
  const glowVertexShader = `
    attribute float size;
    attribute vec3 customColor;
    attribute float alphaFade;
    varying vec3 vColor;
    varying float vAlphaFade;
    void main() {
      vColor = customColor;
      vAlphaFade = alphaFade;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;
  const glowFragmentShader = `
    varying vec3 vColor;
    varying float vAlphaFade;
    uniform float uOpacity;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.0, d) * uOpacity * vAlphaFade;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;
  function makeGlowMaterial(opacity = 1.0) {
    return new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: { uOpacity: { value: opacity } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const galaxyGroup = new THREE.Group();

  // ---------- 1. ESPIRALES MÚLTIPLES COMBINADAS ----------
  const spiralPositions = [];
  const spiralColors = [];
  const spiralSizes = [];
  const spiralAlphaFades = [];

  const systems = [
    { arms: 2, count: 6000, turns: 3.0, radius: 36, spreadMultiplier: 2.2 },
    { arms: 4, count: 4000, turns: 2.5, radius: 32, spreadMultiplier: 3.0 }
  ];

  systems.forEach(sys => {
    for (let arm = 0; arm < sys.arms; arm++) {
      const armOffset = (arm * Math.PI * 2) / sys.arms;
      for (let i = 0; i < (sys.count / sys.arms); i++) {
        const t = i / (sys.count / sys.arms);
        const angle = t * Math.PI * 2 * sys.turns + armOffset;
        const radius = Math.pow(t, 0.7) * sys.radius;

        const spread = (1 - t * 0.3) * sys.spreadMultiplier * (Math.random() - 0.5);
        const x = Math.cos(angle) * radius + Math.cos(angle + Math.PI/2) * spread;
        const z = Math.sin(angle) * radius + Math.sin(angle + Math.PI/2) * spread;
        const y = (Math.random() - 0.5) * (1.5 * (1 - t));

        spiralPositions.push(x, y, z);

        const rColor = 1.0;
        const gColor = 0.9 + (0.1 * (1.0 - t));
        const bColor = 0.2 * (1.0 - t);

        spiralColors.push(rColor, gColor, bColor);

        const fadeFactor = Math.max(0, 1 - Math.pow(t, 1.4));
        spiralSizes.push(((1 - t * 0.5) * 2.5 + 0.8) * fadeFactor);
        spiralAlphaFades.push(fadeFactor);
      }
    }
  });

  const coreRingGeo = new THREE.RingGeometry(0.8, 2.2, 32);
  const coreRingMat = new THREE.MeshBasicMaterial({ color: 0x0b0b0b, side: THREE.DoubleSide });
  const coreRing = new THREE.Mesh(coreRingGeo, coreRingMat);
  coreRing.rotation.x = Math.PI / 2;
  coreRing.position.y = 0.05;
  galaxyGroup.add(coreRing);

  const innerGlowGeo = new THREE.RingGeometry(2.1, 2.6, 32);
  const innerGlowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
  const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
  innerGlow.rotation.x = Math.PI / 2;
  innerGlow.position.y = 0.04;
  galaxyGroup.add(innerGlow);

  const spiralGeometry = new THREE.BufferGeometry();
  spiralGeometry.setAttribute('position', new THREE.Float32BufferAttribute(spiralPositions, 3));
  spiralGeometry.setAttribute('customColor', new THREE.Float32BufferAttribute(spiralColors, 3));
  spiralGeometry.setAttribute('size', new THREE.Float32BufferAttribute(spiralSizes, 1));
  spiralGeometry.setAttribute('alphaFade', new THREE.Float32BufferAttribute(spiralAlphaFades, 1));

  const spiralPoints = new THREE.Points(spiralGeometry, makeGlowMaterial(0.95));
  galaxyGroup.add(spiralPoints);

  // ---------- 2. HALO EXTERIOR AMPLIADO ----------
  const haloCount = 15000;
  const hPositions = [], hColors = [], hSizes = [], hAlphas = [];

  for (let i = 0; i < haloCount; i++) {
    const r = Math.pow(Math.random(), 0.5) * 48;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 4.2 * (1 - r / 48);

    hPositions.push(Math.cos(theta) * r, y, Math.sin(theta) * r);

    const fade = Math.max(0, 1 - (r / 48));
    hColors.push(1.0, 0.88, 0.3);
    hSizes.push((0.8 + Math.random() * 2.0) * fade);
    hAlphas.push(fade * 0.65);
  }

  const haloGeometry = new THREE.BufferGeometry();
  haloGeometry.setAttribute('position', new THREE.Float32BufferAttribute(hPositions, 3));
  haloGeometry.setAttribute('customColor', new THREE.Float32BufferAttribute(hColors, 3));
  haloGeometry.setAttribute('size', new THREE.Float32BufferAttribute(hSizes, 1));
  haloGeometry.setAttribute('alphaFade', new THREE.Float32BufferAttribute(hAlphas, 1));

  const haloPoints = new THREE.Points(haloGeometry, makeGlowMaterial(0.6));
  galaxyGroup.add(haloPoints);
  scene.add(galaxyGroup);

  // ---------- 3. GIRASOL CENTRAL ----------
  const sunflowerGroup = new THREE.Group();
  sunflowerGroup.position.y = 0.5;

  // Pétalo: forma alargada que empieza a "baseR" del centro
  function makePetalGeo(baseR) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(1.1, 0.8, 1.0, 3.6, 0, 5);
    s.bezierCurveTo(-1.0, 3.6, -1.1, 0.8, 0, 0);
    const g = new THREE.ShapeGeometry(s);
    g.translate(0, baseR, 0);
    g.rotateX(-Math.PI / 2); // lo acuesta sobre el plano de la galaxia
    return g;
  }

  const petalLayers = [
    { count: 20, scale: 1.0, baseR: 2.9, tilt: 0.06, y: 0.0, offset: 0,
      colors: [0xffd447, 0xffb703] },
    { count: 20, scale: 0.8, baseR: 2.9, tilt: 0.14, y: 0.1, offset: 0.5,
      colors: [0xffe26f, 0xffc928] }
  ];

  const flowerDummy = new THREE.Object3D();
  flowerDummy.rotation.order = 'YXZ';

  petalLayers.forEach(layer => {
    const geo = makePetalGeo(layer.baseR / layer.scale);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const mesh = new THREE.InstancedMesh(geo, mat, layer.count);

    for (let i = 0; i < layer.count; i++) {
      const angle = ((i + layer.offset) / layer.count) * Math.PI * 2;
      flowerDummy.position.set(0, layer.y, 0);
      flowerDummy.rotation.set(layer.tilt, angle, 0);
      flowerDummy.scale.setScalar(layer.scale);
      flowerDummy.updateMatrix();
      mesh.setMatrixAt(i, flowerDummy.matrix);
      mesh.setColorAt(i, new THREE.Color(layer.colors[i % layer.colors.length]));
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.frustumCulled = false;
    sunflowerGroup.add(mesh);
  });

  // Disco central oscuro
  const discGeo = new THREE.CircleGeometry(3.1, 48);
  discGeo.rotateX(-Math.PI / 2);
  const disc = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0x1a0d05 }));
  disc.position.y = 0.3;
  sunflowerGroup.add(disc);

  // Semillas en espiral (patrón real de girasol: ángulo de oro)
  const seedCount = 700;
  const seedGeo = new THREE.CircleGeometry(1, 8);
  seedGeo.rotateX(-Math.PI / 2);
  const seeds = new THREE.InstancedMesh(
    seedGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    seedCount
  );
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const seedInner = new THREE.Color(0x2a1405);
  const seedOuter = new THREE.Color(0x8a5518);
  const seedDummy = new THREE.Object3D();

  for (let n = 0; n < seedCount; n++) {
    const f = n / seedCount;
    const r = Math.sqrt(f) * 2.95;
    const a = n * goldenAngle;
    seedDummy.position.set(Math.cos(a) * r, 0.33, Math.sin(a) * r);
    seedDummy.scale.setScalar(0.1 + f * 0.1);
    seedDummy.updateMatrix();
    seeds.setMatrixAt(n, seedDummy.matrix);

    const c = seedInner.clone().lerp(seedOuter, f);
    c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
    seeds.setColorAt(n, c);
  }
  seeds.instanceMatrix.needsUpdate = true;
  seeds.instanceColor.needsUpdate = true;
  seeds.frustumCulled = false;
  sunflowerGroup.add(seeds);

  scene.add(sunflowerGroup);

  // ---------- 4. CIELO ESTRELLADO ----------
  const starCount = 5000;
  const starPositions = [], starColors = [], starSizes = [], starAlphas = [];

  const starPalette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0x9bf6ff),
    new THREE.Color(0xffd6a5),
    new THREE.Color(0xfdffb6)
  ];

  for (let i = 0; i < starCount; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = 250 + Math.random() * 250;

    starPositions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );

    const color = starPalette[Math.floor(Math.random() * starPalette.length)];
    starColors.push(color.r, color.g, color.b);
    starSizes.push(0.8 + Math.random() * 2.2);
    starAlphas.push(0.3 + Math.random() * 0.7);
  }

  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('customColor', new THREE.Float32BufferAttribute(starColors, 3));
  starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
  starGeometry.setAttribute('alphaFade', new THREE.Float32BufferAttribute(starAlphas, 1));

  const starField = new THREE.Points(starGeometry, makeGlowMaterial(0.85));
  scene.add(starField);

  // ---------- 5. ESTRELLAS FUGAZES ----------
  const shootingStars = [];
  const shootingStarCount = 8;

  for (let i = 0; i < shootingStarCount; i++) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geo, mat);
    scene.add(line);

    shootingStars.push({
      mesh: line,
      active: false,
      progress: 0,
      speed: 0.6 + Math.random() * 0.9,
      startPos: new THREE.Vector3(),
      endPos: new THREE.Vector3(),
      delay: Math.random() * 2
    });
  }

  function updateShootingStars(delta) {
    shootingStars.forEach(star => {
      star.delay -= delta;
      if (star.delay <= 0 && !star.active) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 120 + Math.random() * 60;

        star.startPos.set(
          r * Math.sin(phi) * Math.cos(theta),
          60 + Math.random() * 40,
          r * Math.sin(phi) * Math.sin(theta)
        );

        star.endPos.copy(star.startPos).sub(new THREE.Vector3(
          40 + Math.random() * 30,
          30 + Math.random() * 20,
          40 + Math.random() * 30
        ));

        star.progress = 0;
        star.active = true;
      }

      if (star.active) {
        star.progress += delta * star.speed;
        if (star.progress >= 1) {
          star.active = false;
          star.delay = 0.5 + Math.random() * 1.5;
          star.mesh.material.opacity = 0;
        } else {
          const currentPos = new THREE.Vector3().lerpVectors(star.startPos, star.endPos, star.progress);
          const tailPos = new THREE.Vector3().lerpVectors(star.startPos, star.endPos, Math.max(0, star.progress - 0.15));

          const posAttr = star.mesh.geometry.attributes.position;
          posAttr.setXYZ(0, currentPos.x, currentPos.y, currentPos.z);
          posAttr.setXYZ(1, tailPos.x, tailPos.y, tailPos.z);
          posAttr.needsUpdate = true;

          star.mesh.material.opacity = Math.sin(star.progress * Math.PI) * 0.85;
        }
      }
    });
  }

  // ---------- 6. PLANETAS FLOTANTES (FOTOS REDONDAS Y DISPERSAS) ----------
  const interactiveImages = [];
  const textureLoader = new THREE.TextureLoader();

  const imagePaths = [
    'img/foto1.jpg',
    'img/foto2.jpg',
    'img/foto3.jpg',
    'img/foto4.jpg',
    'img/foto5.jpg',
    'img/foto6.jpg',
    'img/foto7.jpg',
    'img/foto8.jpg'
  ];

  const imagesGroup = new THREE.Group();

  imagePaths.forEach((path, index) => {
    textureLoader.load(path, (texture) => {
      const geometry = new THREE.CircleGeometry(2.6, 32);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true
      });

      const mesh = new THREE.Mesh(geometry, material);

      const angle = (index / imagePaths.length) * Math.PI * 2 + (Math.random() * 0.8);
      const minRadius = 13;
      const maxRadius = 33;
      const radius = minRadius + (index / (imagePaths.length - 1)) * (maxRadius - minRadius) + (Math.random() - 0.5) * 2;
      const height = (Math.random() - 0.5) * 3;

      mesh.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);

      mesh.userData = {
        imagePath: path,
        orbitAngle: angle,
        orbitRadius: radius,
        orbitHeight: height,
        orbitSpeed: 0.035
      };

      imagesGroup.add(mesh);
      interactiveImages.push(mesh);
    });
  });

  scene.add(imagesGroup);

  // ---------- 7. PÉTALOS AMARILLOS FLOTANDO ----------
  const petalCount = 220;

  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(0.5, 0.3, 0.6, 1.1, 0, 1.6);
  petalShape.bezierCurveTo(-0.6, 1.1, -0.5, 0.3, 0, 0);

  const petalGeo = new THREE.ShapeGeometry(petalShape);
  petalGeo.translate(0, -0.8, 0);

  const petalMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });

  const petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  petalMesh.frustumCulled = false;

  const petalColors = [
    new THREE.Color(0xffe26f),
    new THREE.Color(0xffd447),
    new THREE.Color(0xf5a623)
  ];

  const petals = [];
  const petalDummy = new THREE.Object3D();
  let petalTime = 0;

  function spawnPetal(p, randomY) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 45;
    p.x = Math.cos(a) * r;
    p.z = Math.sin(a) * r;
    p.y = randomY ? (Math.random() * 46 - 6) : 40 + Math.random() * 6;
  }

  for (let i = 0; i < petalCount; i++) {
    const p = {
      speed: 0.8 + Math.random() * 1.4,
      swayAmp: 0.5 + Math.random() * 1.5,
      swayFreq: 0.4 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      rsx: (Math.random() - 0.5) * 2,
      rsy: (Math.random() - 0.5) * 2,
      rsz: (Math.random() - 0.5) * 2,
      scale: 0.35 + Math.random() * 0.45
    };
    spawnPetal(p, true);
    petals.push(p);
    petalMesh.setColorAt(i, petalColors[Math.floor(Math.random() * petalColors.length)]);
  }

  scene.add(petalMesh);

  function updatePetals(delta) {
    petalTime += delta;

    petals.forEach((p, i) => {
      p.y -= p.speed * delta;
      if (p.y < -6) spawnPetal(p, false);

      p.rx += p.rsx * delta;
      p.ry += p.rsy * delta;
      p.rz += p.rsz * delta;

      const t = petalTime * p.swayFreq + p.phase;
      petalDummy.position.set(
        p.x + Math.sin(t) * p.swayAmp,
        p.y,
        p.z + Math.cos(t) * p.swayAmp
      );
      petalDummy.rotation.set(p.rx, p.ry, p.rz);
      petalDummy.scale.setScalar(p.scale);
      petalDummy.updateMatrix();
      petalMesh.setMatrixAt(i, petalDummy.matrix);
    });

    petalMesh.instanceMatrix.needsUpdate = true;
  }
  

  // ---------- RAYCASTER + MODAL DE TARJETA ----------
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const modal = document.getElementById('card-modal');
  const cardImg = document.getElementById('card-img');
  const closeBtn = document.getElementById('card-close');
  let paused = false;

  function openCard(path) {
    cardImg.src = path;
    modal.classList.remove('hidden');
    paused = true;
    controls.enabled = false;
  }

  function closeCard() {
    modal.classList.add('hidden');
    paused = false;
    controls.enabled = true;
  }

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeCard();
  });

   let downX = 0, downY = 0, downTime = 0;

  renderer.domElement.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downY = e.clientY;
    downTime = performance.now();
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (paused) return;

    // Si arrastró o mantuvo presionado, es rotación de cámara, no un toque
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    if (moved > 10 || performance.now() - downTime > 500) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveImages);

    if (intersects.length > 0) {
      openCard(intersects[0].object.userData.imagePath);
    }
  });

  // ---------- ANIMACIÓN GENERAL ----------
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const rawDelta = clock.getDelta();
    const delta = paused ? 0 : rawDelta;
    const elapsed = clock.getElapsedTime();

    if (elapsed < 2.2) {
      const p = Math.min(elapsed / 2.2, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      camera.position.x = 3 + (finalCameraPos.x - 3) * eased;
      camera.position.y = 3 + (finalCameraPos.y - 3) * eased;
      camera.position.z = 4 + (finalCameraPos.z - 4) * eased;
      controls.target.set(0, 3 * (1 - eased) + 6 * eased, 0);
    }

    galaxyGroup.rotation.y += delta * 0.04;
    coreRing.rotation.z -= delta * 0.04;
    innerGlow.rotation.z -= delta * 0.04;

    sunflowerGroup.rotation.y -= delta * 0.1;

    interactiveImages.forEach(mesh => {
      mesh.userData.orbitAngle -= delta * mesh.userData.orbitSpeed;
      mesh.position.set(
        Math.cos(mesh.userData.orbitAngle) * mesh.userData.orbitRadius,
        mesh.userData.orbitHeight,
        Math.sin(mesh.userData.orbitAngle) * mesh.userData.orbitRadius
      );

      mesh.quaternion.copy(camera.quaternion);
    });

    updateShootingStars(delta);
    updatePetals(delta);

    controls.autoRotate = !paused;
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
