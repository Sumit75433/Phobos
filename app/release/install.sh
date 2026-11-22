#!/bin/sh
set -eu

REPOSITORY="${PHOBOS_REPOSITORY:-miuuyy/Octopus-SI-OS}"
VERSION="${PHOBOS_VERSION:-}"
INSTALL_DIR="${PHOBOS_APPLICATIONS_DIR:-}"

fail() {
  printf '%s\n' "$*" >&2
  exit 1
}

[ "$(uname -s)" = "Darwin" ] || fail "Phobos is released for macOS only."
case "$(uname -m)" in
  arm64) ARCH="arm64" ;;
  x86_64)
    if [ "$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then ARCH="arm64"; else ARCH="x64"; fi
    ;;
  *) fail "Unsupported Mac architecture: $(uname -m)" ;;
esac
MACOS_VERSION="$(sw_vers -productVersion)"
[ "${MACOS_VERSION%%.*}" -ge 14 ] || fail "Phobos needs macOS 14 or later; this Mac runs macOS $MACOS_VERSION."
xcode-select -p >/dev/null 2>&1 || fail "Phobos needs the Command Line Tools for Xcode, which provide python3 and git.
Install them with:  xcode-select --install
Then run this installer again."

printf '%s\n' "$REPOSITORY" | grep -Eq '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' || fail "Invalid GitHub repository: $REPOSITORY"
if [ -z "$VERSION" ]; then
  LATEST="$(curl -fsSLI --retry 3 --connect-timeout 15 --max-time 60 -o /dev/null -w '%{url_effective}' \
    "https://github.com/$REPOSITORY/releases/latest")" || fail "Could not reach the releases of $REPOSITORY."
  VERSION="${LATEST##*/tag/}"
  [ "$VERSION" != "$LATEST" ] || fail "Could not resolve the latest Phobos release of $REPOSITORY."
fi
VERSION="${VERSION#v}"
case "$VERSION" in
  ''|*[!0-9.]*) fail "Invalid Phobos release version: $VERSION" ;;
esac

ASSET="Phobos-$VERSION-macos-$ARCH.dmg"
BASE_URL="${PHOBOS_RELEASE_BASE_URL:-https://github.com/$REPOSITORY/releases/download/v$VERSION}"
TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/phobos-install.XXXXXX")"
MOUNT_DIR="$TEMP_DIR/volume"
MOUNTED=""
STAGE_APP=""
cleanup() {
  if [ -n "$MOUNTED" ]; then hdiutil detach -quiet "$MOUNT_DIR" || hdiutil detach -quiet -force "$MOUNT_DIR" || true; fi
  if [ -n "$STAGE_APP" ] && [ -e "$STAGE_APP" ]; then rm -rf "$STAGE_APP"; fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT
trap 'exit 1' HUP INT TERM

curl -fsSL --retry 3 --connect-timeout 15 --max-time 60 "$BASE_URL/checksums.txt" -o "$TEMP_DIR/checksums.txt" \
  || fail "Could not download the checksums of Phobos $VERSION."
EXPECTED="$(awk -v asset="$ASSET" '$2 == asset { print $1 }' "$TEMP_DIR/checksums.txt")"
[ -n "$EXPECTED" ] || fail "Release $VERSION has no $ASSET. See https://github.com/$REPOSITORY/releases/tag/v$VERSION"
printf 'Downloading %s\n' "$ASSET"
curl -fL --retry 3 --connect-timeout 15 --max-time 3600 "$BASE_URL/$ASSET" -o "$TEMP_DIR/$ASSET" \
  || fail "Could not download $ASSET."
ACTUAL="$(shasum -a 256 "$TEMP_DIR/$ASSET" | awk '{ print $1 }')"
[ "$ACTUAL" = "$EXPECTED" ] || fail "SHA-256 verification failed for $ASSET."

mkdir "$MOUNT_DIR"
hdiutil attach -quiet -nobrowse -readonly -noautoopen -mountpoint "$MOUNT_DIR" "$TEMP_DIR/$ASSET"
MOUNTED="yes"
SOURCE_APP="$MOUNT_DIR/Phobos.app"
[ -x "$SOURCE_APP/Contents/MacOS/Phobos" ] || fail "The disk image does not contain Phobos.app."

if [ -z "$INSTALL_DIR" ]; then
  INSTALL_DIR="/Applications"
  if [ ! -w "$INSTALL_DIR" ]; then
    INSTALL_DIR="$HOME/Applications"
    mkdir -p "$INSTALL_DIR"
  fi
fi
[ -d "$INSTALL_DIR" ] && [ -w "$INSTALL_DIR" ] || fail "Cannot write to $INSTALL_DIR."
TARGET_APP="$INSTALL_DIR/Phobos.app"
if pgrep -f "$TARGET_APP/Contents/" >/dev/null 2>&1; then
  fail "Quit Phobos and stop its runtime before updating it."
fi

STAGE_APP="$INSTALL_DIR/.Phobos.app.installing.$$"
printf 'Copying Phobos.app to %s\n' "$INSTALL_DIR"
ditto "$SOURCE_APP" "$STAGE_APP"
if [ -e "$TARGET_APP" ]; then
  PREVIOUS_APP="$TEMP_DIR/Phobos.previous.app"
  mv "$TARGET_APP" "$PREVIOUS_APP"
  if ! mv "$STAGE_APP" "$TARGET_APP"; then
    mv "$PREVIOUS_APP" "$TARGET_APP"
    fail "Could not replace $TARGET_APP; the previous version was kept."
  fi
else
  mv "$STAGE_APP" "$TARGET_APP"
fi
STAGE_APP=""

printf 'Installed Phobos %s at %s\n' "$VERSION" "$TARGET_APP"
printf 'Open it from Applications, or run: open "%s"\n' "$TARGET_APP"
