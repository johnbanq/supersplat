import { BooleanInput, Container, Label, Panel, SelectInput } from '@playcanvas/pcui';

import { Events } from '../events';
import { Splat } from '../splat';
import { rgb2hsv } from './color';
import { Histogram } from './histogram';
import { State } from '../splat-state';
import { localize } from './localization';

const SH_C0 = 0.28209479177387814;

const scaleFunc = (v: number) => Math.exp(v);
const colorFunc = (v: number) => 0.5 + v * SH_C0;
const sigmoid = (v: number) => 1 / (1 + Math.exp(-v));

const dataFuncs = {
    scale_0: scaleFunc,
    scale_1: scaleFunc,
    scale_2: scaleFunc,
    f_dc_0: colorFunc,
    f_dc_1: colorFunc,
    f_dc_2: colorFunc,
    opacity: sigmoid
};

// build a separator label
const sepLabel = (labelText: string) => {
    const container = new Container({
        class: 'control-parent',
        id: 'sep-container'
    });

    container.class.add('sep-container');

    const label = new Label({
        class: 'control-element-expand',
        text: labelText
    });

    container.append(label);

    return container;
};

// build a data label
const dataLabel = (parent: Container, labelText: string) => {
    const container = new Container({
        class: 'control-parent'
    });

    const label = new Label({
        class: 'control-label',
        text: labelText
    });

    const value = new Label({
        class: 'control-element-expand'
    });

    container.append(label);
    container.append(value);

    parent.append(container);

    return value;
};

class DataPanel extends Panel {
    constructor(events: Events, args = { }) {
        args = {
            ...args,
            headerText: localize('data'),
            id: 'data-panel',
            resizable: 'top',
            resizeMax: 1000,
            collapsed: true,
            collapsible: true,
            collapseHorizontally: false,
            flex: true,
            flexDirection: 'row'
        };

        super(args);

        // build the data controls
        const controlsContainer = new Container({
            id: 'data-controls-container'
        });

        const controls = new Container({
            id: 'data-controls'
        });

        const dataSelector = new SelectInput({
            class: 'control-element-expand',
            defaultValue: 'surface-area',
            options: []
        });

        const populateDataSelector = (splat: Splat) => {
            const localisations: any = {
                x: 'X',
                y: 'Y',
                z: 'Z',
                distance: localize('data.distance'),
                volume: localize('data.volume'),
                'surface-area': localize('data.surface-area'),
                scale_0: localize('data.scale-x'),
                scale_1: localize('data.scale-y'),
                scale_2: localize('data.scale-z'),
                f_dc_0: localize('data.red'),
                f_dc_1: localize('data.green'),
                f_dc_2: localize('data.blue'),
                opacity: localize('data.opacity'),
                hue: localize('data.hue'),
                saturation: localize('data.saturation'),
                value: localize('data.value')
            };

            const dataProps = splat.splatData.getElement('vertex').properties.map(p => p.name);
            const derivedProps = ['distance', 'volume', 'surface-area', 'hue', 'saturation', 'value'];
            const suppressedProps = ['state', 'transform'].concat(new Array(45).fill('').map((_, i) => `f_rest_${i}`));
            const allProps = dataProps.concat(derivedProps).filter(p => !suppressedProps.includes(p));

            const options = allProps.map((prop) => {
                return {
                    v: prop,
                    t: localisations[prop] ?? prop
                };
            });

            dataSelector.options = options;
        };

        const logScale = new Container({
            class: 'control-parent'
        });

        const logScaleLabel = new Label({
            class: 'control-label',
            text: localize('data.log-scale')
        });

        const logScaleValue = new BooleanInput({
            class: 'control-element',
            value: false
        });

        logScale.append(logScaleLabel);
        logScale.append(logScaleValue);

        controls.append(dataSelector);
        controls.append(logScale);

        controls.append(sepLabel(localize('data.totals')));

        const splatsValue = dataLabel(controls, localize('data.totals.splats'));
        const selectedValue = dataLabel(controls, localize('data.totals.selected'));
        const hiddenValue = dataLabel(controls, localize('data.totals.hidden'));
        const deletedValue = dataLabel(controls, localize('data.totals.deleted'));

        controlsContainer.append(controls);

        // build histogram
        const histogram = new Histogram(256, 128);

        const histogramContainer = new Container({
            id: 'histogram-container'
        });

        histogramContainer.dom.appendChild(histogram.canvas);

        this.content.append(controlsContainer);
        this.content.append(histogramContainer);

        // current splat
        let splat: Splat;

        // returns a function which will interpret the splat data for purposes of
        // viewing it in the histogram.
        // the returned values will depend on the currently selected data type:
        //   * some value functions return the raw splat data, like 'x'.
        //   * other value functions must transform the data for histogram visualization
        //     (for example 'scale_0', which must be exponentiated).
        //   * still other values are calculated/derived from multiple values of splat
        //     data like 'volume' and 'surface area'.
        const getValueFunc = () => {
            // @ts-ignore
            const dataFunc = dataFuncs[dataSelector.value];
            const data = splat.splatData.getProp(dataSelector.value);

            let func: (i: number) => number;
            if (dataFunc && data) {
                func = i => dataFunc(data[i]);
            } else {
                switch (dataSelector.value) {
                    case 'volume': {
                        const sx = splat.splatData.getProp('scale_0');
                        const sy = splat.splatData.getProp('scale_1');
                        const sz = splat.splatData.getProp('scale_2');
                        func = i => scaleFunc(sx[i]) * scaleFunc(sy[i]) * scaleFunc(sz[i]);
                        break;
                    }
                    case 'distance': {
                        const x = splat.splatData.getProp('x');
                        const y = splat.splatData.getProp('y');
                        const z = splat.splatData.getProp('z');
                        func = i => Math.sqrt(x[i] ** 2 + y[i] ** 2 + z[i] ** 2);
                        break;
                    }
                    case 'surface-area': {
                        const sx = splat.splatData.getProp('scale_0');
                        const sy = splat.splatData.getProp('scale_1');
                        const sz = splat.splatData.getProp('scale_2');
                        func = i => scaleFunc(sx[i]) ** 2 + scaleFunc(sy[i]) ** 2 + scaleFunc(sz[i]) ** 2;
                        break;
                    }
                    case 'hue': {
                        const r = splat.splatData.getProp('f_dc_0');
                        const g = splat.splatData.getProp('f_dc_1');
                        const b = splat.splatData.getProp('f_dc_2');
                        func = i => rgb2hsv({ r: colorFunc(r[i]), g: colorFunc(g[i]), b: colorFunc(b[i]) }).h * 360;
                        break;
                    }
                    case 'saturation': {
                        const r = splat.splatData.getProp('f_dc_0');
                        const g = splat.splatData.getProp('f_dc_1');
                        const b = splat.splatData.getProp('f_dc_2');
                        func = i => rgb2hsv({ r: colorFunc(r[i]), g: colorFunc(g[i]), b: colorFunc(b[i]) }).s;
                        break;
                    }
                    case 'value': {
                        const r = splat.splatData.getProp('f_dc_0');
                        const g = splat.splatData.getProp('f_dc_1');
                        const b = splat.splatData.getProp('f_dc_2');
                        func = i => rgb2hsv({ r: colorFunc(r[i]), g: colorFunc(g[i]), b: colorFunc(b[i]) }).v;
                        break;
                    }
                    default:
                        func = i => data[i];
                        break;
                }
            }

            return func;
        };

        const updateHistogram = () => {
            if (!splat || this.collapsed) return;

            const state = splat.splatData.getProp('state') as Uint8Array;
            if (state) {
                splatsValue.text = (state.length - splat.numDeleted).toString();
                selectedValue.text = splat.numSelected.toString();
                hiddenValue.text = splat.numHidden.toString();
                deletedValue.text = splat.numDeleted.toString();

                // update histogram
                const func = getValueFunc();

                // update histogram
                histogram.update({
                    count: state.length,
                    valueFunc: i => ((state[i] === 0 || state[i] === State.selected) ? func(i) : undefined),
                    selectedFunc: i => state[i] === State.selected,
                    logScale: logScaleValue.value
                });
            }
        };

        this.on('expand', () => {
            updateHistogram();
        });

        events.on('splat.stateChanged', (splat_: Splat) => {
            splat = splat_;
            updateHistogram();
        });

        events.on('selection.changed', (selection: Element) => {
            if (selection instanceof Splat) {
                splat = selection;
                populateDataSelector(splat);
                updateHistogram();
            }
        });

        events.on('dataPanel.toggle', () => {
            this.collapsed = !this.collapsed;
            updateHistogram();
        });

        dataSelector.on('change', updateHistogram);
        logScaleValue.on('change', updateHistogram);

        const popupContainer = new Container({
            id: 'data-panel-popup-container',
            hidden: true
        });

        const popupLabel = new Label({
            id: 'data-panel-popup-label',
            text: '',
            unsafe: true
        });

        popupContainer.append(popupLabel);
        this.content.append(popupContainer);

        histogram.events.on('showOverlay', () => {
            popupContainer.hidden = false;
        });

        histogram.events.on('hideOverlay', () => {
            popupContainer.hidden = true;
        });

        histogram.events.on('updateOverlay', (info: any) => {
            popupContainer.style.left = `${info.x + 14}px`;
            popupContainer.style.top = `${info.y}px`;

            const binValue = info.value.toFixed(2);
            const count = info.selected + info.unselected;
            const percentage = (info.total ? count / info.total * 100 : 0).toFixed(2);

            popupLabel.text = `value: ${binValue} cnt: ${count} (${percentage}%) sel: ${info.selected}`;
        });

        // highlight
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('id', 'histogram-svg');

        // create rect element
        const rect = document.createElementNS(svg.namespaceURI, 'rect') as SVGRectElement;
        rect.setAttribute('id', 'highlight-rect');
        rect.setAttribute('fill', 'rgba(255, 102, 0, 0.2)');
        rect.setAttribute('stroke', '#f60');
        rect.setAttribute('stroke-width', '1');
        rect.setAttribute('stroke-dasharray', '5, 5');

        svg.appendChild(rect);
        histogramContainer.dom.appendChild(svg);

        histogram.events.on('highlight', (info: any) => {
            rect.setAttribute('x', info.x.toString());
            rect.setAttribute('y', info.y.toString());
            rect.setAttribute('width', info.width.toString());
            rect.setAttribute('height', info.height.toString());

            svg.style.display = 'inline';
        });

        histogram.events.on('select', (op: string, start: number, end: number) => {
            svg.style.display = 'none';

            const state = splat.splatData.getProp('state') as Uint8Array;
            const selection = state.some(s => s === State.selected);
            const func = getValueFunc();

            // perform selection
            events.fire('select.pred', op, (i: number) => {
                if (state[i] !== 0 && state[i] !== State.selected) {
                    return false;
                }

                // select all splats that fall in the given bucket range (inclusive)
                const value = func(i);
                const bucket = histogram.histogram.valueToBucket(value);
                return bucket >= start && bucket <= end;
            });
        });
    }
}

export { DataPanel };
