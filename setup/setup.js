const setupContainer = document.querySelector("#setup-products");

function createSection(section, productsById) {
  const products = section.products
    .map((productId) => productsById.get(productId))
    .filter((product) => product && ProductUI.hasLinks(product));

  if (products.length === 0) {
    return null;
  }

  const sectionElement = document.createElement("section");
  sectionElement.className = "setup-section";

  const title = document.createElement("h2");
  title.className = "setup-section-title";
  title.textContent = section.title;

  const grid = document.createElement("div");
  grid.className = "products-grid";
  grid.append(...products.map(ProductUI.createProductCard));

  sectionElement.append(title, grid);
  return sectionElement;
}

async function renderSetup() {
  try {
    const [productsResponse, setupResponse] = await Promise.all([
      fetch("/data/products.json"),
      fetch("/data/setup.json")
    ]);

    if (!productsResponse.ok || !setupResponse.ok) {
      throw new Error("Não foi possível carregar os produtos.");
    }

    const [productsData, setupData] = await Promise.all([
      productsResponse.json(),
      setupResponse.json()
    ]);
    const productsById = ProductUI.indexProducts(productsData.products);
    const sections = setupData.sections
      .map((section) => createSection(section, productsById))
      .filter(Boolean);
    setupContainer.replaceChildren(...sections);
  } catch (error) {
    setupContainer.textContent = "Não foi possível carregar o setup agora.";
    console.error(error);
  }
}

renderSetup();
