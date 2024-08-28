import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.css']
})
export class AlertComponent implements OnInit {
  @Input() type: 'success' | 'error' | 'info'  | 'confirm' = 'info';
  @Input() message: string = '';
  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
  isConfirm: boolean = this.type === 'confirm';


  constructor() {}

  ngOnInit() {
    setTimeout(() => {
      // Opcional: Puedes agregar lógica para ocultar el alert
      // Por ejemplo, se puede emitir un evento para que el padre elimine el componente
    }, 2000); // 2000 ms = 2 segundos
  }
  confirm() {
    this.onConfirm.emit();
  }

  cancel() {
    this.onCancel.emit();
  }
}
