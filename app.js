function guardarCuentasLocal() {
  localStorage.setItem("cuentas", JSON.stringify(cuentas));
}

let cuentas = [];
let usuarioActual = null;

// Cargar JSON de cuentas
async function cargarCuentas() {
  try {
    const res = await fetch("data/cuentas.json");
    const base = await res.json();

    // Traemos lo que esté en localStorage
    const extras = JSON.parse(localStorage.getItem("cuentas") || "[]");

    // Merge por usuario: lo guardado pisa a lo base
    const map = new Map();
    base.forEach(c => map.set(c.usuario, c));
    extras.forEach(c => map.set(c.usuario, c));
    cuentas = Array.from(map.values());
  } catch (error) {
    Swal.fire("Error", "No se pudo cargar la base de datos", "error");
  }
}

// Renderizar login
function mostrarLogin() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <h1>Home Banking</h1>
    <input type="text" id="usuario" placeholder="Usuario">
    <input type="password" id="password" placeholder="Contraseña">
    <button onclick="login()">Ingresar</button>
    <hr>
    <button onclick="mostrarRegistro()">Crear cuenta</button>
  `;
}

function mostrarRegistro() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <h2>Registro de nuevo usuario</h2>
    <input type="text" id="nuevoNombre" placeholder="Nombre completo">
    <input type="text" id="nuevoUsuario" placeholder="Nombre de usuario">
    <input type="password" id="nuevoPassword" placeholder="Contraseña">
    <input type="number" id="nuevoSaldo" placeholder="Saldo inicial">
    <input type="text" id="nuevoFoto" placeholder="Archivo de foto (opcional, ej: jcord.jpg)">
    <button onclick="crearCuenta()">Registrar</button>
    <button onclick="mostrarLogin()">Volver</button>
  `;
}

function crearCuenta() {
  const nombre = document.getElementById("nuevoNombre").value.trim();
  const usuario = document.getElementById("nuevoUsuario").value.trim();
  const password = document.getElementById("nuevoPassword").value;
  const saldo = parseFloat(document.getElementById("nuevoSaldo").value);
  const fotoNombre = document.getElementById("nuevoFoto").value.trim(); // opcional

  if (!nombre || !usuario || !password || isNaN(saldo) || saldo < 0) {
    Swal.fire("Error", "Todos los campos son obligatorios y válidos", "warning");
    return;
  }

  const existente = cuentas.find(c => c.usuario === usuario);
  if (existente) {
    Swal.fire("Error", "Ese nombre de usuario ya existe", "error");
    return;
  }

  registrarCuenta(
    nombre,
    usuario,
    password,
    saldo,
    fotoNombre ? `assets/${fotoNombre}` : null
  );
}

function registrarCuenta(nombre, usuario, password, saldo, foto) {
  const nuevaCuenta = {
    id: cuentas.length + 1,
    usuario,
    password,
    nombre,
    saldo,
    foto, // string con ruta o null
    movimientos: [
      { tipo: "ingreso", monto: saldo, descripcion: "Saldo inicial" }
    ]

  };

  cuentas.push(nuevaCuenta);
  usuarioActual = nuevaCuenta;
  localStorage.setItem("cuentas", JSON.stringify(cuentas)); // Guardar en localStorage

  Swal.fire("¡Cuenta creada!", "Bienvenido a Home Banking", "success")
    .then(() => { mostrarDashboard(); });
}


// Autenticación
function login() {
  const user = document.getElementById("usuario").value;
  const pass = document.getElementById("password").value;

  const cuenta = cuentas.find(c => c.usuario === user && c.password === pass);

  if (cuenta) {
    usuarioActual = cuenta;
    mostrarDashboard();
  } else {
    Swal.fire("Error", "Usuario o contraseña incorrectos", "error");
  }
}

// Dashboard principal
function mostrarDashboard() {
  const app = document.getElementById("app");
  app.innerHTML = `
  <div style="text-align:center">
    <img
      src="${usuarioActual.foto || 'assets/' + usuarioActual.usuario + '.jpg'}"
      alt="avatar"
      class="avatar"
      onerror="this.onerror=null;this.src='assets/default.jpg';"
    >
    <h2>Bienvenido, ${usuarioActual.nombre}</h2>
  </div>

  <div class="card">
    <strong>Saldo actual:</strong> $${usuarioActual.saldo.toLocaleString()}
  </div>

  <div class="card">
    <h3>Transferir dinero</h3>
    <input type="text" id="destino" placeholder="Usuario destino">
    <input type="number" id="monto" placeholder="Monto a transferir">
    <button onclick="transferir()">Enviar</button>
  </div>

  <div class="card">
    <h3>Historial de movimientos</h3>
    <div id="historial"></div>
  </div>

  <button onclick="logout()">Cerrar sesión</button>
`;
  renderizarMovimientos();
}

// Transferencias
function transferir() {
  const destino = document.getElementById("destino").value;
  const monto = parseFloat(document.getElementById("monto").value);

  if (!destino || isNaN(monto) || monto <= 0) {
    Swal.fire("Error", "Datos inválidos", "warning");
    return;
  }

  if (monto > usuarioActual.saldo) {
    Swal.fire("Error", "Saldo insuficiente", "error");
    return;
  }

  const cuentaDestino = cuentas.find(c => c.usuario === destino);
  if (!cuentaDestino) {
    Swal.fire("Error", "Cuenta destino no existe", "error");
    return;
  }

  usuarioActual.saldo -= monto;
  cuentaDestino.saldo += monto;

  usuarioActual.movimientos.push({ tipo: "egreso", monto, descripcion: `Transferencia a ${destino}` });
  cuentaDestino.movimientos.push({ tipo: "ingreso", monto, descripcion: `Transferencia de ${usuarioActual.usuario}` });

  guardarCuentasLocal();

  Swal.fire("¡Éxito!", `Transferiste $${monto.toLocaleString()} a ${destino}`, "success");
  mostrarDashboard();
}

// Mostrar movimientos
function renderizarMovimientos() {
  const contenedor = document.getElementById("historial");
  contenedor.innerHTML = "";

  usuarioActual.movimientos.slice().reverse().forEach(mov => {
    const div = document.createElement("div");
    div.className = "flex";
    div.innerHTML = `
      <span>${mov.descripcion}</span>
      <span style="color:${mov.tipo === 'ingreso' ? 'green' : 'red'}">
        ${mov.tipo === 'ingreso' ? '+' : '-'}$${mov.monto.toLocaleString()}
      </span>
    `;
    contenedor.appendChild(div);
  });
}

// Logout
function logout() {
  usuarioActual = null;
  mostrarLogin();
}

// Inicialización
cargarCuentas().then(() => mostrarLogin());
