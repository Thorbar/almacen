import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Producto } from '../seco/seco.component'; // Asegúrate de importar la interfaz Producto

import { Router } from '@angular/router';

@Component({
  selector: 'app-stock-actual',
  templateUrl: './stock-actual.component.html',
  styleUrls: ['./stock-actual.component.css'] // Asegúrate de usar `styleUrls` aquí
})
export class StockActualComponent implements OnInit {
  productos$?: Observable<Producto[]>; // Declarar como opcional

  constructor(private firestore: AngularFirestore,
              private router: Router) {}

  ngOnInit() {
    this.productos$ = this.firestore.collection<Producto>('productos').valueChanges();
  }

  volver() {
    this.router.navigate(['/main-site']);
  }
}
