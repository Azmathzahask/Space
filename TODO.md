# TODO: Fix Buttons and Integrate Gemini AI

## 1. Fix Button Functionality
- [ ] Review ui.js for missing event listeners (e.g., view mode buttons, planner controls)
- [ ] Ensure all buttons in designer.html have corresponding handlers
- [ ] Test all buttons work properly

## 2. Add Gemini AI Integration
- [ ] Add @google/generative-ai to package.json
- [ ] Create js/modules/ai.js for Gemini API calls
- [ ] Update designer.html to add AI toggle in Plan Setup modal
- [ ] Modify ui.js to use AI for design generation when toggle is on
- [ ] Integrate AI-generated parameters into habitat creation

## 3. Testing and Validation
- [ ] Install dependencies
- [ ] Test AI design generation
- [ ] Verify all buttons functional
- [ ] Ensure 3D model updates based on AI output
