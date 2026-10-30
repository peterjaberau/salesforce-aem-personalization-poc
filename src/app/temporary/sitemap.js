/**
 * SDK setup and temporary fragment hiding.
 */
var SI = getSalesforceInteractions()
SI.setLoggingLevel("debug")

const debugPrefix = "[Salesforce Personalization]"

/**
 * SDK event logging.
 *
 * These logs show the event payload Salesforce is sending and how the
 * sitemap evaluated the configured page types.
 */
document.addEventListener("salesforce:OnEventSend", (event) => {
  console.debug(`${debugPrefix} Event sent`, event.detail)
})

document.addEventListener("salesforce:OnPageMatchStatusUpdated", (event) => {
  console.debug(`${debugPrefix} Page match status`, event.detail)
})

/**
 * Prepare temporary CSS before SDK initialization so fragment sections
 * do not appear until Salesforce returns the selected decision.
 */
const fragmentPersonalization = prepareFragmentPersonalization()

/**
 * SDK initialization.
 */
console.info(`${debugPrefix} Initializing SDK`, {
  url: window.location.href,
  pathname: window.location.pathname,
  utmSource: new URLSearchParams(window.location.search).get("utm_source"),
})

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
  console.info(`${debugPrefix} SDK initialized`)

  /**
   * Sitemap configuration.
   */
  const sitemapConfig = {
    pageTypeDefault: {
      name: "default",
      eventType: "userEngagement",
    },
    pageTypes: [
      {
        name: "Home page",
        decisionPoint: "HOME_AEM_STATIC_POC",
        isMatch: () =>
          ["/", "/salesforce-aem-personalization-poc/src/app/static/home.html"].includes(window.location.pathname),
        interaction: {
          name: "Page View - Home",
          eventType: "userEngagement",
        },
      },
      {
        name: "Features page",
        // decisionPoint: "FEATURES_AEM_STATIC_POC",
        isMatch: () => window.location.pathname === "/features",
        interaction: {
          name: "Page View - Features",
          eventType: "userEngagement",
        },
      },
    ],
  }

  /**
   * Sitemap initialization and current-page matching.
   */
  SI.initSitemap(sitemapConfig)

  const matchedPageType = sitemapConfig.pageTypes.find((pageType) => pageType.isMatch())

  console.info(`${debugPrefix} Matched page type`, {
    name: matchedPageType?.name,
    decisionPoint: matchedPageType?.decisionPoint,
  })

  if (!matchedPageType?.decisionPoint) {
    console.warn(`${debugPrefix} No decision point configured for this page`)
    fragmentPersonalization.reveal()
    return
  }

  /**
   * Decision request and response handling.
   *
   * This logs the exact decision point supplied to fetch(), its raw response,
   * and the experienceKey/fragments extracted from that response.
   */
  console.info(`${debugPrefix} Requesting decision`, {
    decisionPoint: matchedPageType.decisionPoint,
  })

  SI.Personalization.fetch([matchedPageType.decisionPoint])
    .then((response) => {
      console.debug(`${debugPrefix} Raw decision response`, response)

      const decision = findDecisionOutput(response)

      if (!decision) {
        throw new Error(`No decision returned for ${matchedPageType.decisionPoint}`)
      }

      console.info(`${debugPrefix} Parsed decision output`, {
        experienceKey: decision.experienceKey,
        fragments: decision.fragments,
      })

      const enabledFragments = new Set(
        decision.fragments
          .split(",")
          .map((fragment) => fragment.trim())
          .filter(Boolean),
      )

      /**
       * Fragment rendering and verification logging.
       */
      const renderDecision = () => {
        document.documentElement.dataset.experienceKey = decision.experienceKey

        document.querySelectorAll("section[data-fragment]").forEach((section) => {
          section.hidden = !enabledFragments.has(section.dataset.fragment)
        })

        console.table(
          [...document.querySelectorAll("section[data-fragment]")].map((section) => ({
            fragment: section.dataset.fragment,
            visible: !section.hidden,
          })),
        )

        fragmentPersonalization.reveal()
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderDecision, {
          once: true,
        })
      } else {
        renderDecision()
      }
    })
    .catch((error) => {
      console.error(`${debugPrefix} Decision request failed`, error)
      fragmentPersonalization.reveal()
    })
})

/**
 * Temporary visibility helper.
 */
function prepareFragmentPersonalization() {
  const style = document.createElement("style")

  style.textContent = "section[data-fragment] { visibility: hidden; }"

  document.head.appendChild(style)

  return {
    reveal: () => style.remove(),
  }
}

/**
 * Extract the decision output from a potentially nested response.
 */
function findDecisionOutput(value, visited = new Set()) {
  if (!value || typeof value !== "object" || visited.has(value)) {
    return null
  }

  visited.add(value)

  if (typeof value.experienceKey === "string" && typeof value.fragments === "string") {
    return value
  }

  for (const nestedValue of Object.values(value)) {
    const decision = findDecisionOutput(nestedValue, visited)

    if (decision) {
      return decision
    }
  }

  return null
}
