import {Component, ViewChild} from '@angular/core';
import {CraftableComponent} from 'ng-craftable';

@Component({
    selector: 'app-root',
    styleUrls: ['./app.component.scss'],
    template: `
        <div class="ddd-area">
            <div class="toolbar">
                <div class="btn-group  mt-1 mx-1">
                    <button type="button"
                            class="btn btn-sm btn-outline-primary"
                            [class.btn-primary]="craftable.enableDraw"
                            [class.btn-outline-primary]="!craftable.enableDraw"
                            (click)="drawNewLego()">
                        <i class="bi bi-pencil"></i>
                        Draw
                    </button>
                    <button type="button"
                            [class.btn-secondary]="visualizationMode"
                            [class.btn-outline-secondary]="!visualizationMode"
                            class="btn" (click)="visualizationMode = !visualizationMode">
                        <i class="bi bi-eye-fill"></i>
                        Visualization
                    </button>
                </div>
                <div class="btn-group  mt-1 mx-1">
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.undo()">
                        <i class="bi bi-arrow-90deg-left"></i> Undo
                    </button>
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.redo()">
                        <i class="bi bi-arrow-90deg-right"></i> Redo
                    </button>
                </div>
            </div>
            <div class="workspace">
                <ng-craftable #craftable [visualizationMode]="visualizationMode">
                    <ng-template #template let-data>
                        <div class="card h-100">
                            <div class="card-header">
                                {{data.key}}
                            </div>
                            <div class="card-body">
                                <p class="card-text">
                                    {{data | json}}
                                </p>
                            </div>
                            <div class="card-footer">
                                <a href="#" *ngIf="data.teste === 'ABC'" class="btn btn-primary">Teste</a>
                            </div>
                        </div>
                    </ng-template>
                </ng-craftable>
            </div>
            <div class="sidebar"></div>
        </div>

    `
})
export class AppComponent {
    @ViewChild('craftable') craftable: CraftableComponent;
    visualizationMode = false;

    drawNewLego() {
        this.craftable.drawNewLego({teste: 'ABC'});
    }
}
