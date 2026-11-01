/** Salesforce Website Connector beacon. The sitemap is managed in Salesforce. */
export const SALESFORCE_SDK_URL = 'https://cdn.c360a.salesforce.com/beacon/c360a/d6abf9f0-ecea-4884-ab38-0b4ee6bca246/scripts/c360a.min.js';

let sdkLoadPromise;

/**
 * Load the Salesforce beacon once. Resolving means the script loaded; SDK
 * initialization and decision provider registration happen in the sitemap.
 * Call this from the site's chosen loading or consent integration point.
 * @returns {Promise<void>} Resolves when the beacon script finishes loading
 */
export function loadSalesforceSdk() {
  if (typeof window.getSalesforceInteractions === 'function') return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    const existing = [...document.scripts].find((script) => script.src === SALESFORCE_SDK_URL);
    const script = existing || document.createElement('script');
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => {
      if (!existing) script.remove();
      reject(new Error('Salesforce SDK could not be loaded'));
    }, { once: true });
    if (!existing) {
      script.async = true;
      script.src = SALESFORCE_SDK_URL;
      document.head.append(script);
    }
  }).catch((error) => {
    sdkLoadPromise = undefined;
    throw error;
  });
  return sdkLoadPromise;
}
