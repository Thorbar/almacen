import { Injectable, ViewChild } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentData } from '@angular/fire/compat/firestore';



@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private collections: { [key: string]: AngularFirestoreCollection<DocumentData> };
  

  constructor(private firestore: AngularFirestore) {
    this.collections = this.initializeCollections();
  }

  private initializeCollections(): { [key: string]: AngularFirestoreCollection<DocumentData> } {
    return {
      all: this.firestore.collection('Almacen_de_prueba')      
    };
  }

  // Función para obtener o crear la colección de un usuario específico
  getOrCreateCollection(userEmail: string): AngularFirestoreCollection<DocumentData> {   
    const collectionName = `Almacen_${userEmail}`;

    if (!this.collections[collectionName]) {
      this.collections[collectionName] = this.firestore.collection(collectionName);
      console.log(`Colección creada: ${collectionName}`);
    }
    return this.collections[collectionName];
  }

  async checkIfItemExists(description: string): Promise<any> {
    for (const [key, collectionRef] of Object.entries(this.collections)) {
      console.log(`Buscando "${description}" en la colección "${key}"`);

      const snapshot = await collectionRef.ref.where('descripcion', '==', description).limit(1).get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        console.log(`Artículo encontrado en la colección "${key}": Documento ID: ${doc.id}`);
        return { exists: true, id: doc.id, collectionRef: collectionRef, itemDoc: doc };
      }
    }

    console.log(`Artículo "${description}" no encontrado en ninguna colección.`);
    return { exists: false, collectionRef: this.collections['tiquet'] };
  }

  async updateItem(
    collectionRef: AngularFirestoreCollection<DocumentData>,
    docId: string,
    quantity: number,
    price: number,
    codigo: string,
    establecimiento: string,
    fechaUltimaCompra: Date
  ) {
    try {
      const docRef = collectionRef.doc(docId);
      const docSnapshot = await docRef.get().toPromise();
      const existingData = docSnapshot?.data() || {};

      const newQuantity = (existingData['cantidadStock'] || 0) + quantity;

      await docRef.update({
        cantidadStock: newQuantity,
        precio: price,
        codigo: codigo,
        establecimiento: establecimiento,
        fechaUltimaCompra: fechaUltimaCompra
      });
      console.log(`Artículo actualizado: ${docId}, Nueva cantidad: ${newQuantity}, Precio: ${price}`);
    } catch (error) {
      console.error(`Error al actualizar el artículo ${docId}:`, error);
    }
  }

  async createItem(
    collectionRef: AngularFirestoreCollection<DocumentData>,
    description: string,
    quantity: number,
    price: number,
    codigo: string,
    establecimiento: string,
    fechaUltimaCompra: Date,
    internalCode: string // Añadimos el nuevo campo
  ) {
    try {
      const newItem = {
        descripcion: description,
        cantidadStock: quantity,
        precio: price,
        codigo: codigo,
        establecimiento: establecimiento,
        fechaCreacion: new Date(),
        fechaUltimaCompra: fechaUltimaCompra,
        internalCode: internalCode // Guardamos el campo
      };

      await collectionRef.add(newItem);
      console.log(`Artículo creado en la colección Productos_${collectionRef.ref.id}:`, newItem);
    } catch (error) {
      console.error(`Error al crear el artículo ${description}:`, error);
    }
  }
  //FAlta codigo para retirar item
}
