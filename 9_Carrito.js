// 9_Carrito.js
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { app } from "./firebaseConfig.js";

const auth = getAuth(app);
const db = getFirestore(app);
const carritoList = document.getElementById("carritoList");

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const uid = user.uid;
    const itemsRef = collection(db, "carrito", uid, "items");

    try {
      const snapshot = await getDocs(itemsRef);

      carritoList.innerHTML = "<h2>Tus pedidos</h2>";

      if (snapshot.empty) {
        carritoList.innerHTML += "<p>No tienes productos en tu carrito.</p>";
        localStorage.removeItem('carritoPago');
        return;
      }

      const carritoPago = [];

      snapshot.forEach(docSnap => {
        const producto = docSnap.data();
        const card = document.createElement("div");
        card.className = "producto";

        const img = document.createElement("img");
        img.src = producto.imagenes?.[0] || "https://via.placeholder.com/120?text=Sin+imagen";
        img.style.maxWidth = "120px";

        const nombre = document.createElement("div");
        nombre.className = "nombre";
        nombre.textContent = producto.nombre || "Sin nombre";

        const descripcion = document.createElement("div");
        descripcion.className = "descripcion";
        descripcion.textContent = producto.descripcion || "";

        const precio = document.createElement("div");
        precio.className = "precio";
        precio.textContent = `$${(producto.precio || 0).toFixed(2)}`;

        const eliminarBtn = document.createElement("button");
        eliminarBtn.textContent = "Eliminar";
        eliminarBtn.style.cursor = "pointer";
        eliminarBtn.onclick = async () => {
          try {
            await deleteDoc(doc(db, "carrito", uid, "items", docSnap.id));
            card.remove();
            // Actualizar localStorage
            const nuevoCarrito = carritoPago.filter(p => p.id !== (producto.id || docSnap.id));
            localStorage.setItem('carritoPago', JSON.stringify(nuevoCarrito));
          } catch (error) {
            alert("Error al eliminar el producto.");
            console.error(error);
          }
        };

        card.appendChild(img);
        card.appendChild(nombre);
        card.appendChild(descripcion);
        card.appendChild(precio);
        card.appendChild(eliminarBtn);

        carritoList.appendChild(card);

        // Construir carrito para localStorage
        carritoPago.push({
          id: producto.id || docSnap.id,
          name: producto.nombre || "Sin nombre",
          description: producto.descripcion || "",
          price: producto.precio || 0,
          images: producto.imagenes || [],
          ownerId: producto.ownerId || producto.vendedorId || "desconocido"
        });
      });

      localStorage.setItem('carritoPago', JSON.stringify(carritoPago));

    } catch (error) {
      carritoList.innerHTML = "<p>Error cargando productos.</p>";
      console.error(error);
    }
  } else {
    carritoList.innerHTML = "<p>Debes iniciar sesión para ver tu carrito.</p>";
    localStorage.removeItem('carritoPago');
  }
});
