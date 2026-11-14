import * as THREE from 'three';
import { SurfaceFinish } from '../types/satellite';
import { MaterialLibrary } from './materials';

export interface BuiltPartResult {
  group: THREE.Group;
  updateDeploy?: (progress: number) => void;
  updateOrbitFx?: (time: number, inOrbit: boolean) => void;
}

function addShadowFlags(root: THREE.Object3D) {
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      const mat = m.material as THREE.Material;
      if (!mat.transparent) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    }
  });
}

function makeFlange(
  radius: number,
  height: number,
  mat: THREE.Material,
  boltMat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.06, height, 16),
    mat
  );
  base.position.y = height / 2;
  g.add(base);

  const boltGeo = new THREE.CylinderGeometry(0.016, 0.016, height * 1.15, 6);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(
      Math.cos(angle) * radius * 0.78,
      height / 2,
      Math.sin(angle) * radius * 0.78
    );
    g.add(bolt);
  }
  return g;
}

export function buildPartMesh(
  partId: string,
  finish: SurfaceFinish,
  mats: MaterialLibrary,
  isGhost = false
): BuiltPartResult {
  const primaryMat = isGhost ? mats.ghostValid : mats.finishes[finish];
  const darkMat = isGhost ? mats.ghostValid : mats.darkAnodized;
  const steelMat = isGhost ? mats.ghostValid : mats.brushedSteel;
  const copperMat = isGhost ? mats.ghostValid : mats.copperAccent;
  const solarMat = isGhost ? mats.ghostValid : mats.solarCell;
  const glassMat = isGhost ? mats.ghostValid : mats.opticalGlass;
  const whiteMat = isGhost ? mats.ghostValid : mats.whiteReflector;
  const ceramicMat = isGhost ? mats.ghostValid : mats.thrusterCeramic;
  const nozzleMat = isGhost ? mats.ghostValid : mats.nozzleCarbon;
  const goldMat = isGhost ? mats.ghostValid : mats.finishes[SurfaceFinish.GOLD_MLI];

  const group = new THREE.Group();
  let updateDeploy: ((p: number) => void) | undefined;
  let updateOrbitFx: ((t: number, inOrbit: boolean) => void) | undefined;

  switch (partId) {
    // =========================================================================
    // 01. BUS CHASSIS
    // =========================================================================
    case 'bus_cubesat_6u': {
      // Open-truss 6U frame so user can see internal avionics/batteries mounted inside
      const w = 1.16;
      const h = 1.56;
      const d = 1.16;
      const railT = 0.09;

      // 4 vertical corner rails
      const railGeo = new THREE.BoxGeometry(railT, h, railT);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const rail = new THREE.Mesh(railGeo, primaryMat);
          rail.position.set(sx * (w / 2 - railT / 2), 0, sz * (d / 2 - railT / 2));
          group.add(rail);
        }
      }

      // Top & bottom structural decks
      const deckGeo = new THREE.BoxGeometry(w, 0.08, d);
      const topDeck = new THREE.Mesh(deckGeo, darkMat);
      topDeck.position.y = h / 2 - 0.04;
      group.add(topDeck);

      const botDeck = new THREE.Mesh(deckGeo, darkMat);
      botDeck.position.y = -h / 2 + 0.04;
      group.add(botDeck);

      // Middle avionics shelf divider
      const midShelf = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.14, 0.04, d - 0.14),
        steelMat
      );
      group.add(midShelf);

      // Side cross-brace ribs (leaving windows open to see interior bays)
      const hBarGeo = new THREE.BoxGeometry(w - railT, 0.055, 0.055);
      for (const sy of [-0.42, 0.42]) {
        for (const sz of [-1, 1]) {
          const bar = new THREE.Mesh(hBarGeo, steelMat);
          bar.position.set(0, sy, sz * (d / 2 - 0.03));
          group.add(bar);
        }
      }
      const zBarGeo = new THREE.BoxGeometry(0.055, 0.055, d - railT);
      for (const sy of [-0.42, 0.42]) {
        for (const sx of [-1, 1]) {
          const bar = new THREE.Mesh(zBarGeo, steelMat);
          bar.position.set(sx * (w / 2 - 0.03), sy, 0);
          group.add(bar);
        }
      }

      // Gold MLI inner spine conduit
      const conduit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, h - 0.18, 12),
        copperMat
      );
      conduit.position.set(-0.36, 0, -0.36);
      group.add(conduit);

      // Axial interface rings
      const topRing = makeFlange(0.28, 0.04, steelMat, darkMat);
      topRing.position.y = h / 2;
      group.add(topRing);

      const botRing = makeFlange(0.32, 0.05, darkMat, steelMat);
      botRing.rotation.x = Math.PI;
      botRing.position.y = -h / 2;
      group.add(botRing);
      break;
    }

    case 'bus_hex_telecom': {
      const radius = 1.02;
      const height = 1.66;

      // Main hexagonal core
      const hexCore = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height - 0.14, 6),
        primaryMat
      );
      hexCore.rotation.y = Math.PI / 6;
      group.add(hexCore);

      // Top & bottom beveled structural collars
      const collarGeo = new THREE.CylinderGeometry(radius * 1.04, radius * 1.04, 0.1, 6);
      const topCollar = new THREE.Mesh(collarGeo, darkMat);
      topCollar.rotation.y = Math.PI / 6;
      topCollar.position.y = height / 2 - 0.04;
      group.add(topCollar);

      const botCollar = new THREE.Mesh(collarGeo, darkMat);
      botCollar.rotation.y = Math.PI / 6;
      botCollar.position.y = -height / 2 + 0.04;
      group.add(botCollar);

      // 6 vertical corner ribs
      const ribGeo = new THREE.BoxGeometry(0.08, height, 0.08);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const rib = new THREE.Mesh(ribGeo, steelMat);
        rib.position.set(Math.cos(a) * radius * 0.98, 0, Math.sin(a) * radius * 0.98);
        rib.rotation.y = -a;
        group.add(rib);
      }

      // Recessed view window frame on +Z face showing interior bay
      const bayWindow = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.95, 0.08),
        darkMat
      );
      bayWindow.position.set(0, 0, radius * 0.87);
      group.add(bayWindow);

      const topMount = makeFlange(0.42, 0.05, steelMat, darkMat);
      topMount.position.y = height / 2;
      group.add(topMount);

      const thrustAdapter = makeFlange(0.48, 0.06, darkMat, steelMat);
      thrustAdapter.rotation.x = Math.PI;
      thrustAdapter.position.y = -height / 2;
      group.add(thrustAdapter);
      break;
    }

    case 'bus_octa_probe': {
      const radius = 1.2;
      const height = 1.52;

      const octaCore = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height - 0.16, 8),
        primaryMat
      );
      octaCore.rotation.y = Math.PI / 8;
      group.add(octaCore);

      const deckPlateGeo = new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.1, 8);
      const topPlate = new THREE.Mesh(deckPlateGeo, darkMat);
      topPlate.rotation.y = Math.PI / 8;
      topPlate.position.y = height / 2 - 0.04;
      group.add(topPlate);

      const botPlate = new THREE.Mesh(deckPlateGeo, darkMat);
      botPlate.rotation.y = Math.PI / 8;
      botPlate.position.y = -height / 2 + 0.04;
      group.add(botPlate);

      // 8 structural corner struts + radial outrigger gussets
      const strutGeo = new THREE.BoxGeometry(0.09, height, 0.09);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const strut = new THREE.Mesh(strutGeo, steelMat);
        strut.position.set(Math.cos(a) * radius * 0.99, 0, Math.sin(a) * radius * 0.99);
        strut.rotation.y = -a;
        group.add(strut);
      }

      // Upper & lower equatorial stiffening bands
      const bandGeo = new THREE.TorusGeometry(radius * 0.98, 0.032, 8, 24);
      const upperBand = new THREE.Mesh(bandGeo, copperMat);
      upperBand.rotation.x = Math.PI / 2;
      upperBand.position.y = 0.42;
      group.add(upperBand);

      const lowerBand = new THREE.Mesh(bandGeo, copperMat);
      lowerBand.rotation.x = Math.PI / 2;
      lowerBand.position.y = -0.42;
      group.add(lowerBand);

      const topRing = makeFlange(0.55, 0.06, steelMat, darkMat);
      topRing.position.y = height / 2;
      group.add(topRing);

      const botRing = makeFlange(0.58, 0.08, darkMat, steelMat);
      botRing.rotation.x = Math.PI;
      botRing.position.y = -height / 2;
      group.add(botRing);
      break;
    }

    // =========================================================================
    // 02. POWER & SOLAR
    // =========================================================================
    case 'pwr_wing_deployable': {
      // Flange at y=0, extends along +Y
      const rootDrive = makeFlange(0.14, 0.08, darkMat, steelMat);
      group.add(rootDrive);

      const driveMotor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.18, 16),
        steelMat
      );
      driveMotor.position.y = 0.16;
      group.add(driveMotor);

      // Articulated yoke pivot
      const yokePivot = new THREE.Group();
      yokePivot.position.y = 0.26;
      group.add(yokePivot);

      const strutLeft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8),
        steelMat
      );
      strutLeft.position.set(0, 0.18, -0.15);
      strutLeft.rotation.x = -0.35;
      yokePivot.add(strutLeft);

      const strutRight = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, 0.44, 8),
        steelMat
      );
      strutRight.position.set(0, 0.18, 0.15);
      strutRight.rotation.x = 0.35;
      yokePivot.add(strutRight);

      // 3 hinged solar panels
      const segW = 0.84; // Z span
      const segL = 0.92; // Y extension
      const segT = 0.036;

      const p1Pivot = new THREE.Group();
      p1Pivot.position.y = 0.34;
      yokePivot.add(p1Pivot);

      const buildPanelSegment = () => {
        const seg = new THREE.Group();
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(segT, segL, segW),
          primaryMat
        );
        frame.position.y = segL / 2;
        seg.add(frame);

        // Solar cells on both +X and -X faces
        const cellGeo = new THREE.PlaneGeometry(segW - 0.07, segL - 0.07);
        const faceA = new THREE.Mesh(cellGeo, solarMat);
        faceA.rotation.y = Math.PI / 2;
        faceA.position.set(segT / 2 + 0.004, segL / 2, 0);
        seg.add(faceA);

        const faceB = new THREE.Mesh(cellGeo, primaryMat);
        faceB.rotation.y = -Math.PI / 2;
        faceB.position.set(-segT / 2 - 0.004, segL / 2, 0);
        seg.add(faceB);

        // Copper hinge knuckles
        const hingeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.09, 10);
        for (const sz of [-0.28, 0.28]) {
          const hMesh = new THREE.Mesh(hingeGeo, copperMat);
          hMesh.rotation.x = Math.PI / 2;
          hMesh.position.set(0, 0, sz);
          seg.add(hMesh);
        }
        return seg;
      };

      const seg1 = buildPanelSegment();
      p1Pivot.add(seg1);

      const p2Pivot = new THREE.Group();
      p2Pivot.position.y = segL + 0.03;
      p1Pivot.add(p2Pivot);
      const seg2 = buildPanelSegment();
      p2Pivot.add(seg2);

      const p3Pivot = new THREE.Group();
      p3Pivot.position.y = segL + 0.03;
      p2Pivot.add(p3Pivot);
      const seg3 = buildPanelSegment();
      p3Pivot.add(seg3);

      updateDeploy = (progress: number) => {
        const clamped = THREE.MathUtils.clamp(progress, 0, 1);
        // When folded (0), fold accordion-style against the bus; when 1, extend straight out!
        const fold = 1 - clamped;
        yokePivot.rotation.z = fold * 1.15;
        p1Pivot.rotation.z = fold * 0.38;
        p2Pivot.rotation.z = -fold * 3.05;
        p3Pivot.rotation.z = fold * 3.05;
      };
      break;
    }

    case 'pwr_body_solar': {
      const mount = new THREE.Mesh(
        new THREE.BoxGeometry(0.66, 0.04, 0.78),
        primaryMat
      );
      mount.position.y = 0.02;
      group.add(mount);

      const cellFace = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.02, 0.72),
        solarMat
      );
      cellFace.position.y = 0.045;
      group.add(cellFace);

      // Corner clamps
      const clampGeo = new THREE.BoxGeometry(0.08, 0.06, 0.08);
      for (const sx of [-0.3, 0.3]) {
        for (const sz of [-0.36, 0.36]) {
          const clamp = new THREE.Mesh(clampGeo, steelMat);
          clamp.position.set(sx, 0.03, sz);
          group.add(clamp);
        }
      }
      break;
    }

    case 'pwr_rtg_nuclear': {
      const flange = makeFlange(0.18, 0.07, darkMat, steelMat);
      group.add(flange);

      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.16, 16),
        steelMat
      );
      neck.position.y = 0.14;
      group.add(neck);

      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.72, 16),
        primaryMat
      );
      body.position.y = 0.56;
      group.add(body);

      // 8 radial cooling fins
      const finGeo = new THREE.BoxGeometry(0.025, 0.68, 0.15);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const fin = new THREE.Mesh(finGeo, darkMat);
        fin.position.set(Math.cos(a) * 0.23, 0.56, Math.sin(a) * 0.23);
        fin.rotation.y = -a + Math.PI / 2;
        group.add(fin);
      }

      const endCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.19, 0.1, 16),
        copperMat
      );
      endCap.position.y = 0.97;
      group.add(endCap);
      break;
    }

    case 'pwr_battery_pack': {
      // Compact high-density internal/external battery enclosure
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.24, 0.52),
        primaryMat
      );
      group.add(chassis);

      // 6 cylindrical cell housings protruding slightly from top plate
      const cellGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.26, 14);
      for (const sx of [-0.18, 0, 0.18]) {
        for (const sz of [-0.12, 0.12]) {
          const cell = new THREE.Mesh(cellGeo, darkMat);
          cell.position.set(sx, 0.01, sz);
          group.add(cell);
        }
      }

      const busBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.03, 0.08),
        copperMat
      );
      busBar.position.y = 0.145;
      group.add(busBar);
      break;
    }

    // =========================================================================
    // 03. PROPULSION
    // =========================================================================
    case 'prop_hall_ion': {
      const flange = makeFlange(0.28, 0.07, darkMat, steelMat);
      group.add(flange);

      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.27, 0.22, 24),
        primaryMat
      );
      housing.position.y = 0.17;
      group.add(housing);

      // Ceramic annular plasma discharge channel
      const channelPts = [
        new THREE.Vector2(0.11, 0.18),
        new THREE.Vector2(0.21, 0.18),
        new THREE.Vector2(0.22, 0.34),
        new THREE.Vector2(0.17, 0.34),
        new THREE.Vector2(0.17, 0.22),
        new THREE.Vector2(0.13, 0.22),
        new THREE.Vector2(0.13, 0.34),
        new THREE.Vector2(0.09, 0.34),
        new THREE.Vector2(0.09, 0.18),
      ];
      const channel = new THREE.Mesh(
        new THREE.LatheGeometry(channelPts, 28),
        ceramicMat
      );
      group.add(channel);

      // Glowing ionization ring inside channel
      const plasmaRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.15, 0.018, 10, 28),
        isGhost ? mats.ghostValid : mats.cyanEmissive
      );
      plasmaRing.rotation.x = Math.PI / 2;
      plasmaRing.position.y = 0.31;
      group.add(plasmaRing);

      // Cathode neutralizer side tube
      const cathode = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.22, 10),
        copperMat
      );
      cathode.position.set(0.26, 0.24, 0);
      cathode.rotation.z = -0.25;
      group.add(cathode);

      // Ion Plume Cone (visible only in Orbit Simulation!)
      const plume = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.42, 1.45, 24, 1, true),
        mats.ionPlume
      );
      plume.position.y = 1.05;
      plume.visible = false;
      group.add(plume);

      updateOrbitFx = (time: number, inOrbit: boolean) => {
        plume.visible = inOrbit && !isGhost;
        if (plume.visible) {
          const pulse = 0.92 + Math.sin(time * 9) * 0.08;
          plume.scale.set(pulse, 1 + Math.sin(time * 12) * 0.05, pulse);
        }
      };
      break;
    }

    case 'prop_biprop_main': {
      const flange = makeFlange(0.34, 0.08, darkMat, steelMat);
      group.add(flange);

      // Dual spherical propellant tanks flanking combustion chamber
      const tankGeo = new THREE.SphereGeometry(0.17, 18, 18);
      const tankA = new THREE.Mesh(tankGeo, primaryMat);
      tankA.position.set(-0.22, 0.18, 0);
      group.add(tankA);

      const tankB = new THREE.Mesh(tankGeo, primaryMat);
      tankB.position.set(0.22, 0.18, 0);
      group.add(tankB);

      const chamber = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.1, 0.22, 18),
        steelMat
      );
      chamber.position.y = 0.2;
      group.add(chamber);

      // Bell nozzle via LatheGeometry
      const bellPts = [
        new THREE.Vector2(0.07, 0.28),
        new THREE.Vector2(0.13, 0.36),
        new THREE.Vector2(0.22, 0.54),
        new THREE.Vector2(0.27, 0.74),
        new THREE.Vector2(0.255, 0.74),
        new THREE.Vector2(0.205, 0.54),
        new THREE.Vector2(0.115, 0.36),
        new THREE.Vector2(0.06, 0.28),
      ];
      const bell = new THREE.Mesh(
        new THREE.LatheGeometry(bellPts, 28),
        nozzleMat
      );
      group.add(bell);

      // Cooling ribs around bell
      for (const ry of [0.42, 0.54, 0.66]) {
        const r = ry === 0.42 ? 0.17 : ry === 0.54 ? 0.225 : 0.255;
        const rib = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.01, 8, 24),
          copperMat
        );
        rib.rotation.x = Math.PI / 2;
        rib.position.y = ry;
        group.add(rib);
      }

      const plume = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 1.1, 20, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      plume.rotation.x = Math.PI;
      plume.position.y = 1.26;
      plume.visible = false;
      group.add(plume);

      updateOrbitFx = (time: number, inOrbit: boolean) => {
        plume.visible = inOrbit && !isGhost;
        if (plume.visible) {
          const flicker = 0.85 + Math.sin(time * 18) * 0.15;
          plume.scale.set(1, flicker, 1);
        }
      };
      break;
    }

    case 'prop_rcs_quad': {
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.12, 12),
        primaryMat
      );
      base.position.y = 0.06;
      group.add(base);

      const pod = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 14, 14),
        darkMat
      );
      pod.position.y = 0.14;
      group.add(pod);

      const thrusterConeGeo = new THREE.ConeGeometry(0.038, 0.1, 12);
      const dirs: [number, number, number][] = [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 0, 1],
        [0, 0, -1],
      ];
      dirs.forEach(([dx, , dz]) => {
        const cone = new THREE.Mesh(thrusterConeGeo, steelMat);
        cone.position.set(dx * 0.12, 0.14, dz * 0.12);
        cone.lookAt(dx * 2, 0.14, dz * 2);
        cone.rotateX(-Math.PI / 2);
        group.add(cone);
      });
      break;
    }

    // =========================================================================
    // 04. AVIONICS & ADCS
    // =========================================================================
    case 'av_flight_computer': {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.2, 0.52),
        primaryMat
      );
      group.add(box);

      const heatPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.04, 0.46),
        darkMat
      );
      heatPlate.position.y = 0.11;
      group.add(heatPlate);

      // Harness connectors & status LED strip
      const connGeo = new THREE.BoxGeometry(0.08, 0.08, 0.06);
      for (const sx of [-0.16, 0, 0.16]) {
        const conn = new THREE.Mesh(connGeo, copperMat);
        conn.position.set(sx, 0, 0.28);
        group.add(conn);
      }

      const indicator = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.025, 0.02),
        isGhost ? mats.ghostValid : mats.cyanEmissive
      );
      indicator.position.set(0, 0.06, 0.265);
      group.add(indicator);
      break;
    }

    case 'av_reaction_wheels': {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.22, 0.48),
        darkMat
      );
      group.add(frame);

      // 3 orthogonal flywheel housings
      const wheelGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.07, 18);
      const wheelX = new THREE.Mesh(wheelGeo, primaryMat);
      wheelX.rotation.z = Math.PI / 2;
      wheelX.position.set(0.16, 0.02, 0);
      group.add(wheelX);

      const wheelY = new THREE.Mesh(wheelGeo, steelMat);
      wheelY.position.set(0, 0.11, 0);
      group.add(wheelY);

      const wheelZ = new THREE.Mesh(wheelGeo, primaryMat);
      wheelZ.rotation.x = Math.PI / 2;
      wheelZ.position.set(0, 0.02, 0.16);
      group.add(wheelZ);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.1, 12),
        copperMat
      );
      hub.position.y = 0.12;
      group.add(hub);
      break;
    }

    case 'av_star_tracker': {
      const mount = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.06, 0.26),
        darkMat
      );
      mount.position.y = 0.03;
      group.add(mount);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.12, 0.18),
        primaryMat
      );
      body.position.y = 0.11;
      group.add(body);

      // Dual angled optical baffles
      const bafflePts = [
        new THREE.Vector2(0.045, 0),
        new THREE.Vector2(0.08, 0.2),
        new THREE.Vector2(0.07, 0.2),
        new THREE.Vector2(0.038, 0.02),
      ];
      const baffleGeo = new THREE.LatheGeometry(bafflePts, 16);

      for (const [sx, rz] of [
        [-0.07, 0.36],
        [0.07, -0.36],
      ] as [number, number][]) {
        const baffleGrp = new THREE.Group();
        baffleGrp.position.set(sx, 0.14, 0);
        baffleGrp.rotation.z = rz;
        baffleGrp.add(new THREE.Mesh(baffleGeo, darkMat));

        const lens = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 12, 12),
          glassMat
        );
        lens.position.y = 0.05;
        baffleGrp.add(lens);
        group.add(baffleGrp);
      }
      break;
    }

    // =========================================================================
    // 05. COMMUNICATIONS
    // =========================================================================
    case 'comm_hga_dish': {
      const flange = makeFlange(0.2, 0.06, darkMat, steelMat);
      group.add(flange);

      // 2-axis gimbal yoke
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 0.22, 14),
        steelMat
      );
      pedestal.position.y = 0.16;
      group.add(pedestal);

      const dishGroup = new THREE.Group();
      dishGroup.position.y = 0.28;
      group.add(dishGroup);

      // Parabolic dish via LatheGeometry
      const dishPts: THREE.Vector2[] = [];
      for (let i = 0; i <= 10; i++) {
        const r = (i / 10) * 0.56;
        const y = r * r * 0.65 + 0.04;
        dishPts.push(new THREE.Vector2(r, y));
      }
      dishPts.push(new THREE.Vector2(0.56, 0.56 * 0.56 * 0.65 + 0.015));
      for (let i = 10; i >= 0; i--) {
        const r = (i / 10) * 0.56;
        const y = r * r * 0.65 + 0.015;
        dishPts.push(new THREE.Vector2(r, y));
      }

      const reflector = new THREE.Mesh(
        new THREE.LatheGeometry(dishPts, 32),
        whiteMat
      );
      dishGroup.add(reflector);

      // Rear structural ring
      const backRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.02, 8, 24),
        primaryMat
      );
      backRing.rotation.x = Math.PI / 2;
      backRing.position.y = 0.04;
      dishGroup.add(backRing);

      // Tripod feed-horn struts
      const strutGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.44, 8);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const strut = new THREE.Mesh(strutGeo, darkMat);
        strut.position.set(Math.cos(a) * 0.2, 0.28, Math.sin(a) * 0.2);
        strut.lookAt(0, 0.48, 0);
        strut.rotateX(Math.PI / 2);
        dishGroup.add(strut);
      }

      const feedHorn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.03, 0.11, 14),
        copperMat
      );
      feedHorn.position.y = 0.47;
      dishGroup.add(feedHorn);
      break;
    }

    case 'comm_helical_uhf': {
      const flange = makeFlange(0.13, 0.05, darkMat, steelMat);
      group.add(flange);

      const groundPlane = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.025, 18),
        primaryMat
      );
      groundPlane.position.y = 0.06;
      group.add(groundPlane);

      const coreMast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.032, 0.55, 12),
        darkMat
      );
      coreMast.position.y = 0.34;
      group.add(coreMast);

      // Helical coil via TubeGeometry
      const helixPts: THREE.Vector3[] = [];
      const turns = 4.5;
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ang = t * turns * Math.PI * 2;
        helixPts.push(
          new THREE.Vector3(
            Math.cos(ang) * 0.075,
            0.09 + t * 0.46,
            Math.sin(ang) * 0.075
          )
        );
      }
      const helixCurve = new THREE.CatmullRomCurve3(helixPts);
      const helixMesh = new THREE.Mesh(
        new THREE.TubeGeometry(helixCurve, 64, 0.011, 8, false),
        copperMat
      );
      group.add(helixMesh);

      const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 10, 10),
        goldMat
      );
      tip.position.y = 0.62;
      group.add(tip);
      break;
    }

    case 'comm_laser_link': {
      const base = makeFlange(0.16, 0.05, darkMat, steelMat);
      group.add(base);

      const yoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.2, 0.16),
        primaryMat
      );
      yoke.position.y = 0.15;
      group.add(yoke);

      const turret = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 18, 18),
        steelMat
      );
      turret.position.y = 0.28;
      group.add(turret);

      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.085, 0.22, 18),
        darkMat
      );
      barrel.rotation.z = -0.35;
      barrel.position.set(0.08, 0.34, 0);
      group.add(barrel);

      const emitterLens = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.02, 18),
        isGhost ? mats.ghostValid : mats.cyanEmissive
      );
      emitterLens.rotation.z = -0.35;
      emitterLens.position.set(0.12, 0.44, 0);
      group.add(emitterLens);
      break;
    }

    // =========================================================================
    // 06. SCIENCE PAYLOADS
    // =========================================================================
    case 'pay_multispectral': {
      const flange = makeFlange(0.24, 0.06, darkMat, steelMat);
      group.add(flange);

      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.38, 24),
        primaryMat
      );
      housing.position.y = 0.25;
      group.add(housing);

      // Angled sunshade hood
      const hoodPts = [
        new THREE.Vector2(0.19, 0.42),
        new THREE.Vector2(0.25, 0.68),
        new THREE.Vector2(0.23, 0.68),
        new THREE.Vector2(0.17, 0.42),
      ];
      const hood = new THREE.Mesh(
        new THREE.LatheGeometry(hoodPts, 24),
        darkMat
      );
      group.add(hood);

      // Recessed optical primary mirror / sapphire lens
      const mirror = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24),
        glassMat
      );
      mirror.position.y = 0.44;
      group.add(mirror);

      const secondarySpider = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.06, 12),
        steelMat
      );
      secondarySpider.position.y = 0.56;
      group.add(secondarySpider);

      // Thermal radiator collar
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.235, 0.018, 8, 24),
        goldMat
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.28;
      group.add(collar);
      break;
    }

    case 'pay_sar_radar': {
      const mount = makeFlange(0.15, 0.06, darkMat, steelMat);
      group.add(mount);

      const hingeArm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.2, 12),
        steelMat
      );
      hingeArm.position.y = 0.15;
      group.add(hingeArm);

      const plankPivot = new THREE.Group();
      plankPivot.position.y = 0.24;
      group.add(plankPivot);

      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.55, 0.055, 0.54),
        primaryMat
      );
      plank.position.y = 0.04;
      plankPivot.add(plank);

      // Phased-array waveguide strips
      const stripGeo = new THREE.BoxGeometry(1.42, 0.02, 0.06);
      for (const sz of [-0.18, -0.06, 0.06, 0.18]) {
        const strip = new THREE.Mesh(stripGeo, copperMat);
        strip.position.set(0, 0.075, sz);
        plankPivot.add(strip);
      }

      updateDeploy = (progress: number) => {
        const clamped = THREE.MathUtils.clamp(progress, 0, 1);
        plankPivot.rotation.x = (1 - clamped) * 1.35;
      };
      break;
    }

    case 'pay_magnetometer': {
      const canister = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.13, 0.22, 16),
        darkMat
      );
      canister.position.y = 0.11;
      group.add(canister);

      const boomGroup = new THREE.Group();
      boomGroup.position.y = 0.2;
      group.add(boomGroup);

      // 3 telescoping lattice mast sections
      const mast1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.048, 0.6, 8),
        primaryMat
      );
      mast1.position.y = 0.3;
      boomGroup.add(mast1);

      const mast2Group = new THREE.Group();
      mast2Group.position.y = 0.55;
      boomGroup.add(mast2Group);

      const mast2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.038, 0.6, 8),
        steelMat
      );
      mast2.position.y = 0.3;
      mast2Group.add(mast2);

      // Tri-axial fluxgate sensor head
      const sensor = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.11, 0.11),
        goldMat
      );
      sensor.position.y = 0.64;
      mast2Group.add(sensor);

      const probeTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 10, 10),
        isGhost ? mats.ghostValid : mats.amberEmissive
      );
      probeTip.position.y = 0.72;
      mast2Group.add(probeTip);

      updateDeploy = (progress: number) => {
        const clamped = THREE.MathUtils.clamp(progress, 0, 1);
        boomGroup.scale.y = 0.22 + clamped * 0.78;
        mast2Group.position.y = 0.15 + clamped * 0.45;
      };
      break;
    }

    case 'pay_spectrometer': {
      const flange = makeFlange(0.16, 0.05, darkMat, steelMat);
      group.add(flange);

      const analyzer = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.22, 0.28),
        primaryMat
      );
      analyzer.position.y = 0.16;
      group.add(analyzer);

      const collimator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.18, 16),
        steelMat
      );
      collimator.position.y = 0.34;
      group.add(collimator);

      const ionSlit = new THREE.Mesh(
        new THREE.TorusGeometry(0.085, 0.015, 8, 18),
        copperMat
      );
      ionSlit.rotation.x = Math.PI / 2;
      ionSlit.position.y = 0.43;
      group.add(ionSlit);
      break;
    }

    // =========================================================================
    // 07. THERMAL & SHIELDING
    // =========================================================================
    case 'thm_radiator_vane': {
      const base = makeFlange(0.12, 0.05, darkMat, steelMat);
      group.add(base);

      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.18, 10),
        copperMat
      );
      pipe.position.y = 0.13;
      group.add(pipe);

      const vanePivot = new THREE.Group();
      vanePivot.position.y = 0.22;
      group.add(vanePivot);

      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.92, 0.62),
        primaryMat
      );
      panel.position.y = 0.46;
      vanePivot.add(panel);

      // Heat-pipe ribs along panel face
      const tubeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.86, 8);
      for (const sz of [-0.2, 0, 0.2]) {
        const tube = new THREE.Mesh(tubeGeo, steelMat);
        tube.position.set(0.022, 0.46, sz);
        vanePivot.add(tube);
      }

      updateDeploy = (progress: number) => {
        const clamped = THREE.MathUtils.clamp(progress, 0, 1);
        vanePivot.rotation.z = (1 - clamped) * 1.45;
      };
      break;
    }

    case 'thm_mli_blanket': {
      const shroud = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.09, 0.68),
        primaryMat
      );
      shroud.position.y = 0.045;
      group.add(shroud);

      const bevelCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.38, 0.08, 4),
        goldMat
      );
      bevelCap.rotation.y = Math.PI / 4;
      bevelCap.position.y = 0.13;
      group.add(bevelCap);
      break;
    }

    case 'thm_whipple_shield': {
      // Standoff struts + spaced hypervelocity bumper plate
      const strutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8);
      for (const sx of [-0.26, 0.26]) {
        for (const sz of [-0.26, 0.26]) {
          const st = new THREE.Mesh(strutGeo, steelMat);
          st.position.set(sx, 0.08, sz);
          group.add(st);
        }
      }

      const innerKevlar = new THREE.Mesh(
        new THREE.BoxGeometry(0.64, 0.025, 0.64),
        darkMat
      );
      innerKevlar.position.y = 0.09;
      group.add(innerKevlar);

      const outerBumper = new THREE.Mesh(
        new THREE.BoxGeometry(0.72, 0.035, 0.72),
        primaryMat
      );
      outerBumper.position.y = 0.17;
      group.add(outerBumper);
      break;
    }

    default: {
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        primaryMat
      );
      fallback.position.y = 0.15;
      group.add(fallback);
    }
  }

  if (!isGhost) {
    addShadowFlags(group);
  }
  return { group, updateDeploy, updateOrbitFx };
}

export function buildAssemblyPedestal(mats: MaterialLibrary): THREE.Group {
  const pedestal = new THREE.Group();

  // Heavy rotary base ring seated flush on y=0
  const baseRing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.45, 1.65, 0.18, 36),
    mats.darkAnodized
  );
  baseRing.position.y = 0.09;
  baseRing.receiveShadow = true;
  pedestal.add(baseRing);

  // Calibrated turntable platter
  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.18, 1.25, 0.12, 32),
    mats.brushedSteel
  );
  platter.position.y = 0.24;
  platter.receiveShadow = true;
  pedestal.add(platter);

  // Glowing cyan precision datum ring
  const datumRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.018, 10, 48),
    mats.cyanEmissive
  );
  datumRing.rotation.x = Math.PI / 2;
  datumRing.position.y = 0.305;
  pedestal.add(datumRing);

  // 4 hydraulic clamp arms supporting the spacecraft at y ~ 1.05
  const armGeo = new THREE.BoxGeometry(0.11, 0.75, 0.16);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arm = new THREE.Mesh(armGeo, mats.darkAnodized);
    arm.position.set(Math.cos(a) * 0.78, 0.66, Math.sin(a) * 0.78);
    arm.rotation.y = -a;
    arm.rotation.z = 0.22;
    arm.castShadow = true;
    arm.receiveShadow = true;
    pedestal.add(arm);

    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.06, 0.18),
      mats.copperAccent
    );
    pad.position.set(Math.cos(a) * 0.66, 1.01, Math.sin(a) * 0.66);
    pad.rotation.y = -a;
    pedestal.add(pad);
  }

  return pedestal;
}
