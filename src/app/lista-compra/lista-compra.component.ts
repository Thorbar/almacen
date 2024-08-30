import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Producto } from '../articulos/articulos.component';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';

@Component({
  selector: 'app-lista-compra',
  templateUrl: './lista-compra.component.html',
  styleUrls: ['./lista-compra.component.css']
})
export class ListaCompraComponent implements OnInit {
  selectedLanguage: string = 'es';
  productos$?: Observable<Producto[]>;

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
  ) {}

  ngOnInit() {
    const categorias = [
      'Productos_Congelado',
      'Productos_Fresco',
      'Productos_Seco',
      'Productos_Limpieza'
    ];

    const observables = categorias.map(categoria =>
      this.firestore.collection<Producto>(categoria, ref => ref.where('cantidadStock', '<=', 1)//.orderBy('establecimiento')
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
      )
    );

    this.productos$ = combineLatest(observables).pipe(
      map(arrays => arrays.flat()) // Combina todos los arrays en un solo array
    );
  }

 

  guardarCambios(producto: Producto) {
    const categoria = this.obtenerCategoria(producto);

    // Verifica si el producto tiene un ID válido
    if (!producto.id) {
      console.error('ID del producto no válido:', producto.id);
      return;
    }

    // Verifica si la categoría es válida
    if (!categoria) {
      console.error('Categoría del producto no válida:', categoria);
      return;
    }

    // Intenta actualizar el documento en Firestore
    this.firestore.collection(categoria).doc(producto.id.toString()).update({
      establecimiento: producto.establecimiento
    })
      .then(() => {
        console.log('Producto actualizado correctamente');
      })
      .catch(error => {
        console.error('Error actualizando producto:', error);
      });
  }

  volver() {
    this.router.navigate(['/main-site']);
  }

  obtenerCategoria(producto: Producto): string {
    // Asegúrate de que la propiedad 'descripcion' existe y tiene un valor válido
    if (!producto.descripcion) {
      console.error('Descripción del producto no válida:', producto.descripcion);
      return '';
    }

    // Comprobamos si la descripción contiene ciertas palabras clave para determinar la categoría
    if (producto.descripcion.includes('Congelado')) {
      return 'Productos_Congelado';
    } else if (producto.descripcion.includes('Fresco')) {
      return 'Productos_Fresco';
    } else if (producto.descripcion.includes('Seco')) {
      return 'Productos_Seco';
    } else if (producto.descripcion.includes('Limpieza')) {
      return 'Productos_Limpieza';
    } else {
      console.error('Categoría del producto no reconocida:', producto.descripcion);
      return '';
    }
  }
}
