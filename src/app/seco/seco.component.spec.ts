import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecoComponent } from './seco.component';

describe('SecoComponent', () => {
  let component: SecoComponent;
  let fixture: ComponentFixture<SecoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SecoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
