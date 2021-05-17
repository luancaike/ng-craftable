import {DOCUMENT} from '@angular/common';
import {AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild, ViewEncapsulation} from '@angular/core';
import {fromEvent} from 'rxjs';
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
  @ViewChild('guideContainer') guideContainerRef: ElementRef<HTMLElement>;
  public minWidth = 50;
  public minHeight = 50;
  public allLegoConfig = [];
  lineGuides = {
    x: [{parent: 'fixed', position: 0}, {parent: 'fixed', position: 450}, {parent: 'fixed', position: 900}],
    y: [{parent: 'fixed', position: 0}, {parent: 'fixed', position: 600}, {parent: 'fixed', position: 1200}]
  };
  public isDrawMode = true;
  public isDragging = false;
  public isResizing = false;
  public selectedLego = [];

  constructor(@Inject(DOCUMENT) private document: Document) {
  }

  get guideContainer(): HTMLElement {
    return this.guideContainerRef.nativeElement;
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
      this.canvasContainer.offsetLeft + this.canvasContainer.offsetWidth;
    const maxBoundY =
      this.canvasContainer.offsetTop + this.canvasContainer.offsetHeight;
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
    if (this.isDragging || this.isResizing) {
      return;
    }
    const {maxBoundX, maxBoundY, minBoundX, minBoundY} = this.getMaxAndMinBounds();
    const {dragEnd$, drag$} = this.getMouseEvents();
    let dragEndSub;
    let dragSub;
    let debounced;
    let width = 0;
    let height = 0;
    const newLego: any = {};
    const startX = eventStart.pageX - minBoundX;
    const startY = eventStart.pageY - minBoundY;
    newLego.x = startX;
    newLego.y = startY;
    debounced = setTimeout(() => {
      this.stateDrawGuidelines();
      dragSub = drag$.subscribe(eventDrag => {
        const mouseX = Math.max(minBoundX, Math.min(maxBoundX, eventDrag.pageX)) - minBoundX;
        const mouseY = Math.max(minBoundY, Math.min(maxBoundY, eventDrag.pageY)) - minBoundY;
        width = Math.abs(mouseX - startX);
        height = Math.abs(mouseY - startY);
        if (mouseX < startX) {
          newLego.x = mouseX;
        }
        if (mouseY < startY) {
          newLego.y = mouseY;
        }
        newLego.width = width;
        newLego.height = height;
        this.snapToGuideLine(newLego, true);
        this.changeDrawGuidelines(newLego.x, newLego.y, newLego.width, newLego.height);
      });
    }, 300);
    dragEndSub = dragEnd$.subscribe(() => {
      clearTimeout(debounced);
      this.hiddenAllHighlightLines();
      this.stateDrawGuidelines(false);
      newLego.width = newLego.width < this.minWidth ? this.minWidth : newLego.width;
      newLego.height = newLego.height < this.minHeight ? this.minHeight : newLego.height;
      if (width && height) {
        this.addNewLego(newLego);
        width = 0;
        height = 0;
      }
      if (dragSub) {
        dragSub.unsubscribe();
      }
      dragEndSub.unsubscribe();
    });
  }

  initDrag(eventStart: MouseEvent, item): void {
    this.isDragging = true;
    const {maxBoundX, maxBoundY, minBoundX, minBoundY} = this.getMaxAndMinBounds();
    const {dragEnd$, drag$} = this.getMouseEvents();
    const initialX = eventStart.pageX - minBoundX;
    const initialY = eventStart.pageY - minBoundY;
    const offsetX = initialX - (item.x);
    const offsetY = initialY - (item.y);
    let dragEndSub;
    this.removeGuideLinesByLego(item);
    const dragSub = drag$.subscribe(eventDrag => {
      let newX = eventDrag.pageX - minBoundX - offsetX;
      let newY = eventDrag.pageY - minBoundY - offsetY;
      newX = newX + item.width + minBoundX > maxBoundX ? maxBoundX - minBoundX - item.width : newX;
      newY = newY + item.height + minBoundY > maxBoundY ? maxBoundY - minBoundY - item.height : newY;
      item.x = Math.max(0, newX);
      item.y = Math.max(0, newY);
      this.snapToGuideLine(item);
      dragEndSub = dragEnd$.subscribe(() => {
        this.hiddenAllHighlightLines();
        this.calcLineGuides(item);
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
    element.style[axis === 'x' ? 'left' : 'top'] = `${position}px`;
    this.guideContainer.append(element);
  }

  hiddenAllHighlightLines(): void {
    const data = this.document.querySelectorAll('[class*="line-guide-"]');
    data.forEach(el => el.remove());
  }

  setGuidelineSnap(axis, lego, isResize = false): any {
    const side = axis === 'x' ? 'width' : 'height';
    const size = lego[side];
    const distance = lego[axis];
    const snapSize = 2;
    const halfSideLength = Math.abs(size / 2);
    const endDistance = distance + size;
    const center = distance + halfSideLength;
    for (const item of this.lineGuides[axis]) {
      let showGuide = false;
      if (Math.abs((item.position - distance)) <= snapSize) {
        lego[axis] = item.position;
        showGuide = true;
      } else if (Math.abs(center - item.position) <= snapSize) {
        if (isResize) {
          lego[side] = Math.round(Math.abs(item.position - distance) * 2); // resize snap behavior
        } else {
          lego[axis] = item.position - halfSideLength;
        }
        showGuide = true;
      } else if (Math.abs(endDistance - item.position) <= snapSize) {
        if (isResize) {
          lego[side] = Math.abs(item.position - distance);
        } else {
          lego[axis] = item.position - size;
        }
        showGuide = true;
      }
      if (showGuide) {
        this.showHighlightLines(axis, item.position);
      }
    }

  }

  removeGuideLinesByLego(item): void {
    this.lineGuides.x = this.lineGuides.x.filter(el => el.parent !== item.id);
    this.lineGuides.y = this.lineGuides.y.filter(el => el.parent !== item.id);
  }

  calcLineGuides(item): void {
    this.removeGuideLinesByLego(item);
    this.lineGuides.x = [
      ...this.lineGuides.x,
      ...[
        {parent: item.id, position: item.x},
        {parent: item.id, position: item.x + Math.round(item.width / 2)},
        {parent: item.id, position: item.x + item.width}
      ]
    ];
    this.lineGuides.y = [
      ...this.lineGuides.y,
      ...[
        {parent: item.id, position: item.y},
        {parent: item.id, position: item.y + Math.round(item.height / 2)},
        {parent: item.id, position: item.y + item.height}
      ]
    ];
  }

  addNewLego(newLego): void {
    newLego.id = this.allLegoConfig.length + 1;
    this.calcLineGuides(newLego);
    this.allLegoConfig.push(newLego);
  }

  selectLego(eventStart: MouseEvent, item, lego: HTMLElement): void {
    this.selectedLego = [lego];
    this.initDrag(eventStart, item);
  }

  resize(eventStart: MouseEvent, direction, item): void {
    this.isResizing = true;
    const {minBoundX, maxBoundX, maxBoundY, minBoundY} = this.getMaxAndMinBounds();
    let dragEndSub;

    const initialX = eventStart.pageX - minBoundX;
    const initialY = eventStart.pageY - minBoundY;
    const offsetY = item.y;
    const height = item.height;
    const offsetX = item.x;
    const width = item.width;
    const {dragEnd$, drag$} = this.getMouseEvents();
    this.removeGuideLinesByLego(item);
    const dragSub = drag$.subscribe(eventDrag => {
      if (direction === 'right') {
        const reduceX = Math.min(maxBoundX, eventDrag.pageX) - initialX - minBoundX;
        item.width = Math.max(this.minWidth, width + reduceX);
      }
      if (direction === 'left') {
        const reduceX = eventDrag.pageX - initialX - minBoundX;
        const reduceWidth = width - reduceX;
        if (reduceWidth >= this.minWidth) {
          item.x = Math.max(0, offsetX + reduceX);
        }
        if (item.x) {
          item.width = Math.max(this.minWidth, width - reduceX);
        }
      }

      if (direction === 'top') {
        const reduceY = eventDrag.pageY - initialY - minBoundY;
        const reduceHeight = height - reduceY;
        if (reduceHeight >= this.minHeight) {
          item.y = Math.max(0, offsetY + reduceY);
        }
        if (item.y) {
          item.height = Math.max(this.minHeight, height - reduceY);
        }
      }
      if (direction === 'bottom') {
        const reduceY = Math.min(maxBoundY, eventDrag.pageY) - initialY - minBoundY;
        item.height = Math.max(this.minHeight, height + reduceY);
      }

      this.snapToGuideLine(item, true);
      dragEndSub = dragEnd$.subscribe(() => {
        this.calcLineGuides(item);
        this.hiddenAllHighlightLines();
        dragSub.unsubscribe();
        dragEndSub.unsubscribe();
        this.isResizing = false;
      });
    });
  }

  ngOnDestroy(): void {
  }
}
