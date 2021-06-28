import { Injector, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { setInjector } from './util';
import {LocalHistoryService} from './local-history.service';
import {ShortcutService} from './shortcut.service';
import { CraftableComponent } from './craftable.component';

@NgModule({
    imports: [FormsModule, CommonModule],
    declarations: [CraftableComponent],
    providers: [LocalHistoryService, ShortcutService],
    exports: [CraftableComponent]
})
export class CraftableModule {
    constructor(injector: Injector) {
        setInjector(injector);
    }
}
