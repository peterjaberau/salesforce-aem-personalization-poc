/** Show the selected experience for each marked content element. */
export function applyPersonalization(element, decisions, points) {
  element.querySelectorAll("[data-personalization-point][data-personalization-experience]").forEach((target) => {
    const point = target.dataset.personalizationPoint.trim()
    if (points && !points.has(point)) return
    const experience = target.dataset.personalizationExperience.trim()
    const selected = decisions ? decisions.get(point) : "DEFAULT"
    target.hidden = experience !== selected
  })
}

export function applyPersonalizationForPointWrapper(element, decisions, points) {
  element.querySelectorAll("[data-personalization-point]").forEach((wrapper) => {
    const point = wrapper.dataset.personalizationPoint.trim()
    if (points && !points.has(point)) return
    const selected = decisions ? decisions.get(point) : "DEFAULT"
    Array.from(wrapper.children).forEach((child) => {
      if (!child.hasAttribute("data-personalization-experience")) return
      child.hidden = child.dataset.personalizationExperience.trim() !== selected
    })
  })
}

/** Listen for sitemap decisions and apply them with the supplied renderer. */
export function connectToDecisionProvider(apply, containerSelector = "body", host = window) {
  if (typeof apply !== "function") throw new Error("A personalization renderer is required")
  const container = host.document.querySelector(containerSelector)
  if (!container) throw new Error(`Personalization container not found: ${containerSelector}`)
  apply(container)

  const onDecisions = (event) => {
    if (event.detail instanceof Map) apply(container, event.detail)
  }
  host.addEventListener("personalization:sitemap-decisions", onDecisions)
  if (host.decisionFromSitemapProvider instanceof Map) {
    apply(container, host.decisionFromSitemapProvider)
  }
  return () => host.removeEventListener("personalization:sitemap-decisions", onDecisions)
}

/** Request decisions and optionally apply them with the supplied rendering function. */
export async function requestDecisionsForPoints(points, apply, containerSelector = "body", host = window) {
  try {
    if (!Array.isArray(points) || !points.length || points.some((point) => typeof point !== "string" || !point.trim())) {
      throw new Error("At least one valid personalization point name is required")
    }
    if (apply !== undefined && typeof apply !== "function") {
      throw new Error("The personalization renderer must be a function")
    }
    const requested = new Set(points.map((point) => point.trim()))
    let container
    if (apply) {
      container = host.document.querySelector(containerSelector)
      if (!container) throw new Error(`Personalization container not found: ${containerSelector}`)
      apply(container, undefined, requested)
    }
    if (!host.salesforcePersonalizationReady) {
      await new Promise((resolve) => {
        host.addEventListener("personalization:salesforce-ready", resolve, { once: true })
      })
    }
    const sdk = host.getSalesforceInteractions?.()
    if (typeof sdk?.Personalization?.fetch !== "function") {
      throw new Error("Salesforce Personalization SDK is not available")
    }
    const response = await sdk.Personalization.fetch([...requested])
    if (!Array.isArray(response?.personalizations)) {
      throw new Error("Unexpected Salesforce personalization response")
    }
    const decisions = new Map()
    response.personalizations.forEach((item) => {
      const point = item?.personalizationPointName
      const experience = item?.attributes?.experienceKey
      if (requested.has(point) && typeof experience === "string" && experience.trim()) {
        decisions.set(point, experience.trim())
      }
    })
    if (apply) apply(container, decisions, new Set(decisions.keys()))
    return decisions
  } catch (error) {
    console.warn("Unable to request personalization decisions.", error)
    return undefined
  }
}
