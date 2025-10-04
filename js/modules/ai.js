// AI Module - Gemini AI integration for design generation
class GeminiAI {
    constructor() {
        // In a real implementation, this would initialize the Gemini API client
        // For demo purposes, we'll use mock responses
    }

    async generateDesign(selections) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock AI-generated design based on selections
        const design = {
            shape: this.selectShape(selections),
            radius: this.selectRadius(selections),
            height: this.selectHeight(selections),
            floors: this.selectFloors(selections),
            crew: this.selectCrew(selections),
            systems: this.selectSystems(selections),
            style: this.selectStyle(selections),
            palette: this.selectPalette(selections),
            materials: this.selectMaterials(selections)
        };

        return design;
    }

    selectShape(selections) {
        const types = selections.habitatType || [];
        if (types.includes('Research')) return 'cylinder';
        if (types.includes('Mansion')) return 'sphere';
        return 'cylinder'; // default
    }

    selectRadius(selections) {
        const crew = selections.crew || 6;
        if (crew > 20) return 15;
        if (crew > 10) return 12;
        return 10;
    }

    selectHeight(selections) {
        const floors = selections.floors || 3;
        return floors * 3; // rough estimate
    }

    selectFloors(selections) {
        const purposes = selections.purpose || [];
        if (purposes.includes('Research')) return 4;
        if (purposes.includes('Emergency shelter')) return 2;
        return 3;
    }

    selectCrew(selections) {
        const types = selections.habitatType || [];
        if (types.includes('Mansion')) return 12;
        return 6;
    }

    selectSystems(selections) {
        const purposes = selections.purpose || [];
        const systems = ['life-support', 'power'];
        if (purposes.includes('Research')) systems.push('communications', 'thermal');
        if (purposes.includes('Emergency shelter')) systems.push('waste', 'medical');
        return systems;
    }

    selectStyle(selections) {
        const purposes = selections.purpose || [];
        if (purposes.includes('Research')) return 'Futuristic';
        if (purposes.includes('Emergency shelter')) return 'Minimalist';
        return 'Organic';
    }

    selectPalette(selections) {
        const style = selections.style || [];
        if (style.includes('Futuristic')) return 'Neon sci-fi';
        if (style.includes('Minimalist')) return 'Soft pastels';
        return 'Earth tones';
    }

    selectMaterials(selections) {
        const purposes = selections.purpose || [];
        const materials = [];
        if (purposes.includes('Research')) materials.push('Carbon fiber', 'Titanium');
        if (purposes.includes('Emergency shelter')) materials.push('Regolith concrete', 'Aerogel panels');
        if (materials.length === 0) materials.push('Aluminum');
        return materials;
    }
}

export { GeminiAI };
