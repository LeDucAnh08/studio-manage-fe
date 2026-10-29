# Costume catalog — selected option 1

Reviewed 2026-10-28. Route: `/costumes` in the existing Yume application.

final result: passed

## Evidence and matched state

All artifacts below are in `../.workflow-tools/customer-ui/costume-catalog-refresh/`.

- Exact selected source: `selected-option-1.png`, copied from `exec-3a99cee9-fdd2-4c65-b190-e9a1773b968b.png`, the first displayed result of the latest catalog ideation set.
- Initial and final implementation captures: `qa/initial-fullpage.png`, `qa/final-fullpage.png`; viewport crops `qa/initial-desktop.png`, `qa/final-desktop.png`.
- Combined comparisons, source left and implementation right: `qa/initial-comparison-full.png`, `qa/final-comparison-full.png`, `qa/final-comparison-filters.png`, `qa/final-comparison-products.png`. All were opened and inspected; focused products use slightly different crop bounds to include each actual result region without clipping its heading.
- CSS viewport 1440 × 1024, DPR 1. Source raster 1487 × 1058. Native IAB final full-page raster 1434 × 1164; the first 1434 × 1020 pixels represent the viewport, with six/four edge pixels omitted by IAB. `qa/compare.py` contains both source and viewport crop proportionally in 1440 × 1024 white canvases. The full page is not compared against the viewport-sized source without cropping.
- Matched period 19–21 November 2026, inclusive three days; Trang phục selected, Áo dài kỷ yếu selected, four real inventory models. Size and price filters unset. The app retains its actual alphabetical product/category order, rather than reproducing the generated image's arbitrary ordering.
- Previous rental form QA archived as `docs/design/customer-rental-refresh-qa.md`. Existing older reports are preserved.

## Findings and iteration history

No actionable P0/P1/P2 findings remain.

1. P2: initial rail repeated the category selector label and reset action on separate rows, pushing the price controls down; an extra desktop submit button also expanded the rail. See initial combined comparison. Moved reset beside the rail title, hid the redundant selected-kind label visually, and kept the period action as the desktop filter submit. Final rail comparison shows compact grouping and all controls.
2. P2: gender badges initially inherited neutral styling instead of the source pink treatment. Scoped the existing `customer-status` component correctly; final product comparison shows the intended badges. Existing Lucide icons and supplied logo remain in use.
3. P2: horizontal category scrolling at 390px allowed absolute screen-reader count text to escape its scroll container, making document width 851px. Positioned category buttons relatively, keeping their accessible text inside the scrolling row. Final measured document widths do not exceed viewports at 320, 390, 744 and 1280px. Verified mobile/tablet captures show intact content and controls.
4. P2: an intermediate laptop breakpoint unnecessarily reduced results to one column. Removed that rule. At 1280px the final measured grid is 446px + 446px, with all four cards in two rows and no document overflow.

## Required fidelity surfaces

- Typography: existing Inter Customer font, desktop title 32px, result heading 28px, model titles 18px, body 16px, descriptions 14px and compact stock badges 12px. Native focus indicators and field labels remain accessible. Long descriptions retain the app's two-line treatment, so cards can be taller than the mock's abbreviated copy.
- Layout/rhythm: compact date strip, left category/filter rail and right two-column product grid match the selected composition. Small garment icons replace the old square illustration panels. Controls are 48px high; rail and result sections use whitespace and light dividers. At smaller widths the category row scrolls inside its container, advanced filters collapse, and cards become one column on phones.
- Colors/tokens: existing white canvas, #222222 ink, muted gray, pale gray supporting surfaces and #ff385c primary. Selected categories and gender badges use restrained pink. Existing solid primary-button token is retained instead of the generated image's highlight variation.
- Assets: existing Yume logo and Lucide Shirt/Sparkles icons are used directly. The source contains no product photographs; no new raster assets, CSS illustrations or fabricated product imagery were introduced.
- Copy/content: actual inventory names, descriptions, genders, daily prices, available sizes and inclusive-day estimates remain accurate. The catalog does not reserve inventory. Card selection and request submission are available within the customer portal by default; the separate rental flag was removed in the follow-up below. No database data was changed.

## Browser and responsive verification

Native IAB, existing frontend and API:

- Applied size M and 100,000–150,000 price inputs, then moved the maximum slider with the keyboard to 145,000. Numeric input updated and the period action loaded the four eligible models without changing dates or selected category.
- Cleared filters and reselected Áo dài kỷ yếu. Counts returned to 18 total / 15 clothing / 3 accessories, with four selected-category models.
- Checked advanced-filter expansion/collapse, selected-category state, visible totals and both date inputs. No live rental request was created.
- Full responsive evidence: `qa/mobile-final-390.png` (384 × 2494), `qa/mobile-320-verified.png` (314 × 2676), `qa/tablet-744-verified.png` (738 × 1627), `qa/laptop-final-1280.png` (1274 × 1210). Verified 320/tablet captures start at scroll position zero; earlier captures showing sticky chrome at a scrolled document position were replaced as visual evidence.
- Browser console errors: none after final interactions.

## Validation

- TypeScript `tsc --noEmit`: passed.
- Targeted TS/TSX ESLint and Prettier: passed.
- Vitest: 38/38 passed across RentalCatalogPage and App tests. Covers date-first loading, normalized category groups, URL state, size and price filtering, paired sliders, inverted bounds without a request, clearing filters, absent prices, hidden sold-out sizes, stale responses, empty/error states, conditional rental actions and existing routing.
- Automated Playwright E2E was not run. Native browser checks verified the actual UI; mocked tests cover unavailable/error and enabled-rental paths.

## Accepted differences and polish

P3: the existing application shell has a wider logo inset and slightly taller header/footer than the generated source. Actual descriptions include bundle exclusions, giving cards a little more height. The extra compact reset link preserves the existing category-reset behavior. These differences preserve application consistency and useful product information.

Checklist: exact reference resolved; existing route updated; primary interactions verified; responsive evidence inspected; full and focused combined comparisons inspected; automated checks passed; no actionable P0/P1/P2 remains.

## Follow-up: selectable catalog cards

User reported that cards could not be selected. The selection link was hidden while rental intake was paused. Each card now exposes a visible “Chọn mẫu này” link, stretched over the card body, with hover and keyboard-focus feedback. It carries the model and rental dates into the existing draft form; final submission still respects the intake flag.

Choosing another model fills an empty draft row or appends a new row, keeping existing contact information, sizes and quantities. Selecting the same model again does not duplicate it. The incoming suggestion is consumed once so repricing does not re-add a removed row. The existing 30-row limit also applies to catalog additions.

- Native IAB verified clicking the first card's garment icon opens the correct pink áo dài model. Selected M × 2, returned to the catalog, then selected the cream model: both rows and the original quantity remained. Enter on the cream card opened the same two-row draft without duplication. No request was submitted.
- Desktop and 390px mobile captures were opened and inspected: `qa/selectable-cards-desktop.png`, `qa/selectable-cards-mobile.png`; draft evidence: `qa/selection-two-models.png`. Mobile document width equals the 390px viewport.
- TypeScript and targeted ESLint passed. Vitest passed 62/62 across RentalCatalogPage, DailyRentalPricing and App, including paused intake, disabled portal, draft additions, repeat selection, removal followed by repricing and existing login/draft flows.
- E2E selectors were updated for the new link label; automated E2E was not run.

## Follow-up: rental available by default

The user requested removal of the separate rental switch. Removed its frontend export, API gate, paused-form copy, Docker arguments, Compose environment entries and launcher settings. The shared portal control, authentication, role checks, validation and resource transactions remain in effect. Obsolete rental environment values have no effect. Inventory writers require the shared transaction lock whenever the portal is open, including its default when the portal variable is absent.

- Validation: 127/127 frontend tests, 39/39 backend HTTP/catalog tests and 2/2 deployment configuration tests passed. TypeScript passed in both applications; targeted frontend ESLint passed. HTTP tests verify unset/false/true obsolete flags all reach the rental API, input validation still rejects malformed requests, unauthorized roles remain blocked, and clients only list their own orders.
- Native browser verified the rental tab loads existing orders from the running API and a valid draft reaches an enabled “Gửi yêu cầu thuê” button without paused copy. Evidence: `qa/rental-default-open.png`. No live request was submitted. Automated E2E was not run for this change.
