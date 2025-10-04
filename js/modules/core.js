// Core Module - Main SpaceHabitatDesigner class and initialization
class SpaceHabitatDesigner {
    constructor() {
        // Initialize properties
        this.currentShape = 'cylinder';
        this.currentRadius = 10;
        this.currentHeight = 15;
        this.viewMode = 'solid';
        this.snapEnabled = true;
        this.isPlanner = false;

        // Initialize managers
        this.sceneManager = new SceneManager(this);
        this.habitatManager = new HabitatManager(this);
        this.systemsManager = new SystemsManager(this);
        this.floorsManager = new FloorsManager(this);
        this.furnitureManager = new FurnitureManager(this);
        this.plannerManager = new PlannerManager(this);
        this.uiManager = new UIManager(this);
        this.utilsManager = new UtilsManager(this);

        // Initialize the application
        this.init();
        this.uiManager.setupEventListeners();
        // Apply theme to Three.js scene once everything exists
        this.utilsManager.applyThemeToWorkspace(this.utilsManager.getCurrentTheme());
        this.animate();
        // Setup questionnaire UI after core init
        this.uiManager.setupQuestionnaireUI();
        // Lazy habitat creation: start empty
        this.habitatManager.habitatInitialized = false;
    }

    init() {
        // Initialize all managers
        this.sceneManager.init();
        this.habitatManager.init();
        this.systemsManager.init();
        this.floorsManager.init();
        this.furnitureManager.init();
        
        // Expose commonly used properties for backward compatibility
        this.scene = this.sceneManager.scene;
        this.camera = this.sceneManager.camera;
        this.renderer = this.sceneManager.renderer;
        this.controls = this.sceneManager.controls;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Rotate habitat slowly (pause rotation in planner or during drag for stability)
        if (!this.plannerManager.isPlanner && !this.furnitureManager.isDragging && !this.furnitureManager.layoutLocked) {
            this.habitatManager.habitatGroup.rotation.y += 0.005;
        }

        // Update furniture gravity (disabled during drag or when layout is locked)
        if (!this.furnitureManager.layoutLocked) {
            this.furnitureManager.updateGravity();
        }
        
        // Render the scene
        this.sceneManager.render();
    }
}
