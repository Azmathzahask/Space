// Planner Module - Floor planning and interaction
class PlannerManager {
    constructor(designer) {
        this.designer = designer;
        this.isPlanner = false;
        this.snapEnabled = true;
    }

    enterPlannerMode() {
        if (this.designer.floorsManager.selectedFloorIndex == null) return;
        this.isPlanner = true;
        document.body.classList.add('planner-active');
        // Switch to top-down camera framing the selected floor
        const idx = this.designer.floorsManager.selectedFloorIndex;
        const y = this.designer.floorsManager.floorGroup.children[idx].position.y + 20;
        this.designer.sceneManager.camera.position.set(0, y, 0.001);
        this.designer.sceneManager.camera.lookAt(0, this.designer.floorsManager.floorGroup.children[idx].position.y, 0);
    }

    exitPlannerMode() {
        this.isPlanner = false;
        document.body.classList.remove('planner-active');
        // Restore a comfortable perspective
        this.designer.sceneManager.camera.position.set(30, 30, 30);
        this.designer.sceneManager.camera.lookAt(0, 0, 0);
        // Merge popped-out floor back to layout
        this.designer.floorsManager.resetFloorFocus();
        // Force update furniture positions after floor restoration
        this.designer.furnitureManager.updateFurniturePositions();
        // Show all floors and furniture in normal view
        this.showAllFloorsAndFurniture();
    }

    showAllFloorsAndFurniture() {
        // Show all floors with normal opacity
        if (this.designer.floorsManager.floorSkeletons) {
            this.designer.floorsManager.floorSkeletons.forEach((floorSkeleton) => {
                floorSkeleton.children.forEach(child => {
                    if (child.userData && child.userData.isFlooring) {
                        child.material.opacity = 0.25;
                    }
                });
            });
        }
        
        // Show all partitions
        if (this.designer.floorsManager.floorPartitionsGroup) {
            this.designer.floorsManager.floorPartitionsGroup.children.forEach(w => { 
                w.visible = true; 
            });
        }
        
        // Show all furniture
        if (this.designer.floorsManager.floorObjectsGroup) {
            this.designer.floorsManager.floorObjectsGroup.children.forEach(obj => { 
                obj.visible = true; 
            });
        }
    }

    rotateSelected(delta) {
        if (!this.designer.furnitureManager.selectedObject) return;
        this.designer.furnitureManager.selectedObject.rotation.y += delta;
    }

    deleteSelected() {
        if (!this.designer.furnitureManager.selectedObject) return;
        this.designer.floorsManager.floorObjectsGroup.remove(this.designer.furnitureManager.selectedObject);
        this.designer.furnitureManager.selectedObject = null;
    }

    toggleSnap(btn) {
        this.snapEnabled = !this.snapEnabled;
        if (btn) btn.textContent = `Snap: ${this.snapEnabled ? 'On' : 'Off'}`;
    }
}
