import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

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

  constructor(
    private router: Router,
    private http: HttpClient,
    private firestore: AngularFirestore
  ) { }

  categoriaSeleccionada: string | null = null;
  baseDatosCategorias: { [key: string]: string } = {
    'Congelado': 'Productos_Congelado',
    'Fresco': 'Productos_Fresco',
    'Limpieza': 'Productos_Limpieza',
    'Seco': 'Productos_Seco'
  };

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

    // Preguntar por la categoría antes de iniciar el escaneo
    this.promptForCategory();
  }

  promptForCategory() {
    const categorias = Object.keys(this.baseDatosCategorias).join(', ');
    const categoria = prompt(`Seleccione una categoría: ${categorias}`);
    
    if (categoria && this.baseDatosCategorias[categoria]) {
      this.categoriaSeleccionada = this.baseDatosCategorias[categoria];
    } else {
      alert('Categoría no válida. Inténtelo de nuevo.');
      this.promptForCategory();  // Volver a preguntar si la categoría no es válida
    }
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
    if (command.includes('agregar')) {
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
    } else {
      alert('Comando no reconocido. Intenta decir "agregar" o "retirar".');
    }
    this.stopVoiceRecognition();
  }

  stopVoiceRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  onCodeResult(result: string) {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.scannedResult = result;
      if (this.hasPermission) {
        alert('Código QR detectado. ¿Deseas agregar o retirar el producto?');
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
    this.router.navigate(['/articulos']);
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
              alert('Cantidad actualizada');
              this.scannedResult = null;
              this.isProcessing = false;
            })
            .catch(error => {
              console.error('Error al actualizar cantidad: ', error);
              this.isProcessing = false;
            });
        } else {
          alert('No hay suficiente stock para retirar esa cantidad.');
          this.isProcessing = false;
        }
      } else {
        alert('Cantidad no válida.');
        this.isProcessing = false;
      }
    } else {
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
      this.isProcessing = false;
    }
  }
  
  promptForNewProductDetails() {
    function soloLetras(cadena: string): boolean {
      return /^[a-zA-Z\s]+$/.test(cadena);
    }
  
    let descripcion: string | null = '';
    let establecimiento: string | null = '';
  
    while (!descripcion) {
      descripcion = prompt('Ingrese la descripción del nuevo producto:', '');
      if (!descripcion) {
        alert('La descripción es obligatoria. Por favor, ingrese un valor.');
        descripcion = null;
      } else if (!soloLetras(descripcion)) {
        alert('La descripción solo puede contener letras. Por favor, inténtelo nuevamente.');
        descripcion = null;
      }
    }
  
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
  
    if (descripcion && establecimiento) {
      const cantidad = prompt('Ingrese la cantidad inicial:', '1');
      const cantidadNumerica = cantidad ? parseInt(cantidad, 10) : 0;
  
      if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
        const precio = prompt('Ingrese el precio:', '1');
        const precioNumerico = precio ? parseFloat(precio) : 0;
  
        if (!isNaN(precioNumerico) && precioNumerico > 0) {
          const fechaCreacion = new Date(); // Se registra la fecha de creación
          const fechaUltimaCompra = new Date();
  
          this.firestore.collection(this.categoriaSeleccionada!).add({
            codigo: this.scannedResult,
            descripcion: descripcion,
            establecimiento: establecimiento,
            cantidadStock: cantidadNumerica,
            precio: precioNumerico,
            fechaCreacion: fechaCreacion,  // Se agrega la fecha de creación
            fechaUltimaCompra: fechaUltimaCompra
          })
          .then(() => {
            alert('Producto agregado correctamente');
            this.scannedResult = null;
            this.isProcessing = false;
          })
          .catch(error => {
            console.error('Error al agregar producto: ', error);
            this.isProcessing = false;
          });
        } else {
          alert('Precio no válido.');
          this.isProcessing = false;
        }
      } else {
        alert('Cantidad no válida.');
        this.isProcessing = false;
      }
    } else {
      this.isProcessing = false;
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
            const confirmacion = confirm(`Está seguro de que desea eliminar ${producto.descripcion} de la base de datos ${this.categoriaSeleccionada}?`);
            if (confirmacion) {
              this.eliminarArticulo(producto.docId);
            } else {
              alert('Operación cancelada.');
              this.isProcessing = false;
            }
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

  eliminarArticulo(docId: string) {
    this.firestore.collection(this.categoriaSeleccionada!).doc(docId).delete()
      .then(() => {
        alert('Producto eliminado correctamente');
        this.scannedResult = null;
        this.isProcessing = false;
      })
      .catch(error => {
        console.error('Error al eliminar producto: ', error);
        this.isProcessing = false;
      });
  }
  
  
  cancelarOperacion() {
    this.isProcessing = false;
    this.scannedResult = null;
    this.isAddingProduct = false;
  }
}
