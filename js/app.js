/* =========================================================
   La Carpeta de Manduq — lógica del blog (JavaScript sin librerías)
   0. Carga de las entradas por AJAX (fetch de data/entradas.json)
   1. Navegación por secciones (single page con #hash)
   2. Modo día / noche
   3. Menú móvil
   4. Filtro de entradas por nivel
   5. Tiempo de lectura y barra de progreso
   6. "Me gusta" y comentarios (guardados en localStorage)
   7. Calculadora de valor esperado
   ========================================================= */

// Lista de entradas: se rellena al cargar data/entradas.json (orden cronológico)
let ENTRADAS = [];

// Cómo se muestra cada nivel: igual que la rareza de una carta
const NIVELES = {
  comun:       { simbolo: '●', texto: 'Para empezar' },
  infrecuente: { simbolo: '◆', texto: 'Intermedio' },
  rara:        { simbolo: '★', texto: 'Avanzado' }
};
const FUNDAS_POR_HOJA = 9;

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
   0. CARGA DE ENTRADAS POR AJAX
   El contenido de las entradas no está en index.html: se pide al
   servidor el fichero data/entradas.json con fetch() y, con los datos
   recibidos, se crean las cartas de la portada, los enlaces del menú
   y una sección <article> por entrada.
   ========================================================= */
const fechaLarga = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const fechaCorta = iso => new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

async function cargarEntradas() {
  const lista = document.getElementById('fundas');
  try {
    const respuesta = await fetch('data/entradas.json', { cache: 'no-cache' }); // no-cache: pregunta siempre al servidor si hay una versión nueva
    if (!respuesta.ok) throw new Error(`El servidor respondió ${respuesta.status}`);
    ENTRADAS = await respuesta.json();

    pintarMenu();
    pintarCartas();
    pintarArticulos();
    calcularTiempoLectura();
    iniciarCalculadora();

    document.getElementById('nota-filtro').textContent =
      `${ENTRADAS.length} entradas. Los huecos libres se irán llenando.`;
  } catch (error) {
    console.error('No se pudieron cargar las entradas:', error);
    document.getElementById('nota-filtro').textContent =
      'No se han podido cargar las entradas. Recarga la página; si abres el blog en local, usa un servidor (python -m http.server).';
  } finally {
    lista.removeAttribute('aria-busy');
    mostrarVista(); // vuelve a mostrar la vista del #hash ahora que existen las entradas
  }
}

// Un enlace por entrada en el menú, entre "Inicio" y "Sobre mí"
function pintarMenu() {
  const sobreMi = nav.querySelector('[data-ruta="sobre-mi"]');
  ENTRADAS.forEach(e => {
    const a = document.createElement('a');
    a.href = `#${e.id}`;
    a.dataset.ruta = e.id;
    a.textContent = e.menu;
    nav.insertBefore(a, sobreMi);
  });
}

// Una carta por entrada (la más reciente primero) y el resto de la hoja con fundas vacías
function pintarCartas() {
  const lista = document.getElementById('fundas');
  lista.innerHTML = '';
  const recientes = [...ENTRADAS].reverse();

  recientes.forEach(e => {
    const nivel = NIVELES[e.nivel];
    const li = document.createElement('li');
    li.className = 'funda';
    li.dataset.nivel = e.nivel;
    li.innerHTML = `
      <a class="carta${e.nivel === 'rara' ? ' carta-holo' : ''}" href="#${e.id}">
        <span class="carta-arte"><img src="${e.portada}" alt="" width="240" height="240"></span>
        <span class="carta-nombre"></span>
        <span class="carta-pie"><span>${fechaCorta(e.fecha)}</span><b class="simbolo" title="Nivel: ${nivel.texto.toLowerCase()}">${nivel.simbolo}</b></span>
      </a>`;
    li.querySelector('.carta-nombre').textContent = e.titulo;
    lista.append(li);
  });

  for (let i = recientes.length; i < FUNDAS_POR_HOJA; i++) {
    const vacia = document.createElement('li');
    vacia.className = 'funda funda-vacia';
    vacia.setAttribute('aria-hidden', 'true');
    lista.append(vacia);
  }
}

// Una sección <article> por entrada, oculta hasta que se navega a ella
function pintarArticulos() {
  const contenedor = document.getElementById('contenedor-entradas');
  ENTRADAS.forEach(e => {
    const nivel = NIVELES[e.nivel];
    const articulo = document.createElement('article');
    articulo.className = 'vista entrada';
    articulo.id = `vista-${e.id}`;
    articulo.dataset.vista = e.id;
    articulo.dataset.id = e.id;
    articulo.hidden = true;
    // El cuerpo es HTML escrito por mí en el JSON (contenido de confianza), por eso se usa innerHTML
    articulo.innerHTML = `
      <header class="entrada-cabecera">
        <p class="entrada-meta"><b class="simbolo">${nivel.simbolo}</b> ${nivel.texto} <span>${fechaLarga(e.fecha)}</span> <span class="tiempo-lectura"></span></p>
        <h1>${e.titulo}</h1>
        <p class="entrada-entradilla">${e.entradilla}</p>
      </header>
      ${e.cuerpo}`;
    contenedor.append(articulo);
  });
}

/* =========================================================
   1. NAVEGACIÓN: muestra solo la sección que indica el #hash
   ========================================================= */
function mostrarVista() {
  const ruta = location.hash.replace('#', '') || 'inicio';
  let vistaActiva = document.querySelector(`.vista[data-vista="${ruta}"]`);

  // Si el hash no corresponde a ninguna vista (p. ej. #contenido), mostramos el inicio
  if (!vistaActiva) vistaActiva = document.getElementById('vista-inicio');

  // Se consultan en cada llamada porque las entradas se añaden después de cargar el JSON
  document.querySelectorAll('.vista').forEach(v => { v.hidden = v !== vistaActiva; });

  // Marca en el menú la sección actual
  nav.querySelectorAll('a').forEach(a => {
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
    // Se buscan en cada clic porque las cartas se crean tras cargar el JSON
    document.querySelectorAll('.funda[data-nivel]').forEach(funda => {
      const coincide = filtro === 'todas' || funda.dataset.nivel === filtro;
      funda.classList.toggle('oculta', !coincide);
      funda.querySelector('.carta').tabIndex = coincide ? 0 : -1;
      if (coincide) visibles++;
    });

    notaFiltro.textContent = filtro === 'todas'
      ? `${ENTRADAS.length} entradas. Los huecos libres se irán llenando.`
      : `${visibles} ${visibles === 1 ? 'entrada' : 'entradas'} de este nivel.`;
  });
});

/* =========================================================
   5. TIEMPO DE LECTURA Y BARRA DE PROGRESO
   ========================================================= */
function calcularTiempoLectura() {
  document.querySelectorAll('.entrada').forEach(entrada => {
    const palabras = entrada.textContent.trim().split(/\s+/).length;
    const minutos = Math.max(1, Math.round(palabras / 200)); // ~200 palabras por minuto
    entrada.querySelector('.tiempo-lectura').textContent = `${minutos} min de lectura`;
  });
}

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
function calcular() {
  const resultado = document.getElementById('resultado');
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

// La calculadora llega dentro del JSON, así que se activa después de pintar las entradas
function iniciarCalculadora() {
  const calculadora = document.getElementById('calculadora');
  if (!calculadora) return;
  calculadora.addEventListener('input', calcular);
  calculadora.addEventListener('submit', e => e.preventDefault());
  calcular();
}

/* ---------- Arranque ---------- */
aplicarTema(document.documentElement.dataset.tema === 'noche' ? 'noche' : 'dia');
mostrarVista();    // muestra la portada (o la vista del #hash) mientras llegan los datos
cargarEntradas();  // petición AJAX
