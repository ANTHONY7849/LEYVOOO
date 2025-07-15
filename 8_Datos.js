import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updateProfile,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const nombreUsuarioContainer = document.getElementById("nombreUsuarioContainer");
const guardarCambiosBtn = document.getElementById("guardarCambiosBtn");
const correoUsuarioSpan = document.getElementById("correoUsuario");
const telefonoUsuarioSpan = document.getElementById("telefonoUsuario");
const listaProductosDiv = document.getElementById("listaProductos");
const botonCambiarContrasena = document.getElementById("botonCambiarContrasena"); // NUEVO

let usuarioActual = null;
let perfilUid = null; 
let nombreOriginal = "";
let inputEdit = null;

function obtenerUidDeUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("uid");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("Debes iniciar sesión.");
    window.location.href = "3_Tu.html";
    return;
  }

  usuarioActual = user;
  perfilUid = obtenerUidDeUrl() || user.uid;
  const esPerfilPropio = perfilUid === usuarioActual.uid;

  // NUEVO: ocultar el botón de cambiar contraseña si no es el dueño
  if (!esPerfilPropio && botonCambiarContrasena) {
    botonCambiarContrasena.style.display = "none";
  }

  // ocultar botón guardar cambios si no es el dueño (igual lo controlamos después pero por si acaso)
  if (!esPerfilPropio) {
    guardarCambiosBtn.style.display = "none";
    nombreUsuarioContainer.querySelector(".lapiz-icon")?.remove();
  }

  await cargarDatosUsuario(perfilUid, esPerfilPropio);
  await cargarProductosUsuario(perfilUid);
});

function mostrarNombre(nombre, esEditable = true) {
  if (inputEdit) {
    inputEdit.remove();
    inputEdit = null;
  }
  nombreUsuarioContainer.innerHTML = "";

  const span = document.createElement("span");
  span.id = "nombreUsuario";
  span.textContent = nombre;
  nombreUsuarioContainer.appendChild(span);

  if (esEditable) {
    const lapizSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    lapizSvg.setAttribute("class", "lapiz-icon");
    lapizSvg.setAttribute("viewBox", "0 0 24 24");
    lapizSvg.innerHTML = `<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0L14.13 5.87l3.75 3.75 2.83-2.58z"/>`;
    nombreUsuarioContainer.appendChild(lapizSvg);

    lapizSvg.addEventListener("click", () => {
      comenzarEdicion(nombre);
    });

    guardarCambiosBtn.style.display = "none";
  }
}

function comenzarEdicion(nombre) {
  nombreUsuarioContainer.innerHTML = "";

  inputEdit = document.createElement("input");
  inputEdit.type = "text";
  inputEdit.value = nombre;
  inputEdit.id = "nombreUsuarioInput";
  inputEdit.maxLength = 30;
  nombreUsuarioContainer.appendChild(inputEdit);

  inputEdit.addEventListener("input", () => {
    if (inputEdit.value.trim() !== nombreOriginal && inputEdit.value.trim() !== "") {
      guardarCambiosBtn.style.display = "block";
    } else {
      guardarCambiosBtn.style.display = "none";
    }
  });

  inputEdit.focus();
}

guardarCambiosBtn.addEventListener("click", async () => {
  if (!inputEdit) return;

  const nuevoNombre = inputEdit.value.trim();
  if (!nuevoNombre) {
    alert("El nombre no puede estar vacío.");
    return;
  }

  try {
    await updateProfile(usuarioActual, { displayName: nuevoNombre });
    await setDoc(doc(db, "usuarios", usuarioActual.uid), { nombre: nuevoNombre }, { merge: true });

    nombreOriginal = nuevoNombre;
    mostrarNombre(nuevoNombre);
    guardarCambiosBtn.style.display = "none";
    alert("Nombre actualizado correctamente.");
  } catch (error) {
    console.error("Error al actualizar nombre:", error);
    alert("Error al actualizar nombre.");
  }
});

async function cargarDatosUsuario(uid, esEditable) {
  try {
    const docRef = doc(db, "usuarios", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      nombreOriginal = data.nombre || "Sin nombre";

      mostrarNombre(nombreOriginal, esEditable);

      if (esEditable) {
        correoUsuarioSpan.textContent = usuarioActual.email || "No disponible";
        telefonoUsuarioSpan.textContent = data.telefono || "No registrado";
      } else {
        correoUsuarioSpan.textContent = "Información privada";
        telefonoUsuarioSpan.textContent = "Información privada";
      }
    } else {
      mostrarNombre("Sin nombre", esEditable);
      correoUsuarioSpan.textContent = esEditable ? (usuarioActual.email || "No disponible") : "Información privada";
      telefonoUsuarioSpan.textContent = esEditable ? "No registrado" : "Información privada";
    }
  } catch (error) {
    console.error("Error al cargar datos de usuario:", error);
    alert("Error al cargar datos de usuario.");
  }
}

async function cargarProductosUsuario(uid) {
  try {
    const productosQuery = query(
      collection(db, "productos"),
      where("uid", "==", uid)
    );

    const productosSnapshot = await getDocs(productosQuery);

    if (productosSnapshot.empty) {
      listaProductosDiv.innerHTML = "<p>No ha publicado ningún producto.</p>";
      return;
    }

    listaProductosDiv.innerHTML = "";

    for (const productoDoc of productosSnapshot.docs) {
      const producto = productoDoc.data();
      const productoId = productoDoc.id;

      const productoDiv = document.createElement("div");
      productoDiv.classList.add("producto");

      const img = document.createElement("img");
      img.src = producto.foto1 || "default-image.png";
      img.alt = producto.nombre || "Producto";
      productoDiv.appendChild(img);

      const infoDiv = document.createElement("div");
      infoDiv.classList.add("producto-info");

      const nombreP = document.createElement("p");
      nombreP.classList.add("producto-nombre");
      nombreP.textContent = producto.nombre || "Sin nombre";
      infoDiv.appendChild(nombreP);

      const precioP = document.createElement("p");
      precioP.classList.add("producto-precio");
      precioP.textContent = `$${producto.precio || "0.00"}`;
      infoDiv.appendChild(precioP);

      const comentariosCont = document.createElement("div");
      comentariosCont.classList.add("comentarios-container");

      const comentarios = await cargarComentariosProducto(productoId);

      if (comentarios.length === 0) {
        const sinCom = document.createElement("p");
        sinCom.textContent = "Sin comentarios aún.";
        comentariosCont.appendChild(sinCom);
      } else {
        for (const c of comentarios) {
          const comentarioDiv = document.createElement("div");
          comentarioDiv.classList.add("comentario");

          const textoCom = document.createElement("p");
          textoCom.textContent = c.comentario;
          comentarioDiv.appendChild(textoCom);

          const estrellas = document.createElement("div");
          estrellas.classList.add("estrellas");
          estrellas.innerHTML = crearEstrellasHTML(c.calificacion);
          comentarioDiv.appendChild(estrellas);

          comentariosCont.appendChild(comentarioDiv);
        }
      }

      infoDiv.appendChild(comentariosCont);

      productoDiv.appendChild(infoDiv);

      listaProductosDiv.appendChild(productoDiv);
    }
  } catch (error) {
    console.error("Error al cargar productos:", error);
    listaProductosDiv.innerHTML = "<p>Error al cargar productos.</p>";
  }
}

async function cargarComentariosProducto(productoId) {
  try {
    const comentariosCol = collection(db, "productos", productoId, "comentarios");
    const comentariosSnap = await getDocs(comentariosCol);

    const comentarios = [];
    comentariosSnap.forEach(doc => {
      comentarios.push(doc.data());
    });

    return comentarios;
  } catch (error) {
    console.error("Error al cargar comentarios:", error);
    return [];
  }
}

function crearEstrellasHTML(calificacion) {
  const maxEstrellas = 5;
  let html = "";
  for (let i = 1; i <= maxEstrellas; i++) {
    html += i <= calificacion ? "&#9733;" : "&#9734;";
  }
  return html;
}

window.mostrarVentanaContrasena = () => {
  document.getElementById("ventanaContrasena").style.display = "flex";
};

window.cerrarVentanaContrasena = () => {
  document.getElementById("ventanaContrasena").style.display = "none";
};

window.cambiarContrasena = async () => {
  const nueva = document.getElementById("nuevaContrasena").value;
  const repetir = document.getElementById("repetirContrasena").value;

  if (nueva.length < 6) return alert("La contraseña debe tener al menos 6 caracteres.");
  if (nueva !== repetir) return alert("Las contraseñas no coinciden.");

  try {
    await updatePassword(usuarioActual, nueva);
    alert("Contraseña actualizada.");
    window.cerrarVentanaContrasena();
  } catch (error) {
    alert("Error al cambiar contraseña. Intenta cerrar sesión y volver a ingresar.");
  }
};

window.irAlCentroControl = () => {
  window.location.href = "4_Usuario.html";
};
