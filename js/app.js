/* =========================================================
   La Carpeta de Manduq — lógica del blog (JavaScript sin librerías)
   1. Navegación por secciones (single page con #hash)
   2. Modo día / noche
   3. Menú móvil
   4. Filtro de entradas por nivel
   5. Tiempo de lectura y barra de progreso
   6. "Me gusta" y comentarios (guardados en localStorage)
   7. Calculadora de valor esperado
   ========================================================= */

// Orden de las entradas: se usa para los enlaces anterior / siguiente
const ENTRADAS = [
  { id: 'japones-o-ingles', titulo: '¿Coleccionar en japonés o en inglés?' },
  { id: 'proteger-cartas', titulo: 'Proteger tus cartas sin gastar de más' },
  { id: 'sobres-o-sueltas', titulo: 'Abrir sobres o comprar sueltas' }
];

const vistas = document.querySelectorAll('.vista');
const enlacesMenu = document.querySelectorAll('.navegacion a');
const bloqueInteraccion = document.getElementById('interaccion');

/* ---------- Pequeño ayudante para localStorage (puede fallar en modo privado) ---------- */
const almacen = {
  leer(clave, porDefecto) {
    try {
      const valor = localStorage.getItem(clave);
      return valor === null ? porDefecto : JSON.parse(valor);
    } catch (e) { return porDefecto; }
  },
  guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ }
  }
};

/* =========================================================
   1. NAVEGACIÓN: muestra solo la sección que indica el #hash
   ========================================================= */
function mostrarVista() {
  const ruta = location.hash.replace('#', '') || 'inicio';
  let vistaActiva = document.querySelector(`.vista[data-vista="${ruta}"]`);

  // Si el hash no corresponde a ninguna vista (p. ej. #contenido), mostramos el inicio
  if (!vistaActiva) vistaActiva = document.getElementById('vista-inicio');

  vistas.forEach(v => { v.hidden = v !== vistaActiva; });

  // Marca en el menú la sección actual
  enlacesMenu.forEach(a => {
    if (a.dataset.ruta === vistaActiva.dataset.vista) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  // Si es una entrada, colocamos debajo el bloque de me gusta / comentarios
  const esEntrada = vistaActiva.classList.contains('entrada');
  bloqueInteraccion.hidden = !esEntrada;
  if (esEntrada) {
    vistaActiva.after(bloqueInteraccion);
    prepararInteraccion(vistaActiva.dataset.id);
  }

  document.title = esEntrada
    ? `${vistaActiva.querySelector('h1').textContent} · La Carpeta de Manduq`
    : 'La Carpeta de Manduq · Blog de coleccionismo Pokémon TCG';

  cerrarMenuMovil();
  window.scrollTo(0, 0);
  actualizarProgreso();
}

window.addEventListener('hashchange', mostrarVista);

/* =========================================================
   2. MODO DÍA / NOCHE (se recuerda entre visitas)
   ========================================================= */
const botonTema = document.getElementById('boton-tema');
const textoTema = botonTema.querySelector('.tema-texto');

function aplicarTema(tema) {
  const noche = tema === 'noche';
  if (noche) document.documentElement.dataset.tema = 'noche';
  else delete document.documentElement.dataset.tema;
  botonTema.setAttribute('aria-pressed', String(noche));
  textoTema.textContent = noche ? 'Modo día' : 'Modo noche';
}

botonTema.addEventListener('click', () => {
  const nuevo = document.documentElement.dataset.tema === 'noche' ? 'dia' : 'noche';
  aplicarTema(nuevo);
  try { localStorage.setItem('tema', nuevo); } catch (e) {}
});

/* =========================================================
   3. MENÚ MÓVIL
   ========================================================= */
const botonMenu = document.getElementById('menu-movil');
const nav = document.getElementById('navegacion');

botonMenu.addEventListener('click', () => {
  const abierto = nav.classList.toggle('abierta');
  botonMenu.setAttribute('aria-expanded', String(abierto));
});

function cerrarMenuMovil() {
  nav.classList.remove('abierta');
  botonMenu.setAttribute('aria-expanded', 'false');
}

/* =========================================================
   4. FILTRO DE ENTRADAS POR NIVEL (rareza)
   ========================================================= */
const botonesFiltro = document.querySelectorAll('.filtro');
const fundasConCarta = document.querySelectorAll('.funda[data-nivel]');
const notaFiltro = document.getElementById('nota-filtro');

botonesFiltro.forEach(boton => {
  boton.addEventListener('click', () => {
    const filtro = boton.dataset.filtro;

    botonesFiltro.forEach(b => {
      const activo = b === boton;
      b.classList.toggle('activo', activo);
      b.setAttribute('aria-pressed', String(activo));
    });

    // En vez de quitar las cartas, se "apagan" para que la carpeta mantenga su forma
    let visibles = 0;
    fundasConCarta.forEach(funda => {
      const coincide = filtro === 'todas' || funda.dataset.nivel === filtro;
      funda.classList.toggle('oculta', !coincide);
      funda.querySelector('.carta').tabIndex = coincide ? 0 : -1;
      if (coincide) visibles++;
    });

    notaFiltro.textContent = filtro === 'todas'
      ? '3 entradas. Los huecos libres se irán llenando.'
      : `${visibles} ${visibles === 1 ? 'entrada' : 'entradas'} de este nivel.`;
  });
});

/* =========================================================
   5. TIEMPO DE LECTURA Y BARRA DE PROGRESO
   ========================================================= */
document.querySelectorAll('.entrada').forEach(entrada => {
  const palabras = entrada.textContent.trim().split(/\s+/).length;
  const minutos = Math.max(1, Math.round(palabras / 200)); // ~200 palabras por minuto
  entrada.querySelector('.tiempo-lectura').textContent = `${minutos} min de lectura`;
});

const barraProgreso = document.getElementById('barra-progreso');

function actualizarProgreso() {
  const entradaVisible = document.querySelector('.entrada:not([hidden])');
  if (!entradaVisible) { barraProgreso.style.width = '0'; return; }
  const recorrido = document.documentElement.scrollHeight - window.innerHeight;
  const porcentaje = recorrido > 0 ? (window.scrollY / recorrido) * 100 : 100;
  barraProgreso.style.width = `${Math.min(100, porcentaje)}%`;
}

window.addEventListener('scroll', actualizarProgreso, { passive: true });

/* =========================================================
   6. ME GUSTA, COMENTARIOS Y ANTERIOR / SIGUIENTE
   ========================================================= */
const botonMeGusta = document.getElementById('boton-me-gusta');
const textoMeGusta = document.getElementById('texto-me-gusta');
const contadorMeGusta = document.getElementById('contador-me-gusta');
const listaComentarios = document.getElementById('lista-comentarios');
const formComentario = document.getElementById('form-comentario');
const errorComentario = document.getElementById('error-comentario');
const enlaceAnterior = document.getElementById('enlace-anterior');
const enlaceSiguiente = document.getElementById('enlace-siguiente');

let entradaActual = null;

function prepararInteraccion(id) {
  entradaActual = id;
  pintarMeGusta();
  pintarComentarios();
  errorComentario.textContent = '';

  // Enlaces a la entrada anterior y siguiente
  const i = ENTRADAS.findIndex(e => e.id === id);
  const anterior = ENTRADAS[i - 1];
  const siguiente = ENTRADAS[i + 1];
  rellenarEnlace(enlaceAnterior, anterior, 'Entrada anterior');
  rellenarEnlace(enlaceSiguiente, siguiente, 'Entrada siguiente');
}

function rellenarEnlace(enlace, entrada, etiqueta) {
  enlace.hidden = !entrada;
  if (!entrada) return;
  enlace.href = `#${entrada.id}`;
  enlace.innerHTML = '';
  const pequeño = document.createElement('small');
  pequeño.textContent = etiqueta;
  enlace.append(pequeño, entrada.titulo);
}

/* --- Me gusta --- */
function pintarMeGusta() {
  const meGustan = almacen.leer('me-gusta', {});
  const marcado = Boolean(meGustan[entradaActual]);
  botonMeGusta.setAttribute('aria-pressed', String(marcado));
  textoMeGusta.textContent = marcado ? 'Te gusta' : 'Me gusta';
  contadorMeGusta.textContent = marcado ? 'Guardado en tus favoritos' : '';
}

botonMeGusta.addEventListener('click', () => {
  const meGustan = almacen.leer('me-gusta', {});
  meGustan[entradaActual] = !meGustan[entradaActual];
  almacen.guardar('me-gusta', meGustan);
  pintarMeGusta();
});

/* --- Comentarios --- */
function pintarComentarios() {
  const todos = almacen.leer('comentarios', {});
  const deEstaEntrada = todos[entradaActual] || [];
  listaComentarios.innerHTML = '';

  if (deEstaEntrada.length === 0) {
    const vacio = document.createElement('li');
    vacio.className = 'vacio';
    vacio.textContent = 'Aún no hay comentarios. Escribe el primero.';
    listaComentarios.append(vacio);
    return;
  }

  deEstaEntrada.forEach(c => {
    // Se usa textContent (no innerHTML) para que nadie pueda inyectar HTML en un comentario
    const li = document.createElement('li');
    const autor = document.createElement('span');
    autor.className = 'autor';
    autor.textContent = c.nombre;
    const fecha = document.createElement('span');
    fecha.className = 'fecha';
    fecha.textContent = new Date(c.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    const texto = document.createElement('p');
    texto.textContent = c.texto;
    li.append(autor, fecha, texto);
    listaComentarios.append(li);
  });
}

formComentario.addEventListener('submit', evento => {
  evento.preventDefault();
  const nombre = formComentario.nombre.value.trim();
  const texto = formComentario.texto.value.trim();

  if (!nombre || !texto) {
    errorComentario.textContent = !nombre ? 'Escribe tu nombre para publicar.' : 'El comentario está vacío.';
    (!nombre ? formComentario.nombre : formComentario.texto).focus();
    return;
  }

  const todos = almacen.leer('comentarios', {});
  todos[entradaActual] = todos[entradaActual] || [];
  todos[entradaActual].push({ nombre, texto, fecha: new Date().toISOString() });
  almacen.guardar('comentarios', todos);

  formComentario.texto.value = '';
  errorComentario.textContent = '';
  pintarComentarios();
});

/* =========================================================
   7. CALCULADORA DE VALOR ESPERADO (entrada 3)
   valor esperado = probabilidad × valor de la carta buena + valor del resto
   ========================================================= */
const calculadora = document.getElementById('calculadora');
const resultado = document.getElementById('resultado');

function calcular() {
  const num = id => Math.max(0, parseFloat(document.getElementById(id).value) || 0);
  const precio = num('precio-sobre');
  const prob = Math.min(100, num('prob-rara')) / 100;
  const valorEsperado = prob * num('valor-rara') + num('valor-resto');
  const diferencia = valorEsperado - precio;
  const euros = n => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  resultado.classList.toggle('pierde', diferencia < 0);
  resultado.classList.toggle('gana', diferencia >= 0);
  resultado.innerHTML = `Valor esperado por sobre: <strong>${euros(valorEsperado)}</strong><br>` +
    (diferencia < 0
      ? `De media pierdes ${euros(-diferencia)} por sobre. Mejor compra la carta suelta.`
      : `De media ganas ${euros(diferencia)} por sobre. Este set sí compensa abrirlo.`);
}

calculadora.addEventListener('input', calcular);
calculadora.addEventListener('submit', e => e.preventDefault());

/* ---------- Arranque ---------- */
aplicarTema(document.documentElement.dataset.tema === 'noche' ? 'noche' : 'dia');
calcular();
mostrarVista();
