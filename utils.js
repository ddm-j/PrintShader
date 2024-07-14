// Shader Loader
async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load shader from ${url}: ${response.statusText}`);
    }
    return response.text();
  }

  export { loadShader };