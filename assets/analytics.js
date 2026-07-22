const SiteAnalytics = (() => {
  const firebaseConfig = {
    apiKey: "AIzaSyDI9wEkZE7wLoTtYZd_n6fr9g8S1vLmP8w",
    authDomain: "andredestro-github-io.firebaseapp.com",
    projectId: "andredestro-github-io",
    storageBucket: "andredestro-github-io.firebasestorage.app",
    messagingSenderId: "506254720829",
    appId: "1:506254720829:web:df6f930fa0c1d387a60f54",
    measurementId: "G-57VRNK7NQQ"
  };

  const consentKey = "andre_destro_analytics_consent";
  const cookieBanner = document.querySelector("#cookie-banner");
  const acceptButton = document.querySelector("#accept-analytics");
  const declineButton = document.querySelector("#decline-analytics");
  const settingsButton = document.querySelector("#cookie-settings");

  let memoryConsent = null;
  let analytics = null;
  let logAnalyticsEvent = null;
  let setCollectionEnabled = null;
  let initializing = false;
  let unsupported = false;
  const pendingEvents = [];

  function consent() {
    try {
      return localStorage.getItem(consentKey) ?? memoryConsent;
    } catch {
      return memoryConsent ?? "denied";
    }
  }

  function storeConsent(value) {
    // Kept in memory too, so the choice still applies on this page
    // when localStorage is unavailable.
    memoryConsent = value;
    try {
      localStorage.setItem(consentKey, value);
    } catch {
      // Choice won't be remembered across visits.
    }
  }

  function trackEvent(name, params = {}) {
    if (unsupported || consent() !== "granted") {
      return;
    }
    if (analytics && logAnalyticsEvent) {
      logAnalyticsEvent(analytics, name, params);
    } else {
      // Queued until the Firebase SDK finishes loading, flushed in
      // syncCollectionState so early clicks aren't lost.
      pendingEvents.push({ name, params });
    }
  }

  function syncCollectionState() {
    if (!analytics) {
      return;
    }
    const granted = consent() === "granted";
    setCollectionEnabled(analytics, granted);
    if (!granted) {
      pendingEvents.length = 0;
      return;
    }
    while (pendingEvents.length > 0) {
      const event = pendingEvents.shift();
      logAnalyticsEvent(analytics, event.name, event.params);
    }
  }

  async function initializeAnalytics() {
    if (unsupported || consent() !== "granted") {
      return;
    }
    if (analytics) {
      syncCollectionState();
      return;
    }
    if (initializing) {
      return;
    }
    initializing = true;
    try {
      const [firebaseAppModule, firebaseAnalyticsModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js")
      ]);

      const supported = await firebaseAnalyticsModule.isSupported();
      if (!supported) {
        unsupported = true;
        pendingEvents.length = 0;
        return;
      }

      const firebaseApp = firebaseAppModule.initializeApp(firebaseConfig);
      analytics = firebaseAnalyticsModule.getAnalytics(firebaseApp);
      logAnalyticsEvent = firebaseAnalyticsModule.logEvent;
      setCollectionEnabled = firebaseAnalyticsModule.setAnalyticsCollectionEnabled;
      syncCollectionState();
    } catch (error) {
      // State is left untouched so a later "Accept" retries the import.
      console.warn("Analytics unavailable.", error);
    } finally {
      initializing = false;
    }
  }

  function setConsent(value) {
    storeConsent(value);
    if (cookieBanner) {
      cookieBanner.hidden = true;
    }
    if (value === "granted") {
      initializeAnalytics();
    } else {
      pendingEvents.length = 0;
      if (analytics) {
        setCollectionEnabled(analytics, false);
      }
    }
  }

  acceptButton?.addEventListener("click", () => setConsent("granted"));
  declineButton?.addEventListener("click", () => setConsent("denied"));
  settingsButton?.addEventListener("click", () => {
    if (cookieBanner) {
      cookieBanner.hidden = false;
    }
  });

  document.querySelectorAll("[data-social-link]").forEach((link) => {
    link.addEventListener("click", () => {
      trackEvent("social_link_click", {
        link_name: link.dataset.socialLink,
        destination_url: link.href
      });
    });
  });

  if (cookieBanner) {
    const storedConsent = consent();
    if (storedConsent === "granted") {
      initializeAnalytics();
    } else if (storedConsent !== "denied") {
      cookieBanner.hidden = false;
    }
  }

  return { trackEvent };
})();
