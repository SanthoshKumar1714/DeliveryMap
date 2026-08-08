import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import theme from "../theme";
import { useToast } from "../components/ui/ToastProvider";
import { MaterialIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import * as Linking from "expo-linking";
import useNetworkStatus from "../utils/useNetworkStatus";
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
  const [locations, setLocations] = useState([]);
  const [approvalMode, setApprovalMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [webviewLoading, setWebviewLoading] = useState(true);
  const searchDebounce = useRef(null);
  const locationReportInterval = useRef(null);
  const webviewRef = useRef(null);
  const lastLocationsRef = useRef(null);
  const isConnected = useNetworkStatus();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    customerPhones: "",
    type: "home",
    unitNumber: "",
    notes: "",
  });

  useEffect(() => {
    if (lastLocationsRef.current === null) {
      // Skip first run — initial locations are already in the HTML on load
      lastLocationsRef.current = locations;
      return;
    }
    lastLocationsRef.current = locations;

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

    const reportLocation = async () => {
      if (!isConnected) return; // don't bother — will fail anyway, just wastes GPS+battery
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
        setFocusTarget({ lat: matches[0].lat, lng: matches[0].lng });
      }
    }, 250);
  };

  const clearSearch = () => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    setSearchText("");
    setSearchResults([]);
  };

  const selectSearchResult = (loc) => {
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
  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>DropMap</Text>
          {partner && (
            <Text style={styles.headerSubtitle}>
              {partner.name} · {partner.role.replace("_", " ")}
            </Text>
          )}
        </View>
        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            style={styles.logoutBtn}
            accessibilityLabel="Logout"
          >
            <MaterialIcons name="logout" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
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
          source={{
            html: buildMapHtml(
              locations,
              focusTarget?.lat || SHOP_LAT,
              focusTarget?.lng || SHOP_LNG,
              userLocation,
              partner?.role === "admin" || partner?.role === "head_delivery",
            ),
          }}
          onMessage={(event) => {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "navigate") {
              openGoogleMaps(data.lat, data.lng);
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
          onLoadEnd={() => setWebviewLoading(false)}
        />

        {webviewLoading && (
          <View style={styles.webviewOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
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
  logoutBtn: { padding: 8, borderRadius: theme.radii.sm },
  logoutIcon: { fontSize: 18, color: theme.colors.muted },
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
  },
});
