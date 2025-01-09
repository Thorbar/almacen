import { Component, ViewChild, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, } from 'rxjs';
import { map } from 'rxjs/operators';
import { Producto } from '../articulos/articulos.component';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { AlertComponent } from '../alert/alert.component';


@Component({
  selector: 'app-lista-compra',
  templateUrl: './lista-compra.component.html',
  styleUrls: ['./lista-compra.component.css']
})
export class ListaCompraComponent implements OnInit {
  selectedLanguage: string = 'es';
  productos$?: Observable<Producto[]>;
  selectedCollection: string = ''; // Colección predeterminada
  email: string = '';

  @ViewChild(AlertComponent) alertComponent!: AlertComponent;


  constructor(
    private firestore: AngularFirestore,
    private router: Router,
  ) { }
  /*
  ngAfterViewInit() {
    if (!this.alertComponent) {
      console.error('AlertComponent no se inicializó correctamente.');
    } else {
      this.changeCollection(this.selectedCollection);
      // Llama a changeCollection después de asegurarte de que alertComponent está disponible

    }
  }
  */
  ngOnInit() {

    // Recuperar el email desde sessionStorage al cargar el componente
    const email = sessionStorage.getItem('userEmail');
    if (email) {
      this.email = email;
    } else {
      console.error('No se encontró el email en sessionStorage');
    }

    this.selectedCollection = `Almacen_${email}`;
    this.changeCollection(this.selectedCollection); // Inicializar con la colección predeterminada

  }
  changeCollection(collection: string) {
    this.selectedCollection = collection;

    this.productos$ = this.firestore.collection<any>(collection, ref =>
      ref
        .where('cantidadStock', '<=', 1)
        .orderBy('cantidadStock')
        .orderBy('establecimiento')
        .orderBy('descripcion')        
    ).valueChanges().pipe(
      map(productos =>
        productos.map(producto => {
          const fechaCreacion = producto.fechaCreacion instanceof firebase.firestore.Timestamp
            ? producto.fechaCreacion.toDate()
            : producto.fechaCreacion;

          const fechaUltimaCompra = producto.fechaUltimaCompra instanceof firebase.firestore.Timestamp
            ? producto.fechaUltimaCompra.toDate()
            : producto.fechaUltimaCompra;

          // Aquí agregamos internalCode (asegúrate de tenerlo cuando crees los productos)
          return {
            ...producto,
            fechaCreacion,
            fechaUltimaCompra,
            internalCode: producto.internalCode || '1' // Asegúrate de asignar un valor si no está presente
          };
        })
      )
    );
    //Creamos indice ya que usamos orderby en la query
    this.productos$.subscribe({

      next: (productos) => {
        console.log('Productos cargados:', productos);
      },
      error: (error) => {
        const ahora = new Date().getTime();
        localStorage.setItem('bloqueo_lista', ahora.toString());
        
        const ruta = 'https://console.firebase.google.com/u/0/project/almacen-dd393/firestore/databases/-default-/indexes?create_composite=CmNwcm9qZWN0cy9hbG1hY2VuLWRkMzkzL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9BbG1hY2VuX2RhdmlkcmliZTg2QGdtYWlsLmNvbS9pbmRleGVzL18QARoRCg1jYW50aWRhZFN0b2NrEAEaEwoPZXN0YWJsZWNpbWllbnRvEAEaDwoLZGVzY3JpcGNpb24QARoMCghfX25hbWVfXxAB';
        // Se ha añadido el enlace con el evento (click) para que ejecute la función cancel cuando se haga clic
        const crearIndice = `Se necesita crear un índice para mostrar los artículos la primera vez, visite la siguiente ruta entrando con su email registrado:<br> <a href="${ruta}" target="_blank" >Crear índice</a>`;

        this.alertComponent.showAlerts(crearIndice, 'warning');
        setTimeout(() => {
          this.alertComponent.cancel();  // Oculta el mensaje después del tiempo especificado
          this.volver()
        }, 5000);
      }
    });
  }


  volver() {
    this.router.navigate(['/main-site']);
  }

}
