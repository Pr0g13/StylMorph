import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const RealisticAvatar3D = ({ measurements, showWearable = null }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const humanGroupRef = useRef(null);
  const animationIdRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || !measurements.height) return;

    setIsLoading(true);

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1724);
    scene.fog = new THREE.Fog(0x0f1724, 10, 50);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0.5, 2.5);
    camera.lookAt(0, 0.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 8, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x6366f1, 0.5);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    // Create grid floor
    const gridHelper = new THREE.GridHelper(10, 20, 0x2d3748, 0x1a202c);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    // Create realistic human based on measurements
    const createRealisticHuman = () => {
      const group = new THREE.Group();

      // Normalize measurements to scale (170cm = 1 unit)
      const heightScale = (measurements.height || 170) / 170;
      const chestScale = (measurements.chest || 100) / 100;
      const waistScale = (measurements.waist || 80) / 100;
      const hipScale = (measurements.hips || 90) / 100;

      // Materials
      const skinMaterial = new THREE.MeshStandardMaterial({
        color: 0xfdbcb4,
        roughness: 0.65,
        metalness: 0,
        side: THREE.FrontSide,
      });

      const clothesMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b4558,
        roughness: 0.8,
        metalness: 0.1,
      });

      // HEAD
      const headGeometry = new THREE.SphereGeometry(0.4 * heightScale, 32, 32);
      const head = new THREE.Mesh(headGeometry, skinMaterial);
      head.position.y = 1.65 * heightScale;
      head.castShadow = true;
      head.receiveShadow = true;
      group.add(head);

      // EYES
      const eyeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x8b6f47 });

      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.15, 1.75 * heightScale, 0.35 * heightScale);
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.15, 1.75 * heightScale, 0.35 * heightScale);
      group.add(leftEye, rightEye);

      // NECK
      const neckGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.15, 16);
      const neck = new THREE.Mesh(neckGeometry, skinMaterial);
      neck.position.y = 1.5 * heightScale;
      neck.castShadow = true;
      neck.receiveShadow = true;
      group.add(neck);

      // TORSO (tapered for realistic shape)
      const torsoGeometry = new THREE.BoxGeometry(
        chestScale * 0.5,
        heightScale * 0.5,
        chestScale * 0.35
      );
      const torso = new THREE.Mesh(torsoGeometry, clothesMaterial);
      torso.position.y = 1.0 * heightScale;
      torso.castShadow = true;
      torso.receiveShadow = true;
      group.add(torso);

      // SHOULDERS (wider for realism)
      const shoulderGeometry = new THREE.BoxGeometry(
        (measurements.shoulder || 45) / 45 * 0.6,
        0.2 * heightScale,
        chestScale * 0.25
      );
      const shoulderMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b4558,
        roughness: 0.8,
      });
      const shoulders = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
      shoulders.position.y = 1.3 * heightScale;
      shoulders.castShadow = true;
      shoulders.receiveShadow = true;
      group.add(shoulders);

      // LEFT ARM
      const armLength = (measurements.armLength || 60) / 100;
      const armGeometry = new THREE.CylinderGeometry(
        0.12 * heightScale,
        0.1 * heightScale,
        armLength,
        16
      );
      const leftArm = new THREE.Mesh(armGeometry, skinMaterial);
      leftArm.position.set(-chestScale * 0.35, 1.1 * heightScale, 0);
      leftArm.rotation.z = 0.2;
      leftArm.castShadow = true;
      leftArm.receiveShadow = true;
      group.add(leftArm);

      // RIGHT ARM
      const rightArm = new THREE.Mesh(armGeometry, skinMaterial);
      rightArm.position.set(chestScale * 0.35, 1.1 * heightScale, 0);
      rightArm.rotation.z = -0.2;
      rightArm.castShadow = true;
      rightArm.receiveShadow = true;
      group.add(rightArm);

      // HIPS/PELVIS
      const hipsGeometry = new THREE.BoxGeometry(
        hipScale * 0.5,
        0.25 * heightScale,
        hipScale * 0.35
      );
      const hips = new THREE.Mesh(hipsGeometry, clothesMaterial);
      hips.position.y = 0.6 * heightScale;
      hips.castShadow = true;
      hips.receiveShadow = true;
      group.add(hips);

      // LEFT LEG
      const legLength = (measurements.inseam || 80) / 100;
      const legGeometry = new THREE.CylinderGeometry(
        0.16 * heightScale,
        0.14 * heightScale,
        legLength,
        16
      );
      const leftLeg = new THREE.Mesh(legGeometry, clothesMaterial);
      leftLeg.position.set(-hipScale * 0.15, 0.35 * heightScale - legLength / 2, 0);
      leftLeg.castShadow = true;
      leftLeg.receiveShadow = true;
      group.add(leftLeg);

      // RIGHT LEG
      const rightLeg = new THREE.Mesh(legGeometry, clothesMaterial);
      rightLeg.position.set(hipScale * 0.15, 0.35 * heightScale - legLength / 2, 0);
      rightLeg.castShadow = true;
      rightLeg.receiveShadow = true;
      group.add(rightLeg);

      // SHOES
      const shoeGeometry = new THREE.BoxGeometry(
        0.16 * heightScale * 1.2,
        0.1 * heightScale,
        0.25 * heightScale
      );
      const shoeMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.7,
      });

      const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
      leftShoe.position.set(-hipScale * 0.15, -0.45 * heightScale, 0.1);
      leftShoe.castShadow = true;
      leftShoe.receiveShadow = true;
      group.add(leftShoe);

      const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
      rightShoe.position.set(hipScale * 0.15, -0.45 * heightScale, 0.1);
      rightShoe.castShadow = true;
      rightShoe.receiveShadow = true;
      group.add(rightShoe);

      // WEARABLE OVERLAY (if provided)
      if (showWearable) {
        const wearableGeometry = new THREE.BoxGeometry(
          chestScale * 0.55,
          heightScale * 0.45,
          chestScale * 0.08
        );
        const wearableMaterial = new THREE.MeshStandardMaterial({
          color: 0x9333ea,
          roughness: 0.5,
          metalness: 0.2,
          transparent: true,
          opacity: 0.85,
        });
        const wearable = new THREE.Mesh(wearableGeometry, wearableMaterial);
        wearable.position.y = 1.0 * heightScale;
        wearable.position.z = chestScale * 0.2;
        wearable.castShadow = true;
        wearable.receiveShadow = true;
        group.add(wearable);

        // Wearable label
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(showWearable.thumbnail, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshStandardMaterial({ map: texture });
        const labelGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.05);
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = 1.0 * heightScale;
        label.position.z = chestScale * 0.25;
        group.add(label);
      }

      return group;
    };

    const humanGroup = createRealisticHuman();
    humanGroupRef.current = humanGroup;
    scene.add(humanGroup);

    setIsLoading(false);

    // Animation loop
    let rotationSpeed = 0.005;
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (humanGroupRef.current) {
        humanGroupRef.current.rotation.y += rotationSpeed;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (rendererRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) {
          // Already removed
        }
      }
      renderer.dispose();
    };
  }, [measurements, showWearable]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '1rem',
          overflow: 'hidden',
          backgroundColor: '#0f1724',
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-2">⚡</div>
            <p className="text-white">Loading Avatar...</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
        🔄 360° View
      </div>
    </div>
  );
};

export default RealisticAvatar3D;