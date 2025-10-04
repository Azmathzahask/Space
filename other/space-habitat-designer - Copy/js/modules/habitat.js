// Habitat Module - Habitat creation and shape management
class HabitatManager {
    constructor(designer) {
        this.designer = designer;
        this.habitatGroup = null;
        this.habitatMaterial = null;
        this.wireframeMaterial = null;
        this.outlineGroup = null;
        this.habitatDisabled = true;
        this.habitatInitialized = false;
    }

    init() {
        // Create groups
        this.habitatGroup = new THREE.Group();
        this.designer.sceneManager.scene.add(this.habitatGroup);
        
        this.outlineGroup = new THREE.Group();
        this.designer.sceneManager.scene.add(this.outlineGroup);
    }

    createHabitat() {
        // Habitat shapes are disabled: ensure group is empty and proceed with floors only
        this.habitatGroup.clear();
        this.habitatMaterial = null;
        this.wireframeMaterial = null;
        this.refreshOutline();
        this.designer.floorsManager.buildFloors();
        this.updateHabitatInfo(true);
        this.habitatInitialized = true;
    }

    ensureHabitatExists() {
        if (!this.habitatInitialized) {
            this.createHabitat();
        }
    }

    updateHabitatInfo(forceZero = false) {
        let volume, surfaceArea;

        if (forceZero || this.habitatDisabled) {
            volume = 0;
            surfaceArea = 0;
        } else {
            switch (this.designer.currentShape) {
                case 'cylinder':
                    volume = Math.PI * this.designer.currentRadius * this.designer.currentRadius * this.designer.currentHeight;
                    surfaceArea = 2 * Math.PI * this.designer.currentRadius * this.designer.currentHeight + 
                                 2 * Math.PI * this.designer.currentRadius * this.designer.currentRadius;
                    break;
                case 'sphere':
                    volume = (4/3) * Math.PI * this.designer.currentRadius * this.designer.currentRadius * this.designer.currentRadius;
                    surfaceArea = 4 * Math.PI * this.designer.currentRadius * this.designer.currentRadius;
                    break;
                case 'cube':
                    volume = this.designer.currentRadius * 2 * this.designer.currentHeight * this.designer.currentRadius * 2;
                    surfaceArea = 2 * (this.designer.currentRadius * 2 * this.designer.currentHeight + 
                                     this.designer.currentRadius * 2 * this.designer.currentRadius * 2 + 
                                     this.designer.currentHeight * this.designer.currentRadius * 2);
                    break;
                case 'torus':
                    const R = this.designer.currentRadius;
                    const r = this.designer.currentRadius * 0.3;
                    volume = 2 * Math.PI * Math.PI * R * r * r;
                    surfaceArea = 4 * Math.PI * Math.PI * R * r;
                    break;
            }
        }

        const crewCapacity = volume ? Math.floor(volume / 20) : 0;

        document.getElementById('volume-display').textContent = Math.round(volume);
        document.getElementById('surface-display').textContent = Math.round(surfaceArea);
        document.getElementById('crew-display').textContent = crewCapacity;
    }

    setViewMode(mode) {
        this.designer.viewMode = mode;
        const showWire = mode === 'wire';
        const showOutline = mode === 'outline';
        // Habitat mesh (first mesh child) and its wireframe (line segments)
        this.habitatGroup.children.forEach(obj => {
            if (obj.isMesh) obj.visible = !this.habitatDisabled && !showWire && !showOutline; // visible only in solid when enabled
            if (obj.isLineSegments) obj.visible = !this.habitatDisabled && showWire;          // visible only in wire when enabled
        });
        if (this.outlineGroup) this.outlineGroup.visible = showOutline;
        this.refreshOutline();
    }

    refreshOutline() {
        if (!this.outlineGroup) return;
        while (this.outlineGroup.children.length) this.outlineGroup.remove(this.outlineGroup.children[0]);
        if (this.designer.viewMode !== 'outline' || this.habitatDisabled) return;
        const mesh = this.habitatGroup.children.find(o => o.isMesh);
        if (!mesh || !mesh.geometry) return;
        const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
        const theme = this.designer.utilsManager.getCurrentTheme();
        const edgeColor = theme === 'dark' ? 0x8ab4ff : 0x1e3a8a;
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: edgeColor }));
        this.outlineGroup.add(line);
    }
}
