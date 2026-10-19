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

  // Preview traffic never reaches the production property.
  const productionHost = window.location.hostname === "andredestro.github.io";
  const pagePath = window.location.pathname;
  const pageType = document.body.dataset.pageType
    || (pagePath === "/" ? "home"
    : pagePath.startsWith("/apps/") ? "apps"
    : pagePath.startsWith("/setup/") ? "setup"
    : pagePath.startsWith("/produtos/") ? "video_products"
    : pagePath.startsWith("/privacy/") ? "privacy"
    : "other");
  const pageContext = { page_path: pagePath, page_type: pageType };
  if (document.body.dataset.videoSlug) pageContext.video_slug = document.body.dataset.videoSlug;
  const loadStates = new Map();
  let setGoogleConsent = null;

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
      return memoryConsent ?? localStorage.getItem(consentKey);
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
    if (!productionHost || unsupported || consent() !== "granted") {
      return;
    }
    if (analytics && logAnalyticsEvent) {
      logAnalyticsEvent(analytics, name, { ...pageContext, ...params });
    } else {
      // Queued until the Firebase SDK finishes loading, flushed in
      // syncCollectionState so early clicks aren't lost.
      if (pendingEvents.length < 50) pendingEvents.push({ name, params: { ...pageContext, ...params } });
    }
  }

  function syncCollectionState() {
    if (!analytics) {
      return;
    }
    const granted = consent() === "granted";
    setCollectionEnabled(analytics, granted);
    setGoogleConsent({ analytics_storage: granted ? "granted" : "denied",
      ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
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
    if (!productionHost || unsupported || consent() !== "granted") {
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

      // Consent can change while imports or isSupported() are pending.
      if (consent() !== "granted") return;
      setGoogleConsent = firebaseAnalyticsModule.setConsent;
      setGoogleConsent({ analytics_storage: "granted", ad_storage: "denied",
        ad_user_data: "denied", ad_personalization: "denied" });
      const firebaseApp = firebaseAppModule.initializeApp(firebaseConfig);
      analytics = firebaseAnalyticsModule.initializeAnalytics(firebaseApp, {
        config: { allow_google_signals: false, allow_ad_personalization_signals: false }
      });
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
    const previous = consent();
    storeConsent(value);
    if (cookieBanner) {
      cookieBanner.hidden = true;
    }
    if (value === "granted") {
      initializeAnalytics();
      // Report the current rendered state, never replay pre-consent clicks.
      if (previous !== "granted") {
        for (const state of loadStates.values()) trackEvent(state.name, state.params);
      }
    } else {
      pendingEvents.length = 0;
      if (analytics) {
        syncCollectionState();
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

  function trackLoadState(key, name, params = {}) {
    loadStates.set(key, { name, params });
    trackEvent(name, params);
  }

  function linkPlacement(link) {
    if (link.closest(".site-nav")) return "header";
    if (link.closest(".footer")) return "footer";
    if (link.closest(".hub-grid")) return "home_cards";
    return "content";
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const placement = linkPlacement(link);
    if (link.dataset.socialLink) {
      const url = new URL(link.href);
      trackEvent("social_link_click", {
        link_name: link.dataset.socialLink, link_placement: placement,
        destination_url: url.origin + url.pathname
      });
    } else if (link.protocol === "mailto:") {
      trackEvent("contact_click", { contact_method: "email", link_placement: placement });
    } else if (link.origin === window.location.origin && !link.matches(".setup-cta")) {
      trackEvent("navigation_click", { destination_path: link.pathname, link_placement: placement });
    }
  });

  // Apply revocation from another tab without waiting for the next page load.
  window.addEventListener("storage", (event) => {
    if (event.key !== consentKey && event.key !== null) return;
    memoryConsent = null;
    if (consent() === "granted") {
      initializeAnalytics();
    } else {
      pendingEvents.length = 0;
      if (analytics) syncCollectionState();
    }
  });

  if (cookieBanner) {
    const storedConsent = consent();
    if (storedConsent === "granted") {
      initializeAnalytics();
    } else if (storedConsent !== "denied") {
      cookieBanner.hidden = false;
    }
  }

  return { trackEvent, trackLoadState };
})();
