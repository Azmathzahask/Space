// Utils Module - Helper functions and theme management
class UtilsManager {
    constructor(designer) {
        this.designer = designer;
    }

    getCurrentTheme() {
        const attr = document.documentElement.getAttribute('data-theme');
        return attr === 'dark' ? 'dark' : 'light';
    }

    applyThemeToWorkspace(theme) {
        // Palette mapped to themes
        const palettes = {
            dark: {
                background: 0x0b1220,
                grid1: 0x444444,
                grid2: 0x222222,
                accent: 0x00d4ff,
                ambientIntensity: 0.45,
                pointColor: 0x00d4ff
            },
            light: {
                background: 0xe9eef7,
                grid1: 0xbcc7dd,
                grid2: 0xd6deee,
                accent: 0x2563eb,
                ambientIntensity: 0.6,
                pointColor: 0x22d3ee
            }
        };

        const p = palettes[theme] || palettes.dark;

        if (this.designer.sceneManager.scene) {
            this.designer.sceneManager.scene.background = new THREE.Color(p.background);
        }
        if (this.designer.sceneManager.gridHelper) {
            this.designer.sceneManager.gridHelper.material.color = new THREE.Color(p.grid1);
            this.designer.sceneManager.gridHelper.material.vertexColors = false;
            // Recreate grid with new colors to ensure both major/minor lines update
            this.designer.sceneManager.addGrid();
        }
        if (this.designer.sceneManager.ambientLight) this.designer.sceneManager.ambientLight.intensity = p.ambientIntensity;
        if (this.designer.sceneManager.pointLight) this.designer.sceneManager.pointLight.color = new THREE.Color(p.pointColor);
        if (this.designer.habitatManager.habitatMaterial) this.designer.habitatManager.habitatMaterial.color = new THREE.Color(p.accent);
        if (this.designer.habitatManager.wireframeMaterial) this.designer.habitatManager.wireframeMaterial.color = new THREE.Color(p.accent);
        // Outline color
        if (this.designer.habitatManager.outlineGroup) {
            const edgeColor = theme === 'dark' ? 0x8ab4ff : 0x1e3a8a;
            this.designer.habitatManager.outlineGroup.children.forEach(line => {
                if (line.material && line.material.color) line.material.color = new THREE.Color(edgeColor);
            });
        }
        // Update floors theming
        if (this.designer.floorsManager.floorGroup) {
            const themeIsDark = theme === 'dark';
            const base = themeIsDark ? 0x0e1627 : 0xdfe6f3;
            const selected = themeIsDark ? 0x1f2a44 : 0xbfd0ef;
            this.designer.floorsManager.floorGroup.children.forEach((floorMesh, idx) => {
                const isSelected = idx === this.designer.floorsManager.selectedFloorIndex;
                floorMesh.material.color = new THREE.Color(isSelected ? selected : base);
                floorMesh.material.opacity = isSelected ? 0.35 : 0.25;
                floorMesh.material.transparent = true;
            });
        }
        // Update partition wall colors
        if (this.designer.floorsManager.floorPartitionsGroup) {
            const wallColor = theme === 'dark' ? 0x9fb7ff : 0x3b5bdb;
            this.designer.floorsManager.floorPartitionsGroup.traverse(n => {
                if (n.isMesh && n.material && n.material.color) {
                    n.material.color = new THREE.Color(wallColor);
                }
            });
        }
    }
}
