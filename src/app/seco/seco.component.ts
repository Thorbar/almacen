import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators'; // Importar el operador map

export interface Producto {
  cantidadStock: number;
  codigo: string;
  descripcion: string;
  establecimiento: string;
  id: number;
  precio: number;
}

@Component({
  selector: 'app-seco',
  templateUrl: './seco.component.html',
  styleUrls: ['./seco.component.css']
})
export class SecoComponent implements OnInit {
  hasPermission: boolean = false;
  recognition: any;
  scannedResult: string | null = null;
  action: string | null = null;
  messageVisible: boolean = false;
  formats: BarcodeFormat[] = [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.ITF,
                              BarcodeFormat.CODE_39, BarcodeFormat.CODABAR, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
                              BarcodeFormat.EAN_8
  ];
  selectedDevice: MediaDeviceInfo | undefined; // Cambiado de null a undefined
  availableDevices: MediaDeviceInfo[] = []; // Lista de dispositivos disponibles
  username: string = 'default_user'; // Cambia esto según tu lógica
  isProcessing: boolean = false; // Bandera para evitar bucles
  isAddingProduct: boolean = false;
  constructor(
    private router: Router,
    private http: HttpClient,
    private firestore: AngularFirestore
  ) { }

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
      // this.showLoading('Agregando producto');
    } else if (command.includes('retirar')) {
      this.action = 'retirar';
      this.isProcessing = true;
      this.handleRetirar(); // Llamar al método para retirar
    } else {
      alert('Comando no reconocido. Intenta decir "agregar" o "retirar".');
    }
    this.stopVoiceRecognition();
  }
  /*
  showLoading(message: string) {
    alert(message);
      this.action = null;
      this.scannedResult = null; // Limpiar resultado del QR
      this.router.navigate(['/articulos']); // Navegar a la página anterior
  }*/

  stopVoiceRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // Método llamado cuando se escanea un código QR
  onCodeResult(result: string) {
    if (!this.isProcessing) {  // Evita procesar múltiples veces el mismo código
      this.isProcessing = true; // Marca como en proceso
      this.scannedResult = result;
      if (this.hasPermission) {
        alert('Código QR detectado. ¿Deseas agregar o retirar el producto?');
        this.startVoiceRecognition();
      } else {
        alert('Permiso para acceder a la cámara no concedido.');
      }
    }
  }

  // Método para manejar los dispositivos encontrados
  onCamerasFound(devices: MediaDeviceInfo[]) {
    this.availableDevices = devices;
    // Por ejemplo, seleccionar el primer dispositivo si hay varios disponibles
    if (devices.length > 0) {
      this.selectedDevice = devices[0];
    }
  }

  // Método para navegar hacia atrás
  volver() {
    this.router.navigate(['/articulos']);
  }

  handleAgregar() {
    if (this.scannedResult && !this.isAddingProduct) {
      this.firestore.collection('productos', ref => ref.where('codigo', '==', this.scannedResult))
        .snapshotChanges()
        .pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as Producto;
            const docId = a.payload.doc.id;
            return { ...data, docId };  // Agregar el id del documento al objeto producto
          })),
          take(1)
      )                
        .subscribe((productos: (Producto & { docId: string })[]) => {
          if (productos.length === 0) {
            this.isAddingProduct = true; // Establecer isAddingProduct en true antes de llamar a promptForNewProductDetails
            this.promptForNewProductDetails();
            //  this.promptForQuantity(producto);  // Actualiza el producto existente
          } else if (productos.length > 0) {
            alert(productos.length);
            const producto = productos[0];
            alert('Producto existente');
             this.promptForQuantity(producto);  // Actualiza el producto existente
          }
          this.isProcessing = false;
        });
    } else {
      alert('No se ha detectado ningún código.');
     // this.isProcessing = false;
    }
  }

  // Nueva función para retirar productos
  handleRetirar() {
    if (this.scannedResult) {
      this.firestore.collection('productos', ref => ref.where('codigo', '==', this.scannedResult))
        .snapshotChanges()
        .pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as Producto;
            const docId = a.payload.doc.id;
            return { ...data, docId };  // Agregar el id del documento al objeto producto
          })),
          take(1)
        )
        .subscribe((productos: (Producto & { docId: string })[]) => {
          if (productos.length > 0) {
            const producto = productos[0];
            this.promptForRetirarCantidad(producto);  // Llamar a la función para retirar cantidad
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
      if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
        if (producto.cantidadStock >= cantidadNumerica) {
          this.firestore.collection('productos').doc(producto.docId)
            .update({ cantidadStock: producto.cantidadStock - cantidadNumerica })
            .then(() => {
              alert('Cantidad actualizada');
              this.scannedResult = null;  // Limpiar el resultado escaneado
              this.isProcessing = false;  // Restablecer la bandera de procesamiento
            })
            .catch(error => {
              console.error('Error al actualizar cantidad: ', error);
              this.isProcessing = false;  // Restablecer la bandera en caso de error
            });
        } else {
          alert('No hay suficiente stock para retirar esa cantidad.');
          this.isProcessing = false;
        }
      } else {
        alert('Cantidad no válida.');
        this.isProcessing = false;  // Restablecer la bandera si la cantidad no es válida
      }
    } else {
      this.isProcessing = false;  // Restablecer la bandera si no se ingresa cantidad
    }
  }

  promptForQuantity(producto: Producto & { docId: string }) {
    const cantidad = prompt('Ingrese la cantidad a agregar:', '1');
    if (cantidad) {
      const cantidadNumerica = parseInt(cantidad, 10);
      if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
        this.firestore.collection('productos').doc(producto.docId)
          .update({ cantidadStock: producto.cantidadStock + cantidadNumerica })
          .then(() => {
            alert('Cantidad actualizada');
            this.scannedResult = null;  // Limpiar el resultado escaneado para evitar bucles
            this.isProcessing = false;  // Restablecer la bandera de procesamiento
          })
          .catch(error => {
            console.error('Error al actualizar cantidad: ', error);
            this.isProcessing = false;  // Restablecer la bandera en caso de error
          });
      } else {
        alert('Cantidad no válida.');
        this.isProcessing = false;  // Restablecer la bandera si la cantidad no es válida
      }
    } else {
      this.isProcessing = false;  // Restablecer la bandera si no se ingresa cantidad
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
        alert('La descripción es obligatoria. Por favor, ingrese un valor.');
        descripcion = null;
      }
      else if (!soloLetras(descripcion)) {
        alert('La descripción solo puede contener letras. Por favor, inténtelo nuevamente.');
        descripcion = null;
      }
    }
    // Solicitar establecimiento hasta que se ingrese un valor válido
    while (!establecimiento) {
      establecimiento = prompt('Ingrese el establecimiento:', '');
      if (!establecimiento) {
        alert('El establecimiento es obligatorio. Por favor, ingrese un valor.');
        establecimiento = null;
      }
      else if (!soloLetras(establecimiento)) {
        alert('La descripción solo puede contener letras. Por favor, inténtelo nuevamente.');
        establecimiento = null;
      }
    }

    let precioNumerico: number | null = null;
    while (precioNumerico === null || isNaN(precioNumerico) || precioNumerico <= 0) {
      const precio = prompt('Ingrese el precio:', '0');
      precioNumerico = parseFloat(precio as string);
      if (isNaN(precioNumerico) || precioNumerico <= 0) {
        alert('El precio no es válido. Debe ser un número mayor a 0.');
        precioNumerico = null;  // Resetear para asegurar que se vuelva a solicitar
      }
    }

    let cantidadComprada: number | null = null;
    while (cantidadComprada === null || isNaN(cantidadComprada) || cantidadComprada <= 0) {
      const cantidad = prompt('Ingrese la cantidad comprada:', '1');
      cantidadComprada = parseFloat(cantidad as string);
      if (isNaN(cantidadComprada) || cantidadComprada <= 0) {
        alert('El precio no es válido. Debe ser un número mayor a 0.');
        cantidadComprada = null;  // Resetear para asegurar que se vuelva a solicitar
      }
    }
    /*
    this.firestore.collection('productos').add({
      cantidadStock: cantidadComprada,  // Usar la cantidad ya obtenida
      codigo: this.scannedResult,
      descripcion: descripcion,
      establecimiento: establecimiento,
      //id: nuevoId,
      precio: precioNumerico
    })
      .then(() => {
        alert('Producto creado');
        // this.scannedResult = null;  // Limpiar el resultado escaneado
      })
      .catch(error => {
        console.error('Error al crear producto: ', error);
        this.isProcessing = false;  // Restablecer la bandera en caso de error
        this.isAddingProduct = false;
      });
  }
  */
    
    this.obtenerNuevoId().subscribe(nuevoId => {
      this.firestore.collection('productos').add({
        cantidadStock: cantidadComprada,  // Usar la cantidad ya obtenida
        codigo: this.scannedResult,
        descripcion: descripcion,
        establecimiento: establecimiento,
        id: nuevoId,
        precio: precioNumerico
      })
        .then(() => {
          alert('Producto creado');
          // Restablecer estados después de crear el producto
          this.scannedResult = null;
          this.isProcessing = false;
        })
        .catch(error => {
          console.error('Error al crear producto: ', error);
          this.isProcessing = false;  // Restablecer la bandera en caso de error
          this.isAddingProduct = false;
        });
    });
  }
  

  obtenerNuevoId(): Observable<number> {
    return this.firestore.collection('productos', ref => ref.orderBy('id', 'desc').limit(1))
      .valueChanges()
      .pipe(
        map((productos: any[]) => {
          if (productos.length > 0 && typeof productos[0].id === 'number') {
            // Obtén el ID del último producto y aumenta en 1
            return productos[0].id + 1;
          } else {
            // Si no hay productos, empieza con ID 1
            return 1;
          }
        }),
        take(1) // Asegúrate de completar el observable después de obtener el ID
      );
  }

}
