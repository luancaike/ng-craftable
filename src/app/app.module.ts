import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {AppComponent} from './app.component';
import {CraftableModule} from 'ng-craftable';

@NgModule({
  imports: [BrowserModule, FormsModule, CraftableModule],
  declarations: [AppComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
