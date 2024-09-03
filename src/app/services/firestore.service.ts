import { Injectable } from '@angular/core';
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
      congelado: this.firestore.collection('Productos_Congelado'),
      fresco: this.firestore.collection('Productos_Fresco'),
      limpieza: this.firestore.collection('Productos_Limpieza'),
      tiquet: this.firestore.collection('Productos_Tiquet'),
      seco: this.firestore.collection('Productos_Seco'),
    };
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

  async updateOrCreateItem(description: string, quantity: number, price: number, codigo: string, establecimiento: string, fechaUltimaCompra: Date, fechaUltimoRetiro: Date) {
    const result = await this.checkIfItemExists(description);

    if (result.exists && result.collectionRef && result.itemDoc) {
      await this.updateItem(result.collectionRef, result.itemDoc.id, quantity, price, codigo, establecimiento, fechaUltimaCompra, fechaUltimoRetiro);
    } else {
      await this.createItem(description, quantity, price, codigo, establecimiento, fechaUltimaCompra, fechaUltimoRetiro);
    }
  }

  async updateItem(
    collectionRef: AngularFirestoreCollection<DocumentData>,
    docId: string,
    quantity: number,
    price: number,
    codigo: string,
    establecimiento: string,
    fechaUltimaCompra: Date,
    fechaUltimoRetiro: Date
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
        fechaUltimaCompra: fechaUltimaCompra,
        fechaUltimoRetiro: fechaUltimoRetiro,
        fechaCreacion: existingData['fechaCreacion'] || new Date() // Mantener la fecha de creación original
      });
      console.log(`Artículo actualizado: ${docId}, Nueva cantidad: ${newQuantity}, Precio: ${price}`);
    } catch (error) {
      console.error('Error al actualizar el artículo:', error);
    }
  }

  async createItem(
    description: string,
    quantity: number,
    price: number,
    codigo: string,
    establecimiento: string,
    fechaUltimaCompra: Date,
    fechaUltimoRetiro: Date
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
        fechaUltimoRetiro: fechaUltimoRetiro,
      };

      await this.collections['tiquet'].add(newItem);
      console.log('Artículo creado en la colección Productos_Tiquet:', newItem);
    } catch (error) {
      console.error('Error al crear el artículo:', error);
    }
  }
}
