import { Injector, NgModule } from '@angular/core';
import { DragDropDrawComponent } from './drag-drop-draw.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { setInjector } from './util';
import {LocalHistoryService} from './local-history.service';
import {ShortcutService} from './shortcut.service';

@NgModule({
    imports: [FormsModule, CommonModule],
    declarations: [DragDropDrawComponent],
    providers: [LocalHistoryService, ShortcutService],
    exports: [DragDropDrawComponent]
})
export class DragDropDrawModule {
    constructor(injector: Injector) {
        setInjector(injector);
    }
}
