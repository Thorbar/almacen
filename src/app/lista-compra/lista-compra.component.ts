import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Producto } from '../articulos/articulos.component';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-lista-compra',
  templateUrl: './lista-compra.component.html',
  styleUrls: ['./lista-compra.component.css']
})
export class ListaCompraComponent implements OnInit {
  selectedLanguage: string = 'es'; // Declara la propiedad aquí
  productos$?: Observable<Producto[]>;

  constructor(private firestore: AngularFirestore,
              private router: Router,
              private translate: TranslateService) {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    this.selectedLanguage = savedLanguage || 'es';
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);
  }

  // Función para cambiar el idioma
  changeLanguage(lang: string) {
    this.selectedLanguage = lang; // Actualiza el idioma seleccionado
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    localStorage.setItem('selectedLanguage', lang);
  }

  ngOnInit() {
    // Combine observables de todas las colecciones
    const categorias = [
      'Productos_Congelado',
      'Productos_Fresco',
      'Productos_Seco',
      'Productos_Limpieza'
    ];

    const observables = categorias.map(categoria => 
      this.firestore.collection<Producto>(categoria, ref => ref.where('cantidadStock', '<=', 1)).valueChanges()
    );

    // Combine todos los observables en uno
    this.productos$ = combineLatest(observables).pipe(
      map(arrays => arrays.flat()) // Combina todos los arrays en un solo array
    );
  }

  volver() {
    this.router.navigate(['/main-site']);
  }
}
