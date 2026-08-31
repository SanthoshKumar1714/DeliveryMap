export default function buildMapHtml(initialLocations, centerLat, centerLng, userLocation, canDeleteDirectly, mapAssets) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>${mapAssets.leafletCss}</style>
      <style>${mapAssets.markerClusterCss}</style>
      <style>${mapAssets.markerClusterDefaultCss}</style>
     <style>
        body { margin: 0; padding: 0; }
        #map { width: 100vw; height: 100vh; }

        /* Restyle default Leaflet zoom control to match the app's circular button design */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        .leaflet-control-zoom a {
          width: 42px !important;
          height: 42px !important;
          line-height: 42px !important;
          border-radius: 50% !important;
          background: #FFFFFF !important;
          box-shadow: 0 1px 5px rgba(0,0,0,0.25) !important;
          color: #1D1D1F !important;
          font-size: 20px !important;
          font-weight: 400 !important;
          margin-bottom: 10px !important;
          border: none !important;
        }
        .leaflet-control-zoom a:hover {
          background: #F5F5F5 !important;
        }
        .leaflet-control-zoom-in {
          border-top-left-radius: 50% !important;
          border-top-right-radius: 50% !important;
        }
        .leaflet-control-zoom-out {
          border-bottom-left-radius: 50% !important;
          border-bottom-right-radius: 50% !important;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>${mapAssets.leafletJs}</script>
      <script>${mapAssets.leafletRotateJs}</script>
      <script>${mapAssets.markerClusterJs}</script>
      <script>
        const map = window.map = L.map('map', {
          attributionControl: false,
          rotate: true,
          touchRotate: true,
          rotateControl: false,
          bearing: 0,
        }).setView([${centerLat}, ${centerLng}], 12);

        window.rotateEnabled = false;
        // Handler was constructed above because touchRotate:true — immediately
        // disable it via the proper Handler API so gestures don't respond until toggled on.
        if (map.touchRotate && map.touchRotate.disable) {
          map.touchRotate.disable();
        }
                L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2mx8_1_436f037eb65455ff4e556be9', {
          maxZoom: 19,
        }).addTo(map);

        const canDeleteDirectly = ${canDeleteDirectly};

        // Groups nearby delivery pins into a number badge when zoomed out;
        // splits back into individual pins as the user zooms in.
        window.clusterGroup = L.markerClusterGroup({
          maxClusterRadius: 60,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            return L.divIcon({
              html: '<div style="background:#1D1D1F;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);">' + count + '</div>',
              className: '',
              iconSize: [36, 36],
            });
          },
        });
        map.addLayer(window.clusterGroup);

       // Pin colors per location type — makes clusters scannable at a glance
        const TYPE_COLORS = {
          home: '#E63946',     // red
          flat: '#3B82C4',     // blue
          hotel: '#E8873A',    // orange
          building: '#6B7280', // grey
        };

        // Inner glyph per type, centered inside the pin's white circle
        function typeGlyphSvg(type) {
          if (type === 'home') {
            // House shape
            return '<path d="M7 12.5L14 7l7 5.5V19a1 1 0 0 1-1 1h-4v-4.5h-4V20H8a1 1 0 0 1-1-1v-6.5z" fill="#FFFFFF"/>';
          }
          if (type === 'flat') {
            // Apartment block — grid of windows
            return '<rect x="8" y="6" width="12" height="15" rx="1" fill="#FFFFFF"/>' +
              '<rect x="10" y="8.5" width="2.2" height="2.2" fill="' + TYPE_COLORS.flat + '"/>' +
              '<rect x="15.8" y="8.5" width="2.2" height="2.2" fill="' + TYPE_COLORS.flat + '"/>' +
              '<rect x="10" y="12.5" width="2.2" height="2.2" fill="' + TYPE_COLORS.flat + '"/>' +
              '<rect x="15.8" y="12.5" width="2.2" height="2.2" fill="' + TYPE_COLORS.flat + '"/>' +
              '<rect x="10" y="16.5" width="2.2" height="2.2" fill="' + TYPE_COLORS.flat + '"/>' +
              '<rect x="15.8" y="16.5" width="2.2" height="2.2" fill="' + TYPE_COLORS.flat + '"/>';
          }
          if (type === 'hotel') {
            // Fork & knife crossed
            return '<path d="M10.5 6v6.5a1.5 1.5 0 0 1-1 1.4V22h-1v-8.1a1.5 1.5 0 0 1-1-1.4V6h.7v5.5h.6V6h.7v5.5h.6V6h.4z" fill="#FFFFFF"/>' +
              '<path d="M18 6c-1.4 0-2.5 1.8-2.5 4s1 3.6 2 3.9V22h1V6z" fill="#FFFFFF"/>';
          }
          // building (generic)
          return '<rect x="9" y="7" width="10" height="14" rx="0.5" fill="#FFFFFF"/>' +
            '<rect x="11" y="9.5" width="2" height="2" fill="' + TYPE_COLORS.building + '"/>' +
            '<rect x="15" y="9.5" width="2" height="2" fill="' + TYPE_COLORS.building + '"/>' +
            '<rect x="11" y="13.5" width="2" height="2" fill="' + TYPE_COLORS.building + '"/>' +
            '<rect x="15" y="13.5" width="2" height="2" fill="' + TYPE_COLORS.building + '"/>' +
            '<rect x="12.5" y="17.5" width="3" height="3.5" fill="' + TYPE_COLORS.building + '"/>';
        }

        function buildPinIcon(type, active) {
          const color = TYPE_COLORS[type] || TYPE_COLORS.building;
          const size = active ? [36, 49] : [28, 38];
          const anchor = active ? [18, 49] : [14, 38];
          const popupAnchor = active ? [0, -44] : [0, -34];
          return L.divIcon({
            className: '',
            html: \`
              <svg width="\${size[0]}" height="\${size[1]}" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24c0-7.7-6.3-14-14-14z" fill="\${active ? '#1D1D1F' : color}"/>
                \${typeGlyphSvg(type)}
              </svg>
            \`,
            iconSize: size,
            iconAnchor: anchor,
            popupAnchor: popupAnchor,
          });
        }

        const blueIcon = L.divIcon({
          className: '',
          html: '<div style="background:#007AFF;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,0.4);"></div>',
          iconSize: [12, 12],
        });

        // Tracks active markers by location _id so we can diff instead of rebuilding.
      // Tracks active markers by location _id so we can diff instead of rebuilding.
        window.markerMap = new Map();
        // Parallel map: _id -> full location object, so we can look up type when
        // reverting a previously-active marker's icon without needing a closure reference.
        window.markerLocData = new Map();
        // _id of the marker whose popup is currently open, or null.
        window.activeMarkerId = null;

        function escapeText(str) {
          return (str || '').replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
        }

        function buildPopupHtml(loc) {
          const name = escapeText(loc.name);
          // Flat locations are shared complexes — notes are relevant, but phone/unit are not.
          const notes = loc.type !== 'flat' || loc.notes ? escapeText(loc.notes) : null;
          const phone = loc.type !== 'flat' && loc.customerPhones && loc.customerPhones[0]
            ? escapeText(loc.customerPhones[0]) : null;
          const unitNumber = loc.type === 'home' && loc.unitNumber ? escapeText(loc.unitNumber) : null;
          const typeLabels = { home: 'Home', flat: 'Flat', hotel: 'Hotel', building: 'Building' };
          const typeLabel = typeLabels[loc.type] || null;

          const deleteBtn = canDeleteDirectly
            ? '<button id="del-' + loc._id + '" style="flex:1;background:#fff;color:#E63946;border:1px solid #E63946;border-radius:8px;padding:9px 8px;font-size:12.5px;font-weight:600;">Delete</button>'
            : '<button id="delreq-' + loc._id + '" style="flex:1;background:#fff;color:#E63946;border:1px solid #E63946;border-radius:8px;padding:9px 8px;font-size:12.5px;font-weight:600;">Request Delete</button>';

          // Conditional rows — only rendered when data actually exists
          let detailRows = '';

          if (typeLabel) {
            detailRows += '<span style="display:inline-block;background:#F0F0F2;color:#555;font-size:11px;font-weight:600;padding:3px 9px;border-radius:20px;margin-bottom:8px;">' + typeLabel + '</span>';
          }

          if (phone) {
            detailRows += '<a href="tel:' + phone + '" style="display:flex;align-items:center;gap:6px;text-decoration:none;color:#1D1D1F;font-size:13.5px;margin-bottom:6px;">' +
              '<span style="font-size:14px;">📞</span><span style="text-decoration:underline;">' + phone + '</span></a>';
          }

          if (unitNumber) {
            detailRows += '<div style="display:flex;align-items:center;gap:6px;color:#555;font-size:13px;margin-bottom:6px;">' +
              '<span style="font-size:14px;">🏠</span><span>' + unitNumber + '</span></div>';
          }

          if (notes) {
            detailRows += '<div style="color:#777;font-size:12.5px;font-style:italic;margin-top:4px;padding-top:6px;border-top:1px solid #EEE;">' + notes + '</div>';
          }

          return '<div style="font-family: -apple-system, sans-serif; text-align:left; min-width:220px; max-width:260px;">' +
            '<div style="font-weight:700; font-size:15px; color:#111; margin-bottom:6px;">' + name + '</div>' +
            (detailRows ? '<div style="margin-bottom:10px;">' + detailRows + '</div>' : '') +
            '<div style="display:flex; gap:6px;">' +
            '<button id="nav-' + loc._id + '" style="flex:1;background:#000;color:#fff;border:none;border-radius:8px;padding:9px 8px;font-size:12.5px;font-weight:600;">Navigate</button>' +
'<button id="share-' + loc._id + '" style="flex:1;background:#fff;color:#000;border:1px solid #000;border-radius:8px;padding:9px 8px;font-size:12.5px;font-weight:600;">Share</button>' +
'<button id="edit-' + loc._id + '" style="flex:1;background:#fff;color:#000;border:1px solid #000;border-radius:8px;padding:9px 8px;font-size:12.5px;font-weight:600;">Edit</button>' +
deleteBtn +
            '</div>' +
            '</div>';
        }

        function attachPopupHandlers(marker, loc) {
          marker.off('popupopen').on('popupopen', function() {
            // Revert whatever was previously active back to its normal type-colored icon
            if (window.activeMarkerId && window.activeMarkerId !== loc._id) {
              const prevMarker = window.markerMap.get(window.activeMarkerId);
              const prevLoc = window.markerLocData ? window.markerLocData.get(window.activeMarkerId) : null;
              if (prevMarker) prevMarker.setIcon(buildPinIcon(prevLoc ? prevLoc.type : loc.type, false));
            }
            marker.setIcon(buildPinIcon(loc.type, true));
            window.activeMarkerId = loc._id;

            const navBtn = document.getElementById('nav-' + loc._id);
            const editBtn = document.getElementById('edit-' + loc._id);
            const delBtn = document.getElementById('del-' + loc._id);
            const delReqBtn = document.getElementById('delreq-' + loc._id);
            const shareBtn = document.getElementById('share-' + loc._id);

            if (navBtn) navBtn.onclick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'navigate', lat: loc.lat, lng: loc.lng }));
            };
            
if (shareBtn) shareBtn.onclick = function() {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'share', lat: loc.lat, lng: loc.lng, name: loc.name }));
};
            if (editBtn) editBtn.onclick = function() {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'requestEdit', locationId: loc._id, name: loc.name, notes: loc.notes, customerPhones: loc.customerPhones }));
};
            if (delBtn) delBtn.onclick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'deleteDirect', locationId: loc._id, name: loc.name }));
            };
            if (delReqBtn) delReqBtn.onclick = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'deleteRequest', locationId: loc._id, name: loc.name }));
            };
          });

          marker.off('popupclose').on('popupclose', function() {
            if (window.activeMarkerId === loc._id) {
              marker.setIcon(buildPinIcon(loc.type, false));
              window.activeMarkerId = null;
            }
          });
        }
          // Cheap fingerprint of everything that could visibly change about a
// marker (icon, popup content). Used to skip DOM writes for markers
// that haven't actually changed since the last updateMarkers call —
// setIcon/setPopupContent/attachPopupHandlers are all real DOM/closure
// rebuilds, so skipping them for unchanged markers meaningfully cuts
// CPU work on every refresh/poll, especially on lower-end devices.
function locationFingerprint(loc) {
  return [
    loc.name,
    loc.type,
    loc.lat,
    loc.lng,
    loc.notes || '',
    (loc.customerPhones || []).join(','),
    loc.unitNumber || '',
  ].join('|');
}
  window.markerMap = new Map();
window.markerLocData = new Map();
// Tracks the last-seen fingerprint per marker _id, so updateMarkers can
// skip DOM rebuilds for markers whose data hasn't actually changed.
window.markerFingerprints = new Map();
window.activeMarkerId = null;

        // Diffs the incoming location list against currently-rendered markers.
        // Only touches what actually changed — no full redraw.
        window.updateMarkers = function(locations) {
          const incomingIds = new Set(locations.map(function(l) { return l._id; }));

          // Remove markers for locations no longer present
        // Remove markers for locations no longer present
          let removedAny = false;
          window.markerMap.forEach(function(marker, id) {
  if (!incomingIds.has(id)) {
    if (marker.isPopupOpen && marker.isPopupOpen()) {
      marker.closePopup();
    }
    if (window.activeMarkerId === id) {
      window.activeMarkerId = null;
    }
    window.clusterGroup.removeLayer(marker);
    window.markerMap.delete(id);
    window.markerLocData.delete(id);
    window.markerFingerprints.delete(id);
    removedAny = true;
  }
});
          // Marker cluster keeps an internal spiderfy overlay that removeLayer alone
          // doesn't always clean up — force it to recompute so no ghost pins remain.
          if (removedAny && window.clusterGroup.refreshClusters) {
            window.clusterGroup.refreshClusters();
          }

          // Add or update markers
          locations.forEach(function(loc) {
            const existing = window.markerMap.get(loc._id);

            if (!existing) {
  const marker = L.marker([loc.lat, loc.lng], { icon: buildPinIcon(loc.type, false) })
    .bindPopup(buildPopupHtml(loc));
  attachPopupHandlers(marker, loc);
  window.clusterGroup.addLayer(marker);
  window.markerMap.set(loc._id, marker);
  window.markerLocData.set(loc._id, loc);
  window.markerFingerprints.set(loc._id, locationFingerprint(loc));
} else {
  const newFingerprint = locationFingerprint(loc);
  const oldFingerprint = window.markerFingerprints.get(loc._id);

  if (newFingerprint === oldFingerprint) {
    // Nothing about this marker actually changed — skip all DOM work.
    return;
  }

  const latLng = existing.getLatLng();
  if (latLng.lat !== loc.lat || latLng.lng !== loc.lng) {
    existing.setLatLng([loc.lat, loc.lng]);
  }
  existing.setPopupContent(buildPopupHtml(loc));
  attachPopupHandlers(existing, loc);
  existing.setIcon(buildPinIcon(loc.type, window.activeMarkerId === loc._id));
  window.markerLocData.set(loc._id, loc);
  window.markerFingerprints.set(loc._id, newFingerprint);
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

        // Collapsed "i" icon that expands to show required OSM/CARTO attribution on tap.
        const AttributionControl = L.Control.extend({
          options: { position: 'bottomleft' },
          onAdd: function() {
            const container = L.DomUtil.create('div');
            container.style.background = 'rgba(255,255,255,0.85)';
            container.style.borderRadius = '50%';
            container.style.width = '22px';
            container.style.height = '22px';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.style.fontSize = '12px';
            container.style.fontStyle = 'italic';
            container.style.fontFamily = 'serif';
            container.style.color = '#555';
            container.style.cursor = 'pointer';
            container.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)';
            container.innerText = 'i';

            let expanded = false;
            L.DomEvent.disableClickPropagation(container);
            container.onclick = function() {
              expanded = !expanded;
              if (expanded) {
                container.style.width = 'auto';
                container.style.height = 'auto';
                container.style.borderRadius = '6px';
                container.style.padding = '4px 8px';
                container.style.fontStyle = 'normal';
                container.style.fontFamily = 'sans-serif';
                container.style.fontSize = '10px';
                container.innerHTML = '© OpenStreetMap contributors © CARTO';
              } else {
                container.style.width = '22px';
                container.style.height = '22px';
                container.style.borderRadius = '50%';
                container.style.padding = '0';
                container.style.fontStyle = 'italic';
                container.style.fontFamily = 'serif';
                container.style.fontSize = '12px';
                container.innerText = 'i';
              }
            };

            return container;
          }
        });
        map.addControl(new AttributionControl());

        // Shared visual style for the two floating map action buttons —
        // clean circular icon buttons instead of raw emoji-in-a-box.
        function styleActionButton(btn) {
          btn.style.width = '42px';
          btn.style.height = '42px';
          btn.style.background = '#FFFFFF';
          btn.style.border = 'none';
          btn.style.borderRadius = '50%';
          btn.style.boxShadow = '0 1px 5px rgba(0,0,0,0.25)';
          btn.style.cursor = 'pointer';
          btn.style.display = 'flex';
          btn.style.alignItems = 'center';
          btn.style.justifyContent = 'center';
          btn.style.padding = '0';
          btn.style.marginBottom = '10px';
        }

        const LocateControl = L.Control.extend({
          options: { position: 'bottomright' },
          onAdd: function() {
            const btn = L.DomUtil.create('button');
            styleActionButton(btn);
            btn.innerHTML = \`
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" fill="#1D1D1F"/>
                <path d="M12 2V5M12 19V22M22 12H19M5 12H2" stroke="#1D1D1F" stroke-width="2" stroke-linecap="round"/>
              </svg>
            \`;
            L.DomEvent.disableClickPropagation(btn);
            btn.onclick = function(e) {
  e.stopPropagation();
  if (window.userMarker) {
    map.setView(window.userMarker.getLatLng(), 17);
  } else {
    alert('Still getting your location — try again in a few seconds.');
  }
};
            return btn;
          }
        });
        map.addControl(new LocateControl());

        // Toggles two-finger rotate gesture on/off. Snaps back to north when turned off.
        const RotateControl = L.Control.extend({
          options: { position: 'bottomright' },
          onAdd: function() {
            const btn = L.DomUtil.create('button');
            styleActionButton(btn);

            function renderIcon() {
              const color = window.rotateEnabled ? '#FFFFFF' : '#1D1D1F';
              btn.style.background = window.rotateEnabled ? '#1D1D1F' : '#FFFFFF';
              btn.innerHTML = \`
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12a9 9 0 1 1 3.5 7.1" stroke="\${color}" stroke-width="2" stroke-linecap="round"/>
                  <path d="M3 17V12H8" stroke="\${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              \`;
            }
            renderIcon();

           L.DomEvent.disableClickPropagation(btn);
            btn.onclick = function(e) {
              e.stopPropagation();
              window.rotateEnabled = !window.rotateEnabled;
              if (map.touchRotate) {
                if (window.rotateEnabled) {
                  map.touchRotate.enable();
                } else {
                  map.touchRotate.disable();
                }
              }
              if (!window.rotateEnabled && map.setBearing) {
                map.setBearing(0);
              }
              renderIcon();
            };
            return btn;
          }
        });
        map.addControl(new RotateControl());

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