import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "anthonypillajo99@gmail.com";

// Elementos DOM
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const formLogin = document.getElementById("formLogin");
const formRegister = document.getElementById("formRegister");
const errorMsg = document.getElementById("errorMsg");

// Redirigir si ya está logueado y correo verificado
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    window.location.href = "4_Usuario.html";
  }
});

// Cambiar pestañas
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  formLogin.classList.add("active");
  formRegister.classList.remove("active");
  errorMsg.textContent = "";
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  formRegister.classList.add("active");
  formLogin.classList.remove("active");
  errorMsg.textContent = "";
});

// Registro
formRegister.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("regUser").value.trim();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const phone = document.getElementById("regPhone").value.trim();
  const password = document.getElementById("regPass").value;
  const confirm = document.getElementById("confirmPass").value;

  // Validar teléfono (10 dígitos y empieza con 09)
  if (!/^09\d{8}$/.test(phone)) {
    alert("El número de teléfono debe comenzar con 09 y tener exactamente 10 dígitos.");
    return;
  }

  if (password !== confirm) {
    alert("Las contraseñas no coinciden.");
    return;
  }

  if (!email.endsWith("@epn.edu.ec")) {
    try {
      const correoRef = doc(db, "correosExternos", email);
      const correoSnap = await getDoc(correoRef);
      if (!correoSnap.exists()) {
        alert("Tu correo externo no está autorizado. Contacta con el administrador.");
        return;
      }
    } catch (error) {
      console.error("Error al verificar correo externo:", error);
      alert("Error al verificar autorización de correo externo.");
      return;
    }
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });

    await setDoc(doc(db, "usuarios", cred.user.uid), {
      nombre: username,
      email: email,
      telefono: phone
    });

    await sendEmailVerification(cred.user);

    alert("Registro exitoso. Se ha enviado un correo de verificación.");
    formRegister.reset();
    tabLogin.click();

  } catch (error) {
    console.error("Error en el registro:", error.message);
    alert("Error en el registro: " + error.message);
  }
});

// Inicio de sesión
formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginUserOrEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPass").value;

  const esAdmin = email === ADMIN_EMAIL;
  const esInstitucional = email.endsWith("@epn.edu.ec");

  if (!esAdmin && !esInstitucional) {
    try {
      const correoRef = doc(db, "correosExternos", email);
      const correoSnap = await getDoc(correoRef);
      if (!correoSnap.exists()) {
        alert("Tu correo no está autorizado para acceder.");
        return;
      }
    } catch (error) {
      console.error("Error al verificar correo externo:", error);
      alert("Error al verificar autorización.");
      return;
    }
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    if (!cred.user.emailVerified && !esAdmin) {
      alert("Debes verificar tu correo antes de iniciar sesión.");
      await signOut(auth);
      return;
    }

    console.log("Sesión iniciada:", cred.user.uid);
    window.location.href = "4_Usuario.html";

  } catch (error) {
    console.error("Error al iniciar sesión:", error.message);
    if (error.code === "auth/user-disabled") {
      alert("Tu cuenta ha sido bloqueada.");
    } else {
      alert("Correo o contraseña incorrectos.");
    }
  }
});

// Recuperar contraseña
document.getElementById("olvideContrasena").addEventListener("click", async (e) => {
  e.preventDefault();
  const correo = prompt("Ingresa tu correo completo:");

  if (!correo) return;

  const esValido = correo.endsWith("@epn.edu.ec") || correo.toLowerCase() === ADMIN_EMAIL;

  if (!esValido) {
    alert("Solo los correos @epn.edu.ec pueden recuperar la contraseña.");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, correo);
    alert("Se ha enviado un correo para restablecer tu contraseña.");
  } catch (error) {
    console.error("Error al enviar reset:", error.message);
    alert("No se pudo enviar el correo. ¿Está registrado?");
  }
});
