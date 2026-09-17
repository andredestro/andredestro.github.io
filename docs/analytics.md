# Website analytics

The website uses Firebase Analytics / GA4, measurement ID `G-57VRNK7NQQ`.
Production collection is restricted to `andredestro.github.io`. Local previews never
load Firebase or send analytics. Update the hostname allowlist if the site moves
to a custom domain.

## Consent and coverage

Home, apps, setup, video product pages and website privacy share the same consent
controls and analytics script. The app-specific support and privacy documents under
`/app/` have no website analytics; their content is independently synchronized from
app repositories. Native app analytics are separate from this website property.

Firebase is imported only after consent. Advertising consent is denied, Google
signals and ad personalization are disabled. Revoking consent stops further
collection, clears queued events and applies across open tabs. It does not erase
previously sent data or automatically remove existing cookies. Clearing browser
site data also removes the saved choice.

Page views are automatic: do not add a second manual `page_view` event. We do not
replay clicks made before consent. When consent is first granted, the current
catalog load result is reported; this is a snapshot, not historical interaction
replay. Load counts therefore describe consenting page visits, not all requests.

## Event catalog

Every custom event includes `page_path` and `page_type` (`home`, `apps`, `setup`,
`video_products`, `privacy`). Video pages also include `video_slug`.

| Event | Meaning | Additional parameters |
| --- | --- | --- |
| `navigation_click` | Internal navigation, excluding the separately measured setup CTA | `destination_path`, `link_placement` |
| `social_link_click` | YouTube, GitHub or LinkedIn click | `link_name`, `link_placement`, `destination_url` |
| `app_download_click` | Click through to the App Store, **not a confirmed install** | `app_id`, `app_name`, `campaign_token`, `destination_url`, `link_placement` |
| `product_link_click` | Affiliate store click, **not a confirmed purchase** | `product_id`, `product_name`, `store`, `link_placement` |
| `setup_cta_click` | Video product page → setup CTA | `link_placement` |
| `contact_click` | Email contact click, without sending the address | `contact_method`, `link_placement` |
| `apps_load_success` | Current app catalog is rendered | `app_count` |
| `apps_load_error` | App catalog could not load | `error_code` |
| `products_load_success` | Setup/video products rendered | `product_count`, `section_count` (setup only) |
| `products_load_error` | Setup/video products could not load | `error_code` |

Placements: `header`, `footer`, `home_cards`, `content`, `app_catalog`,
`product_catalog`. Error codes are bounded categories, not arbitrary exception
messages. Existing event names and the App Store `github_io` campaign are retained.

## GA4 console setup (not verified or changed by the code update)

1. Select the web stream with measurement ID `G-57VRNK7NQQ`.
2. Review enhanced measurement: page views and scroll are useful. Automatic
   outbound `click` may coexist with our semantic events. Do not add `click` and
   `social_link_click`/`product_link_click` together as a total of unique clicks.
3. Register event-scoped custom dimensions needed for reporting:
   `page_type`, `link_placement`, `link_name`, `destination_path`, `app_id`,
   `product_id`, `store`, `video_slug`, `error_code`. Avoid full URL dimensions
   unless needed; they can have high cardinality.
4. Consider marking `app_download_click` as a key event. Treat social and affiliate
   clicks as engagement unless they are explicit business objectives. Do not
   interpret these events as installs or purchases.
5. After publishing, use Realtime to confirm one visit per page, then verify the
   home → apps → App Store journey and setup → store clicks. Confirm that declining
   consent produces no new collection requests in the browser network panel.
6. Review existing filters, retention and enhanced measurement settings in the
   property. The source code cannot confirm their current values.

Browser blocking, leaving before the SDK is ready and refused consent can reduce
counts. Navigation is never delayed merely to send analytics.

## Automated checks

With Node.js, Playwright and Chrome available, run:

```sh
node tests/analytics.cjs
```

The tests intercept Firebase modules and all network requests; they do not send
real events. They cover pre-consent behavior, acceptance, revocation during SDK
loading, cross-tab revocation, placement, catalog loading/errors, CTA deduplication,
local preview exclusion and blocked SDK behavior. This validates website logic,
not delivery to the live GA4 property.

## References

- [Firebase Analytics API](https://firebase.google.com/docs/reference/js/analytics)
- [GA4 page views](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [GA4 outbound clicks](https://support.google.com/analytics/answer/13566436?hl=en)
