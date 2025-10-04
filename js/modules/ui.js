// UI Module - Event listeners and interface management
class UIManager {
    constructor(designer) {
        this.designer = designer;
    }

    setupEventListeners() {
        // Shape controls
        document.getElementById('shape-type').addEventListener('change', (e) => {
            this.designer.currentShape = e.target.value;
            // Explicit user action: selecting a shape enables the habitat shell
            this.designer.habitatManager.habitatDisabled = false;
            this.designer.habitatManager.ensureHabitatExists();
            this.designer.habitatManager.createHabitat();
        });

        document.getElementById('radius').addEventListener('input', (e) => {
            this.designer.currentRadius = parseFloat(e.target.value);
            document.getElementById('radius-value').textContent = this.designer.currentRadius;
            if (!this.designer.habitatManager.habitatDisabled) { 
                this.designer.habitatManager.ensureHabitatExists(); 
                this.designer.habitatManager.createHabitat(); 
            }
        });

        document.getElementById('height').addEventListener('input', (e) => {
            this.designer.currentHeight = parseFloat(e.target.value);
            document.getElementById('height-value').textContent = this.designer.currentHeight;
            if (!this.designer.habitatManager.habitatDisabled) { 
                this.designer.habitatManager.ensureHabitatExists(); 
                this.designer.habitatManager.createHabitat(); 
            }
        });

        // Layout controls
        document.getElementById('auto-layout').addEventListener('click', () => {
            if (!this.designer.habitatManager.habitatDisabled) this.designer.habitatManager.ensureHabitatExists();
            this.designer.systemsManager.autoLayout();
        });

        document.getElementById('clear-layout').addEventListener('click', () => {
            this.designer.systemsManager.clearSystems();
        });

        document.getElementById('save-layout').addEventListener('click', () => {
            this.saveLayout();
        });

        document.getElementById('load-layout').addEventListener('click', () => {
            this.loadLayout();
        });

        // View controls
        document.getElementById('top-view').addEventListener('click', () => {
            this.designer.sceneManager.setView('top');
        });

        document.getElementById('side-view').addEventListener('click', () => {
            this.designer.sceneManager.setView('side');
        });

        document.getElementById('front-view').addEventListener('click', () => {
            this.designer.sceneManager.setView('front');
        });

        document.getElementById('reset-view').addEventListener('click', () => {
            this.designer.sceneManager.setView('reset');
        });

        // System checkboxes
        const systemCheckboxes = document.querySelectorAll('.system-item input[type="checkbox"]');
        systemCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.designer.systemsManager.updateSystemsCount();
            });
        });

        // Listen for theme changes from UI toggle
        document.addEventListener('themechange', (e) => {
            const theme = e.detail && e.detail.theme ? e.detail.theme : this.designer.utilsManager.getCurrentTheme();
            this.designer.utilsManager.applyThemeToWorkspace(theme);
        });

        // Plan: keep only rebuild floors, open uses MSQ modal now
        const rebuildFloorsBtn = document.getElementById('rebuild-floors');
        if (rebuildFloorsBtn) rebuildFloorsBtn.addEventListener('click', () => this.designer.floorsManager.buildFloors());

        // Object palette
        const objType = document.getElementById('object-type');
        const togglePlacement = document.getElementById('toggle-placement');
        const clearFloor = document.getElementById('clear-floor-objects');
        const toggleVibrant = document.getElementById('toggle-vibrant');
        const toggleLayoutLock = document.getElementById('toggle-layout-lock');
        if (objType) objType.addEventListener('change', (e) => { this.designer.furnitureManager.placementObjectType = e.target.value; });
        if (togglePlacement) togglePlacement.addEventListener('click', () => this.designer.furnitureManager.togglePlacement());
        if (clearFloor) clearFloor.addEventListener('click', () => this.designer.furnitureManager.clearSelectedFloorObjects());
        if (toggleVibrant) toggleVibrant.addEventListener('click', () => this.designer.furnitureManager.toggleVibrantColors(toggleVibrant));
        if (toggleLayoutLock) toggleLayoutLock.addEventListener('click', () => this.designer.furnitureManager.toggleLayoutLock(toggleLayoutLock));

        // View mode buttons
        const btnSolid = document.getElementById('view-solid');
        const btnWire = document.getElementById('view-wire');
        const btnOutline = document.getElementById('view-outline');
        if (btnSolid) btnSolid.addEventListener('click', () => this.designer.habitatManager.setViewMode('solid'));
        if (btnWire) btnWire.addEventListener('click', () => this.designer.habitatManager.setViewMode('wire'));
        if (btnOutline) btnOutline.addEventListener('click', () => this.designer.habitatManager.setViewMode('outline'));

        // Planner controls
        const enterPlanner = document.getElementById('enter-planner');
        const exitPlanner = document.getElementById('exit-planner');
        const rotateLeft = document.getElementById('rotate-left');
        const rotateRight = document.getElementById('rotate-right');
        const deleteSelected = document.getElementById('delete-selected');
        const toggleSnap = document.getElementById('toggle-snap');
        if (enterPlanner) enterPlanner.addEventListener('click', () => this.designer.plannerManager.enterPlannerMode());
        if (exitPlanner) exitPlanner.addEventListener('click', () => this.designer.plannerManager.exitPlannerMode());
        if (rotateLeft) rotateLeft.addEventListener('click', () => this.designer.plannerManager.rotateSelected(-Math.PI / 12));
        if (rotateRight) rotateRight.addEventListener('click', () => this.designer.plannerManager.rotateSelected(Math.PI / 12));
        if (deleteSelected) deleteSelected.addEventListener('click', () => this.designer.plannerManager.deleteSelected());
        if (toggleSnap) toggleSnap.addEventListener('click', () => this.designer.plannerManager.toggleSnap(toggleSnap));

        // Clear workspace button
        const clearWorkspaceBtn = document.getElementById('clear-workspace');
        if (clearWorkspaceBtn) clearWorkspaceBtn.addEventListener('click', () => this.clearWorkspace());

        // Object manipulation controls
        const deleteSelectedBtn = document.getElementById('delete-selected-object');
        const duplicateSelectedBtn = document.getElementById('duplicate-selected-object');
        const clearSelectionBtn = document.getElementById('clear-selection');
        const toggleAdjustmentBtn = document.getElementById('toggle-adjustment-mode');
        const resetTransformBtn = document.getElementById('reset-object-transform');
        
        if (deleteSelectedBtn) deleteSelectedBtn.addEventListener('click', () => this.designer.furnitureManager.deleteSelectedObject());
        if (duplicateSelectedBtn) duplicateSelectedBtn.addEventListener('click', () => this.designer.furnitureManager.duplicateSelectedObject());
        if (clearSelectionBtn) clearSelectionBtn.addEventListener('click', () => this.designer.furnitureManager.clearSelection());
        if (toggleAdjustmentBtn) toggleAdjustmentBtn.addEventListener('click', () => this.designer.furnitureManager.toggleAdjustmentMode(toggleAdjustmentBtn));
        if (resetTransformBtn) resetTransformBtn.addEventListener('click', () => this.designer.furnitureManager.resetSelectedTransform());
    }

    setupQuestionnaireUI() {
        const openBtn = document.getElementById('open-msq');
        const modal = document.getElementById('msq-modal');
        const applyBtn = document.getElementById('msq-apply');
        const cancelBtn = document.getElementById('msq-cancel');
        const aiToggle = document.getElementById('msq-ai-materials');
        const aiSuggestion = document.getElementById('msq-ai-suggestion');
        const aiSuggestionText = aiSuggestion ? aiSuggestion.querySelector('span') : null;
        const floorsInput = document.getElementById('msq-floors');
        const crewInput = document.getElementById('msq-crew');

        const open = () => { if (modal) { modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); }};
        const close = () => { if (modal) { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }};
        if (openBtn) openBtn.addEventListener('click', open);
        if (cancelBtn) cancelBtn.addEventListener('click', close);

        // Chip toggling
        const groups = document.querySelectorAll('#msq-modal .chip-group');
        groups.forEach(group => {
            group.addEventListener('click', (e) => {
                const target = e.target;
                if (!(target && target.classList && target.classList.contains('chip'))) return;
                const isMulti = group.getAttribute('data-multi') === 'true';
                if (!isMulti) {
                    group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                    target.classList.add('active');
                } else {
                    target.classList.toggle('active');
                }
                if (group.id === 'msq-materials' && aiToggle && aiToggle.checked) {
                    aiToggle.checked = false;
                    if (aiSuggestion) aiSuggestion.hidden = true;
                }
            });
        });

        // AI prediction
        const predictMaterials = () => {
            const getValues = (sel) => Array.from(document.querySelectorAll(`#msq-modal [data-group="${sel}"] .chip.active`)).map(c => c.getAttribute('data-value'));
            const types = getValues('habitatType');
            const purposes = getValues('purpose');
            const style = getValues('style')[0] || '';
            const palette = getValues('palette')[0] || '';
            const crew = crewInput ? parseInt(crewInput.value, 10) || 0 : 0;
            const floors = floorsInput ? parseInt(floorsInput.value, 10) || 1 : 1;

            const picks = new Set();
            if (purposes.includes('Research')) picks.add('Carbon fiber'), picks.add('Titanium');
            if (purposes.includes('Emergency shelter')) picks.add('Regolith concrete'), picks.add('Aerogel panels');
            if (types.includes('Mansion') || crew > 20) picks.add('Aluminum');
            if (style === 'Organic') picks.add('Biopolymer composites');
            if (palette === 'Neon sci-fi') picks.add('Carbon fiber');
            if (floors >= 5) picks.add('Titanium');
            if (picks.size === 0) picks.add('Aluminum');

            const arr = Array.from(picks);
            if (aiSuggestion && aiSuggestionText) {
                aiSuggestionText.textContent = arr.join(', ');
                aiSuggestion.hidden = false;
            }
            return arr;
        };

        if (aiToggle) {
            aiToggle.addEventListener('change', () => {
                if (aiToggle.checked) {
                    // Clear existing design when AI is predicting
                    this.clearDesignForAIPrediction();
                    predictMaterials();
                    // Clear manual selections
                    const matGroup = document.getElementById('msq-materials');
                    if (matGroup) matGroup.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                } else {
                    if (aiSuggestion) aiSuggestion.hidden = true;
                }
            });
        }

        const readSelections = () => {
            const getValues = (sel) => Array.from(document.querySelectorAll(`#msq-modal [data-group="${sel}"] .chip.active`)).map(c => c.getAttribute('data-value'));
            const habitatType = getValues('habitatType');
            const purpose = getValues('purpose');
            const style = getValues('style')[0] || null;
            const palette = getValues('palette')[0] || null;
            let materials = getValues('materials');
            if (aiToggle && aiToggle.checked) materials = predictMaterials();
            const floors = floorsInput ? Math.max(1, Math.min(50, parseInt(floorsInput.value, 10) || 1)) : 1;
            const crew = crewInput ? Math.max(1, Math.min(500, parseInt(crewInput.value, 10) || 1)) : 1;
            return { habitatType, purpose, style, palette, materials, floors, crew };
        };

        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                const sel = readSelections();
                // Apply floors
                this.designer.habitatManager.ensureHabitatExists();
                this.designer.floorsManager.numFloors = sel.floors;
                this.designer.floorsManager.buildFloors();
                // Update crew capacity display if provided explicitly
                const crewDisplay = document.getElementById('crew-display');
                if (crewDisplay && sel.crew) crewDisplay.textContent = sel.crew;
                // Map style/palette to theme accent subtly
                if (sel.palette) {
                    const root = document.documentElement;
                    switch (sel.palette) {
                        case 'Soft pastels': root.style.setProperty('--accent', '#60a5fa'); break;
                        case 'Neon sci-fi': root.style.setProperty('--accent', '#00d4ff'); break;
                        case 'Earth tones': root.style.setProperty('--accent', '#22c55e'); break;
                    }
                }
                // If Minimalist, turn off vibrant; if Futuristic, turn on vibrant
                if (sel.style) {
                    const wasVibrant = this.designer.furnitureManager.vibrantEnabled;
                    if (sel.style === 'Minimalist') this.designer.furnitureManager.vibrantEnabled = false;
                    if (sel.style === 'Futuristic') this.designer.furnitureManager.vibrantEnabled = true;
                    if (wasVibrant !== this.designer.furnitureManager.vibrantEnabled) this.designer.floorsManager.buildFloors();
                }
                // Persist or log selection
                localStorage.setItem('shd-msq', JSON.stringify(sel));
                close();
            });
        }
    }

    clearDesignForAIPrediction() {
        this.clearWorkspace();
    }

    clearWorkspace() {
        // Clear systems
        this.designer.systemsManager.clearSystems();
        // Clear floors, objects, partitions
        if (this.designer.floorsManager.floorObjectsGroup) this.designer.floorsManager.floorObjectsGroup.clear();
        if (this.designer.floorsManager.floorPartitionsGroup) this.designer.floorsManager.floorPartitionsGroup.clear();
        if (this.designer.floorsManager.floorGroup) this.designer.floorsManager.floorGroup.clear();
        // Clear habitat geometry
        if (this.designer.habitatManager.habitatGroup) this.designer.habitatManager.habitatGroup.clear();
        // Reset selection, planner, and view
        this.designer.floorsManager.selectedFloorIndex = null;
        this.designer.plannerManager.isPlanner = false;
        document.body.classList.remove('planner-active');
        this.designer.sceneManager.setView('reset');
        // Reset readouts
        const zero = (id) => { const el = document.getElementById(id); if (el) el.textContent = '0'; };
        zero('volume-display'); zero('surface-display'); zero('crew-display'); zero('systems-count');
    }

    saveLayout() {
        const layout = {
            shape: this.designer.currentShape,
            radius: this.designer.currentRadius,
            height: this.designer.currentHeight,
            systems: this.designer.systemsManager.getEnabledSystems(),
            timestamp: new Date().toISOString()
        };

        const dataStr = JSON.stringify(layout, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `space-habitat-layout-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    loadLayout() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const layout = JSON.parse(e.target.result);
                        this.loadLayoutData(layout);
                    } catch (error) {
                        alert('Error loading layout file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    loadLayoutData(layout) {
        // Update shape and dimensions
        document.getElementById('shape-type').value = layout.shape;
        document.getElementById('radius').value = layout.radius;
        document.getElementById('height').value = layout.height;
        document.getElementById('radius-value').textContent = layout.radius;
        document.getElementById('height-value').textContent = layout.height;
        
        this.designer.currentShape = layout.shape;
        this.designer.currentRadius = layout.radius;
        this.designer.currentHeight = layout.height;
        
        // Update systems
        const systemIds = [
            'life-support', 'power', 'waste', 'thermal', 'communications',
            'medical', 'sleep', 'exercise', 'food', 'stowage'
        ];
        
        systemIds.forEach(id => {
            document.getElementById(id).checked = layout.systems.includes(id);
        });
        
        // Recreate habitat and layout
        this.designer.habitatManager.createHabitat();
        this.designer.systemsManager.autoLayout();
    }
}
