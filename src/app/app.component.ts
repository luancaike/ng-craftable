import {DOCUMENT} from '@angular/common';
import {AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild, ViewEncapsulation} from '@angular/core';
import {fromEvent, Subscription} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-root',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainerRef: ElementRef<HTMLElement>;
  @ViewChild('workspace') workspaceRef: ElementRef<HTMLElement>;
  public allLegoConfig = [
    {
      id: 1,
      height: 256,
      width: 540,
      x: 107,
      y: 170,
      lineGuides: {
        x: [107, 377, 647],
        y: [170, 298, 426]
      }
    }
  ];
  public isDrawMode = false;
  public selectedLego = null;
  private subscriptions: Subscription[] = [];

  constructor(@Inject(DOCUMENT) private document: Document) {
  }

  get canvasContainer(): HTMLElement {
    return this.canvasContainerRef.nativeElement;
  }

  get workspace(): HTMLElement {
    return this.workspaceRef.nativeElement;
  }

  get drawPreview(): HTMLElement {
    return this.document.querySelector<HTMLElement>(
      '.draw-preview'
    );
  }

  ngAfterViewInit(): void {
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
      this.drawPreview.style.left = `${x}px`;
    }
    if (y !== null) {
      this.drawPreview.style.top = `${y}px`;
    }
    if (width !== null) {
      this.drawPreview.style.width = `${width}px`;
    }
    if (height !== null) {
      this.drawPreview.style.height = `${height}px`;
    }
  }

  getMaxAndMinBounds(): any {
    const maxBoundX =
      this.canvasContainer.offsetLeft + this.canvasContainer.offsetWidth - 1;
    const maxBoundY =
      this.canvasContainer.offsetTop + this.canvasContainer.offsetHeight - 1;
    const minBoundX = this.canvasContainer.offsetLeft;
    const minBoundY = this.canvasContainer.offsetTop;
    return {maxBoundX, maxBoundY, minBoundX, minBoundY};
  }

  getMouseEvents(): any {
    const dragEnd$ = fromEvent<MouseEvent>(this.document, 'mouseup');
    const drag$ = fromEvent<MouseEvent>(this.document, 'mousemove').pipe(
      takeUntil(dragEnd$)
    );
    return {dragEnd$, drag$};
  }

  initDraw(eventStart: MouseEvent): void {
    const {maxBoundX, maxBoundY, minBoundX, minBoundY} = this.getMaxAndMinBounds();
    const {dragEnd$, drag$} = this.getMouseEvents();

    if (!this.isDrawMode) {
      return;
    }
    let dragEndSub;
    let dragSub;
    let debounced;
    let width = 0;
    let height = 0;
    const newLego: any = {};
    const initialX = Math.abs(eventStart.pageX - minBoundX);
    const initialY = Math.abs(eventStart.pageY - minBoundY);
    newLego.x = initialX;
    newLego.y = initialY;
    debounced = setTimeout(() => {
      this.stateDrawGuidelines();
      this.changeDrawGuidelines(initialX, initialY);
      dragSub = drag$.subscribe(eventDrag => {

        width = Math.max(minBoundX, Math.min(maxBoundX, eventDrag.pageX)) - initialX - minBoundX;
        height = Math.max(minBoundY, Math.min(maxBoundY, eventDrag.pageY)) - initialY - minBoundY;

        if (width < 0) {
          width = Math.abs(width);
          const newX = initialX - width;
          newLego.x = newX;
          this.changeDrawGuidelines(newX);
        }
        if (height < 0) {
          height = Math.abs(height);
          const newY = initialY - height;
          newLego.y = newY;
          this.changeDrawGuidelines(null, newY);
        }
        newLego.width = width < 50 ? 50 : width;
        newLego.height = height < 50 ? 50 : height;
        this.changeDrawGuidelines(null, null, width, height);

      });
    }, 300);
    dragEndSub = dragEnd$.subscribe(() => {
      clearTimeout(debounced);
      this.stateDrawGuidelines(false);
      if (width && height) {
        this.addNewLego(newLego);
        this.isDrawMode = false;
        width = 0;
        height = 0;
      }
    });
    this.subscriptions.push.apply(this.subscriptions, [dragEndSub, dragSub]);
  }

  initDrag(eventStart: MouseEvent, item): void {
    const {maxBoundX, maxBoundY, minBoundX, minBoundY} = this.getMaxAndMinBounds();
    const {dragEnd$, drag$} = this.getMouseEvents();
    const initialX = eventStart.pageX - minBoundX;
    const initialY = eventStart.pageY - minBoundY;
    const offsetX = initialX - (item.x);
    const offsetY = initialY - (item.y);
    let dragEndSub;
    const dragSub = drag$.subscribe(eventDrag => {
      let newX = eventDrag.pageX - minBoundX - offsetX;
      let newY = eventDrag.pageY - minBoundY - offsetY;
      newX = newX + item.width + minBoundX > maxBoundX ? maxBoundX - minBoundX - item.width : newX;
      newY = newY + item.height + minBoundY > maxBoundY ? maxBoundY - minBoundY - item.height : newY;
      item.x = Math.max(0, newX);
      item.y = Math.max(0, newY);
      dragEndSub = dragEnd$.subscribe(() => {
      });
    });
    this.subscriptions.push.apply(this.subscriptions, [dragSub, dragEndSub]);
  }

  addNewLego(newLego): void {
    newLego.id = this.allLegoConfig.length + 1;
    this.allLegoConfig.push(newLego);
  }

  selectLego(eventStart: MouseEvent, item, lego: HTMLElement): void {
    this.selectedLego = lego;
    this.initDrag(eventStart, item);
  }

  resizeLeft(eventStart: MouseEvent, item): void {
    const {maxBoundX, maxBoundY, minBoundX, minBoundY} = this.getMaxAndMinBounds();
    let dragEndSub;

    const initialX = eventStart.pageX - minBoundX;
    const offsetX = item.x;
    const width = item.width;
    const {dragEnd$, drag$} = this.getMouseEvents();

    const dragSub = drag$.subscribe(eventDrag => {
      const reduceX = eventDrag.pageX - initialX - minBoundX;
      const reduceWidth = width - reduceX;
      if (reduceWidth >= 50) {
        item.x = Math.max(0, offsetX + reduceX);
      }
      if (item.x) {
        item.width = Math.max(50, width - reduceX);
      }
      dragEndSub = dragEnd$.subscribe(() => {
      });
    });
    this.subscriptions.push.apply(this.subscriptions, [dragSub, dragEndSub]);

  }

  resizeRight(eventStart: MouseEvent, item): void {
    const {maxBoundX, maxBoundY, minBoundX, minBoundY} = this.getMaxAndMinBounds();
    let dragEndSub;

    const initialX = eventStart.pageX - minBoundX;
    const offsetX = item.x;
    const width = item.width;
    const {dragEnd$, drag$} = this.getMouseEvents();

    const dragSub = drag$.subscribe(eventDrag => {
      const reduceX = Math.min(maxBoundX, eventDrag.pageX) - initialX - minBoundX;
      item.width = Math.max(50, width + reduceX);
      dragEndSub = dragEnd$.subscribe(() => {
      });
    });
    this.subscriptions.push.apply(this.subscriptions, [dragSub, dragEndSub]);

  }

  resizeTop(eventStart: MouseEvent, item): void {
    const {minBoundY} = this.getMaxAndMinBounds();
    let dragEndSub;

    const initialY = eventStart.pageY - minBoundY;
    const offsetY = item.y;
    const height = item.height;
    const {dragEnd$, drag$} = this.getMouseEvents();

    const dragSub = drag$.subscribe(eventDrag => {
      const reduceY = eventDrag.pageY - initialY - minBoundY;
      const reduceHeight = height - reduceY;
      if (reduceHeight >= 50) {
        item.y = Math.max(0, offsetY + reduceY);
      }
      if (item.y) {
        item.height = Math.max(50, height - reduceY);
      }
      dragEndSub = dragEnd$.subscribe(() => {
      });
    });
    this.subscriptions.push.apply(this.subscriptions, [dragSub, dragEndSub]);

  }

  resizeBottom(eventStart: MouseEvent, item): void {
    const {maxBoundY, minBoundY} = this.getMaxAndMinBounds();
    let dragEndSub;

    const initialY = eventStart.pageY - minBoundY;
    const height = item.height;
    const {dragEnd$, drag$} = this.getMouseEvents();

    const dragSub = drag$.subscribe(eventDrag => {
      const reduceY = Math.min(maxBoundY, eventDrag.pageY) - initialY - minBoundY;
      item.height = Math.max(50, height + reduceY);
      dragEndSub = dragEnd$.subscribe(() => {
      });
    });
    this.subscriptions.push.apply(this.subscriptions, [dragSub, dragEndSub]);

  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s && s.unsubscribe && s.unsubscribe());
  }
}
