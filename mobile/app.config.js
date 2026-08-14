export default {
  expo: {
    name: "DeliveryMap",
    slug: "delivery-map",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.droppin.deliverymap",
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png"
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
  "expo-secure-store",
  "expo-font",
  [
    "expo-build-properties",
    {
      android: {
        enableProguardInReleaseBuilds: true,
        enableShrinkResourcesInReleaseBuilds: true,
      }
    }
  ]
],
    extra: {
      apiUrl: process.env.API_URL || "http://192.168.1.6:5000/api",
      eas: {
        projectId: "40588fd9-26ad-4184-8a96-877511daea80"
      }
    }
  }
};