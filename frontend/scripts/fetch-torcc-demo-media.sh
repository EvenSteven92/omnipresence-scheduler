#!/usr/bin/env bash
# Downloads TORCC marketing/media images from torcc.org CDN for local demo thumbnails.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POSTS="$ROOT/public/demo-media/posts"
TORCC="$ROOT/public/demo-media/torcc"
mkdir -p "$POSTS" "$TORCC"

# torcc.org CDN assets (Webflow)
SERMON_HS="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/6a1f1585c1876bac950da977_1920x1080.png"
DIPPING="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/69f6eb3766c61b76c85e66cd_Dipping%20Night%202026%201920_1080.jpg"
PASSOVER_B="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/69deae8be3c294a02e004733_Passover%20Res%20Sunday%202026_1920_1080%20B.jpg"
RES_SUNDAY="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/69c0a7ccde5dd2da42e23c2a_SQ_Passover%20Res%20Sunday%202026_1920_1080.jpg"
CTV="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/6997987191af6e9c0fe6fbff_Catch%20The%20Vision%202026%20-%201080x1080.jpg"
CTV_MAIN="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/69a99f786f327270b0c8c1b5_Catch%20The%20Vision%202026_Main%20Image.jpg"
F4_NYC="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/69f9165e5d88b6f279c60da2_group-friends-eating-together_53876-9934.avif"
NYC_CAMPUS="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/692adfe40366b1991a52b662_nik-shuliahin-C2CYPENZ7LA-unsplash.jpg"
FIRST_LOVE_MAIN="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/695049f57ab034c3d26295c8_First%20Love%20Main%20Image_Def%202%20Large.jpeg"
FIRST_LOVE_BG="https://cdn.prod.website-files.com/6875104307412a244138dc6e/693122c6e06f56e867b941f4_first%20love%20background.jpg"
PENTECOST="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/6a15a6e130aff0c7bec1b0c6_Pentecost%202026%20Main%20Graphic.jpg"
CAMERA="https://cdn.prod.website-files.com/6875104307412a244138dc6e/68ae9133f9174b98d1e2b1bf_camera2.jpg"
CAROUSEL="https://cdn.prod.website-files.com/64573f019974af1f8c5c61c2/64657e5c3773b37f3b6c9b84_Carousel%2004.png"
SC2026="https://cdn.prod.website-files.com/6875104307412a244138dc6e/692fd6c616c4d242b5f71bd6_SC2026%20Background%20(1).jpg"
SENIOR_PASTORS="https://cdn.prod.website-files.com/6875104307412a244138dc6e/692ae27f882020a833311390_Bio_Senior%20Pastors%20Final%20Edited.jpg"
HIGH_PRIEST="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/6a0be256c268ff5318fa8600_1920x1080.jpg"
MOTHER_HEART="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/6a05eadd70423a7cefa60099_1920x1080.jpeg"
OPEN_EYES="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/69a230654bc891e53dd0fe21_223%20final%20image%20real.png"
PURIM="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/69c0b993311c2adf94e4f220_TPC_pt1_Title%20Image%201080_1080.jpg"
EIGHTH_DAY="https://cdn.prod.website-files.com/687acfbd824441230c80f6c8/698bd665a6246696334404f1_Sermon%201920-2.jpg"

to_jpg() {
  local url="$1"
  local out="$2"
  local tmp
  tmp="$(mktemp)"
  curl -fsSL "$url" -o "$tmp"
  if command -v sips >/dev/null 2>&1; then
    sips -s format jpeg -s formatOptions 82 -Z 1280 "$tmp" --out "$out" >/dev/null 2>&1
    rm -f "$tmp"
  else
    # Vercel/Linux builders: keep downloaded bytes (demo art is already committed for deploys).
    mv "$tmp" "$out"
  fi
  echo "  ✓ $(basename "$out")"
}

echo "Fetching TORCC art into $ROOT/public/demo-media …"

echo "TORCC fallback art (/demo-media/torcc):"
to_jpg "$SERMON_HS" "$TORCC/sermon.jpg"
to_jpg "$PENTECOST" "$TORCC/worship-night.jpg"
to_jpg "$F4_NYC" "$TORCC/youth.jpg"
to_jpg "$CTV" "$TORCC/conference.jpg"
to_jpg "$PURIM" "$TORCC/campaign.jpg"
to_jpg "$CAROUSEL" "$TORCC/quote.jpg"
to_jpg "$DIPPING" "$TORCC/baptism.jpg"
to_jpg "$MOTHER_HEART" "$TORCC/testimony.jpg"
to_jpg "$PASSOVER_B" "$TORCC/communion.jpg"
to_jpg "$CAMERA" "$TORCC/production.jpg"
to_jpg "$FIRST_LOVE_MAIN" "$TORCC/first-love.jpg"
to_jpg "$FIRST_LOVE_BG" "$TORCC/podcast.jpg"
to_jpg "$SC2026" "$TORCC/highlight.jpg"
to_jpg "$NYC_CAMPUS" "$TORCC/nyc-campus.jpg"
to_jpg "$RES_SUNDAY" "$TORCC/res-sunday.jpg"

echo "TORCC scheduled posts:"
to_jpg "$SERMON_HS" "$POSTS/torcc-1.jpg"
to_jpg "$DIPPING" "$POSTS/torcc-2.jpg"
to_jpg "$FIRST_LOVE_MAIN" "$POSTS/torcc-3.jpg"
to_jpg "$CAROUSEL" "$POSTS/torcc-4.jpg"
to_jpg "$F4_NYC" "$POSTS/torcc-5.jpg"
to_jpg "$DIPPING" "$POSTS/torcc-6.jpg"
to_jpg "$SENIOR_PASTORS" "$POSTS/torcc-7.jpg"
to_jpg "$FIRST_LOVE_BG" "$POSTS/torcc-8.jpg"
to_jpg "$CAROUSEL" "$POSTS/torcc-s17-1.jpg"
to_jpg "$PENTECOST" "$POSTS/torcc-wn-2.jpg"
to_jpg "$F4_NYC" "$POSTS/torcc-yt-2.jpg"

echo "TORCC published posts:"
to_jpg "$FIRST_LOVE_MAIN" "$POSTS/torcc-p1.jpg"
to_jpg "$CAMERA" "$POSTS/torcc-p2.jpg"
to_jpg "$SERMON_HS" "$POSTS/torcc-p3.jpg"
to_jpg "$SC2026" "$POSTS/torcc-p4.jpg"
to_jpg "$PENTECOST" "$POSTS/torcc-p5.jpg"
to_jpg "$PASSOVER_B" "$POSTS/torcc-p6.jpg"
to_jpg "$MOTHER_HEART" "$POSTS/torcc-p7.jpg"
to_jpg "$CAROUSEL" "$POSTS/torcc-p8.jpg"
to_jpg "$HIGH_PRIEST" "$POSTS/torcc-p9.jpg"
to_jpg "$DIPPING" "$POSTS/torcc-p10.jpg"
to_jpg "$F4_NYC" "$POSTS/torcc-p11.jpg"

echo "Other workspace posts (TORCC brand art):"
to_jpg "$OPEN_EYES" "$POSTS/oe-1.jpg"
to_jpg "$OPEN_EYES" "$POSTS/oe-2.jpg"
to_jpg "$OPEN_EYES" "$POSTS/oe-p1.jpg"
to_jpg "$F4_NYC" "$POSTS/kz-1.jpg"
to_jpg "$F4_NYC" "$POSTS/kz-p1.jpg"
to_jpg "$CTV" "$POSTS/ctv-1.jpg"
to_jpg "$CTV_MAIN" "$POSTS/ctv-2.jpg"
to_jpg "$CTV_MAIN" "$POSTS/ctv-p1.jpg"

# Remove legacy generic stock filenames if present.
rm -f \
  "$ROOT/public/demo-media/sermon-stage.jpg" \
  "$ROOT/public/demo-media/worship-night.jpg" \
  "$ROOT/public/demo-media/youth-game.jpg" \
  "$ROOT/public/demo-media/highlight-reel.jpg" \
  "$ROOT/public/demo-media/quote-card.jpg" \
  "$ROOT/public/demo-media/baptism.jpg" \
  "$ROOT/public/demo-media/testimony-video.jpg" \
  "$ROOT/public/demo-media/communion-video.jpg" \
  "$ROOT/public/demo-media/soundcheck-vlog.jpg"

echo "Done."