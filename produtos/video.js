const videoSlug = document.body.dataset.videoSlug;
const videoTitle = document.querySelector("#video-title");
const videoDescription = document.querySelector("#video-description");
const videoProducts = document.querySelector("#video-products");

function getProducts(productIds, productsById) {
  return productIds
    .map((productId) => productsById.get(productId))
    .filter((product) => product && ProductUI.hasLinks(product));
}

function createSection(section, productsById) {
  const products = getProducts(section.products, productsById);
  if (products.length === 0) return null;

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

async function renderVideoProducts() {
  try {
    const [productsResponse, videosResponse] = await Promise.all([
      fetch("/data/products.json"),
      fetch("/data/videos.json")
    ]);

    if (!productsResponse.ok || !videosResponse.ok) {
      throw new Error("Could not load the products.");
    }

    const [productsData, videosData] = await Promise.all([
      productsResponse.json(),
      videosResponse.json()
    ]);
    const video = videosData.videos[videoSlug];
    if (!video) {
      throw new Error(`Video not found: ${videoSlug}`);
    }

    const productsById = ProductUI.indexProducts(productsData.products);
    if (video.sections) {
      const sections = video.sections
        .map((section) => createSection(section, productsById))
        .filter(Boolean);
      videoProducts.classList.remove("products-grid", "video-products");
      videoProducts.replaceChildren(...sections);
    } else {
      const products = getProducts(video.products, productsById);
      videoProducts.replaceChildren(...products.map(ProductUI.createProductCard));
    }

    videoTitle.textContent = video.title;
    videoDescription.textContent = video.description;
    SiteAnalytics.trackLoadState("products", "products_load_success", {
      section_count: video.sections?.length ?? 0,
      product_count: videoProducts.querySelectorAll(".product-card").length
    });
  } catch (error) {
    videoProducts.textContent = "Unable to load the products right now.";
    SiteAnalytics.trackLoadState("products", "products_load_error", { error_code: "video_products_load_failed" });
    console.error(error);
  }
}

document.querySelector(".setup-cta")?.addEventListener("click", () => {
  SiteAnalytics.trackEvent("setup_cta_click", {
    video_slug: videoSlug,
    link_placement: "content",
    page_path: window.location.pathname
  });
});

renderVideoProducts();
