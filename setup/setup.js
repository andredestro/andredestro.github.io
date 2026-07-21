const setupContainer = document.querySelector("#setup-products");

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
  default: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12h8M12 8v8"/>'
};

function productIconName(productName) {
  const name = productName.toLocaleLowerCase("pt-BR");
  if (name.includes("monitor")) return name.includes("barra") ? "light" : "monitor";
  if (name.includes("dock")) return "dock";
  if (name.includes("teclado") || name.includes("keychron")) return "keyboard";
  if (name.includes("mouse") || name.includes("master")) return "mouse";
  if (name.includes("fone") || name.includes("sony") || name.includes("headphone")) return "headphones";
  if (name.includes("carregador") || name.includes("charger")) return "charger";
  return "default";
}

function createProductIcon(productName) {
  const icon = document.createElement("div");
  icon.className = "product-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none">${iconPaths[productIconName(productName)]}</svg>`;
  return icon;
}

function createStoreLink(store, url, productName) {
  const link = document.createElement("a");
  link.className = "store-link";
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener sponsored";
  link.textContent = storeNames[store] ?? store;
  link.setAttribute("aria-label", `${storeNames[store] ?? store}: ${productName}`);
  return link;
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const content = document.createElement("div");
  content.className = "product-content";

  const name = document.createElement("h3");
  name.className = "product-name";
  name.textContent = product.name;
  content.append(name);

  const links = Object.entries(product.links).filter(([, url]) => url);

  const linksContainer = document.createElement("div");
  linksContainer.className = "store-links";
  linksContainer.append(...links.map(([store, url]) => createStoreLink(store, url, product.name)));
  content.append(linksContainer);
  card.append(createProductIcon(product.name), content);
  return card;
}

function createSection(section) {
  const sectionElement = document.createElement("section");
  sectionElement.className = "setup-section";

  const title = document.createElement("h2");
  title.className = "setup-section-title";
  title.textContent = section.title;

  const grid = document.createElement("div");
  grid.className = "products-grid";
  const productsWithLinks = section.products.filter((product) => {
    return Object.values(product.links ?? {}).some(Boolean);
  });
  grid.append(...productsWithLinks.map(createProductCard));

  sectionElement.append(title, grid);
  return sectionElement;
}

async function renderSetup() {
  try {
    const response = await fetch("./products.json");
    if (!response.ok) {
      throw new Error("Não foi possível carregar os produtos.");
    }

    const data = await response.json();
    const sectionsWithProducts = data.sections.filter((section) => {
      return section.products.some((product) => Object.values(product.links ?? {}).some(Boolean));
    });
    setupContainer.replaceChildren(...sectionsWithProducts.map(createSection));
  } catch (error) {
    setupContainer.textContent = "Não foi possível carregar o setup agora.";
    console.error(error);
  }
}

renderSetup();
