/* ==========================================================================
   AERA 3D ENGINE - THREE.JS WEBGL RENDERER
   ========================================================================== */

let scene, camera, renderer, particles;
let watchGroup; // Root group containing the entire watch

// Individual component groups for Exploded View
let bezelGroup, crystalGroup, dialGroup, movementGroup, caseGroup, strapGroup;

// Materials dictionary
let watchMaterials = {};
let activeMaterialTheme = 'titanium'; // Default starting theme

// Animation state targets (interpolated smoothly using lerp)
let targetRotationX = 0.2;
let targetRotationY = -0.5;
let targetRotationZ = 0;
let targetPositionX = 0;
let targetPositionY = 0;
let targetPositionZ = 0;
let targetCameraZoom = 5; // Distance of camera

// Mouse movement values
let mouseX = 0;
let mouseY = 0;

// Explode factor (0 = assembled, 1 = fully exploded)
let explodeFactor = 0;
let targetExplodeFactor = 0;

// Movement gears to animate rotation
let mechanicalGears = [];
let balanceWheel;

// --- Procedural Studio Light Reflection Environment Map (PMREM alternative) ---
function createEnvMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Gradient dark studio background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#050505');
    bgGrad.addColorStop(0.5, '#151518');
    bgGrad.addColorStop(1, '#050505');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Soft vertical light stripe 1 (warmer key light stripe)
    let grad = ctx.createLinearGradient(40, 0, 140, 0);
    grad.addColorStop(0, 'rgba(255, 235, 210, 0)');
    grad.addColorStop(0.5, 'rgba(255, 235, 210, 0.9)');
    grad.addColorStop(1, 'rgba(255, 235, 210, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(40, 0, 100, canvas.height);
    
    // Soft vertical light stripe 2 (cool rim light stripe)
    grad = ctx.createLinearGradient(320, 0, 420, 0);
    grad.addColorStop(0, 'rgba(210, 240, 255, 0)');
    grad.addColorStop(0.5, 'rgba(210, 240, 255, 0.85)');
    grad.addColorStop(1, 'rgba(210, 240, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(320, 0, 100, canvas.height);
    
    // Ambient top horizon highlight
    grad = ctx.createLinearGradient(0, 20, 0, 90);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 20, canvas.width, 70);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return texture;
}

// --- Procedural Waffle Tapisserie bump texture for Dial ---
function createDialTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Base mid-gray (neutral bump value)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);
    
    // Draw waffle grids
    const boxSize = 8;
    for (let x = 0; x < 128; x += boxSize) {
        for (let y = 0; y < 128; y += boxSize) {
            // Grooves
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, boxSize, boxSize);
            
            // Raised centers
            ctx.fillStyle = '#a0a0a0';
            ctx.fillRect(x + 1, y + 1, boxSize - 2, boxSize - 2);
            
            // Bevel light
            ctx.fillStyle = '#dcdcdc';
            ctx.fillRect(x + 1, y + 1, boxSize/2 - 1, boxSize/2 - 1);
            
            // Bevel shadow
            ctx.fillStyle = '#404040';
            ctx.fillRect(x + boxSize/2, y + boxSize/2, boxSize/2 - 1, boxSize/2 - 1);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(5, 5); // Fine grid repetition
    return texture;
}

// --- Soft contact drop shadow mesh ---
function createContactShadow() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Soft radial blur shadow gradient
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.3, 'rgba(0, 0, 0, 0.35)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const shadowGeo = new THREE.PlaneGeometry(5.0, 5.0);
    const shadowMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.MultiplyBlending
    });
    
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0, 0, -2.2); // Just behind the watch
    return shadowMesh;
}

// --- Initialize Three.js Scene ---
function init3D() {
    const container = document.querySelector('.canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.08);

    // Dynamic environment reflection mapping
    const envMap = createEnvMap();
    scene.environment = envMap;

    // Static contact drop shadow behind the watch
    const shadow = createContactShadow();
    scene.add(shadow);

    // 2. Camera setup
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, targetCameraZoom);

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('canvas-3d'),
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Create Material System
    createMaterials();

    // 5. Build Watch Model
    buildWatch();

    // 6. Build Particles System
    buildParticles();

    // 7. Setup Cinematic Lighting
    setupLighting();

    // 8. Add Listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);

    // 9. Begin Render Loop
    animate();
}

// --- Define Premium PBR Materials ---
function createMaterials() {
    // Generate Dial Bump map
    const dialBump = createDialTexture();

    // 1. Titanium (Case, bezel accents)
    watchMaterials.titanium = new THREE.MeshPhysicalMaterial({
        color: 0x555861,
        metalness: 0.98,
        roughness: 0.22,
        clearcoat: 0.15,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.6,
        name: 'titanium'
    });

    // 2. Dark Titanium/Gunmetal (used on waffle dial plate)
    watchMaterials.gunmetal = new THREE.MeshPhysicalMaterial({
        color: 0x1f2024,
        metalness: 0.9,
        roughness: 0.28,
        bumpMap: dialBump,
        bumpScale: 0.015,
        envMapIntensity: 1.4,
        name: 'gunmetal'
    });

    // 3. 18K Rose Gold
    watchMaterials.gold = new THREE.MeshPhysicalMaterial({
        color: 0xe0a98c, // Real warm rose gold
        metalness: 0.98,
        roughness: 0.15,
        clearcoat: 0.4,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.8,
        name: 'gold'
    });

    // 4. Emerald Green Dial (Waffle texture Dial)
    watchMaterials.emerald = new THREE.MeshPhysicalMaterial({
        color: 0x064e3b,
        metalness: 0.5,
        roughness: 0.12,
        clearcoat: 0.7,
        clearcoatRoughness: 0.05,
        bumpMap: dialBump,
        bumpScale: 0.02,
        envMapIntensity: 1.5,
        name: 'emerald'
    });

    // 5. Matte Black Ceramic
    watchMaterials.ceramic = new THREE.MeshPhysicalMaterial({
        color: 0x121212,
        metalness: 0.1,
        roughness: 0.05,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        envMapIntensity: 1.2,
        name: 'ceramic'
    });

    // 6. Carbon Fiber Texture
    watchMaterials.carbon = new THREE.MeshPhysicalMaterial({
        color: 0x222224,
        metalness: 0.35,
        roughness: 0.35,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.3,
        name: 'carbon'
    });

    // 7. Platinum
    watchMaterials.platinum = new THREE.MeshPhysicalMaterial({
        color: 0xdcdfe4,
        metalness: 1.0,
        roughness: 0.15,
        clearcoat: 0.5,
        clearcoatRoughness: 0.08,
        envMapIntensity: 1.7,
        name: 'platinum'
    });

    // 8. Sapphire Glass (Refraction and Transparency)
    watchMaterials.sapphire = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.3,
        roughness: 0.01,
        metalness: 0.08,
        transmission: 0.92,
        ior: 1.76, // Index of refraction of sapphire
        thickness: 0.25,
        specularIntensity: 1.2,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        name: 'sapphire'
    });

    // 9. Glowing Hour Markers (Emission)
    watchMaterials.lume = new THREE.MeshStandardMaterial({
        color: 0xa7f3d0,
        emissive: 0x10b981,
        emissiveIntensity: 2.2,
        name: 'lume'
    });

    // 10. Golden Escapement Gears
    watchMaterials.gears = new THREE.MeshPhysicalMaterial({
        color: 0xe5c158,
        metalness: 0.98,
        roughness: 0.18,
        envMapIntensity: 1.5,
        name: 'gears'
    });

    // 11. Ruby Escapement Bearings
    watchMaterials.ruby = new THREE.MeshStandardMaterial({
        color: 0xd946ef,
        metalness: 0.2,
        roughness: 0.05,
        emissive: 0x9d174d,
        emissiveIntensity: 0.5,
        name: 'ruby'
    });
}

// --- Procedural Watch Modeling ---
function buildWatch() {
    watchGroup = new THREE.Group();

    // Create container groups for explode tracking
    bezelGroup = new THREE.Group();
    crystalGroup = new THREE.Group();
    dialGroup = new THREE.Group();
    movementGroup = new THREE.Group();
    caseGroup = new THREE.Group();
    strapGroup = new THREE.Group();

    watchGroup.add(bezelGroup);
    watchGroup.add(crystalGroup);
    watchGroup.add(dialGroup);
    watchGroup.add(movementGroup);
    watchGroup.add(caseGroup);
    watchGroup.add(strapGroup);

    // --- 1. CASE ---
    // Outer octagonal protective case tub
    const caseGeo = new THREE.CylinderGeometry(2.1, 2.2, 0.7, 8);
    const caseMesh = new THREE.Mesh(caseGeo, watchMaterials.titanium);
    caseMesh.rotation.y = Math.PI / 8; // Align octagonal corners
    caseMesh.castShadow = true;
    caseMesh.receiveShadow = true;
    caseGroup.add(caseMesh);

    // Shiny gold case bevel rings (Top and Bottom) to catch light highlights!
    const caseBevelGeo = new THREE.TorusGeometry(2.19, 0.025, 8, 64);
    
    const caseBevelTop = new THREE.Mesh(caseBevelGeo, watchMaterials.gold);
    caseBevelTop.rotation.x = Math.PI / 2;
    caseBevelTop.rotation.y = Math.PI / 8;
    caseBevelTop.position.y = 0.35;
    caseGroup.add(caseBevelTop);
    
    const caseBevelBottom = caseBevelTop.clone();
    caseBevelBottom.position.y = -0.35;
    caseGroup.add(caseBevelBottom);

    // Caseback details
    const caseBackGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.15, 32);
    const caseBackMesh = new THREE.Mesh(caseBackGeo, watchMaterials.gunmetal);
    caseBackMesh.position.y = -0.4;
    caseGroup.add(caseBackMesh);

    // Casing Crown (Adjustment wheel at 3 o'clock)
    const crownGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 24);
    const crownMesh = new THREE.Mesh(crownGeo, watchMaterials.gold);
    crownMesh.rotation.z = Math.PI / 2;
    crownMesh.position.set(2.1, 0, 0);
    caseGroup.add(crownMesh);

    // Crown guards
    const guardGeo = new THREE.BoxGeometry(0.2, 0.4, 0.5);
    const guard1 = new THREE.Mesh(guardGeo, watchMaterials.titanium);
    guard1.position.set(1.9, 0, 0.25);
    const guard2 = guard1.clone();
    guard2.position.z = -0.25;
    caseGroup.add(guard1);
    caseGroup.add(guard2);


    // --- 2. BEZEL ---
    // Octagonal Bezel matching AP style
    const bezelGeo = new THREE.CylinderGeometry(2.0, 2.05, 0.2, 8);
    const bezelMesh = new THREE.Mesh(bezelGeo, watchMaterials.carbon);
    bezelMesh.rotation.y = Math.PI / 8;
    bezelMesh.position.y = 0.38;
    bezelGroup.add(bezelMesh);

    // Shiny gold outer bevel ring for the bezel
    const bezelGoldBevelGeo = new THREE.TorusGeometry(2.04, 0.02, 8, 64);
    const bezelGoldBevel = new THREE.Mesh(bezelGoldBevelGeo, watchMaterials.gold);
    bezelGoldBevel.rotation.x = Math.PI / 2;
    bezelGoldBevel.rotation.y = Math.PI / 8;
    bezelGoldBevel.position.y = 0.46;
    bezelGroup.add(bezelGoldBevel);

    // Inner bezel ring (polished titanium edge)
    const bezelInnerGeo = new THREE.TorusGeometry(1.8, 0.05, 8, 32);
    const bezelInner = new THREE.Mesh(bezelInnerGeo, watchMaterials.titanium);
    bezelInner.rotation.x = Math.PI / 2;
    bezelInner.position.y = 0.47;
    bezelGroup.add(bezelInner);

    // Add 8 screws on bezel corners
    const screwGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12);
    const screwSlotGeo = new THREE.BoxGeometry(0.01, 0.07, 0.04);
    
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + Math.PI / 8;
        const radius = 1.85;
        const screw = new THREE.Mesh(screwGeo, watchMaterials.gold);
        const slot = new THREE.Mesh(screwSlotGeo, watchMaterials.gunmetal);
        slot.position.y = 0.031;
        screw.add(slot);

        screw.position.set(Math.cos(angle) * radius, 0.46, Math.sin(angle) * radius);
        screw.rotation.y = Math.random() * Math.PI; // Random screw alignment for realism
        bezelGroup.add(screw);
    }


    // --- 3. SAPPHIRE CRYSTAL ---
    const crystalGeo = new THREE.CylinderGeometry(1.78, 1.78, 0.1, 32);
    const crystalMesh = new THREE.Mesh(crystalGeo, watchMaterials.sapphire);
    crystalMesh.position.y = 0.52;
    crystalGroup.add(crystalMesh);


    // --- 4. DIAL & HANDS ---
    // Dial plate
    const dialPlateGeo = new THREE.CylinderGeometry(1.75, 1.75, 0.04, 32);
    const dialPlate = new THREE.Mesh(dialPlateGeo, watchMaterials.gunmetal);
    dialPlate.position.y = 0.28;
    dialGroup.add(dialPlate);

    // Detailed Date Window at 6 o'clock
    const dateFrameGeo = new THREE.BoxGeometry(0.38, 0.05, 0.26);
    const dateFrame = new THREE.Mesh(dateFrameGeo, watchMaterials.gold);
    dateFrame.position.set(0, 0.301, 0.95);
    dialGroup.add(dateFrame);

    const datePlateGeo = new THREE.PlaneGeometry(0.28, 0.18);
    const dateCanvas = document.createElement('canvas');
    dateCanvas.width = 64;
    dateCanvas.height = 64;
    const dateCtx = dateCanvas.getContext('2d');
    dateCtx.fillStyle = '#ffffff';
    dateCtx.fillRect(0, 0, 64, 64);
    dateCtx.fillStyle = '#050505';
    dateCtx.font = 'bold 36px "Space Grotesk", sans-serif';
    dateCtx.textAlign = 'center';
    dateCtx.textBaseline = 'middle';
    dateCtx.fillText('10', 32, 32);
    const dateTex = new THREE.CanvasTexture(dateCanvas);
    const dateMat = new THREE.MeshBasicMaterial({ map: dateTex });
    const datePlate = new THREE.Mesh(datePlateGeo, dateMat);
    datePlate.rotation.x = -Math.PI / 2;
    datePlate.position.set(0, 0.328, 0.95);
    dialGroup.add(datePlate);

    // Dimensional gold AERA plaque at 12 o'clock
    const logoPlaqueGeo = new THREE.BoxGeometry(0.65, 0.04, 0.18);
    const logoPlaque = new THREE.Mesh(logoPlaqueGeo, watchMaterials.gold);
    logoPlaque.position.set(0, 0.301, -0.95);
    dialGroup.add(logoPlaque);

    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 128;
    logoCanvas.height = 64;
    const logoCtx = logoCanvas.getContext('2d');
    logoCtx.fillStyle = '#0a0a0d';
    logoCtx.fillRect(0, 0, 128, 64);
    logoCtx.fillStyle = '#e0a98c'; // gold lettering
    logoCtx.font = 'bold 22px "Syne", sans-serif';
    logoCtx.textAlign = 'center';
    logoCtx.textBaseline = 'middle';
    logoCtx.fillText('A E R A', 64, 32);
    const logoTex = new THREE.CanvasTexture(logoCanvas);
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex });
    const logoPlaqueText = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.12), logoMat);
    logoPlaqueText.rotation.x = -Math.PI / 2;
    logoPlaqueText.position.set(0, 0.328, -0.95);
    dialGroup.add(logoPlaqueText);

    // Inner ring (tachy bezel ring)
    const innerRingGeo = new THREE.TorusGeometry(1.68, 0.06, 16, 64);
    const innerRing = new THREE.Mesh(innerRingGeo, watchMaterials.titanium);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.y = 0.31;
    dialGroup.add(innerRing);

    // Dial luminous hour markers
    const markerGeo = new THREE.BoxGeometry(0.06, 0.03, 0.2);
    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const radius = 1.5;
        const marker = new THREE.Mesh(markerGeo, watchMaterials.lume);
        marker.position.set(Math.cos(angle) * radius, 0.31, Math.sin(angle) * radius);
        marker.rotation.y = -angle + Math.PI / 2;
        dialGroup.add(marker);
    }

    // Chrono Subdials (two rings at 9 and 3 o'clock)
    const subdialRingGeo = new THREE.TorusGeometry(0.3, 0.02, 8, 32);
    const subdial1 = new THREE.Mesh(subdialRingGeo, watchMaterials.gold);
    subdial1.rotation.x = Math.PI / 2;
    subdial1.position.set(-0.6, 0.301, 0);
    dialGroup.add(subdial1);

    const subdial2 = subdial1.clone();
    subdial2.position.x = 0.6;
    dialGroup.add(subdial2);

    // Watch Hands (Skeletal structural layout)
    const hourHandGeo = new THREE.BoxGeometry(0.08, 0.04, 0.7);
    const hourHandMesh = new THREE.Mesh(hourHandGeo, watchMaterials.gold);
    hourHandMesh.geometry.translate(0, 0, 0.25); // Offset origin to pivot point
    hourHandMesh.position.y = 0.32;
    dialGroup.add(hourHandMesh);

    const minuteHandGeo = new THREE.BoxGeometry(0.06, 0.04, 1.1);
    const minuteHandMesh = new THREE.Mesh(minuteHandGeo, watchMaterials.gold);
    minuteHandMesh.geometry.translate(0, 0, 0.45);
    minuteHandMesh.position.y = 0.33;
    dialGroup.add(minuteHandMesh);

    const secondHandGeo = new THREE.BoxGeometry(0.02, 0.02, 1.25);
    const secondHandMesh = new THREE.Mesh(secondHandGeo, watchMaterials.titanium);
    secondHandMesh.geometry.translate(0, 0, 0.5);
    secondHandMesh.position.y = 0.34;
    dialGroup.add(secondHandMesh);

    // Center pin cap
    const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16);
    const pinMesh = new THREE.Mesh(pinGeo, watchMaterials.gold);
    pinMesh.position.y = 0.34;
    dialGroup.add(pinMesh);


    // --- 5. TOURBILLON MOVEMENT (Visible inner gears) ---
    // Build bridges/chassis plates
    const bridgeGeo = new THREE.BoxGeometry(1.2, 0.05, 0.3);
    const bridge1 = new THREE.Mesh(bridgeGeo, watchMaterials.gunmetal);
    bridge1.position.set(-0.3, 0.15, -0.1);
    bridge1.rotation.y = Math.PI / 4;
    movementGroup.add(bridge1);

    const bridge2 = new THREE.Mesh(bridgeGeo, watchMaterials.gunmetal);
    bridge2.position.set(0.3, 0.12, 0.2);
    bridge2.rotation.y = -Math.PI / 3;
    movementGroup.add(bridge2);

    // Create 4 Cogwheels that overlap and will rotate
    const cogPositions = [
        { x: -0.5, z: 0.4, r: 0.45, speed: 0.15, seg: 24 },
        { x: -0.1, z: 0.1, r: 0.3, speed: -0.225, seg: 18 },
        { x: 0.4, z: -0.2, r: 0.5, speed: 0.09, seg: 32 },
        { x: 0.1, z: -0.5, r: 0.2, speed: -0.45, seg: 12 }
    ];

    cogPositions.forEach((conf) => {
        const cogGroup = new THREE.Group();
        cogGroup.position.set(conf.x, 0.18, conf.z);

        // Core wheel rim
        const rimGeo = new THREE.TorusGeometry(conf.r, 0.03, 8, 32);
        const rim = new THREE.Mesh(rimGeo, watchMaterials.gears);
        rim.rotation.x = Math.PI / 2;
        cogGroup.add(rim);

        // Spokes
        const spokeGeo = new THREE.BoxGeometry(conf.r * 2, 0.02, 0.04);
        const spoke1 = new THREE.Mesh(spokeGeo, watchMaterials.gears);
        spoke1.rotation.y = Math.PI / 4;
        const spoke2 = spoke1.clone();
        spoke2.rotation.y = -Math.PI / 4;
        cogGroup.add(spoke1);
        cogGroup.add(spoke2);

        // Center ruby jewel bearing
        const jewelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.06, 8);
        const jewel = new THREE.Mesh(jewelGeo, watchMaterials.ruby);
        jewel.position.y = 0.02;
        cogGroup.add(jewel);

        movementGroup.add(cogGroup);
        mechanicalGears.push({ group: cogGroup, speed: conf.speed });
    });

    // Tourbillon Balance Wheel Escapement (Oscillates back and forth)
    balanceWheel = new THREE.Group();
    balanceWheel.position.set(0, 0.14, 0);

    const balRingGeo = new THREE.TorusGeometry(0.65, 0.04, 8, 32);
    const balRing = new THREE.Mesh(balRingGeo, watchMaterials.gold);
    balRing.rotation.x = Math.PI / 2;
    balanceWheel.add(balRing);

    const balSpokeGeo = new THREE.BoxGeometry(1.3, 0.03, 0.05);
    const balSpoke = new THREE.Mesh(balSpokeGeo, watchMaterials.gold);
    balanceWheel.add(balSpoke);

    const balanceJewelGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12);
    const balanceJewel = new THREE.Mesh(balanceJewelGeo, watchMaterials.ruby);
    balanceWheel.add(balanceJewel);

    movementGroup.add(balanceWheel);


    // --- 6. STRAP / BRACELET ---
    // Extruded watch lugs extending from case
    const lugGeo = new THREE.BoxGeometry(0.8, 0.4, 0.6);
    const lugTopL = new THREE.Mesh(lugGeo, watchMaterials.titanium);
    lugTopL.position.set(-0.8, -0.1, 2.2);
    lugTopL.rotation.y = -Math.PI / 18;
    const lugTopR = lugTopL.clone();
    lugTopR.position.x = 0.8;
    lugTopR.rotation.y = Math.PI / 18;

    const lugBottomL = lugTopL.clone();
    lugBottomL.position.z = -2.2;
    lugBottomL.rotation.y = Math.PI / 18;
    const lugBottomR = lugTopR.clone();
    lugBottomR.position.z = -2.2;
    lugBottomR.rotation.y = -Math.PI / 18;

    strapGroup.add(lugTopL);
    strapGroup.add(lugTopR);
    strapGroup.add(lugBottomL);
    strapGroup.add(lugBottomR);

    // Build Metal Strap Link Segments (Top and Bottom)
    buildStrapLinks(1);  // Top chain
    buildStrapLinks(-1); // Bottom chain

    scene.add(watchGroup);
}

// Helper to construct link chains
function buildStrapLinks(direction) {
    const linkCount = 4;
    const linkWidth = 1.4;
    const linkLength = 0.6;
    const linkThickness = 0.15;
    
    const linkGeo = new THREE.BoxGeometry(linkWidth, linkThickness, linkLength);

    for (let i = 0; i < linkCount; i++) {
        const link = new THREE.Mesh(linkGeo, watchMaterials.titanium);
        
        // Arrange along a curved path going downwards
        const progress = i / (linkCount - 1);
        const zOffset = (2.4 + i * 0.55) * direction;
        const yOffset = -0.15 - (i * i * 0.18);
        const xRotation = -0.15 * i * direction;

        link.position.set(0, yOffset, zOffset);
        link.rotation.x = xRotation;
        
        // Add subtle polished gold link pins on sides
        const pinGeo = new THREE.CylinderGeometry(0.04, 0.04, linkWidth + 0.06, 12);
        const pin = new THREE.Mesh(pinGeo, watchMaterials.gold);
        pin.rotation.z = Math.PI / 2;
        link.add(pin);

        strapGroup.add(link);
    }
}

// --- Create Particles Field ---
function buildParticles() {
    const particleCount = 450;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        // Spatial coordinates within a box around the watch
        positions[i * 3] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

        // Custom slow glowing colors (Champagne Gold to light white)
        colors[i * 3] = 0.85 + Math.random() * 0.15; // R
        colors[i * 3 + 1] = 0.75 + Math.random() * 0.15; // G
        colors[i * 3 + 2] = 0.55 + Math.random() * 0.25; // B
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Glowing point material
    const material = new THREE.PointsMaterial({
        size: 0.06,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

// --- Cinematic Lighting ---
function setupLighting() {
    // 1. Ambient low-light filling
    const ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(ambientLight);

    // 2. Warm Key Light (Champagne Gold reflections)
    const keyLight = new THREE.DirectionalLight(0xe5c158, 2.5);
    keyLight.position.set(-5, 8, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // 3. Cool Rim Light (Blue/Cyan titanium glow)
    const rimLight = new THREE.DirectionalLight(0x0ea5e9, 1.8);
    rimLight.position.set(6, -4, -3);
    scene.add(rimLight);

    // 4. Spotlight directly overhead for high reflections on crystal glass
    const spotLight = new THREE.SpotLight(0xffffff, 4.0, 15, Math.PI / 6, 0.8, 1);
    spotLight.position.set(0, 7, 3);
    spotLight.target = watchGroup;
    scene.add(spotLight);
}

// --- Input Interaction Handlers ---
function onMouseMove(event) {
    // Normalize coordinates between -0.5 and 0.5
    mouseX = (event.clientX / window.innerWidth) - 0.5;
    mouseY = (event.clientY / window.innerHeight) - 0.5;
}

function onWindowResize() {
    const container = document.querySelector('.canvas-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

// --- Dynamic material customization interface ---
function updateWatchMaterials(materialTheme) {
    if (materialTheme === activeMaterialTheme) return;
    activeMaterialTheme = materialTheme;

    // Apply color palettes instantly to components
    switch (materialTheme) {
        case 'titanium':
            bezelGroup.children[0].material = watchMaterials.carbon;
            caseGroup.children[0].material = watchMaterials.titanium;
            strapGroup.children.forEach(link => link.material = watchMaterials.titanium);
            dialGroup.children[0].material = watchMaterials.gunmetal;
            watchMaterials.lume.emissive.setHex(0x10b981); // Emerald glow indices
            break;
            
        case 'gold':
            bezelGroup.children[0].material = watchMaterials.ceramic;
            caseGroup.children[0].material = watchMaterials.gold;
            strapGroup.children.forEach(link => link.material = watchMaterials.gold);
            dialGroup.children[0].material = watchMaterials.ceramic;
            watchMaterials.lume.emissive.setHex(0xd4af37); // Gold glow indices
            break;

        case 'sapphire':
            bezelGroup.children[0].material = watchMaterials.titanium;
            caseGroup.children[0].material = watchMaterials.titanium;
            strapGroup.children.forEach(link => link.material = watchMaterials.titanium);
            dialGroup.children[0].material = watchMaterials.titanium;
            watchMaterials.lume.emissive.setHex(0x3b82f6); // Sapphire Blue glow indices
            break;

        case 'movement':
            // Skeleton mode - turn bezel and dial semi-translucent or metallic gold
            bezelGroup.children[0].material = watchMaterials.gold;
            caseGroup.children[0].material = watchMaterials.titanium;
            dialGroup.children[0].material = watchMaterials.sapphire; // Visible gears!
            break;

        case 'ceramic':
            bezelGroup.children[0].material = watchMaterials.ceramic;
            caseGroup.children[0].material = watchMaterials.ceramic;
            strapGroup.children.forEach(link => link.material = watchMaterials.gunmetal);
            dialGroup.children[0].material = watchMaterials.ceramic;
            break;

        case 'carbon':
            bezelGroup.children[0].material = watchMaterials.carbon;
            caseGroup.children[0].material = watchMaterials.carbon;
            strapGroup.children.forEach(link => link.material = watchMaterials.gunmetal);
            dialGroup.children[0].material = watchMaterials.carbon;
            watchMaterials.lume.emissive.setHex(0xef4444); // Red/Orange glow index
            break;
            
        // Collections custom triggers
        case 'stealth':
            bezelGroup.children[0].material = watchMaterials.carbon;
            caseGroup.children[0].material = watchMaterials.gunmetal;
            strapGroup.children.forEach(link => link.material = watchMaterials.gunmetal);
            dialGroup.children[0].material = watchMaterials.carbon;
            watchMaterials.lume.emissive.setHex(0x10b981);
            break;

        case 'royal':
            bezelGroup.children[0].material = watchMaterials.ceramic;
            caseGroup.children[0].material = watchMaterials.gold;
            strapGroup.children.forEach(link => link.material = watchMaterials.gold);
            dialGroup.children[0].material = watchMaterials.ceramic;
            watchMaterials.lume.emissive.setHex(0xd4af37);
            break;

        case 'jade':
            bezelGroup.children[0].material = watchMaterials.platinum;
            caseGroup.children[0].material = watchMaterials.platinum;
            strapGroup.children.forEach(link => link.material = watchMaterials.titanium);
            dialGroup.children[0].material = watchMaterials.emerald; // Emerald green dial face
            watchMaterials.lume.emissive.setHex(0xffffff);
            break;
    }
}

// --- Render Loop (Animate state changes) ---
function animate(time) {
    requestAnimationFrame(animate);

    // 1. Time based animations (Mechanical hands & gears)
    const date = new Date();
    const milliseconds = date.getMilliseconds();
    const seconds = date.getSeconds() + milliseconds / 1000;
    const minutes = date.getMinutes() + seconds / 60;
    const hours = (date.getHours() % 12) + minutes / 60;

    // Rotate hands (Z-axis is perpendicular to dial face in local space)
    // dialGroup children: 0: dial, 1: inner ring, index markers (2 to 13), subdials, 16: hourHand, 17: minHand, 18: secHand
    // To make it simple we fetch by geometries names or find index directly:
    // hourHand = dialGroup.children[16], minuteHand = dialGroup.children[17], secondHand = dialGroup.children[18]
    if (dialGroup.children[16]) dialGroup.children[16].rotation.x = -(hours / 12) * Math.PI * 2;
    if (dialGroup.children[17]) dialGroup.children[17].rotation.x = -(minutes / 60) * Math.PI * 2;
    if (dialGroup.children[18]) dialGroup.children[18].rotation.x = -(seconds / 60) * Math.PI * 2;

    // Rotate inner mechanical tourbillon cogwheels
    mechanicalGears.forEach((gear) => {
        gear.group.rotation.y += gear.speed * 0.05;
    });

    // Tourbillon Balance Wheel oscillates back and forth
    if (balanceWheel) {
        balanceWheel.rotation.y = Math.sin(Date.now() * 0.008) * 0.75;
    }

    // 2. Slow particle drift
    if (particles) {
        particles.rotation.y += 0.0006;
        particles.rotation.x += 0.0003;
    }

    // 3. Smooth Lerp state updates (Mouse Parallax & Scroll variables)
    // Add mouse parallax displacement inside target calculations
    const curRotationX = targetRotationX + (mouseY * 0.15);
    const curRotationY = targetRotationY + (mouseX * 0.18);
    const curRotationZ = targetRotationZ;

    watchGroup.rotation.x += (curRotationX - watchGroup.rotation.x) * 0.04;
    watchGroup.rotation.y += (curRotationY - watchGroup.rotation.y) * 0.04;
    watchGroup.rotation.z += (curRotationZ - watchGroup.rotation.z) * 0.04;

    watchGroup.position.x += (targetPositionX - watchGroup.position.x) * 0.04;
    watchGroup.position.y += (targetPositionY - watchGroup.position.y) * 0.04;
    watchGroup.position.z += (targetPositionZ - watchGroup.position.z) * 0.04;

    camera.position.z += (targetCameraZoom - camera.position.z) * 0.04;

    // 4. Explode translation along Y axis (Z relative to the face orientation of the watch)
    // Z spacing mapping
    explodeFactor += (targetExplodeFactor - explodeFactor) * 0.035;
    
    bezelGroup.position.y = 0.38 + (explodeFactor * 1.5);
    crystalGroup.position.y = 0.52 + (explodeFactor * 2.5);
    dialGroup.position.y = 0.28 + (explodeFactor * 0.7);
    movementGroup.position.y = 0.15 - (explodeFactor * 0.5);
    caseGroup.position.y = 0 - (explodeFactor * 1.6);
    strapGroup.position.y = 0 - (explodeFactor * 2.4);

    renderer.render(scene, camera);
}

// Initialize when library loaded and page ready
document.addEventListener("DOMContentLoaded", () => {
    init3D();
});
