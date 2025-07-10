# Segmentation Feature Implementation Plan - V2

## Overview
The `feat/segmentation-proto-v2` branch implements a prototype segmentation tool for SuperSplat that allows users to create masks using AI-powered segmentation (MediaPipe) and apply them to select 3D Gaussian splats across multiple viewpoints.

## Architecture Analysis

### Core Components Added

#### 1. SegmentationPanel (`src/ui/segmentation-panel.ts`)
- **Purpose**: Main UI component for the segmentation workflow
- **Key Features**:
  - Multi-view segmentation management
  - Interactive mask creation using MediaPipe's InteractiveSegmenter
  - Viewpoint list management with intersection logic
  - Integration with existing selection system

#### 2. SingleViewSegmentationUI Class
- **Purpose**: Handles single viewpoint segmentation interaction
- **Implementation**:
  - Uses MediaPipe's `InteractiveSegmenter` with Magic Touch model
  - Creates overlay canvas for mask visualization
  - Handles pointer events for mask generation
  - Renders segmentation results with visual feedback

#### 3. ViewList Management System
- **Components**: `ViewItem` and `ViewList` classes
- **Functionality**:
  - Stores masks from multiple viewpoints
  - Provides UI for removing individual viewpoints
  - Calculates intersection of masks across viewpoints
  - Integrates with edit operations system

### Technical Implementation Details

#### Dependencies Added
- `@mediapipe/tasks-vision`: "0.10.22-rc.20250304" - Core AI segmentation functionality
- Model: Magic Touch TensorFlow Lite model from MediaPipe

#### Integration Points
1. **UI Integration**: Added to `src/ui/editor.ts:8` as a panel component
2. **Event System**: Uses existing event system for selection updates
3. **Edit Operations**: Integrates with `SelectOp` from existing edit system
4. **Rendering**: Uses existing mask calculation via `'select.calculateMask'` event

#### Workflow Implementation
```
1. User clicks "Segment This View" → enters segmentation mode
2. Camera freezes (overlay canvas activated)
3. User clicks on objects → MediaPipe generates mask
4. User clicks "Segment" → mask applied to current viewpoint
5. Mask intersection calculated across all viewpoints
6. Final selection applied to splats
```

## Current State Analysis

### What's Working
- ✅ Basic UI scaffold with segmentation panel
- ✅ MediaPipe integration for mask generation
- ✅ Single-view segmentation with visual feedback
- ✅ Multi-viewpoint mask management
- ✅ Intersection logic for combining masks
- ✅ Integration with existing selection system

### Implementation Gaps
Based on the AI analysis document (`ai-opinion.md`), several key features are missing:

1. **Camera Control**: No camera freezing mechanism implemented
2. **3D Frustum Visualization**: No bounding box display for viewpoints
3. **Proper Tool Integration**: Not integrated with existing tool system
4. **Selection Rendering**: Limited integration with existing selection rendering
5. **Positive/Negative Prompts**: Only supports single-click segmentation

## Technical Architecture

### File Structure
```
src/
├── ui/
│   ├── segmentation-panel.ts      # Main segmentation UI
│   ├── scss/
│   │   └── segmentation-panel.scss # Styling
│   └── editor.ts                  # UI integration
├── splat-overlay.ts               # Selection rendering
└── editor.ts                      # Core editor events
```

### Key Classes and Interfaces
- `SegmentationPanel`: Main UI controller
- `SingleViewSegmentationUI`: MediaPipe integration
- `ViewList`/`ViewItem`: Viewpoint management
- Integration with existing `SelectOp` edit operations

### Event Flow
```
segmentation-panel.ts → MediaPipe → mask → 'select.calculateMask' → SelectOp → selection.ts
```

## Next Steps for Full Implementation

### Phase 1: Core Functionality
1. Implement camera freezing mechanism
2. Add positive/negative prompt support
3. Integrate with existing tool system
4. Add frustum visualization

### Phase 2: Polish & UX
1. Improve visual feedback
2. Add undo/redo support for segmentation
3. Performance optimizations
4. Error handling and user feedback

### Phase 3: Advanced Features
1. Support for different segmentation models
2. Batch processing across viewpoints
3. Export/import of segmentation data
4. Integration with existing editing workflows

## Code Quality Notes
- Uses TypeScript with proper typing
- Follows existing codebase patterns
- Integrates with existing event system
- Properly handles cleanup and resource management
- Follows PlayCanvas/PCUI UI patterns

## Dependencies and Requirements
- MediaPipe Tasks Vision library
- Static assets for segmentation models
- WebGL support for mask rendering
- Modern browser with Canvas API support