// Floors Module - Floor management and partitioning
class FloorsManager {
    constructor(designer) {
        this.designer = designer;
        this.floorGroup = null;
        this.floorObjectsGroup = null;
        this.floorPartitionsGroup = null;
        this.selectedFloorIndex = null;
        this.numFloors = 0;
        this.floorThickness = 0.3;
    }

    init() {
        // Create groups
        this.floorGroup = new THREE.Group();
        this.floorObjectsGroup = new THREE.Group();
        this.floorPartitionsGroup = new THREE.Group();
        this.designer.sceneManager.scene.add(this.floorGroup);
        this.designer.sceneManager.scene.add(this.floorObjectsGroup);
        this.designer.sceneManager.scene.add(this.floorPartitionsGroup);
    }

    buildFloors() {
        if (!this.floorGroup) return;
        // Clear
        this.floorGroup.clear();
        if (this.floorPartitionsGroup) this.floorPartitionsGroup.clear();
        if (!this.numFloors || this.numFloors < 1) return;

        const theme = this.designer.utilsManager.getCurrentTheme();
        const baseColor = theme === 'dark' ? 0x0e1627 : 0xdfe6f3;
        const vibrantPalette = [0xf87272, 0xfbbf24, 0x34d399, 0x60a5fa, 0xa78bfa, 0xf472b6];
        const width = this.designer.currentRadius * 2.2;
        const depth = this.designer.currentRadius * 2.2;
        const height = this.designer.currentHeight;
        const gap = height / (this.numFloors + 1);

        for (let i = 0; i < this.numFloors; i++) {
            const y = -height / 2 + (i + 1) * gap;
            const geometry = new THREE.BoxGeometry(width, this.floorThickness, depth);
            const color = this.designer.furnitureManager.vibrantEnabled ? vibrantPalette[i % vibrantPalette.length] : baseColor;
            const material = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.5 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = y;
            mesh.castShadow = true; 
            mesh.receiveShadow = true;
            mesh.userData = { floorIndex: i };
            this.floorGroup.add(mesh);
        }
        
        // Create floor selection buttons
        this.createFloorSelectionButtons();
        // Adjust existing furniture Y to new floor slabs - use lockedFloor
        this.floorObjectsGroup.children.forEach(obj => {
            const lockedFloor = obj.userData && obj.userData.lockedFloor != null ? obj.userData.lockedFloor : 
                               (obj.userData && obj.userData.floorIndex != null ? obj.userData.floorIndex : 0);
            const floor = this.floorGroup.children[lockedFloor];
            if (!floor) return;
            const bbox = new THREE.Box3().setFromObject(obj);
            const h = bbox.max.y - bbox.min.y;
            const floorTop = floor.position.y + this.floorThickness / 2;
            obj.position.y = floorTop + h / 2;
        });

        // Build partitions after floors exist
        this.buildFloorPartitions();
    }

    createFloorSelectionButtons() {
        const container = document.getElementById('floor-selection-buttons');
        if (!container) {
            console.error('Floor selection buttons container not found!');
            return;
        }
        
        // Clear existing buttons
        container.innerHTML = '';
        
        // Create buttons for each floor
        for (let i = 0; i < this.numFloors; i++) {
            const button = document.createElement('button');
            button.className = 'floor-btn';
            button.textContent = `Floor ${i + 1}`;
            button.dataset.floorIndex = i;
            button.addEventListener('click', () => {
                console.log(`Floor button ${i} clicked`);
                this.selectFloorByButton(i);
            });
            container.appendChild(button);
        }
        
        console.log(`Created ${this.numFloors} floor selection buttons`);
        
        // Initially disable all buttons if no floors exist
        if (this.numFloors === 0) {
            container.innerHTML = '<p style="color: var(--muted-text); font-size: 0.9rem;">No floors available. Use Plan Setup to create floors.</p>';
        }
    }

    buildFloorPartitions() {
        if (!this.floorPartitionsGroup) return;
        this.floorPartitionsGroup.clear();
        if (!this.numFloors || this.numFloors < 1) return;

        const theme = this.designer.utilsManager.getCurrentTheme();
        const wallColor = theme === 'dark' ? 0x9fb7ff : 0x3b5bdb;
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, metalness: 0.1, roughness: 0.6, transparent: true, opacity: 0.85 });

        const width = this.designer.currentRadius * 2.2;
        const depth = this.designer.currentRadius * 2.2;
        const gap = this.designer.currentHeight / (this.numFloors + 1);
        const wallHeight = Math.max(2, Math.min(3.2, gap * 0.85));
        const wallThickness = Math.max(0.06, Math.min(0.12, Math.min(width, depth) * 0.01));

        // Read MSQ selections for purpose and crew to influence density
        let purposeSet = new Set();
        let crewSize = 0;
        try {
            const sel = JSON.parse(localStorage.getItem('shd-msq'));
            if (sel && Array.isArray(sel.purpose)) purposeSet = new Set(sel.purpose);
            if (sel && sel.crew) crewSize = parseInt(sel.crew, 10) || 0;
        } catch {}

        const targetRoomArea = purposeSet.has('Research') ? 16 : purposeSet.has('Mixed-use') ? 20 : 12; // m^2
        const roomsX = Math.max(1, Math.floor(width / Math.sqrt(targetRoomArea)));
        const roomsZ = Math.max(1, Math.floor(depth / Math.sqrt(targetRoomArea)));
        const corridorWidth = purposeSet.has('Emergency shelter') ? 1.6 : 1.2;

        // Adjust density by crew size
        const densityFactor = crewSize > 24 ? 1.3 : crewSize > 12 ? 1.1 : 1.0;
        const gridX = Math.max(1, Math.round(roomsX * densityFactor));
        const gridZ = Math.max(1, Math.round(roomsZ * densityFactor));

        const minX = -width / 2;
        const minZ = -depth / 2;
        const cellW = width / gridX;
        const cellD = depth / gridZ;

        const addWall = (x1, z1, x2, z2, y, floorIdx) => {
            const dx = x2 - x1;
            const dz = z2 - z1;
            const len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.01) return;
            const geo = new THREE.BoxGeometry(len, wallHeight, wallThickness);
            const mesh = new THREE.Mesh(geo, wallMat);
            const angle = Math.atan2(dz, dx);
            mesh.position.set((x1 + x2) / 2, y + wallHeight / 2, (z1 + z2) / 2);
            mesh.rotation.y = angle;
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.userData = Object.assign({}, mesh.userData, { floorIndex: floorIdx });
            this.floorPartitionsGroup.add(mesh);
        };

        for (let i = 0; i < this.numFloors; i++) {
            const y = this.floorGroup.children[i].position.y;
            // Build grid lines; leave a central cross as corridor
            const corridorX = 0; // centered
            const corridorZ = 0; // centered
            const halfCX = corridorWidth / 2;
            const halfCZ = corridorWidth / 2;

            // Vertical walls (along Z axis, varying X)
            for (let gx = 1; gx < gridX; gx++) {
                const x = minX + gx * cellW;
                // Skip corridor band
                if (x > corridorX - halfCX && x < corridorX + halfCX) continue;
                addWall(x, minZ, x, -minZ, y, i);
            }
            // Horizontal walls (along X axis, varying Z)
            for (let gz = 1; gz < gridZ; gz++) {
                const z = minZ + gz * cellD;
                if (z > corridorZ - halfCZ && z < corridorZ + halfCZ) continue;
                addWall(minX, z, -minX, z, y, i);
            }
            // Outer boundary light rails for visual clarity
            addWall(minX, minZ, -minX, minZ, y, i);
            addWall(minX, -minZ, -minX, -minZ, y, i);
            addWall(minX, minZ, minX, -minZ, y, i);
            addWall(-minX, minZ, -minX, -minZ, y, i);
        }
    }

    selectFloorByButton(index) {
        console.log(`Selecting floor ${index}`);
        this.setSelectedFloor(index);
        // Enter planner mode automatically when a floor is selected
        if (!this.designer.plannerManager.isPlanner) {
            this.designer.plannerManager.enterPlannerMode();
        }
    }

    setSelectedFloor(index) {
        console.log(`Setting selected floor to ${index}`);
        console.log(`Available floors:`, this.floorGroup.children.map((f, i) => `Floor ${i}: Y=${f.position.y}, userData=${JSON.stringify(f.userData)}`));
        this.selectedFloorIndex = index;
        const theme = this.designer.utilsManager.getCurrentTheme();
        this.designer.utilsManager.applyThemeToWorkspace(theme);
        // Pop-out effect: raise selected floor, dim others, show only its partitions and objects
        const raiseAmount = 3;
        this.floorGroup.children.forEach((floorMesh, idx) => {
            const baseY = floorMesh.userData.baseY != null ? floorMesh.userData.baseY : floorMesh.position.y;
            floorMesh.userData.baseY = baseY;
            const isSel = idx === index;
            floorMesh.position.y = baseY + (isSel ? raiseAmount : 0);
            floorMesh.material.opacity = isSel ? 0.4 : 0.15;
            console.log(`Floor ${idx}: baseY=${baseY}, newY=${floorMesh.position.y}, isSelected=${isSel}`);
        });
        // Toggle partitions visibility per floor
        this.floorPartitionsGroup.children.forEach(w => {
            const fidx = (w.userData && w.userData.floorIndex != null) ? w.userData.floorIndex : -1;
            w.visible = fidx === index;
        });
        // Toggle furniture visibility per floor - use lockedFloor
        this.floorObjectsGroup.children.forEach(obj => {
            const lockedFloor = obj.userData && obj.userData.lockedFloor != null ? obj.userData.lockedFloor : 
                               (obj.userData && obj.userData.floorIndex != null ? obj.userData.floorIndex : -1);
            obj.visible = lockedFloor === index;
        });
        // Camera top-down on selected floor
        const targetY = this.floorGroup.children[index].position.y + 20;
        this.designer.sceneManager.camera.position.set(0, targetY, 0.001);
        this.designer.sceneManager.camera.lookAt(0, this.floorGroup.children[index].position.y, 0);
        // Update furniture positions to match the raised floor
        this.designer.furnitureManager.updateFurniturePositions();
    }

    resetFloorFocus() {
        // Restore all floors to base positions and default visibility
        if (this.floorGroup) {
            this.floorGroup.children.forEach((floorMesh) => {
                const baseY = floorMesh.userData.baseY != null ? floorMesh.userData.baseY : floorMesh.position.y;
                floorMesh.position.y = baseY;
                floorMesh.material.opacity = 0.25;
            });
        }
        if (this.floorPartitionsGroup) {
            this.floorPartitionsGroup.children.forEach(w => { w.visible = true; });
        }
        if (this.floorObjectsGroup) {
            this.floorObjectsGroup.children.forEach(obj => { obj.visible = true; });
        }
        // Re-apply theming for selected state reset
        const theme = this.designer.utilsManager.getCurrentTheme();
        this.selectedFloorIndex = null;
        this.designer.utilsManager.applyThemeToWorkspace(theme);
        // Update furniture positions after floor restoration
        this.designer.furnitureManager.updateFurniturePositions();
    }
}