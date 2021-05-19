import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import { DragDropDrawComponent } from './drag-drop-draw.component';
import { AppComponent } from './app.component';


@NgModule({
  imports: [BrowserModule, FormsModule],
  declarations: [AppComponent, DragDropDrawComponent],
  bootstrap: [AppComponent]
})
export class DragDropDrawModule {
}
