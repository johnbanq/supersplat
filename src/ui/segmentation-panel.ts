import { Button, Container, Label } from '@playcanvas/pcui';

import { Events } from '../events';
import { localize } from './localization';
import { Tooltips } from './tooltips';

class SegmentationPanel extends Container {
    private uiState: 'normal' | 'single-view-segment' = 'normal';
    private syncUIState: () => void;

    constructor(events: Events, tooltips: Tooltips, args = {}) {
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

        // region handler

        // stop pointer events bubbling
        ['pointerdown', 'pointerup', 'pointermove', 'wheel', 'dblclick'].forEach((eventName) => {
            this.dom.addEventListener(eventName, (event: Event) => event.stopPropagation());
        });

        startSegmentButton.on('click', () => {
            this.uiState = 'single-view-segment';
            this.syncUIState();
        });

        segmentButton.on('click', () => {
            this.uiState = 'normal';
            this.syncUIState();
        });

        cancelButton.on('click', () => {
            this.uiState = 'normal';
            this.syncUIState();
        });

        // endregion

        this.syncUIState = () => {
            startSegmentButton.hidden = this.uiState !== 'normal';
            segmentButton.hidden = this.uiState !== 'single-view-segment';
            cancelButton.hidden = this.uiState !== 'single-view-segment';
        };

        // sync init UI state
        this.syncUIState();
    }
}

export { SegmentationPanel };
