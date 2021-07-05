import {CraftableComponent} from '../craftable.component';
import {Subscription} from 'rxjs';
import {runOutside} from '../util';
import {LegoConfig} from '../model';

export class Drag {
    private selectionGroup: LegoConfig[];
    private itemToMove: LegoConfig;
    private offsetX: number;
    private offsetY: number;
    private minBoundX: number;
    private minBoundY: number;
    private positionInitialX: number;
    private positionInitialY: number;
    private dragSub: Subscription;
    private dragEndSub: Subscription;

    constructor(private drawComponent: CraftableComponent) {
    }

    @runOutside
    moveItem(eventStart: MouseEvent, itemToMove: LegoConfig, selectionGroup: LegoConfig[] = []) {
        this.itemToMove = itemToMove;
        this.selectionGroup = selectionGroup;

        this.initValues(eventStart);
        this.drawComponent.removeGuideLinesByLego(this.itemToMove);
        this.initEvents();
    }

    private initEvents() {
        const {dragEnd$, drag$} = this.drawComponent.getMouseEvents();

        this.dragSub = drag$.subscribe(eventDrag => this.onDrag(eventDrag));
        this.dragEndSub = dragEnd$.subscribe(() => this.onDragEnd());
    }

    private initValues(eventStart: MouseEvent) {
        const {minBoundX, minBoundY} = this.drawComponent.getMaxAndMinBounds();

        this.drawComponent.isDragging = true;
        this.minBoundX = minBoundX;
        this.minBoundY = minBoundY;
        this.positionInitialX = Math.round(this.itemToMove.x);
        this.positionInitialY = Math.round(this.itemToMove.y);
        this.offsetX = ((eventStart.pageX - this.minBoundX) / this.drawComponent.scale) - this.itemToMove.x;
        this.offsetY = ((eventStart.pageY - this.minBoundY) / this.drawComponent.scale) - this.itemToMove.y;
    }

    private onDragEnd() {
        this.drawComponent.hiddenGuideLines();
        this.drawComponent.updateLegoData(this.itemToMove);
        this.drawComponent.updateLegoViewData(this.itemToMove);
        this.drawComponent.saveLocalHistory();
        this.drawComponent.updateSelectionArea();
        this.drawComponent.isDragging = false;
        this.dragSub.unsubscribe();
        this.dragEndSub.unsubscribe();
    }

    private onDrag(eventDrag: MouseEvent) {
        let newLegoGroupPosition = [];
        const newX = (eventDrag.pageX - this.minBoundX) / this.drawComponent.scale - this.offsetX;
        const newY = (eventDrag.pageY - this.minBoundY) / this.drawComponent.scale - this.offsetY;
        this.itemToMove.x = this.drawComponent.fixByGridSize(newX);
        this.itemToMove.y = this.drawComponent.fixByGridSize(newY);
        this.drawComponent.snapToGuideLine(this.itemToMove, false, this.selectionGroup.map(({key}) => key));
        this.drawComponent.updateLegoViewPositionAndSize(this.itemToMove);
        newLegoGroupPosition = this.selectionGroup.map((lego) => ({
            ...lego,
            x: Math.round(lego.x + (this.itemToMove.x - this.positionInitialX)),
            y: Math.round(lego.y + (this.itemToMove.y - this.positionInitialY)),
        }));
        newLegoGroupPosition.forEach((lego) => {
            this.drawComponent.updateLegoViewPositionAndSize(lego);
            this.drawComponent.updateLegoData(lego);
            this.drawComponent.updateLegoViewData(lego);
        });
        this.drawComponent.setDrawGuidelines(this.drawComponent.selectionPreview, this.itemToMove.x, this.itemToMove.y, this.itemToMove.width, this.itemToMove.height);
    }
}
