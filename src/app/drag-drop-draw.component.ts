import {DOCUMENT} from '@angular/common';
import {
  AfterViewInit,
  Component,
  ContentChild,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnDestroy,
  Output,
  TemplateRef,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import {fromEvent, Subscription} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {v4 as uuid} from 'uuid';

@Component({
  selector: 'drag-drop-draw',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './drag-drop-draw.component.html',
  styleUrls: ['./drag-drop-draw.component.scss']
})
export class DragDropDrawComponent implements AfterViewInit, OnDestroy {
  @ContentChild('template', {read: TemplateRef}) template: TemplateRef<any>;
  @ViewChild('canvasContainer') canvasContainerRef: ElementRef<HTMLElement>;
  @ViewChild('workspace') workspaceRef: ElementRef<HTMLElement>;
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
  @Input() public drawItemData: any = {teste: 'ABC'};
  @Input() public enableDraw = false;
  @Input() public isDragging = false;
  @Input() public isResizing = false;
  @Input() public scale = 1;

  @Output() public drawStart = new EventEmitter();
  @Output() public drawEnd = new EventEmitter();

  public lineGuides = {
    x: [],
    y: []
  };
  public fixedlineGuides = {
    x: [{parent: 'fixed', position: 0}, {parent: 'fixed', position: 600}, {parent: 'fixed', position: 1200}],
    y: [{parent: 'fixed', position: 0}, {parent: 'fixed', position: 450}, {parent: 'fixed', position: 900}]
  };
  public selectedLego = [];
  private resize$: Subscription;
  private resizeDebounce;

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
    this.initFixedGuide();
    this.fixScaleByScreen();
    this.fixScaleSize();
    this.resize$ = fromEvent<MouseEvent>(window, 'resize').subscribe(() => {
      clearTimeout(this.resizeDebounce);
      this.resizeDebounce = setTimeout(() => {
        this.fixScaleByScreen();
        this.fixScaleSize();
      }, 100);
    });

    this.allLegoConfig.forEach(lego => this.calcLineGuides(lego));
  }

  fixScaleByScreen(): void {
    this.scale = this.workspace.offsetWidth < 1500 ? this.workspace.offsetWidth / 1500 : 1;
    this.canvasContainer.style.transform = `scale(${this.scale})`;
  }

  fixScaleSize(): void {
    const width = this.canvasContainer.offsetWidth;
    const height = this.canvasContainer.offsetHeight;
    this.document.querySelector<HTMLDivElement>('.scale-wrapper').style.width = `${width * this.scale}px`;
    this.document.querySelector<HTMLDivElement>('.scale-wrapper').style.height = `${height * this.scale}px`;
  }

  initFixedGuide(): void {
    const width = this.canvasContainer.offsetWidth;
    const height = this.canvasContainer.offsetHeight;
    this.lineGuides.x = [0, width / 2, width].map(position => ({parent: 'fixed', position}));
    this.lineGuides.y = [0, height / 2, height].map(position => ({parent: 'fixed', position}));
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
    if (!this.enableDraw || this.isDragging || this.isResizing) {
      return;
    }
    this.drawStart.emit(eventStart);
    const {minBoundX, minBoundY} = this.getMaxAndMinBounds();
    const {dragEnd$, drag$} = this.getMouseEvents();
    let dragEndSub;
    let dragSub;
    let debounced;
    let width = 0;
    let height = 0;
    const newLego: any = {};
    const startX = (eventStart.pageX - minBoundX) / this.scale;
    const startY = (eventStart.pageY - minBoundY) / this.scale;
    newLego.x = startX;
    newLego.y = startY;
    this.drawStart.emit(newLego);
    debounced = setTimeout(() => {
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
        newLego.width = Math.max(this.minWidth, width);
        newLego.height = Math.max(this.minHeight, height);
        this.snapToGuideLine(newLego, true);
        this.changeDrawGuidelines(newLego.x, newLego.y, newLego.width, newLego.height);
      });
    }, 100);
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
    if (!this.enableDrag) {
      return;
    }
    this.isDragging = true;
    const {minBoundX, minBoundY} = this.getMaxAndMinBounds();
    const {dragEnd$, drag$} = this.getMouseEvents();
    const initialX = ((eventStart.pageX - minBoundX) / this.scale);
    const initialY = (eventStart.pageY - minBoundY) / this.scale;
    const offsetX = initialX - (item.x);
    const offsetY = initialY - (item.y);
    let dragEndSub;
    this.removeGuideLinesByLego(item);
    const dragSub = drag$.subscribe(eventDrag => {
      const newX = ((eventDrag.pageX - minBoundX) / this.scale) - offsetX;
      const newY = ((eventDrag.pageY - minBoundY) / this.scale) - offsetY;
      item.x = newX;
      item.y = newY;
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
    const halfSideLength = Math.abs(size / 2);
    const endDistance = distance + size;
    const center = distance + halfSideLength;
    for (const item of this.lineGuides[axis]) {
      const position = (item.position);
      let showGuide = false;
      if (Math.abs((position - distance)) <= this.snapSize) {
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
    newLego.id = uuid();
    this.calcLineGuides(newLego);
    this.allLegoConfig.push({...newLego, ...this.drawItemData});
  }

  selectLego(eventStart: MouseEvent, item, lego: HTMLElement): void {
    this.selectedLego = [lego];
  }

  clearSelectLego(): void {
    //this.selectedLego = [];
  }

  resize(eventStart: MouseEvent, direction, item): void {
    if (!this.enableResize) {
      return;
    }
    this.isResizing = true;
    const {minBoundX, maxBoundX, maxBoundY, minBoundY} = this.getMaxAndMinBounds();
    let dragEndSub;

    const initialX = ((eventStart.pageX / this.scale)) - minBoundX;
    const initialY = (eventStart.pageY / this.scale) - minBoundY;
    const offsetY = item.y;
    const height = item.height;
    const offsetX = item.x;
    const width = item.width;
    const {dragEnd$, drag$} = this.getMouseEvents();
    this.removeGuideLinesByLego(item);
    const dragSub = drag$.subscribe(eventDrag => {

      if (direction === 'right') {
        const mouseX = eventDrag.pageX / this.scale - minBoundX;
        item.width = width + mouseX - initialX;
      }
      if (direction === 'left') {
        const reduceX = ((eventDrag.pageX / this.scale)) - initialX - minBoundX;
        const reduceWidth = width - reduceX;
        if (reduceWidth >= this.minWidth) {
          item.x = offsetX + reduceX;
        }
        if (item.x) {
          item.width = width - reduceX;
        }
      }

      if (direction === 'top') {
        const reduceY = (eventDrag.pageY / this.scale) - initialY - minBoundY;
        const reduceHeight = height - reduceY;
        if (reduceHeight >= this.minHeight) {
          item.y = offsetY + reduceY;
        }
        if (item.y) {
          item.height = height - reduceY;
        }
      }
      if (direction === 'bottom') {
        const reduceY = eventDrag.pageY / this.scale - initialY - minBoundY;
        item.height = height + reduceY;
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
    this.resize$.unsubscribe();
  }
}
