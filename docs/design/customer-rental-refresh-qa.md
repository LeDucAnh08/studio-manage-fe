# Rental request — selected option 2

Reviewed: 2026-10-27. Existing Yume application, `/rental/start`.

final result: passed

## Evidence and comparison state

- Source: `../.workflow-tools/customer-ui/rental-refresh-ideation/selected-option-2.png`, the second displayed image from the selected rental mockup set.
- Implementation: `../.workflow-tools/customer-ui/rental-refresh-ideation/qa/desktop-final.png`.
- Combined evidence: `qa/comparison-full.png`, `qa/comparison-form.png`, `qa/comparison-summary.png` in that same artifact folder. Source left, implementation right; all three were opened and inspected together.
- CSS viewport 1440 × 1024. Source raster 1487 × 1058; native IAB raster 1434 × 1020 (small viewport edge omitted). `qa/compare.py` proportionally contains both in 1440 × 1024 white canvases without stretching or painting content.
- Matched edit state: 19–21 November 2026, inclusive three days; pearl white áo dài M × 2 at 125,000/day; silk-strap nón lá FREE × 2 at 15,000/day. Four items, total 840,000 VND. Contact fields blank in desktop comparison.
- Actual app uses the persisted MongoDB catalog. Rental intake is currently paused by configuration, so an operational notice is intentionally added to the summary. No feature flag or live rental record was changed.
- Previous orders QA archived at `docs/design/customer-orders-preview-qa.md`. Earlier rental QA remains at `docs/design/customer-rental-form-qa.md`.

## Findings and fixes

No actionable P0/P1/P2 findings remain in the final combined comparison or responsive checks.

During browser inspection, shared dark-root rules forced 56px controls and clipped FREE in its select. Scoped rules now provide 48px controls, 80px notes and sufficient select padding in both root themes. Final desktop and tablet evidence show FREE completely.

At 390px the initial two-column date row clipped the year. Dates now stack below 744px. Revised mobile captures show complete dates and usable controls.

The paused notice originally interrupted the main header/date sequence. It now appears in the summary near the request context. The existing header marks Trang phục active on `/rental/start`, matching the source.

These fixes preceded the final normalized comparison. The final full and focused comparison found no additional blocking issue.

## Required fidelity surfaces

- Typography: existing Inter Customer family; 32px desktop title, 26px mobile title, 24px section headings, 16px form/body and 14px labels/supporting copy. Clear hierarchy and visible keyboard focus. Raster source lettering is slightly heavier; app typography is retained for consistency.
- Spacing/layout: two-column desktop form/summary, 32px column gap, 24–28px section rhythm, aligned item table, full-width add action and two-column contact section. Below 1128px summary follows form; mobile item controls have explicit labels. No horizontal overflow at 320, 390 or 744px.
- Colors/tokens: established white canvas, gray surfaces, dark text, subtle separators and pink primary/total. Solid CTA preserves the app token instead of the raster highlight variation.
- Assets/icons: supplied Yume logo and existing Lucide calendar, arrows, add, remove and stepper icons. Source has no photography; no placeholders or fabricated art were introduced. Date/select controls retain native platform behavior.
- Copy/content: Vietnamese title, dates, per-day formula, summary, total and review action follow the mock. Stock text additionally identifies size and maximum quantity. Deposit/request-does-not-hold notes and current paused notice are visible.

## Native browser verification

- Selected two models/sizes and quantities; checked line totals and 840,000 VND aggregate.
- Entered fictional contact information and opened review through the external summary CTA. Both models and contact details appeared; final send stayed disabled while paused. No live request was submitted.
- Returned to edit, changed date through native keyboard controls, observed query synchronization and five-day total 1,400,000 VND. Restored three days and 840,000 VND.
- Reloaded and verified dates, two rows, quantities and contact draft restored. Cleared fictional contact fields before handoff.
- Captures: mobile 390 × 844 (`qa/mobile-390.png`, 384 × 2954 raster), mobile 320 × 844 (`qa/mobile-320.png`, 314 × 3099), tablet 744 × 1024 (`qa/tablet-744.png`, 738 × 2631), mobile review (`qa/mobile-preview.png`, 384 × 2105). Inspected top/form and summary crops. Full-page images document responsive flow rather than desktop reference fidelity.
- Measured document scroll width equal to CSS viewport width at 320, 390 and 744px.
- Browser console error log empty after final interactions.

## Automated validation

- TypeScript `tsc --noEmit`: passed.
- Targeted TS/TSX ESLint and Prettier on changed rental files: passed. CSS is verified through formatting and rendered evidence, not ESLint.
- Vitest 59/59 passed: DailyRentalPricing, CustomerOrders, CustomerHeader. Includes paused behavior, dates/draft restoration, repricing, insufficient stock without reducing quantities, normal send/login paths and orders/navigation regressions.
- Automated Playwright E2E was not run. Native IAB covered primary UI interactions; final API creation is covered by mocked service tests without creating a live request.

## Follow-up polish and limits

P3: native date/select affordances and existing shell logo inset differ slightly from the raster. Form rhythm is slightly more spacious to preserve explicit stock messages. These retain clarity and existing components.

Live submission can be checked after rental intake is enabled by product configuration. This change preserves the current paused setting.

## Implementation checklist

- [x] Exact option 2 copied into project artifacts.
- [x] Form, live summary and existing review route implemented.
- [x] Date changes synchronize query, draft, inventory and estimate.
- [x] Responsive captures and primary interactions verified.
- [x] Full and focused combined comparisons inspected.
- [x] Relevant automated checks passed.
- [x] No actionable P0/P1/P2 visual issue remains.
