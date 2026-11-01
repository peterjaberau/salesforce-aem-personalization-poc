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
  const currentURL = new URL(window.location.href)

  const sitemapConfig = {
    pageTypeDefault: {
      name: "default",
      eventType: "userEngagement",
    },
    pageTypes: [
      {
        name: "Home page",
        isMatch: () =>
          ["/", "/salesforce-aem-personalization-poc/src/app/static/home.html"].includes(window.location.pathname),
        interaction: {
          name: "Page View - Home",
          eventType: "userEngagement",
        },
      },
      {
        name: "Features page",
        isMatch: () => window.location.pathname === "/features",
        interaction: {
          name: "Page View - Features",
          eventType: "userEngagement",
        },
      },
    ],
  }

  SI.initSitemap(sitemapConfig)
  // Custom connection: restore this call after regenerating the sitemap.
  registerDecisionProvider()
})
/* eslint-enable */

// Keep this function when regenerating the sitemap.
function registerDecisionProvider() {
  // The consumer app bridge uses this provider to ask Salesforce for decisions.
  window.decisionProvider = {
    async getDecisions(points) {
      if (!points.length) return new Map();
      // eslint-disable-next-line no-console
      console.log('[Salesforce SDK] Request points:', points);
      const response = await SI.Personalization.fetch(points);
      // eslint-disable-next-line no-console
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
      return decisions;
    },
  };
  window.dispatchEvent(new Event('personalization:decision-source-ready'));
}
