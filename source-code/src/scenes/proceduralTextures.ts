import * as THREE from 'three';

export interface ProceduralTextureSet {
  earthDay: THREE.CanvasTexture;
  earthRoughness: THREE.CanvasTexture;
  earthNight: THREE.CanvasTexture;
  earthClouds: THREE.CanvasTexture;
  solarCell: THREE.CanvasTexture;
  goldFoil: THREE.CanvasTexture;
  dispose: () => void;
}

// Continent polygon outlines in [lonDeg, latDeg] pairs for equirectangular projection
const CONTINENT_POLYGONS: Array<{
  coords: Array<[number, number]>;
  fill: string;
  biome: 'forest' | 'desert' | 'temperate' | 'ice';
}> = [
  // North America
  {
    biome: 'temperate',
    fill: '#3c6e47',
    coords: [
      [-168, 65], [-162, 71], [-135, 70], [-115, 73], [-82, 74], [-63, 62],
      [-55, 52], [-66, 44], [-75, 36], [-81, 25], [-83, 30], [-90, 29],
      [-97, 26], [-96, 19], [-88, 21], [-83, 10], [-78, 8], [-85, 11],
      [-93, 15], [-105, 20], [-112, 28], [-117, 32], [-124, 41], [-124, 49],
      [-136, 58], [-150, 60], [-162, 55],
    ],
  },
  // Greenland
  {
    biome: 'ice',
    fill: '#dce8f2',
    coords: [
      [-52, 60], [-42, 60], [-24, 70], [-18, 81], [-45, 83], [-70, 77], [-55, 68],
    ],
  },
  // South America
  {
    biome: 'forest',
    fill: '#2e6b3e',
    coords: [
      [-78, 9], [-72, 12], [-61, 10], [-50, 1], [-35, -6], [-38, -15],
      [-41, -22], [-49, -29], [-54, -34], [-64, -41], [-68, -54], [-74, -52],
      [-74, -40], [-71, -30], [-71, -18], [-81, -5], [-79, 2],
    ],
  },
  // Europe
  {
    biome: 'temperate',
    fill: '#466f4a',
    coords: [
      [-9, 37], [-9, 43], [-2, 43], [-4, 48], [2, 51], [8, 54], [6, 61],
      [15, 69], [28, 71], [42, 68], [58, 69], [60, 55], [44, 45], [30, 46],
      [28, 41], [23, 37], [18, 40], [12, 44], [8, 44], [3, 42], [-5, 36],
    ],
  },
  // UK & Ireland
  {
    biome: 'temperate',
    fill: '#4c7850',
    coords: [[-6, 50], [1, 51], [-2, 58], [-6, 57], [-10, 53]],
  },
  // Africa
  {
    biome: 'desert',
    fill: '#9a8453',
    coords: [
      [-17, 15], [-16, 28], [-6, 36], [10, 37], [12, 33], [25, 32], [33, 31],
      [43, 12], [51, 12], [49, 4], [41, -2], [40, -11], [35, -23], [28, -33],
      [18, -34], [14, -22], [12, -12], [9, 4], [2, 6], [-8, 5], [-16, 11],
    ],
  },
  // Madagascar
  {
    biome: 'forest',
    fill: '#3c6e45',
    coords: [[44, -25], [47, -25], [50, -15], [49, -12], [44, -18]],
  },
  // Asia
  {
    biome: 'temperate',
    fill: '#4d734b',
    coords: [
      [35, 36], [44, 42], [60, 55], [60, 69], [85, 73], [115, 74], [145, 71],
      [172, 66], [162, 56], [141, 53], [132, 43], [127, 36], [121, 39],
      [122, 31], [114, 22], [108, 16], [104, 2], [99, 10], [92, 22],
      [81, 14], [78, 8], [72, 21], [66, 25], [56, 26], [50, 29], [56, 22],
      [53, 16], [44, 13], [35, 29],
    ],
  },
  // Japan
  {
    biome: 'forest',
    fill: '#3f6d46',
    coords: [[130, 31], [136, 34], [141, 39], [145, 44], [140, 42], [135, 36]],
  },
  // Indonesia / Borneo / Sumatra
  {
    biome: 'forest',
    fill: '#2b6138',
    coords: [[96, 5], [105, -6], [118, -8], [118, 5], [108, 2]],
  },
  // Australia
  {
    biome: 'desert',
    fill: '#a66b43',
    coords: [
      [114, -22], [122, -17], [131, -12], [136, -12], [138, -16], [142, -11],
      [146, -18], [153, -27], [150, -37], [141, -38], [135, -34], [126, -32],
      [115, -34], [113, -26],
    ],
  },
  // Antarctica
  {
    biome: 'ice',
    fill: '#e2edf7',
    coords: [
      [-180, -72], [-140, -74], [-100, -73], [-60, -64], [-30, -74], [0, -70],
      [45, -68], [90, -67], [135, -67], [175, -72], [180, -72], [180, -90], [-180, -90],
    ],
  },
];

function lonToX(lon: number, width: number): number {
  return ((lon + 180) / 360) * width;
}

function latToY(lat: number, height: number): number {
  return ((90 - lat) / 180) * height;
}

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  coords: Array<[number, number]>,
  width: number,
  height: number,
): void {
  ctx.beginPath();
  coords.forEach(([lon, lat], i) => {
    const x = lonToX(lon, width);
    const y = latToY(lat, height);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

export function createProceduralTextures(
  maxAnisotropy: number,
): ProceduralTextureSet {
  const width = 2048;
  const height = 1024;
  const detailScale = width / 1024;

  // 1. Earth Day Texture
  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = width;
  dayCanvas.height = height;
  const dCtx = dayCanvas.getContext('2d')!;

  // Deep ocean gradient
  const oceanGrad = dCtx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#0a2a54');
  oceanGrad.addColorStop(0.25, '#0b3b75');
  oceanGrad.addColorStop(0.5, '#0d4a8f');
  oceanGrad.addColorStop(0.75, '#0b3b75');
  oceanGrad.addColorStop(1, '#0a2a54');
  dCtx.fillStyle = oceanGrad;
  dCtx.fillRect(0, 0, width, height);

  // Subtle ocean bathymetry swirls
  for (let i = 0; i < 65; i++) {
    const x = ((i * 197) % width);
    const y = ((i * 113) % height);
    const r = (30 + (i % 5) * 22) * detailScale;
    const g = dCtx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(30, 110, 190, 0.16)');
    g.addColorStop(1, 'rgba(10, 42, 84, 0)');
    dCtx.fillStyle = g;
    dCtx.beginPath();
    dCtx.arc(x, y, r, 0, Math.PI * 2);
    dCtx.fill();
  }

  // Coastal shelf glow + Landmasses
  for (const poly of CONTINENT_POLYGONS) {
    drawPolygon(dCtx, poly.coords, width, height);
    dCtx.lineWidth = 8 * detailScale;
    dCtx.strokeStyle = 'rgba(22, 130, 178, 0.45)';
    dCtx.stroke();
  }

  for (const poly of CONTINENT_POLYGONS) {
    drawPolygon(dCtx, poly.coords, width, height);
    dCtx.fillStyle = poly.fill;
    dCtx.fill();
  }

  // Add soft, clipped biome variation so continents read as terrain instead of flat polygons.
  let terrainSeed = 28411;
  const terrainRandom = () => {
    terrainSeed = (terrainSeed * 16807) % 2147483647;
    return (terrainSeed - 1) / 2147483646;
  };
  const terrainTones: Record<typeof CONTINENT_POLYGONS[number]['biome'], string[]> = {
    forest: ['46, 105, 55', '88, 126, 62', '31, 83, 49'],
    desert: ['196, 158, 94', '224, 192, 128', '142, 116, 75'],
    temperate: ['91, 122, 74', '139, 148, 91', '60, 100, 72'],
    ice: ['206, 225, 239', '245, 249, 252', '164, 190, 210'],
  };
  for (const poly of CONTINENT_POLYGONS) {
    const points = poly.coords.map(([lon, lat]) => [
      lonToX(lon, width),
      latToY(lat, height),
    ] as const);
    const minX = Math.min(...points.map(([x]) => x));
    const maxX = Math.max(...points.map(([x]) => x));
    const minY = Math.min(...points.map(([, y]) => y));
    const maxY = Math.max(...points.map(([, y]) => y));

    dCtx.save();
    drawPolygon(dCtx, poly.coords, width, height);
    dCtx.clip();
    for (let i = 0; i < 170; i++) {
      const x = minX + terrainRandom() * (maxX - minX);
      const y = minY + terrainRandom() * (maxY - minY);
      const radius = (5 + terrainRandom() * 24) * detailScale;
      const tone = terrainTones[poly.biome][
        Math.floor(terrainRandom() * terrainTones[poly.biome].length)
      ];
      const relief = dCtx.createRadialGradient(x, y, 0, x, y, radius);
      relief.addColorStop(0, `rgba(${tone}, 0.22)`);
      relief.addColorStop(1, `rgba(${tone}, 0)`);
      dCtx.fillStyle = relief;
      dCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    dCtx.restore();
  }

  // Biome terrain detail spots (Amazon green, Sahara sand, Arctic snow)
  const patches: Array<{ lon: number; lat: number; r: number; color: string }> = [
    { lon: -62, lat: -4, r: 42, color: 'rgba(26, 107, 49, 0.55)' }, // Amazon
    { lon: 22, lat: 0, r: 34, color: 'rgba(26, 107, 49, 0.5)' }, // Congo
    { lon: 14, lat: 23, r: 58, color: 'rgba(205, 173, 108, 0.65)' }, // Sahara
    { lon: 48, lat: 24, r: 30, color: 'rgba(205, 173, 108, 0.55)' }, // Arabia
    { lon: 133, lat: -24, r: 34, color: 'rgba(186, 107, 62, 0.55)' }, // Outback
    { lon: 92, lat: 34, r: 44, color: 'rgba(148, 158, 145, 0.45)' }, // Himalayas
    { lon: -108, lat: 43, r: 34, color: 'rgba(130, 135, 118, 0.45)' }, // Rockies
  ];
  for (const p of patches) {
    const cx = lonToX(p.lon, width);
    const cy = latToY(p.lat, height);
    const radius = p.r * detailScale;
    const g = dCtx.createRadialGradient(cx, cy, 4 * detailScale, cx, cy, radius);
    g.addColorStop(0, p.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    dCtx.fillStyle = g;
    dCtx.beginPath();
    dCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    dCtx.fill();
  }

  // North polar sea ice cap
  const polarHeight = 52 * detailScale;
  const polarGrad = dCtx.createLinearGradient(0, 0, 0, polarHeight);
  polarGrad.addColorStop(0, 'rgba(232, 242, 250, 0.96)');
  polarGrad.addColorStop(0.65, 'rgba(218, 232, 244, 0.45)');
  polarGrad.addColorStop(1, 'rgba(218, 232, 244, 0)');
  dCtx.fillStyle = polarGrad;
  dCtx.fillRect(0, 0, width, 54 * detailScale);

  const earthDay = new THREE.CanvasTexture(dayCanvas);
  earthDay.colorSpace = THREE.SRGBColorSpace;
  earthDay.anisotropy = maxAnisotropy;

  // 2. Earth Roughness Texture (oceans glossy 0.28, land matte 0.85)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = width;
  roughCanvas.height = height;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#484848'; // ~0.28 roughness for oceans
  rCtx.fillRect(0, 0, width, height);
  for (const poly of CONTINENT_POLYGONS) {
    drawPolygon(rCtx, poly.coords, width, height);
    rCtx.fillStyle = poly.biome === 'ice' ? '#999999' : '#dadada';
    rCtx.fill();
  }
  const earthRoughness = new THREE.CanvasTexture(roughCanvas);
  earthRoughness.anisotropy = maxAnisotropy;

  // 3. Earth Night Lights Texture
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = width;
  nightCanvas.height = height;
  const nCtx = nightCanvas.getContext('2d')!;
  nCtx.fillStyle = '#000000';
  nCtx.fillRect(0, 0, width, height);

  const cityHubs: Array<[number, number, number]> = [
    [-74, 40.7, 14], [-87.6, 41.8, 12], [-118.2, 34.0, 12], [-122.4, 37.7, 9],
    [-99.1, 19.4, 11], [-46.6, -23.5, 13], [-58.4, -34.6, 10], [-70.6, -33.4, 7],
    [-0.1, 51.5, 13], [2.3, 48.8, 13], [13.4, 52.5, 11], [12.5, 41.9, 10],
    [-3.7, 40.4, 10], [37.6, 55.7, 14], [31.2, 30.0, 12], [3.4, 6.5, 9],
    [28.0, -26.2, 9], [55.3, 25.2, 10], [72.8, 19.0, 14], [77.2, 28.6, 15],
    [103.8, 1.3, 10], [106.8, -6.2, 11], [116.4, 39.9, 15], [121.5, 31.2, 16],
    [114.1, 22.3, 14], [127.0, 37.5, 12], [139.7, 35.7, 15], [151.2, -33.9, 9],
  ];
  for (const [lon, lat, spread] of cityHubs) {
    const cx = lonToX(lon, width);
    const cy = latToY(lat, height);
    const citySpread = spread * detailScale;
    const g = nCtx.createRadialGradient(cx, cy, detailScale, cx, cy, citySpread);
    g.addColorStop(0, 'rgba(255, 205, 115, 0.95)');
    g.addColorStop(0.5, 'rgba(255, 165, 65, 0.45)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    nCtx.fillStyle = g;
    nCtx.beginPath();
    nCtx.arc(cx, cy, citySpread, 0, Math.PI * 2);
    nCtx.fill();
  }

  const earthNight = new THREE.CanvasTexture(nightCanvas);
  earthNight.colorSpace = THREE.SRGBColorSpace;
  earthNight.anisotropy = maxAnisotropy;

  // 4. Cloud Layer Texture
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = width;
  cloudCanvas.height = height;
  const cCtx = cloudCanvas.getContext('2d')!;
  cCtx.clearRect(0, 0, width, height);

  for (let i = 0; i < 440; i++) {
    const x = ((i * 173 + (i % 7) * 41) % width);
    const y = 30 * detailScale + ((i * 89 * detailScale) % (height - 60 * detailScale));
    const rx = (24 + (i % 6) * 16) * detailScale;
    const ry = (7 + (i % 4) * 5) * detailScale;
    const alpha = 0.08 + (i % 5) * 0.045;
    cCtx.save();
    cCtx.translate(x, y);
    cCtx.rotate(((i % 9) - 4) * 0.08);
    const g = cCtx.createRadialGradient(0, 0, 1, 0, 0, rx);
    g.addColorStop(0, `rgba(248, 252, 255, ${alpha})`);
    g.addColorStop(1, 'rgba(248, 252, 255, 0)');
    cCtx.fillStyle = g;
    cCtx.scale(1, ry / rx);
    cCtx.beginPath();
    cCtx.arc(0, 0, rx, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.restore();
  }

  const earthClouds = new THREE.CanvasTexture(cloudCanvas);
  earthClouds.colorSpace = THREE.SRGBColorSpace;
  earthClouds.anisotropy = maxAnisotropy;

  // 5. Solar Cell Texture
  const solarCanvas = document.createElement('canvas');
  solarCanvas.width = 512;
  solarCanvas.height = 256;
  const sCtx = solarCanvas.getContext('2d')!;
  sCtx.fillStyle = '#0d234a';
  sCtx.fillRect(0, 0, 512, 256);

  const cols = 8;
  const rows = 4;
  const cellW = 512 / cols;
  const cellH = 256 / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      const grad = sCtx.createLinearGradient(x, y, x + cellW, y + cellH);
      grad.addColorStop(0, '#133269');
      grad.addColorStop(1, '#091a38');
      sCtx.fillStyle = grad;
      sCtx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
      // Thin silver busbars
      sCtx.fillStyle = 'rgba(186, 230, 253, 0.35)';
      sCtx.fillRect(x + cellW * 0.33, y + 3, 1, cellH - 6);
      sCtx.fillRect(x + cellW * 0.66, y + 3, 1, cellH - 6);
    }
  }
  const solarCell = new THREE.CanvasTexture(solarCanvas);
  solarCell.colorSpace = THREE.SRGBColorSpace;
  solarCell.anisotropy = maxAnisotropy;

  // 6. Gold MLI Foil Texture
  const goldCanvas = document.createElement('canvas');
  goldCanvas.width = 256;
  goldCanvas.height = 256;
  const gCtx = goldCanvas.getContext('2d')!;
  gCtx.fillStyle = '#c9932c';
  gCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 320; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    const w = 10 + (i % 14);
    const h = 8 + ((i * 3) % 12);
    gCtx.fillStyle =
      i % 2 === 0 ? 'rgba(255, 224, 130, 0.18)' : 'rgba(130, 82, 12, 0.2)';
    gCtx.fillRect(x, y, w, h);
  }
  const goldFoil = new THREE.CanvasTexture(goldCanvas);
  goldFoil.colorSpace = THREE.SRGBColorSpace;
  goldFoil.anisotropy = maxAnisotropy;

  return {
    earthDay,
    earthRoughness,
    earthNight,
    earthClouds,
    solarCell,
    goldFoil,
    dispose: () => {
      earthDay.dispose();
      earthRoughness.dispose();
      earthNight.dispose();
      earthClouds.dispose();
      solarCell.dispose();
      goldFoil.dispose();
    },
  };
}
