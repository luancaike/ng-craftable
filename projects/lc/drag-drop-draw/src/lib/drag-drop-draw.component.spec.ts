import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DragDropDrawComponent } from './drag-drop-draw.component';

describe('DragDropDrawComponent', () => {
  let component: DragDropDrawComponent;
  let fixture: ComponentFixture<DragDropDrawComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DragDropDrawComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DragDropDrawComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
