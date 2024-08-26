import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Producto } from '../articulos/articulos.component'; // Importa la interfaz Producto
import { TranslateService } from '@ngx-translate/core';
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
    private translate: TranslateService
  ) {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    this.selectedLanguage = savedLanguage || 'es';
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);
  }
  ngOnInit() {
    this.changeCollection(this.selectedCollection); // Inicializar con la colección predeterminada
  }

  volver() {
    this.router.navigate(['/main-site']);
  }

  // Función para cambiar el idioma
  changeLanguage(lang: string) {
    this.selectedLanguage = lang; // Actualiza el idioma seleccionado
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    localStorage.setItem('selectedLanguage', lang);
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