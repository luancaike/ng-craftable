import { Injector, NgModule } from '@angular/core';
import { DragDropDrawComponent } from './drag-drop-draw.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { setInjector } from './util';

@NgModule({
    imports: [FormsModule, CommonModule],
    declarations: [DragDropDrawComponent],
    exports: [DragDropDrawComponent]
})
export class DragDropDrawModule {
    constructor(injector: Injector) {
        setInjector(injector);
    }
}
