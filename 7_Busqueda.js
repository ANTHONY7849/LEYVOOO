import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const productList = document.getElementById("productList");
const searchInput = document.getElementById("searchInput");
const filterBtn = document.getElementById("filterIcon");
const filterMenu = document.getElementById("filterMenu");
const closeFilter = document.getElementById("closeFilter");
const orderAsc = document.getElementById("asc");
const orderDesc = document.getElementById("desc");
const minInput = document.getElementById("minPrice");
const maxInput = document.getElementById("maxPrice");
const rangeBtn = document.getElementById("applyRange");
const modoVentaSelect = document.getElementById("modoVentaSelect");
const applyModeBtn = document.getElementById("applyMode");

const modal = document.getElementById("modalProducto");
const modalNombre = document.getElementById("modalNombre");
const modalDescripcion = document.getElementById("modalDescripcion");
const modalFotos = document.getElementById("modalFotos");
const modalPrecio = document.getElementById("modalPrecio");
const btnCerrarModal = document.getElementById("btnCerrarModal");
const btnComprar = document.getElementById("btnComprar");
const modalImgGrande = document.getElementById("modalImagenGrande");
const imgGrande = document.getElementById("imgGrande");
const cerrarZoom = document.getElementById("cerrarZoom");

let allProducts = [];
let productoActual = null;
let usuarioActual = null;

async function fetchProducts() {
  const q = query(collection(db, "productos"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  allProducts = querySnapshot.docs.map(doc => {
    const data = doc.data();
    data.id = doc.id;
    return data;
  });
  showProducts(allProducts);
}

function showProducts(products) {
  productList.innerHTML = "";
  if (products.length === 0) {
    productList.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }
  products.forEach(p => {
    const img = p.images?.[0] || 'https://via.placeholder.com/110?text=Sin+imagen';
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${img}" alt="${p.name}">
      <div class="product-info">
        <div class="name">${p.name}</div>
        <div class="description">${p.description}</div>
        <div class="price">${p.price} USD</div>
      </div>
    `;
    card.addEventListener("click", () => openModal(p));
    productList.appendChild(card);
  });
}

function applySearch() {
  const text = searchInput.value.toLowerCase();
  const filtered = allProducts.filter(p => p.name?.toLowerCase().includes(text));
  showProducts(filtered);
}

function openModal(producto) {
  productoActual = producto;
  modalNombre.textContent = producto.name;
  modalDescripcion.textContent = producto.description || "Sin descripción.";
  modalFotos.innerHTML = "";

  if (producto.images && producto.images.length > 0) {
    producto.images.slice(0, 3).forEach(url => {
      const img = document.createElement("img");
      img.src = url;
      img.alt = producto.name;
      img.style.width = "130px";
      img.style.height = "130px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "10px";
      img.style.boxShadow = "0 3px 8px rgba(0,0,0,0.3)";
      modalFotos.appendChild(img);
    });
  } else {
    modalFotos.textContent = "Sin imágenes disponibles.";
  }

  modalPrecio.textContent = `${producto.price} USD`;

  if (producto.modoVenta === "interesados") {
    btnComprar.textContent = "Estoy interesado";
    btnComprar.onclick = () => registrarInteres();
  } else {
    btnComprar.textContent = "Comprar";
    btnComprar.onclick = () => agregarAlCarrito();
  }

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

async function registrarInteres() {
  if (!usuarioActual) return alert("Debes iniciar sesión.");
  if (usuarioActual.uid === productoActual.ownerId) return alert("No puedes interesarte en tu propio producto.");

  const confirmar = confirm(`¿Estás seguro de mostrar interés en "${productoActual.name}"? Esto quedará registrado.`);
  if (!confirmar) return;

  try {
    const interesadoRef = doc(db, "interesados", usuarioActual.uid + "_" + productoActual.id);
    const interesadoSnap = await getDoc(interesadoRef);

    if (interesadoSnap.exists()) {
      const data = interesadoSnap.data();
      if (data.contador >= 3) {
        alert("Has superado el máximo de 3 veces para mostrar interés en este producto.");
        return;
      }
      await updateDoc(interesadoRef, {
        contador: data.contador + 1,
        lastInterest: serverTimestamp()
      });
      alert(`Interés registrado nuevamente (${data.contador+1}/3).`);
    } else {
      await setDoc(interesadoRef, {
        usuarioId: usuarioActual.uid,
        productoId: productoActual.id,
        contador: 1,
        firstInterest: serverTimestamp(),
        lastInterest: serverTimestamp()
      });
      alert("Interés registrado (1/3).");
    }

    modal.style.display = "none";
    document.body.style.overflow = "auto";
  } catch (error) {
    console.error("Error registrando interés:", error);
    alert("Error al registrar interés.");
  }
}

async function agregarAlCarrito() {
  if (!productoActual) return alert("No hay producto seleccionado.");
  if (!usuarioActual) return alert("Debes iniciar sesión.");
  try {
    const docRef = doc(db, "carrito", usuarioActual.uid);
    const docSnap = await getDoc(docRef);
    const productos = docSnap.exists() ? docSnap.data().productos || [] : [];

    const yaExiste = productos.some(p => p.id === productoActual.id);
    if (yaExiste) {
      alert("Este producto ya está en tu carrito.");
      return;
    }

    productos.push(productoActual);
    await setDoc(docRef, { productos });
    window.location.href = "9_Carrito.html";
  } catch (err) {
    console.error("Error agregando al carrito:", err);
    alert("Error al agregar al carrito.");
  }
}

btnCerrarModal.addEventListener("click", () => {
  modal.style.display = "none";
  document.body.style.overflow = "auto";
});

modal.addEventListener("click", e => {
  if (e.target === modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
});

searchInput.addEventListener("input", applySearch);
filterBtn.addEventListener("click", () => filterMenu.style.display = "block");
closeFilter.addEventListener("click", () => filterMenu.style.display = "none");
orderAsc.addEventListener("click", () => showProducts([...allProducts].sort((a,b)=>a.price-b.price)));
orderDesc.addEventListener("click", () => showProducts([...allProducts].sort((a,b)=>b.price-a.price)));
rangeBtn.addEventListener("click", () => {
  const min = parseFloat(minInput.value) || 0;
  const max = parseFloat(maxInput.value) || 999999;
  showProducts(allProducts.filter(p => p.price >= min && p.price <= max));
  filterMenu.style.display = "none";
});
applyModeBtn.addEventListener("click", () => {
  const mode = modoVentaSelect.value;
  if (!mode) return showProducts(allProducts);
  showProducts(allProducts.filter(p => p.modoVenta === mode));
  filterMenu.style.display = "none";
});

onAuthStateChanged(auth, user => {
  usuarioActual = user;
  fetchProducts();
});
