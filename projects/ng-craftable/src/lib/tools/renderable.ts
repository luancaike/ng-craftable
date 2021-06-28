import {runOutside} from '../util';
import {Subscription} from 'rxjs';
import { CraftableComponent } from '../craftable.component';

export class Renderable {

    constructor(private drawComponent: CraftableComponent) {
    }

    @runOutside
    draw(eventStart: MouseEvent): void {
        this.drawComponent.isDrawing = true;
        const {minBoundX, minBoundY} = this.drawComponent.getMaxAndMinBounds();
        const {dragEnd$, drag$} = this.drawComponent.getMouseEvents();
        let dragSub;
        let width = 0;
        let height = 0;
        const newLego: any = {};
        const startX = this.drawComponent.fixByGridSize((eventStart.pageX - minBoundX) / this.drawComponent.scale);
        const startY = this.drawComponent.fixByGridSize((eventStart.pageY - minBoundY) / this.drawComponent.scale);
        newLego.x = startX;
        newLego.y = startY;
        this.drawComponent.drawStart.emit({event: eventStart, data: newLego});
        let dragEndSub: Subscription;
        this.drawComponent.toggleDrawGuidelines();
        dragSub = drag$.subscribe(eventDrag => {
            const mouseX = this.drawComponent.fixByGridSize((eventDrag.pageX - minBoundX) / this.drawComponent.scale);
            const mouseY = this.drawComponent.fixByGridSize((eventDrag.pageY - minBoundY) / this.drawComponent.scale);
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
            this.drawComponent.snapToGuideLine(newLego, true);
            this.drawComponent.setDrawGuidelines(this.drawComponent.drawPreview, newLego.x, newLego.y, newLego.width, newLego.height);
            this.drawComponent.drawing.emit({event: eventDrag, data: newLego});
        });
        dragEndSub = dragEnd$.subscribe(eventEnd => {
            this.drawComponent.hiddenGuideLines();
            this.drawComponent.toggleDrawGuidelines(false);
            newLego.width = Math.round(Math.max(this.drawComponent.minWidth, width));
            newLego.height = Math.round(Math.max(this.drawComponent.minHeight, height));
            if (width && height) {
                this.drawComponent.addNewLego(newLego);
                width = 0;
                height = 0;
            }
            this.drawComponent.enableDraw = false;
            if (dragSub) {
                dragSub.unsubscribe();
            }
            dragEndSub.unsubscribe();
            this.drawComponent.saveLocalHistory();
            this.drawComponent.drawEnd.emit({event: eventEnd, data: newLego});
            this.drawComponent.isDrawing = true;
        });
    }
}
