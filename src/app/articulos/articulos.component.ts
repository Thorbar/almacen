import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';


export interface Producto {
  cantidadStock: number;
  codigo: string;
  descripcion: string;
  establecimiento: string;
  id: number;
  precio: number;
  fechaCreacion?: Date;        // Solo se crea al agregar un producto nuevo
  fechaUltimaCompra?: Date;    // Se actualiza al agregar una cantidad
  fechaUltimoRetiro?: Date;    // Se actualiza al retirar una cantidad
}

@Component({
  selector: 'app-articulos',
  templateUrl: './articulos.component.html',
  styleUrl: './articulos.component.css'
})
export class ArticulosComponent implements OnInit {
  hasPermission: boolean = false;
  recognition: any;
  scannedResult: string | null = null;
  action: string | null = null;
  messageVisible: boolean = false;
  formats: BarcodeFormat[] = [
    BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.EAN_13,
    BarcodeFormat.ITF, BarcodeFormat.CODE_39, BarcodeFormat.CODABAR,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.EAN_8
  ];
  selectedDevice: MediaDeviceInfo | undefined;
  availableDevices: MediaDeviceInfo[] = [];
  username: string = 'default_user';
  isProcessing: boolean = false;
  isAddingProduct: boolean = false;
  selectedLanguage: string = 'es'; // Declara la propiedad aquí


  constructor(
    private router: Router,
    private http: HttpClient,
    private firestore: AngularFirestore,
    private translate: TranslateService // Asegúrate de que este nombre coincida

  ) {
    const savedLanguage = localStorage.getItem('selectedLanguage') || 'es';
    this.selectedLanguage = savedLanguage;
    this.translate.setDefaultLang(this.selectedLanguage);
    this.translate.use(this.selectedLanguage);

  }


  categoriaSeleccionada: string | null = null;
  baseDatosCategorias: { [key: string]: string } = {
    'Congelado': 'Productos_Congelado',
    'Fresco': 'Productos_Fresco',
    'Limpieza': 'Productos_Limpieza',
    'Seco': 'Productos_Seco'
  };

  // Función para cambiar el idioma
  changeLanguage(lang: string) {
    this.selectedLanguage = lang; // Actualiza el idioma seleccionado
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    localStorage.setItem('selectedLanguage', lang);
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  ngOnInit() {
    // Verificar permiso de la cámara
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          this.hasPermission = true;
        })
        .catch(() => {
          this.hasPermission = false;
        });
    }

    // Configuración del reconocimiento de voz
    this.setupVoiceRecognition();

    // Preguntar por la categoría con reconocimiento de voz antes de iniciar el escaneo
    this.promptForCategoryVoice();
  }

  // Método para preguntar por la categoría usando reconocimiento de voz
  promptForCategoryVoice() {
    alert('Diga la categoría en la que desea operar: Congelado, Fresco, Limpieza, o Seco.');
    this.startVoiceRecognition();
  }

  setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Web Speech API no está disponible en este navegador.');
      return;
    }

    this.recognition = new (window as any).webkitSpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'es-ES';

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      this.handleVoiceCommand(transcript);
    };

    this.recognition.onerror = (event: any) => {
      console.error('Error en el reconocimiento de voz:', event.error);
    };
  }

  startVoiceRecognition() {
    if (this.recognition) {
      this.recognition.start();
    }
  }

  handleVoiceCommand(command: string) {
    const categorias = ['congelado', 'fresco', 'limpieza', 'seco'];
    if (categorias.includes(command)) {
      this.categoriaSeleccionada = this.baseDatosCategorias[command.charAt(0).toUpperCase() + command.slice(1)];
      alert(`Categoría seleccionada: ${command.charAt(0).toUpperCase() + command.slice(1)}`);
      this.activateCamera(); // Activar la cámara después de seleccionar la categoría
    } else if (command.includes('agregar')) {
      this.action = 'agregar';
      this.isProcessing = true;
      this.handleAgregar();
    } else if (command.includes('retirar')) {
      this.action = 'retirar';
      this.isProcessing = true;
      this.handleRetirar();
    } else if (command.includes('eliminar')) {
      this.action = 'eliminar';
      this.isProcessing = true;
      this.handleEliminar();
    } else if (command.includes('cambiar')) {
      this.cambiarBaseDatos();
    } else if (command.includes('continuar')) {
      this.continuarEnBaseDatos();
    } else if (command.includes('salir')) {
      this.volver(); // Llamar a la función volver para salir
    } else {
      alert('Comando no reconocido. Intenta decir "agregar", "retirar", "eliminar", "cambiar" o "continuar".');
    }
    this.stopVoiceRecognition();
  }

  stopVoiceRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  activateCamera() {
    // Verificar permiso de la cámara y activarla
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          this.hasPermission = true;
          alert('Cámara activada. Escanee un código.');
        })
        .catch(() => {
          this.hasPermission = false;
          alert('Permiso para acceder a la cámara no concedido.');
        });
    }
  }

  onCodeResult(result: string) {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.scannedResult = result;
      if (this.hasPermission) {
        alert('Código QR detectado. ¿Deseas agregar, retirar, eliminar el producto, cambiar o continuar en la misma base de datos?');
        this.startVoiceRecognition();
      } else {
        alert('Permiso para acceder a la cámara no concedido.');
      }
    }
  }

  onCamerasFound(devices: MediaDeviceInfo[]) {
    this.availableDevices = devices;
    if (devices.length > 0) {
      this.selectedDevice = devices[0];
    }
  }

  volver() {
    this.router.navigate(['/main-site']);
  }

  handleAgregar() {
    if (this.scannedResult && !this.isAddingProduct) {
      this.firestore.collection(this.categoriaSeleccionada!, ref => ref.where('codigo', '==', this.scannedResult))
        .snapshotChanges()
        .pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as Producto;
            const docId = a.payload.doc.id;
            return { ...data, docId };
          })),
          take(1)
        )
        .subscribe((productos: (Producto & { docId: string })[]) => {
          if (productos.length === 0) {
            this.isAddingProduct = true;
            this.promptForNewProductDetails();
          } else if (productos.length > 0) {
            const producto = productos[0];
            alert('Producto existente');
            this.promptForQuantity(producto);
          }
          this.isProcessing = false;
        });
    } else {
      alert('No se ha detectado ningún código.');
    }
  }

  handleRetirar() {
    if (this.scannedResult) {
      this.firestore.collection(this.categoriaSeleccionada!, ref => ref.where('codigo', '==', this.scannedResult))
        .snapshotChanges()
        .pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as Producto;
            const docId = a.payload.doc.id;
            return { ...data, docId };
          })),
          take(1)
        )
        .subscribe((productos: (Producto & { docId: string })[]) => {
          if (productos.length > 0) {
            const producto = productos[0];
            this.promptForRetirarCantidad(producto);
          } else {
            alert('Producto no encontrado.');
            this.isProcessing = false;
          }
        });
    } else {
      alert('No se ha detectado ningún código.');
      this.isProcessing = false;
    }
  }

  promptForRetirarCantidad(producto: Producto & { docId: string }) {
    const cantidad = prompt('Ingrese la cantidad a retirar:', '1');
    if (cantidad) {
      const cantidadNumerica = parseInt(cantidad, 10);
      if (cantidadNumerica === 0) {
        const cancelar = confirm('¿Seguro que quieres cancelar la operación?');
        if (cancelar) {
          this.cancelarOperacion();
          return;
        }
      }
      if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
        if (producto.cantidadStock >= cantidadNumerica) {
          const fechaUltimoRetiro = new Date(); // Se registra la fecha del último retiro
          this.firestore.collection(this.categoriaSeleccionada!).doc(producto.docId)
            .update({
              cantidadStock: producto.cantidadStock - cantidadNumerica,
              fechaUltimoRetiro: fechaUltimoRetiro  // Se actualiza la fecha del último retiro
            })
            .then(() => {
              alert('Cantidad retirada');
              this.scannedResult = null;
              this.isProcessing = false;
              this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
            })
            .catch(error => {
              console.error('Error al retirar cantidad: ', error);
              this.isProcessing = false;
            });
        } else {
          alert('No hay suficiente cantidad en stock.');
          this.isProcessing = false;
        }
      } else {
        alert('Cantidad no válida.');
        this.isProcessing = false;
      }
    } else {
      alert('Operación cancelada.');
      this.isProcessing = false;
    }
  }

  promptForQuantity(producto: Producto & { docId: string }) {
    const cantidad = prompt('Ingrese la cantidad a agregar:', '1');
    if (cantidad) {
      const cantidadNumerica = parseInt(cantidad, 10);
      if (cantidadNumerica === 0) {
        const cancelar = confirm('¿Seguro que quieres cancelar la operación?');
        if (cancelar) {
          this.cancelarOperacion();
          return;
        }
      }
      if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
        const fechaUltimaCompra = new Date(); // Se registra la fecha de la última compra
        this.firestore.collection(this.categoriaSeleccionada!).doc(producto.docId)
          .update({
            cantidadStock: producto.cantidadStock + cantidadNumerica,
            fechaUltimaCompra: fechaUltimaCompra  // Se actualiza la fecha de la última compra
          })
          .then(() => {
            alert('Cantidad actualizada');
            this.scannedResult = null;
            this.isProcessing = false;
            this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
          })
          .catch(error => {
            console.error('Error al actualizar cantidad: ', error);
            this.isProcessing = false;
          });
      } else {
        alert('Cantidad no válida.');
        this.isProcessing = false;
      }
    } else {
      alert('Operación cancelada.');
      this.isProcessing = false;
    }
  }

  promptForNewProductDetails() {
    function soloLetras(cadena: string): boolean {
      return /^[a-zA-Z\s]+$/.test(cadena);
    }
    let descripcion: string | null = '';
    let establecimiento: string | null = '';

    // Solicitar descripción hasta que se ingrese un valor válido
    while (!descripcion) {
      descripcion = prompt('Ingrese la descripción del nuevo producto:', '');
      if (!descripcion) {
        descripcion = null;
      } else if (!soloLetras(descripcion)) {
        alert('La descripción solo puede contener letras. Por favor, inténtelo nuevamente.');
        descripcion = null;      }
    }

    // Solicitar establecimiento hasta que se ingrese un valor válido
    while (!establecimiento) {
      establecimiento = prompt('Ingrese el establecimiento:', '');
      if (!establecimiento) {
        alert('El establecimiento es obligatorio. Por favor, ingrese un valor.');
        establecimiento = null;
      } else if (!soloLetras(establecimiento)) {
        alert('El establecimiento solo puede contener letras. Por favor, inténtelo nuevamente.');
        establecimiento = null;
      }
    }


    let precioNumerico: number | null = null;
    while (precioNumerico === null || isNaN(precioNumerico) || precioNumerico <= 0) {
      const precio = prompt('Ingrese el precio:', '0');
      precioNumerico = parseFloat(precio as string);
      if (precioNumerico === 0) {
        const cancelar = confirm('¿Seguro que quieres cancelar la operación?');
        if (cancelar) {
          this.cancelarOperacion();
          return;
        }
      }
      if (isNaN(precioNumerico) || precioNumerico <= 0) {
        alert('El precio no es válido. Debe ser un número mayor a 0.');
        precioNumerico = null;  // Resetear para asegurar que se vuelva a solicitar
      }
    }

    let cantidadComprada: number | null = null;
    while (cantidadComprada === null || isNaN(cantidadComprada) || cantidadComprada <= 0) {
      const cantidad = prompt('Ingrese la cantidad comprada:', '1');
      cantidadComprada = parseFloat(cantidad as string);
      if (cantidadComprada < 0) {
        const cancelar = confirm('¿Seguro que quieres cancelar la operación?');
        if (cancelar) {
          this.cancelarOperacion();
          return;
        }
      }
      if (isNaN(cantidadComprada) || cantidadComprada <= 0) {
        alert('La cantidad no es válida. Debe ser un número mayor a 0.');
        cantidadComprada = null;  // Resetear para asegurar que se vuelva a solicitar
      }
    }

    if (descripcion && establecimiento && precioNumerico && cantidadComprada) {
      const fechaCreacion = new Date();  // Se registra la fecha de creación del nuevo producto
      const nuevoProducto: Producto = {
        descripcion,
        establecimiento,
        precio: precioNumerico,
        cantidadStock: cantidadComprada,
        codigo: this.scannedResult!,
        id: Date.now(),  // Usa la fecha actual como un ID simple, ajusta según tu lógica
        fechaCreacion: fechaCreacion  // Se guarda la fecha de creación
      };

      this.firestore.collection(this.categoriaSeleccionada!)
        .add(nuevoProducto)
        .then(() => {
          alert('Producto agregado');
          this.scannedResult = null;
          this.isAddingProduct = false;
          this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
        })
        .catch(error => {
          console.error('Error al agregar producto: ', error);
          this.isAddingProduct = false;
        });
    } else {
      alert('Debe completar todos los campos.');
      this.isAddingProduct = false;
    }
  }

  cancelarOperacion() {
    this.isProcessing = false;
    this.scannedResult = null;
    alert('Operación cancelada.');
  }

  eliminarProducto(producto: Producto & { docId: string }) {
    const confirmar = confirm('¿Estás seguro de que quieres eliminar este producto?');
    if (confirmar) {
      this.firestore.collection(this.categoriaSeleccionada!).doc(producto.docId)
        .delete()
        .then(() => {
          alert('Producto eliminado');
          this.scannedResult = null;
          this.isProcessing = false;
          this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
        })
        .catch(error => {
          console.error('Error al eliminar producto: ', error);
          this.isProcessing = false;
        });
    } else {
      this.isProcessing = false;
      this.scannedResult = null;
    }
  }

  handleEliminar() {
    if (this.scannedResult) {
      this.firestore.collection(this.categoriaSeleccionada!, ref => ref.where('codigo', '==', this.scannedResult))
        .snapshotChanges()
        .pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as Producto;
            const docId = a.payload.doc.id;
            return { ...data, docId };
          })),
          take(1)
        )
        .subscribe((productos: (Producto & { docId: string })[]) => {
          if (productos.length > 0) {
            const producto = productos[0];
            this.eliminarProducto(producto);
          } else {
            alert('Producto no encontrado.');
            this.isProcessing = false;
          }
        });
    } else {
      alert('No se ha detectado ningún código.');
      this.isProcessing = false;
    }
  }

  preguntarCambioDeBaseDatos() {
    const deseaCambiar = confirm('¿Desea cambiar de base de datos? (Aceptar para cambiar, Cancelar para continuar en la misma)');
    if (deseaCambiar) {
      this.cambiarBaseDatos();
    } else {
      this.continuarEnBaseDatos();
    }
  }

  cambiarBaseDatos() {
    this.promptForCategoryVoice();
  }

  continuarEnBaseDatos() {
    alert(`Continuando en la base de datos actual: ${this.categoriaSeleccionada}`);
  }
}
