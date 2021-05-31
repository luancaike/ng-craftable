import { DOCUMENT } from '@angular/common';
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
    OnDestroy,
    Output,
    QueryList,
    Renderer2,
    TemplateRef,
    ViewChild,
    ViewChildren,
    ViewEncapsulation
} from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';
import { runOutside } from './util';

@Component({
    selector: 'drag-drop-draw',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './drag-drop-draw.component.html',
    styleUrls: ['./drag-drop-draw.component.scss']
})
export class DragDropDrawComponent implements AfterViewInit, OnDestroy {
    @ContentChild('template', { read: TemplateRef }) template: TemplateRef<any>;
    @ViewChildren('lego') legoList!: QueryList<ElementRef<HTMLElement>>;
    @ViewChild('canvasContainer') canvasContainerRef: ElementRef<HTMLElement>;
    @ViewChild('mainArea') mainAreaRef: ElementRef<HTMLElement>;
    @ViewChild('guideContainer') guideContainerRef: ElementRef<HTMLElement>;
    @Input() public allLegoConfig = [
        {
            height: 51,
            id: '9c3cbc87-6828-46da-9469-5f86093010f5',
            width: 77,
            x: 294,
            y: 208
        }
    ];
    @Input() public snapSize = 5;
    @Input() public minWidth = 50;
    @Input() public minHeight = 50;
    @Input() public enableResize = true;
    @Input() public enableDrag = true;
    @Input() public drawItemData: { [k: string]: any };
    @Input() public enableDraw = false;
    @Input() public visualizationMode = false;
    @Input() public isDragging = false;
    @Input() public isResizing = false;
    @Input() public scale = 1;

    @Output() public drawStart = new EventEmitter();
    @Output() public drawing = new EventEmitter();
    @Output() public drawEnd = new EventEmitter();

    public lineGuides = {
        x: [],
        y: []
    };
    public fixedlineGuides = {
        x: [
            { parent: 'fixed', position: 0 },
            { parent: 'fixed', position: 600 },
            { parent: 'fixed', position: 1200 }
        ],
        y: [
            { parent: 'fixed', position: 0 },
            { parent: 'fixed', position: 450 },
            { parent: 'fixed', position: 900 }
        ]
    };
    public selectedLego: HTMLElement[] = [];
    private resizeScreen$: Subscription;
    private resizeDebounce;

    constructor(
        @Inject(DOCUMENT) private document: Document,
        private renderer: Renderer2,
        private cdr: ChangeDetectorRef
    ) {}

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

        this.allLegoConfig.forEach(lego => {
            this.updateLegoViewData(lego);
        });
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
        this.lineGuides.x = [0, width / 2, width].map(position => ({ parent: 'fixed', position }));
        this.lineGuides.y = [0, height / 2, height].map(position => ({ parent: 'fixed', position }));
    }

    trackById(index, item): any {
        return item.id;
    }

    stateDrawGuidelines(show = true): void {
        this.drawPreview.style.display = show ? 'block' : 'none';
        this.drawPreview.style.width = '0';
        this.drawPreview.style.height = '0';
        this.changeDrawGuidelines(null, null, 0, 0);
    }

    changeDrawGuidelines(x = null, y = null, width = null, height = null): void {
        if (x !== null) {
            this.renderer.setStyle(this.drawPreview, 'left', `${x}px`);
        }
        if (y !== null) {
            this.renderer.setStyle(this.drawPreview, 'top', `${y}px`);
        }
        if (width !== null) {
            this.renderer.setStyle(this.drawPreview, 'width', `${width}px`);
        }
        if (height !== null) {
            this.renderer.setStyle(this.drawPreview, 'height', `${height}px`);
        }
    }

    getMaxAndMinBounds(): any {
        const maxBoundX = this.canvasContainer.offsetLeft + this.canvasContainer.offsetWidth;
        const maxBoundY = this.canvasContainer.offsetTop + this.canvasContainer.offsetHeight;
        const minBoundX = this.canvasContainer.offsetLeft;
        const minBoundY = this.canvasContainer.offsetTop;
        return { maxBoundX, maxBoundY, minBoundX, minBoundY };
    }

    getMouseEvents(): any {
        const dragEnd$ = fromEvent<MouseEvent>(this.document, 'mouseup');
        const drag$ = fromEvent<MouseEvent>(this.document, 'mousemove').pipe(takeUntil(dragEnd$));
        return { dragEnd$, drag$ };
    }

    @runOutside
    initDraw(eventStart: MouseEvent): void {
        if (!this.enableDraw || this.isDragging || this.isResizing) {
            return;
        }

        const { minBoundX, minBoundY } = this.getMaxAndMinBounds();
        const { dragEnd$, drag$ } = this.getMouseEvents();
        let dragSub;
        let width = 0;
        let height = 0;
        const newLego: any = {};
        const startX = (eventStart.pageX - minBoundX) / this.scale;
        const startY = (eventStart.pageY - minBoundY) / this.scale;
        newLego.x = startX;
        newLego.y = startY;
        this.drawStart.emit({ event: eventStart, data: newLego });
        const debounced = setTimeout(() => {
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
                this.changeDrawGuidelines(newLego.x, newLego.y, newLego.width, newLego.height);
                this.drawing.emit({ event: eventDrag, data: newLego });
            });
        }, 100);
        const dragEndSub = dragEnd$.subscribe(eventEnd => {
            clearTimeout(debounced);
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
            this.cdr.markForCheck();
            this.drawEnd.emit({ event: eventEnd, data: newLego });
        });
    }

    @runOutside
    initDrag(eventStart: MouseEvent, item, lego?: HTMLElement): void {
        if (!this.enableDrag || !this.selectedLego.includes(lego)) {
            return;
        }
        this.isDragging = true;
        const { minBoundX, minBoundY } = this.getMaxAndMinBounds();
        const { dragEnd$, drag$ } = this.getMouseEvents();
        const initialX = (eventStart.pageX - minBoundX) / this.scale;
        const initialY = (eventStart.pageY - minBoundY) / this.scale;
        const offsetX = initialX - item.x;
        const offsetY = initialY - item.y;
        let dragEndSub;
        this.removeGuideLinesByLego(item);
        const dragSub = drag$.subscribe(eventDrag => {
            const newX = (eventDrag.pageX - minBoundX) / this.scale - offsetX;
            const newY = (eventDrag.pageY - minBoundY) / this.scale - offsetY;
            item.x = Math.round(newX);
            item.y = Math.round(newY);
            this.snapToGuideLine(item);
            this.updateLegoViewPositionAndSize(item);
            dragEndSub = dragEnd$.subscribe(() => {
                this.hiddenAllHighlightLines();
                this.updateLegoViewData(item);
                dragSub.unsubscribe();
                dragEndSub.unsubscribe();
                this.isDragging = false;
            });
        });
    }

    snapToGuideLine(item, isResize = false): void {
        this.hiddenAllHighlightLines();
        this.setGuidelineSnap('x', item, isResize);
        this.setGuidelineSnap('y', item, isResize);
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

    setGuidelineSnap(axis, lego, isResize = false): any {
        const side = axis === 'x' ? 'width' : 'height';
        const size = lego[side];
        const distance = lego[axis];
        const halfSideLength = Math.abs(size / 2);
        const endDistance = distance + size;
        const center = distance + halfSideLength;
        for (const item of this.lineGuides[axis]) {
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
        this.lineGuides.x = this.lineGuides.x.filter(el => el.parent !== item.id);
        this.lineGuides.y = this.lineGuides.y.filter(el => el.parent !== item.id);
    }

    updateLegoViewData(item) {
        this.updateLegoViewPositionAndSize(item);
        this.calculeLineGuidesOfLego(item);
    }

    updateLegoViewPositionAndSize(item): void {
        const lego = this.document.querySelector<HTMLDivElement>(`[data-key="${item.id}"]`);
        if (lego) {
            this.renderer.setStyle(lego, 'width', `${item.width}px`);
            this.renderer.setStyle(lego, 'height', `${item.height}px`);
            this.renderer.setStyle(lego, 'left', `${item.x}px`);
            this.renderer.setStyle(lego, 'top', `${item.y}px`);
        } else {
            setTimeout(() => this.updateLegoViewPositionAndSize(item), 300);
        }
    }

    calculeLineGuidesOfLego(item): void {
        this.removeGuideLinesByLego(item);
        this.lineGuides.x = [
            ...this.lineGuides.x,
            ...[
                { parent: item.id, position: item.x },
                { parent: item.id, position: item.x + Math.round(item.width / 2) },
                { parent: item.id, position: item.x + item.width }
            ]
        ];
        this.lineGuides.y = [
            ...this.lineGuides.y,
            ...[
                { parent: item.id, position: item.y },
                { parent: item.id, position: item.y + Math.round(item.height / 2) },
                { parent: item.id, position: item.y + item.height }
            ]
        ];
    }

    addNewLego(newLego): void {
        newLego.id = uuid();
        this.allLegoConfig.push({ ...newLego, ...this.drawItemData });
        this.updateLegoViewData(newLego);
    }

    updateSelectedLego() {
        this.document.querySelectorAll('.lego-item.select').forEach(lego => this.renderer.removeClass(lego, 'select'));
        this.selectedLego.forEach(lego => this.renderer.addClass(lego, 'select'));
    }

    selectLego(eventStart: MouseEvent, item, lego: HTMLElement): void {
        if (!this.visualizationMode) {
            this.selectedLego = [lego];
            this.updateSelectedLego();
        }
    }

    clearSelectLego(e: MouseEvent): void {
        const result = this.legoList.find(
            lego => lego.nativeElement === e.target || lego.nativeElement.contains(e.target as Node)
        );
        if (!result) {
            this.selectedLego = [];
            this.updateSelectedLego();
        }
    }

    @runOutside
    resize(eventStart: MouseEvent, direction, item): void {
        if (!this.enableResize) {
            return;
        }
        this.isResizing = true;
        const { minBoundX, minBoundY } = this.getMaxAndMinBounds();
        let dragEndSub;

        const initialX = eventStart.pageX / this.scale - minBoundX;
        const initialY = eventStart.pageY / this.scale - minBoundY;
        const offsetY = item.y;
        const offsetX = item.x;
        const height = item.height;
        const width = item.width;
        const { dragEnd$, drag$ } = this.getMouseEvents();
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

            this.snapToGuideLine(item, true);
            this.updateLegoViewPositionAndSize(item);
            dragEndSub = dragEnd$.subscribe(() => {
                this.updateLegoViewData(item);
                this.hiddenAllHighlightLines();
                dragSub.unsubscribe();
                dragEndSub.unsubscribe();
                this.isResizing = false;
            });
        });
    }

    ngOnDestroy(): void {
        this.resizeScreen$.unsubscribe();
    }
}
