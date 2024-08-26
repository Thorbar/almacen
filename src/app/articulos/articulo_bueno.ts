import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ProductService } from '../services/product.service';  // Importa el servicio
import Swal from 'sweetalert2';




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
  nuevoProducto: any;

  constructor(
    private router: Router,
    private http: HttpClient,
    private firestore: AngularFirestore,
    private translate: TranslateService, // Asegúrate de que este nombre coincida
    private productService: ProductService  // Inyecta el servicio aquí


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
    console.log('Component initialized');

    // Introducir un temporizador de 5 segundos, es un parche para que tarde mas en abrir la camara.
    setTimeout(() => {
      // Verificar permiso de la cámara
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
    }, 6000); // 5000 milisegundos = 5 segundos

    // Configuración del reconocimiento de voz
    this.setupVoiceRecognition();

    // Preguntar por la categoría con reconocimiento de voz antes de iniciar el escaneo
    this.promptForCategoryVoice();
  }

  // Método para preguntar por la categoría usando reconocimiento de voz
  promptForCategoryVoice() {
    Swal.fire({
      title: 'Diga la categoría',
      text: 'Diga la categoría en la que desea operar: Congelado, Fresco, Limpieza, o Seco.',
      icon: 'info',
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false
    }).then(() => {
      // Después de que el usuario cierre el modal, inicia el reconocimiento de voz
      this.startVoiceRecognition();
    });
  }

  setupVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window)) {
      Swal.fire({
        title: 'Error',
        text: 'Web Speech API no está disponible en este navegador.',
        icon: 'error',
        timer: 1000,
        timerProgressBar: true,
        showConfirmButton: false
      });
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
      Swal.fire({
        title: 'Categoría seleccionada',
        text: `Categoría seleccionada: ${command.charAt(0).toUpperCase() + command.slice(1)}`,
        timer: 1000,
        timerProgressBar: true,
        showConfirmButton: false
      });
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
      Swal.fire({
        title: 'Comando no reconocido.',
        text: `Intenta decir "agregar", "retirar", "eliminar".`,
        timer: 1000,
        timerProgressBar: true,
        showConfirmButton: false
      });
      this.router.navigate(['/main-site']);
    }
    this.stopVoiceRecognition();
  }



  stopVoiceRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  activateCamera() {
    console.log('print');
    // Solo activa la cámara si la categoría ya ha sido seleccionada
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          this.hasPermission = true;
          setTimeout(() => {
            Swal.fire({
              title: 'Cámara activada.',
              text: `Escanee un código.`,
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false
            });
          }, 1000)
        })
        .catch(() => {
          this.hasPermission = false;
          Swal.fire({
            title: 'Permiso para acceder a la cámara no concedido.',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        });
    }
  }


  onCodeResult(result: string) {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.scannedResult = result;
      if (this.hasPermission) {
        Swal.fire({
          title: 'Código QR detectado.',
          text: 'Deseas agregar, retirar o eliminar el producto?',
          timer: 2000,
          timerProgressBar: true
        });
        this.startVoiceRecognition();
      } else {
        Swal.fire({
          title: 'Permiso para acceder a la cámara no concedido.',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
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
            // Aquí se realiza la solicitud a la API si no existe el producto en la base de datos local
            this.productService.getProductByBarcode(this.scannedResult!)
              .subscribe(response => {
                if (response && response.product) {
                  const productoDeApi = response.product;
                  console.log(productoDeApi);  // Inspecciona el objeto producto
                  const descripcion = productoDeApi.product_name || '';
                  const establecimiento = productoDeApi.stores || '';
                  const precio = productoDeApi.price_value || productoDeApi.unit_price || 0; // Si la API proporciona el precio

                  const nuevoProducto: Producto = {
                    descripcion,
                    establecimiento,
                    precio,
                    cantidadStock: 0,  // Se actualiza después de que el usuario ingrese la cantidad comprada
                    codigo: this.scannedResult!,
                    id: Date.now(),
                    fechaCreacion: new Date()
                  };

                  // Si la descripción y el establecimiento están vacíos, solicita los detalles manualmente
                  if (!descripcion || !establecimiento) {
                    this.promptForNewProductDetails(nuevoProducto);
                  } else {
                    // Si la descripción y el establecimiento están completos, solicita la cantidad
                    this.promptForQuantity(nuevoProducto);
                  }
                } else {
                  // Si no se encuentra en la API, solicita los detalles manualmente
                  this.promptForNewProductDetails();
                }
              });
          } else if (productos.length > 0) {
            const producto = productos[0];
            Swal.fire({
              title: 'Producto existente.',
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false
            });
            this.promptForQuantity(producto);
          }
          this.isProcessing = false;
        });
    } else {
      Swal.fire({
        title: 'No se ha detectado ningún código.',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });
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
            Swal.fire({
              title: 'Producto no encontrado.',
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false
            });
            this.isProcessing = false;
          }
        });
    } else {
      Swal.fire({
        title: 'No se ha detectado ningún código.',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });
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
              Swal.fire({
                title: 'Cantidad retirada.',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
              });
              this.isProcessing = false;
              this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
            })
            .catch(error => {
              Swal.fire({
                title: 'Error al retirar cantidad: ',
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
              });
              this.scannedResult = null;
              this.isProcessing = false;
            });
        } else {
          Swal.fire({
            title: 'No hay suficiente cantidad en stock.',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
          this.scannedResult = null;
          this.isProcessing = false;
        }
      } else {
        Swal.fire({
          title: 'Cantidad no válida.',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        this.isProcessing = false;
      }
    } else {
      Swal.fire({
        title: 'Operación cancelada.',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });
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
                Swal.fire({
                  title: 'Producto actualizado con el nuevo precio y cantidad.',
                  timer: 2000,
                  timerProgressBar: true,
                  showConfirmButton: false
                });
                this.scannedResult = null;
                this.isProcessing = false;
                this.preguntarCambioDeBaseDatos();
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
                Swal.fire({
                  title: 'Producto agregado con el nuevo precio y cantidad.',
                  timer: 2000,
                  timerProgressBar: true,
                  showConfirmButton: false
                });
                this.scannedResult = null;
                this.isProcessing = false;
                this.preguntarCambioDeBaseDatos();
              })
              .catch(error => {
                console.error('Error al agregar producto: ', error);
                this.isProcessing = false;
              });
          }
        } else {
          Swal.fire({
            title: 'Cantidad no válida.',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
          this.isProcessing = false;
        }
      } else {
        // El usuario canceló la entrada de cantidad
        Swal.fire({
          title: 'Operación cancelada.',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        this.isProcessing = false;
      }
    } else {
      // El usuario canceló la entrada de precio o ingresó un valor no válido
      Swal.fire({
        title: 'Operación cancelada.',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });
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
        Swal.fire({
          title: 'La descripción solo puede contener letras.',
          text: 'Por favor, inténtelo nuevamente.',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        descripcion = null;
      }
    }

    // Solicitar establecimiento hasta que se ingrese un valor válido
    while (!establecimiento) {
      establecimiento = prompt('Ingrese el establecimiento:', '');
      if (!establecimiento) {
      } else if (!soloLetras(descripcion)) {
        Swal.fire({
          title: 'El establecimiento es obligatorio.',
          text: 'Por favor, inserte un valor.',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
        establecimiento = null;
      } else if (!soloLetras(establecimiento)) {
        Swal.fire({
          title: 'El establecimiento solo puede contener letras.',
          text: 'Por favor, inténtelo nuevamente.',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
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
        Swal.fire({
          title: 'El precio no es válido.',
          text: 'Debe ser un número mayor a 0.',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
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
        Swal.fire({
          title: 'La cantidad no es válida.',
          text: 'Debe ser un número mayor a 0.',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        });
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
          Swal.fire({
            title: 'Producto agregado',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
          this.scannedResult = null;
          this.isAddingProduct = false;
          this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
        })
        .catch(error => {
          console.error('Error al agregar producto: ', error);
          this.isAddingProduct = false;
        });
    } else {
      Swal.fire({
        title: 'Debe completar todos los campos',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });
      this.isAddingProduct = false;
    }
  }


  cancelarOperacion() {
    this.isProcessing = false;
    this.scannedResult = null;
    Swal.fire({
      title: 'Operación cancelada',
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }

  eliminarProducto(producto: Producto & { docId: string }) {
    const confirmar = confirm('¿Estás seguro de que quieres eliminar este producto?');
    if (confirmar) {
      this.firestore.collection(this.categoriaSeleccionada!).doc(producto.docId)
        .delete()
        .then(() => {
          Swal.fire({
            title: 'Producto eliminado',
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
          });
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
            Swal.fire({
              title: 'Producto no encontrado',
              timer: 2000,
              timerProgressBar: true,
              showConfirmButton: false
            });
            this.isProcessing = false;
          }
        });
    } else {
      Swal.fire({
        title: 'No se ha detectado ningún código',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false
      });
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
    Swal.fire({
      title: 'Continuando en la base de datos actual: ',
      text: '${ this.categoriaSeleccionada } ',
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false
    });
  }
}
