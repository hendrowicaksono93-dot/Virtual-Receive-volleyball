import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BallPhysics } from '../types';

interface VolleyballSceneProps {
  physicsRef: React.MutableRefObject<BallPhysics>;
  onReachTarget: (ballScreenPos: { x: number; y: number }, ballWorldPos: THREE.Vector3) => void;
  onRoundComplete: () => void;
  targetIndicatorX?: number;
}

export default function VolleyballScene({
  physicsRef,
  onReachTarget,
  onRoundComplete,
  targetIndicatorX = 0,
}: VolleyballSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onReachTargetRef = useRef(onReachTarget);
  onReachTargetRef.current = onReachTarget;
  const onRoundCompleteRef = useRef(onRoundComplete);
  onRoundCompleteRef.current = onRoundComplete;
  const targetIndicatorXRef = useRef(targetIndicatorX);
  targetIndicatorXRef.current = targetIndicatorX;

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const ballMeshRef = useRef<THREE.Mesh | null>(null);
  const shadowMeshRef = useRef<THREE.Mesh | null>(null);
  const trailMeshesRef = useRef<THREE.Mesh[]>([]);
  const sparkGroupRef = useRef<THREE.Points | null>(null);
  const targetRingRef = useRef<THREE.Mesh | null>(null);
  const targetCenterRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let animId: number | null = null;
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera positioned safely behind and slightly above the player, looking down-court towards opponent
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
    camera.position.set(0, 1.1, 3.2);
    camera.lookAt(0, 0.3, -12);
    cameraRef.current = camera;

    // 2. Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.error('Failed to initialize WebGLRenderer:', err);
      return;
    }

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 10, 4);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffeedd, 0.7);
    dirLight2.position.set(-5, 6, -15);
    scene.add(dirLight2);

    // 4. Create Mikasa-style Volleyball Texture
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 512;
    const ctx = texCanvas.getContext('2d');
    if (ctx) {
      // Yellow base
      ctx.fillStyle = '#FFDD00';
      ctx.fillRect(0, 0, 512, 512);

      // Blue swirling curves
      ctx.fillStyle = '#0052B4';
      ctx.beginPath();
      ctx.ellipse(150, 150, 120, 240, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(375, 375, 120, 240, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(256, 256, 80, 220, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // White accents
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(256, 100, 40, 130, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(256, 412, 40, 130, 0, 0, Math.PI * 2);
      ctx.fill();

      // Seams
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 256, 248, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(128 * i, 256, 128, 0, Math.PI);
        ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(texCanvas);

    // 5. 3D Volleyball Mesh
    const ballRadius = 0.52;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.35,
      metalness: 0.05,
    });
    const ball = new THREE.Mesh(ballGeo, ballMat);
    ball.position.set(0, 2.4, -22);
    ball.visible = true;
    scene.add(ball);
    ballMeshRef.current = ball;

    // 6. Ground Shadow on the Court Floor (Floor is at Y = -1.6)
    const floorY = -1.6;
    const shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 64, 64);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, floorY + 0.02, -22);
    scene.add(shadowMesh);
    shadowMeshRef.current = shadowMesh;

    // 7. Motion Trail (Subtle ghost spheres)
    const trailCount = 4;
    const trailMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < trailCount; i++) {
      const tMat = new THREE.MeshBasicMaterial({
        color: 0x00b4d8,
        transparent: true,
        opacity: 0.22 - i * 0.04,
      });
      const tMesh = new THREE.Mesh(new THREE.SphereGeometry(ballRadius * (0.9 - i * 0.08), 16, 16), tMat);
      tMesh.visible = false;
      scene.add(tMesh);
      trailMeshes.push(tMesh);
    }
    trailMeshesRef.current = trailMeshes;

    // 8. Hit Sparks Particle System
    const sparkCount = 40;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVels: THREE.Vector3[] = [];
    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;
      sparkVels.push(new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() + 0.5) * 5,
        (Math.random() - 0.5) * 5
      ));
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffe066,
      size: 0.12,
      transparent: true,
      opacity: 0,
    });
    const sparkGroup = new THREE.Points(sparkGeo, sparkMat);
    scene.add(sparkGroup);
    sparkGroupRef.current = sparkGroup;

    // Landing Target Marker on Court Floor
    const targetRingGeo = new THREE.RingGeometry(0.36, 0.48, 32);
    const targetRingMat = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const targetRingMesh = new THREE.Mesh(targetRingGeo, targetRingMat);
    targetRingMesh.rotation.x = -Math.PI / 2;
    targetRingMesh.position.set(0, floorY + 0.025, -1.2);
    scene.add(targetRingMesh);
    targetRingRef.current = targetRingMesh;

    const targetCenterGeo = new THREE.CircleGeometry(0.12, 24);
    const targetCenterMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const targetCenterMesh = new THREE.Mesh(targetCenterGeo, targetCenterMat);
    targetCenterMesh.rotation.x = -Math.PI / 2;
    targetCenterMesh.position.set(0, floorY + 0.026, -1.2);
    scene.add(targetCenterMesh);
    targetCenterRef.current = targetCenterMesh;

    // Position history for trail
    const posHistory: THREE.Vector3[] = [];

    // 9. Animation Loop
    let lastTime = performance.now();
    const animate = () => {
      animId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const p = physicsRef.current;
      const b = ballMeshRef.current;
      const s = shadowMeshRef.current;

      if (!b || !s) return;

      // Update Target Ring Marker
      if (targetRingRef.current && targetCenterRef.current) {
        const tx = targetIndicatorXRef.current ?? 0;
        targetRingRef.current.position.x = tx;
        targetCenterRef.current.position.x = tx;
        const isTargetVisible = p.state === 'flying' || p.state === 'tossed' || p.state === 'held';
        targetRingRef.current.visible = isTargetVisible;
        targetCenterRef.current.visible = isTargetVisible;
        if (isTargetVisible) {
          const pulse = 1 + Math.sin(now * 0.008) * 0.12;
          targetRingRef.current.scale.set(pulse, pulse, pulse);
        }
      }

      try {
        if (p.state === 'held') {
          // Ball floats near Yamaguchi's chest at his serve start position
          const sx = p.startX ?? 0;
          const floatOffset = Math.sin(now * 0.003) * 0.08;
          b.position.set(sx, 2.4 + floatOffset, -22);
          b.rotation.y += dt * 0.6;
          b.visible = true;

          s.position.set(sx, floorY + 0.02, -22);
          s.scale.set(1.1, 1.1, 1.1);
          shadowMat.opacity = 0.4;
          s.visible = true;

          trailMeshesRef.current.forEach(m => { m.visible = false; });
        } else if (p.state === 'tossed') {
          // Yamaguchi tosses ball upwards from his serve position
          const sx = p.startX ?? 0;
          const t = (now - p.startTime) / 1000;
          const tossY = 2.4 + 2.8 * t - 0.5 * 9.8 * t * t;
          b.position.set(sx, Math.max(tossY, 2.4), -22);
          b.rotation.x += dt * 4;
          b.visible = true;

          s.position.set(sx, floorY + 0.02, -22);
          const heightDiff = Math.max(0.1, b.position.y - floorY);
          const sScale = Math.max(0.6, 2.0 / heightDiff);
          s.scale.set(sScale, sScale, sScale);
          shadowMat.opacity = Math.min(0.5, 1.5 / heightDiff);
          s.visible = true;
        } else if (p.state === 'flying') {
          // Ball flies towards player
          const t = (now - p.startTime) / 1000;
          p.t = t;

          const curX = p.startX + p.vx * t;
          // Guard Z so ball never flies behind the camera (camera is at Z=3.2)
          const curZ = Math.min(0.5, p.startZ + p.vz * t);
          const curY = p.startY + p.vy * t - 0.5 * 6.5 * t * t;

          b.position.set(curX, curY, curZ);
          b.rotation.x += dt * p.spinX;
          b.rotation.y += dt * p.spinY;
          b.visible = true;

          // Shadow follows
          s.position.set(curX, floorY + 0.02, curZ);
          const heightAboveFloor = Math.max(0.1, curY - floorY);
          const shadowScale = Math.max(0.8, 2.2 / heightAboveFloor);
          s.scale.set(shadowScale, shadowScale, shadowScale);
          shadowMat.opacity = Math.min(0.6, 1.6 / heightAboveFloor);
          s.visible = true;

          // Motion trail
          posHistory.unshift(b.position.clone());
          if (posHistory.length > 15) posHistory.pop();

          trailMeshesRef.current.forEach((tMesh, idx) => {
            const histIdx = (idx + 1) * 2;
            if (posHistory[histIdx]) {
              tMesh.position.copy(posHistory[histIdx]);
              tMesh.visible = true;
            }
          });

          // Check if ball reached the receive target threshold
          if (curZ >= p.targetZ && !p.hitChecked) {
            p.hitChecked = true;
            const screenPos = b.position.clone().project(camera);
            const normX = (screenPos.x + 1) / 2;
            const normY = (-screenPos.y + 1) / 2;

            onReachTargetRef.current({ x: normX, y: normY }, b.position.clone());
          }
        } else if (p.state === 'bumping') {
          // Ball was successfully received! Arcs upward and backward to opponent court
          const t = (now - p.startTime) / 1000;
          const curX = p.startX + p.vx * t;
          const curZ = Math.max(-24, p.startZ + p.vz * t);
          const curY = p.startY + p.vy * t - 0.5 * 9.5 * t * t;

          b.position.set(curX, curY, curZ);
          b.rotation.x -= dt * 12;
          b.rotation.z += dt * 6;

          s.position.set(curX, floorY + 0.02, curZ);
          const heightAboveFloor = Math.max(0.1, curY - floorY);
          const shadowScale = Math.max(0.6, 2.0 / heightAboveFloor);
          s.scale.set(shadowScale, shadowScale, shadowScale);
          shadowMat.opacity = Math.min(0.5, 1.4 / heightAboveFloor);

          // Sparks particle update
          if (sparkGroupRef.current) {
            const pAttr = sparkGroupRef.current.geometry.attributes.position as THREE.BufferAttribute;
            const posArray = pAttr.array as Float32Array;
            for (let i = 0; i < sparkCount; i++) {
              posArray[i * 3] += sparkVels[i].x * dt;
              posArray[i * 3 + 1] += (sparkVels[i].y - 9.8 * t) * dt;
              posArray[i * 3 + 2] += sparkVels[i].z * dt;
            }
            pAttr.needsUpdate = true;
            sparkMat.opacity = Math.max(0, 1 - t * 1.8);
          }

          if (t > 1.8) {
            p.state = 'held';
            onRoundCompleteRef.current();
          }
        } else if (p.state === 'bouncing') {
          // Ball missed, lands on court floor and bounces gently
          const t = (now - p.startTime) / 1000;
          const curX = p.startX + p.vx * t;
          // Constrain curZ safely in front of camera
          const curZ = Math.min(0.8, p.startZ + p.vz * t);
          const decay = Math.exp(-t * 2.2);
          const bounce = Math.abs(Math.cos(t * 8)) * 1.4 * decay;
          const curY = floorY + ballRadius + bounce;

          b.position.set(curX, curY, curZ);
          b.rotation.x += dt * (8 * decay);

          s.position.set(curX, floorY + 0.02, curZ);
          s.scale.set(1.0, 1.0, 1.0);
          shadowMat.opacity = 0.45 * decay;

          trailMeshesRef.current.forEach(m => { m.visible = false; });

          if (t > 1.5) {
            p.state = 'held';
            onRoundCompleteRef.current();
          }
        }

        renderer.render(scene, camera);
      } catch (err) {
        console.error('Error in Three.js render loop:', err);
      }
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
      try {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      } catch {
        // ignore disposal errors
      }
    };
  }, [physicsRef]);

  return (
    <div
      ref={containerRef}
      id="volleyball-3d-canvas-container"
      className="absolute inset-0 z-30 pointer-events-none"
    />
  );
}
