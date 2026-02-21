// frontend/src/components/RealisticAvatar3D.jsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * RealisticAvatar3D
 *
 * Props:
 *  - modelUrl     (string | null) – Cloudinary HTTPS URL to a .obj file
 *                                   Expects body.mtl in the same folder
 *  - measurements (object)        – fallback parametric body if no modelUrl
 *  - showWearable (object | null)
 */
const RealisticAvatar3D = ({ measurements = {}, showWearable = null, modelUrl = null }) => {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setIsLoading(true);
    setLoadError(null);

    // ── Scene ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1117);
    scene.fog = new THREE.Fog(0x0d1117, 14, 60);

    // ── Camera ───────────────────────────────────────────────────────────────
    const w = container.clientWidth || 600;
    const h = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.01, 200);
    camera.position.set(0, 1.0, 3.5);
    camera.lookAt(0, 1.0, 0);

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ── OrbitControls ────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.6;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI * 0.93;
    controls.target.set(0, 1.0, 0);
    controls.update();

    // ── Lighting — designed for skin ─────────────────────────────────────────
    // Ambient: warm fill
    scene.add(new THREE.AmbientLight(0xffeedd, 0.60));

    // Key light: warm from upper-left front
    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
    keyLight.position.set(-3, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.far = 40;
    scene.add(keyLight);

    // Fill light: cool left bounce
    const fillLight = new THREE.DirectionalLight(0xc0d8ff, 0.45);
    fillLight.position.set(4, 4, -4);
    scene.add(fillLight);

    // Rim light: back glow to separate figure from background
    const rimLight = new THREE.PointLight(0xffffff, 0.55, 20);
    rimLight.position.set(0, 4, -5);
    scene.add(rimLight);

    // Sub-surface scattering approximation: low warm light from below
    const subLight = new THREE.PointLight(0xff9966, 0.25, 6);
    subLight.position.set(0, 0, 2);
    scene.add(subLight);

    // ── Ground ────────────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(12, 24, 0x1e2a3a, 0x111827);
    scene.add(grid);

    // Shadow catcher
    const shadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.25 });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ── Model group ───────────────────────────────────────────────────────────
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // Default skin material (used if MTL not available)
    const defaultSkinMat = new THREE.MeshPhongMaterial({
      color: 0xe8b48a,
      specular: 0x331100,
      shininess: 18,
      side: THREE.FrontSide,
    });

    // ── Idle rotation ─────────────────────────────────────────────────────────
    let idleRotation = true;
    controls.addEventListener('start', () => { idleRotation = false; });
    controls.addEventListener('end', () => { setTimeout(() => { idleRotation = true; }, 4000); });

    // ── Centre & scale loaded object ─────────────────────────────────────────
    const fitObject = (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const s = 2.0 / maxDim;
        object.scale.setScalar(s);
        object.position.x = -center.x * s;
        object.position.y = -box.min.y * s;
        object.position.z = -center.z * s;
      }
      object.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = child.receiveShadow = true;
        if (child.geometry) child.geometry.computeVertexNormals();
        // Apply skin material if mesh has no material or default white
        if (!child.material || child.material.color?.getHex() === 0xffffff) {
          child.material = defaultSkinMat;
        }
      });
      const newBox = new THREE.Box3().setFromObject(mainGroup);
      const newCenter = newBox.getCenter(new THREE.Vector3());
      const newSize = newBox.getSize(new THREE.Vector3());
      controls.target.set(newCenter.x, newCenter.y * 0.6, newCenter.z);
      camera.position.set(newCenter.x, newCenter.y * 0.6, newSize.z * 2.5);
      controls.update();
    };

    // ── Load OBJ (+MTL if URL provided) ──────────────────────────────────────
    const loadModel = (objUrl) => {
      // Derive MTL URL: same folder, "body.mtl"
      const mtlUrl = objUrl.substring(0, objUrl.lastIndexOf('/') + 1) + 'body.mtl';

      const objLoader = new OBJLoader();
      const mtlLoader = new MTLLoader();

      const applyAndAdd = (object) => {
        mainGroup.clear();
        mainGroup.add(object);
        fitObject(object);
        setIsLoading(false);
      };

      // Try MTL first; if it fails (CORS / not found) just load OBJ
      mtlLoader.load(
        mtlUrl,
        (mtl) => {
          mtl.preload();
          objLoader.setMaterials(mtl);
          objLoader.load(objUrl, applyAndAdd,
            (xhr) => { if (xhr.total > 0) setLoadPct(Math.round(xhr.loaded / xhr.total * 100)); },
            (err) => {
              setLoadError("Model load failed – showing preview.");
              buildParametric(mainGroup, measurements);
              setIsLoading(false);
            }
          );
        },
        undefined,
        () => {
          // MTL failed – load OBJ with default skin material
          objLoader.load(
            objUrl,
            (object) => {
              object.traverse((child) => {
                if (child.isMesh) child.material = defaultSkinMat;
              });
              applyAndAdd(object);
            },
            (xhr) => { if (xhr.total > 0) setLoadPct(Math.round(xhr.loaded / xhr.total * 100)); },
            () => {
              setLoadError("Model load failed – showing preview.");
              buildParametric(mainGroup, measurements);
              setIsLoading(false);
            }
          );
        }
      );
    };

    // ── Parametric fallback body ──────────────────────────────────────────────
    const buildParametric = (group, m) => {
      group.clear();
      const hR = (m.height || 170) / 170;
      const chR = (m.chest || 96) / 96;
      const waR = (m.waist || 80) / 80;
      const hiR = (m.hips || 98) / 98;
      const shR = (m.shoulder || 45) / 45;
      const arR = (m.armLength || 60) / 100;
      const leR = (m.inseam || 80) / 100;

      const skin = defaultSkinMat.clone();

      // Helper
      const mesh = (geo, mat, x, y, z, ry = 0) => {
        const m2 = new THREE.Mesh(geo, mat);
        m2.position.set(x, y, z);
        m2.rotation.y = ry;
        m2.castShadow = m2.receiveShadow = true;
        group.add(m2);
        return m2;
      };

      // Head
      mesh(new THREE.SphereGeometry(0.38 * hR, 32, 32), skin, 0, 1.68 * hR, 0);
      // Neck
      mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.14 * hR, 20), skin, 0, 1.52 * hR, 0);
      // Torso
      mesh(new THREE.CylinderGeometry(chR * 0.24, hiR * 0.25, hR * 0.50, 28), skin, 0, 1.0 * hR, 0);
      // Arms
      for (const s of [-1, 1]) {
        const ax = s * shR * 0.32;
        const upperArm = new THREE.CapsuleGeometry(0.09 * hR, arR * 0.5, 8, 16);
        const ua = new THREE.Mesh(upperArm, skin);
        ua.position.set(ax, 1.15 * hR, 0);
        ua.rotation.z = s * 0.22;
        ua.castShadow = true;
        group.add(ua);
        const lowerArm = new THREE.CapsuleGeometry(0.07 * hR, arR * 0.42, 8, 16);
        const la = new THREE.Mesh(lowerArm, skin);
        la.position.set(ax * 1.1, 0.80 * hR, 0);
        la.rotation.z = s * 0.25;
        la.castShadow = true;
        group.add(la);
      }
      // Legs
      for (const s of [-1, 1]) {
        const lx = s * hiR * 0.14;
        mesh(new THREE.CapsuleGeometry(0.13 * hR, leR * 0.5, 8, 20), skin, lx, 0.35 * hR - leR * 0.5, 0);
        mesh(new THREE.CapsuleGeometry(0.10 * hR, leR * 0.45, 8, 20), skin, lx, 0.35 * hR - leR * 1.1, 0);
      }
      setIsLoading(false);
    };

    // ── Main load path ────────────────────────────────────────────────────────
    if (modelUrl && modelUrl.trim()) {
      loadModel(modelUrl);
    } else {
      buildParametric(mainGroup, measurements);
    }

    // ── Wearable overlay ──────────────────────────────────────────────────────
    if (showWearable) {
      const hR = (measurements.height || 170) / 170;
      const chR = (measurements.chest || 96) / 96;
      const wGeo = new THREE.BoxGeometry(chR * 0.54, hR * 0.44, 0.08);
      const wMat = new THREE.MeshPhongMaterial({
        color: 0x7c3aed, transparent: true, opacity: 0.78,
      });
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.position.set(0, 1.0 * hR, chR * 0.18);
      mainGroup.add(wMesh);
    }

    // ── Animate ───────────────────────────────────────────────────────────────
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      if (idleRotation && mainGroup.children.length > 0) {
        mainGroup.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const nw = container.clientWidth;
      const nh = container.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationRef.current);
      controls.dispose();
      renderer.dispose();
      try { container.removeChild(renderer.domElement); } catch (_) { }
    };
  }, [modelUrl, measurements, showWearable]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', borderRadius: '0.75rem', overflow: 'hidden' }}
      />

      {/* Loading */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl">
          <div className="text-5xl mb-3 animate-spin">⚡</div>
          <p className="text-white font-medium">Loading 3D Avatar…</p>
          {loadPct > 0 && loadPct < 100 && (
            <div className="mt-3 w-44">
              <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${loadPct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1 text-center">{loadPct}%</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {loadError && !isLoading && (
        <div className="absolute top-2 left-2 right-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs px-3 py-2 rounded-lg">
          ⚠️ {loadError}
        </div>
      )}

      {/* Controls hint */}
      {!isLoading && (
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1">
          <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded-md">🖱️ Drag to rotate</span>
          <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded-md">🔍 Scroll zoom</span>
        </div>
      )}
    </div>
  );
};

export default RealisticAvatar3D;