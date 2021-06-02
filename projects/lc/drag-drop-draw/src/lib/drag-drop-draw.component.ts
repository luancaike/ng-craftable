import {DOCUMENT} from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ContentChild,
    ElementRef,
    EventEmitter,
    Inject,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    QueryList,
    Renderer2,
    SimpleChanges,
    TemplateRef,
    ViewChild,
    ViewChildren,
    ViewEncapsulation
} from '@angular/core';
import {fromEvent, Subscription} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {v4 as uuid} from 'uuid';
import {runOutside} from './util';

export interface LegoConfig<T = any> {
    key?: string;
    height?: number;
    width?: number;
    x?: number;
    y?: number;
    data?: T;
}

@Component({
    selector: 'drag-drop-draw',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './drag-drop-draw.component.html',
    styleUrls: ['./drag-drop-draw.component.scss']
})
export class DragDropDrawComponent implements AfterViewInit, OnDestroy, OnChanges {
    @ContentChild('template', {read: TemplateRef}) template: TemplateRef<any>;
    @ViewChildren('lego') legoList!: QueryList<ElementRef<HTMLElement>>;
    @ViewChild('canvasContainer') canvasContainerRef: ElementRef<HTMLElement>;
    @ViewChild('mainArea') mainAreaRef: ElementRef<HTMLElement>;
    @ViewChild('guideContainer') guideContainerRef: ElementRef<HTMLElement>;
    @Input() public allLegoConfig: LegoConfig[] = [];
    @Input() public snapSize = 5;
    @Input() public gridSize = 10;
    @Input() public minWidth = 50;
    @Input() public minHeight = 50;
    @Input() public enableResize = true;
    @Input() public enableDrag = true;
    @Input() public drawItemData: { [k: string]: any };
    @Input() public enableDraw = false;
    @Input() public visualizationMode = false;
    @Input() public scale = 1;

    @Output() public selectionChange = new EventEmitter();
    @Output() public drawStart = new EventEmitter();
    @Output() public drawing = new EventEmitter();
    @Output() public drawEnd = new EventEmitter();

    public isSelecting = false;
    public isDragging = false;
    public isDrawing = false;
    public isResizing = false;
    public selectionArea: { [k: string]: any } = {};
    public lineGuides = {
        x: [],
        y: []
    };
    public fixedlineGuides = {
        x: [
            {parent: 'fixed', position: 0},
            {parent: 'fixed', position: 600},
            {parent: 'fixed', position: 1200}
        ],
        y: [
            {parent: 'fixed', position: 0},
            {parent: 'fixed', position: 450},
            {parent: 'fixed', position: 900}
        ]
    };
    public selectedLegoKeys: string[] = [];
    private resizeScreen$: Subscription;
    private keyDown$: Subscription;
    private keyUp$: Subscription;
    private shortcutKeysStatus = new Map();
    private resizeDebounce;

    constructor(
        @Inject(DOCUMENT) private document: Document,
        private renderer: Renderer2,
        private cdr: ChangeDetectorRef
    ) {
    }

    get guideContainer(): HTMLElement {
        return this.guideContainerRef.nativeElement;
    }

    get canvasContainer(): HTMLElement {
        return this.canvasContainerRef.nativeElement;
    }

    get mainArea(): HTMLElement {
        return this.mainAreaRef.nativeElement;
    }

    get drawPreview(): HTMLElement {
        return this.document.querySelector<HTMLElement>('.draw-preview');
    }

    get selectionPreview(): HTMLElement {
        return this.document.querySelector<HTMLElement>('.selection-preview');
    }

    ngAfterViewInit(): void {
        this.initFixedGuide();
        this.fixScaleByScreen();
        this.fixScaleSize();
        this.resizeScreen$ = fromEvent<MouseEvent>(window, 'resize').subscribe(() => {
            clearTimeout(this.resizeDebounce);
            this.resizeDebounce = setTimeout(() => {
                this.fixScaleByScreen();
                this.fixScaleSize();
            }, 100);
        });
        this.keyDown$ = fromEvent<KeyboardEvent>(this.document, 'keydown').subscribe(event => this.onKeyDown(event));
        this.keyUp$ = fromEvent<KeyboardEvent>(this.document, 'keyup').subscribe(event => this.onKeyUp(event));
        this.allLegoConfig.forEach(lego => this.updateLegoViewData(lego));
    }

    onKeyDown(event: KeyboardEvent) {
        this.shortcutKeysStatus.set(event.key, true);
        this.keyBoardMoveLego(event.key);
    }

    onKeyUp(event: KeyboardEvent) {
        this.shortcutKeysStatus.set(event.key, false);
    }

    keyBoardMoveLego(keyboardKey: string) {
        const selectionLegoConfigs = this.allLegoConfig
            .filter(lego => this.selectedLegoKeys.find(key => lego.key === key));
        selectionLegoConfigs.forEach(lego => {
            switch (keyboardKey) {
                case 'ArrowUp':
                    lego.y -= (this.gridSize + (lego.y % this.gridSize));
                    break;
                case 'ArrowDown':
                    lego.y += (this.gridSize - (lego.y % this.gridSize));
                    break;
                case 'ArrowLeft':
                    lego.x -= (this.gridSize + (lego.x % this.gridSize));
                    break;
                case 'ArrowRight':
                    lego.x += (this.gridSize - (lego.x % this.gridSize));
                    break;
            }
            this.updateLegoViewPositionAndSize(lego);
        });
        this.resizeSelectionAreaBySelectedLego(selectionLegoConfigs);
    }

    fixScaleByScreen(): void {
        this.scale = this.mainArea.offsetWidth < 1500 ? this.mainArea.offsetWidth / 1500 : 1;
        this.canvasContainer.style.transform = `scale(${this.scale})`;
    }

    fixScaleSize(): void {
        this.changeSizeElement('.guide-container');
        this.changeSizeElement('.scale-wrapper');
    }

    changeSizeElement(selectors: string): void {
        const width = this.canvasContainer.offsetWidth;
        const height = this.canvasContainer.offsetHeight;
        this.document.querySelector<HTMLDivElement>(selectors).style.width = `${width * this.scale}px`;
        this.document.querySelector<HTMLDivElement>(selectors).style.height = `${height * this.scale}px`;
    }

    initFixedGuide(): void {
        const width = this.canvasContainer.offsetWidth;
        const height = this.canvasContainer.offsetHeight;
        this.lineGuides.x = [0, width / 2, width].map(position => ({parent: 'fixed', position}));
        this.lineGuides.y = [0, height / 2, height].map(position => ({parent: 'fixed', position}));
    }

    trackById(index, item): any {
        return item.key;
    }

    stateDrawGuidelines(show = true): void {
        this.drawPreview.style.display = show ? 'block' : 'none';
        this.changeDrawGuidelines(this.drawPreview, null, null, 0, 0);
    }

    stateSelectionGuidelines(show = true, selected = false): void {
        if (selected) {
            this.renderer.addClass(this.selectionPreview, 'select');
        } else {
            this.renderer.removeClass(this.selectionPreview, 'select');
        }
        this.selectionPreview.style.display = show ? 'block' : 'none';
        this.changeDrawGuidelines(this.selectionPreview, null, null, 0, 0);
    }

    changeDrawGuidelines(element: HTMLElement, x = null, y = null, width = null, height = null): void {
        if (x !== null) {
            this.renderer.setStyle(element, 'left', `${x}px`);
        }
        if (y !== null) {
            this.renderer.setStyle(element, 'top', `${y}px`);
        }
        if (width !== null) {
            this.renderer.setStyle(element, 'width', `${width}px`);
        }
        if (height !== null) {
            this.renderer.setStyle(element, 'height', `${height}px`);
        }
    }

    getMaxAndMinBounds(): any {
        const maxBoundX = this.canvasContainer.offsetLeft + this.canvasContainer.offsetWidth;
        const maxBoundY = this.canvasContainer.offsetTop + this.canvasContainer.offsetHeight;
        const minBoundX = this.canvasContainer.offsetLeft;
        const minBoundY = this.canvasContainer.offsetTop;
        return {maxBoundX, maxBoundY, minBoundX, minBoundY};
    }

    getMouseEvents(): any {
        const dragEnd$ = fromEvent<MouseEvent>(this.document, 'mouseup');
        const drag$ = fromEvent<MouseEvent>(this.document, 'mousemove').pipe(takeUntil(dragEnd$));
        return {dragEnd$, drag$};
    }

    @runOutside
    mouseDownInMainArea($event: MouseEvent): void {
        if (this.visualizationMode || this.isDragging || this.isResizing) {
            return;
        }
        if (this.enableDraw) {
            this.initDraw($event);
        } else {
            this.initSelection($event);
        }
        const selectionPreview = this.document.querySelector('.selection-preview');
        const isNotSelectionPreview = !(selectionPreview === $event.target || selectionPreview.contains($event.target as Node));
        const isNotLegoOrLegoChild = !this.legoList.find(
            lego => lego.nativeElement === $event.target || lego.nativeElement.contains($event.target as Node)
        );
        if (isNotLegoOrLegoChild && isNotSelectionPreview) {
            this.clearSelectLego();
        }
    }

    @runOutside
    initDraw(eventStart: MouseEvent): void {
        this.isDrawing = true
        const {minBoundX, minBoundY} = this.getMaxAndMinBounds();
        const {dragEnd$, drag$} = this.getMouseEvents();
        let dragSub;
        let width = 0;
        let height = 0;
        const newLego: any = {};
        const startX = (eventStart.pageX - minBoundX) / this.scale;
        const startY = (eventStart.pageY - minBoundY) / this.scale;
        newLego.x = startX;
        newLego.y = startY;
        this.drawStart.emit({event: eventStart, data: newLego});
        let dragEndSub: Subscription;
        this.stateDrawGuidelines();
        dragSub = drag$.subscribe(eventDrag => {
            const mouseX = (eventDrag.pageX - minBoundX) / this.scale;
            const mouseY = (eventDrag.pageY - minBoundY) / this.scale;
            width = Math.abs(mouseX - startX);
            height = Math.abs(mouseY - startY);
            if (mouseX < startX) {
                newLego.x = mouseX;
            }
            if (mouseY < startY) {
                newLego.y = mouseY;
            }
            newLego.x = Math.round(newLego.x);
            newLego.y = Math.round(newLego.y);
            newLego.width = Math.round(width);
            newLego.height = Math.round(height);
            this.snapToGuideLine(newLego, true);
            this.changeDrawGuidelines(this.drawPreview, newLego.x, newLego.y, newLego.width, newLego.height);
            this.drawing.emit({event: eventDrag, data: newLego});
        });
        dragEndSub = dragEnd$.subscribe(eventEnd => {
            this.hiddenAllHighlightLines();
            this.stateDrawGuidelines(false);
            newLego.width = Math.round(Math.max(this.minWidth, width));
            newLego.height = Math.round(Math.max(this.minHeight, height));
            if (width && height) {
                this.addNewLego(newLego);
                width = 0;
                height = 0;
            }
            this.enableDraw = false;
            if (dragSub) {
                dragSub.unsubscribe();
            }
            dragEndSub.unsubscribe();
            this.drawEnd.emit({event: eventEnd, data: newLego});
            this.isDrawing = true
        });
    }

    @runOutside
    initSelection(eventStart: MouseEvent): void {
        const {minBoundX, minBoundY} = this.getMaxAndMinBounds();
        const {dragEnd$, drag$} = this.getMouseEvents();
        let dragSub;
        let width = 0;
        let height = 0;
        const selectionArea: any = {};
        const startX = (eventStart.pageX - minBoundX) / this.scale;
        const startY = (eventStart.pageY - minBoundY) / this.scale;
        selectionArea.x = startX;
        selectionArea.y = startY;
        this.isSelecting = true;
        this.stateSelectionGuidelines();
        dragSub = drag$.subscribe(eventDrag => {
            const mouseX = (eventDrag.pageX - minBoundX) / this.scale;
            const mouseY = (eventDrag.pageY - minBoundY) / this.scale;
            width = Math.abs(mouseX - startX);
            height = Math.abs(mouseY - startY);
            if (mouseX < startX) {
                selectionArea.x = mouseX;
            }
            if (mouseY < startY) {
                selectionArea.y = mouseY;
            }
            selectionArea.x = Math.round(selectionArea.x);
            selectionArea.y = Math.round(selectionArea.y);
            selectionArea.width = Math.round(width);
            selectionArea.height = Math.round(height);
            this.changeDrawGuidelines(this.selectionPreview, selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height);
        });
        const dragEndSub = dragEnd$.subscribe(() => {
            this.selectionArea = selectionArea;
            this.selectionLegoByArea();
            // this.stateSelectionGuidelines(false);
            if (dragSub) {
                dragSub.unsubscribe();
            }
            dragEndSub.unsubscribe();
            this.isSelecting = false;
            this.cdr.detectChanges();
        });
    }

    validInitDrag(legoConfig: LegoConfig, isSelection: boolean): boolean {
        if (this.enableDrag) {
            if (!isSelection && this.selectedLegoKeys.length <= 1) {
                this.selectLego(legoConfig);
            }
            return this.selectedLegoKeys.includes(legoConfig.key) || isSelection;
        }
        return false;

    }

    @runOutside
    initDrag(eventStart: MouseEvent, legoConfig: LegoConfig, isSelection = false): void {
        if (!this.validInitDrag(legoConfig, isSelection)) {
            return;
        }
        const dragHandler = (item, selectionGroup: LegoConfig[] = []) => {
            this.isDragging = true;
            const {minBoundX, minBoundY} = this.getMaxAndMinBounds();
            const {dragEnd$, drag$} = this.getMouseEvents();
            const positionInitialX = Math.round(item.x);
            const positionInitialY = Math.round(item.y);
            const initialX = (eventStart.pageX - minBoundX) / this.scale;
            const initialY = (eventStart.pageY - minBoundY) / this.scale;
            const offsetX = initialX - item.x;
            const offsetY = initialY - item.y;
            let dragEndSub: Subscription;
            let newLegoGroupPosition = []
            this.removeGuideLinesByLego(item);
            const dragSub = drag$.subscribe(eventDrag => {
                const newX = (eventDrag.pageX - minBoundX) / this.scale - offsetX;
                const newY = (eventDrag.pageY - minBoundY) / this.scale - offsetY;
                item.x = Math.round(newX);
                item.y = Math.round(newY);
                this.snapToGuideLine(item, false, selectionGroup.map(({key}) => key));
                this.updateLegoViewPositionAndSize(item);
                newLegoGroupPosition = selectionGroup.map((lego) => ({
                    ...lego,
                    x: Math.round(lego.x + (item.x - positionInitialX)),
                    y: Math.round(lego.y + (item.y - positionInitialY)),
                }));
                newLegoGroupPosition.forEach((lego) => this.updateLegoViewPositionAndSize(lego));
                this.changeDrawGuidelines(this.selectionPreview, item.x, item.y, item.width, item.height);
            });
            dragEndSub = dragEnd$.subscribe(() => {
                this.hiddenAllHighlightLines();
                newLegoGroupPosition.forEach(lego => {
                    this.updateLegoData(lego);
                    this.updateLegoViewData(lego);
                });
                this.updateLegoData(item);
                this.updateLegoViewData(item);
                dragSub.unsubscribe();
                dragEndSub.unsubscribe();
                this.isDragging = false;
            });
        };
        const selectedLego = this.selectedLegoKeys.map(key => this.allLegoConfig.find(el => el.key === key));
        if (this.selectedLegoKeys.length > 1) {
            dragHandler(this.selectionArea, selectedLego);
        } else {
            selectedLego.forEach(item => dragHandler(item));
        }
    }

    selectionLegoByArea() {
        const minX = this.selectionArea.x;
        const minY = this.selectionArea.y;
        const maxX = this.selectionArea.x + this.selectionArea.width;
        const maxY = this.selectionArea.y + this.selectionArea.height;
        const selection = this.allLegoConfig
            .filter(lego => (lego.x >= minX) && ((lego.x + lego.width) <= maxX)
                && (lego.y >= minY) && ((lego.y + lego.height) <= maxY));
        this.resizeSelectionAreaBySelectedLego(selection);
        this.selectedLegoKeys = selection.map(({key}) => key);
        this.applySelectedLegoInView(selection.length !== 1);
    }

    resizeSelectionAreaBySelectedLego(selection: LegoConfig[]) {
        const x = Math.min.apply(Math, selection.map(el => el.x)) - 1;
        const y = Math.min.apply(Math, selection.map(el => el.y)) - 1;
        const width = Math.max.apply(Math, selection.map(el => el.x + el.width)) - x + 1;
        const height = Math.max.apply(Math, selection.map(el => el.y + +el.height)) - y + 1;
        this.selectionArea = {
            x,
            y,
            width,
            height
        };
        if (selection.length > 1) {
            this.renderer.addClass(this.selectionPreview, 'select');
            this.changeDrawGuidelines(this.selectionPreview, this.selectionArea.x, this.selectionArea.y, this.selectionArea.width, this.selectionArea.height);
        } else {
            this.stateSelectionGuidelines(false);
        }

    }

    snapToGuideLine(item, isResize = false, ignoreAxisKey = []): void {
        this.hiddenAllHighlightLines();
        this.setGuidelineSnap('x', item, isResize, ignoreAxisKey);
        this.setGuidelineSnap('y', item, isResize, ignoreAxisKey);
    }

    showHighlightLines(axis, position): void {
        const className = 'line-guide-' + axis;
        const element = this.document.createElement('div');
        element.classList.add(className);
        element.style[axis === 'x' ? 'left' : 'top'] = `${position * this.scale}px`;
        this.guideContainer.appendChild(element);
    }

    hiddenAllHighlightLines(): void {
        const data = this.document.querySelectorAll<HTMLDivElement>('[class*="line-guide-"]');
        data.forEach(el => {
            el.remove();
        });
    }

    setGuidelineSnap(axis, lego, isResize = false, ignoreAxisKey = []): any {
        const side = axis === 'x' ? 'width' : 'height';
        const size = lego[side];
        const distance = lego[axis];
        const halfSideLength = Math.abs(size / 2);
        const endDistance = distance + size;
        const center = distance + halfSideLength;
        for (const item of this.lineGuides[axis]) {
            if (ignoreAxisKey.includes(item.parent)) {
                break;
            }
            const position = item.position;
            let showGuide = false;
            if (Math.abs(position - distance) <= this.snapSize) {
                lego[axis] = position;
                showGuide = true;
            } else if (Math.abs(center - position) <= this.snapSize) {
                if (isResize) {
                    lego[side] = Math.round(Math.abs(position - distance) * 2);
                } else {
                    lego[axis] = position - halfSideLength;
                }
                showGuide = true;
            } else if (Math.abs(endDistance - position) <= this.snapSize) {
                if (isResize) {
                    lego[side] = Math.abs(position - distance);
                } else {
                    lego[axis] = position - size;
                }
                showGuide = true;
            }
            if (showGuide) {
                this.showHighlightLines(axis, position);
            }
        }
    }

    removeGuideLinesByLego(item): void {
        this.lineGuides.x = this.lineGuides.x.filter(el => el.parent !== item.key);
        this.lineGuides.y = this.lineGuides.y.filter(el => el.parent !== item.key);
    }

    updateLegoData(item) {
        if (item.key) {
            this.allLegoConfig = this.allLegoConfig.map(el => ({
                ...el,
                ...(el.key === item.key ? item : {})
            }));
        }
    }

    updateLegoViewData(item: LegoConfig) {
        this.updateLegoViewPositionAndSize(item);
        this.calculateLineGuidesOfLego(item);
    }

    updateLegoViewPositionAndSize(item: LegoConfig): void {
        const lego = this.document.querySelector<HTMLDivElement>(`[data-key="${item.key}"]`);
        if (lego) {
            this.renderer.setStyle(lego, 'display', `block`);
            this.renderer.setStyle(lego, 'width', `${item.width}px`);
            this.renderer.setStyle(lego, 'height', `${item.height}px`);
            this.renderer.setStyle(lego, 'left', `${item.x}px`);
            this.renderer.setStyle(lego, 'top', `${item.y}px`);
        } else {
            setTimeout(() => this.updateLegoViewPositionAndSize(item), 300);
        }
    }

    calculateLineGuidesOfLego(item: LegoConfig): void {
        if(!item.key){
            return
        }
        this.removeGuideLinesByLego(item);
        this.lineGuides.x = [
            ...this.lineGuides.x,
            ...[
                {parent: item.key, position: item.x},
                {parent: item.key, position: item.x + Math.round(item.width / 2)},
                {parent: item.key, position: item.x + item.width}
            ]
        ];
        this.lineGuides.y = [
            ...this.lineGuides.y,
            ...[
                {parent: item.key, position: item.y},
                {parent: item.key, position: item.y + Math.round(item.height / 2)},
                {parent: item.key, position: item.y + item.height}
            ]
        ];
    }

    addNewLego(newLego: LegoConfig): void {
        newLego.key = uuid();
        this.allLegoConfig.push({...this.drawItemData, ...newLego});
        this.updateLegoViewData(newLego);
        this.cdr.detectChanges();
    }

    removeLegoByKey(key): void {
        this.allLegoConfig = this.allLegoConfig.filter(el => el.key !== key);
    }

    unSelectAllLegoInView() {
        this.document.querySelectorAll('.lego-item')
            .forEach(lego => {
                this.renderer.removeClass(lego, 'select');
                this.renderer.removeClass(lego, 'in-group');
            });

    }

    applySelectedLegoInView(inGroupLego = false) {
        this.document.querySelectorAll('.lego-item.select').forEach(lego => this.renderer.removeClass(lego, 'select'));
        this.selectedLegoKeys
            .map(key => this.document.querySelector<HTMLDivElement>(`[data-key="${key}"]`))
            .forEach(lego =>
                inGroupLego ? this.renderer.addClass(lego, 'in-group') :
                    this.renderer.addClass(lego, 'select')
            );

    }

    selectLego(item: LegoConfig): void {
        if (this.visualizationMode || this.isResizing || this.isDragging || this.isSelecting) {
            return;
        }
        this.selectedLegoKeys = [item.key];
        this.applySelectedLegoInView();
        this.stateSelectionGuidelines(false);
        this.selectionChange.emit(item.key);
    }

    clearSelectLego(): void {
        this.selectionChange.emit(null);
        this.unSelectAllLegoInView();
        this.selectedLegoKeys = [];
    }

    @runOutside
    resize(eventStart: MouseEvent, direction: string, legoConfig: LegoConfig, isSelection = false): void {
        if (!this.enableResize) {
            return;
        }
        const resizeHandler = (item, selectionGroup: LegoConfig[] = []) => {
            this.isResizing = true;
            const {minBoundX, minBoundY} = this.getMaxAndMinBounds();
            let dragEndSub;

            const initialX = eventStart.pageX / this.scale - minBoundX;
            const initialY = eventStart.pageY / this.scale - minBoundY;
            const offsetY = item.y;
            const offsetX = item.x;
            const height = item.height;
            const width = item.width;
            const {dragEnd$, drag$} = this.getMouseEvents();
            this.removeGuideLinesByLego(item);
            const dragSub = drag$.subscribe(eventDrag => {
                const resizeByNegativeAxis = axis => {
                    const pageAxis = axis === 'x' ? eventDrag.pageX : eventDrag.pageY;
                    const initial = axis === 'x' ? initialX : initialY;
                    const minBound = axis === 'x' ? minBoundX : minBoundY;
                    const minSize = axis === 'x' ? this.minWidth : this.minHeight;
                    const offset = axis === 'x' ? offsetX : offsetY;
                    const size = axis === 'x' ? width : height;
                    const reduce = pageAxis / this.scale - initial - minBound;
                    const reduceSize = size - reduce;
                    if (reduceSize >= minSize) {
                        item[axis] = Math.round(offset + reduce);
                    }
                    if (item[axis]) {
                        item[axis === 'x' ? 'width' : 'height'] = Math.round(size - reduce);
                    }
                };
                const resizeByPositiveAxis = axis => {
                    const pageAxis = axis === 'x' ? eventDrag.pageX : eventDrag.pageY;
                    const initial = axis === 'x' ? initialX : initialY;
                    const minBound = axis === 'x' ? minBoundX : minBoundY;
                    const size = axis === 'x' ? width : height;
                    const reduce = pageAxis / this.scale - minBound;
                    item[axis === 'x' ? 'width' : 'height'] = Math.round(size + reduce - initial);
                };
                if (direction.indexOf('right') >= 0) {
                    resizeByPositiveAxis('x');
                }
                if (direction.indexOf('left') >= 0) {
                    resizeByNegativeAxis('x');
                }

                if (direction.indexOf('top') >= 0) {
                    resizeByNegativeAxis('y');
                }
                if (direction.indexOf('bottom') >= 0) {
                    resizeByPositiveAxis('y');
                }
                item.width = Math.round(Math.max(this.minWidth, item.width));
                item.height = Math.round(Math.max(this.minHeight, item.height));
                this.snapToGuideLine(item, true, selectionGroup.map(({key}) => key));
                this.updateLegoViewPositionAndSize(item);
                this.changeDrawGuidelines(this.selectionPreview, item.x, item.y, item.width, item.height);
                const newLegoGroupPosition = selectionGroup.map((lego) => ({
                    ...lego,
                    width: lego.width + (item.width - width),
                    height: lego.height + (item.height - height),
                    x: lego.x + (item.x - offsetX),
                    y: lego.y + (item.y - offsetY),
                }));
                newLegoGroupPosition.forEach((lego) => this.updateLegoViewPositionAndSize(lego));
                if(dragEndSub){
                    dragEndSub.unsubscribe();
                }
                dragEndSub = dragEnd$.subscribe(() => {
                    newLegoGroupPosition.forEach(lego => {
                        this.updateLegoData(lego);
                        this.updateLegoViewData(lego);
                    });
                    this.updateLegoData(item);
                    this.updateLegoViewData(item);
                    this.hiddenAllHighlightLines();
                    dragSub.unsubscribe();
                    dragEndSub.unsubscribe();
                    this.isResizing = false;
                });
            });
        };
        const selectedLego = this.selectedLegoKeys.map(key => this.allLegoConfig.find(el => el.key === key));
        if (this.selectedLegoKeys.length > 1) {
            resizeHandler(this.selectionArea, selectedLego);
        } else {
            selectedLego.forEach(item => resizeHandler(item));
        }
    }

    ngOnDestroy(): void {
        this.resizeScreen$.unsubscribe();
        this.keyDown$.unsubscribe();
        this.keyUp$.unsubscribe();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.allLegoConfig) {
            this.allLegoConfig.forEach(lego => this.updateLegoViewData(lego));
        }
    }
}
