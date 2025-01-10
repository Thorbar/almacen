import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, forkJoin } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ProductService } from '../services/product.service';  // Importa el servicio


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
  formats: BarcodeFormat[] = [
    BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.EAN_13,
    BarcodeFormat.ITF, BarcodeFormat.CODE_39, BarcodeFormat.CODABAR,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.EAN_8
  ];
  selectedDevice: MediaDeviceInfo | undefined;
  availableDevices: MediaDeviceInfo[] = [];
  isProcessing: boolean = false;
  isAddingProduct: boolean = false;
  // Variable que define la colección (se determinará en función de la categoría)
  categoriaSeleccionada: string | null = null;
  selectedCollection: string = ''; // Colección predeterminada
  email: string = '';

  constructor(
    private router: Router,
    private http: HttpClient,
    private firestore: AngularFirestore,
    private translate: TranslateService,
    private productService: ProductService  // Inyecta el servicio aquí
  ) {}

  ngOnInit() {


    // Verificar permiso de la cámara al iniciar el componente
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          this.hasPermission = true;
          console.log('Permiso de cámara concedido');
        })
        .catch(() => {
          this.hasPermission = false;
          console.log('Permiso de cámara denegado');
        });
    } else {
      console.log('getUserMedia no está disponible en este navegador.');
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
      console.log(this.recognition);
    }
  }

  stopVoiceRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  onCamerasFound(devices: MediaDeviceInfo[]) {
    this.availableDevices = devices;
    if (devices.length > 0) {
      this.selectedDevice = devices[0];
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

  // Función dinámica para determinar la colección de Firestore según la categoría
  obtenerColeccionFirestore(){
    console.log('Component initialized in articulosComponent');

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

    return this.selectedCollection ;  // Default a otra colección si no se encuentra la categoría
  }

  handleVoiceCommand(command: string) {
    if (command.includes('agregar')) {
      console.log('Acción: Agregar producto');
      this.action = 'agregar';
      this.isProcessing = true;
      this.handleAgregar();
    } else if (command.includes('retirar')) {
      this.action = 'retirar';
      this.isProcessing = true;
      this.handleRetirar();    
    } else {
      alert('Comando no reconocido. Intenta decir "agregar", "retirar".');
    }
    this.stopVoiceRecognition();
  }

  handleAgregar() {
    if (this.scannedResult && !this.isAddingProduct) {
      this.isAddingProduct = true;
      console.log('Ejecutando proceso de agregar');
      // Obtener colección en función de la categoría seleccionada
      const categoriaFirestore = this.obtenerColeccionFirestore();
      console.log(`BBDD seleccionada = ${categoriaFirestore}`);

      const verificarExistenciaEnTodasLasBases = (codigo: string): Observable<{ existe: boolean, nombre: string, categoria: string } | null> => {
        const categorias = Object.values(this.obtenerColeccionFirestore);
        const verificaciones = categorias.map(coleccion =>
          this.firestore.collection(coleccion, ref => ref.where('codigo', '==', codigo))
            .snapshotChanges()
            .pipe(
              map(actions => {
                if (actions.length > 0) {
                  const data = actions[0].payload.doc.data() as Producto;
                  return { existe: true, nombre: data.descripcion, categoria: coleccion };
                }
                return null;
              }),
              take(1)
            )
        );

        return forkJoin(verificaciones).pipe(
          map(resultados => resultados.find(resultado => resultado !== null) || null)
        );
      };

      verificarExistenciaEnTodasLasBases(this.scannedResult)
        .subscribe((resultado) => {
          if (resultado) {
            alert(`El producto ${resultado.nombre} ya existe en la base de datos ${resultado.categoria}. No se puede agregar.`);
            this.isProcessing = false;
            this.isAddingProduct = false;
            return;
          } else {
            this.firestore.collection(categoriaFirestore, ref => ref.where('codigo', '==', this.scannedResult))
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
                  this.productService.getProductByBarcode(this.scannedResult!)
                    .subscribe(response => {
                      if (response && response.product) {
                        const productoDeApi = response.product;
                        const descripcion = productoDeApi.product_name || '';
                        const establecimiento = productoDeApi.stores || '';
                        const precio = productoDeApi.price_value || productoDeApi.unit_price || 0;

                        const nuevoProducto: Producto = {
                          descripcion,
                          establecimiento,
                          precio,
                          cantidadStock: 0,
                          codigo: this.scannedResult!,
                          id: Date.now(),
                          fechaCreacion: new Date()
                        };

                        if (!descripcion || !establecimiento) {
                          this.promptForNewProductDetails(nuevoProducto);
                        } else {
                          this.promptForQuantity(nuevoProducto);
                        }
                      } else {
                        this.promptForNewProductDetails();
                      }
                    });
                } else {
                  const producto = productos[0];
                  alert('Producto existente');
                  this.promptForQuantity(producto);
                }
                this.isProcessing = false;
              });
          }
        });
    } else {
      alert('No se ha detectado ningún código.');
      this.isProcessing = false;
    }
  }
  
    promptForQuantity(producto: Producto & { docId?: string }) {
    const precioAnterior = producto.precio;
    const nuevoPrecio = prompt('Confirma el precio para ${ producto.descripcion }(anterior: ${ precioAnterior }€), precioAnterior.toString()');

    if (nuevoPrecio !== null && !isNaN(parseFloat(nuevoPrecio))) {
      const cantidad = prompt('Ingrese la cantidad comprada:', '1');

      if (cantidad !== null) {
        const cantidadNumerica = parseInt(cantidad, 10);

        if (cantidadNumerica === 0) {
          const cancelar = confirm('La cantidad es 0. ¿Deseas cancelar la operación?');
          if (cancelar) {
            this.cancelarOperacion();
            return;  // Sale sin modificar nada
          }
        } else if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
          if (producto.docId) {
            // Actualiza el producto existente
            const fechaUltimaCompra = new Date();
            this.firestore.collection(this.categoriaSeleccionada!).doc(producto.docId)
              .update({
                cantidadStock: producto.cantidadStock + cantidadNumerica,
                precio: parseFloat(nuevoPrecio),  // Actualiza el precio con el nuevo valor
                fechaUltimaCompra
              })
              .then(() => {
                alert('Producto actualizado con el nuevo precio y cantidad');
                this.scannedResult = null;
                this.isProcessing = false;
              })
              .catch(error => {
                console.error('Error al actualizar producto: ', error);
                this.isProcessing = false;
              });
          } else {
            // Crea un nuevo producto con la cantidad comprada
            producto.cantidadStock = cantidadNumerica;
            producto.precio = parseFloat(nuevoPrecio);
            this.firestore.collection(this.categoriaSeleccionada!)
              .add(producto)
              .then(() => {
                alert('Producto actualizado con el nuevo precio y cantidad');
                this.scannedResult = null;
                this.isProcessing = false;
              })
              .catch(error => {
                console.error('Error al agregar producto: ', error);
                this.isProcessing = false;
              });
          }
        } else {
          alert('Cantidad no válida.');
          this.isProcessing = false;
        }
      } else {
        // El usuario canceló la entrada de cantidad
        alert('Operación cancelada.');
        this.isProcessing = false;
      }
    } else {
      // El usuario canceló la entrada de precio o ingresó un valor no válido
      this.isProcessing = false;
    }
  }

  promptForNewProductDetails(existingProduct?: Producto) {
    function soloLetras(cadena: string): boolean {
      // Expresión regular para permitir letras con acentos, caracteres especiales, y espacios
      const letrasConAcentosYEspeciales = /^[\p{L}\s!@#$%^&*()_+\-={}\[\]|\\:;'",.<>?/~`]+$/u;

      // Expresión regular para verificar que la cadena no contenga únicamente números
      const contieneLetrasOCaracteresEspeciales = /[a-zA-ZÀ-ÿ]/;

      // Verifica que la cadena no contenga únicamente números y que cumpla con los caracteres permitidos
      return letrasConAcentosYEspeciales.test(cadena) && contieneLetrasOCaracteresEspeciales.test(cadena);
    }

    let descripcion: string | null = existingProduct ? existingProduct.descripcion : '';
    let establecimiento: string | null = existingProduct ? existingProduct.establecimiento : '';

    // Solicitar descripción hasta que se ingrese un valor válido
    while (!descripcion) {
      descripcion = prompt('Ingrese la descripción del nuevo producto:', '');
      if (!descripcion) {
        descripcion = null;
      } else if (!soloLetras(descripcion)) {
        alert('La descripción solo puede contener letras.Por favor, inténtelo nuevamente');
        descripcion = null;
      }
    }

    // Solicitar establecimiento hasta que se ingrese un valor válido
    while (!establecimiento) {
      establecimiento = prompt('Ingrese el establecimiento:', '');
      if (!establecimiento) {
      } else if (!soloLetras(establecimiento)) {
        alert('El establecimiento solo puede contener letras.Por favor, inténtelo nuevamente');
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
        alert('El precio no es válido.Debe ser un número mayor a 0');
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
        alert('La cantidad no es válida.Debe ser un número mayor a 0');
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
        })
        .catch(error => {
          console.error('Error al agregar producto: ', error);
          this.isAddingProduct = false;
        });
    } else {
      alert('Debe completar todos los campos');
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
  
    handleRetirar() {
    if (this.scannedResult) {
      // Obtener colección en función de la categoría seleccionada
      const categoriaFirestore = this.obtenerColeccionFirestore();

      this.firestore.collection(categoriaFirestore, ref => ref.where('codigo', '==', this.scannedResult))
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
          this.firestore.collection(this.obtenerColeccionFirestore()).doc(producto.docId)
            .update({
              cantidadStock: producto.cantidadStock - cantidadNumerica,
              fechaUltimoRetiro: fechaUltimoRetiro  // Se actualiza la fecha del último retiro
            })
            .then(() => {
              alert('Cantidad retirada');
              this.isProcessing = false;
            })
            .catch(error => {
              console.error('Error al retirar cantidad: ', error);
              this.scannedResult = null;
              this.isProcessing = false;
            });
        } else {
          alert('No hay suficiente cantidad en stock.');
          this.scannedResult = null;
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

  volver() {
    this.router.navigate(['/main-site']);
  }
}
