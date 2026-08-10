/**
 * DataLoader utility for fetching & managing productsData
 */
export async function loadProductsData() {
  if (window.PRODUCTS_DATA && window.PRODUCTS_DATA.length > 0) {
    return window.PRODUCTS_DATA;
  }
  try {
    const response = await fetch('./data/productsData.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn("Could not fetch productsData.json directly via HTTP, using fallback dataset:", error);
    return window.__EMBEDDED_PRODUCTS_DATA__ || [];
  }
}
