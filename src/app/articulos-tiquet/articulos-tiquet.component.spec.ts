import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArticulosTiquetComponent } from './articulos-tiquet.component';

describe('ArticulosTiquetComponent', () => {
  let component: ArticulosTiquetComponent;
  let fixture: ComponentFixture<ArticulosTiquetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ArticulosTiquetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ArticulosTiquetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
