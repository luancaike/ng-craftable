import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CraftableComponent } from './craftable.component';


describe('DragDropDrawComponent', () => {
  let component: CraftableComponent;
  let fixture: ComponentFixture<CraftableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CraftableComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CraftableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
