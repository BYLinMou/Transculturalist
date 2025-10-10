// Load header component dynamically
document.addEventListener('DOMContentLoaded', async () => {
  const headerContainer = document.querySelector('header');
  if (headerContainer && !headerContainer.hasAttribute('data-loaded')) {
    try {
      const response = await fetch('/components/header.html');
      const html = await response.text();
      headerContainer.outerHTML = html;
      headerContainer.setAttribute('data-loaded', 'true');
    } catch (error) {
      console.error('Failed to load header:', error);
    }
  }
});
