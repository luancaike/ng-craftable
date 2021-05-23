import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {AppComponent} from './app.component';
import {DragDropDrawModule} from '@lc/drag-drop-draw';

@NgModule({
  imports: [BrowserModule, FormsModule, DragDropDrawModule],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
