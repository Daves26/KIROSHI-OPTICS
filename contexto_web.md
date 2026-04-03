# Contexto del Proyecto: KIROSHI OPTICS

## 📌 Descripción General
**KIROSHI OPTICS** es una aplicación web responsiva e interactiva destinada a ser un catálogo y reproductor de películas y series (estilo Netflix / Apple TV). Se destaca por una interfaz espectacular y minimalista.

## 🎨 Diseño y UI/UX (CSS)
- **Estilo:** Dark mode inmersivo apoyado fuertemente por una estética "Liquid Glass" (Glassmorfismo) con bordes translúcidos y fondos borrosos.
- **Efectos Ambientales:** Presenta orbes flotantes desenfocados en el fondo (`.bg-orbs`) de colores fucsia y púrpura para añadir profundidad.
- **Tipografía:** Combinación de fuentes premium modernas como `Instrument Serif` (títulos y display) y `DM Sans` (interfaz regular).
- **Animaciones:** Tarjetas interactivas que crecen, arrojan un resplandor ("glow") al hacer hover, rotaciones suaves del contenido publicitario y cargas perezosas sin cortes bruscos.

## 🛠 Stack Tecnológico y Arquitectura (HTML/JS)
- **Frontend Puro:** Construido usando Vanilla JavaScript (como un módulo de ES), puro CSS3 y HTML5 sin frameworks visuales (no usa React ni Tailwind explícitos para el diseño del cliente). Requiere de empaquetadores estilo **Vite** para inyectar su token.
- **Navegación tipo SPA (Single Page Application):** Todo ocurre en `index.html`. El archivo `app.js` maneja un sistema de vistas ocultando y mostrando bloques contenedores (`#homeView`, `#detailView`, `#episodesView`, `#playerView`).
- **Funcionalidad de Búsqueda:** Buscador avanzado integrado que consulta contenido en vivo con un botón para limpiar el texto y botón "Load more" en los resultados. 

## 🔗 Integraciones de API y Datos Externos
- **The Movie Database (TMDB):** Consume la API v3 oficial de TMDB con una **Authorization Bearer** extraída desde las variables de entorno (`import.meta.env.VITE_TMDB_ACCESS_TOKEN`). Esto provee al sitio de carátulas (`IMG_BASE`), descripciones, puntuaciones y colecciones en tiempo real (tendencias de hoy, populares, géneros, etc).
- **Reproducción Integrada:** Utiliza una API de embeds en `iframe` (por ahora mapeada a urls como `moviesapi.to/tv` y `moviesapi.to/movie`) permitiendo incrustar el video directamente según la id del contenido, número de temporada y número de capítulo.
