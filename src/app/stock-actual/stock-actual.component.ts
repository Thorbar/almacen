import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Producto } from '../articulos/articulos.component'; // Importa la interfaz Producto
import { Router } from '@angular/router';
import { orderBy } from '@angular/fire/firestore';
import firebase from 'firebase/compat/app';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-stock-actual',
  templateUrl: './stock-actual.component.html',
  styleUrls: ['./stock-actual.component.css']
})
export class StockActualComponent implements OnInit {
  selectedLanguage: string = 'es';
  productos$?: Observable<Producto[]>;
  selectedCollection: string = 'Productos_Congelado'; // Colección predeterminada

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
  ) {
  }
  ngOnInit() {
    this.changeCollection(this.selectedCollection); // Inicializar con la colección predeterminada
  }

  volver() {
    this.router.navigate(['/main-site']);
  }

  changeCollection(collection: string) {
    this.selectedCollection = collection;
    this.productos$ = this.firestore.collection<Producto>(collection, ref =>
      ref.orderBy('establecimiento').orderBy('descripcion') // Ordena por 'establecimiento' y luego por 'descripcion'
    ).valueChanges().pipe(
      map(productos =>
        productos.map(producto => {
          const fechaCreacion = producto.fechaCreacion instanceof firebase.firestore.Timestamp
            ? producto.fechaCreacion.toDate()
            : producto.fechaCreacion;

          const fechaUltimaCompra = producto.fechaUltimaCompra instanceof firebase.firestore.Timestamp
            ? producto.fechaUltimaCompra.toDate()
            : producto.fechaUltimaCompra;

          return {
            ...producto,
            fechaCreacion,
            fechaUltimaCompra
          };
        })
      )
    );
  }
}