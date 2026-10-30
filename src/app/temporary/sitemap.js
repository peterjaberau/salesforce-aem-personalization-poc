
var SI = getSalesforceInteractions();
SI.setLoggingLevel("debug")
SI.init({
  consents: [
    {
      purpose: "Tracking",
      provider: "POC",
      status: "Opt In",
    },
  ],
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
});