import {Component} from '@angular/core';

@Component({
  selector: 'app-root',
  styleUrls: ['./app.component.scss'],
  template: `
    <div class="ddd-area">
      <div class="toolbar">
        <button type="button" (click)="enableDraw = !enableDraw">Enable Draw Mode</button>
        <button type="button" (click)="visualizationMode = !visualizationMode">Enable Visualization Mode</button>
      </div>
      <div class="workspace">
        <ng-craftable [enableDraw]="enableDraw" [drawItemData]="{teste: 'ABC'}" [visualizationMode]="visualizationMode">
          <ng-template #template let-data>
            {{data | json}}
            <div *ngIf="data.teste === 'ABC'">
              <button type="button">teste</button>
            </div>
          </ng-template>
        </ng-craftable>
      </div>
      <div class="sidebar"></div>
    </div>

  `
})
export class AppComponent {
  enableDraw = false;
  visualizationMode = false;
}
