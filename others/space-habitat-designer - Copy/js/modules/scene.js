// Scene Module - Three.js scene setup, lighting, and camera management
class SceneManager {
    constructor(designer) {
        this.designer = designer;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.ambientLight = null;
        this.directionalLight = null;
        this.pointLight = null;
        this.gridHelper = null;
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0c0c0c);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(30, 30, 30);

        // Create renderer
        const canvas = document.getElementById('habitat-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.designer.canvasElement = canvas;

        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Add lighting
        this.setupLighting();

        // Add grid
        this.addGrid();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(this.ambientLight);

        // Directional light
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 50, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 2048;
        this.directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(this.directionalLight);

        // Point light for accent
        this.pointLight = new THREE.PointLight(0x00d4ff, 0.5, 100);
        this.pointLight.position.set(-20, 20, -20);
        this.scene.add(this.pointLight);
    }

    addGrid() {
        if (this.gridHelper) this.scene.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
        this.gridHelper.position.y = -this.designer.currentHeight / 2;
        this.scene.add(this.gridHelper);
    }

    onWindowResize() {
        const canvas = document.getElementById('habitat-canvas');
        this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    }

    setView(viewType) {
        const distance = 50;
        
        switch (viewType) {
            case 'top':
                this.camera.position.set(0, distance, 0);
                this.camera.lookAt(0, 0, 0);
                break;
            case 'side':
                this.camera.position.set(distance, 0, 0);
                this.camera.lookAt(0, 0, 0);
                break;
            case 'front':
                this.camera.position.set(0, 0, distance);
                this.camera.lookAt(0, 0, 0);
                break;
            case 'reset':
                this.camera.position.set(30, 30, 30);
                this.camera.lookAt(0, 0, 0);
                break;
        }
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
