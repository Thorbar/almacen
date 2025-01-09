import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import { AlertComponent } from '../alert/alert.component';
import { TranslateService } from '@ngx-translate/core';


@Component({
  selector: 'app-stock-actual',
  templateUrl: './stock-actual.component.html',
  styleUrls: ['./stock-actual.component.css']
})
export class StockActualComponent implements AfterViewInit {
  selectedLanguage: string = 'es';
  productos$?: Observable<any[]>;  // Cambiar el tipo aquí a 'any[]'
  selectedCollection: string = ''; // Colección predeterminada
  email: string = '';

  @ViewChild(AlertComponent) alertComponent!: AlertComponent;

  constructor(
    private firestore: AngularFirestore,
    private router: Router,
    private translate: TranslateService
  ) {
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);
  }
  ngAfterViewInit() {
    if (!this.alertComponent) {
      console.error('AlertComponent no se inicializó correctamente.');
    } else {
      this.changeCollection(this.selectedCollection);
      // Llama a changeCollection después de asegurarte de que alertComponent está disponible
      
    }
  }

  ngOnInit() {
    // Recuperar el email desde sessionStorage al cargar el componente
    const email = sessionStorage.getItem('userEmail');
    if (email) {
      this.email = email;
      console.log('Email recuperado:', email);
    } else {
      console.error('No se encontró el email en sessionStorage');
    }

    this.selectedCollection = `Almacen_${email}`;

    //this.changeCollection(this.selectedCollection); // Inicializar con la colección predeterminada
  }


  volver() {
    this.router.navigate(['/main-site']);
  }

  changeCollection(collection: string) {
    this.selectedCollection = collection;

    this.productos$ = this.firestore.collection<any>(collection, ref =>
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

    this.productos$.subscribe({
      next: (productos) => {
        console.log('Productos cargados:', productos);
      },
      error: (error) => {
        const ahora = new Date().getTime();
        localStorage.setItem('bloqueo_stock', ahora.toString());

        const ruta = 'https://console.firebase.google.com/u/0/project/almacen-dd393/firestore/databases/-default-/indexes?create_composite=CmNwcm9qZWN0cy9hbG1hY2VuLWRkMzkzL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9BbG1hY2VuX2RhdmlkcmliZTg2QGdtYWlsLmNvbS9pbmRleGVzL18QARoTCg9lc3RhYmxlY2ltaWVudG8QARoPCgtkZXNjcmlwY2lvbhABGgwKCF9fbmFtZV9fEAE';
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

  saveChanges(producto: any) {
    const collectionRef = this.firestore.collection<any>(this.selectedCollection);
    console.log('Colección seleccionada:', this.selectedCollection);

    if (!producto.internalCode) {
      console.error('El campo internalCode del producto no es válido');
      return;
    }

    console.log('Intentando buscar documento con internalCode:', producto.internalCode);

    // Realizamos la consulta para encontrar el documento con el campo 'internalCode' que coincide con producto.internalCode
    collectionRef.ref.where('internalCode', '==', producto.internalCode).get().then(querySnapshot => {
      if (!querySnapshot.empty) {
        // Si encontramos al menos un documento con ese internalCode, actualizamos el primero
        const docRef = querySnapshot.docs[0].ref;
        docRef.update({
          descripcion: producto.descripcion,
          establecimiento: producto.establecimiento,
          precio: producto.precio,
          cantidadStock: producto.cantidadStock,
          fechaUltimaCompra: new Date(),
          internalCode: producto.internalCode // Aunque ya lo tienes, lo actualizamos por si ha cambiado
        }).then(() => {
          console.log('Producto actualizado con éxito!');
        }).catch((error) => {
          console.error('Error al actualizar el producto: ', error);
        });
      } else {
        console.log('El producto con el internalCode proporcionado no existe. No se realizará ninguna actualización.');
      }
    }).catch((error) => {
      console.error('Error al buscar el documento por internalCode: ', error);
    });
  }







}
