import {Component} from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <drag-drop-draw>
      <ng-template #template let-data>
        {{data | json}}
      </ng-template>
    </drag-drop-draw>
  `
})
export class AppComponent {
}
