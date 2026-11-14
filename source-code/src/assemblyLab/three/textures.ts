import * as THREE from 'three';

export interface ProceduralTextures {
  solarColor: THREE.CanvasTexture;
  mliColor: THREE.CanvasTexture;
  mliBump: THREE.CanvasTexture;
  aluminumColor: THREE.CanvasTexture;
  carbonColor: THREE.CanvasTexture;
  cleanroomFloor: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  earthAlbedo: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  const aniso = Math.min(maxAnisotropy, 8);

  // 1. Solar Cell Wafer Grid (SRGB)
  const solarCanvas = document.createElement('canvas');
  solarCanvas.width = 512;
  solarCanvas.height = 512;
  const sCtx = solarCanvas.getContext('2d')!;
  sCtx.fillStyle = '#071428';
  sCtx.fillRect(0, 0, 512, 512);

  const cols = 4;
  const rows = 8;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      const grad = sCtx.createLinearGradient(x, y, x + cellW, y + cellH);
      grad.addColorStop(0, '#0B254A');
      grad.addColorStop(0.5, '#0F3366');
      grad.addColorStop(1, '#091D3B');
      sCtx.fillStyle = grad;
      sCtx.fillRect(x + 3, y + 3, cellW - 6, cellH - 6);

      // Fine silver grid fingers
      sCtx.strokeStyle = 'rgba(186, 214, 247, 0.35)';
      sCtx.lineWidth = 1;
      for (let f = 1; f < 6; f++) {
        const fy = y + 3 + ((cellH - 6) * f) / 6;
        sCtx.beginPath();
        sCtx.moveTo(x + 4, fy);
        sCtx.lineTo(x + cellW - 4, fy);
        sCtx.stroke();
      }

      // Main silver busbars
      sCtx.fillStyle = 'rgba(215, 228, 245, 0.65)';
      sCtx.fillRect(x + cellW * 0.28, y + 3, 2, cellH - 6);
      sCtx.fillRect(x + cellW * 0.72, y + 3, 2, cellH - 6);

      // Copper interconnect tabs
      sCtx.fillStyle = '#C97B3A';
      sCtx.fillRect(x + cellW * 0.25, y + 1, 7, 3);
      sCtx.fillRect(x + cellW * 0.69, y + 1, 7, 3);
    }
  }
  const solarColor = new THREE.CanvasTexture(solarCanvas);
  solarColor.colorSpace = THREE.SRGBColorSpace;
  solarColor.anisotropy = aniso;
  solarColor.wrapS = THREE.RepeatWrapping;
  solarColor.wrapT = THREE.RepeatWrapping;

  // 2. Gold Kapton MLI Crinkled Foil (Color + Bump)
  const mliCanvas = document.createElement('canvas');
  mliCanvas.width = 256;
  mliCanvas.height = 256;
  const mCtx = mliCanvas.getContext('2d')!;
  mCtx.fillStyle = '#C88D22';
  mCtx.fillRect(0, 0, 256, 256);

  const mliBumpCanvas = document.createElement('canvas');
  mliBumpCanvas.width = 256;
  mliBumpCanvas.height = 256;
  const mbCtx = mliBumpCanvas.getContext('2d')!;
  mbCtx.fillStyle = '#808080';
  mbCtx.fillRect(0, 0, 256, 256);

  // Deterministic pseudo-random facets for realistic Kapton crinkle
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  for (let i = 0; i < 420; i++) {
    const px = rand() * 256;
    const py = rand() * 256;
    const w = 10 + rand() * 28;
    const h = 8 + rand() * 24;
    const angle = rand() * Math.PI;
    const shade = rand();

    mCtx.save();
    mCtx.translate(px, py);
    mCtx.rotate(angle);
    mCtx.fillStyle =
      shade > 0.55
        ? 'rgba(245, 198, 72, 0.35)'
        : shade > 0.25
        ? 'rgba(184, 118, 18, 0.32)'
        : 'rgba(120, 68, 8, 0.28)';
    mCtx.beginPath();
    mCtx.moveTo(-w / 2, 0);
    mCtx.lineTo(0, -h / 2);
    mCtx.lineTo(w / 2, 0);
    mCtx.lineTo(0, h / 2);
    mCtx.closePath();
    mCtx.fill();
    mCtx.restore();

    mbCtx.save();
    mbCtx.translate(px, py);
    mbCtx.rotate(angle);
    const bVal = Math.floor(70 + shade * 160);
    mbCtx.fillStyle = `rgba(${bVal},${bVal},${bVal},0.45)`;
    mbCtx.beginPath();
    mbCtx.moveTo(-w / 2, 0);
    mbCtx.lineTo(0, -h / 2);
    mbCtx.lineTo(w / 2, 0);
    mbCtx.lineTo(0, h / 2);
    mbCtx.closePath();
    mbCtx.fill();
    mbCtx.restore();
  }
  // Kapton tape seam lines
  mCtx.strokeStyle = 'rgba(255, 215, 100, 0.35)';
  mCtx.lineWidth = 2;
  mCtx.strokeRect(4, 4, 248, 248);

  const mliColor = new THREE.CanvasTexture(mliCanvas);
  mliColor.colorSpace = THREE.SRGBColorSpace;
  mliColor.anisotropy = aniso;
  mliColor.wrapS = THREE.RepeatWrapping;
  mliColor.wrapT = THREE.RepeatWrapping;

  const mliBump = new THREE.CanvasTexture(mliBumpCanvas);
  mliBump.anisotropy = aniso;
  mliBump.wrapS = THREE.RepeatWrapping;
  mliBump.wrapT = THREE.RepeatWrapping;

  // 3. Machined Aluminum / Panel Seams
  const aluCanvas = document.createElement('canvas');
  aluCanvas.width = 256;
  aluCanvas.height = 256;
  const aCtx = aluCanvas.getContext('2d')!;
  aCtx.fillStyle = '#9BA6B5';
  aCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    aCtx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
    aCtx.fillRect(0, y, 256, 1);
  }
  aCtx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
  aCtx.lineWidth = 2;
  aCtx.strokeRect(8, 8, 240, 240);
  aCtx.beginPath();
  aCtx.moveTo(128, 8);
  aCtx.lineTo(128, 248);
  aCtx.stroke();
  // Rivets
  aCtx.fillStyle = 'rgba(51, 65, 85, 0.7)';
  for (let i = 20; i <= 236; i += 36) {
    aCtx.beginPath();
    aCtx.arc(i, 16, 2, 0, Math.PI * 2);
    aCtx.arc(i, 240, 2, 0, Math.PI * 2);
    aCtx.fill();
  }
  const aluminumColor = new THREE.CanvasTexture(aluCanvas);
  aluminumColor.colorSpace = THREE.SRGBColorSpace;
  aluminumColor.anisotropy = aniso;

  // 4. Carbon Fiber Weave
  const carbCanvas = document.createElement('canvas');
  carbCanvas.width = 128;
  carbCanvas.height = 128;
  const cCtx = carbCanvas.getContext('2d')!;
  cCtx.fillStyle = '#1B222D';
  cCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const alt = ((x + y) / 8) % 2 === 0;
      cCtx.fillStyle = alt ? '#252E3C' : '#141922';
      cCtx.fillRect(x, y, 8, 4);
      cCtx.fillStyle = alt ? '#181F2A' : '#293342';
      cCtx.fillRect(x, y + 4, 8, 4);
    }
  }
  const carbonColor = new THREE.CanvasTexture(carbCanvas);
  carbonColor.colorSpace = THREE.SRGBColorSpace;
  carbonColor.anisotropy = aniso;
  carbonColor.wrapS = THREE.RepeatWrapping;
  carbonColor.wrapT = THREE.RepeatWrapping;
  carbonColor.repeat.set(3, 3);

  // 5. Cleanroom Floor Calibration Grid
  const floorCanvas = document.createElement('canvas');
  floorCanvas.width = 1024;
  floorCanvas.height = 1024;
  const fCtx = floorCanvas.getContext('2d')!;
  fCtx.fillStyle = '#090D15';
  fCtx.fillRect(0, 0, 1024, 1024);

  // Subtle floor grid
  fCtx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  fCtx.lineWidth = 1;
  const step = 64;
  for (let i = 0; i <= 1024; i += step) {
    fCtx.beginPath();
    fCtx.moveTo(i, 0);
    fCtx.lineTo(i, 1024);
    fCtx.stroke();
    fCtx.beginPath();
    fCtx.moveTo(0, i);
    fCtx.lineTo(1024, i);
    fCtx.stroke();
  }
  // Concentric cleanroom calibration circles
  const cx = 512;
  const cy = 512;
  [120, 210, 320, 440].forEach((r, idx) => {
    fCtx.strokeStyle =
      idx === 1 ? 'rgba(6, 182, 212, 0.22)' : 'rgba(148, 163, 184, 0.12)';
    fCtx.lineWidth = idx === 1 ? 2 : 1;
    fCtx.beginPath();
    fCtx.arc(cx, cy, r, 0, Math.PI * 2);
    fCtx.stroke();
  });
  // Degree ticks
  fCtx.strokeStyle = 'rgba(6, 182, 212, 0.28)';
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const inner = deg % 45 === 0 ? 196 : 204;
    fCtx.beginPath();
    fCtx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
    fCtx.lineTo(cx + Math.cos(rad) * 214, cy + Math.sin(rad) * 214);
    fCtx.stroke();
  }

  const cleanroomFloor = new THREE.CanvasTexture(floorCanvas);
  cleanroomFloor.colorSpace = THREE.SRGBColorSpace;
  cleanroomFloor.anisotropy = aniso;

  // 6. Soft Contact Shadow
  const shadCanvas = document.createElement('canvas');
  shadCanvas.width = 256;
  shadCanvas.height = 256;
  const shCtx = shadCanvas.getContext('2d')!;
  const shGrad = shCtx.createRadialGradient(128, 128, 16, 128, 128, 124);
  shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  shGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.28)');
  shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadCanvas);

  // 7. Procedural Earth Albedo for Orbit Mode
  const earthCanvas = document.createElement('canvas');
  earthCanvas.width = 1024;
  earthCanvas.height = 512;
  const eCtx = earthCanvas.getContext('2d')!;
  const oceanGrad = eCtx.createLinearGradient(0, 0, 0, 512);
  oceanGrad.addColorStop(0, '#0A2547');
  oceanGrad.addColorStop(0.5, '#0E3B6E');
  oceanGrad.addColorStop(1, '#081E3B');
  eCtx.fillStyle = oceanGrad;
  eCtx.fillRect(0, 0, 1024, 512);

  // Stylized landmass shapes
  eCtx.fillStyle = '#1E4638';
  for (let i = 0; i < 48; i++) {
    const lx = rand() * 1024;
    const ly = 70 + rand() * 372;
    const rx = 25 + rand() * 80;
    const ry = 14 + rand() * 42;
    eCtx.beginPath();
    eCtx.ellipse(lx, ly, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    eCtx.fill();
  }
  // Swirling cloud streaks
  eCtx.fillStyle = 'rgba(235, 245, 255, 0.28)';
  for (let i = 0; i < 65; i++) {
    const cxCloud = rand() * 1024;
    const cyCloud = rand() * 512;
    eCtx.beginPath();
    eCtx.ellipse(
      cxCloud,
      cyCloud,
      40 + rand() * 120,
      5 + rand() * 16,
      (rand() - 0.5) * 0.4,
      0,
      Math.PI * 2
    );
    eCtx.fill();
  }
  const earthAlbedo = new THREE.CanvasTexture(earthCanvas);
  earthAlbedo.colorSpace = THREE.SRGBColorSpace;
  earthAlbedo.anisotropy = aniso;

  return {
    solarColor,
    mliColor,
    mliBump,
    aluminumColor,
    carbonColor,
    cleanroomFloor,
    contactShadow,
    earthAlbedo,
    dispose: () => {
      solarColor.dispose();
      mliColor.dispose();
      mliBump.dispose();
      aluminumColor.dispose();
      carbonColor.dispose();
      cleanroomFloor.dispose();
      contactShadow.dispose();
      earthAlbedo.dispose();
    },
  };
}
