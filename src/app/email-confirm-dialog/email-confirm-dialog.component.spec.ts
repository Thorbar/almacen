import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmailConfirmDialogComponent } from './email-confirm-dialog.component';

describe('EmailConfirmDialogComponent', () => {
  let component: EmailConfirmDialogComponent;
  let fixture: ComponentFixture<EmailConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EmailConfirmDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmailConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
