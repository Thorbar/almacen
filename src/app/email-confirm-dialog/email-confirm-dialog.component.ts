import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-email-confirm-dialog',
  templateUrl: './email-confirm-dialog.component.html',
  styleUrls: ['./email-confirm-dialog.component.css']
})
export class EmailConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EmailConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string }
  ) {}
  onCancel(): void {
    this.dialogRef.close(false); // Close dialog and return false
  }

  onConfirm(): void {
    this.dialogRef.close(true); // Cierra el diálogo y procede al siguiente diálogo
  }

}
