const sitemapConfig = {
  pageTypeDefault: {
    name: "default",
  },

  pageTypes: [
    {
      name: "HOME",
      isMatch: () => window.location.pathname === "/",
      interaction: {
        name: "View Home Page",
      },
    },

    {
      name: "PLANS",
      isMatch: () => window.location.pathname === "/plans",
      interaction: {
        name: "View Plans Page",
      },
    },

    {
      name: "FEATURES",
      isMatch: () => window.location.pathname === "/features",
      interaction: {
        name: "View Features Page",
      },
    },
  ],
}

SalesforceInteractions.initSitemap(sitemapConfig)
