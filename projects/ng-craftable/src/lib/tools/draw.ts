import {runOutside} from '../util';
import {Subscription} from 'rxjs';
import {CraftableComponent} from '../craftable.component';
import {LegoConfig} from '../model';

export class Draw {
    private newLego: LegoConfig;
    private drawSub: Subscription;
    private drawEndSub: Subscription;
    private startX: number;
    private startY: number;
    private width: number;
    private height: number;

    constructor(private drawComponent: CraftableComponent) {
    }

    @runOutside
    draw(eventStart: MouseEvent): void {
        this.initValues(eventStart);
        this.initDrawComponent(eventStart);
        this.initEvents();
    }

    private initDrawComponent(eventStart: MouseEvent) {
        this.drawComponent.isDrawing = true;
        this.drawComponent.drawStart.emit({event: eventStart, data: this.newLego});
        this.drawComponent.showDrawGuidelines();
    }

    private initEvents() {
        const {dragEnd$, drag$} = this.drawComponent.getMouseEvents();

        this.drawSub = drag$.subscribe(eventDrag => this.drawing(eventDrag));
        this.drawEndSub = dragEnd$.subscribe(eventEnd => this.drawEnd(eventEnd));
    }

    private initValues(eventStart: MouseEvent) {
        const {minBoundX, minBoundY} = this.drawComponent.getMaxAndMinBounds();

        this.newLego = {};
        this.startX = this.drawComponent.fixByGridSize((eventStart.pageX - minBoundX) / this.drawComponent.scale);
        this.startY = this.drawComponent.fixByGridSize((eventStart.pageY - minBoundY) / this.drawComponent.scale);
        this.newLego.x = this.startX;
        this.newLego.y = this.startY;
    }

    private drawing(eventDrag: MouseEvent) {
        const {minBoundX, minBoundY} = this.drawComponent.getMaxAndMinBounds();

        const mouseX = this.drawComponent.fixByGridSize((eventDrag.pageX - minBoundX) / this.drawComponent.scale);
        const mouseY = this.drawComponent.fixByGridSize((eventDrag.pageY - minBoundY) / this.drawComponent.scale);
        this.width = 0;
        this.height = 0;

        this.width = Math.abs(mouseX - this.startX);
        this.height = Math.abs(mouseY - this.startY);
        if (mouseX < this.startX) {
            this.newLego.x = mouseX;
        }
        if (mouseY < this.startY) {
            this.newLego.y = mouseY;
        }
        this.newLego.x = Math.round(this.newLego.x);
        this.newLego.y = Math.round(this.newLego.y);
        this.newLego.width = Math.round(this.width);
        this.newLego.height = Math.round(this.height);
        this.drawComponent.snapToGuideLine(this.newLego, true);
        this.drawComponent.setDrawGuidelines(this.drawComponent.drawPreview, this.newLego);
        this.drawComponent.drawing.emit({event: eventDrag, data: this.newLego});
    }

    private drawEnd(eventEnd: MouseEvent) {
        this.drawComponent.hiddenGuideLines();
        this.drawComponent.hiddenDrawGuidelines();
        this.newLego.width = Math.round(Math.max(this.drawComponent.minWidth, this.width));
        this.newLego.height = Math.round(Math.max(this.drawComponent.minHeight, this.height));
        if (this.width && this.height) {
            this.drawComponent.appendLego(this.newLego);
            this.width = 0;
            this.height = 0;
        }
        this.drawComponent.enableDraw = false;

        this.drawSub.unsubscribe();
        this.drawEndSub.unsubscribe();
        this.drawComponent.saveLocalHistory();
        this.drawComponent.drawEnd.emit({event: eventEnd, data: this.newLego});
        this.drawComponent.isDrawing = true;
    }
}
