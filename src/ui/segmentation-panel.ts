import {
    FilesetResolver,
    InteractiveSegmenter,
    InteractiveSegmenterResult,
    RegionOfInterest
} from '@mediapipe/tasks-vision';
import { Button, Container, Label, SelectInput } from '@playcanvas/pcui';

import { SelectOp } from '../edit-ops';
import { Events } from '../events';
import { localize } from './localization';
import { Tooltips } from './tooltips';

class SingleViewSegmentationUI {
    private mainCanvas: HTMLCanvasElement;
    events: Events;

    private _active = false;
    private canvas: HTMLCanvasElement; // off-screen canvas for rendering the mask
    private ctx: CanvasRenderingContext2D;
    private segmentationCanvas: HTMLCanvasElement; // canvas for pointer events and displaying the mask
    private segmentationCtx: CanvasRenderingContext2D;

    private clickX: number;
    private clickY: number;

    private interactiveSegmenter: InteractiveSegmenter;
    private roi: RegionOfInterest;
    private appended = false;
    private mask: InteractiveSegmenterResult['categoryMask'];


    constructor(mainCanvas: HTMLCanvasElement, events: Events) {
        this.mainCanvas = mainCanvas;
        this.events = events;

        // off-screen canvas for rendering the mask
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

        // canvas for capturing pointer events and displaying the mask
        this.segmentationCanvas = document.createElement('canvas');
        this.segmentationCanvas.id = 'segmentation-canvas';
        this.segmentationCanvas.style.display = 'none';
        this.segmentationCanvas.style.position = 'absolute';
        this.segmentationCanvas.style.top = '0';
        this.segmentationCanvas.style.left = '0';
        this.segmentationCanvas.style.width = '100%';
        this.segmentationCanvas.style.height = '100%';
        this.segmentationCanvas.style.zIndex = '2'; // above main canvas, below other UI
        this.segmentationCtx = this.segmentationCanvas.getContext('2d');

        this.createSegmenter()
        .catch(e => console.error('unable to load segmenter:', e));
    }

    async createSegmenter() {
        const vision = await FilesetResolver.forVisionTasks(
            '/static/lib/segmentation'
        );
        this.interactiveSegmenter = await InteractiveSegmenter.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite'
            },
            outputCategoryMask: true,
            outputConfidenceMasks: false
        });
    }

    activate() {
        if (!this.appended) {
            this.appended = true;
            const parentElement = this.mainCanvas.parentElement;
            if (parentElement) {
                // move other ui elements up
                for (let i = 0; i < parentElement.children.length; i++) {
                    const child = parentElement.children[i] as HTMLElement;
                    if (child.id !== 'canvas') {
                        child.style.zIndex = '3';
                    }
                }
                parentElement.appendChild(this.segmentationCanvas);
            }
        }

        this._active = true;
        this.segmentationCanvas.style.display = 'block';

        const width = this.mainCanvas.clientWidth;
        const height = this.mainCanvas.clientHeight;

        this.segmentationCanvas.width = width;
        this.segmentationCanvas.height = height;

        this.segmentationCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.segmentationCtx.fillRect(0, 0, this.segmentationCanvas.width, this.segmentationCanvas.height);

        this.segmentationCanvas.addEventListener('pointerdown', this.update);
        this.segmentationCanvas.addEventListener('pointerup', this.suppressEvent);
        this.segmentationCanvas.addEventListener('pointermove', this.suppressEvent);
    }

    deactivate() {
        this._active = false;
        this.segmentationCanvas.style.display = 'none';
        this.segmentationCtx.clearRect(0, 0, this.segmentationCanvas.width, this.segmentationCanvas.height);

        this.segmentationCanvas.removeEventListener('pointerdown', this.update);
        this.segmentationCanvas.removeEventListener('pointerup', this.suppressEvent);
        this.segmentationCanvas.removeEventListener('pointermove', this.suppressEvent);
    }

    suppressEvent = (e: PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();
    };

    update = (e: PointerEvent) => {
        e.stopPropagation();

        if (!this._active || !this.interactiveSegmenter) return;

        this.clickX = e.clientX - this.segmentationCanvas.getBoundingClientRect().left;
        this.clickY = e.clientY - this.segmentationCanvas.getBoundingClientRect().top;

        this.roi = {
            keypoint: {
                x: this.clickX / this.segmentationCanvas.width,
                y: this.clickY / this.segmentationCanvas.height
            }
        };

        this.interactiveSegmenter.segment(this.mainCanvas, this.roi, (result: InteractiveSegmenterResult) => {
            if (result && result.categoryMask) {
                this.mask = result.categoryMask;
                const mask = this.mask;

                // size the offscreen canvas to the mask
                this.canvas.width = mask.width;
                this.canvas.height = mask.height;

                const imageData = this.ctx.createImageData(mask.width, mask.height);
                const pixelData = imageData.data;
                const maskData = mask.getAsUint8Array();

                const legendColors: { [key: number]: [number, number, number, number] } = {
                    255: [0, 0, 0, 0],           // background (transparent)
                    0: [255, 255, 255, 128]    // foreground (semi-transparent white)
                };
                for (let i = 0; i < maskData.length; i++) {
                    const category = maskData[i];
                    const color = legendColors[category];
                    pixelData[i * 4] = color[0];
                    pixelData[i * 4 + 1] = color[1];
                    pixelData[i * 4 + 2] = color[2];
                    pixelData[i * 4 + 3] = color[3];
                }

                this.ctx.putImageData(imageData, 0, 0);

                // draw red dot on the offscreen canvas
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                this.ctx.beginPath();
                const dotX = this.clickX * (mask.width / this.segmentationCanvas.width);
                const dotY = this.clickY * (mask.height / this.segmentationCanvas.height);
                this.ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
                this.ctx.fill();

                // update the overlay canvas
                this.segmentationCtx.clearRect(0, 0, this.segmentationCanvas.width, this.segmentationCanvas.height);
                this.segmentationCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.segmentationCtx.fillRect(0, 0, this.segmentationCanvas.width, this.segmentationCanvas.height);
                this.segmentationCtx.drawImage(this.canvas, 0, 0, this.segmentationCanvas.width, this.segmentationCanvas.height);

                result.close();
            }
        });
    };

    public getMask() {
        if (!this.mask) {
            return {
                canvas: this.canvas,
                context: this.ctx
            };
        }

        const mask = this.mask;
        const canvas = document.createElement('canvas');
        canvas.width = mask.width;
        canvas.height = mask.height;

        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(mask.width, mask.height);
        const pixelData = imageData.data;
        const maskData = mask.getAsUint8Array();

        for (let i = 0; i < maskData.length; i++) {
            const isForeground = maskData[i] === 0;
            pixelData[i * 4] = isForeground ? 255 : 0;
            pixelData[i * 4 + 1] = isForeground ? 255 : 0;
            pixelData[i * 4 + 2] = isForeground ? 255 : 0;
            pixelData[i * 4 + 3] = isForeground ? 255 : 0;
        }

        ctx.putImageData(imageData, 0, 0);

        return {
            canvas: canvas,
            context: ctx
        };
    }
}

class SegmentationPanel extends Container {
    private uiState: 'normal' | 'single-view-segment' = 'normal';
    private syncUIState: () => void;
    private singleViewSegmentationUI: SingleViewSegmentationUI;
    private operation: 'set' | 'and' | 'or' = 'set';

    constructor(events: Events, tooltips: Tooltips, canvas: HTMLCanvasElement, args = {}) {
        args = {
            ...args,
            id: 'segmentation-panel',
            class: 'panel'
        };

        super(args);

        // region ui

        const header = new Container({
            class: 'panel-header'
        });

        const icon = new Label({
            class: 'panel-header-icon',
            text: 'X'
        });

        const label = new Label({
            class: 'panel-header-label',
            text: localize('segmentation')
        });

        header.append(icon);
        header.append(label);

        this.append(header);

        const mainControls = new Container({
            class: 'filter-panel-row'
        });

        const segmentViewButton = new Button({
            class: 'control-element',
            text: localize('segmentThisView')
        });
        mainControls.append(segmentViewButton);
        this.append(mainControls);

        const segmentationControls = new Container({
            class: 'filter-panel-column',
            hidden: true
        });

        const operationRow = new Container({
            class: 'filter-panel-row'
        });

        const opLabel = new Label({
            text: 'Operation:',
            class: 'op-label'
        });

        const opSelect = new SelectInput({
            class: 'segmentation-operation-select',
            options: [
                { v: 'set', t: 'Set' },
                { v: 'and', t: 'And' },
                { v: 'or', t: 'Or' }
            ],
            value: 'set'
        });

        operationRow.append(opLabel);
        operationRow.append(opSelect);
        segmentationControls.append(operationRow);

        const actionRow = new Container({
            class: 'filter-panel-row'
        });

        const acceptButton = new Button({
            class: 'control-element',
            text: 'Accept'
        });

        const cancelButton = new Button({
            class: 'control-element',
            text: localize('cancel')
        });

        actionRow.append(acceptButton);
        actionRow.append(cancelButton);
        segmentationControls.append(actionRow);

        this.append(segmentationControls);

        this.append(new Label({ class: 'panel-header-spacer' }));

        // endregion

        this.singleViewSegmentationUI = new SingleViewSegmentationUI(canvas, events);

        // region handler

        // stop pointer events bubbling
        ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'dblclick'].forEach((eventName) => {
            this.dom.addEventListener(eventName, (event: Event) => event.stopPropagation());
        });

        segmentViewButton.on('click', () => {
            this.uiState = 'single-view-segment';
            this.syncUIState();
        });

        opSelect.on('change', (value: string) => {
            this.operation = value as 'set' | 'and' | 'or';
        });

        acceptButton.on('click', () => {
            const selectedSplats = () => {
                const selected = events.invoke('selection');
                return selected ? [selected] : [];
            };

            const mask = this.singleViewSegmentationUI.getMask();

            switch (this.operation) {
                case 'set':
                    events.fire('select.byMask', 'set', mask.canvas, mask.context);
                    break;
                case 'and':
                    selectedSplats().forEach((splat: any) => {
                        const state = splat.splatData.getProp('state') as Uint8Array;
                        const currentSelection = new Set<number>();
                        for (let i = 0; i < state.length; ++i) {
                            if (state[i] & 1) {
                                currentSelection.add(i);
                            }
                        }

                        const newSelection = events.invoke('select.calculateMask', splat, 'set', mask.canvas, mask.context);
                        if (newSelection) {
                            const intersection = new Set([...currentSelection].filter(i => newSelection.has(i)));
                            const filter = (i: number) => intersection.has(i);
                            events.fire('edit.add', new SelectOp(splat, 'set', filter));
                        }
                    });
                    break;
                case 'or':
                    events.fire('select.byMask', 'add', mask.canvas, mask.context);
                    break;
            }''

            this.uiState = 'normal';
            this.syncUIState();
        });

        cancelButton.on('click', () => {
            this.uiState = 'normal';
            this.syncUIState();
        });

        // endregion

        this.syncUIState = () => {
            mainControls.hidden = this.uiState !== 'normal';
            segmentationControls.hidden = this.uiState !== 'single-view-segment';

            if (this.uiState === 'single-view-segment') {
                this.singleViewSegmentationUI.activate();
            } else {
                this.singleViewSegmentationUI.deactivate();
            }
        };

        // sync init UI state
        this.syncUIState();
    }
}

export { SegmentationPanel };