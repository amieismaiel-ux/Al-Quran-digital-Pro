const CACHE_NAME = "alquran-digital-v4";

const APP_FILES = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];


/* INSTALL */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches.open(CACHE_NAME)
        .then(cache =>
          cache.addAll(APP_FILES)
        )

    );

    self.skipWaiting();

  }
);


/* ACTIVATE */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches.keys()
        .then(keys =>

          Promise.all(

            keys
              .filter(
                key =>
                  key !== CACHE_NAME
              )
              .map(
                key =>
                  caches.delete(key)
              )
          )

        )

    );

    self.clients.claim();

  }
);


/* FETCH */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;


    /*
     * Untuk fail aplikasi:
     * cuba cache dahulu.
     */

    if (
      request.method !== "GET"
    ) {

      return;

    }


    event.respondWith(

      caches.match(request)
        .then(cached => {

          if (cached) {

            return cached;

          }


          return fetch(request)
            .then(response => {

              /*
               * Simpan response yang berjaya
               */

              if (
                response &&
                response.status === 200
              ) {

                const copy =
                  response.clone();


                caches.open(
                  CACHE_NAME
                ).then(
                  cache =>
                    cache.put(
                      request,
                      copy
                    )
                );

              }


              return response;

            });

        })
        .catch(() => {

          /*
           * Jika offline dan
           * tiada cache.
           */

          return caches.match(
            "/index.html"
          );

        })

    );

  }
);
