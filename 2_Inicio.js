import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const contenedor = document.getElementById("contenedor-productos");

async function cargarProductos() {
  const productosRef = collection(db, "productos");
  const q = query(productosRef, orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);

  contenedor.innerHTML = "";

  snapshot.forEach((doc) => {
    const producto = doc.data();
    const div = document.createElement("div");
    div.classList.add("product-card");

    div.innerHTML = `
      <img src="${producto.images?.[0] || 'https://via.placeholder.com/150'}" alt="${producto.name}" />
      <h3 class="name">${producto.name}</h3>
      <p class="price">$${typeof producto.price === 'number' ? producto.price.toFixed(2) : '0.00'}</p>
      <p class="description">${producto.description}</p>
      ${
        producto.vendido
          ? `<p style="color:#e53935;font-weight:bold;">Producto ya vendido</p>`
          : `<button class="btn-comprar-inicio">Ver detalles</button>`
      }
    `;

    if (!producto.vendido) {
      div.querySelector(".btn-comprar-inicio").addEventListener("click", () => {
        mostrarModal(producto);
      });
    }

    contenedor.appendChild(div);
  });
}

function mostrarModal(producto) {
  const modal = document.createElement("div");
  modal.classList.add("modal-overlay");

  modal.innerHTML = `
    <div class="modal-content">
      <h2>${producto.name}</h2>
      <img src="${producto.images?.[0] || 'https://via.placeholder.com/150'}" alt="${producto.name}" style="max-width: 100%; border-radius: 12px;" />
      <p><strong>Descripción:</strong> ${producto.description}</p>
      <p><strong>Precio:</strong> $${typeof producto.price === 'number' ? producto.price.toFixed(2) : '0.00'}</p>
      <div class="modal-buttons">
        ${
          producto.vendido
            ? `<p style="color:#e53935;font-weight:bold;">Este producto ya fue vendido.</p>`
            : producto.modoVenta === "vender"
            ? `<button class="btn-comprar">Comprar</button>`
            : `<button class="btn-interesado">Estoy interesado</button>`
        }
        <button class="btn-cerrar">Volver al inicio</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".btn-cerrar").addEventListener("click", () => {
    modal.remove();
  });

  if (!producto.vendido) {
    if (producto.modoVenta === "vender") {
      modal.querySelector(".btn-comprar").addEventListener("click", () => {
        mostrarConfirmacion(
          "¿Estás seguro de que deseas comprar este producto? Esta acción confirma tu intención.",
          () => {
            alert("Has comprado este producto (simulado).");
            modal.remove();
          }
        );
      });
    } else {
      modal.querySelector(".btn-interesado").addEventListener("click", () => {
        mostrarConfirmacion(
          "¿Estás seguro de que deseas mostrar interés por este producto? El vendedor podrá contactarte.",
          () => {
            alert("Has mostrado interés por este producto (simulado).");
            modal.remove();
          }
        );
      });
    }
  }
}

function mostrarConfirmacion(mensaje, onAceptar) {
  const confirmModal = document.createElement("div");
  confirmModal.classList.add("modal-overlay");

  confirmModal.innerHTML = `
    <div class="modal-content" style="max-width: 360px;">
      <p>${mensaje}</p>
      <div class="modal-buttons">
        <button class="btn-aceptar">Aceptar</button>
        <button class="btn-cancelar">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(confirmModal);

  confirmModal.querySelector(".btn-aceptar").addEventListener("click", () => {
    onAceptar();
    confirmModal.remove();
  });

  confirmModal.querySelector(".btn-cancelar").addEventListener("click", () => {
    confirmModal.remove();
  });
}

// Estilos del modal (igual que antes)
const estiloModal = document.createElement("style");
estiloModal.textContent = `
  .modal-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100vw; height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    display: flex; justify-content: center; align-items: center;
    z-index: 9999;
  }
  .modal-content {
    background: #fff;
    padding: 24px;
    border-radius: 16px;
    max-width: 420px;
    width: 90%;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    text-align: center;
  }
  .modal-buttons {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .modal-buttons button {
    padding: 12px;
    border: none;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
    font-size: 1rem;
  }
  .btn-comprar {
    background-color: #ab47bc;
    color: white;
  }
  .btn-interesado {
    background-color: #7e57c2;
    color: white;
  }
  .btn-aceptar {
    background-color: #43a047;
    color: white;
  }
  .btn-cancelar {
    background-color: #e0e0e0;
    color: #333;
  }
  .btn-cerrar {
    background-color: #f3e5f5;
    color: #6a1b9a;
  }
`;
document.head.appendChild(estiloModal);

cargarProductos();
