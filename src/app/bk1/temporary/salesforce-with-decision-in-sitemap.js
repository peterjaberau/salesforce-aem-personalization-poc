// When regenerating, restore the custom setup call after SI.initSitemap.
/* eslint-disable */
var SI = getSalesforceInteractions()
SI.setLoggingLevel("debug")
SI.init({
  consents: [
    {
      purpose: "Tracking",
      provider: "POC",
      status: "Opt In",
    },
  ],
  personalization: {
    dataspace: "default",
  },
}).then(() => {
  const sitemapConfig = {
    pageTypeDefault: {
      name: "default",
      eventType: "userEngagement",
    },
    pageTypes: [
      {
        name: "Home page",
        isMatch: () => window.location.pathname === "/" || /\/index\.html$/.test(window.location.pathname),
        personalizationPoints: ["HOME_HERO", "HOME_FEATURES", "HOME_OFFERS", "HOME_PLANS"],
        interaction: {
          name: "Page View - Home",
          eventType: "userEngagement",
        },
      },
      {
        name: "Request point decision page",
        isMatch: () => /\/index-request-point-decission(?:\.html)?\/?$/.test(window.location.pathname),
        interaction: {
          name: "Page View - Request point decision",
          eventType: "userEngagement",
        },
      },
      {
        name: "Point as wrapper page",
        isMatch: () => /\/index-point-as-wrapper(?:\.html)?\/?$/.test(window.location.pathname),
        personalizationPoints: ["HOME_HERO", "HOME_FEATURES", "HOME_OFFERS", "HOME_PLANS"],
        interaction: {
          name: "Page View - Point as wrapper",
          eventType: "userEngagement",
        },
      },
      {
        name: "Points in sitemap page",
        isMatch: () => /\/index-points-in-sitemap(?:\.html)?\/?$/.test(window.location.pathname),
        personalizationPoints: ["HOME_HERO", "HOME_FEATURES", "HOME_OFFERS", "HOME_PLANS"],
        interaction: {
          name: "Page View - Points in sitemap",
          eventType: "userEngagement",
        },
      },
    ],
  }

  // Diagnostics only: inspect SDK capabilities and observe sitemap lifecycle events.
  try {
    console.log('[Salesforce diagnostics] SDK instance:', SI);
    console.log('[Salesforce diagnostics] SDK properties:', Object.keys(SI));
    console.log('[Salesforce diagnostics] SDK custom event names:', SI.CustomEvents);
    console.log('[Salesforce diagnostics] Sitemap result API availability:', {
      sdk: typeof SI.getSitemapResult,
      mcis: typeof SI.mcis?.getSitemapResult,
    });
    [
      SI.CustomEvents?.OnInitSitemap,
      SI.CustomEvents?.OnPageMatchStatusUpdated,
      'salesforce:onInitSitemap',
      'salesforce:onPageMatchStatusUpdated',
      'interactions:onInitSitemap',
      'interactions:onPageMatchStatusUpdated',
    ].filter((name, index, names) => typeof name === 'string' && names.indexOf(name) === index)
      .forEach((name) => document.addEventListener(name, (event) => {
        console.log('[Salesforce diagnostics] SDK event:', name, event.detail);
      }));
  } catch (error) {
    console.warn('[Salesforce diagnostics] Could not set up diagnostics:', error);
  }

  SI.initSitemap(sitemapConfig)
  // Let pages make on-demand requests after Salesforce initialization completes.
  window.salesforcePersonalizationReady = true
  window.dispatchEvent(new Event("personalization:salesforce-ready"))
  // Custom connection: restore this call after regenerating the sitemap.
  registerDecisionFromSitemapProvider(sitemapConfig)
})
/* eslint-enable */

// Publish the matched page's configured points without a request from the website.
async function registerDecisionFromSitemapProvider(sitemapConfig) {
  const page = sitemapConfig.pageTypes.find((pageType) => pageType.isMatch());
  console.log('[Salesforce diagnostics] Page selected by custom lookup:', page?.name, page);
  if (!Array.isArray(page?.personalizationPoints) || !page.personalizationPoints.length) return;
  try {
    const points = page.personalizationPoints;
    console.log('[Salesforce SDK] Request points:', points);
    const response = await SI.Personalization.fetch(points);
    console.log('[Salesforce SDK] Raw decision response:', response);
    if (!Array.isArray(response?.personalizations)) {
      throw new Error('Unexpected Salesforce personalization response');
    }
    const requested = new Set(points);
    const decisions = new Map();
    response.personalizations.forEach((item) => {
      const point = item?.personalizationPointName;
      const experience = item?.attributes?.experienceKey;
      if (requested.has(point) && typeof experience === 'string' && experience.trim()) {
        decisions.set(point, experience.trim());
      }
    });
    window.decisionFromSitemapProvider = decisions;
    window.dispatchEvent(new CustomEvent('personalization:sitemap-decisions', { detail: decisions }));
  } catch (error) {
    console.warn('Sitemap personalization decision request failed', error);
  }
}
