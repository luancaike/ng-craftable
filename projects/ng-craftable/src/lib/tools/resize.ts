import {runOutside} from '../util';
import {CraftableComponent} from '../craftable.component';
import {LegoConfig} from '../model';
import {Subscription} from 'rxjs';

export class Resize {
    private itemResizing: LegoConfig;
    private resizeSub: Subscription;
    private resizeEndSub: Subscription;
    private newLegoGroupPosition: LegoConfig[];
    private selectionGroup: LegoConfig[];
    private legoGroupDiffScale: LegoConfig[];
    private eventDrag: MouseEvent;
    private direction: string;
    private initialX: number;
    private initialY: number;
    private offsetX: number;
    private offsetY: number;
    private width: number;
    private height: number;
    private directionHandler: 'start' | 'end' | 'none';

    constructor(private drawComponent: CraftableComponent) {
    }

    @runOutside
    resizeItemGroup(eventStart: MouseEvent, direction: string, itemResizing, selectionGroup: LegoConfig[]): void {
        this.resize(eventStart, direction, itemResizing, selectionGroup);
    }

    private resize(eventStart: MouseEvent, direction: string, itemResizing, selectionGroup: LegoConfig[] = []): void {
        this.newLegoGroupPosition = [];
        this.itemResizing = itemResizing;
        this.direction = direction;
        this.selectionGroup = selectionGroup;
        this.initValues(eventStart);
        this.initDrawComponent();
        this.initEvents();
    }

    private initDrawComponent() {
        this.drawComponent.isResizing = true;
        this.drawComponent.removeGuideLinesByLego(this.itemResizing);
    }

    private initEvents() {
        const {dragEnd$, drag$} = this.drawComponent.getMouseEvents();
        this.resizeSub = drag$.subscribe(eventDrag => this.resizing(eventDrag));
        this.resizeEndSub = dragEnd$.subscribe(() => this.resizeEnd());
    }

    private initValues(eventStart: MouseEvent) {
        const {minBoundX, minBoundY} = this.drawComponent.getMaxAndMinBounds();
        this.initialX = eventStart.pageX / this.drawComponent.scale - minBoundX;
        this.initialY = eventStart.pageY / this.drawComponent.scale - minBoundY;
        this.offsetY = this.itemResizing.y;
        this.offsetX = this.itemResizing.x;
        this.height = this.itemResizing.height;
        this.width = this.itemResizing.width;
        this.legoGroupDiffScale = this.selectionGroup.map((lego) => ({
            ...lego,
            width: lego.width / this.itemResizing.width,
            height: lego.height / this.itemResizing.height,
            x: (lego.x - this.itemResizing.x) / this.itemResizing.width,
            y: (lego.y - this.itemResizing.y) / this.itemResizing.height,
        }));
    }

    private resizeByNegativeAxis(axis: 'x' | 'y') {
        const {minBoundX, minBoundY} = this.drawComponent.getMaxAndMinBounds();
        const pageAxis = axis === 'x' ? this.eventDrag.pageX : this.eventDrag.pageY;
        const initial = axis === 'x' ? this.initialX : this.initialY;
        const minBound = axis === 'x' ? minBoundX : minBoundY;
        const minSize = axis === 'x' ? this.drawComponent.minWidth : this.drawComponent.minHeight;
        const offset = axis === 'x' ? this.offsetX : this.offsetY;
        const size = axis === 'x' ? this.width : this.height;
        let reduce = (pageAxis / this.drawComponent.scale - initial) - minBound;
        let newAxis = Math.round(offset + this.drawComponent.fixByGridSize(reduce));
        let newSize = Math.round(size - this.drawComponent.fixByGridSize(reduce));
        const reduceSize = size - reduce;
        if (reduceSize >= minSize) {
            this.itemResizing[axis] = this.drawComponent.fixByGridSize(newAxis);
        }
        if (this.itemResizing[axis]) {
            this.itemResizing[axis === 'x' ? 'width' : 'height'] = this.drawComponent.fixByGridSize(newSize);
        }
    };

    private resizeByPositiveAxis(axis: 'x' | 'y') {
        const {minBoundX, minBoundY} = this.drawComponent.getMaxAndMinBounds();

        const pageAxis = axis === 'x' ? this.eventDrag.pageX : this.eventDrag.pageY;
        const initial = axis === 'x' ? this.initialX : this.initialY;
        const minBound = axis === 'x' ? minBoundX : minBoundY;
        const size = axis === 'x' ? this.width : this.height;
        const reduce = pageAxis / this.drawComponent.scale - minBound;
        this.itemResizing[axis === 'x' ? 'width' : 'height'] = this.drawComponent.fixByGridSize(size + reduce - initial);
    };

    private resizing(eventDrag: MouseEvent) {
        this.eventDrag = eventDrag;
        this.switchDirection();
        this.itemResizing.width = Math.round(Math.max(this.drawComponent.minWidth, this.itemResizing.width));
        this.itemResizing.height = Math.round(Math.max(this.drawComponent.minHeight, this.itemResizing.height));
        this.drawComponent.snapToGuideLine(this.itemResizing, true, this.selectionGroup.map(({key}) => key), this.directionHandler);
        this.drawComponent.updateLegoViewPositionAndSize(this.itemResizing);
        this.drawComponent.setDrawGuidelines(this.drawComponent.selectionPreview, this.itemResizing);
        this.newLegoGroupPosition = this.legoGroupDiffScale.map((oldLego) => ({
            ...oldLego,
            x: (this.itemResizing.width * oldLego.x) + this.itemResizing.x,
            y: (this.itemResizing.height * oldLego.y) + this.itemResizing.y,
            width: this.itemResizing.width * oldLego.width,
            height: this.itemResizing.height * oldLego.height
        }));
        this.newLegoGroupPosition.forEach((lego) => this.drawComponent.updateLegoViewPositionAndSize(lego));
    }

    private switchDirection() {
        if (this.direction.indexOf('left') >= 0) {
            this.directionHandler = 'start';
            this.resizeByNegativeAxis('x');
        }
        if (this.direction.indexOf('top') >= 0) {
            this.directionHandler = 'start';
            this.resizeByNegativeAxis('y');
        }
        if (this.direction.indexOf('right') >= 0) {
            this.directionHandler = this.direction.indexOf('top') >= 0 ? 'none' : 'end';
            this.resizeByPositiveAxis('x');
        }
        if (this.direction.indexOf('bottom') >= 0) {
            this.directionHandler = this.direction.indexOf('left') >= 0 ? 'none' : 'end';
            this.resizeByPositiveAxis('y');
        }
    }

    private resizeEnd() {
        this.newLegoGroupPosition.forEach(lego => {
            this.drawComponent.updateLegoData(lego);
            this.drawComponent.updateLegoViewData(lego);
        });
        this.drawComponent.updateLegoData(this.itemResizing);
        this.drawComponent.updateLegoViewData(this.itemResizing);
        this.drawComponent.hiddenGuideLines();
        this.drawComponent.saveLocalHistory();
        this.resizeSub.unsubscribe();
        this.resizeEndSub.unsubscribe();
        this.drawComponent.isResizing = false;
    }
}
