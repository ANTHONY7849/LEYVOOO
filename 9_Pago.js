import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from './config.js';

const db = getFirestore(app);
const auth = getAuth(app);

const productosContainer = document.getElementById('productosResumen');
const totalElem = document.getElementById('totalPagar');
const nombreVendedorElem = document.getElementById('nombreVendedor');
const mensajeExito = document.getElementById('mensajeExito');
const btnHistorial = document.getElementById('btnHistorial');
const ventanaPedidos = document.getElementById('ventanaPedidos');
const btnVaciarCarrito = document.getElementById('btnVaciarCarrito');
const cantidadTotalProductosElem = document.getElementById('cantidadTotalProductos');
const btnPagoEfectivo = document.getElementById('pagoEfectivo');
const btnPagoTransferencia = document.getElementById('pagoTransferencia');

let carrito = JSON.parse(localStorage.getItem('carritoPago')) || [];
let usuarioActual = null;
let pedidoProcesado = false;

function mostrarCarrito() {
  productosContainer.innerHTML = "";
  let total = 0;
  carrito.forEach(producto => {
    total += producto.price || 0;
    productosContainer.innerHTML += `
      <div class="producto">
        <img src="${producto.images?.[0] || 'https://via.placeholder.com/80'}" alt="${producto.name}">
        <div class="info">
          <div class="nombre">${producto.name}</div>
          <div class="descripcion">${producto.description || ''}</div>
        </div>
        <div class="precio">$${(producto.price || 0).toFixed(2)}</div>
      </div>`;
  });
  cantidadTotalProductosElem.textContent = `Cantidad total de productos: ${carrito.length}`;
  totalElem.textContent = `Total: $${total.toFixed(2)}`;
  btnVaciarCarrito.disabled = carrito.length === 0;
}

async function obtenerNombreVendedor(uid) {
  if (!uid) {
    nombreVendedorElem.textContent = "Vendedor: desconocido";
    return;
  }
  const snap = await getDoc(doc(db, "usuarios", uid));
  nombreVendedorElem.textContent = snap.exists() ? `Vendedor: ${snap.data().nombre || 'Usuario'}` : "Vendedor: desconocido";
}

async function guardarPedido(metodo) {
  if (!usuarioActual || carrito.length === 0) return false;

  try {
    const usuarioSnap = await getDoc(doc(db, "usuarios", usuarioActual.uid));
    if (!usuarioSnap.exists()) throw new Error("No se encontró datos del usuario comprador");
    const datosUsuario = usuarioSnap.data();

    const vendedorId = carrito[0]?.vendedorId || carrito[0]?.ownerId || "desconocido";
    const vendedorSnap = await getDoc(doc(db, "usuarios", vendedorId));
    const datosVendedor = vendedorSnap.exists() ? vendedorSnap.data() : { nombre: "Desconocido" };

    const pedidoRef = await addDoc(collection(db, "pedidos"), {
      compradorId: usuarioActual.uid,
      compradorNombre: datosUsuario.nombre || "Desconocido",
      compradorEmail: datosUsuario.email || "",
      compradorTelefono: datosUsuario.telefono || "",
      fecha: Date.now(),
      productos: carrito,
      metodoPago: metodo,
      estado: "Comprado",
      vendedorId: vendedorId,
      vendedorNombre: datosVendedor.nombre || "Desconocido"
    });

    await addDoc(collection(db, "ventas"), {
      vendedorId: vendedorId,
      vendedorNombre: datosVendedor.nombre || "Desconocido",
      compradorId: usuarioActual.uid,
      compradorNombre: datosUsuario.nombre || "Desconocido",
      compradorEmail: datosUsuario.email || "",
      compradorTelefono: datosUsuario.telefono || "",
      fecha: Date.now(),
      productos: carrito,
      metodoPago: metodo,
      estado: "Comprado",
      pedidoId: pedidoRef.id
    });

    // 🔥 MARCAR PRODUCTOS COMO VENDIDOS SOLO SI EL USUARIO ACTUAL ES EL DUEÑO
    for (let p of carrito) {
      if (p.id && p.ownerId) {
        try {
          if (usuarioActual.uid === p.ownerId) {
            await updateDoc(doc(db, "productos", p.id), { vendido: true });
            console.log(`Producto ${p.name} marcado como vendido`);
          } else {
            console.warn(`No autorizado para marcar como vendido el producto ${p.name} (ownerId diferente)`);
          }
        } catch (e) {
          console.error(`No se pudo marcar el producto ${p.name} como vendido:`, e);
        }
      }
    }

    // 🔄 Limpiar carrito
    localStorage.removeItem('carritoPago');
    await setDoc(doc(db, "carrito", usuarioActual.uid), { productos: [] });

    return true;

  } catch (e) {
    alert("Error al guardar el pedido. " + e.message);
    console.error(e);
    return false;
  }
}

function finalizarCompra() {
  mensajeExito.style.display = 'block';
  btnPagoEfectivo.disabled = true;
  btnPagoTransferencia.disabled = true;
  btnVaciarCarrito.disabled = true;
  carrito = [];
  mostrarCarrito();
  nombreVendedorElem.textContent = "";
}

btnPagoEfectivo.onclick = async () => {
  if (pedidoProcesado) return;
  if (confirm("¿Confirmas que vas a pagar en efectivo?")) {
    if (await guardarPedido("Pago en efectivo")) {
      pedidoProcesado = true;
      finalizarCompra();
    }
  }
};

btnPagoTransferencia.onclick = async () => {
  if (pedidoProcesado) return;
  if (confirm("¿Confirmas que vas a pagar por transferencia?")) {
    if (await guardarPedido("Transferencia")) {
      pedidoProcesado = true;
      finalizarCompra();
    }
  }
};

btnVaciarCarrito.onclick = () => {
  if (confirm("¿Seguro quieres vaciar el carrito?")) {
    carrito = [];
    localStorage.removeItem('carritoPago');
    mostrarCarrito();
    nombreVendedorElem.textContent = "";
  }
};

btnHistorial.onclick = async () => {
  if (!usuarioActual) return alert("Inicia sesión primero.");
  ventanaPedidos.style.display = ventanaPedidos.style.display === 'block' ? 'none' : 'block';
  if (ventanaPedidos.style.display === 'none') return;

  ventanaPedidos.innerHTML = '<h3>Historial de Compras</h3><p>Cargando...</p>';

  const snap = await getDocs(query(collection(db, "pedidos"), where("compradorId", "==", usuarioActual.uid)));

  if (snap.empty) {
    ventanaPedidos.innerHTML = '<h3>Historial de Compras</h3><p>No tienes compras registradas.</p>';
    return;
  }

  let html = '<h3>Historial de Compras</h3>';
  snap.forEach(doc => {
    const pedido = doc.data();
    const fecha = new Date(pedido.fecha).toLocaleString();
    html += `
      <div class="pedido-item">
        <strong>Fecha:</strong> ${fecha}<br>
        <strong>Método:</strong> ${pedido.metodoPago}<br>
        <strong>Estado:</strong> ${pedido.estado}
        <div class="pedido-detalles" style="display:none;">
          <strong>Productos:</strong>
          <ul style="list-style:none; padding:0;">
            ${pedido.productos.map(p => `
              <li style="display:flex;gap:10px;align-items:center;margin-bottom:8px;">
                <img src="${p.images?.[0] || 'https://via.placeholder.com/80'}" style="width:50px;height:50px;border-radius:50%;">
                <div>
                  <strong style="color:#c0392b">${p.name || p.nombre || 'Sin nombre'}</strong><br>
                  <span style="color:#27ae60;">$${(p.price || 0).toFixed(2)}</span><br>
                  <small style="color:#555;">${p.description || ''}</small>
                </div>
              </li>`).join('')}
          </ul>
        </div>
      </div>`;
  });

  ventanaPedidos.innerHTML = html;
  ventanaPedidos.querySelectorAll('.pedido-item').forEach(item => {
    item.onclick = () => {
      const detalles = item.querySelector('.pedido-detalles');
      detalles.style.display = detalles.style.display === 'block' ? 'none' : 'block';
    };
  });
};

onAuthStateChanged(auth, async user => {
  if (user) {
    usuarioActual = user;
    mostrarCarrito();
    const vendedorId = carrito[0]?.vendedorId || carrito[0]?.ownerId || null;
    await obtenerNombreVendedor(vendedorId);
  } else {
    alert("Debes iniciar sesión para pagar.");
    window.location.href = "3_Tu.html";
  }
});
