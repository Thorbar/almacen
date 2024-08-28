import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlertComponent } from './alert.component'; // Asegúrate de que la ruta sea correcta

@NgModule({
  declarations: [
    AlertComponent // Declara el componente
  ],
  imports: [
    CommonModule // Importa CommonModule para usar directivas como ngClass
  ],
  exports: [
    AlertComponent // Exporta el componente para que pueda ser utilizado en otros módulos
  ]
})
export class AlertModule { }
