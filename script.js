// Construcción de pétalos vectoriales para el SVG de bienvenida
const petalsTemplate = document.getElementById('petalsTemplate');
const numPetals = 16;
for (let i = 0; i < numPetals; i++) {
  const angle = (360 / numPetals) * i;
  const petal = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const isLight = i % 2 === 0;
  petal.setAttribute('class', `petal ${isLight ? 'petal-light' : 'petal-dark'}`);
  petal.setAttribute('d', 'M 0,-6 L -5,-16 L -9,-26 L -3,-34 L 0,-44 L 3,-34 L 9,-26 L 5,-16 Z');
  petal.setAttribute('transform', `rotate(${angle})`);
  petalsTemplate.appendChild(petal);
}

function makeLeaf(x, y, rotate, scale) {
  const leaf = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  leaf.setAttribute('class', 'leaf');
  leaf.setAttribute('d', 'M 0,0 C 12,-5 25,-2 34,9 C 25,12 12,11 0,0 Z');
  leaf.setAttribute('transform', `translate(${x} ${y}) rotate(${rotate}) scale(${scale})`);
  return leaf;
}

const bouquetGroup = document.getElementById('bouquetGroup');

const stem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
stem.setAttribute('class', 'stem');
stem.setAttribute('d', 'M 150,175 C 147,215 150,250 150,285');
bouquetGroup.appendChild(stem);

bouquetGroup.appendChild(makeLeaf(150, 225, 28, 1.15));
bouquetGroup.appendChild(makeLeaf(150, 225, 202, 1.15));

const flowers = [
  { x: 150, y: 155, scale: 0.95, rotate: -5 },
  { x: 115, y: 180, scale: 0.7, rotate: 15 },
  { x: 185, y: 180, scale: 0.7, rotate: -15 },
];

flowers.forEach(f => {
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#sunflowerSymbol');
  use.setAttribute('width', '100');
  use.setAttribute('height', '100');
  use.setAttribute('x', -50);
  use.setAttribute('y', -50);
  use.setAttribute('transform', `translate(${f.x} ${f.y}) scale(${f.scale}) rotate(${f.rotate})`);
  bouquetGroup.appendChild(use);
});

// Estrellas de fondo dinámicas
const skyContainer = document.getElementById('sky');
for (let i = 0; i < 100; i++) {
  const star = document.createElement('div');
  star.classList.add('star');
  const size = Math.random() * 2.5 + 1;
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;
  star.style.top = `${Math.random() * 100}%`;
  star.style.left = `${Math.random() * 100}%`;
  star.style.animationDuration = `${Math.random() * 3 + 2}s`;
  star.style.animationDelay = `${Math.random() * 5}s`;
  skyContainer.appendChild(star);
}

// Estrellas fugaces
const shootingContainer = document.getElementById('shootingStars');
for (let i = 0; i < 5; i++) {
  const s = document.createElement('div');
  s.classList.add('shooting-star');
  s.style.top = `${Math.random() * 45}%`;
  s.style.left = `${Math.random() * 40}%`;
  s.style.animationDuration = `${Math.random() * 2 + 2.5}s`;
  s.style.animationDelay = `${Math.random() * 6}s`;
  shootingContainer.appendChild(s);
}

// Transición: zoom del ramo -> destello -> galaxia con cámara "volando"
let galaxyStarted = false;
document.getElementById('splash').addEventListener('click', () => {
  const splash = document.getElementById('splash');
  const sunflower = document.getElementById('sunflower');
  const glow = document.querySelector('.glow');
  const flash = document.getElementById('flash-overlay');

  // Paso 1: el ramo se agranda hacia la cámara
  sunflower.classList.add('zooming');
  glow.classList.add('intense');

  // Paso 2: a mitad del zoom, dispara el destello blanco
  setTimeout(() => {
    flash.classList.add('flash-in');
  }, 350);

  // Paso 3: con la pantalla ya cubierta de blanco, cambiamos de escena
  setTimeout(() => {
    splash.classList.add('hidden');
    document.getElementById('galaxy').classList.remove('hidden');

    if (!galaxyStarted) {
      initGalaxy();
      galaxyStarted = true;
    }

    // Paso 4: el destello se desvanece, revelando la galaxia ya renderizando detrás
    flash.classList.remove('flash-in');
    flash.classList.add('flash-out');
  }, 700);
});