import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { HttpClient } from '@angular/common/http';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Producto {
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
  formats: BarcodeFormat[] = [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.ITF];
  selectedDevice: MediaDeviceInfo | undefined;
  availableDevices: MediaDeviceInfo[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private firestore: AngularFirestore
  ) { }

  ngOnInit() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(() => {
          this.hasPermission = true;
        })
        .catch(() => {
          this.hasPermission = false;
        });
    }

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
    } else if (command.includes('retirar')) {
      this.action = 'retirar';
    } else {
      alert('Comando no reconocido. Intenta decir "agregar" o "retirar".');
    }
    this.stopVoiceRecognition();
  }

  showLoading(message: string) {
    alert(message);
    setTimeout(() => {
      this.action = null;
      this.scannedResult = null;
      this.router.navigate(['/articulos']);
    }, 2000);
  }

  stopVoiceRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  onCodeResult(result: any) {
    this.scannedResult = result.text;
    if (this.hasPermission) {
      alert('Código QR detectado. ¿Deseas agregar o retirar el producto?');
      setTimeout(() => {
        this.scannedResult = null;
      }, 1000);
      this.startVoiceRecognition();
    } else {
      alert('Permiso para acceder a la cámara no concedido.');
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
    if (this.scannedResult) {
      this.firestore.collection('productos', ref => ref.where('codigo', '==', this.scannedResult))
        .snapshotChanges()
        .pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as Producto;
            const docId = a.payload.doc.id;
            return { ...data, docId };
          }))
        )
        .subscribe((productos: (Producto & { docId: string })[]) => {
          if (productos.length > 0) {
            const producto = productos[0];
            this.promptForQuantity(producto);
          } else {
            this.promptForNewProductDetails();
          }
        });
    } else {
      alert('No se ha detectado ningún código.');
    }
  }

  promptForQuantity(producto: Producto & { docId: string }) {
    const cantidad = prompt('Ingrese la cantidad a agregar:', '1');
    if (cantidad) {
      const cantidadNumerica = parseInt(cantidad, 10);
      if (!isNaN(cantidadNumerica) && cantidadNumerica > 0) {
        this.firestore.collection('productos').doc(producto.docId)
          .update({ cantidadStock: producto.cantidadStock + cantidadNumerica })
          .then(() => alert('Cantidad actualizada'))
          .catch(error => console.error('Error al actualizar cantidad: ', error));
      } else {
        alert('Cantidad no válida.');
      }
    }
  }

  promptForNewProductDetails() {
    const descripcion = prompt('Ingrese la descripción del nuevo producto:', '');
    const establecimiento = prompt('Ingrese el establecimiento:', '');
    const precio = prompt('Ingrese el precio:', '0');
    const cantidad = prompt('Ingrese la cantidad inicial:', '1');

    if (descripcion && establecimiento && precio && cantidad) {
      const precioNumerico = parseFloat(precio);
      const cantidadNumerica = parseInt(cantidad, 10);

      if (!isNaN(precioNumerico) && !isNaN(cantidadNumerica) && cantidadNumerica > 0) {
        this.obtenerNuevoId().subscribe(nuevoId => {
          this.firestore.collection('productos').add({
            cantidadStock: cantidadNumerica,
            codigo: this.scannedResult,
            descripcion: descripcion,
            establecimiento: establecimiento,
            id: nuevoId,
            precio: precioNumerico
          })
            .then(() => alert('Producto creado'))
            .catch(error => console.error('Error al crear producto: ', error));
        });
      } else {
        alert('Datos no válidos.');
      }
    } else {
      alert('Todos los campos son obligatorios.');
    }
  }

  obtenerNuevoId(): Observable<number> {
    return this.firestore.collection('productos', ref => ref.orderBy('id', 'desc').limit(1))
      .valueChanges()
      .pipe(
        map((productos: any[]) => {
          if (productos.length > 0 && typeof productos[0].id === 'number') {
            return productos[0].id + 1;
          } else {
            return 1;
          }
        })
      );
  }
}
