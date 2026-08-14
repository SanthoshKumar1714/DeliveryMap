// Parses a Google Maps URL (of various formats) into { lat, lng }.
//
// Handles two cases:
// 1. Long-form links that already contain coordinates in the URL
//    (maps.google.com/?q=..., google.com/maps/@lat,lng,zoom, /maps/place/.../@lat,lng,...)
// 2. Short share links (maps.app.goo.gl/xxx, goo.gl/maps/xxx) that carry
//    no coordinates directly — these require following the HTTP redirect
//    to get the real long-form URL, which is then parsed the same way.
//
// Returns { lat, lng } on success, or throws an Error with a
// user-presentable message on failure.

const COORD_PATTERNS = [
  // ?q=12.9716,77.5946  or  &q=12.9716,77.5946
  /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
  // /@12.9716,77.5946,17z  (the most common pattern, appears in most
  // google.com/maps/... links regardless of what precedes the @)
  /@(-?\d+\.\d+),(-?\d+\.\d+)/,
  // /maps/place/Name/data=...!3d12.9716!4d77.5946  (place links sometimes
  // encode coords in the data= param instead of/as well as the @ segment)
  /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
];

function extractCoordsFromUrl(url) {
  for (const pattern of COORD_PATTERNS) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }
  return null;
}

function isShortLink(url) {
  return /maps\.app\.goo\.gl|goo\.gl\/maps/.test(url);
}

// Follows redirects on a short link to resolve the real long-form URL.
// Uses a HEAD request first (cheaper), falls back to GET if the server
// doesn't support HEAD for redirects.
async function resolveShortLink(url) {
  try {
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (response.url && response.url !== url) {
      return response.url;
    }
  } catch (err) {
    // Some servers reject HEAD — fall through to GET below.
  }

  const response = await fetch(url, { method: "GET", redirect: "follow" });
  if (response.url && response.url !== url) {
    return response.url;
  }

  throw new Error("Could not resolve the short link — it may have expired or changed.");
}

// Main entry point. Pass any Google Maps URL (long or short form).
export async function parseMapsLink(rawInput) {
  const url = rawInput.trim();

  if (!url) {
    throw new Error("Paste a Google Maps link first.");
  }

  if (!/^https?:\/\//.test(url)) {
    throw new Error("That doesn't look like a valid link. Copy the full link from Google Maps' Share button.");
  }

  // Try extracting coordinates directly first — works for most long-form links.
  const directCoords = extractCoordsFromUrl(url);
  if (directCoords) {
    return directCoords;
  }

  // No coordinates found directly — if it's a known short-link format,
  // resolve the redirect and try again on the resolved URL.
  if (isShortLink(url)) {
    const resolvedUrl = await resolveShortLink(url);
    const resolvedCoords = extractCoordsFromUrl(resolvedUrl);
    if (resolvedCoords) {
      return resolvedCoords;
    }
    throw new Error("Resolved the link but couldn't find coordinates in it. Try sharing the location again from Google Maps.");
  }

  throw new Error("Couldn't find coordinates in this link. Make sure it's a Google Maps location link.");
}