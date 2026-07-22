const appStoreProviderToken = "75035800";
const appStoreCampaignToken = "github_io";
const appsContainer = document.querySelector("#apps");

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
  button.textContent = "Get";
  button.addEventListener("click", () => {
    SiteAnalytics.trackEvent("app_download_click", {
      app_id: app.id,
      app_name: app.name,
      campaign_token: appStoreCampaignToken,
      destination_url: appStoreUrl
    });
  });

  appInfo.append(title, description);
  card.append(icon, appInfo, button);

  return card;
}

async function renderApps() {
  try {
    const response = await fetch("./apps.json");
    if (!response.ok) {
      throw new Error("Could not load apps.json");
    }

    const data = await response.json();
    appsContainer.replaceChildren(...data.apps.map(createAppCard));
    SiteAnalytics.trackEvent("apps_load_success", {
      app_count: data.apps.length
    });
  } catch (error) {
    appsContainer.textContent = "Unable to load apps.";
    SiteAnalytics.trackEvent("apps_load_error", {
      message: error.message
    });
    console.error(error);
  }
}

if (appsContainer) {
  renderApps();
}
