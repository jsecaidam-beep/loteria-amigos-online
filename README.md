# Lotería entre amigos · online

## [▶ JUGAR AHORA](https://loteria-amigos-online.onrender.com/)

Crea una sala y comparte la invitación. GitHub Pages redirige al servidor del juego.

Repositorio: https://github.com/jsecaidam-beep/loteria-amigos-online

Juego web multijugador en español, con 54 cartas JPG locales, sala por código, host transferible y tablero 4×4 individual. Node.js 22 o posterior; no requiere paquetes externos.

## Jugar

1. Crear sala y compartir la invitación. Los demás entran con nombre y código.
2. El creador es host y puede pasar el control antes de comenzar o entre rondas. Si se desconecta entre partidas, otro jugador puede tomarlo.
3. El host elige tablero completo o línea y reparte. También juega con su propio tablero. En escritorio, la carta cantada ocupa la mitad del área de juego; en celular se apila sobre el tablero.
4. El host canta manualmente; todos reciben la misma carta mediante SSE. La voz es opcional y depende del navegador. Cada jugador toca sus cartas manualmente; cantar no marca ningún tablero y no se resaltan automáticamente las coincidencias. Si se le pasa una carta, queda sin marcar hasta que la toque. El servidor rechaza cartas todavía no cantadas.
5. Se evalúan parejas consecutivas (1–2, 3–4…). Si un jugador no tiene ninguna de las dos cartas, suma un shot opcional o punto. Tenerla pero no marcarla no causa penalización.
6. «¡Lotería!» valida el tablero o línea elegida. La primera reclamación válida termina la ronda; los demás reciben el aviso de fondo cuando está activo el modo fiesta.
7. El host inicia otra ronda. Recargar conserva identidad y tablero; SSE vuelve a conectar automáticamente.

Modo fiesta solo para adultos, opcional y con alternativa sin alcohol. Reconocer el aviso no verifica consumo real. Cada navegador mantiene su propia identidad; usar ventanas privadas o dispositivos distintos para varios jugadores.

## Ejecutar

```sh
npm start
```

Abre http://localhost:3000. Para pruebas:

```sh
npm run check
npm test
```

## Publicar para amigos

GitHub almacena el código; GitHub Pages por sí solo no ejecuta este servidor. Se necesita alojamiento Node.js con conexiones HTTP persistentes. Usa **una instancia** y almacenamiento persistente en `DATA_DIR`. No hay pagos, cuentas ni credenciales del proveedor incluidos.

Se incluyen Dockerfile y render.yaml. El ejemplo de Render usa el plan Free y no contrata disco. Puedes conectar este repositorio como Web Service con build `npm run check` y start `npm start`. En el plan gratuito, el servicio puede suspenderse tras 15 minutos sin peticiones y tarda alrededor de un minuto en volver; el archivo de partidas se pierde cuando el servicio reinicia, se redepliega o se suspende. Para partidas persistentes entre reinicios se requiere un disco o base de datos, que no se han contratado. Referencia: https://render.com/docs/free. También puedes alojar el contenedor en otro servicio con dominio HTTPS.

Variables: `PORT` (por defecto 3000), `DATA_DIR` (por defecto ./data), `NODE_ENV=production`. Un proxy HTTPS debe permitir SSE, desactivar buffering y enviar X-Forwarded-Proto=https. No escalar horizontalmente: las conexiones y salas se mantienen en una sola instancia.

## Estado y límites

La lógica e integración se prueban con conexiones HTTP independientes, validación de permisos, SSE, baraja completa y victoria. Las partidas se guardan en JSON con reemplazo atómico y sobreviven reinicios si el disco es persistente. Salas sin conexión caducan tras 24 horas sin actividad. Límite de 24 jugadores por sala. Durante una partida no se agregan jugadores nuevos, pero los participantes pueden reconectar. Si el host abandona durante una partida, se debe reconectar para continuar: no se reasigna automáticamente el control en pleno juego.

Servicio público desplegado en Render: https://loteria-amigos-online.onrender.com/. Se verificó la pantalla del host en navegador y la API multijugador por HTTPS. Las pruebas comprueban permisos, sincronización SSE, penalizaciones por parejas y reclamación del ganador. No se ha realizado una prueba de carga ni una prueba en dispositivos físicos iOS/Android.

## Cartas y referencias

Imágenes incluidas del proyecto https://github.com/jesus-barbosa/loteriamexicana. Su aviso MIT está en THIRD_PARTY_LICENSE.txt; procedencia exacta en ASSETS_SOURCE.md. El arte tradicional se identifica en el proyecto original como Don Clemente Gallo; no se aporta una licencia independiente del fabricante. Revisar derechos antes de explotación comercial. El motor y la interfaz multijugador fueron creados para esta versión.

Otras referencias consultadas: https://github.com/CIELO-la/loteria (juego multilingüe React) y https://github.com/Alca13/LoteriaCraft (generador de cartones).
