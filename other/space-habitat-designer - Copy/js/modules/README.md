# Space Habitat Designer - Modular Architecture

This directory contains the modularized JavaScript code for the Space Habitat Designer application. The original monolithic `script.js` file has been divided into logical modules for better maintainability and organization.

## Module Structure

### Core Module (`core.js`)
- Main `SpaceHabitatDesigner` class
- Application initialization and coordination
- Animation loop management

### Scene Module (`scene.js`)
- Three.js scene setup and management
- Camera controls and positioning
- Lighting configuration (ambient, directional, point lights)
- Grid helper management
- View controls (top, side, front, reset)

### Habitat Module (`habitat.js`)
- Habitat shape creation and management
- Volume and surface area calculations
- View mode switching (solid, wire, outline)
- Outline rendering

### Systems Module (`systems.js`)
- Life support systems management
- System creation with icons and colors
- Auto-layout functionality
- System counting and display

### Floors Module (`floors.js`)
- Floor creation and management
- Floor partitioning and room layout
- Floor selection and focus management
- Floor button UI generation

### Furniture Module (`furniture.js`)
- Object placement and management
- Furniture prefab creation
- Gravity simulation for placed objects
- Vibrant color toggling
- Object selection and manipulation

### Planner Module (`planner.js`)
- Floor planning mode management
- Planner view controls
- Object rotation and deletion
- Snap-to-grid functionality

### UI Module (`ui.js`)
- Event listener setup
- Questionnaire modal management
- Layout save/load functionality
- Workspace clearing
- AI material prediction

### Utils Module (`utils.js`)
- Theme management
- Color palette application
- Helper functions

## Dependencies

The modules are loaded in the following order to ensure proper dependency resolution:

1. `utils.js` - Base utilities
2. `scene.js` - Three.js scene setup
3. `habitat.js` - Habitat management
4. `systems.js` - Systems management
5. `floors.js` - Floor management
6. `furniture.js` - Furniture management
7. `planner.js` - Planner functionality
8. `ui.js` - UI management
9. `core.js` - Main application class

## Benefits of Modularization

- **Maintainability**: Each module has a single responsibility
- **Readability**: Code is organized by functionality
- **Reusability**: Modules can be easily reused or modified
- **Debugging**: Easier to locate and fix issues
- **Collaboration**: Multiple developers can work on different modules
- **Testing**: Individual modules can be tested in isolation

## Usage

The modules are automatically loaded by the HTML file in the correct order. The main application is initialized in the HTML file's script section, which creates a new instance of `SpaceHabitatDesigner`.
