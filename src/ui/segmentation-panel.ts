import {
    FilesetResolver,
    InteractiveSegmenter,
    InteractiveSegmenterResult,
    RegionOfInterest
} from '@mediapipe/tasks-vision';
import { Button, Container, Label, Element as PcuiElement } from '@playcanvas/pcui';

import { SelectOp } from '../edit-ops';
import { Events } from '../events';
import { localize } from './localization';
import { Tooltips } from './tooltips';
import deleteSvg from './svg/delete.svg';

const createSvg = (svgString: string) => {
    const decodedStr = decodeURIComponent(svgString.substring('data:image/svg+xml,'.length));
    return new DOMParser().parseFromString(decodedStr, 'image/svg+xml').documentElement;
};

class ViewItem extends Container {
    private nameLabel: Label;
    private mask: Set<number>;

    constructor(name: string, mask: Set<number>, args = {}) {
        args = {
            ...args,
            class: ['view-item']
        };

        super(args);

        this.mask = mask;

        this.nameLabel = new Label({
            class: 'view-item-text',
            text: name
        });

        const remove = new PcuiElement({
            dom: createSvg(deleteSvg),
            class: 'view-item-delete'
        });

        this.append(this.nameLabel);
        this.append(remove);

        remove.dom.addEventListener('click', (event: MouseEvent) => {
            event.stopPropagation();
            this.emit('removeClicked', this);
        });
    }

    getMask() {
        return this.mask;
    }
}

class ViewList extends Container {
    private items = new Map<string, ViewItem>();
    private events: Events;

    constructor(events: Events, args = {}) {
        args = {
            ...args,
            class: 'view-list'
        };

        super(args);
        this.events = events;
    }

    addItem(name: string, mask: Set<number>) {
        const item = new ViewItem(name, mask);
        this.append(item);
        this.items.set(name, item);

        item.on('removeClicked', () => {
            this.removeItem(name);
            this.events.fire('viewlist.updated');
        });
    }

    removeItem(name: string) {
        const item = this.items.get(name);
        if (item) {
            this.remove(item);
            this.items.delete(name);
        }
    }

    clearItems() {
        this.items.forEach((item, name) => {
            this.removeItem(name);
        });
        this.events.fire('viewlist.updated');
    }

    getMasks() {
        const masks: Set<number>[] = [];
        this.items.forEach(item => {
            masks.push(item.getMask());
        });
        return masks;
    }
}

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
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
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
    private viewList: ViewList;

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

        const viewListContainer = new Container({
            class: 'view-list-container'
        });
        this.viewList = new ViewList(events);
        viewListContainer.append(this.viewList);
        this.append(viewListContainer);

        const segmentRow = new Container({
            class: 'filter-panel-row'
        });

        const startSegmentButton = new Button({
            class: 'control-element',
            text: localize('segmentThisView')
        });

        const segmentButton = new Button({
            class: 'control-element',
            text: localize('segment')
        });

        const cancelButton = new Button({
            class: 'control-element',
            text: localize('cancel')
        });

        segmentRow.append(startSegmentButton);
        segmentRow.append(segmentButton);
        segmentRow.append(cancelButton);
        this.append(segmentRow);

        this.append(new Label({ class: 'panel-header-spacer' }));

        // endregion

        this.singleViewSegmentationUI = new SingleViewSegmentationUI(canvas, events);

        // region handler

        // stop pointer events bubbling
        ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'dblclick'].forEach((eventName) => {
            this.dom.addEventListener(eventName, (event: Event) => event.stopPropagation());
        });

        startSegmentButton.on('click', () => {
            this.uiState = 'single-view-segment';
            this.syncUIState();
        });

        const applyCombinedMask = () => {
            const masks = this.viewList.getMasks();
            if (masks.length === 0) return;

            let intersection = new Set(masks[0]);
            for (let i = 1; i < masks.length; i++) {
                intersection = new Set([...intersection].filter(x => masks[i].has(x)));
            }

            const selectedSplats = () => {
                const selected = events.invoke('selection');
                return selected ? [selected] : [];
            };

            selectedSplats().forEach((splat: any) => {
                const filter = (i: number) => intersection.has(i);
                events.fire('edit.add', new SelectOp(splat, 'set', filter));
            });
        };

        segmentButton.on('click', () => {
            const selectedSplats = () => {
                const selected = events.invoke('selection');
                return selected ? [selected] : [];
            };

            const mask = this.singleViewSegmentationUI.getMask();
            selectedSplats().forEach((splat: any) => {
                const selectedMask = events.invoke('select.calculateMask', splat, 'set', mask.canvas, mask.context);
                if (selectedMask) {
                    this.viewList.addItem(`View ${this.viewList.dom.children.length + 1}`, selectedMask);
                    applyCombinedMask();
                }
            });

            this.uiState = 'normal';
            this.syncUIState();
        });

        events.on('viewlist.updated', applyCombinedMask);

        cancelButton.on('click', () => {
            this.uiState = 'normal';
            this.syncUIState();
        });

        // endregion

        this.syncUIState = () => {
            startSegmentButton.hidden = this.uiState !== 'normal';
            segmentButton.hidden = this.uiState !== 'single-view-segment';
            cancelButton.hidden = this.uiState !== 'single-view-segment';

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
