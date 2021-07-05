import { Injector, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { setInjector } from './util';
import { CraftableComponent } from './craftable.component';

@NgModule({
    imports: [FormsModule, CommonModule],
    declarations: [CraftableComponent],
    exports: [CraftableComponent]
})
export class CraftableModule {
    constructor(injector: Injector) {
        setInjector(injector);
    }
}
