# La Carpeta de Manduq

Blog personal sobre coleccionismo de cartas Pokémon TCG. Actividad 1 de *Desarrollo de aplicaciones en red* (UNIR, 2026).

**Web:** https://manduq.github.io/blog-pokemon-tcg/

## Estructura

```
index.html          Estructura: cabecera, portada, "Sobre mí" y contenedores vacíos
data/entradas.json  Contenido de las entradas (se carga por AJAX)
css/styles.css      Estilos, tema día/noche y diseño responsive
js/app.js           Navegación por secciones, filtros, me gusta, comentarios y calculadora
img/                Ilustraciones originales en SVG
```

## Funcionalidades

- Entradas cargadas por AJAX: `fetch('data/entradas.json')` trae el contenido y JavaScript crea las cartas, el menú y las secciones. Si la petición falla, se muestra un aviso.
- Página única (single page): el menú muestra u oculta cada sección según el `#hash` de la URL, así funcionan los botones atrás/adelante del navegador.
- Inicio con forma de hoja de carpeta de coleccionista: cada entrada es una carta, y su símbolo de rareza indica el nivel.
- Buscador en la portada (busca en título y texto, sin importar tildes) combinado con el filtro por nivel.
- Modo día / noche que se recuerda entre visitas (`localStorage`).
- Tiempo de lectura calculado y barra de progreso al leer.
- "Me gusta" y comentarios por entrada, guardados en el navegador.
- Calculadora de valor esperado de un sobre (entrada 3).
- Test "¿Qué tipo de coleccionista eres?" con tres preguntas (entrada 5).
- Menú adaptado a móvil, foco visible con teclado y respeto a `prefers-reduced-motion`.

## Ejecutar en local

Servir la carpeta con `python -m http.server` y abrir http://localhost:8000. Abriendo `index.html` directamente (file://) el navegador bloquea la petición AJAX.
