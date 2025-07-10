# AI Segmentation Tool V3 - Implementation Plan

## Overview
This plan outlines the implementation of an AI-powered segmentation tool with improved UX based on lessons learned from V2. The tool will provide a streamlined workflow for creating 3D selections using 2D AI segmentation with multiple prompt points.

## Architecture Summary

### Key Differences from V2
- **Integrated Tool**: Proper integration with existing tool system (not a separate panel)
- **Simplified UX**: Single overlay mode with side panel for controls
- **Undo Support**: Full integration with undo/redo system
- **Selection Operations**: Support for SET/OR/AND operations with existing selection

### Core Components
1. **SegmentationTool** - Main tool class following existing tool patterns
2. **SegmentationSidePanel** - UI panel for controls and prompt management
3. **SegmentationOverlay** - Canvas overlay for mask visualization and interaction
4. **SegmentationOp** - Edit operation for undo/redo support

## Implementation Tasks

### Phase 1: Foundation & Tool Integration ✅ COMPLETED

#### Task 1.1: Create Base Tool Structure
- **File**: `src/tools/segmentation-tool.ts`
- **Dependencies**: Follow pattern from `polygon-selection.ts` and `brush-selection.ts`
- **Key Features**:
  - Implement `Tool` interface
  - Handle activation/deactivation
  - Camera freeze/unfreeze functionality
  - Mouse event handling for prompt points
  - Integration with tool manager

#### Task 1.2: Add Tool to Bottom Toolbar
- **File**: `src/ui/bottom-toolbar.ts`
- **Changes**:
  - Add segmentation button after box selection (line ~131)
  - Add SVG icon for segmentation tool
  - Wire up click event to fire `tool.segmentation`
  - Add tooltip registration

#### Task 1.3: Register Tool in Tool Manager
- **File**: `src/tools/tool-manager.ts`
- **Changes**:
  - Import and instantiate `SegmentationTool`
  - Add to tool registry
  - Handle `tool.segmentation` event

### Phase 2: UI Components ✅ COMPLETED

#### Task 2.1: Create Segmentation Side Panel
- **File**: `src/ui/segmentation-side-panel.ts`
- **Features**:
  - Prompt point list with clear functionality
  - Selection operation buttons (SET/OR/AND)
  - Apply button to commit changes
  - Cancel button to exit tool
  - Status indicators (processing, ready, etc.)n

#### Task 2.2: Create Segmentation Overlay
- **File**: `src/ui/segmentation-overlay.ts`
- **Features**:
  - Full-screen canvas overlay
  - Mask visualization with transparency
  - Prompt point rendering (positive/negative)
  - Real-time mask updates
  - Interaction handling (click to add prompts)

#### Task 2.3: Integrate Panel with Editor
- **File**: `src/ui/editor.ts`
- **Changes**:
  - Add side panel to editor layout
  - Show/hide panel based on tool activation
  - Handle panel events and communication

### Phase 3: AI Integration & Mask Generation

#### Task 3.1: Set Up MediaPipe Dependencies
- **Files**: `package.json`, build configuration
- **Dependencies**:
  - Reuse existing MediaPipe setup from V2
  - Ensure proper WASM loading
  - Add model assets to build process

#### Task 3.2: Implement Mask Generation
- **File**: `src/segmentation/mask-generator.ts`
- **Features**:
  - MediaPipe InteractiveSegmenter integration
  - Prompt point management (positive/negative)
  - Async mask generation
  - Error handling and retry logic
  - Memory management for large images

#### Task 3.3: 3D Selection Calculation
- **File**: `src/segmentation/selection-calculator.ts`
- **Features**:
  - Convert 2D mask to 3D splat selection
  - Use existing intersection shader approach
  - Handle different viewpoint perspectives
  - Optimize for performance

### Phase 4: Edit Operations & Undo Support

#### Task 4.1: Create Segmentation Edit Operation
- **File**: `src/edit/segmentation-op.ts`
- **Features**:
  - Extend base `EditOp` class
  - Store before/after selection state
  - Support SET/OR/AND operations
  - Implement undo/redo functionality

#### Task 4.2: Integrate with Edit System
- **File**: `src/edit/edit-ops.ts`
- **Changes**:
  - Register new operation type
  - Handle serialization/deserialization
  - Ensure proper operation ordering

### Phase 5: User Experience & Polish

#### Task 5.1: Camera Control Integration
- **File**: `src/camera.ts`
- **Features**:
  - Freeze/unfreeze camera during segmentation
  - Maintain camera state across tool switches
  - Handle edge cases (tool switching, window resize)

#### Task 5.2: Visual Feedback & Styling
- **Files**: `src/ui/scss/segmentation-*.scss`
- **Features**:
  - Professional styling for all UI components
  - Hover states and animations
  - Accessibility considerations
  - Mobile-responsive design

#### Task 5.3: Error Handling & User Feedback
- **Integration**: Throughout all components
- **Features**:
  - Loading states during AI processing
  - Error messages for failed operations
  - Progress indicators for long operations
  - Graceful degradation for unsupported browsers

### Phase 6: Testing & Optimization

#### Task 6.1: Unit Tests
- **Files**: `tests/tools/segmentation-tool.test.ts`, etc.
- **Coverage**:
  - Tool activation/deactivation
  - Mask generation logic
  - Selection calculation
  - Edit operations

#### Task 6.2: Integration Tests
- **Files**: `tests/integration/segmentation-workflow.test.ts`
- **Coverage**:
  - End-to-end workflow testing
  - UI interaction testing
  - Cross-browser compatibility

#### Task 6.3: Performance Optimization
- **Focus Areas**:
  - Memory usage during mask generation
  - 3D selection calculation performance
  - UI responsiveness during processing
  - Asset loading optimization

## Technical Specifications

### File Structure
```
src/
├── tools/
│   └── segmentation-tool.ts          # Main tool implementation
├── ui/
│   ├── segmentation-side-panel.ts    # Side panel UI
│   ├── segmentation-overlay.ts       # Overlay canvas
│   └── scss/
│       ├── segmentation-panel.scss   # Panel styles
│       └── segmentation-overlay.scss # Overlay styles
├── segmentation/
│   ├── mask-generator.ts             # AI mask generation
│   └── selection-calculator.ts       # 3D selection logic
└── edit/
    └── segmentation-op.ts            # Edit operation
```

### Key Dependencies
- `@mediapipe/tasks-vision`: AI segmentation
- Existing PlayCanvas/PCUI components
- Existing edit system and tool framework

### Event System Integration
- `tool.segmentation` - Activate segmentation tool
- `segmentation.maskGenerated` - Mask generation complete
- `segmentation.selectionApplied` - Selection applied to scene
- `segmentation.promptAdded` - New prompt point added
- `segmentation.promptsCleared` - All prompts cleared

## Implementation Timeline

### Week 1: Foundation
- Tasks 1.1-1.3 (Tool structure and integration)
- Basic UI wireframes

### Week 2: Core UI
- Tasks 2.1-2.3 (UI components)
- Visual design implementation

### Week 3: AI Integration
- Tasks 3.1-3.3 (MediaPipe and mask generation)
- 3D selection calculation

### Week 4: Edit System
- Tasks 4.1-4.2 (Undo/redo support)
- Operation integration

### Week 5: Polish & Testing
- Tasks 5.1-5.3 (UX polish)
- Tasks 6.1-6.3 (Testing and optimization)

## Success Criteria

1. **Tool Integration**: Seamlessly integrated with existing tool system
2. **User Experience**: Intuitive workflow matching V3 requirements
3. **Performance**: Responsive mask generation and selection calculation
4. **Reliability**: Robust error handling and undo/redo support
5. **Code Quality**: Well-structured, maintainable code following project patterns

## Risk Mitigation

1. **MediaPipe Issues**: Fallback to simpler segmentation if needed
2. **Performance Problems**: Implement progressive loading and caching
3. **UI Complexity**: Iterative design with user feedback
4. **Browser Compatibility**: Comprehensive testing across targets
5. **Integration Challenges**: Regular integration testing throughout development

## Notes

- Reuse as much as possible from V2 implementation
- Follow existing code patterns and conventions
- Maintain backward compatibility with existing features
- Consider future extensibility for additional AI models
- Document all public APIs and integration points