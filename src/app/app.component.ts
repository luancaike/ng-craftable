import {ChangeDetectionStrategy, Component, ViewChild} from '@angular/core';
import {CraftableComponent} from 'ng-craftable';

@Component({
    selector: 'app-root',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrls: ['./app.component.scss'],
    template: `
        <div class="ddd-area">
            <div class="toolbar">
                <div class="btn-group mt-2 mx-2">
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
                            class="btn btn-sm" (click)="visualizationMode = !visualizationMode">
                        <i class="bi bi-eye-fill"></i>
                        Visualization
                    </button>
                </div>
                <div class="btn-group  mt-2 mx-2">
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
                <div class="btn-group  mt-2 mx-2">
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.copy()">
                        <i class="bi bi-files"></i>
                        Copy
                    </button>
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.cut()">
                        <i class="bi bi-scissors"></i>
                        Cut
                    </button>
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.paste()">
                        <i class="bi bi-clipboard"></i>
                        Paste
                    </button>
                </div>
                <div class="btn-group  mt-2 mx-2">
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.bringToFront()">
                        <i class="bi bi-exclude"></i>
                        Bring to Front
                    </button>
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.bringToBack()">
                        <i class="bi bi-intersect"></i>
                        Bring to Back
                    </button>
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.bringToForward()">
                        <i class="bi bi-front"></i>
                        Bring Forward
                    </button>
                    <button type="button"
                            class="btn btn-sm btn-outline-secondary"
                            (click)="craftable.bringToBackward()">
                        <i class="bi bi-back"></i>
                        Bring Backward
                    </button>
                </div>
                <div class="btn-group  mt-2 mx-2">
                    <button type="button"
                            class="btn btn-sm btn-outline-danger"
                            (click)="craftable.deleteSelection()">
                        <i class="bi bi-trash-fill"></i>
                        Delete
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
