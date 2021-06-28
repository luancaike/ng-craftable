import {DragDropDrawComponent} from '../drag-drop-draw.component';
import {Subscription} from 'rxjs';
import {runOutside} from '../util';
import { LegoConfig } from '../model';

export class Draggable {

    constructor(private drawComponent: DragDropDrawComponent) {
    }
    @runOutside
    moveItem(eventStart: MouseEvent, itemToMove, selectionGroup: LegoConfig[] = []) {
        this.drawComponent.isDragging = true;
        const {minBoundX, minBoundY} = this.drawComponent.getMaxAndMinBounds();
        const {dragEnd$, drag$} = this.drawComponent.getMouseEvents();
        const positionInitialX = Math.round(itemToMove.x);
        const positionInitialY = Math.round(itemToMove.y);
        const initialX = (eventStart.pageX - minBoundX) / this.drawComponent.scale;
        const initialY = (eventStart.pageY - minBoundY) / this.drawComponent.scale;
        const offsetX = initialX - itemToMove.x;
        const offsetY = initialY - itemToMove.y;
        let dragEndSub: Subscription;
        let newLegoGroupPosition = [];
        this.drawComponent.removeGuideLinesByLego(itemToMove);
        const dragSub = drag$.subscribe(eventDrag => {
            const newX = (eventDrag.pageX - minBoundX) / this.drawComponent.scale - offsetX;
            const newY = (eventDrag.pageY - minBoundY) / this.drawComponent.scale - offsetY;
            itemToMove.x = this.drawComponent.fixByGridSize(newX);
            itemToMove.y = this.drawComponent.fixByGridSize(newY);
            this.drawComponent.snapToGuideLine(itemToMove, false, selectionGroup.map(({key}) => key));
            this.drawComponent.updateLegoViewPositionAndSize(itemToMove);
            newLegoGroupPosition = selectionGroup.map((lego) => ({
                ...lego,
                x: Math.round(lego.x + (itemToMove.x - positionInitialX)),
                y: Math.round(lego.y + (itemToMove.y - positionInitialY)),
            }));
            newLegoGroupPosition.forEach((lego) => this.drawComponent.updateLegoViewPositionAndSize(lego));
            this.drawComponent.setDrawGuidelines(this.drawComponent.selectionPreview, itemToMove.x, itemToMove.y, itemToMove.width, itemToMove.height);
        });
        dragEndSub = dragEnd$.subscribe(() => {
            this.drawComponent.hiddenGuideLines();
            newLegoGroupPosition.forEach(lego => {
                this.drawComponent.updateLegoData(lego);
                this.drawComponent.updateLegoViewData(lego);
            });
            this.drawComponent.updateLegoData(itemToMove);
            this.drawComponent.updateLegoViewData(itemToMove);
            this.drawComponent.saveLocalHistory();
            dragSub.unsubscribe();
            dragEndSub.unsubscribe();
            this.drawComponent.isDragging = false;
        });
    }
}
