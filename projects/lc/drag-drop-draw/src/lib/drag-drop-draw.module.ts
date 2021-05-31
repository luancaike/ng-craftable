import {NgModule} from '@angular/core';
import {DragDropDrawComponent} from './drag-drop-draw.component';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';


@NgModule({
  imports: [BrowserModule, FormsModule],
  declarations: [DragDropDrawComponent],
  exports: [DragDropDrawComponent]
})
export class DragDropDrawModule {
}
