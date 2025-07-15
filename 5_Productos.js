
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

let usuarioActivo = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    usuarioActivo = user;
    console.log("✅ Usuario autenticado:", user.email);
  } else {
    usuarioActivo = null;
    alert("Debe iniciar sesión para publicar.");
    window.location.href = "3_Tu.html";
  }
});

const descripcionInput = document.getElementById("descripcion");
const infoAdicionalInput = document.getElementById("infoAdicional");

function validarLongitudes(nombre, descripcion, infoAdicional) {
  if (nombre.length === 0 || nombre.length > 25) {
    alert("El nombre debe tener entre 1 y 25 caracteres.");
    return false;
  }
  if (descripcion.length === 0 || descripcion.length > 90) {
    alert("La descripción debe tener entre 1 y 90 caracteres.");
    return false;
  }
  if (infoAdicional.length > 150) {
    alert("La información adicional no puede superar los 150 caracteres.");
    return false;
  }
  return true;
}

function comprimirImagen(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressed = canvas.toDataURL("image/jpeg", 0.6);
        resolve(compressed);
      };
      img.onerror = () => reject("Error al cargar la imagen.");
      img.src = e.target.result;
    };

    reader.onerror = () => reject("Error al leer el archivo.");
    reader.readAsDataURL(archivo);
  });
}

async function publicarProducto() {
  const nombre = document.getElementById("nombre").value.trim();
  const descripcion = descripcionInput.value.trim();
  const infoAdicional = infoAdicionalInput.value.trim();
  const price = parseFloat(document.getElementById("input-price").value);
  const imageInputs = [document.getElementById("img1"), document.getElementById("img2"), document.getElementById("img3")];

  if (!validarLongitudes(nombre, descripcion, infoAdicional)) {
    return;
  }

  if (isNaN(price) || price < 1) {
    alert("Por favor ingresa un precio válido (mínimo 1).");
    return;
  }

  const modoVentaInput = document.querySelector('input[name="modoVenta"]:checked');
  if (!modoVentaInput) {
    alert("Debes seleccionar cómo quieres vender.");
    return;
  }
  const modoVenta = modoVentaInput.value;

  try {
    const imageURLs = [];
    for (let i = 0; i < imageInputs.length; i++) {
      const input = imageInputs[i];
      const archivo = input.files?.[0];
      if (archivo) {
        const base64 = await comprimirImagen(archivo);
        const timestamp = Date.now();
        const imageRef = ref(storage, `productos/${timestamp}_${i}.jpg`);
        await uploadString(imageRef, base64, "data_url");
        const url = await getDownloadURL(imageRef);
        imageURLs.push(url);
      }
    }

    const producto = {
      name: nombre,
      description: descripcion,
      info: infoAdicional,
      price: price,
      images: imageURLs,
      ownerId: usuarioActivo.uid,
      modoVenta: modoVenta,
      timestamp: serverTimestamp(),
    };

    console.log("📦 Producto a guardar en Firestore:", producto);

    await addDoc(collection(db, "productos"), producto);

    console.log("✅ Producto guardado en Firestore correctamente");
    alert("¡Producto publicado con éxito!");
    window.location.href = "4_Usuario.html";
  } catch (error) {
    console.error("🔥 ERROR al publicar producto:", error);
    alert("Error al publicar producto. Revisa la consola.");
  }
}

document.getElementById("btn-publicar").addEventListener("click", publicarProducto);

// Respetando tu sistema de imágenes y caja
document.querySelectorAll(".upload-box").forEach((box) => {
  const input = box.querySelector("input[type='file']");
  box.addEventListener("click", () => {
    if (!box.classList.contains("filled")) {
      input.click();
    }
  });

  input.addEventListener("change", () => {
    if (input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        let img = box.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          box.appendChild(img);
        }
        img.src = e.target.result;
        box.classList.add("filled");
      };

      reader.readAsDataURL(file);
    }
  });
});

// Exporta para poder usar en otras páginas (opcional)
export { usuarioActivo, db };
