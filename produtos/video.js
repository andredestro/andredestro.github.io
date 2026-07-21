const videoSlug = document.body.dataset.videoSlug;
const videoTitle = document.querySelector("#video-title");
const videoDescription = document.querySelector("#video-description");
const videoProducts = document.querySelector("#video-products");

async function renderVideoProducts() {
  try {
    const [productsResponse, videosResponse] = await Promise.all([
      fetch("/data/products.json"),
      fetch("/data/videos.json")
    ]);

    if (!productsResponse.ok || !videosResponse.ok) {
      throw new Error("Não foi possível carregar os produtos.");
    }

    const [productsData, videosData] = await Promise.all([
      productsResponse.json(),
      videosResponse.json()
    ]);
    const video = videosData.videos[videoSlug];
    if (!video) {
      throw new Error(`Vídeo não encontrado: ${videoSlug}`);
    }

    const productsById = ProductUI.indexProducts(productsData.products);
    const products = video.products
      .map((productId) => productsById.get(productId))
      .filter((product) => product && ProductUI.hasLinks(product));

    videoTitle.textContent = video.title;
    videoDescription.textContent = video.description;
    videoProducts.replaceChildren(...products.map(ProductUI.createProductCard));
  } catch (error) {
    videoProducts.textContent = "Não foi possível carregar os produtos agora.";
    console.error(error);
  }
}

renderVideoProducts();
