import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css']
})
export class AlertComponent implements OnInit {
  @Input() type: 'success' | 'error' | 'info' | 'warning' | 'info_email' | 'confirm' = 'info';
  @Input() message: string = '';
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  isConfirm: boolean = this.type === 'confirm';
  shouldAutoHide: boolean = this.type !== 'info_email'; // No oculta para 'info_email'
  showAlert: boolean = true; // Controla la visibilidad

  constructor() { }

  ngOnInit() {
    if (this.shouldAutoHide) {
      setTimeout(() => {
        this.showAlert = false; // Esto oculta el alert después de 2 segundos
      }, 2000);
    }
  }

  confirm() {
    this.onConfirm.emit();
  }

  cancel() {
    this.onCancel.emit();
  }
}
