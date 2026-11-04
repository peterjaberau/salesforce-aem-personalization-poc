# Website personalization proof of concept

This guide explains how to add a personalized section to the website. In this proof of concept, Salesforce chooses a decision, and the website displays its content zone name, `experienceKey`, and `contentPath`. The website does not currently fetch content from `contentPath`.

## How the pieces connect

1. The website contains a section with a stable selector and a heading for the decision.
2. Google Tag Manager loads the Salesforce beacon. The published Salesforce sitemap identifies the current page and its content zones.
3. Each content zone name is also the API name of a Salesforce personalization point. The sitemap requests decisions for those names.
4. Salesforce returns decision attributes, including `contentPath`. The sitemap adds the matched content zone to each decision and publishes a `personalization:decisions` event.
5. The website's personalization module uses the content zone selector to find the section and displays the returned attributes in its heading.

The sitemap also caches the enriched array in `window.decisionsProvider`, so the website can use a decision that arrived before its listener connected.

## Add a personalized section

The following example adds a promotional section with default and business decisions.

### 1. Add the section to the website

Add a unique ID to the section and a heading inside `.section-content`:

```html
<section id="section-promo">
  <div class="page-section">
    <div class="section-content">
      <h1>SECTION_PROMO_V1: Waiting for a decision</h1>
      <button type="button" class="log-decision">Log decision</button>
    </div>
  </div>
</section>
```

The renderer updates the heading with the content zone name, experience key, and content path. The debug button is optional. No `data-personalization-*` attributes or pre-rendered variants are required.

### 2. Add the content zone to the Salesforce sitemap

In the appropriate page type in [`salesforce-with-decision-in-sitemap-extended.js`](src/app/temporary/salesforce-with-decision-in-sitemap-extended.js), add the content zone:

```js
contentZones: [
  { name: "SECTION_HERO_V1", selector: "#section-hero" },
  { name: "SECTION_PROMO_V1", selector: "#section-promo" },
],
```

The zone's `selector` must match the website section. Its `name` must exactly match the Salesforce personalization point's **API name**. The script requests a decision for every named zone in the matched page type, so each zone in this list needs a corresponding point.

Make sure the page type's `isMatch` covers the website URL. Copy the complete updated script into the Salesforce website connector's sitemap and save and publish it. The file in this repository is the copy used for authoring; editing it alone does not update Salesforce. Allow for CDN caching when testing a newly published sitemap.

### 3. Create or configure the Salesforce personalization point

In Salesforce Personalization, create a point for the section or use an existing one:

- **Point API name:** `SECTION_PROMO_V1`, matching the sitemap zone name exactly.
- Configure its data space, personalization type, and content schema as appropriate to your Salesforce setup.
- Add text attributes with API names **`experienceKey`** and **`contentPath`** to the content schema if you want both values displayed. Missing values appear as `—`.
- Activate the point and configure its decisions. The exact screens and publishing steps can vary with your Salesforce setup.

See Salesforce's [content schema configuration guide](https://help.salesforce.com/s/articleView?id=mktg.persnl_content_schema_configure.htm&language=en_US&type=5).

### 4. Configure decisions and targeting rules

Create a decision for each experience and configure the attributes returned for it:

| Decision example | Targeting rule example | `experienceKey` | `contentPath` |
| --- | --- | --- | --- |
| Business | UTM Parameters → Source is equal to `BUSINESS` | `BUSINESS` | `/business/promo` |
| Default | Eligible for all visitors, as the fallback | `DEFAULT` | `/default/promo` |

Set priorities so the specific business decision takes precedence over the default when both are eligible. Save and activate or publish the decisions according to the Salesforce UI.

For UTM targeting, select **UTM Parameters → Source** rather than comparing **Source → URL** to `BUSINESS`: the latter targets the URL, not just the `utm_source` parameter. See Salesforce's [targeting rule guide](https://help.salesforce.com/s/articleView?id=sf.persnl_personalization_point_targeting_rules_create.htm&language=en_US&type=5).

The current renderer displays `contentPath` as text; it does not load the referenced content. A missing attribute displays as `—`, and a section without a returned decision keeps its initial heading.

### 5. Verify the page and decision

Serve the website through an HTTP server, rather than opening the HTML as a `file://` URL. For example, use VS Code's Live Server extension and open [`index.html`](src/app/static/index.html). Check both the default URL and the URL with `?utm_source=BUSINESS`.

Use the debug toolbar and browser console:

- **Matched Page** and **Match Status** show whether Salesforce selected the intended page type.
- **Content Zones** shows the zones available in the SDK's matched configuration.
- **Raw SDK Response** shows the Salesforce response and the requested points. This diagnostic requires the current extended sitemap to be published.
- **All Decisions** shows the enriched decisions published to the website.
- A section's **Log decision** button logs its matching decision, if that section has a button.

For the business decision, the enriched response should include values like:

```json
{
  "personalizationPointName": "SECTION_PROMO_V1",
  "attributes": { "experienceKey": "BUSINESS", "contentPath": "/business/promo" },
  "contentZone": { "name": "SECTION_PROMO_V1", "selector": "#section-promo" }
}
```

Salesforce may return additional fields. The sitemap adds `contentZone`; it is not automatically included in the raw decision response.

If the decision does not appear, check the page match, point name, rule and priority, returned attributes, and section selector. If `attributes` is empty, inspect the decision's content schema and configuration in Salesforce. If the expected point is absent, check whether it is active and included in the matched page's zones.

## Integration files

- [`index.html`](src/app/static/index.html): example sections, GTM bootstrap, and debug controls.
- [`personalization.js`](src/app/static/personalization.js): decision listener and heading renderer.
- [`debug.js`](src/app/static/debug.js): optional console logging controls.
- [`salesforce-with-decision-in-sitemap-extended.js`](src/app/temporary/salesforce-with-decision-in-sitemap-extended.js): copy into the Salesforce sitemap console; it requests and publishes enriched decisions.

This is a proof of concept: its sitemap currently sets tracking consent to `Opt In` directly. A real integration should connect initialization and consent handling to the site's actual consent choices. The sitemap's selected-page listener handles the first selection; additional handling would be needed for subsequent client-side page changes in a single-page application.
