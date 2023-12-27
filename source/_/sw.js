importScripts(
  "/workbox/workbox-sw.js",
);

workbox.setConfig({
  "modulePathPrefix": "/workbox/",
  "debug": false,
});

workbox.routing.registerRoute(
  ({ request }) => request.destination === "document",
  new workbox.strategies.NetworkFirst(),
);

workbox.routing.registerRoute(
  ({ request }) => request.destination !== "document",
  new workbox.strategies.StaleWhileRevalidate(),
);

new workbox.recipes.offlineFallback({
  "pageFallback": "/offline/index.html",
});
