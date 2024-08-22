import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Producto } from '../articulos/articulos.component'; // Importa la interfaz Producto
import { Router } from '@angular/router';

@Component({
  selector: 'app-lista-compra',
  templateUrl: './lista-compra.component.html',
  styleUrl: './lista-compra.component.css'
})
export class ListaCompraComponent implements OnInit {
  productos$?: Observable<Producto[]>;


  constructor(private firestore: AngularFirestore,
              private router: Router) {}

  ngOnInit() {
    // Filtra los productos con cantidad en stock <= 1
    this.productos$ = this.firestore.collection<Producto>('productos', ref =>
      ref.where('cantidadStock', '<=', 1)
    ).valueChanges();
  }

  volver() {
    this.router.navigate(['/main-site']);
  }
}
