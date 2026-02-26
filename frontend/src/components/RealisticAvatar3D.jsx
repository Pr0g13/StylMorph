import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const RealisticAvatar3D = ({ measurements, modelUrl: propModelUrl, textureUrl, showWearable = null }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const humanGroupRef = useRef(null);
  const animationIdRef = useRef(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("Initializing...");

  // Use prop modelUrl or fallback to measurements.modelUrl for backward compatibility
  const modelUrlToUse = propModelUrl || (measurements && measurements.modelUrl);

  console.log("RealisticAvatar3D: OBJLoader available?", !!OBJLoader);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);
    setDebugInfo(`Starting 3D init. Model: ${modelUrlToUse || 'None'}`);

    // Scene setup
    const scene = new THREE.Scene();
    // No background to allow the dark dashboard to show through
    // scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera - Adjusted to view a 2-unit tall model standing on Y=0
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    // Move camera up to chest level (Y=1.0) and pull back slightly
    camera.position.set(0, 1.0, 2.5);
    camera.lookAt(0, 1.0, 0);

    // Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowShadowMap;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (e) {
      console.error("Renderer init failed:", e);
      setError(`WebGL Error: ${e.message}`);
      setIsLoading(false);
      return;
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = false;
    // Set target to chest height where the camera looks
    controls.target.set(0, 1.0, 0);

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

    // Normalize measurements to scale (170cm = 1 unit)
    // Safely parse to float and provide defaults
    const getMeas = (val, def) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? def : parsed;
    };

    const heightVal = getMeas(measurements?.height, 170);
    const chestVal = getMeas(measurements?.chest, 100);
    // eslint-disable-next-line no-unused-vars
    const waistVal = getMeas(measurements?.waist, 80);
    const hipVal = getMeas(measurements?.hips, 90);
    const shoulderVal = getMeas(measurements?.shoulder, 45);
    const armLengthVal = getMeas(measurements?.armLength, 60);
    const inseamVal = getMeas(measurements?.inseam, 80);

    const heightScale = heightVal / 170;
    const chestScale = chestVal / 100;
    // eslint-disable-next-line no-unused-vars
    const waistScale = waistVal / 100;
    const hipScale = hipVal / 100;

    // Create realistic human based on measurements
    const createRealisticHuman = () => {
      const group = new THREE.Group();

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
        (shoulderVal) / 45 * 0.6,
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
      const armLength = armLengthVal / 100;
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
      const legLength = inseamVal / 100;
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
        const emoji = showWearable.thumbnail || '👕';
        const isPants = ['👖', '🩳'].includes(emoji);
        const isDress = ['👗', '👘'].includes(emoji);

        const chestWidth = chestScale * 0.6;
        const hipWidth = hipScale * 0.8;

        let wearableGeometry;
        let yPos = 0;

        if (isPants) {
          const pantsHeight = heightScale * 0.5;
          wearableGeometry = new THREE.CylinderGeometry(hipWidth / 2, hipWidth / 2.2, pantsHeight, 32, 1, false);
          wearableGeometry.scale(1, 1, 0.7);
          yPos = 0.6 * heightScale; // from hips down
        } else if (isDress) {
          const dressHeight = heightScale * 0.8;
          wearableGeometry = new THREE.CylinderGeometry(chestWidth / 2, hipWidth / 2, dressHeight, 32, 1, false);
          wearableGeometry.scale(1, 1, 0.7);
          yPos = 1.1 * heightScale - dressHeight / 2; // from chest down
        } else {
          const shirtHeight = heightScale * 0.4;
          wearableGeometry = new THREE.CylinderGeometry(chestWidth / 2, chestWidth / 1.8, shirtHeight, 32, 1, false);
          wearableGeometry.scale(1, 1, 0.7);
          yPos = 1.1 * heightScale - shirtHeight / 2; // upper torso
        }

        const wearableMaterial = new THREE.MeshStandardMaterial({
          color: 0x9333ea,
          roughness: 0.5,
          metalness: 0.2,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide
        });
        const wearable = new THREE.Mesh(wearableGeometry, wearableMaterial);
        wearable.position.y = yPos;
        wearable.position.z = 0;
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
        ctx.fillText(emoji, 128, 128);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshStandardMaterial({ map: texture, transparent: true });
        const labelGeometry = new THREE.PlaneGeometry(chestWidth, chestWidth);
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.y = wearable.position.y;
        label.position.z = (chestWidth / 2) + 0.05;
        group.add(label);
      }

      return group;
    };

    // Main Logic: Load custom model or create procedural
    if (modelUrlToUse) {
      const isGLTF = modelUrlToUse.toLowerCase().endsWith('.glb') || modelUrlToUse.toLowerCase().endsWith('.gltf');

      if (!isGLTF && typeof OBJLoader === 'undefined') {
        console.error("❌ OBJLoader is not defined. Check three-stdlib installed.");
        setError("System Error: OBJ Loader missing");
        setIsLoading(false);
        return;
      }

      const finalModelUrl = modelUrlToUse.startsWith('http')
        ? `${modelUrlToUse}?t=${Date.now()}`
        : `http://localhost:5000${modelUrlToUse}?t=${Date.now()}`;

      console.log("Loading 3D model from:", finalModelUrl);
      setDebugInfo(`Fetching: ${finalModelUrl}`);

      const handleModelLoad = (object) => {
        console.log("✅ Model loaded successfully:", finalModelUrl);
        setDebugInfo(`Model loaded. Processing bounds...`);
        // Center and scale
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        console.log("📦 Model Bounds:", {
          size: { x: size.x, y: size.y, z: size.z },
          center: { x: center.x, y: center.y, z: center.z }
        });
        setDebugInfo(`Bounds: ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`);

        if (isNaN(size.x) || isNaN(size.y) || isNaN(size.z) || size.lengthSq() < 0.0001) {
          console.warn("⚠️ Loaded model has invalid bounds, using fallback scale.");
          setDebugInfo("Invalid bounds. Using fallback scale.");
          // Fallback to unit scale if bounds are invalid
          object.scale.setScalar(1.0);
          object.position.set(0, 0, 0);
          scene.add(object);
        } else {
          const maxDim = Math.max(size.x, size.y, size.z);
          // Base scale normalizes the model height to ~2.0 units
          const baseScale = 2.0 / (maxDim || 1);

          // Apply user measurements as multipliers to stretch/squash the 3D mesh
          // using the same multipliers used by the procedural generator
          const finalScaleX = baseScale * (shoulderVal / 45); // Shoulder width primarily affects X
          const finalScaleY = baseScale * heightScale;        // Overall height affects Y
          const finalScaleZ = baseScale * chestScale;         // Chest depth affects Z

          // Create a wrapper group
          const wrapper = new THREE.Group();
          wrapper.add(object);

          // Center the object inside the wrapper
          // Moves the object so its visual center is at (0,0,0) relative to wrapper
          object.position.copy(center).negate();

          // Scale the wrapper using non-uniform dynamic scale
          wrapper.scale.set(finalScaleX, finalScaleY, finalScaleZ);

          // Position wrapper so the bottom of the object aligns exactly with the floor (Y=0)
          // Object extends from center.y-size.y/2 to center.y+size.y/2
          // After centering (object.position = -center), bottom is at -size.y/2
          // After scaling, bottom is at -size.y/2 * wrapper.scale.y
          // To align with floor (Y=0), move wrapper up by size.y/2 * wrapper.scale.y
          wrapper.position.y = (size.y / 2) * finalScaleY;

          // WEARABLE OVERLAY for the full 3D model
          if (showWearable && showWearable.url) {
            const url = showWearable.url;
            const isGLTFWearable = url.match(/\.(glb|gltf)$/i);
            const isOBJWearable = url.match(/\.obj$/i);

            if (isGLTFWearable || isOBJWearable) { // Load 3D dress model dynamically
              const handleDressLoad = (dressObject) => {
                // center and compute bounds of the garment
                const dBox = new THREE.Box3().setFromObject(dressObject);
                const dSize = dBox.getSize(new THREE.Vector3());
                const dCenter = dBox.getCenter(new THREE.Vector3());

                dressObject.position.copy(dCenter).negate();

                const dWrapper = new THREE.Group();
                dWrapper.add(dressObject);

                // Scale dress based on body size (chest width is size.x)
                // We add a slight 10% overflow so it sits outside the skin
                const isPants = showWearable?.type === 'pants';

                // For a shirt, it should match the chest width
                const targetWidth = size.x * 1.1;
                const scaleTarget = targetWidth / (dSize.x || 1);

                // Also respect the Avatar's non-uniform scaling relative to its base height
                dWrapper.scale.set(scaleTarget, scaleTarget * (heightScale * 0.9), scaleTarget * (chestScale * 1.05));

                // Position based on category
                if (isPants) {
                  dWrapper.position.y = -size.y * 0.15; // Lower body
                } else {
                  dWrapper.position.y = size.y * 0.15; // Upper body
                }

                // Ensure materials are double-sided so we don't see through the back
                dressObject.traverse((child) => {
                  if (child.isMesh && child.material) {
                    child.material.side = THREE.DoubleSide;
                    // If the wearable has a generated texture, use it, otherwise fall back to a random color
                    if (showWearable.textureUrl) {
                      const texUrl = showWearable.textureUrl.startsWith('http') ? showWearable.textureUrl : `http://localhost:5000${showWearable.textureUrl}`;
                      new THREE.TextureLoader().load(texUrl, (tex) => {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        child.material.map = tex;
                        child.material.needsUpdate = true;
                      });
                    } else {
                      child.material.color.setHex(0x9333ea);
                    }
                  }
                });

                wrapper.add(dWrapper);
                setDebugInfo(prev => `${prev} | 3D Wearable Loaded.`);
              };

              if (isGLTFWearable) {
                import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
                  new GLTFLoader().load(url, (gltf) => handleDressLoad(gltf.scene), undefined, (err) => console.log("Failed to load wearable", err));
                }).catch(err => console.log("GLTFLoader import error for wearable:", err));
              } else {
                new OBJLoader().load(url, handleDressLoad, undefined, (err) => console.log("Failed to load OBJ wearable", err));
              }
            }
          }

          // Move this logic OUTSIDE of the `if (showWearable)` wearable section, and into the main Avatar initialization where it belongs
          scene.add(wrapper);
          humanGroupRef.current = wrapper;

          setDebugInfo(prev => `${prev} | Centered & Scaled.`);

          // Apply either textured material using image, or plain fallback
          const applyFallbackMaterial = () => {
            const fallbackMaterial = new THREE.MeshStandardMaterial({
              color: 0xfdbcb4, // Realistic light/medium skin tone color
              roughness: 0.6,
              metalness: 0.05,
              flatShading: false,
              side: THREE.DoubleSide
            });
            object.traverse((child) => {
              if (child.isMesh) {
                if (child.geometry && !child.geometry.hasAttribute('normal')) {
                  child.geometry.computeVertexNormals();
                }
                child.material = fallbackMaterial;
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
          };

          if (textureUrl) {
            const finalTextureUrl = textureUrl.startsWith('http')
              ? textureUrl
              : `http://localhost:5000${textureUrl}`;

            setDebugInfo(prev => `${prev} | Appyling Texture...`);
            new THREE.TextureLoader().load(
              finalTextureUrl,
              (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;

                object.traverse((child) => {
                  if (child.isMesh) {
                    if (child.geometry && !child.geometry.hasAttribute('normal')) {
                      child.geometry.computeVertexNormals();
                    }

                    const geom = child.geometry;
                    geom.computeBoundingBox();
                    const bbox = geom.boundingBox;
                    // Our preprocessed image was bounded inside a square adding 5% padding
                    const maxDim = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y) * 1.05;
                    const cx = (bbox.max.x + bbox.min.x) / 2;
                    const cy = (bbox.max.y + bbox.min.y) / 2;

                    // Frontal Planar Mapping onto PIFuHD geometry 
                    const positions = geom.attributes.position.array;
                    const uvs = new Float32Array((positions.length / 3) * 2);
                    for (let i = 0; i < positions.length / 3; i++) {
                      const x = positions[i * 3];
                      const y = positions[i * 3 + 1];

                      // Map bounding box dimensions to [0,1] UV space matching square preprocessing 
                      let u = (x - cx) / maxDim + 0.5;
                      let v = (y - cy) / maxDim + 0.5;

                      uvs[i * 2] = u;
                      uvs[i * 2 + 1] = v;
                    }
                    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

                    child.material = new THREE.MeshStandardMaterial({
                      map: texture,
                      roughness: 0.6,
                      metalness: 0.05,
                      side: THREE.DoubleSide
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material.needsUpdate = true;
                  }
                });
                setDebugInfo(prev => `${prev} | Texture Applied!`);
              },
              undefined,
              (err) => {
                console.error("Failed to load texture", err);
                applyFallbackMaterial();
              }
            );
          } else {
            applyFallbackMaterial();
          }

          // The wrapper is already added to the scene above
        }

        setIsLoading(false);
      };

      const handleProgress = (xhr) => {
        const pct = (xhr.total > 0) ? (xhr.loaded / xhr.total * 100).toFixed(0) : '...';
        console.log(`⏳ Loading model: ${pct}% loaded`);
        setDebugInfo(`Loading: ${pct}%`);
      };

      const handleError = (error) => {
        console.error("❌ Error loading model:", error);
        setError(`Failed to load generated 3D Model: ${error.message || 'Network error'}\nPlease check if the backend static files are served correctly.`);
        setDebugInfo("Failed to load model. Check backend connection.");
        setIsLoading(false);
      };

      if (isGLTF) {
        import('three/examples/jsm/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
          const loader = new GLTFLoader();
          loader.load(
            finalModelUrl,
            (gltf) => handleModelLoad(gltf.scene),
            handleProgress,
            handleError
          );
        }).catch(err => {
          console.error("Failed to load GLTFLoader:", err);
          handleError(err);
        });
      } else {
        if (typeof OBJLoader === 'undefined') {
          console.error("❌ OBJLoader is not defined. Check three-stdlib installed.");
          setError("System Error: OBJ Loader missing");
          setIsLoading(false);
          return;
        }
        const loader = new OBJLoader();
        loader.load(
          finalModelUrl,
          handleModelLoad,
          handleProgress,
          handleError
        );
      }
    } else {
      const humanGroup = createRealisticHuman();
      humanGroupRef.current = humanGroup;
      scene.add(humanGroup);
      setIsLoading(false);
      setDebugInfo("Using procedural avatar (No URL)");
    }

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Update controls for damping to work
      controls.update();

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

    // Capture refs for cleanup to avoid eslint exhaustive-deps warning
    const currentRenderer = rendererRef.current;
    const currentContainer = containerRef.current;

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (currentRenderer && currentContainer) {
        try {
          currentContainer.removeChild(currentRenderer.domElement);
        } catch {
          /* ignore error on unmount */
        }
      }
      try {
        if (controls) controls.dispose();
        renderer.dispose();
      } catch {
        /* ignore dispose error */
      }
    };
  }, [measurements, modelUrlToUse, showWearable]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '1rem',
          overflow: 'hidden',
        }}
      />
      {/* Debug Info Overlay */}
      <div className="absolute top-2 left-2 text-[10px] text-green-400 bg-black/80 p-2 rounded font-mono pointer-events-none z-50 max-w-[80%] break-words">
        DEBUG: {debugInfo}
        <div className="text-[8px] opacity-70 mt-1 break-all">URL: {modelUrlToUse}</div>
        {error && <div className="text-red-500 font-bold mt-1 max-h-20 overflow-auto">{error}</div>}
      </div>

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