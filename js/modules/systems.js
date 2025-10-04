// Systems Module - Life support systems and auto-layout
class SystemsManager {
    constructor(designer) {
        this.designer = designer;
        this.systemsGroup = null;
        this.systems = [];
    }

    init() {
        // Create systems group
        this.systemsGroup = new THREE.Group();
        this.designer.sceneManager.scene.add(this.systemsGroup);
    }

    createSystem(systemType, position) {
        const systemColors = {
            'life-support': 0xff6b6b,
            'power': 0xffd93d,
            'waste': 0x6bcf7f,
            'thermal': 0x4d96ff,
            'communications': 0x9b59b6,
            'medical': 0xe74c3c,
            'sleep': 0x3498db,
            'exercise': 0xf39c12,
            'food': 0x1abc9c,
            'stowage': 0x95a5a6
        };

        const systemIcons = {
            'life-support': '🫁',
            'power': '⚡',
            'waste': '♻️',
            'thermal': '🌡️',
            'communications': '📡',
            'medical': '🏥',
            'sleep': '🛏️',
            'exercise': '💪',
            'food': '🍽️',
            'stowage': '📦'
        };

        // Create system geometry
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({
            color: systemColors[systemType],
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Add system label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#000000';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText(systemIcons[systemType] + ' ' + systemType.replace('-', ' '), canvas.width / 2, canvas.height / 2 + 8);

        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(labelMaterial);
        sprite.position.set(position.x, position.y + 2, position.z);
        sprite.scale.set(4, 1, 1);

        const systemGroup = new THREE.Group();
        systemGroup.add(mesh);
        systemGroup.add(sprite);
        systemGroup.userData = { type: systemType };

        return systemGroup;
    }

    autoLayout() {
        this.clearSystems();
        
        const enabledSystems = this.getEnabledSystems();
        if (enabledSystems.length === 0) return;

        const radius = this.designer.currentRadius * 0.8;
        const height = this.designer.currentHeight * 0.8;
        const angleStep = (2 * Math.PI) / enabledSystems.length;

        enabledSystems.forEach((systemType, index) => {
            const angle = index * angleStep;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const y = (Math.random() - 0.5) * height * 0.5;

            const system = this.createSystem(systemType, new THREE.Vector3(x, y, z));
            this.systemsGroup.add(system);
            this.systems.push(system);
        });

        this.updateSystemsCount();
    }

    clearSystems() {
        this.systemsGroup.clear();
        this.systems = [];
        this.updateSystemsCount();
    }

    getEnabledSystems() {
        const systemIds = [
            'life-support', 'power', 'waste', 'thermal', 'communications',
            'medical', 'sleep', 'exercise', 'food', 'stowage'
        ];

        return systemIds.filter(id => document.getElementById(id).checked);
    }

    updateSystemsCount() {
        document.getElementById('systems-count').textContent = this.systems.length;
    }
}
