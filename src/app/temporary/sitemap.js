/**
 * SDK setup and temporary fragment hiding.
 *
 * Hide all fragment sections immediately to prevent non-selected content
 * from flashing before Salesforce returns the decision.
 */
var SI = getSalesforceInteractions()
SI.setLoggingLevel("debug")

/**
 * Prepare temporary CSS before SDK initialization so fragment sections
 * do not appear until Salesforce returns the selected decision.
 */
const fragmentPersonalization = prepareFragmentPersonalization()

/**
 * SDK initialization.
 *
 * Initialize consent and the Personalization data space before using
 * sitemap tracking or requesting a Personalization decision.
 */
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
  /**
   * Sitemap configuration.
   *
   * decisionPoint is custom metadata used by this script. It associates
   * a matched sitemap page type with its Personalization decision point.
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
   * Page matching and decision request.
   *
   * Salesforce initializes normal sitemap tracking first. The current page
   * configuration is then used to request its corresponding decision point.
   */
  SI.initSitemap(sitemapConfig)

  const matchedPageType = sitemapConfig.pageTypes.find((pageType) => pageType.isMatch())

  if (!matchedPageType?.decisionPoint) {
    fragmentPersonalization.reveal()
    return
  }

  SI.Personalization.fetch([matchedPageType.decisionPoint])
    .then((response) => {
      /**
       * Decision response processing.
       *
       * A decision returns experienceKey and comma-separated fragments.
       * The helper supports nested Salesforce response structures.
       */
      const decision = findDecisionOutput(response)

      if (!decision) {
        throw new Error(`No decision returned for ${matchedPageType.decisionPoint}`)
      }

      const enabledFragments = new Set(
        decision.fragments
          .split(",")
          .map((fragment) => fragment.trim())
          .filter(Boolean),
      )

      /**
       * Fragment rendering.
       *
       * Keep only sections whose data-fragment value appears in the returned
       * fragments output. The selected experience remains inspectable on
       * the HTML element as data-experience-key.
       */
      const renderDecision = () => {
        document.documentElement.dataset.experienceKey = decision.experienceKey

        document.querySelectorAll("section[data-fragment]").forEach((section) => {
          section.hidden = !enabledFragments.has(section.dataset.fragment)
        })

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
      /**
       * Failure fallback.
       *
       * Preserve the original page if Salesforce decisioning is unavailable.
       */
      console.error("Unable to load the personalization decision.", error)
      fragmentPersonalization.reveal()
    })
})

/**
 * Temporarily hide all fragment sections before personalization resolves.
 *
 * @returns {{ reveal: () => void }} A function that restores visibility.
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
 * Find a nested Salesforce decision output with expected fields.
 *
 * @param {unknown} value Response value to inspect.
 * @param {Set<object>} visited Previously inspected objects.
 * @returns {{ experienceKey: string, fragments: string } | null}
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
