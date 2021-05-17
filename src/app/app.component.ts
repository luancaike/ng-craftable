import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  VERSION,
  ViewChild
} from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild('canvasContainer') canvasContainerRef: ElementRef<HTMLElement>;
  @ViewChild('workspace') workspaceRef: ElementRef<HTMLElement>;
  get canvasContainer() {
    return this.canvasContainerRef.nativeElement;
  }
  get workspace() {
    return this.workspaceRef.nativeElement;
  }
  private subscriptions: Subscription[] = [];
  public isDrawMode = false;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  ngAfterViewInit(): void {
    this.initDraw();
  }
  initDraw() {
    const maxBoundX =
      this.canvasContainer.offsetLeft + this.canvasContainer.offsetWidth;
    const maxBoundY =
      this.canvasContainer.offsetTop + this.canvasContainer.offsetHeight;
    const minBoundX = this.canvasContainer.offsetLeft;
    const minBoundY = this.canvasContainer.offsetTop;
    const drawStart$ = fromEvent<MouseEvent>(this.canvasContainer, 'mousedown');
    const dragEnd$ = fromEvent<MouseEvent>(this.document, 'mouseup');
    const drag$ = fromEvent<MouseEvent>(this.document, 'mousemove').pipe(
      takeUntil(dragEnd$)
    );

    let x = '';
    let y = '';
    let width = '';
    let height = '';

    const drawStartSub = drawStart$.subscribe(event => {
      if (!this.isDrawMode) {
        return;
      }

      const dragPreview = this.document.querySelector<HTMLElement>(
        '.draw-preview'
      );
      const initX = Math.abs(event.pageX - minBoundX);
      const initY = Math.abs(event.pageY - minBoundY);
      dragPreview.style.display = 'block';
      width = dragPreview.style.width = '0';
      height = dragPreview.style.height = '0';
      x = dragPreview.style.left = `${initX}px`;
      y = dragPreview.style.top = `${initY}px`;

      const dragSub = drag$.subscribe(event => {
        const widthDraw = Math.min(maxBoundX, event.pageX) - initX - minBoundX;

        const heightDraw = Math.min(maxBoundY, event.pageY) - initY - minBoundY;
        if (widthDraw < 0) {
          x = dragPreview.style.left = `${Math.max(
            0,
            initX - Math.abs(widthDraw)
          )}px`;
          console.log(x);
        }
        if (heightDraw < 0) {
          y = dragPreview.style.top = `${Math.max(
            0,
            initY - Math.abs(heightDraw)
          )}px`;
        }
        width = dragPreview.style.width = `${Math.abs(widthDraw)}px`;
        height = dragPreview.style.height = `${Math.abs(heightDraw)}px`;
      });
      const dragEndSub = dragEnd$.subscribe(() => {
        dragPreview.style.display = 'none';
        const newElement = this.document.createElement('div');
        newElement.style.position = 'absolute';
        newElement.style.background = 'red';
        newElement.style.width = width;
        newElement.style.height = height;
        newElement.style.left = x;
        newElement.style.top = y;
        this.canvasContainer.appendChild(newElement);
      });
      this.subscriptions.push.apply(this.subscriptions, [dragSub, dragEndSub]);
    });
  }
  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
