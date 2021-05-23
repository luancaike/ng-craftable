import {Component} from '@angular/core';

@Component({
  selector: 'app-root',
  styleUrls: ['./app.component.scss'],
  template: `
    <div class="ddd-area">
      <div class="toolbar">
        <button type="button" (click)="enableDraw = !enableDraw">Enable Draw Mode</button>
      </div>
      <div class="workspace">
        <drag-drop-draw [enableDraw]="enableDraw">
          <ng-template #template let-data>
            {{data | json}}
          </ng-template>
        </drag-drop-draw>
      </div>
      <div class="sidebar"></div>
    </div>

  `
})
export class AppComponent {
  enableDraw= false
}
