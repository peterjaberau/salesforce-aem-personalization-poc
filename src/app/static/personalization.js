/*
 * Call order:
 * 1. initializePersonalization(element) discovers targets and shows their DEFAULT experience.
 * 2. When ready, call personalization.connectDecisionProvider().
 * Alternatively, call personalization.apply(decisions) for a supplied decision map.
 * Initialization returns the same controller for repeated calls with the same element.
 *
 * Example: HOME_HERO is a point (a decision name).
 *
 * Mark each content alternative with its point and experience. A single DEFAULT
 * experience is shown initially until a decision is received:
 *
 * <div data-personalization-point="HOME_HERO"
 *      data-personalization-experience="DEFAULT">Default hero</div>
 * <div data-personalization-point="HOME_HERO"
 *      data-personalization-experience="BUSINESS">Business hero</div>
 *
 * state.contentVariants contains all discovered alternatives, for example:
 * - contentVariant: { point: HOME_HERO, experience: DEFAULT, start, end }
 * - contentVariant: { point: HOME_HERO, experience: BUSINESS, start, end }
 * Each contentVariant stores its point, experience, and the
 * comment markers used to track its current content.
 *
 * applyPersonalization collects those variants by point:
 * variantsByPoint
 * └── HOME_HERO
 *     ├── contentVariant: DEFAULT hero
 *     └── contentVariant: BUSINESS hero
 *
 * getVariantElements(contentVariant) returns the current DOM elements between
 * that variant's markers, including elements that replaced the original content.
 */

const selector = '[data-personalization-point][data-personalization-experience]';
const pageStates = new WeakMap();

/**
 * Call first, once the container exists and before applying a decision.
 * Discovers descendants with point and experience attributes, selects each unique DEFAULT, and
 * watches for inserted or replaced content. Repeated calls on the same element do nothing.
 * The supplied element itself is not considered a target.
 * @param {Element} element Container whose marked descendants will be personalized
 * @param {object} options Optional configuration, used only on the first call
 * @param {Window|EventTarget} options.host Host exposing decisionProvider (defaults to window)
 * @returns {object} Controller bound to this container
 */
export function initializePersonalization(element, { host = typeof window === 'undefined' ? undefined : window } = {}) {
  if (pageStates.has(element)) return pageStates.get(element).controller;
  const state = {
    contentVariants: [],
    seen: new WeakSet(),
    decisions: new Map(),
    evaluatedPoints: new Set(),
    listeners: new Set(),
    pointsKey: '',
  };
  let disconnectProvider;
  const controller = {
    // Apply a complete point-to-experience map without passing the element again.
    // eslint-disable-next-line no-use-before-define
    apply: (decisions) => applyPersonalization(element, decisions),
    // Connect when appropriate for the site; repeated calls do not create duplicate listeners.
    connectDecisionProvider() {
      if (!disconnectProvider) {
        // eslint-disable-next-line no-use-before-define
        const disconnect = connectDecisionProvider(element, host);
        let connected = true;
        disconnectProvider = () => {
          if (!connected) return;
          connected = false;
          disconnect();
          disconnectProvider = undefined;
        };
      }
      return disconnectProvider;
    },
  };
  state.controller = controller;
  pageStates.set(element, state);
  const update = () => {
    // The helpers are declared below to keep the entry point first.
    // eslint-disable-next-line no-use-before-define
    discoverPersonalizationPoints(element, state);
    // eslint-disable-next-line no-use-before-define
    renderPersonalization(state);
    const points = [...new Set(state.contentVariants.map((variant) => variant.point))].sort();
    const pointsKey = JSON.stringify(points);
    if (pointsKey !== state.pointsKey) {
      state.pointsKey = pointsKey;
      state.listeners.forEach((listener) => listener([...points]));
    }
  };
  update();
  new MutationObserver(update).observe(element, { childList: true, subtree: true });
  return controller;
}

/**
 * Subscribe to the distinct point names discovered inside an initialized container.
 * The listener receives the current names immediately and again when they change.
 * @param {Element} element The container passed to initializePersonalization
 * @param {Function} listener Called with an array of point names
 * @returns {Function} Removes the listener
 */
export function subscribePersonalizationPoints(element, listener) {
  const state = pageStates.get(element);
  if (!state) throw new Error('Initialize personalization before subscribing to points');
  state.listeners.add(listener);
  listener([...new Set(state.contentVariants.map((variant) => variant.point))].sort());
  return () => state.listeners.delete(listener);
}

/**
 * Find marked descendants and track their point and experience.
 * Called during initialization and after content changes; inserts comment markers
 * so replacements between them retain the original target's visibility.
 * @param {Element} element Container whose descendants are searched
 * @param {object} state Internal content variants, previously seen targets, and current decisions
 */
function discoverPersonalizationPoints(element, state) {
  // Forget content variants removed by an enclosing block or fragment replacement.
  state.contentVariants = state.contentVariants.filter((contentVariant) => (
    element.contains(contentVariant.start) && element.contains(contentVariant.end)
  ));
  element.querySelectorAll(selector).forEach((target) => {
    if (state.seen.has(target)) return;
    const point = target.dataset.personalizationPoint.trim();
    const experience = target.dataset.personalizationExperience.trim();
    if (!point || !experience) return;
    // A replacement may carry the same metadata as its already-tracked content variant.
    const tracked = state.contentVariants.some((contentVariant) => (
      contentVariant.point === point && contentVariant.experience === experience
      // eslint-disable-next-line no-use-before-define
      && getVariantElements(contentVariant).some((node) => node === target || node.contains(target))
    ));
    state.seen.add(target);
    if (tracked) return;
    const start = document.createComment('personalization start');
    const end = document.createComment('personalization end');
    target.before(start);
    target.after(end);
    state.contentVariants.push({
      start,
      end,
      point,
      experience,
    });
  });
}

/**
 * Find the current elements between a tracked target's comment markers.
 * Used by discovery and decision application, including after a target is replaced.
 * @param {object} contentVariant Tracked content variant with start and end comment nodes
 * @returns {Element[]} Elements between the markers, or an empty array if the end is missing
 */
function getVariantElements(contentVariant) {
  const elements = [];
  let node = contentVariant.start.nextSibling;
  while (node && node !== contentVariant.end) {
    if (node.nodeType === 1) elements.push(node);
    node = node.nextSibling;
  }
  return node === contentVariant.end ? elements : [];
}

/**
 * Apply a complete set of point-to-experience decisions after initialization.
 * Shows the matching experience and hides other experiences for each point.
 * A new map replaces previous decisions; points omitted or unmatched are hidden.
 * Does nothing if the container has not been initialized.
 * @param {Element} element The same container passed to initializePersonalization
 * @param {Map<string, string>} decisions Point names mapped to selected experience names
 */
export function applyPersonalization(element, decisions) {
  const state = pageStates.get(element);
  if (!state) return;
  state.decisions = decisions;
  state.evaluatedPoints = new Set(state.contentVariants.map((variant) => variant.point));
  // eslint-disable-next-line no-use-before-define
  renderPersonalization(state);
}

/** Show the default before a decision, then apply the most recent completed decision. */
function renderPersonalization(state) {
  const variantsByPoint = new Map();
  state.contentVariants.forEach((contentVariant) => {
    if (!variantsByPoint.has(contentVariant.point)) variantsByPoint.set(contentVariant.point, []);
    variantsByPoint.get(contentVariant.point).push(contentVariant);
  });
  variantsByPoint.forEach((contentVariants, point) => {
    const evaluated = state.evaluatedPoints.has(point);
    const defaults = contentVariants.filter((variant) => variant.experience === 'DEFAULT');
    if (!evaluated && defaults.length !== 1) return;
    const decision = evaluated ? state.decisions.get(point) : 'DEFAULT';
    if (!document.getElementById('personalization-visibility-style')) {
      const style = document.createElement('style');
      style.id = 'personalization-visibility-style';
      style.textContent = '[data-personalization-managed][hidden] { display: none !important; }';
      document.head.append(style);
    }
    contentVariants.forEach((contentVariant) => {
      getVariantElements(contentVariant).forEach((target) => {
        target.dataset.personalizationManaged = 'true';
        target.hidden = contentVariant.experience !== decision;
      });
    });
  });
}

/** Connect the configured provider, regardless of which SDK it uses. */
function connectDecisionProvider(element, host) {
  if (!host?.addEventListener || !host?.removeEventListener) {
    throw new Error('A host with event listener support is required to connect a decision provider');
  }
  let currentPoints = [];
  let previousSource;
  let previousKey;
  let revision = 0;

  const requestPersonalizationDecisions = async () => {
    const source = host.decisionProvider;
    const key = JSON.stringify(currentPoints);
    if (!currentPoints.length || typeof source?.getDecisions !== 'function') return;
    if (source === previousSource && key === previousKey) return;
    previousSource = source;
    previousKey = key;
    revision += 1;
    const currentRevision = revision;
    try {
      // eslint-disable-next-line no-console
      console.log('[Personalization] Requesting decisions for points:', [...currentPoints]);
      const decisions = await source.getDecisions([...currentPoints]);
      if (!(decisions instanceof Map)) throw new Error('Decision source must return a Map');
      // eslint-disable-next-line no-console
      console.log('[Personalization] Received decisions:', Object.fromEntries(decisions));
      if (currentRevision === revision) applyPersonalization(element, decisions);
    } catch (error) {
      if (currentRevision === revision) {
        previousKey = undefined;
        // eslint-disable-next-line no-console
        console.warn('Personalization decision request failed', error);
      }
    }
  };

  const onReady = () => { requestPersonalizationDecisions(); };
  host.addEventListener('personalization:decision-source-ready', onReady);
  const unsubscribe = subscribePersonalizationPoints(element, (points) => {
    currentPoints = points;
    revision += 1; // Discard responses for a point set that has changed.
    if (!points.length) {
      previousKey = undefined;
      return;
    }
    requestPersonalizationDecisions();
  });
  return () => {
    revision += 1;
    unsubscribe();
    host.removeEventListener('personalization:decision-source-ready', onReady);
  };
}
