/** Apply each experience to the matching content zone and its direct child. */
export function applyPersonalization(container, decisions = []) {
  decisions.forEach((decision) => {
    const selector = decision?.contentZone?.selector;
    const experience = decision?.attributes?.experienceKey;
    if (typeof selector !== 'string' || !selector.trim()
      || typeof experience !== 'string' || !experience.trim()) return;

    let zone;
    try {
      zone = container.querySelector(selector);
    } catch (error) {
      console.warn('Invalid personalization content zone selector:', selector, error);
      return;
    }
    if (!zone) return;
    const children = Array.from(zone.children);
    const selected = children.find((child) => child.id === experience.trim());
    if (!selected) return;
    children.filter((child) => child.id).forEach((child) => {
      child.hidden = child !== selected;
    });
  });
}

/** Receive enriched sitemap decisions, including decisions published before connection. */
export function connectToDecisions(apply, containerSelector = 'body', host = window) {
  if (typeof apply !== 'function') throw new Error('A personalization renderer is required');
  const container = host.document.querySelector(containerSelector);
  if (!container) throw new Error(`Personalization container not found: ${containerSelector}`);
  apply(container);

  const onDecisions = (event) => {
    if (Array.isArray(event.detail)) apply(container, event.detail);
  };
  host.addEventListener('personalization:decisions', onDecisions);
  if (Array.isArray(host.contentDecisionsFromSitemapProvider)) {
    apply(container, host.contentDecisionsFromSitemapProvider);
  }
  return () => host.removeEventListener('personalization:decisions', onDecisions);
}
