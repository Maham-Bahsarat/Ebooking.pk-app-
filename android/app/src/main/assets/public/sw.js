/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "44f4678ed17e5521f2dee9c01fe6afee"
  }, {
    "url": "pwa-512x512.png",
    "revision": "5f8adf7443afdfa395ba32a2a60226fe"
  }, {
    "url": "pwa-192x192.png",
    "revision": "02aad20416563a9c23b6ac07745536b2"
  }, {
    "url": "index.html",
    "revision": "d6bc000e427e158c135e0e73b9e3cd94"
  }, {
    "url": "icon.svg",
    "revision": "cad5589a80742ab8d0a5fab5e11a0647"
  }, {
    "url": "favicon.ico",
    "revision": "157189136eaa87b3a191123cde797dc6"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "8a6e7ef52f37db6712fdccde10ffcbde"
  }, {
    "url": "src/assets/images/hero_aviation_sky_1795379949944.jpg",
    "revision": "c12a17b7bce8e1e228cd9b00fd31bfd7"
  }, {
    "url": "src/assets/images/dest_makkah_umrah_1795379950949.jpg",
    "revision": "25fc2f7e2e02903340446c306e64a2ea"
  }, {
    "url": "src/assets/images/dest_istanbul_bosphorus_1795379951077.jpg",
    "revision": "45cdace7164e56954744e7d8edd8bea8"
  }, {
    "url": "src/assets/images/dest_dubai_skyline_1795379949792.jpg",
    "revision": "334ffdf36b62357a025faf4174d1bf54"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-EFVC_Qsk.js",
    "revision": null
  }, {
    "url": "assets/index-B_XlWsaw.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "8a6e7ef52f37db6712fdccde10ffcbde"
  }, {
    "url": "favicon.ico",
    "revision": "157189136eaa87b3a191123cde797dc6"
  }, {
    "url": "icon.svg",
    "revision": "cad5589a80742ab8d0a5fab5e11a0647"
  }, {
    "url": "pwa-192x192.png",
    "revision": "02aad20416563a9c23b6ac07745536b2"
  }, {
    "url": "pwa-512x512.png",
    "revision": "5f8adf7443afdfa395ba32a2a60226fe"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "44f4678ed17e5521f2dee9c01fe6afee"
  }, {
    "url": "manifest.webmanifest",
    "revision": "8effe41fcc996d7065fd96ffab015d05"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
