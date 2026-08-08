// app.config.js  (replaces app.json — Expo supports JS config)
export default {
  expo: {
    name: "DeliveryMap",
    slug: "delivery-map",
    version: "1.0.0",
    // ...your existing app.json fields go here
    
    extra: {
      apiUrl: process.env.API_URL || "http://192.168.1.1:5000/api",
    },
  },
};