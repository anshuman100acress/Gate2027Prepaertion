# Gatewise on phones

Phones use a separate home screen and compact learning library, with Home, Learn, Practice, Notes and More in the bottom navigation. More opens a bottom sheet for PYQs, mocks, papers, premium tools, study planning, account settings and installation. Browser Back dismisses the sheet.

Lessons have a collapsed lesson navigator and contents list, plus sticky shortcuts to formulas, practice and personal notes. Practice filters open on demand. Mock question navigation collapses around the visible countdown. Buttons and answer cards have comfortable touch targets; input text avoids iOS zooming. Screen edges, standalone status bars, landscape layouts, timer placement and the on-screen keyboard receive mobile layouts.

## Install

On Android Chrome, use **Install Gatewise** in the app or **Install app** in the browser menu. On iPhone or iPad, open the site in Safari and choose **Share → Add to Home Screen**. Installation uses the standalone manifest, 192px/512px icons, a maskable icon and an Apple touch icon. Installed apps hide installation suggestions.

## Offline behavior

Visit a protected production build online once. The service worker saves the app shell, local math rendering assets, the public syllabus outline, three free lessons, ten sample questions and paper metadata. Notes and personal progress use the existing account-separated device storage. PDFs, paid lessons, paid question banks, authentication endpoints, Supabase responses and payment requests are excluded from the worker cache.

Offline startup supplies only the publishable build configuration and uses the free preview catalog. Paid access requires a fresh check when connected. Checkout requires a connection. The status banner also recognizes a cached startup when a browser reports an available network without working internet; it retries the public configuration when connectivity returns.

New builds change the worker cache version. An update banner lets a student choose when to reload. Updating blurs the active editor and saves progress first; it cannot reload during account loading or after a failed device save. Old Gatewise caches are removed on activation without touching other apps' caches.

## Building and checking

`npm run build` generates the worker from an exact public asset list and safe public configuration in **protected mode**. Raw authoring checkouts and open course builds do not install a worker. Keep the existing Supabase publishable variables and protected course configuration; payment secrets continue to belong only to the server environment.

Run `npm run check`, `npm run test:pwa` and `npm run test:release`. Serve the protected `dist` directory on localhost, then run `TEST_SITE_URL=http://127.0.0.1:3013/ python tests/mobile_ui.py`. The browser suite covers phone navigation, Back behavior, previews, notes, focus tools, installation, offline cold reloads, access gates and layouts from 320px through phone landscape. It also verifies the desktop workspace. Tests use Chromium with touch emulation; final platform installation and keyboard behavior can also be checked on a physical Android phone and iPhone.
