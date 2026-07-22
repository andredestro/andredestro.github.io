const ProductUI = (() => {
  const storeNames = {
    amazonEs: "Amazon ES",
    amazonBr: "Amazon BR",
    mercadoLivre: "Mercado Livre"
  };

  const iconPaths = {
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    dock: '<rect x="3" y="7" width="18" height="10" rx="3"/><path d="M7 12h.01M11 12h6"/>',
    light: '<path d="M4 8h16M7 8l2-4h6l2 4M12 8v12M8 20h8"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h4M7 16h10"/>',
    mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v6M12 6h.01"/>',
    headphones: '<path d="M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 1 2-2h2v8H6a2 2 0 0 1-2-2v-4ZM20 14a2 2 0 0 0-2-2h-2v8h2a2 2 0 0 0 2-2v-4Z"/>',
    charger: '<rect x="5" y="3" width="14" height="18" rx="4"/><path d="M9 3V1M15 3V1M13 8l-3 5h4l-3 5"/>',
    "pet-feeder": '<path d="M6 4h12l-1 9H7L6 4Z"/><path d="M4 20h16l-2-7H6l-2 7ZM9 8h6"/>',
    fountain: '<path d="M8 18c0-3 4-5 4-9 0 4 4 6 4 9a4 4 0 0 1-8 0Z"/><path d="M5 5h14M7 5v3h10V5"/>',
    switch: '<rect x="4" y="3" width="16" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><path d="M12 8V5"/>',
    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-1-4 0-7 2-7 3 0 4 4 1 8M14 13c4 1 6 3 5 5-2 3-6 2-7-2M10 14c-3 3-6 3-7 1-1-3 2-6 6-4"/>',
    trimmer: '<path d="M8 3h8l-1 5H9L8 3ZM9 8h6l1 13H8L9 8Z"/><path d="M10 3V1M14 3V1M11 16h2"/>',
    ethernet: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 11h2v3H7zM11 11h2v3h-2zM15 11h2v3h-2z"/>',
    cable: '<path d="M7 4v5a5 5 0 0 0 10 0V6M4 2h6v4H4zM14 2h6v4h-6zM6 6v3"/>',
    tv: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m9 2 3 3 3-3M10 15h4"/>',
    default: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12h8M12 8v8"/>'
  };

  function createIcon(iconName) {
    const icon = document.createElement("div");
    icon.className = "product-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none">${iconPaths[iconName] ?? iconPaths.default}</svg>`;
    return icon;
  }

  function createStoreLink(store, url, product) {
    const link = document.createElement("a");
    link.className = "store-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener sponsored";
    link.textContent = storeNames[store] ?? store;
    link.setAttribute("aria-label", `${storeNames[store] ?? store}: ${product.name}`);
    link.addEventListener("click", () => {
      SiteAnalytics.trackEvent("product_link_click", {
        product_id: product.id,
        product_name: product.name,
        store,
        page_path: window.location.pathname
      });
    });
    return link;
  }

  function hasLinks(product) {
    return Object.values(product.links ?? {}).some(Boolean);
  }

  function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";

    const content = document.createElement("div");
    content.className = "product-content";

    const name = document.createElement("h3");
    name.className = "product-name";
    name.textContent = product.name;

    const linksContainer = document.createElement("div");
    linksContainer.className = "store-links";
    const links = Object.entries(product.links ?? {}).filter(([, url]) => url);
    linksContainer.append(...links.map(([store, url]) => createStoreLink(store, url, product)));

    content.append(name, linksContainer);
    card.append(createIcon(product.icon), content);
    return card;
  }

  function indexProducts(products) {
    return new Map(products.map((product) => [product.id, product]));
  }

  return { createProductCard, hasLinks, indexProducts };
})();
