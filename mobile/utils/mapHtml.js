export default function buildMapHtml(initialLocations, centerLat, centerLng, userLocation, canDeleteDirectly) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body { margin: 0; padding: 0; }
        #map { width: 100vw; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = window.map = L.map('map').setView([${centerLat}, ${centerLng}], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors © CARTO',
        }).addTo(map);

        const canDeleteDirectly = ${canDeleteDirectly};

        const pinIcon = L.divIcon({
          className: '',
          html: \`
            <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24c0-7.7-6.3-14-14-14z" fill="#E63946"/>
              <circle cx="14" cy="14" r="5.5" fill="#FFFFFF"/>
            </svg>
          \`,
          iconSize: [28, 38],
          iconAnchor: [14, 38],
          popupAnchor: [0, -34],
        });

        const blueIcon = L.divIcon({
          className: '',
          html: '<div style="background:#007AFF;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.4);"></div>',
          iconSize: [12, 12],
        });

        // Tracks active markers by location _id so we can diff instead of rebuilding.
        window.markerMap = new Map();

        function escapeText(str) {
          return (str || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
        }

        function buildPopupHtml(loc) {
          const name = escapeText(loc.name);
          const notes = escapeText(loc.notes);
          const deleteBtn = canDeleteDirectly
            ? '<button id="del-' + loc._id + '" style="background:#fff;color:#E63946;border:1px solid #E63946;border-radius:8px;padding:8px 14px;margin:2px;font-size:13px;">Delete</button>'
            : '<button id="delreq-' + loc._id + '" style="background:#fff;color:#E63946;border:1px solid #E63946;border-radius:8px;padding:8px 14px;margin:2px;font-size:13px;">Request Delete</button>';

          return '<div style="font-family: sans-serif; text-align:center;">' +
            '<div style="font-weight:600; margin-bottom:6px;">' + name + '</div>' +
            '<button id="nav-' + loc._id + '" style="background:#000;color:#fff;border:none;border-radius:8px;padding:8px 14px;margin:2px;font-size:13px;">Navigate</button>' +
            '<button id="edit-' + loc._id + '" style="background:#fff;color:#000;border:1px solid #000;border-radius:8px;padding:8px 14px;margin:2px;font-size:13px;">Request Edit</button>' +
            deleteBtn +
            '</div>';
        }

        function attachPopupHandlers(marker, loc) {
          marker.off('popupopen').on('popupopen', function() {
            const navBtn = document.getElementById('nav-' + loc._id);
            const editBtn = document.getElementById('edit-' + loc._id);
            const delBtn = document.getElementById('del-' + loc._id);
            const delReqBtn = document.getElementById('delreq-' + loc._id);

            if (navBtn) navBtn.onclick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigate', lat: loc.lat, lng: loc.lng }));
            };
            if (editBtn) editBtn.onclick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'requestEdit', locationId: loc._id, name: loc.name, notes: loc.notes }));
            };
            if (delBtn) delBtn.onclick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'deleteDirect', locationId: loc._id, name: loc.name }));
            };
            if (delReqBtn) delReqBtn.onclick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'deleteRequest', locationId: loc._id, name: loc.name }));
            };
          });
        }

        // Diffs the incoming location list against currently-rendered markers.
        // Only touches what actually changed — no full redraw.
        window.updateMarkers = function(locations) {
          const incomingIds = new Set(locations.map(function(l) { return l._id; }));

          // Remove markers for locations no longer present
          window.markerMap.forEach(function(marker, id) {
            if (!incomingIds.has(id)) {
              map.removeLayer(marker);
              window.markerMap.delete(id);
            }
          });

          // Add or update markers
          locations.forEach(function(loc) {
            const existing = window.markerMap.get(loc._id);

            if (!existing) {
              const marker = L.marker([loc.lat, loc.lng], { icon: pinIcon })
                .addTo(map)
                .bindPopup(buildPopupHtml(loc));
              attachPopupHandlers(marker, loc);
              window.markerMap.set(loc._id, marker);
            } else {
              const latLng = existing.getLatLng();
              if (latLng.lat !== loc.lat || latLng.lng !== loc.lng) {
                existing.setLatLng([loc.lat, loc.lng]);
              }
              existing.setPopupContent(buildPopupHtml(loc));
              attachPopupHandlers(existing, loc);
            }
          });
        };

        window.updateUserMarker = function(userLoc) {
          if (window.userMarker) {
            map.removeLayer(window.userMarker);
            window.userMarker = null;
          }
          if (userLoc) {
            window.userMarker = L.marker([userLoc.lat, userLoc.lng], { icon: blueIcon })
              .addTo(map)
              .bindPopup("You are here");
          }
        };

        // Initial render
        window.updateMarkers(${JSON.stringify(initialLocations)});
        window.updateUserMarker(${userLocation ? JSON.stringify(userLocation) : 'null'});

        const LocateControl = L.Control.extend({
          options: { position: 'bottomright' },
          onAdd: function() {
            const btn = L.DomUtil.create('button');
            btn.innerHTML = '📍';
            btn.style.width = '40px';
            btn.style.height = '40px';
            btn.style.fontSize = '18px';
            btn.style.background = '#FFF';
            btn.style.border = '2px solid rgba(0,0,0,0.2)';
            btn.style.borderRadius = '8px';
            btn.style.cursor = 'pointer';
            btn.onclick = function(e) {
              e.stopPropagation();
              if (window.userMarker) {
                map.setView(window.userMarker.getLatLng(), 17);
              } else {
                alert('Location not available yet');
              }
            };
            return btn;
          }
        });
        map.addControl(new LocateControl());

        map.on('contextmenu', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'longpress',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }));
        });
      </script>
    </body>
    </html>
  `;
}