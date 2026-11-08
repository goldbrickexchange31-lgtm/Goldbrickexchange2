import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * GOLDBRICK EXCHANGE — SLICK QUANTUM GYROSCOPE & KINETIC WAVEFIELD
 * 
 * An ultra-modern, slick 3D background designed for speed and luxury aesthetics:
 * - Concentric Gyroscopic Gold Orbital Rings (precision quantum asset vault rings)
 * - Kinetic 3D Wavefield Grid (undulating algorithmic market flow)
 * - Refined Octahedral Geometric Nodes & Diamond Crystal Prisms
 * - 450+ Floating Luminous Golden Embers
 * - Ultra-optimized GPU footprint: locked 60 FPS, pixel ratio clamped at 1.5, smooth scroll damping
 */
export const Cinematic3DBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene & Fog Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05080D, 0.026);

    let width = window.innerWidth;
    let height = window.innerHeight;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
    const getCamZ = (w: number, h: number) => (w < 768 || w < h ? 17 : 13.5);
    camera.position.set(0, 0, getCamZ(width, height));

    // 3. Renderer (High performance, capped pixel ratio for buttery smooth 60fps)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x05080D, 1);
    if ('outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    // 4. Lighting Rig (Golden Key + Champagne Rim + Soft Specular Fill)
    const ambientLight = new THREE.AmbientLight(0x2d1e07, 1.4);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xF5A900, 0x05080D, 1.2);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xF5A900, 3.0);
    keyLight.position.set(6, 10, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xD5B779, 2.2);
    rimLight.position.set(-8, -6, 6);
    scene.add(rimLight);

    const specLight = new THREE.DirectionalLight(0xFFFFFF, 1.5);
    specLight.position.set(0, 8, 12);
    scene.add(specLight);

    // Dynamic point lights for moving golden glints
    const glint1 = new THREE.PointLight(0xF5A900, 2.0, 25);
    scene.add(glint1);
    const glint2 = new THREE.PointLight(0xD5B779, 1.8, 22);
    scene.add(glint2);

    // 5. Sleek Luxury Materials
    const goldRingMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xF5A900),
      emissive: new THREE.Color(0x422603),
      emissiveIntensity: 0.55,
      metalness: 0.90,
      roughness: 0.16,
      clearcoat: 0.5,
      clearcoatRoughness: 0.12,
      reflectivity: 0.95,
    });

    const champagneRingMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xD5B779),
      emissive: new THREE.Color(0x321f04),
      emissiveIntensity: 0.45,
      metalness: 0.86,
      roughness: 0.20,
      clearcoat: 0.4,
      reflectivity: 0.90,
    });

    const crystalMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xFBBF24),
      emissive: new THREE.Color(0x382003),
      emissiveIntensity: 0.5,
      metalness: 0.82,
      roughness: 0.18,
      clearcoat: 0.6,
      reflectivity: 0.95,
    });

    // 6. Responsive Visible Bounds
    const getVisibleSpan = (cam: THREE.PerspectiveCamera, zPos = 0) => {
      const dist = cam.position.z - zPos;
      const vHeight = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist;
      const vWidth = vHeight * cam.aspect;
      return { vWidth, vHeight };
    };

    // 7. Kinetic Gyroscopic Orbital Rings & Geometric Prisms
    // Reusable geometries
    const outerRingGeo = new THREE.TorusGeometry(1.6, 0.045, 16, 64);
    const midRingGeo = new THREE.TorusGeometry(1.15, 0.038, 16, 56);
    const innerRingGeo = new THREE.TorusGeometry(0.75, 0.032, 16, 48);
    const octaGeo = new THREE.OctahedronGeometry(0.65, 0);
    const icosaGeo = new THREE.IcosahedronGeometry(0.48, 0);

    interface GyroGroup {
      group: THREE.Group;
      outer: THREE.Mesh;
      mid: THREE.Mesh;
      inner: THREE.Mesh;
      core?: THREE.Mesh;
      relX: number;
      baseY: number;
      baseZ: number;
      rotSpeedX: number;
      rotSpeedY: number;
      rotSpeedZ: number;
      floatSpeed: number;
      floatAmp: number;
      phase: number;
    }

    interface FloatingNode {
      mesh: THREE.Mesh;
      relX: number;
      baseY: number;
      baseZ: number;
      rotSpeedX: number;
      rotSpeedY: number;
      floatSpeed: number;
      floatAmp: number;
      phase: number;
    }

    const gyroGroups: GyroGroup[] = [];
    const floatingNodes: FloatingNode[] = [];

    // Gyroscope configurations across sections
    const gyroConfigs = [
      // Hero Section (Sleek upper orbital anchors)
      { relX: -0.68, baseY: 4.2, baseZ: 1.0, scale: 0.95, speed: 0.7 },
      { relX: 0.70, baseY: 2.8, baseZ: 0.4, scale: 0.85, speed: 0.8 },

      // Metrics / Trading Bots Section
      { relX: -0.72, baseY: -5.0, baseZ: 0.8, scale: 1.05, speed: 0.65 },
      { relX: 0.68, baseY: -9.5, baseZ: 0.5, scale: 0.9, speed: 0.75 },

      // Vaults & Calculator Section
      { relX: -0.66, baseY: -15.5, baseZ: 0.6, scale: 1.0, speed: 0.7 },
      { relX: 0.72, baseY: -21.0, baseZ: 0.8, scale: 0.95, speed: 0.6 },

      // Security & Activity Section
      { relX: -0.70, baseY: -26.5, baseZ: 0.7, scale: 1.0, speed: 0.75 },

      // FAQ & Footer Section
      { relX: 0.68, baseY: -33.0, baseZ: 0.5, scale: 0.9, speed: 0.65 },
    ];

    const initialSpan = getVisibleSpan(camera, 0);

    gyroConfigs.forEach((cfg, idx) => {
      const group = new THREE.Group();
      const outer = new THREE.Mesh(outerRingGeo, goldRingMaterial);
      const mid = new THREE.Mesh(midRingGeo, champagneRingMaterial);
      const inner = new THREE.Mesh(innerRingGeo, goldRingMaterial);
      const core = new THREE.Mesh(octaGeo, crystalMaterial);
      core.scale.setScalar(0.42);

      // Tilt nested rings at luxury gyroscopic angles
      mid.rotation.x = Math.PI / 4;
      mid.rotation.y = Math.PI / 6;
      inner.rotation.x = -Math.PI / 3;
      inner.rotation.z = Math.PI / 4;

      group.add(outer);
      group.add(mid);
      group.add(inner);
      group.add(core);

      const posX = cfg.relX * (initialSpan.vWidth / 2);
      group.position.set(posX, cfg.baseY, cfg.baseZ);
      group.scale.setScalar(cfg.scale);
      scene.add(group);

      gyroGroups.push({
        group,
        outer,
        mid,
        inner,
        core,
        relX: cfg.relX,
        baseY: cfg.baseY,
        baseZ: cfg.baseZ,
        rotSpeedX: 0.22 * cfg.speed * (idx % 2 === 0 ? 1 : -1),
        rotSpeedY: 0.28 * cfg.speed,
        rotSpeedZ: 0.16 * cfg.speed * (idx % 2 === 0 ? -1 : 1),
        floatSpeed: 0.6 + (idx % 3) * 0.18,
        floatAmp: 0.3 + (idx % 2) * 0.15,
        phase: idx * 1.5,
      });
    });

    // Sleek faceted crystal nodes scattered along the vertical journey
    const crystalConfigs = [
      { relX: 0.78, baseY: 6.0, baseZ: -2.0, geo: icosaGeo, scale: 0.7 },
      { relX: -0.82, baseY: 0.8, baseZ: -1.5, geo: octaGeo, scale: 0.75 },
      { relX: 0.76, baseY: -3.5, baseZ: -2.5, geo: icosaGeo, scale: 0.8 },
      { relX: -0.75, baseY: -11.0, baseZ: -1.8, geo: octaGeo, scale: 0.7 },
      { relX: 0.78, baseY: -17.0, baseZ: -2.2, geo: icosaGeo, scale: 0.75 },
      { relX: -0.74, baseY: -22.5, baseZ: -1.5, geo: octaGeo, scale: 0.8 },
      { relX: 0.75, baseY: -29.0, baseZ: -2.0, geo: icosaGeo, scale: 0.7 },
      { relX: -0.70, baseY: -35.5, baseZ: -1.2, geo: octaGeo, scale: 0.75 },
    ];

    crystalConfigs.forEach((cfg, idx) => {
      const mesh = new THREE.Mesh(cfg.geo, crystalMaterial);
      const posX = cfg.relX * (initialSpan.vWidth / 2);
      mesh.position.set(posX, cfg.baseY, cfg.baseZ);
      mesh.scale.setScalar(cfg.scale);
      scene.add(mesh);

      floatingNodes.push({
        mesh,
        relX: cfg.relX,
        baseY: cfg.baseY,
        baseZ: cfg.baseZ,
        rotSpeedX: 0.25 * (idx % 2 === 0 ? 1 : -1),
        rotSpeedY: 0.35,
        floatSpeed: 0.7 + idx * 0.12,
        floatAmp: 0.35,
        phase: idx * 1.8,
      });
    });

    // 8. Kinetic Golden Algorithmic Wavefield (Undulating 3D Financial Current)
    const waveCols = width < 768 ? 26 : 42;
    const waveRows = width < 768 ? 22 : 32;
    const waveCount = waveCols * waveRows;
    const waveGeometry = new THREE.BufferGeometry();
    const wavePositions = new Float32Array(waveCount * 3);
    const waveBaseY = new Float32Array(waveCount);

    const xSpacing = 32 / (waveCols - 1);
    const zSpacing = 24 / (waveRows - 1);

    for (let c = 0; c < waveCols; c++) {
      for (let r = 0; r < waveRows; r++) {
        const i = (c * waveRows + r) * 3;
        const x = (c - waveCols / 2) * xSpacing;
        const z = (r - waveRows / 2) * zSpacing - 4;
        const y = -6.0; // Positioned in background depth below hero

        wavePositions[i] = x;
        wavePositions[i + 1] = y;
        wavePositions[i + 2] = z;
        waveBaseY[c * waveRows + r] = y;
      }
    }

    waveGeometry.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));

    // Glow Dot Canvas for Wave Nodes & Embers
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 64;
    dotCanvas.height = 64;
    const dotCtx = dotCanvas.getContext('2d');
    if (dotCtx) {
      const g = dotCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255, 255, 255, 1)');
      g.addColorStop(0.2, 'rgba(245, 169, 0, 0.95)');
      g.addColorStop(0.5, 'rgba(213, 183, 121, 0.35)');
      g.addColorStop(1, 'rgba(5, 8, 13, 0)');
      dotCtx.fillStyle = g;
      dotCtx.fillRect(0, 0, 64, 64);
    }
    const dotTexture = new THREE.CanvasTexture(dotCanvas);

    const waveMaterial = new THREE.PointsMaterial({
      size: width < 768 ? 0.32 : 0.28,
      map: dotTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const wavePoints = new THREE.Points(waveGeometry, waveMaterial);
    scene.add(wavePoints);

    // 9. Floating Golden Embers & Stardust
    const emberCount = width < 768 ? 260 : 450;
    const emberGeometry = new THREE.BufferGeometry();
    const emberPositions = new Float32Array(emberCount * 3);
    const emberSpeeds: { vy: number; vx: number; phase: number }[] = [];

    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * 30;
      emberPositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 16;

      emberSpeeds.push({
        vy: Math.random() * 0.20 + 0.08,
        vx: (Math.random() - 0.5) * 0.04,
        phase: Math.random() * Math.PI * 2,
      });
    }

    emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));

    const emberMaterial = new THREE.PointsMaterial({
      size: width < 768 ? 0.38 : 0.32,
      map: dotTexture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const embers = new THREE.Points(emberGeometry, emberMaterial);
    scene.add(embers);

    // 10. Scroll & Interaction Handling
    let targetScrollY = window.scrollY;
    let currentScrollY = window.scrollY;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const onScroll = () => {
      targetScrollY = window.scrollY;
    };

    const onPointerMove = (e: PointerEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      camera.aspect = width / height;
      camera.position.z = getCamZ(width, height);
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

      // Re-center responsive elements
      const newSpan = getVisibleSpan(camera, 0);
      gyroGroups.forEach((g) => {
        g.group.position.x = g.relX * (newSpan.vWidth / 2);
      });
      floatingNodes.forEach((node) => {
        node.mesh.position.x = node.relX * (newSpan.vWidth / 2);
      });
    };

    window.addEventListener('resize', onResize);

    // 11. High-Performance Render Loop (Locked 60 FPS)
    const clock = new THREE.Clock();
    let animId = 0;

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      // Smooth scroll parallax damping
      currentScrollY = THREE.MathUtils.damp(currentScrollY, targetScrollY, 4.2, delta);
      currentMouseX = THREE.MathUtils.damp(currentMouseX, targetMouseX, 2.5, delta);
      currentMouseY = THREE.MathUtils.damp(currentMouseY, targetMouseY, 2.5, delta);

      const scrollOffset = currentScrollY * 0.0075;
      camera.position.y = -scrollOffset + (currentMouseY * -0.22);
      camera.position.x = currentMouseX * 0.3;

      // Animate dynamic specular glint lights
      glint1.position.set(
        Math.sin(elapsed * 0.7) * 7,
        -scrollOffset + Math.cos(elapsed * 0.6) * 3,
        7
      );
      glint2.position.set(
        Math.cos(elapsed * 0.5) * 7,
        -scrollOffset - 6 + Math.sin(elapsed * 0.8) * 3,
        5
      );

      if (!prefersReducedMotion) {
        // Animate Gyroscopic Rings (smooth nested counter-rotations)
        gyroGroups.forEach((g) => {
          const t = elapsed * g.floatSpeed + g.phase;
          g.group.position.y = g.baseY + Math.sin(t) * g.floatAmp;

          // Outer ring rotates on Y
          g.outer.rotation.y += g.rotSpeedY * delta;
          // Mid ring rotates on X & Z
          g.mid.rotation.x += g.rotSpeedX * delta;
          g.mid.rotation.z += g.rotSpeedZ * delta;
          // Inner ring counter-rotates
          g.inner.rotation.y -= g.rotSpeedY * 1.2 * delta;
          g.inner.rotation.x += g.rotSpeedX * 0.8 * delta;

          if (g.core) {
            g.core.rotation.x += 0.4 * delta;
            g.core.rotation.y += 0.5 * delta;
          }
        });

        // Animate floating crystal nodes
        floatingNodes.forEach((node) => {
          const t = elapsed * node.floatSpeed + node.phase;
          node.mesh.position.y = node.baseY + Math.sin(t) * node.floatAmp;
          node.mesh.rotation.x += node.rotSpeedX * delta;
          node.mesh.rotation.y += node.rotSpeedY * delta;
        });

        // Animate Kinetic 3D Wavefield (smooth sine ripples)
        const waveAttr = waveGeometry.attributes.position as THREE.BufferAttribute;
        const waveArr = waveAttr.array as Float32Array;
        const waveFreq = 0.35;
        const waveTime = elapsed * 1.6;

        for (let c = 0; c < waveCols; c++) {
          for (let r = 0; r < waveRows; r++) {
            const idx = (c * waveRows + r) * 3;
            const x = waveArr[idx];
            const z = waveArr[idx + 2];
            const baseY = waveBaseY[c * waveRows + r];

            // Smooth undulating market depth wave
            const ripple = Math.sin(x * waveFreq + waveTime) * Math.cos(z * waveFreq + waveTime * 0.8) * 1.35;
            waveArr[idx + 1] = baseY + ripple - scrollOffset * 0.4;
          }
        }
        waveAttr.needsUpdate = true;

        // Animate drifting golden embers
        const emberAttr = emberGeometry.attributes.position as THREE.BufferAttribute;
        const emberArr = emberAttr.array as Float32Array;

        for (let i = 0; i < emberCount; i++) {
          const idx = i * 3;
          emberArr[idx + 1] += emberSpeeds[i].vy * delta * 2.2;
          emberArr[idx] += Math.sin(elapsed + emberSpeeds[i].phase) * 0.003;

          const topBound = 25 - scrollOffset;
          const bottomBound = -45 - scrollOffset;

          if (emberArr[idx + 1] > topBound) {
            emberArr[idx + 1] = bottomBound;
          }
        }
        emberAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    // 12. Complete Cleanup
    return () => {
      cancelAnimationFrame(animId);

      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);

      outerRingGeo.dispose();
      midRingGeo.dispose();
      innerRingGeo.dispose();
      octaGeo.dispose();
      icosaGeo.dispose();
      waveGeometry.dispose();
      emberGeometry.dispose();

      goldRingMaterial.dispose();
      champagneRingMaterial.dispose();
      crystalMaterial.dispose();
      waveMaterial.dispose();
      emberMaterial.dispose();
      dotTexture.dispose();

      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#05080D]"
      aria-hidden="true"
    >
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Luxury Vignette Overlay */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(5,8,13,0.55)_100%)] pointer-events-none" 
      />
    </div>
  );
};
