import React, { useState, useEffect, useRef, useMemo } from "react";
import { parseMapsLink } from "../utils/parseMapsLink";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { Share } from "react-native";
import { loadMapAssets } from "../utils/loadMapAssets";
import theme from "../theme";
import { useToast } from "../components/ui/ToastProvider";
import { MaterialIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import useNetworkStatus from "../utils/useNetworkStatus";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  locationAPI,
  settingsAPI,
  editRequestAPI,
  partnerAPI,
} from "../utils/api";
import LocationModal from "../components/LocationModal";
import EditRequestModal from "../components/EditRequestModal";
import buildMapHtml from "../utils/mapHtml";

const SHOP_LAT = 12.96;
const SHOP_LNG = 80.22;

export default function DeliveryMap({ partner, onLogout }) {
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState([]);
  const [approvalMode, setApprovalMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const searchDebounce = useRef(null);
  const locationReportInterval = useRef(null);
  const webviewRef = useRef(null);
  const isConnected = useNetworkStatus();
  const { showToast } = useToast();
  const [linkPromptVisible, setLinkPromptVisible] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [parsingLink, setParsingLink] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    customerPhones: "",
    type: "home",
    unitNumber: "",
    notes: "",
  });

  useEffect(() => {
    webviewRef.current?.injectJavaScript(`
    if (window.updateMarkers) { window.updateMarkers(${JSON.stringify(locations)}); }
    true;
  `);
  }, [locations]);
  useEffect(() => {
    webviewRef.current?.injectJavaScript(`
    if (window.updateUserMarker) { window.updateUserMarker(${userLocation ? JSON.stringify(userLocation) : "null"}); }
    true;
  `);
  }, [userLocation]);
  useEffect(() => {
    if (!partner) return;

    const reportLocation = async (attempt = 0) => {
      if (!isConnected) return;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const { coords } = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({ lat: coords.latitude, lng: coords.longitude });
        await partnerAPI.updateLocation(coords.latitude, coords.longitude);
      } catch (err) {
        console.error("Location report failed:", err.message);

        // On the very first attempt only, try a cached fix so the dot can
        // appear immediately if one exists (may be null on a fresh permission
        // grant — that's expected and handled below via retry).
        if (attempt === 0) {
          try {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown) {
              setUserLocation({
                lat: lastKnown.coords.latitude,
                lng: lastKnown.coords.longitude,
              });
            }
          } catch (fallbackErr) {
            console.error(
              "Last known location fallback failed:",
              fallbackErr.message,
            );
          }
        }

        // Retry with backoff up to 4 times (covers cold GPS radio / fresh
        // permission grant with no cached fix). Caps at ~15s total instead
        // of silently waiting for the next full 30s interval.
        const maxAttempts = 4;
        if (attempt < maxAttempts) {
          const delay = 2000 * (attempt + 1); // 2s, 4s, 6s, 8s
          setTimeout(() => reportLocation(attempt + 1), delay);
        }
      }
    };
    reportLocation(); // send immediately on login/app open, also sets initial map position
    locationReportInterval.current = setInterval(reportLocation, 30000);

    return () => {
      if (locationReportInterval.current)
        clearInterval(locationReportInterval.current);
    };
  }, [partner, isConnected]);
  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    await checkApprovalMode();
    await loadLocations();
    setLoading(false);
  };

  const checkApprovalMode = async () => {
    try {
      const res = await settingsAPI.getApprovalMode();
      setApprovalMode(res.data.approvalMode);
    } catch (err) {
      console.error("Approval mode check failed:", err.message);
    }
  };

  const loadLocations = async () => {
    try {
      const res = await locationAPI.getAll(SHOP_LAT, SHOP_LNG, 30);
      setLocations(res.data);
    } catch (err) {
      console.error("Load locations failed:", err.message);
      if (!isConnected) {
        showToast("You're offline — showing last loaded locations.");
      } else {
        showToast("Could not load locations. Check backend connection.");
      }
    }
  };
  const handleRefreshMarkers = async () => {
    showToast("Refreshing locations…");
    await loadLocations();
  };
  const handleAddLocation = async () => {
    if (!formData.name) {
      Alert.alert("Missing info", "Location name is required.");
      return;
    }
    if (formData.type === "home" && !formData.customerPhones) {
      Alert.alert(
        "Missing info",
        "Phone number is required for home addresses.",
      );
      return;
    }

    try {
      const res = await locationAPI.add({
        name: formData.name,
        customerPhones: formData.customerPhones
          ? [formData.customerPhones]
          : [],
        type: formData.type,
        unitNumber: formData.unitNumber || null,
        notes: formData.notes,
        lat: formData.lat,
        lng: formData.lng,
        customerId: formData.customerPhones || formData.name,
      });

      showToast(res.data.message);
      setModalVisible(false);
      setFormData({
        name: "",
        customerPhones: "",
        type: "home",
        unitNumber: "",
        notes: "",
      });
      loadLocations();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add location");
    }
  };
  const handleParseLink = async () => {
  setParsingLink(true);
  try {
    const { lat, lng } = await parseMapsLink(linkInput);
    setFormData({
      name: "",
      customerPhones: "",
      type: "home",
      unitNumber: "",
      notes: "",
      lat,
      lng,
    });
    setLinkPromptVisible(false);
    setLinkInput("");
    setModalVisible(true);
  } catch (err) {
    Alert.alert("Couldn't parse link", err.message);
  } finally {
    setParsingLink(false);
  }
};

  const handleSubmitEditRequest = async (reason, proposedChanges) => {
    try {
      const res = await editRequestAPI.submit({
        locationId: editTarget.locationId,
        requestType: "edit",
        proposedChanges,
        reason,
      });
      showToast(res.data.message);
      setEditModalVisible(false);
      setEditTarget(null);
      loadLocations();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to submit request");
    }
  };
  const handleDeleteDirect = async (locationId) => {
    try {
      await locationAPI.delete(locationId);
      showToast("Location deleted");
      loadLocations();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete location");
    }
  };

  const handleDeleteRequest = async (locationId) => {
    try {
      const res = await editRequestAPI.submit({
        locationId,
        requestType: "delete",
        proposedChanges: {},
        reason: "Requested via map pin",
      });
      showToast(res.data.message);
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to submit delete request");
    }
  };

  const openGoogleMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    Linking.openURL(url);
  };
  const shareLocation = async (lat, lng, name) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    try {
      await Share.share({
        message: `${name}: ${url}`,
      });
    } catch (err) {
      console.error("Share failed:", err.message);
    }
  };

  const handleSearchChange = (text) => {
    setSearchText(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);

    if (!text.trim()) {
      setSearchResults([]);
      return;
    }

    searchDebounce.current = setTimeout(() => {
      const q = text.toLowerCase();
      const matches = locations.filter(
        (loc) =>
          loc.name?.toLowerCase().includes(q) ||
          (loc.customerPhones || []).join(",").includes(q),
      );
      setSearchResults(matches);

      if (matches.length === 1) {
        webviewRef.current?.injectJavaScript(`
          (function() {
            if (window.map) {
              window.map.setView([${matches[0].lat}, ${matches[0].lng}], 17);
            }
            true;
          })();
        `);
      }
    }, 250);
  };
  const clearSearch = () => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setSearchText("");
    setSearchResults([]);
  };

  const selectSearchResult = (loc) => {
    Keyboard.dismiss();
    setSearchText(loc.name);
    setSearchResults([]);
    webviewRef.current?.injectJavaScript(`
    (function() {
      if (window.map) {
        window.map.setView([${loc.lat}, ${loc.lng}], 17);
      }
      true;
    })();
  `);
  };
  // Built exactly once per screen mount, using only the initial values.
  // Never re-run this after mount — that's what was causing the WebView
  // to reload and reset zoom/pan on every state change.
  const initialMapHtml = useMemo(
    () =>
      buildMapHtml(
        locations,
        SHOP_LAT,
        SHOP_LNG,
        userLocation,
        partner?.role === "admin" || partner?.role === "head_delivery",
        loadMapAssets(),
      ),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}
      >
        <View>
          <Text style={styles.headerTitle}>DropMap</Text>
          {partner && (
            <Text style={styles.headerSubtitle}>
              {partner.name} · {partner.role.replace("_", " ")}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleRefreshMarkers}
            style={styles.iconBtn}
            accessibilityLabel="Refresh markers"
          >
            <MaterialIcons
              name="refresh"
              size={20}
              color={theme.colors.muted}
            />
          </TouchableOpacity>
          {onLogout && (
            <TouchableOpacity
              onPress={onLogout}
              style={styles.iconBtn}
              accessibilityLabel="Logout"
            >
              <MaterialIcons
                name="logout"
                size={20}
                color={theme.colors.muted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {approvalMode && (
        <Text style={styles.approvalBadge}>⚠️ Approval mode ON</Text>
      )}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="cloud-off" size={16} color="#fff" />
          <Text style={styles.offlineText}>No internet connection</Text>
        </View>
      )}

      <View style={styles.searchWrap}>
        <TextInput
          placeholder="Search by name or phone"
          value={searchText}
          onChangeText={handleSearchChange}
          style={styles.search}
          clearButtonMode="never"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {searchResults.length > 0 && (
        <FlatList
          style={styles.resultsList}
          data={searchResults}
          keyExtractor={(item) => item._id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => selectSearchResult(item)}
            >
              <Text style={styles.resultName}>{item.name}</Text>
              {item.customerPhones?.[0] && (
                <Text style={styles.resultPhone}>{item.customerPhones[0]}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <View style={{ flex: 1 }}>
        
        <WebView
          ref={webviewRef}
          style={{ flex: 1 }}
          originWhitelist={["*"]}
          source={{ html: initialMapHtml }}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url.startsWith("tel:")) {
              Linking.openURL(request.url);
              return false; // block the WebView from trying to navigate itself
            }
            return true; // allow normal navigation (initial HTML load, etc.)
          }}
          onMessage={(event) => {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "navigate") {
              openGoogleMaps(data.lat, data.lng);
            } else if (data.type === "share") {
              shareLocation(data.lat, data.lng, data.name);
            } else if (data.type === "longpress") {
              setFormData({
                name: "",
                customerPhones: "",
                type: "home",
                unitNumber: "",
                notes: "",
                lat: data.lat,
                lng: data.lng,
              });
              setModalVisible(true);
            } else if (data.type === "requestEdit") {
              setEditTarget({
                locationId: data.locationId,
                name: data.name,
                notes: data.notes,
                customerPhones: data.customerPhones,
              });
              setEditModalVisible(true);
            } else if (data.type === "deleteDirect") {
              Alert.alert(
                "Delete location",
                `Delete "${data.name}"? This can't be undone.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => handleDeleteDirect(data.locationId),
                  },
                ],
              );
            } else if (data.type === "deleteRequest") {
              Alert.alert(
                "Request delete",
                `Send a delete request for "${data.name}" to the admin?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Request",
                    onPress: () => handleDeleteRequest(data.locationId),
                  },
                ],
              );
            }
          }}
          onLoadStart={() => setWebviewLoading(true)}
          onLoadEnd={() => {
            setWebviewLoading(false);
            // Safety net: if locations arrived before the WebView's JS finished
            // executing, the first injectJavaScript call would have silently no-op'd.
            // Re-send once we know the page has actually finished loading.
            webviewRef.current?.injectJavaScript(`
              if (window.updateMarkers) { window.updateMarkers(${JSON.stringify(locations)}); }
              if (window.updateUserMarker) { window.updateUserMarker(${userLocation ? JSON.stringify(userLocation) : "null"}); }
              true;
            `);
          }}
        />

        {webviewLoading && (
          <View style={styles.webviewOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {webviewLoading && (
  <View style={styles.webviewOverlay} pointerEvents="none">
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
)}
<TouchableOpacity
  style={[styles.linkFab, { bottom: theme.spacing.lg }]}
  onPress={() => setLinkPromptVisible(true)}
  accessibilityLabel="Add location from Google Maps link"
>
  <MaterialIcons name="link" size={22} color="#1D1D1F" />
</TouchableOpacity>
      </View>

      <View style={styles.hintBar}>
        <Text style={styles.hintText}>
          Long-press the map to add a location
        </Text>
      </View>

      <LocationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddLocation}
        formData={formData}
        setFormData={setFormData}
      />

      <EditRequestModal
        visible={editModalVisible}
        target={editTarget}
        onClose={() => {
          setEditModalVisible(false);
          setEditTarget(null);
        }}
        onSubmit={handleSubmitEditRequest}
      />
      {linkPromptVisible && (
  <View style={styles.linkPromptOverlay}>
    <View style={styles.linkPromptBox}>
      <Text style={styles.linkPromptTitle}>Add from Google Maps link</Text>
      <TextInput
        placeholder="Paste Google Maps link here"
        value={linkInput}
        onChangeText={setLinkInput}
        style={styles.linkPromptInput}
        autoFocus
        multiline
      />
      <View style={styles.linkPromptActions}>
        <TouchableOpacity
          style={styles.linkPromptCancel}
          onPress={() => {
            setLinkPromptVisible(false);
            setLinkInput("");
          }}
        >
          <Text style={styles.linkPromptCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkPromptSubmit}
          onPress={handleParseLink}
          disabled={parsingLink}
        >
          {parsingLink ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.linkPromptSubmitText}>Parse & Add</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: theme.fontSizes.heading,
    fontWeight: "700",
    color: theme.colors.text,
  },
  headerSubtitle: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.muted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: {
    padding: 8,
    borderRadius: theme.radii.sm,
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  approvalBadge: {
    fontSize: 12,
    color: theme.colors.danger,
    textAlign: "center",
    paddingVertical: 4,
  },
  searchWrap: { margin: theme.spacing.md, position: "relative" },
  search: {
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    color: theme.colors.text,
    fontSize: theme.fontSizes.body,
  },
  clearBtn: {
    position: "absolute",
    right: theme.spacing.md + 2,
    top: 12,
    padding: 6,
  },
  clearText: { color: theme.colors.muted, fontSize: 14 },
  resultsList: {
    maxHeight: 200,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  resultName: {
    fontSize: theme.fontSizes.body,
    fontWeight: "600",
    color: theme.colors.text,
  },
  resultPhone: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.muted,
    marginTop: 2,
  },
  hintBar: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface,
    alignItems: "center",
  },
  hintText: { color: theme.colors.muted, fontSize: theme.fontSizes.small },
  webviewOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  offlineBanner: {
    backgroundColor: theme.colors.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 6,
  },
  offlineText: {
    color: "#fff",
    fontSize: theme.fontSizes.small,
    fontWeight: "600",
  },linkFab: {
  position: "absolute",
  left: theme.spacing.lg,
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: "#FFFFFF",
  alignItems: "center",
  justifyContent: "center",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.25,
  shadowRadius: 5,
  elevation: 4,
},
linkPromptOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
  padding: theme.spacing.lg,
},
linkPromptBox: {
  backgroundColor: "#fff",
  borderRadius: theme.radii.md,
  padding: theme.spacing.lg,
  width: "100%",
  maxWidth: 400,
},
linkPromptTitle: {
  fontSize: theme.fontSizes.body,
  fontWeight: "700",
  color: theme.colors.text,
  marginBottom: theme.spacing.md,
},
linkPromptInput: {
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: theme.radii.sm,
  padding: 12,
  fontSize: theme.fontSizes.small,
  minHeight: 60,
  textAlignVertical: "top",
  marginBottom: theme.spacing.md,
},
linkPromptActions: {
  flexDirection: "row",
  gap: 8,
},
linkPromptCancel: {
  flex: 1,
  padding: 12,
  borderRadius: theme.radii.sm,
  borderWidth: 1,
  borderColor: theme.colors.border,
  alignItems: "center",
},
linkPromptCancelText: {
  color: theme.colors.text,
  fontWeight: "600",
},
linkPromptSubmit: {
  flex: 1,
  padding: 12,
  borderRadius: theme.radii.sm,
  backgroundColor: "#000",
  alignItems: "center",
},
linkPromptSubmitText: {
  color: "#fff",
  fontWeight: "600",
},
});
