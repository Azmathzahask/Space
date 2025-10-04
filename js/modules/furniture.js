// Furniture Module - Object placement and management
class FurnitureManager {
    constructor(designer) {
        this.designer = designer;
        this.placementEnabled = false;
        this.placementObjectType = 'bed';
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.selectedObject = null;
        this.vibrantEnabled = false;
        this.activeDrops = [];
        this.clock = new THREE.Clock();
        this.furnitureKeyCounter = 0;
        
        // Drag and drop system
        this.isDragging = false;
        this.dragOffset = new THREE.Vector3();
        this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        this.dragStartPosition = new THREE.Vector3();
        this.dragStartRotation = new THREE.Euler();
        this.dragStartScale = new THREE.Vector3();
        this.lastDragTime = 0;
        this.dragCooldown = 100; // milliseconds
        
        // Selection system
        this.selectedObjects = new Set();
        this.selectionBox = null;
        this.selectionHelper = null;
        
        // Adjustment handles
        this.adjustmentHandles = null;
        this.handleSize = 0.3;
        this.isAdjusting = false;
        this.adjustmentMode = 'move'; // 'move', 'rotate', 'scale'
        
        // Attachment system
        this.attachmentPoints = [];
        this.attachmentConnections = [];
        this.snapDistance = 1.0;
        
        // Double-click system for stable layout
        this.lastClickTime = 0;
        this.doubleClickDelay = 300; // milliseconds
        this.lastClickPosition = new THREE.Vector2();
        this.clickTolerance = 5; // pixels
        
        // Layout stability system
        this.layoutLocked = false;
        this.placementCooldown = 500; // milliseconds between placements
        this.lastPlacementTime = 0;
        this.maxObjectsPerFloor = 50; // prevent overcrowding
        this.minObjectDistance = 0.5; // minimum distance between objects
    }

    init() {
        // Pointer events for placement and dragging
        const canvasEl = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (canvasEl) {
            // Pointer events (preferred)
            canvasEl.addEventListener('pointermove', (e) => this.onPointerMove(e));
            canvasEl.addEventListener('click', (e) => this.onCanvasClick(e));
            canvasEl.addEventListener('pointerdown', (e) => this.onPointerDown(e));
            canvasEl.addEventListener('pointerup', (e) => this.onPointerUp(e));
            canvasEl.addEventListener('contextmenu', (e) => this.onRightClick(e));
            
            // Mouse events (fallback)
            canvasEl.addEventListener('mousemove', (e) => this.onPointerMove(e));
            canvasEl.addEventListener('mousedown', (e) => this.onPointerDown(e));
            canvasEl.addEventListener('mouseup', (e) => this.onPointerUp(e));
            
            // Prevent default context menu
            canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
        } else {
            console.error('Canvas element not found!');
        }
        
        // Initialize selection helper
        this.initSelectionHelper();
        
        // Initialize adjustment handles
        this.initAdjustmentHandles();
    }

    togglePlacement() {
        this.placementEnabled = !this.placementEnabled;
        const btn = document.getElementById('toggle-placement');
        if (btn) btn.textContent = `Placement: ${this.placementEnabled ? 'On' : 'Off'}`;
        console.log(`Placement mode toggled: ${this.placementEnabled}`);
        
        // Update cursor to indicate placement mode
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (canvas) {
            if (this.placementEnabled) {
                canvas.style.cursor = 'crosshair';
                canvas.title = 'Double-click to place objects';
            } else {
                canvas.style.cursor = 'default';
                canvas.title = '';
            }
        }
        
        // When enabling placement, switch to top view for better insertion
        if (this.placementEnabled) {
            if (this.designer.floorsManager.selectedFloorIndex != null) {
                console.log(`Entering planner mode for floor ${this.designer.floorsManager.selectedFloorIndex}`);
                this.designer.plannerManager.enterPlannerMode();
            } else {
                console.log('No floor selected, switching to top view');
                this.designer.sceneManager.setView('top');
            }
        } else if (this.designer.plannerManager.isPlanner) {
            // When disabling placement, exit planner
            console.log('Exiting planner mode');
            this.designer.plannerManager.exitPlannerMode();
        }
    }

    onPointerMove(event) {
        const rect = this.designer.sceneManager.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Handle dragging
        if (this.isDragging && this.selectedObject) {
            this.updateDrag();
        } else {
            // Check for hover effects when not dragging
            this.updateHoverEffects();
        }
        
        // Update adjustment handles position
        if (this.adjustmentHandles && this.adjustmentHandles.visible && this.selectedObject) {
            this.adjustmentHandles.position.copy(this.selectedObject.position);
        }
    }

    onCanvasClick(event) {
        // Prevent all clicks during drag operations
        if (this.isDragging) {
            console.log('Ignoring click during drag operation');
            return;
        }
        
        const currentTime = Date.now();
        const currentPosition = new THREE.Vector2(this.pointer.x, this.pointer.y);
        
        // Check if this is a double-click
        const isDoubleClick = (currentTime - this.lastClickTime) < this.doubleClickDelay && 
                             currentPosition.distanceTo(this.lastClickPosition) < this.clickTolerance;
        
        // Update click tracking
        this.lastClickTime = currentTime;
        this.lastClickPosition.copy(currentPosition);
        
        console.log(`Canvas click - placementEnabled: ${this.placementEnabled}, isPlanner: ${this.designer.plannerManager.isPlanner}, selectedFloorIndex: ${this.designer.floorsManager.selectedFloorIndex}, isDoubleClick: ${isDoubleClick}`);
        
        // Check if clicking on furniture objects first
        const furnitureHits = this.getFurnitureIntersections();
        if (furnitureHits.length > 0) {
            const clickedObject = furnitureHits[0].object;
            const parentObject = this.findParentFurnitureObject(clickedObject);
            if (parentObject) {
                this.selectObject(parentObject, event.ctrlKey || event.metaKey);
                return;
            }
        }
        
        // Check if clicking on adjustment handles
        if (this.adjustmentHandles && this.adjustmentHandles.visible) {
            const handleHits = this.raycaster.intersectObject(this.adjustmentHandles, true);
            if (handleHits.length > 0) {
                this.handleAdjustmentClick(handleHits[0].object);
                return;
            }
        }
        
        const hits = this.getIntersections();
        
        // Find the best floor hit - prioritize the one closest to camera or most visible
        let floorHit = null;
        if (hits.length > 0) {
            // If we have multiple hits, pick the one that's most appropriate
            // Priority: 1) Selected floor if visible, 2) Closest to camera, 3) First hit
            const selectedFloor = this.designer.floorsManager.selectedFloorIndex;
            if (selectedFloor !== null) {
                // Try to find the selected floor first
                floorHit = hits.find(h => h.object && h.object.parent === this.designer.floorsManager.floorGroup && h.object.userData.floorIndex === selectedFloor);
            }
            
            // If no selected floor hit, pick the closest to camera
            if (!floorHit) {
                floorHit = hits.find(h => h.object && h.object.parent === this.designer.floorsManager.floorGroup);
            }
        }
        
        if (floorHit) {
            const idx = floorHit.object.userData.floorIndex;
            console.log(`Floor hit detected! Floor index: ${idx}, Floor position Y: ${floorHit.object.position.y}, Distance: ${floorHit.distance}`);
            this.designer.floorsManager.setSelectedFloor(idx);
            
            // Only place objects on double-click when placement is enabled
            if (this.placementEnabled && isDoubleClick) {
                const p = floorHit.point;
                if (this.designer.plannerManager.isPlanner && this.designer.plannerManager.snapEnabled) {
                    p.x = Math.round(p.x);
                    p.z = Math.round(p.z);
                }
                console.log(`Double-click: Placing furniture on floor ${idx} at point:`, p);
                this.placeObjectAt(p, idx);
            } else if (this.placementEnabled && !isDoubleClick) {
                console.log('Single click detected - double-click required for object placement');
                this.showPlacementHint();
            }
        } else if (this.placementEnabled && this.designer.floorsManager.selectedFloorIndex !== null && isDoubleClick) {
            // If placement is enabled and we have a selected floor, use that floor (only on double-click)
            const selectedFloorIdx = this.designer.floorsManager.selectedFloorIndex;
            console.log(`No floor hit detected, but placement enabled and floor ${selectedFloorIdx} is selected. Using selected floor.`);
            
            // Project the click point onto the selected floor
            const selectedFloor = this.designer.floorsManager.floorGroup.children[selectedFloorIdx];
            if (selectedFloor) {
                // Create a plane at the selected floor level
                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -selectedFloor.position.y);
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(this.pointer, this.designer.sceneManager.camera);
                const intersectionPoint = new THREE.Vector3();
                raycaster.ray.intersectPlane(plane, intersectionPoint);
                
                if (intersectionPoint) {
                    const p = intersectionPoint;
                    if (this.designer.plannerManager.isPlanner && this.designer.plannerManager.snapEnabled) {
                        p.x = Math.round(p.x);
                        p.z = Math.round(p.z);
                    }
                    console.log(`Double-click: Placing furniture on selected floor ${selectedFloorIdx} at projected point:`, p);
                    this.placeObjectAt(p, selectedFloorIdx);
                }
            }
        } else {
            console.log('No floor hit detected, checking partitions...');
            // Click on partition walls to select nearest floor
            const partHits = this.raycaster.intersectObjects(this.designer.floorsManager.floorPartitionsGroup.children, true);
            if (partHits && partHits.length) {
                const y = partHits[0].point.y;
                let nearest = 0, best = Infinity;
                this.designer.floorsManager.floorGroup.children.forEach((f, i) => {
                    const d = Math.abs(f.position.y - y);
                    if (d < best) { best = d; nearest = i; }
                });
                console.log(`Partition hit detected! Nearest floor: ${nearest}`);
                this.designer.floorsManager.setSelectedFloor(nearest);
            } else {
                console.log('No partition hit either');
            }
        }
    }

    getIntersections() {
        this.raycaster.setFromCamera(this.pointer, this.designer.sceneManager.camera);
        const hits = this.raycaster.intersectObjects(this.designer.floorsManager.floorGroup.children, true);
        console.log(`Raycasting found ${hits.length} hits`);
        
        // Sort hits by distance (closest first) and log them
        const sortedHits = hits.sort((a, b) => a.distance - b.distance);
        sortedHits.forEach((hit, i) => {
            const floorIndex = hit.object.userData.floorIndex;
            const isFlooring = hit.object.userData.isFlooring;
            console.log(`Hit ${i}: floor ${floorIndex}, isFlooring: ${isFlooring}, distance: ${hit.distance}, point:`, hit.point);
        });
        
        return sortedHits;
    }

    placeObjectAt(worldPoint, floorIdx) {
        // Prevent object placement during drag operations
        if (this.isDragging) {
            console.log('Cannot place objects during drag operation');
            return;
        }
        
        // Validate placement position for layout stability
        if (!this.validatePlacementPosition(worldPoint, floorIdx)) {
            this.showPlacementError('Cannot place object at this location');
            return;
        }
        
        console.log(`placeObjectAt called with floorIdx: ${floorIdx}, worldPoint:`, worldPoint);
        console.log(`Available floors:`, this.designer.floorsManager.floorGroup.children.map((f, i) => `Floor ${i}: Y=${f.position.y}`));
        
        // Update placement time for cooldown
        this.lastPlacementTime = Date.now();
        
        const theme = this.designer.utilsManager.getCurrentTheme();
        const prefab = this.createFurniturePrefab(this.placementObjectType, theme);
        prefab.position.copy(worldPoint);
        const floor = this.designer.floorsManager.floorGroup.children[floorIdx];
        
        if (!floor) {
            console.error(`Floor ${floorIdx} not found! Available floors: ${this.designer.floorsManager.floorGroup.children.length}`);
            return;
        }
        
        const floorY = floor.position.y;
        const bbox = new THREE.Box3().setFromObject(prefab);
        const height = bbox.max.y - bbox.min.y;
        const yOffset = height / 2;
        // Spawn slightly above, then let gravity settle
        const floorTop = floorY + this.designer.floorsManager.floorThickness / 2;
        prefab.position.y = floorTop + yOffset + 2;
        // Assign unique key and lock to floor
        const furnitureKey = `furniture_${this.furnitureKeyCounter++}_floor_${floorIdx}`;
        prefab.userData = Object.assign({}, prefab.userData, { 
            floorIndex: floorIdx, 
            furnitureKey: furnitureKey,
            lockedFloor: floorIdx,
            furnitureType: this.placementObjectType
        });
        console.log(`Placed ${this.placementObjectType} on floor ${floorIdx} with key ${furnitureKey} at Y=${prefab.position.y} (floor Y=${floorY}, floorTop=${floorTop})`);
        this.designer.floorsManager.floorObjectsGroup.add(prefab);
        this.selectedObject = prefab;
        
        // Create attachment points for the new object
        this.createAttachmentPoints(prefab);
        
        // Begin drop
        this.activeDrops.push({ obj: prefab, vy: 0 });
        
        // Show success feedback
        this.showPlacementSuccess();
    }

    getFurnitureColor(theme) {
        if (!this.vibrantEnabled) return theme === 'dark' ? 0xffc857 : 0x2563eb;
        // Cycle vibrant colors for variety
        const palette = [0xef4444, 0xf59e0b, 0x10b981, 0x06b6d4, 0x8b5cf6, 0xec4899, 0x84cc16];
        const idx = this.designer.floorsManager.floorObjectsGroup.children.length % palette.length;
        return palette[idx];
    }

    toggleVibrantColors(btn) {
        this.vibrantEnabled = !this.vibrantEnabled;
        if (btn) btn.textContent = `Vibrant Colors: ${this.vibrantEnabled ? 'On' : 'Off'}`;
        // Recolor floors
        this.designer.floorsManager.buildFloors();
        // Recolor existing furniture
        const theme = this.designer.utilsManager.getCurrentTheme();
        this.designer.floorsManager.floorObjectsGroup.children.forEach((obj, i) => {
            // Skip realistic furniture that manages its own materials
            if (obj.userData && obj.userData.allowRecolor === false) return;
            const palette = [0xef4444, 0xf59e0b, 0x10b981, 0x06b6d4, 0x8b5cf6, 0xec4899, 0x84cc16];
            const color = this.vibrantEnabled ? palette[i % palette.length] : (theme === 'dark' ? 0xffc857 : 0x2563eb);
            if (obj.material) obj.material.color = new THREE.Color(color);
            if (obj.children) {
                obj.traverse(n => { if (n.isMesh && n.material && n.material.color) n.material.color = new THREE.Color(color); });
            }
        });
    }

    createFurniturePrefab(type, theme) {
        const group = new THREE.Group();
        const metal = (color = 0xb0b8c2, metalness = 0.8, roughness = 0.3) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
        const wood = (color = 0x8b5a2b, roughness = 0.7) => new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness });
        const fabric = (color = theme === 'dark' ? 0x2b3142 : 0xd7dee9) => new THREE.MeshStandardMaterial({ color, metalness: 0.0, roughness: 0.9 });
        const plastic = (color = 0xf0f3f9) => new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.6 });

        const addLegs = (parent, legRadius, legHeight, positions, mat) => {
            positions.forEach(([x, z]) => {
                const geo = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 16);
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(x, legHeight / 2, z);
                mesh.castShadow = true; mesh.receiveShadow = true;
                parent.add(mesh);
            });
        };

        switch (type) {
            case 'bed': {
                // Frame
                const frameGeo = new THREE.BoxGeometry(2.1, 0.2, 1.1);
                const frame = new THREE.Mesh(frameGeo, wood(0x7b4e2e));
                frame.position.y = 0.1;
                frame.castShadow = true; frame.receiveShadow = true;
                group.add(frame);
                // Mattress
                const mattressGeo = new THREE.BoxGeometry(2.0, 0.25, 1.0);
                const mattress = new THREE.Mesh(mattressGeo, fabric(theme === 'dark' ? 0x3b4861 : 0xe9f0fb));
                mattress.position.y = 0.35;
                mattress.castShadow = true; mattress.receiveShadow = true;
                group.add(mattress);
                // Pillows
                const pillowMat = fabric(theme === 'dark' ? 0xbcd7ff : 0x9fb7ff);
                const pillowGeo = new THREE.BoxGeometry(0.5, 0.15, 0.35);
                const pillow1 = new THREE.Mesh(pillowGeo, pillowMat);
                pillow1.position.set(-0.55, 0.5, -0.2);
                const pillow2 = pillow1.clone();
                pillow2.position.z = 0.2;
                [pillow1, pillow2].forEach(p => { p.castShadow = true; p.receiveShadow = true; group.add(p); });
                // Headboard
                const headGeo = new THREE.BoxGeometry(0.08, 0.9, 1.1);
                const head = new THREE.Mesh(headGeo, wood(0x6a4024));
                head.position.set(-1.05, 0.55, 0);
                head.castShadow = true; head.receiveShadow = true;
                group.add(head);
                group.userData.allowRecolor = false;
                break;
            }
            case 'table': {
                // Top
                const topGeo = new THREE.BoxGeometry(1.6, 0.08, 1.0);
                const top = new THREE.Mesh(topGeo, wood(0x8c6239));
                top.position.y = 0.8;
                top.castShadow = true; top.receiveShadow = true;
                group.add(top);
                // Legs
                const legMat = metal(0x9aa3ad, 0.7, 0.35);
                const offsetX = 1.6/2 - 0.1, offsetZ = 1.0/2 - 0.1;
                addLegs(group, 0.05, 0.8, [
                    [ offsetX,  offsetZ],
                    [-offsetX,  offsetZ],
                    [ offsetX, -offsetZ],
                    [-offsetX, -offsetZ]
                ], legMat);
                group.userData.allowRecolor = false;
                break;
            }
            case 'chair': {
                // Seat
                const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), fabric(theme === 'dark' ? 0x43516a : 0xcfd8e6));
                seat.position.y = 0.5;
                seat.castShadow = true; seat.receiveShadow = true;
                group.add(seat);
                // Backrest
                const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), fabric(theme === 'dark' ? 0x43516a : 0xcfd8e6));
                back.position.set(0, 0.8, -0.22);
                back.castShadow = true; back.receiveShadow = true;
                group.add(back);
                // Legs
                const legMat = metal(0x9aa3ad);
                addLegs(group, 0.03, 0.5, [
                    [ 0.22,  0.22],
                    [-0.22,  0.22],
                    [ 0.22, -0.22],
                    [-0.22, -0.22]
                ], legMat);
                group.userData.allowRecolor = false;
                break;
            }
            case 'storage': {
                // Body
                const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.6), plastic(theme === 'dark' ? 0x2e3440 : 0xf5f7fa));
                body.position.y = 0.7;
                body.castShadow = true; body.receiveShadow = true;
                group.add(body);
                // Doors
                const doorMat = plastic(theme === 'dark' ? 0x3b4252 : 0xeaeef5);
                const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.25, 0.02), doorMat);
                const doorR = doorL.clone();
                doorL.position.set(-0.26, 0.72, 0.31);
                doorR.position.set( 0.26, 0.72, 0.31);
                // Handles
                const handleMat = metal(0xd6dee6, 0.9, 0.25);
                const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 16), handleMat);
                const handleR = handleL.clone();
                handleL.rotation.z = Math.PI / 2; handleR.rotation.z = Math.PI / 2;
                handleL.position.set(-0.1, 0.72, 0.34);
                handleR.position.set( 0.1, 0.72, 0.34);
                [doorL, doorR, handleL, handleR].forEach(m => { m.castShadow = true; m.receiveShadow = true; group.add(m); });
                group.userData.allowRecolor = false;
                break;
            }
            case 'sphere': {
                const size = 1.5;
                const mesh = new THREE.Mesh(new THREE.SphereGeometry(size * 0.75, 24, 16), new THREE.MeshPhongMaterial({ color: this.getFurnitureColor(theme) }));
                mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
                group.userData.allowRecolor = true;
                break;
            }
            case 'cylinder': {
                const size = 1.5;
                const mesh = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.6, size * 0.6, size * 1.5, 24), new THREE.MeshPhongMaterial({ color: this.getFurnitureColor(theme) }));
                mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
                group.userData.allowRecolor = true;
                break;
            }
            case 'cube':
            default: {
                const size = 1.5;
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshPhongMaterial({ color: this.getFurnitureColor(theme) }));
                mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
                group.userData.allowRecolor = true;
                break;
            }
        }

        // Small emissive accents for Futuristic style via palette change
        const stored = localStorage.getItem('shd-msq');
        if (stored) {
            try {
                const sel = JSON.parse(stored);
                if (sel && sel.style === 'Futuristic') {
                    group.traverse(n => {
                        if (n.isMesh && n.material && 'emissive' in n.material) {
                            n.material.emissive = new THREE.Color(0x004b6b);
                            n.material.emissiveIntensity = 0.15;
                        }
                    });
                }
            } catch {}
        }

        return group;
    }


    clearSelectedFloorObjects() {
        if (this.designer.floorsManager.selectedFloorIndex == null) return;
        const toRemove = this.designer.floorsManager.floorObjectsGroup.children.filter(o => {
            const lockedFloor = o.userData && o.userData.lockedFloor != null ? o.userData.lockedFloor : 
                               (o.userData && o.userData.floorIndex != null ? o.userData.floorIndex : -1);
            return lockedFloor === this.designer.floorsManager.selectedFloorIndex;
        });
        toRemove.forEach(o => this.designer.floorsManager.floorObjectsGroup.remove(o));
    }

    updateFurniturePositions() {
        // Force update all furniture positions to match their locked floors
        if (this.designer.floorsManager.floorObjectsGroup && this.designer.floorsManager.floorGroup) {
            this.designer.floorsManager.floorObjectsGroup.children.forEach(obj => {
                if (!obj || !obj.parent) return;
                const lockedFloor = obj.userData && obj.userData.lockedFloor != null ? obj.userData.lockedFloor : 
                                   (obj.userData && obj.userData.floorIndex != null ? obj.userData.floorIndex : 0);
                const floor = this.designer.floorsManager.floorGroup.children[lockedFloor];
                if (!floor) return;
                const bbox = new THREE.Box3().setFromObject(obj);
                const h = bbox.max.y - bbox.min.y;
                const floorTop = floor.position.y + this.designer.floorsManager.floorThickness / 2;
                const target = floorTop + h / 2;
                obj.position.y = target;
                console.log(`Updated furniture ${obj.userData.furnitureKey} position to floor ${lockedFloor} at Y=${target}`);
            });
        }
    }

    updateGravity() {
        // Check for and remove duplicates continuously
        this.removeDuplicates();
        
        // COMPLETELY DISABLE gravity system during drag to prevent layout changes
        if (this.isDragging) {
            return;
        }
        
        // Simple gravity drop for placed objects
        const dt = Math.min(0.033, this.clock.getDelta());
        if (this.activeDrops.length) {
            const g = -9.8; // m/s^2
            this.activeDrops = this.activeDrops.filter(entry => {
                const { obj, vy } = entry;
                let newVy = vy + g * dt;
                obj.position.y += newVy * dt;
                // Determine target floor top - use lockedFloor
                const lockedFloor = obj.userData && obj.userData.lockedFloor != null ? obj.userData.lockedFloor : 
                                   (obj.userData && obj.userData.floorIndex != null ? obj.userData.floorIndex : null);
                if (lockedFloor == null) {
                    return false;
                }
                const fidx = lockedFloor;
                const floor = this.designer.floorsManager.floorGroup.children[fidx];
                if (!floor) return false;
                const bbox = new THREE.Box3().setFromObject(obj);
                const objHeight = bbox.max.y - bbox.min.y;
                const floorTop = floor.position.y + this.designer.floorsManager.floorThickness / 2;
                const targetY = floorTop + objHeight / 2;
                if (obj.position.y <= targetY) {
                    obj.position.y = targetY;
                    console.log(`Furniture ${obj.userData.furnitureKey} settled on floor ${fidx} at Y=${targetY} (floor Y=${floor.position.y}, floorTop=${floorTop})`);
                    return false; // stop dropping
                }
                entry.vy = newVy;
                return true;
            });
        }

        // Stick furniture to flooring even if floors move (e.g., focus animation)
        if (this.designer.floorsManager.floorObjectsGroup && this.designer.floorsManager.floorGroup) {
            this.designer.floorsManager.floorObjectsGroup.children.forEach(obj => {
                if (!obj || !obj.parent) return;
                
                // Skip if object is currently dropping
                const dropping = this.activeDrops.find(d => d.obj === obj);
                if (dropping) return;
                
                // Skip if object is marked as stable (recently dragged)
                if (obj.userData && obj.userData.isStable) {
                    // Only update if the floor has moved significantly
                    const lockedFloor = obj.userData && obj.userData.lockedFloor != null ? obj.userData.lockedFloor : 
                                       (obj.userData && obj.userData.floorIndex != null ? obj.userData.floorIndex : 0);
                    const floor = this.designer.floorsManager.floorGroup.children[lockedFloor];
                    if (floor && obj.userData.lastStablePosition) {
                        const floorMovement = Math.abs(floor.position.y - obj.userData.lastStableFloorY);
                        if (floorMovement > 0.1) {
                            // Floor has moved, update stable position
                            this.setStableObjectPosition(obj);
                        }
                    }
                    return;
                }
                
                // Use lockedFloor if available, otherwise fallback to floorIndex
                const lockedFloor = obj.userData && obj.userData.lockedFloor != null ? obj.userData.lockedFloor : 
                                   (obj.userData && obj.userData.floorIndex != null ? obj.userData.floorIndex : 0);
                const floor = this.designer.floorsManager.floorGroup.children[lockedFloor];
                if (!floor) return;
                const bbox = new THREE.Box3().setFromObject(obj);
                const h = bbox.max.y - bbox.min.y;
                const floorTop = floor.position.y + this.designer.floorsManager.floorThickness / 2;
                const target = floorTop + h / 2;
                const dy = target - obj.position.y;
                if (Math.abs(dy) > 0.001) {
                    obj.position.y += Math.sign(dy) * Math.min(Math.abs(dy), 0.05);
                    if (Math.abs(target - obj.position.y) <= 0.002) {
                        obj.position.y = target;
                        console.log(`Furniture ${obj.userData.furnitureKey} stuck to floor ${lockedFloor} at Y=${target}`);
                    }
                }
            });
        }
    }

    // New event handlers for drag and drop
    onPointerDown(event) {
        if (event.button !== 0) return; // Only left mouse button
        
        // Prevent multiple drag operations
        if (this.isDragging) {
            console.log('Already dragging, ignoring pointer down');
            return;
        }
        
        const furnitureHits = this.getFurnitureIntersections();
        if (furnitureHits.length > 0) {
            const clickedObject = furnitureHits[0].object;
            // Find the parent group if we clicked on a child mesh
            const parentObject = this.findParentFurnitureObject(clickedObject);
            if (parentObject) {
                // Prevent default to avoid any browser interference
                event.preventDefault();
                event.stopPropagation();
                this.startDrag(parentObject, event);
            }
        }
    }

    onPointerUp(event) {
        if (this.isDragging) {
            event.preventDefault();
            event.stopPropagation();
            this.endDrag();
        }
    }

    onRightClick(event) {
        event.preventDefault();
        const furnitureHits = this.getFurnitureIntersections();
        if (furnitureHits.length > 0) {
            const clickedObject = furnitureHits[0].object;
            const parentObject = this.findParentFurnitureObject(clickedObject);
            if (parentObject) {
                this.showContextMenu(parentObject, event);
            }
        }
    }

    // Furniture intersection detection
    getFurnitureIntersections() {
        this.raycaster.setFromCamera(this.pointer, this.designer.sceneManager.camera);
        return this.raycaster.intersectObjects(this.designer.floorsManager.floorObjectsGroup.children, true);
    }

    // Helper to find the parent furniture object when clicking on child meshes
    findParentFurnitureObject(object) {
        let current = object;
        while (current) {
            // Check if this is a furniture object (has furnitureKey in userData)
            if (current.userData && current.userData.furnitureKey) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    // Hover effects for better user feedback
    updateHoverEffects() {
        const furnitureHits = this.getFurnitureIntersections();
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        
        if (furnitureHits.length > 0 && !this.isDragging) {
            // Show grab cursor when hovering over draggable objects
            if (canvas) {
                canvas.style.cursor = 'grab';
            }
        } else if (canvas && !this.isDragging) {
            // Show default cursor when not hovering over objects
            canvas.style.cursor = 'default';
        }
    }

    // Remove duplicate objects
    removeDuplicates() {
        if (!this.designer.floorsManager.floorObjectsGroup) return;
        
        const objects = this.designer.floorsManager.floorObjectsGroup.children;
        const seenKeys = new Set();
        const duplicates = [];
        
        // Find duplicates by furniture key
        objects.forEach(obj => {
            if (obj.userData && obj.userData.furnitureKey) {
                const key = obj.userData.furnitureKey;
                if (seenKeys.has(key)) {
                    duplicates.push(obj);
                } else {
                    seenKeys.add(key);
                }
            }
        });
        
        // Remove duplicates
        if (duplicates.length > 0) {
            console.log(`Removing ${duplicates.length} duplicate objects`);
            duplicates.forEach(dup => {
                this.designer.floorsManager.floorObjectsGroup.remove(dup);
            });
        }
    }

    // Selection system
    selectObject(object, multiSelect = false) {
        if (!multiSelect) {
            this.clearSelection();
        }
        
        this.selectedObjects.add(object);
        this.selectedObject = object;
        this.updateSelectionVisuals();
        this.showAdjustmentHandles(object);
        this.updateUIState();
    }

    clearSelection() {
        this.selectedObjects.clear();
        this.selectedObject = null;
        this.hideAdjustmentHandles();
        this.updateSelectionVisuals();
        this.updateUIState();
    }

    updateSelectionVisuals() {
        // Update visual indicators for selected objects
        this.designer.floorsManager.floorObjectsGroup.children.forEach(obj => {
            const isSelected = this.selectedObjects.has(obj);
            obj.traverse(child => {
                if (child.isMesh) {
                    if (isSelected) {
                        child.material.emissive = new THREE.Color(0x444444);
                        child.material.emissiveIntensity = 0.2;
                    } else {
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                }
            });
        });
    }

    // Drag and drop system
    startDrag(object, event) {
        const currentTime = Date.now();
        
        // Prevent rapid drag operations
        if (currentTime - this.lastDragTime < this.dragCooldown) {
            console.log('Drag cooldown active, ignoring drag start');
            return;
        }
        
        console.log('Starting drag for object:', object.userData.furnitureKey);
        
        // Prevent dragging if already dragging
        if (this.isDragging) {
            console.log('Already dragging, ignoring new drag start');
            return;
        }
        
        this.isDragging = true;
        this.selectedObject = object;
        this.lastDragTime = currentTime;
        
        // Clear stable flag when starting drag
        if (object.userData) {
            object.userData.isStable = false;
        }
        
        // Disable ALL scene interactions during drag
        if (this.designer.sceneManager.controls) {
            this.designer.sceneManager.controls.enabled = false;
        }
        
        // Disable habitat rotation completely during drag
        this.designer.habitatManager.habitatGroup.rotation.y = this.designer.habitatManager.habitatGroup.rotation.y;
        
        // Store initial state
        this.dragStartPosition.copy(object.position);
        this.dragStartRotation.copy(object.rotation);
        this.dragStartScale.copy(object.scale);
        
        // Store initial mouse position for simple drag calculation
        this.dragStartMousePosition = new THREE.Vector2(this.pointer.x, this.pointer.y);
        
        // Minimal visual feedback - just cursor change
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (canvas) {
            canvas.style.cursor = 'grabbing';
        }
        
        console.log('Started dragging object:', object.userData.furnitureKey);
    }

    endDrag() {
        if (!this.isDragging) return;
        
        console.log('Ending drag for object:', this.selectedObject?.userData?.furnitureKey);
        
        this.isDragging = false;
        
        // Re-enable camera controls after drag
        if (this.designer.sceneManager.controls) {
            this.designer.sceneManager.controls.enabled = true;
        }
        
        // Restore cursor
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (canvas) {
            canvas.style.cursor = 'default';
        }
        
        // Ensure object is properly positioned and not duplicated
        if (this.selectedObject) {
            // Make sure object is still in the correct parent group
            if (!this.selectedObject.parent || this.selectedObject.parent !== this.designer.floorsManager.floorObjectsGroup) {
                console.log('Re-adding object to floor objects group');
                // Remove from any other parent first
                if (this.selectedObject.parent) {
                    this.selectedObject.parent.remove(this.selectedObject);
                }
                this.designer.floorsManager.floorObjectsGroup.add(this.selectedObject);
            }
            
            // Ensure object is visible and not duplicated
            this.selectedObject.visible = true;
            
            // Check for duplicates and remove them
            const objectKey = this.selectedObject.userData.furnitureKey;
            const duplicates = this.designer.floorsManager.floorObjectsGroup.children.filter(obj => 
                obj !== this.selectedObject && obj.userData && obj.userData.furnitureKey === objectKey
            );
            if (duplicates.length > 0) {
                console.log('Removing duplicate objects:', duplicates.length);
                duplicates.forEach(dup => {
                    this.designer.floorsManager.floorObjectsGroup.remove(dup);
                });
            }
            
            // Validate final position and ensure it's within bounds
            this.validateAndFixDragPosition(this.selectedObject);
            
            // Snap to grid if enabled
            if (this.designer.plannerManager.snapEnabled) {
                this.selectedObject.position.x = Math.round(this.selectedObject.position.x);
                this.selectedObject.position.z = Math.round(this.selectedObject.position.z);
            }
            
            // Set final position without triggering gravity updates
            this.setStableObjectPosition(this.selectedObject);
        }
        
        // Clear selection to prevent interference
        this.selectedObject = null;
        
        console.log('Finished dragging object');
    }

    getDragIntersection() {
        this.raycaster.setFromCamera(this.pointer, this.designer.sceneManager.camera);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
        return intersection;
    }

    updateDrag() {
        if (!this.selectedObject || !this.isDragging || !this.dragStartMousePosition) {
            return;
        }
        
        // Simple drag based on mouse movement
        const mouseDelta = new THREE.Vector2(
            this.pointer.x - this.dragStartMousePosition.x,
            this.pointer.y - this.dragStartMousePosition.y
        );
        
        // Convert mouse delta to world movement
        const movementScale = 10; // Adjust this to make dragging more/less sensitive
        const newPosition = this.dragStartPosition.clone();
        newPosition.x += mouseDelta.x * movementScale;
        newPosition.z -= mouseDelta.y * movementScale; // Invert Y for intuitive movement
        
        // Constrain to floor bounds if needed
        const floor = this.designer.floorsManager.floorGroup.children[this.selectedObject.userData.lockedFloor || 0];
        if (floor) {
            const radius = this.designer.currentRadius * 0.8;
            newPosition.x = Math.max(-radius, Math.min(radius, newPosition.x));
            newPosition.z = Math.max(-radius, Math.min(radius, newPosition.z));
        }
        
        // Update position
        this.selectedObject.position.copy(newPosition);
    }

    // Visual feedback during drag
    addDragVisualFeedback(object) {
        // Make the object slightly transparent and add a glow effect
        object.traverse(child => {
            if (child.isMesh && child.material) {
                // Store original material properties
                if (!child.userData.originalOpacity) {
                    child.userData.originalOpacity = child.material.opacity;
                    child.userData.originalTransparent = child.material.transparent;
                }
                
                child.material.transparent = true;
                child.material.opacity = 0.9; // Less transparent to keep visibility
                child.material.emissive = new THREE.Color(0x444444);
                child.material.emissiveIntensity = 0.3;
            }
        });
        
        // Ensure object remains visible
        object.visible = true;
        
        // Add cursor style to indicate dragging
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (canvas) {
            canvas.style.cursor = 'grabbing';
        }
    }

    removeDragVisualFeedback() {
        if (this.selectedObject) {
            // Restore normal appearance
            this.selectedObject.traverse(child => {
                if (child.isMesh && child.material) {
                    // Restore original properties if they were stored
                    if (child.userData.originalOpacity !== undefined) {
                        child.material.opacity = child.userData.originalOpacity;
                        child.material.transparent = child.userData.originalTransparent;
                    } else {
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                    }
                    child.material.emissive = new THREE.Color(0x444444);
                    child.material.emissiveIntensity = 0.2;
                }
            });
            
            // Ensure object remains visible
            this.selectedObject.visible = true;
        }
        
        // Restore normal cursor
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (canvas) {
            canvas.style.cursor = 'default';
        }
    }

    // Adjustment handles system
    initAdjustmentHandles() {
        if (!this.designer.scene) {
            console.error('Scene not available for adjustment handles');
            return;
        }
        this.adjustmentHandles = new THREE.Group();
        this.designer.scene.add(this.adjustmentHandles);
        this.hideAdjustmentHandles();
    }

    showAdjustmentHandles(object) {
        if (!object) return;
        
        this.hideAdjustmentHandles();
        
        // Create move handles (arrows)
        this.createMoveHandles(object);
        
        // Create rotate handles (circles)
        this.createRotateHandles(object);
        
        // Create scale handles (boxes)
        this.createScaleHandles(object);
        
        this.adjustmentHandles.visible = true;
        this.adjustmentHandles.position.copy(object.position);
    }

    hideAdjustmentHandles() {
        if (this.adjustmentHandles) {
            this.adjustmentHandles.clear();
            this.adjustmentHandles.visible = false;
        }
    }

    createMoveHandles(object) {
        const handleGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        
        // X-axis handle
        const xHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        xHandle.position.set(this.handleSize, 0, 0);
        xHandle.rotation.z = -Math.PI / 2;
        xHandle.userData = { type: 'move', axis: 'x' };
        this.adjustmentHandles.add(xHandle);
        
        // Y-axis handle
        const yHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        yHandle.position.set(0, this.handleSize, 0);
        yHandle.userData = { type: 'move', axis: 'y' };
        this.adjustmentHandles.add(yHandle);
        
        // Z-axis handle
        const zHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        zHandle.position.set(0, 0, this.handleSize);
        zHandle.rotation.x = Math.PI / 2;
        zHandle.userData = { type: 'move', axis: 'z' };
        this.adjustmentHandles.add(zHandle);
    }

    createRotateHandles(object) {
        const handleGeometry = new THREE.TorusGeometry(this.handleSize * 1.2, 0.05, 8, 16);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        // X-axis rotation handle
        const xHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        xHandle.rotation.z = Math.PI / 2;
        xHandle.userData = { type: 'rotate', axis: 'x' };
        this.adjustmentHandles.add(xHandle);
        
        // Y-axis rotation handle
        const yHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        yHandle.userData = { type: 'rotate', axis: 'y' };
        this.adjustmentHandles.add(yHandle);
        
        // Z-axis rotation handle
        const zHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        zHandle.rotation.x = Math.PI / 2;
        zHandle.userData = { type: 'rotate', axis: 'z' };
        this.adjustmentHandles.add(zHandle);
    }

    createScaleHandles(object) {
        const handleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        
        // X-axis scale handle
        const xHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        xHandle.position.set(this.handleSize * 1.5, 0, 0);
        xHandle.userData = { type: 'scale', axis: 'x' };
        this.adjustmentHandles.add(xHandle);
        
        // Y-axis scale handle
        const yHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        yHandle.position.set(0, this.handleSize * 1.5, 0);
        yHandle.userData = { type: 'scale', axis: 'y' };
        this.adjustmentHandles.add(yHandle);
        
        // Z-axis scale handle
        const zHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        zHandle.position.set(0, 0, this.handleSize * 1.5);
        zHandle.userData = { type: 'scale', axis: 'z' };
        this.adjustmentHandles.add(zHandle);
    }

    handleAdjustmentClick(handle) {
        if (!handle.userData) return;
        
        const { type, axis } = handle.userData;
        this.adjustmentMode = type;
        this.isAdjusting = true;
        
        console.log(`Adjustment mode: ${type}, axis: ${axis}`);
    }

    // Selection helper system
    initSelectionHelper() {
        if (!this.designer.scene) {
            console.error('Scene not available for selection helper');
            return;
        }
        this.selectionHelper = new THREE.BoxHelper();
        this.designer.scene.add(this.selectionHelper);
        this.selectionHelper.visible = false;
    }

    // Context menu system
    showContextMenu(object, event) {
        // Create a simple context menu
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.style.cssText = `
            position: fixed;
            left: ${event.clientX}px;
            top: ${event.clientY}px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            padding: 8px 0;
            min-width: 120px;
        `;
        
        const options = [
            { text: 'Delete', action: () => this.deleteObject(object) },
            { text: 'Duplicate', action: () => this.duplicateObject(object) },
            { text: 'Properties', action: () => this.showProperties(object) }
        ];
        
        options.forEach(option => {
            const item = document.createElement('div');
            item.textContent = option.text;
            item.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            `;
            item.addEventListener('click', () => {
                option.action();
                document.body.removeChild(contextMenu);
            });
            contextMenu.appendChild(item);
        });
        
        document.body.appendChild(contextMenu);
        
        // Remove context menu when clicking elsewhere
        const removeMenu = () => {
            if (document.body.contains(contextMenu)) {
                document.body.removeChild(contextMenu);
            }
            document.removeEventListener('click', removeMenu);
        };
        
        setTimeout(() => {
            document.addEventListener('click', removeMenu);
        }, 100);
    }

    // Object manipulation methods
    deleteObject(object) {
        // Remove attachment connections
        this.removeAttachmentConnections(object);
        
        // Remove attachment points
        if (object.userData.attachmentPoints) {
            object.userData.attachmentPoints.forEach(point => {
                object.remove(point);
            });
        }
        
        this.designer.floorsManager.floorObjectsGroup.remove(object);
        this.clearSelection();
    }

    duplicateObject(object) {
        const clone = object.clone();
        clone.position.x += 2; // Offset the duplicate
        clone.userData.furnitureKey = `furniture_${this.furnitureKeyCounter++}_floor_${object.userData.lockedFloor || 0}`;
        
        // Create attachment points for the clone
        this.createAttachmentPoints(clone);
        
        this.designer.floorsManager.floorObjectsGroup.add(clone);
        this.selectObject(clone);
    }

    showProperties(object) {
        // Simple properties display
        const props = {
            'Type': object.userData.furnitureType || 'Unknown',
            'Position': `(${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)})`,
            'Rotation': `(${object.rotation.x.toFixed(2)}, ${object.rotation.y.toFixed(2)}, ${object.rotation.z.toFixed(2)})`,
            'Scale': `(${object.scale.x.toFixed(2)}, ${object.scale.y.toFixed(2)}, ${object.scale.z.toFixed(2)})`
        };
        
        let message = 'Object Properties:\n\n';
        for (const [key, value] of Object.entries(props)) {
            message += `${key}: ${value}\n`;
        }
        
        alert(message);
    }

    // UI control methods
    deleteSelectedObject() {
        if (this.selectedObject) {
            this.deleteObject(this.selectedObject);
            this.updateUIState();
        }
    }

    duplicateSelectedObject() {
        if (this.selectedObject) {
            this.duplicateObject(this.selectedObject);
            this.updateUIState();
        }
    }

    toggleAdjustmentMode(button) {
        const modes = ['move', 'rotate', 'scale'];
        const currentIndex = modes.indexOf(this.adjustmentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.adjustmentMode = modes[nextIndex];
        
        if (button) {
            button.textContent = `Adjustment: ${this.adjustmentMode.charAt(0).toUpperCase() + this.adjustmentMode.slice(1)}`;
        }
        
        // Update handles if an object is selected
        if (this.selectedObject) {
            this.showAdjustmentHandles(this.selectedObject);
        }
    }

    resetSelectedTransform() {
        if (this.selectedObject) {
            this.selectedObject.position.set(0, 0, 0);
            this.selectedObject.rotation.set(0, 0, 0);
            this.selectedObject.scale.set(1, 1, 1);
            this.updateFurniturePositions();
        }
    }

    updateUIState() {
        const hasSelection = this.selectedObject !== null;
        const deleteBtn = document.getElementById('delete-selected-object');
        const duplicateBtn = document.getElementById('duplicate-selected-object');
        const clearBtn = document.getElementById('clear-selection');
        const resetBtn = document.getElementById('reset-object-transform');
        
        if (deleteBtn) deleteBtn.disabled = !hasSelection;
        if (duplicateBtn) duplicateBtn.disabled = !hasSelection;
        if (clearBtn) clearBtn.disabled = !hasSelection;
        if (resetBtn) resetBtn.disabled = !hasSelection;
    }

    // Layout stability validation
    validatePlacementPosition(position, floorIndex) {
        // Check if layout is locked
        if (this.layoutLocked) {
            console.log('Layout is locked, cannot place objects');
            return false;
        }
        
        // Check placement cooldown
        const currentTime = Date.now();
        if (currentTime - this.lastPlacementTime < this.placementCooldown) {
            console.log('Placement cooldown active, please wait');
            return false;
        }
        
        // Check floor bounds
        const floor = this.designer.floorsManager.floorGroup.children[floorIndex];
        if (!floor) {
            console.log('Invalid floor index');
            return false;
        }
        
        const radius = this.designer.currentRadius * 0.8; // Leave margin
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        if (distanceFromCenter > radius) {
            console.log('Position outside floor bounds');
            return false;
        }
        
        // Check object count per floor
        const objectsOnFloor = this.getObjectsOnFloor(floorIndex);
        if (objectsOnFloor.length >= this.maxObjectsPerFloor) {
            console.log('Floor has reached maximum object limit');
            return false;
        }
        
        // Check minimum distance from other objects
        if (!this.checkMinimumDistance(position, floorIndex)) {
            console.log('Position too close to existing objects');
            return false;
        }
        
        return true;
    }
    
    getObjectsOnFloor(floorIndex) {
        return this.designer.floorsManager.floorObjectsGroup.children.filter(obj => {
            const lockedFloor = obj.userData && obj.userData.lockedFloor != null ? obj.userData.lockedFloor : 
                               (obj.userData && obj.userData.floorIndex != null ? obj.userData.floorIndex : -1);
            return lockedFloor === floorIndex;
        });
    }
    
    checkMinimumDistance(position, floorIndex) {
        const objectsOnFloor = this.getObjectsOnFloor(floorIndex);
        
        for (const obj of objectsOnFloor) {
            const distance = Math.sqrt(
                Math.pow(position.x - obj.position.x, 2) + 
                Math.pow(position.z - obj.position.z, 2)
            );
            if (distance < this.minObjectDistance) {
                return false;
            }
        }
        return true;
    }
    
    lockLayout() {
        this.layoutLocked = true;
        console.log('Layout locked for stability');
    }
    
    unlockLayout() {
        this.layoutLocked = false;
        console.log('Layout unlocked');
    }
    
    toggleLayoutLock(button) {
        this.layoutLocked = !this.layoutLocked;
        if (button) {
            button.textContent = `Lock Layout: ${this.layoutLocked ? 'On' : 'Off'}`;
            button.className = this.layoutLocked ? 'btn btn-danger' : 'btn btn-warning';
        }
        
        if (this.layoutLocked) {
            console.log('Layout locked for stability - no new objects can be placed');
        } else {
            console.log('Layout unlocked - objects can be placed');
        }
    }
    
    validateAndFixDragPosition(object) {
        if (!object || !object.userData) return;
        
        const lockedFloor = object.userData.lockedFloor != null ? object.userData.lockedFloor : 
                           (object.userData.floorIndex != null ? object.userData.floorIndex : 0);
        const floor = this.designer.floorsManager.floorGroup.children[lockedFloor];
        
        if (!floor) {
            console.log('Floor not found for object, using floor 0');
            object.userData.lockedFloor = 0;
            object.userData.floorIndex = 0;
            return;
        }
        
        // Ensure object stays within floor bounds
        const radius = this.designer.currentRadius * 0.8;
        const distanceFromCenter = Math.sqrt(object.position.x * object.position.x + object.position.z * object.position.z);
        
        if (distanceFromCenter > radius) {
            // Move object back within bounds
            const angle = Math.atan2(object.position.z, object.position.x);
            object.position.x = Math.cos(angle) * radius;
            object.position.z = Math.sin(angle) * radius;
            console.log('Moved object back within floor bounds');
        }
        
        // Check for collisions with other objects
        const objectsOnFloor = this.getObjectsOnFloor(lockedFloor);
        for (const otherObj of objectsOnFloor) {
            if (otherObj === object) continue;
            
            const distance = Math.sqrt(
                Math.pow(object.position.x - otherObj.position.x, 2) + 
                Math.pow(object.position.z - otherObj.position.z, 2)
            );
            
            if (distance < this.minObjectDistance) {
                // Move object away from collision
                const angle = Math.atan2(object.position.z - otherObj.position.z, object.position.x - otherObj.position.x);
                object.position.x = otherObj.position.x + Math.cos(angle) * this.minObjectDistance;
                object.position.z = otherObj.position.z + Math.sin(angle) * this.minObjectDistance;
                console.log('Moved object away from collision');
            }
        }
    }
    
    setStableObjectPosition(object) {
        if (!object || !object.userData) return;
        
        const lockedFloor = object.userData.lockedFloor != null ? object.userData.lockedFloor : 
                           (object.userData.floorIndex != null ? object.userData.floorIndex : 0);
        const floor = this.designer.floorsManager.floorGroup.children[lockedFloor];
        
        if (!floor) return;
        
        // Calculate the correct Y position for the object
        const bbox = new THREE.Box3().setFromObject(object);
        const height = bbox.max.y - bbox.min.y;
        const floorTop = floor.position.y + this.designer.floorsManager.floorThickness / 2;
        const targetY = floorTop + height / 2;
        
        // Set the final position directly without triggering gravity
        object.position.y = targetY;
        
        // Mark object as stable to prevent gravity interference
        object.userData.isStable = true;
        object.userData.lastStablePosition = object.position.clone();
        object.userData.lastStableFloorY = floor.position.y;
        
        // Schedule to release stable flag after a delay to allow normal gravity
        setTimeout(() => {
            if (object.userData) {
                object.userData.isStable = false;
                console.log(`Released stable flag for ${object.userData.furnitureKey}`);
            }
        }, 2000); // 2 seconds delay
        
        console.log(`Set stable position for ${object.userData.furnitureKey} at Y=${targetY}`);
    }

    // Visual feedback for placement mode
    showPlacementHint() {
        // Create a temporary visual indicator
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (!canvas) return;
        
        // Create a temporary hint element
        const hint = document.createElement('div');
        hint.textContent = 'Double-click to place object';
        hint.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            animation: fadeInOut 1.5s ease-in-out;
        `;
        
        // Add CSS animation
        if (!document.getElementById('placement-hint-style')) {
            const style = document.createElement('style');
            style.id = 'placement-hint-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                }
            `;
            document.head.appendChild(style);
        }
        
        canvas.parentElement.appendChild(hint);
        
        // Remove hint after animation
        setTimeout(() => {
            if (hint.parentElement) {
                hint.parentElement.removeChild(hint);
            }
        }, 1500);
    }
    
    showPlacementError(message) {
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (!canvas) return;
        
        const error = document.createElement('div');
        error.textContent = message;
        error.style.cssText = `
            position: absolute;
            left: 50%;
            top: 30%;
            transform: translate(-50%, -50%);
            background: rgba(220, 38, 38, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            animation: fadeInOut 2s ease-in-out;
        `;
        
        canvas.parentElement.appendChild(error);
        
        setTimeout(() => {
            if (error.parentElement) {
                error.parentElement.removeChild(error);
            }
        }, 2000);
    }
    
    showPlacementSuccess() {
        const canvas = this.designer.canvasElement || document.getElementById('habitat-canvas');
        if (!canvas) return;
        
        const success = document.createElement('div');
        success.textContent = 'Object placed successfully';
        success.style.cssText = `
            position: absolute;
            left: 50%;
            top: 30%;
            transform: translate(-50%, -50%);
            background: rgba(34, 197, 94, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            animation: fadeInOut 1.5s ease-in-out;
        `;
        
        canvas.parentElement.appendChild(success);
        
        setTimeout(() => {
            if (success.parentElement) {
                success.parentElement.removeChild(success);
            }
        }, 1500);
    }

    // Attachment system
    createAttachmentPoints(object) {
        if (!object.userData.attachmentPoints) {
            object.userData.attachmentPoints = [];
        }
        
        // Create visual attachment points
        const attachmentGeometry = new THREE.SphereGeometry(0.1, 8, 6);
        const attachmentMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.7 
        });
        
        // Add attachment points around the object
        const points = [
            { pos: [1, 0, 0], name: 'right' },
            { pos: [-1, 0, 0], name: 'left' },
            { pos: [0, 0, 1], name: 'front' },
            { pos: [0, 0, -1], name: 'back' },
            { pos: [0, 1, 0], name: 'top' },
            { pos: [0, -1, 0], name: 'bottom' }
        ];
        
        points.forEach(point => {
            const attachmentPoint = new THREE.Mesh(attachmentGeometry, attachmentMaterial);
            attachmentPoint.position.set(point.pos[0], point.pos[1], point.pos[2]);
            attachmentPoint.userData = { 
                type: 'attachment', 
                name: point.name,
                parentObject: object 
            };
            object.add(attachmentPoint);
            object.userData.attachmentPoints.push(attachmentPoint);
        });
    }

    findNearbyAttachmentPoints(object, maxDistance = 2.0) {
        const nearbyPoints = [];
        const objectPosition = object.position;
        
        this.designer.floorsManager.floorObjectsGroup.children.forEach(otherObject => {
            if (otherObject === object) return;
            
            if (otherObject.userData.attachmentPoints) {
                otherObject.userData.attachmentPoints.forEach(point => {
                    const worldPosition = new THREE.Vector3();
                    point.getWorldPosition(worldPosition);
                    const distance = objectPosition.distanceTo(worldPosition);
                    
                    if (distance <= maxDistance) {
                        nearbyPoints.push({
                            point: point,
                            object: otherObject,
                            distance: distance,
                            worldPosition: worldPosition
                        });
                    }
                });
            }
        });
        
        return nearbyPoints.sort((a, b) => a.distance - b.distance);
    }

    snapToAttachmentPoint(object, attachmentPoint) {
        if (!attachmentPoint || !object) return;
        
        const worldPosition = new THREE.Vector3();
        attachmentPoint.getWorldPosition(worldPosition);
        
        // Calculate offset to maintain relative position
        const offset = object.position.clone().sub(worldPosition);
        object.position.copy(worldPosition).add(offset);
        
        // Create visual connection
        this.createAttachmentConnection(object, attachmentPoint);
    }

    createAttachmentConnection(object, attachmentPoint) {
        // Create a visual line between objects
        const points = [
            object.position,
            attachmentPoint.getWorldPosition(new THREE.Vector3())
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.5 
        });
        
        const line = new THREE.Line(geometry, material);
        
        this.designer.scene.add(line);
        this.attachmentConnections.push(line);
        
        // Store connection info
        object.userData.attachedTo = attachmentPoint;
        attachmentPoint.userData.attachedObject = object;
    }

    removeAttachmentConnections(object) {
        if (object.userData.attachedTo) {
            object.userData.attachedTo.userData.attachedObject = null;
            object.userData.attachedTo = null;
        }
        
        // Remove visual connections
        this.attachmentConnections = this.attachmentConnections.filter(connection => {
            if (connection.userData && connection.userData.connectedObject === object) {
                this.designer.scene.remove(connection);
                return false;
            }
            return true;
        });
    }
}
