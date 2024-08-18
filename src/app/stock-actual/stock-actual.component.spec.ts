import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockActualComponent } from './stock-actual.component';

describe('StockActualComponent', () => {
  let component: StockActualComponent;
  let fixture: ComponentFixture<StockActualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StockActualComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockActualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
