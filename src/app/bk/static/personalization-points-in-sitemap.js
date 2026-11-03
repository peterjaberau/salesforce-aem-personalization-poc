/** Show the selected experience for each marked content element. */
export function applyPersonalization(element, decisions) {
  element.querySelectorAll('[data-personalization-point][data-personalization-experience]')
    .forEach((target) => {
      const point = target.dataset.personalizationPoint.trim();
      const experience = target.dataset.personalizationExperience.trim();
      const selected = decisions ? decisions.get(point) : 'DEFAULT';
      target.hidden = experience !== selected;
    });
}

/** Receive sitemap decisions whether they arrive before or after connection. */
export function connectDecisionFromSitemapProvider(element, host = window) {
  applyPersonalization(element);

  const onDecisions = (event) => {
    if (event.detail instanceof Map) applyPersonalization(element, event.detail);
  };
  host.addEventListener('personalization:sitemap-decisions', onDecisions);
  if (host.decisionFromSitemapProvider instanceof Map) {
    applyPersonalization(element, host.decisionFromSitemapProvider);
  }
  return () => host.removeEventListener('personalization:sitemap-decisions', onDecisions);
}

/** Request a single point and return Salesforce's response without changing the page. */
export async function requestDecisionForPoint(point, host = window) {
  if (typeof point !== 'string' || !point.trim()) {
    throw new Error('A personalization point name is required');
  }
  const sdk = host.getSalesforceInteractions?.();
  if (typeof sdk?.Personalization?.fetch !== 'function') {
    throw new Error('Salesforce Personalization SDK is not available');
  }
  return sdk.Personalization.fetch([point.trim()]);
}
