import {Component} from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <drag-drop-draw>
      <ng-template #template let-data style="margin-left: 10px">Total</ng-template>
    </drag-drop-draw>
  `
})
export class AppComponent {
}
