# Pixel IPTV — website, v4

Fourth version of the Pixel IPTV site, kept beside `web/` (v1), `web-v2/` and
`web-v3/` so they can be compared. It starts from v3 — same identity
(near-black, green as light, dark first with a light theme), same page set,
same file names, same bilingual mechanism — and takes its pacing from the
way Apple presents its TV app: fewer, larger chapters, one idea each, a tiny
product name over a big promise, a screen that stays put while the copy
moves, rows that play once, one dark band, numbered notes. Only the ideas:
copy, palette, icons, bezels and images are Pixel's own. Plain HTML, CSS and
JS, no build step, no frameworks, no external requests at runtime (system
fonts, inline SVG, local images; the only outside links are to the App Store
and blender.org in the credits).

It presents version 2.5 (Skip Intro, subtitles, Dolby and frame-rate matching
on Apple TV, Pixel Server recording) and must go live only when 2.5 is on
sale.

## Pages

- `index.html` — hero (Apple TV with the iPad and iPhone in front of its lower corners, as in v3; the iPhone alone on phones), the iPad story
  (Channels, Guide, Multiview, Favourites change as you scroll), the player
  shelf, Continue Watching and the Video Club, the Apple TV band
  (always dark), every screen + the Pixel Server diagram, «E ainda», Free vs
  Pro table, FAQ, closing steps and tiles, numbered notes.
  Old anchors still work: `#funcionalidades`, `#apple-tv`, `#precos`,
  `#perguntas`, `#pixel-server`, `#aparelhos`, `#como-funciona`, `#tudo`.
- `server.html` — Pixel Server: hero with the admin page, how it works,
  downloads (`#macos`, `#windows`, `#docker`, `#linux`), setup per system
  (`#instalar-mac`, `#instalar-windows`, `#instalar-linux`), good to know,
  licences.
- `support.html` — FAQ by topic with search, now with 2.5 entries, and contact.
- `privacy.html`, `terms.html` — the legal text, byte for byte the same as
  v3; only header and footer changed.
- `404.html` — links resolve from `<base href="/">`; on a sub-path host change
  that one line.
- `licenses/`, `demo.m3u`, `_shared.css`, favicons — copied from v3 unchanged.

## Languages and theme

Every page carries both languages (`lang="pt-PT"` / `lang="en"` elements; CSS
shows the one matching `<html lang>`). Language: `?lang=pt|en`, then the PT/EN
switch (saved as `pixel-iptv-lang`), then the browser.

Dark first. Light follows the system; `?theme=light|dark` forces one for that
visit, and the sun/moon button saves a choice (`pixel-iptv-theme`). The Apple
TV band stays dark in both themes. Below 480 px the language and theme
switches move into the menu.

## Before publishing

1. **Launch day** — publish together with 2.5 on the App Store (JSON-LD says
   `softwareVersion` 2.5; server.html no longer says «em breve»).
2. **Downloads** — fill `window.PIXEL_SITE` at the top of `assets/site.js`
   (`url`, `size`, `sha256` per file, and `dockerImage`). A button stays
   disabled («Em breve» / "Coming soon") until its `url` is set.
   **Linux in one command**: build the tarballs with
   `PIXEL_PUBLISH_URL=<the folder they go in> PixelServer/Docker/make-tarball.sh`
   and copy its `dist/setup.sh` next to `server.html`.
3. **Address** — canonical, Open Graph and JSON-LD URLs use
   `https://www.pixeliptv.pt/`.
4. **Prices** — 1,99 € / 12,99 € / 49,99 € (Portuguese store).
5. **Wording to confirm** — the iCloud line (note 6) against `privacy.html`.

## Images

Same files as v3, nothing new. `assets/img/{pt,en}/` are the screenshots
taken 2026-10-20 from branch 2.5-pixel-server with a fictional demo catalogue
(invented channel brands and programme titles, frames from Blender Foundation
open movies, CC BY, credited in every footer). No real broadcaster, logo or
playlist appears. WebP with a JPEG fallback, two widths. v4 now also uses
`ipad-favorites`, `crop-continue` (the Continue Watching row) and the invented
logos in `assets/img/logos/` (the Apple TV band's river — dark only, their
wordmarks are partly white). Not used on index: `tv-channels`,
`iphone-channels`, `iphone-multiview`. The iPhone Home has no Library button;
the Pixel Server captures show port 8791 (the server uses 8790) — recapture
before launch if possible.

New on 2026-10-31:
- `tv-home`, `tv-guide`, `tv-channels` re-shot from the current sidebar tvOS app
  (dedicated simulator «WebShots TV», fictional catalogue, Blender frames).
- `iphone-player-guide-row` (player in landscape with the Guide row; Sintel
  frame, fictional channel «Elderwyn») replaces `iphone-player-guide` in the
  player carousel.
- The Pixel Server admin captures are all in the light theme now (the
  Portuguese ones were dark).
- The «Novo na 2.5» section was removed at the owner's request; the footer
  reads «© HDAIO».

## Motion and accessibility

Nothing moves without permission: every animated state exists only with JS
and when the system allows motion. Headlines fade up once; the iPad story
cross-fades its screen; the Continue Watching row steps three times and
offers «Repetir»; the Skip Intro pill slides in once; the logo river drifts
with a pause button and stops off-screen, on hover and on focus; devices rise
slightly where the browser supports scroll timelines. With "reduce motion"
the story stacks, the rows become scrollable, the river starts paused.
Screens cast a soft light of their own picture (blurred copy, no extra
request). Every image has a Portuguese and an English description; the
shelf, story, row and river are keyboard reachable; fine print lives in
numbered notes with links back to the text.

## Hosting — www.pixeliptv.pt

The site lives at **https://www.pixeliptv.pt/** (canonical, Open Graph, JSON-LD
and the Pixel Server `setup.sh` command all use it). On GitHub Pages: copy this
folder to the Pages repository root (the `CNAME` file holds the domain), set the
custom domain in the repository's Pages settings and turn on «Enforce HTTPS»;
at the DNS provider point `www` (CNAME record) to `<user>.github.io` and send the
bare `pixeliptv.pt` to `www`. Pages serves `404.html` for missing pages by itself
(its `<base href="/">` already fits a domain root). Add an empty `.nojekyll`.

The app (2.4 on sale, and the 2.5 branch) still links Terms and Privacy to
`https://heldaio.github.io/pixel-iptv-legal/`, as do the App Store Connect
texts in `docs/`: keep that address working (or redirecting) until the app and
the store listing point here.
