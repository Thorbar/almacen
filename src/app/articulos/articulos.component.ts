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
  selectedLanguage: string = 'es'; // Declara la propiedad aquí
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
    private firestore: AngularFirestore,    
    private translate: TranslateService
  )  {
    const savedLanguage = localStorage.getItem('selectedLanguage');
    this.selectedLanguage = savedLanguage || 'es';
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
  localStorage.setItem('selectedLanguage', lang)
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
    this.translate.get('CATEGORY_PROMPT').subscribe((translatedText: string) => {
      alert(translatedText);
      this.startVoiceRecognition();
    });
  }

  setupVoiceRecognition() {
    // Verifica si el navegador soporta la API de reconocimiento de voz
    if (!('webkitSpeechRecognition' in window)) {
      this.translate.get('WEB_SPEECH').subscribe((translatedText: string) => {
        alert(translatedText);
        return;
      });
    } else {
      // Configura el reconocimiento de voz si la API está disponible
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'es-ES'; // Puedes cambiar el idioma según tus necesidades
  
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        this.handleVoiceCommand(transcript);
      };
  
      this.recognition.onerror = (event: any) => {
        this.translate.get('ERROR_VOICE_RECOGNITION').subscribe((translatedText: string) => {
          console.error(translatedText, event.error);
        });
      };
    }
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
      this.translate.get('CATEGORY_SELECTED').subscribe((translatedText: string) => {
        alert(translatedText.replace('{category}', command.charAt(0).toUpperCase() + command.slice(1)));
      });
      this.activateCamera(); // Activar la cámara después de seleccionar la categoría
    } else if (command.includes('agregar')) {
      this.action = 'agregar';
      this.isProcessing = true;
      this.translate.get('ACTION_ADD').subscribe((translatedText: string) => {
        alert(translatedText);
      });
      this.handleAgregar();
    } else if (command.includes('retirar')) {
      this.action = 'retirar';
      this.isProcessing = true;
      this.translate.get('ACTION_WITHDRAW').subscribe((translatedText: string) => {
        alert(translatedText);
      });
      this.handleRetirar();
    } else if (command.includes('eliminar')) {
      this.action = 'eliminar';
      this.isProcessing = true;
      this.translate.get('ACTION_DELETE').subscribe((translatedText: string) => {
        alert(translatedText);
      });
      this.handleEliminar();
    } else if (command.includes('cambiar')) {
      this.translate.get('ACTION_CHANGE_DB').subscribe((translatedText: string) => {
        alert(translatedText);
      });
      this.cambiarBaseDatos();
    } else if (command.includes('continuar')) {
      this.translate.get('ACTION_CONTINUE_DB').subscribe((translatedText: string) => {
        alert(translatedText);
      });
      this.continuarEnBaseDatos();
    } else if (command.includes('salir')) {
      this.translate.get('ACTION_EXIT').subscribe((translatedText: string) => {
        alert(translatedText);
      });
      this.volver(); // Llamar a la función volver para salir
    } else {
      this.translate.get('UNKNOWN_COMMAND').subscribe((translatedText: string) => {
        alert(translatedText);
      });
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
          this.translate.get('CAMERA_ON').subscribe((translatedText: string) => {
          alert(translatedText);
          });
        })
        .catch(() => {
          this.hasPermission = false;
          this.translate.get('NO_CAMERA').subscribe((translatedText: string) => {
            alert(translatedText);
            });
        });
    }
  }

  onCodeResult(result: string) {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.scannedResult = result;
      if (this.hasPermission) {
        this.hasPermission = false;
        this.translate.get('QR_DETECTED').subscribe((translatedText: string) => {
          alert(translatedText);
          });
        this.startVoiceRecognition();
      } else {
        this.translate.get('NO_CAMERA').subscribe((translatedText: string) => {
          alert(translatedText);
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
            this.promptForNewProductDetails();
          } else if (productos.length > 0) {
            const producto = productos[0];
            this.translate.get('PRODUCT_EXISTS').subscribe((translatedText: string) => {
              alert(translatedText);
              });            
            this.promptForQuantity(producto);
          }
          this.isProcessing = false;
        });
    } else {
      this.translate.get('QR_NOT_EXIST').subscribe((translatedText: string) => {//
        alert(translatedText);
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
            this.translate.get('PROD_NOT_FOUND').subscribe((translatedText: string) => {//Producto no encontrado
              alert(translatedText);
              }); 
            this.isProcessing = false;
          }
        });
    } else {
      this.translate.get('QR_NOT_EXIST').subscribe((translatedText: string) => {//
        alert(translatedText);
        }); 
      this.isProcessing = false;
    }
  }

  promptForRetirarCantidad(producto: Producto & { docId: string }) {
    this.translate.get('ENTER_QUANTITY').subscribe((enterQuantityText: string) => {
      const cantidad = prompt(enterQuantityText, '1');
      if (cantidad) {
        const cantidadNumerica = parseInt(cantidad, 10);
        if (cantidadNumerica === 0) {
          this.translate.get('CANCEL_OPERATION_CONFIRM').subscribe((cancelConfirmText: string) => {
            const cancelar = confirm(cancelConfirmText);
            if (cancelar) {
              this.cancelarOperacion();
              return;
            }
          });
        }
        if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
          if (producto.cantidadStock >= cantidadNumerica) {
            const fechaUltimoRetiro = new Date();
            this.firestore.collection(this.categoriaSeleccionada!).doc(producto.docId)
              .update({
                cantidadStock: producto.cantidadStock - cantidadNumerica,
                fechaUltimoRetiro: fechaUltimoRetiro
              })
              .then(() => {
                this.translate.get('QUANTITY_WITHDRAWN').subscribe((quantityWithdrawnText: string) => {
                  alert(quantityWithdrawnText);
                });
                this.scannedResult = null;
                this.isProcessing = false;
                this.preguntarCambioDeBaseDatos();
              })
              .catch(error => {
                this.translate.get('ERROR_RETRIEVE_QUANTITY').subscribe((errorText: string) => {//Error al retirar cantidad:
                  console.error(errorText, error);
                  alert(errorText);
                  this.isProcessing = false;
                }); 
              });
          } else {
            this.translate.get('INSUFFICIENT_STOCK').subscribe((insufficientStockText: string) => {
              alert(insufficientStockText);
            });
            this.isProcessing = false;
          }
        } else {
          this.translate.get('INVALID_QUANTITY').subscribe((invalidQuantityText: string) => {
            alert(invalidQuantityText);
          });
          this.isProcessing = false;
        }
      } else {
        this.translate.get('CANCEL_OPERATION').subscribe((cancelOperationText: string) => {
          alert(cancelOperationText);
        });
        this.isProcessing = false;
      }
    });
  }

  promptForQuantity(producto: Producto & { docId: string }) {
    this.translate.get('ENTER_QUANTITY').subscribe((promptText: string) => {
      const cantidad = prompt(promptText, '1');
      if (cantidad) {
        const cantidadNumerica = parseInt(cantidad, 10);
        if (cantidadNumerica === 0) {
          this.translate.get('CANCEL_OPERATION_CONFIRM').subscribe((confirmText: string) => {
            const cancelar = confirm(confirmText);
            if (cancelar) {
              this.cancelarOperacion();
              return;
            }
          });
        } else if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
          const fechaUltimaCompra = new Date(); // Se registra la fecha de la última compra
          this.firestore.collection(this.categoriaSeleccionada!).doc(producto.docId)
            .update({
              cantidadStock: producto.cantidadStock + cantidadNumerica,
              fechaUltimaCompra: fechaUltimaCompra  // Se actualiza la fecha de la última compra
            })
            .then(() => {
              this.translate.get('QUANTITY_UPDATED').subscribe((successText: string) => {
                alert(successText);
                this.scannedResult = null;
                this.isProcessing = false;
                this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
              });
            })
            .catch(error => {
              this.translate.get('ERROR_UPDATE_QUANTITY').subscribe((errorText: string) => {
                console.error(errorText, error);
                alert(errorText);
                this.isProcessing = false;
              });                
            });
        } else {
          this.translate.get('INVALID_QUANTITY').subscribe((invalidText: string) => {
            alert(invalidText);
            this.isProcessing = false;
          });
        }
      } else {
        this.translate.get('CANCEL_OPERATION').subscribe((cancelText: string) => {
          alert(cancelText);
          this.isProcessing = false;
        });
      }
    });
  }
  

  promptForNewProductDetails() {
    this.translate.get([
      'ENTER_DESCRIPTION',
      'ENTER_ESTABLISHMENT_NAME',
      'ENTER_PRODUCT_PRICE',
      'ENTER_STOCK_QUANTITY',
      'PRODUCT_ADDED',
      'COMPLETE_ALL_FIELDS',
      'ERROR_ADD_PRODUCT'
    ]).subscribe((translations: any) => {
      const descripcion = prompt(translations.ENTER_DESCRIPTION);
      const establecimiento = prompt(translations.ENTER_ESTABLISHMENT_NAME);
      const precio = prompt(translations.ENTER_PRODUCT_PRICE);
      const cantidad = prompt(translations.ENTER_STOCK_QUANTITY);
  
      if (descripcion && establecimiento && precio && cantidad) {
        const fechaCreacion = new Date();  // Se registra la fecha de creación del nuevo producto
        const nuevoProducto: Producto = {
          descripcion,
          establecimiento,
          precio: parseFloat(precio),
          cantidadStock: parseInt(cantidad, 10),
          codigo: this.scannedResult!,
          id: Date.now(),  // Usa la fecha actual como un ID simple, ajusta según tu lógica
          fechaCreacion: fechaCreacion  // Se guarda la fecha de creación
        };
  
        this.firestore.collection(this.categoriaSeleccionada!)
          .add(nuevoProducto)
          .then(() => {
            alert(translations.PRODUCT_ADDED);
            this.scannedResult = null;
            this.isAddingProduct = false;
            this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
          })
          .catch(error => {
            console.error(translations.ERROR_ADD_PRODUCT, error);
            this.isAddingProduct = false;
          });
      } else {
        alert(translations.COMPLETE_ALL_FIELDS);
        this.isAddingProduct = false;
      }
    });
  }
  

  cancelarOperacion() {
    this.translate.get('OPERATION_CANCELED').subscribe((translatedText: string) => {
      this.isProcessing = false;
      this.scannedResult = null;
      alert(translatedText);
    });
  }
  
  eliminarProducto(producto: Producto & { docId: string }) {
    this.translate.get('CONFIRM_DELETE_PRODUCT').subscribe((confirmText: string) => {
      const confirmar = confirm(confirmText);
      if (confirmar) {
        this.firestore.collection(this.categoriaSeleccionada!).doc(producto.docId)
          .delete()
          .then(() => {
            this.translate.get('PRODUCT_DELETED').subscribe((deletedText: string) => {
              alert(deletedText);
              this.scannedResult = null;
              this.isProcessing = false;
              this.preguntarCambioDeBaseDatos(); // Pregunta si desea cambiar de base de datos
            });
          })
          .catch(error => {
            this.translate.get('ERROR_DELETING_PRODUCT').subscribe((errorText: string) => {
              console.error(errorText, error);
              this.isProcessing = false;
            });
          });
      } else {
        this.isProcessing = false;
        this.scannedResult = null;
      }
    });
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
            this.translate.get('PRODUCT_NOT_FOUND').subscribe((translatedText: string) => {
              alert(translatedText);
              this.isProcessing = false;
            });
          }
        });
    } else {
      this.translate.get('NO_CODE_DETECTED').subscribe((translatedText: string) => {
        alert(translatedText);
        this.isProcessing = false;
      });
    }
  }
  

  preguntarCambioDeBaseDatos() {
    this.translate.get('CONFIRM_DATABASE_CHANGE').subscribe((translatedText: string) => {
      const deseaCambiar = confirm(translatedText);
      if (deseaCambiar) {
        this.cambiarBaseDatos();
      } else {
        this.continuarEnBaseDatos();
      }
    });
  }
  
  cambiarBaseDatos() {
    this.promptForCategoryVoice();
  }

  continuarEnBaseDatos() {
    this.translate.get('CONTINUE_IN_CURRENT_DATABASE').subscribe((translatedText: string) => {
      alert(`${translatedText} ${this.categoriaSeleccionada}`);
    });
  }  
}
