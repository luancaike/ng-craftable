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
import {Resizable} from './tools/resizable';
import {Draggable} from './tools/draggable';
import {Selectable} from './tools/selectable';
import {Renderable} from './tools/renderable';
import {Snappable} from './tools/snappable';
import {LegoConfig, LinesGuide } from './model';

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
    @Input() public snapSize = 10;
    @Input() public gridSize = 10;
    @Input() public minWidth = 50;
    @Input() public minHeight = 50;
    @Input() public enableResize = true;
    @Input() public enableDrag = true;
    @Input() public drawItemData: { [k: string]: any };
    @Input() public enableStepGrid = false;
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

    public lineGuides : LinesGuide = {
        x: [],
        y: []
    };
    public fixedlineGuides: LinesGuide = {
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
    private resizeScreen$: Subscription;
    private keyDown$: Subscription;
    private keyUp$: Subscription;
    private shortcutKeysStatus = new Map();
    private resizeDebounce;
    private resizable: Resizable;
    private draggable: Draggable;
    private selectable: Selectable;
    private renderable: Renderable;
    private snappable: Snappable;

    constructor(
        @Inject(DOCUMENT) private document: Document,
        public renderer: Renderer2,
        private cdr: ChangeDetectorRef
    ) {
        this.resizable = new Resizable(this);
        this.draggable = new Draggable(this);
        this.selectable = new Selectable(this);
        this.renderable = new Renderable(this);
        this.snappable = new Snappable(this);
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
            .filter(lego => this.selectable.selectedLegoKeys.find(key => lego.key === key));
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
        this.selectable.resizeSelectionAreaBySelectedLego(selectionLegoConfigs);
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

    initDraw(eventStart: MouseEvent): void {
        this.renderable.draw(eventStart);
    }

    initSelection(eventStart: MouseEvent): void {
        this.selectable.selectArea(eventStart);
    }

    validInitDrag(legoConfig: LegoConfig, isSelection: boolean): boolean {
        if (this.enableDrag) {
            if (!isSelection && this.selectable.selectedLegoKeys.length <= 1) {
                this.selectLego(legoConfig);
            }
            return this.selectable.selectedLegoKeys.includes(legoConfig.key) || isSelection;
        }
        return false;

    }

    initDrag(eventStart: MouseEvent, legoConfig: LegoConfig, isSelection = false): void {
        if (!this.validInitDrag(legoConfig, isSelection)) {
            return;
        }

        const selectedLego = this.selectable.selectedLegoKeys.map(key => this.allLegoConfig.find(el => el.key === key));
        if (this.selectable.selectedLegoKeys.length > 1) {
            this.draggable.moveItem(eventStart, this.selectable.selectionArea, selectedLego);
        } else {
            selectedLego.forEach(item => this.draggable.moveItem(eventStart, item));
        }
    }



    snapToGuideLine(lego: LegoConfig, isResize = false, ignoreAxisKey : string[]= []): void {
        this.hiddenAllHighlightLines();
        const params = {
            lineGuides: this.lineGuides,
            snapSize: this.snapSize,
            callBackOnThrust: (axis, position) => this.showHighlightLines(axis, position),
            lego,
            ignoreAxisKey,
            isResize
        };
        this.snappable.checkLegoInSnap({...params, axis: 'x'});
        this.snappable.checkLegoInSnap({...params, axis: 'y'});
    }

    showHighlightLines(axis: 'x' | 'y', position: number): void {
        const className = 'line-guide-' + axis;
        const positionScale = position * this.scale;
        const lineGuideId = `line-guide-${axis}-${positionScale}`;
        const existsGuideThisValue = this.document.querySelector(`[id="${lineGuideId}"]`);
        if (!!existsGuideThisValue) {
            return;
        }
        const element = this.document.createElement('div');
        element.id = lineGuideId;
        element.classList.add(className);
        element.style[axis === 'x' ? 'left' : 'top'] = `${positionScale}px`;
        this.guideContainer.appendChild(element);
    }

    hiddenAllHighlightLines(): void {
        const data = this.document.querySelectorAll<HTMLDivElement>('[class*="line-guide-"]');
        data.forEach(el => {
            el.remove();
        });
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
            this.cdr.detectChanges()
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
        if (!item.key) {
            return;
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
        this.cdr.detectChanges()
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
        this.selectable.selectedLegoKeys
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
        this.selectable.selectedLegoKeys = [item.key];
        this.applySelectedLegoInView();
        this.stateSelectionGuidelines(false);
        this.selectionChange.emit(item.key);
    }

    clearSelectLego(): void {
        this.selectionChange.emit(null);
        this.unSelectAllLegoInView();
        this.selectable.selectedLegoKeys = [];
    }

    fixByGridSize(value: number) {
        if (this.enableStepGrid) {
            return Math.round(value - value % this.gridSize);
        }
        return value;
    }

    initResize(eventStart: MouseEvent, direction: string, legoConfig: LegoConfig, isSelection = false): void {
        if (!this.enableResize) {
            return;
        }
        const selectedLego = this.selectable.selectedLegoKeys.map(key => this.allLegoConfig.find(el => el.key === key));
        if (isSelection) {
            this.resizable.resizeItemGroup(eventStart, direction, this.selectable.selectionArea, selectedLego);
        } else {
            this.resizable.resizeItem(eventStart, direction, legoConfig);
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
