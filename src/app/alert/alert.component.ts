import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css']
})
export class AlertComponent implements OnInit {
  @Input() type: 'success' | 'error' | 'info' | 'warning' | 'info_email' | 'test' | 'confirm' = 'test';
  @Input() message: string = '';
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  isConfirm: boolean = false;
  showAlert: boolean = true; // Controla la visibilidad

  constructor() { }

  ngOnInit() {
    this.showAlert = false; // Asegúrate de que la alerta no se muestre al inicio
  }
  // Método para mostrar la alerta
  showAlerts(message: string, type: 'success' | 'error' | 'info' | 'warning' | 'confirm') {
    this.message = message;
    this.type = type;
    this.showAlert = true;
    this.isConfirm = this.type === 'confirm';
  }
  confirm() {
    this.onConfirm.emit();
    this.showAlert = false;;

  }

  cancel() {
    this.onCancel.emit();
    this.showAlert = false;

  }

}
