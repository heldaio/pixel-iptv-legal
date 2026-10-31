#!/bin/sh
#
# setup.sh — Pixel Server on Linux in one command (systemd, without Docker):
#
#   curl -fsSL https://<site>/setup.sh | sh
#
# Picks the tarball for this machine (amd64, arm64), checks its SHA-256,
# puts it in /opt/pixel-server with its own user (never root), turns the
# service on and says where the admin page is, with its setup code. Run
# again, it updates: the settings, the list, the paired devices and the
# recordings stay. Uninstall (the data stays in /var/lib/pixel-server):
#
#   curl -fsSL https://<site>/setup.sh | sh -s -- --uninstall
#
# The same steps as the README's «Linux without Docker». Published next to
# the tarballs (make-tarball.sh copies it to dist/) and as the site's
# setup.sh.
#
# DOWNLOADS: where the tarballs and their .sha256 are — set by
# make-tarball.sh from PIXEL_PUBLISH_URL; PIXEL_DOWNLOADS in the
# environment points elsewhere (a test server).
#
set -eu

VERSION=1.0
DOWNLOADS="${PIXEL_DOWNLOADS:-https://github.com/heldaio/pixel-iptv-legal/releases/download/server-1.0}"

PREFIX=/opt/pixel-server
ETC=/etc/pixel-server
UNIT=/etc/systemd/system/pixel-server.service
USER_NAME=pixelserver

# The whole script is read before anything runs (a download cut halfway
# through runs nothing): everything is in functions, called at the end.

case "${LC_ALL:-${LC_MESSAGES:-${LANG:-}}}" in pt*) PT=1 ;; *) PT= ;; esac
say() { if [ -n "$PT" ]; then printf '%s\n' "$1"; else printf '%s\n' "$2"; fi; }
fail() { say "Erro: $1" "Error: $2" >&2; exit 1; }

as_root() {
    if [ "$(id -u)" = 0 ]; then "$@"; else sudo "$@"; fi
}

fetch() { # url file
    if command -v curl >/dev/null 2>&1; then curl -fsSL -o "$2" "$1"
    elif command -v wget >/dev/null 2>&1; then wget -q -O "$2" "$1"
    else fail "é preciso o curl ou o wget." "curl or wget is needed."; fi
}

checks() {
    [ "$(uname -s)" = Linux ] || fail "este script é para Linux. No Mac usa a app; no Windows, o instalador." \
        "this script is for Linux. On a Mac use the app; on Windows, the installer."
    [ -d /run/systemd/system ] || fail "este Linux não usa o systemd. Usa a versão Docker (página do Pixel Server)." \
        "this Linux does not run systemd. Use the Docker version (Pixel Server's page)."
    case "$(uname -m)" in
        x86_64|amd64) ARCH=amd64 ;;
        aarch64|arm64) ARCH=arm64 ;;
        *) fail "processador $(uname -m) não suportado (só amd64 e arm64 de 64 bits)." \
                "processor $(uname -m) not supported (64-bit amd64 and arm64 only)." ;;
    esac
    if [ "$(id -u)" != 0 ] && ! command -v sudo >/dev/null 2>&1; then
        fail "corre-o como root ou instala o sudo." "run it as root or install sudo."
    fi
    for tool in tar sha256sum; do
        command -v "$tool" >/dev/null 2>&1 || fail "falta o $tool." "$tool is missing."
    done
    [ -n "$DOWNLOADS" ] || fail "o Pixel Server para Linux ainda não está publicado." \
        "Pixel Server for Linux is not published yet."
}

install_server() {
    NAME="pixel-server-$VERSION-linux-$ARCH"
    WORK=$(mktemp -d)
    trap 'rm -rf "$WORK"' EXIT INT TERM

    say "A descarregar o Pixel Server $VERSION ($ARCH)…" "Downloading Pixel Server $VERSION ($ARCH)…"
    fetch "$DOWNLOADS/$NAME.tar.gz" "$WORK/$NAME.tar.gz" || fail "não foi possível descarregar $NAME.tar.gz." "could not download $NAME.tar.gz."
    fetch "$DOWNLOADS/$NAME.tar.gz.sha256" "$WORK/$NAME.tar.gz.sha256" || fail "não foi possível descarregar o SHA-256." "could not download the SHA-256."
    (cd "$WORK" && sha256sum -c "$NAME.tar.gz.sha256" >/dev/null 2>&1) \
        || fail "o ficheiro descarregado não confere com o SHA-256. Nada foi instalado." \
                "the download does not match its SHA-256. Nothing was installed."
    tar -C "$WORK" -xzf "$WORK/$NAME.tar.gz"
    [ -x "$WORK/$NAME/pixel-server" ] || fail "o pacote não traz o pixel-server." "the package has no pixel-server."

    say "A instalar (o sudo pode pedir a tua palavra-passe)…" "Installing (sudo may ask for your password)…"
    UPDATE=
    [ -x "$PREFIX/pixel-server" ] && UPDATE=1

    # The unit: replaced unless it was changed by hand (it is then kept,
    # and the new one is left next to the program to compare).
    NEW_UNIT=1
    if [ -f "$UNIT" ] && ! as_root cmp -s "$UNIT" "$PREFIX/pixel-server.service" 2>/dev/null; then NEW_UNIT=; fi

    # Stopped before its files are replaced: the recordings end cleanly
    # and carry on at the next start.
    [ -n "$UPDATE" ] && as_root systemctl stop pixel-server 2>/dev/null || true

    as_root mkdir -p "$PREFIX" "$ETC"
    as_root rm -rf "$PREFIX.new"
    as_root cp -R "$WORK/$NAME" "$PREFIX.new"
    as_root chown -R root:root "$PREFIX.new"
    as_root rm -rf "$PREFIX"
    as_root mv "$PREFIX.new" "$PREFIX"

    if ! getent passwd "$USER_NAME" >/dev/null 2>&1; then
        NOLOGIN=/usr/sbin/nologin
        [ -x "$NOLOGIN" ] || NOLOGIN=/sbin/nologin
        as_root useradd --system --home-dir /var/lib/pixel-server --shell "$NOLOGIN" "$USER_NAME"
    fi
    # The settings: only the first time (they can hold the admin password).
    if ! as_root test -f "$ETC/pixel-server.env"; then
        as_root install -m 600 -o root -g root "$PREFIX/pixel-server.env" "$ETC/"
    fi
    if [ -n "$NEW_UNIT" ]; then
        as_root cp "$PREFIX/pixel-server.service" "$UNIT"
    else
        say "Aviso: mantive o teu $UNIT (foi alterado). O novo está em $PREFIX/pixel-server.service." \
            "Note: kept your $UNIT (it was changed). The new one is in $PREFIX/pixel-server.service."
    fi
    as_root systemctl daemon-reload
    as_root systemctl enable pixel-server >/dev/null 2>&1
    as_root systemctl restart pixel-server
}

report() {
    # The admin page's line, once the server has said it.
    LINE=
    i=0
    while [ $i -lt 20 ]; do
        LINE=$(as_root journalctl -u pixel-server -n 200 --no-pager -o cat 2>/dev/null | grep 'admin page: http' | tail -n 1 || true)
        [ -n "$LINE" ] && break
        if ! as_root systemctl is-active --quiet pixel-server; then break; fi
        sleep 1; i=$((i + 1))
    done
    echo
    if ! as_root systemctl is-active --quiet pixel-server; then
        say "O Pixel Server não arrancou. Vê porquê com: journalctl -u pixel-server" \
            "Pixel Server did not start. See why with: journalctl -u pixel-server"
        exit 1
    fi
    if [ -n "$UPDATE" ]; then
        say "Pixel Server $VERSION atualizado e a correr." "Pixel Server $VERSION updated and running."
    else
        say "Pixel Server $VERSION instalado e a correr." "Pixel Server $VERSION installed and running."
    fi
    URL=$(printf '%s\n' "$LINE" | sed -n 's/.*admin page: \(http[^ ]*\).*/\1/p')
    CODE=$(printf '%s\n' "$LINE" | sed -n 's/.*setup code \([^ ]*\).*/\1/p')
    PORT=$(printf '%s\n' "$URL" | sed -n 's|.*:\([0-9][0-9]*\)/admin.*|\1|p')
    PORT=${PORT:-8790}
    if [ -n "$URL" ]; then
        say "  Página de gestão: $URL" "  Admin page: $URL"
    fi
    if [ -n "$CODE" ]; then
        say "  Código de configuração: $CODE  (abre a página, escreve-o e escolhe uma palavra-passe)" \
            "  Setup code: $CODE  (open the page, type it and choose a password)"
    fi
    say "  Na Pixel IPTV: Definições → Gravação → Pixel Server → «Emparelhar»." \
        "  In Pixel IPTV: Settings → Recording → Pixel Server → “Pair”."
    say "  Definições: $ETC/pixel-server.env · Gravações: /var/lib/pixel-server · Registo: journalctl -u pixel-server" \
        "  Settings: $ETC/pixel-server.env · Recordings: /var/lib/pixel-server · Log: journalctl -u pixel-server"
    # A firewall on: the app cannot reach the server until it lets it in.
    if command -v ufw >/dev/null 2>&1 && as_root ufw status 2>/dev/null | grep -q '^Status: active'; then
        say "  A firewall (ufw) está ligada. Para a app chegar ao servidor: sudo ufw allow $PORT/tcp && sudo ufw allow 5353/udp" \
            "  The firewall (ufw) is on. For the app to reach the server: sudo ufw allow $PORT/tcp && sudo ufw allow 5353/udp"
    elif command -v firewall-cmd >/dev/null 2>&1 && as_root firewall-cmd --state >/dev/null 2>&1; then
        say "  A firewall (firewalld) está ligada. Para a app chegar ao servidor: sudo firewall-cmd --permanent --add-port=$PORT/tcp --add-service=mdns && sudo firewall-cmd --reload" \
            "  The firewall (firewalld) is on. For the app to reach the server: sudo firewall-cmd --permanent --add-port=$PORT/tcp --add-service=mdns && sudo firewall-cmd --reload"
    fi
}

uninstall() {
    say "A remover o Pixel Server (o sudo pode pedir a tua palavra-passe)…" "Removing Pixel Server (sudo may ask for your password)…"
    as_root systemctl disable --now pixel-server 2>/dev/null || true
    as_root rm -f "$UNIT"
    as_root systemctl daemon-reload
    as_root rm -rf "$PREFIX"
    say "Removido. Ficaram as gravações e os dados em /var/lib/pixel-server e as definições em $ETC (apaga-os à mão se não os quiseres)." \
        "Removed. The recordings and data stay in /var/lib/pixel-server and the settings in $ETC (delete them by hand if you don't want them)."
}

main() {
    case "${1:-}" in
        --uninstall) uninstall ;;
        "") checks; install_server; report ;;
        *) fail "opção desconhecida: $1 (só --uninstall)." "unknown option: $1 (only --uninstall)." ;;
    esac
}

main "$@"
