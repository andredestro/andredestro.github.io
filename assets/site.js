const firebaseConfig = {
  apiKey: "AIzaSyDI9wEkZE7wLoTtYZd_n6fr9g8S1vLmP8w",
  authDomain: "andredestro-github-io.firebaseapp.com",
  projectId: "andredestro-github-io",
  storageBucket: "andredestro-github-io.firebasestorage.app",
  messagingSenderId: "506254720829",
  appId: "1:506254720829:web:df6f930fa0c1d387a60f54",
  measurementId: "G-57VRNK7NQQ"
};

const analyticsConsentKey = "andre_destro_analytics_consent";
const appStoreProviderToken = "75035800";
const appStoreCampaignToken = "github_io";
const appsContainer = document.querySelector("#apps");
const cookieBanner = document.querySelector("#cookie-banner");
const acceptAnalyticsButton = document.querySelector("#accept-analytics");
const declineAnalyticsButton = document.querySelector("#decline-analytics");
const cookieSettingsButton = document.querySelector("#cookie-settings");

let analytics = null;
let analyticsReady = false;
let logAnalyticsEvent = null;
let renderedAppCount = null;

function analyticsConsent() {
  try {
    return localStorage.getItem(analyticsConsentKey);
  } catch {
    return "denied";
  }
}

function showCookieBanner() {
  cookieBanner.hidden = false;
}

function hideCookieBanner() {
  cookieBanner.hidden = true;
}

function setAnalyticsConsent(value) {
  try {
    localStorage.setItem(analyticsConsentKey, value);
  } catch {
    if (value !== "granted") {
      hideCookieBanner();
      return;
    }
  }

  hideCookieBanner();

  if (value === "granted") {
    initializeAnalytics();
  } else {
    analytics = null;
    logAnalyticsEvent = null;
    analyticsReady = false;
  }
}

function trackEvent(name, params = {}) {
  if (analytics && logAnalyticsEvent) {
    logAnalyticsEvent(analytics, name, params);
  }
}

function trackInitialAnalyticsEvents() {
  trackEvent("portfolio_home_view", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname
  });

  if (renderedAppCount !== null) {
    trackEvent("apps_load_success", {
      app_count: renderedAppCount
    });
  }
}

async function initializeAnalytics() {
  if (analyticsReady || analyticsConsent() !== "granted") {
    return;
  }

  try {
    const [firebaseAppModule, firebaseAnalyticsModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js")
    ]);

    const supported = await firebaseAnalyticsModule.isSupported();
    if (!supported) {
      analyticsReady = true;
      return;
    }

    const firebaseApp = firebaseAppModule.initializeApp(firebaseConfig);
    analytics = firebaseAnalyticsModule.getAnalytics(firebaseApp);
    logAnalyticsEvent = firebaseAnalyticsModule.logEvent;
    analyticsReady = true;
    trackInitialAnalyticsEvents();
  } catch (error) {
    analyticsReady = true;
    console.warn("Analytics unavailable.", error);
  }
}

function appStoreCampaignUrl(urlString) {
  const url = new URL(urlString);
  url.searchParams.set("pt", appStoreProviderToken);
  url.searchParams.set("ct", appStoreCampaignToken);
  url.searchParams.set("mt", "8");
  return url.toString();
}

function createAppCard(app) {
  const appStoreUrl = appStoreCampaignUrl(app.appStoreUrl);
  const card = document.createElement("div");
  card.className = "card";

  const cardLeft = document.createElement("div");
  cardLeft.className = "card-left";

  const icon = document.createElement("img");
  icon.className = "app-icon";
  icon.src = app.iconUrl;
  icon.alt = `${app.name} icon`;
  icon.loading = "lazy";

  const appInfo = document.createElement("div");
  appInfo.className = "app-info";

  const title = document.createElement("div");
  title.className = "app-title";
  title.textContent = app.name;

  const description = document.createElement("div");
  description.className = "app-desc";
  description.textContent = app.subtitle;

  const button = document.createElement("a");
  button.className = "btn";
  button.href = appStoreUrl;
  button.target = "_blank";
  button.rel = "noopener";
  button.textContent = "Download";
  button.addEventListener("click", () => {
    trackEvent("app_download_click", {
      app_id: app.id,
      app_name: app.name,
      campaign_token: appStoreCampaignToken,
      destination_url: appStoreUrl
    });
  });

  appInfo.append(title, description);
  cardLeft.append(icon, appInfo);
  card.append(cardLeft, button);

  return card;
}

async function renderApps() {
  try {
    const response = await fetch("./apps.json");
    if (!response.ok) {
      throw new Error("Could not load apps.json");
    }

    const data = await response.json();
    renderedAppCount = data.apps.length;
    appsContainer.replaceChildren(...data.apps.map(createAppCard));

    if (analyticsReady) {
      trackEvent("apps_load_success", {
        app_count: renderedAppCount
      });
    }
  } catch (error) {
    appsContainer.textContent = "Unable to load apps.";
    trackEvent("apps_load_error", {
      message: error.message
    });
    console.error(error);
  }
}

document.querySelectorAll("[data-social-link]").forEach((link) => {
  link.addEventListener("click", () => {
    trackEvent("social_link_click", {
      link_name: link.dataset.socialLink,
      destination_url: link.href
    });
  });
});

acceptAnalyticsButton.addEventListener("click", () => {
  setAnalyticsConsent("granted");
});

declineAnalyticsButton.addEventListener("click", () => {
  setAnalyticsConsent("denied");
});

cookieSettingsButton.addEventListener("click", () => {
  showCookieBanner();
});

if (analyticsConsent() === "granted") {
  initializeAnalytics();
} else if (analyticsConsent() !== "denied") {
  showCookieBanner();
}

renderApps();
