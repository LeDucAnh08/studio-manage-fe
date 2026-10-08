# Customer Portfolio image checks

Verified locally on 2026-10-08 against `http://127.0.0.1:4013` using headless Chrome. Browser API reads used fixtures; unexpected endpoints and business mutations were blocked. No demo data was written.

## Scope and policy

- Portfolio renders **15 photo instances from 13 existing sources**: three hero photos and twelve about-mosaic photos. Two sources occur in both sections. No Portfolio photograph was assigned to a rental item or concept.
- The first hero photo has `loading="eager"` and native `fetchpriority="high"`. The other fourteen use native lazy loading; all fifteen use asynchronous decoding, explicit intrinsic width/height, `object-fit: cover`, and a clipped 14px frame.
- The first hero photo has meaningful alt text. The other fourteen photos are decorative with empty alt text. Logo presentation retains contain behavior.
- Every source has one additional 640w WebP derivative, quality 82. Its original remains the large `srcset` candidate. Consumer `sizes` follow the real hero/mosaic slot widths.
- Hero layout uses two grid columns and two rows, with the first photo spanning both rows; its aspect follows that grid. The two secondary frames use 4:5. The about mosaic uses a 4:5 outer frame with a 3-by-4 grid. These are editorial compositions, distinct from square catalog slots.
- Pending/error states use the neutral surface and retain the frame. Concept emoji plates remain explicit illustrations, separate from image loading/error states.

## Original preservation and derivative inspection

All thirteen original SHA256 values match `customer-baseline-hashes.json`. All thirteen derivatives decode correctly, preserve the source aspect proportionally, and were visually inspected together in the contact sheet. The resize does not crop the original content; display cropping belongs to the consumer frame.

| Review batch | Original sources | Original dimensions | Derivative dimensions | Derivative bytes |
|---|---|---|---|---:|
| A | TNV07899, TNV00048, TNV00817 | 4361×6541; 4347×6521; 4672×7008 | Each 640×960 | 157,218 |
| B | TNV03816, TNV05927, TNV06047 | 4672×4672; 4541×4541; 4672×4672 | Each 640×640 | 101,768 |
| C | HDZ07441, MAY01381, PBI00061 | 4415×4415; 4000×4000; 4000×4000 | Each 640×640 | 92,092 |
| D | PBI01583, PBI01850, TNV00451 | 3957×3957; 4000×4000; 4672×4672 | Each 640×640 | 80,538 |
| E | TNV06242 | 4455×4453 | 640×640 | 21,714 |

Original source files total **15,458,618 bytes**. The thirteen derivatives total **453,330 bytes**. These are file sizes, not a claim about every browser's transfer size.

The table maps final assets into the planned 3/3/3/3/1 review groups. Historical generation commands used 2/2/3/3/3 sources with no command writing more than five files. Four temporary 1280 variants were removed before manifest/consumer integration; none remain. Therefore the initial UI25 execution did not follow the exact planned A–E chronology. Current dimensions, imports, visual output, and browser candidate/transfer evidence cover every source in all five review groups.

The typed source-to-variant manifest is `src/assets/images/portfolio-images.ts`. Detailed hashes, file dimensions, source bytes and derivative bytes are recorded in the metadata artifact below.

## Actual browser delivery

Each case used a fresh Chrome context, a 1000px viewport height, and the same local development server. The measurement covers the fifteen Portfolio photo instances. Brand logos, Vite asset-import JavaScript, page JavaScript, CSS, fonts, and API payloads are excluded from the photo totals.

`CDP response bytes` sums `Network.loadingFinished.encodedDataLength` for selected photo URLs. `ResourceTiming transfer` is the browser's `transferSize` metric. Selected file bytes come from the actual chosen URL set and filesystem sizes. The desktop DPR3 case was repeated after waiting for network idle: CDP records all fifteen selected photo URLs, while ResourceTiming retains only thirteen photo entries. Its incomplete ResourceTiming total is therefore omitted below.

| Width | DPR | Original candidates chosen | Distinct photo URLs | Selected file bytes | CDP response bytes | ResourceTiming transfer |
|---:|---:|---|---:|---:|---:|---:|
| 390 | 1 | None | 13 | 453,330 | 456,816 | 457,230 |
| 390 | 2 | None | 13 | 453,330 | 456,816 | 457,230 |
| 390 | 3 | None | 13 | 453,330 | 456,816 | 457,230 |
| 1440 | 1 | None | 13 | 453,330 | 456,816 | 457,230 |
| 1440 | 2 | TNV00817 | 14 | 1,908,274 | 1,912,032 | 1,912,474 |
| 1440 | 3 | TNV00817, TNV00048, TNV07899 | 15 | 7,047,550 | 7,051,584 | Partial: 13/15 entries |

At the tested mobile widths and desktop DPR1, shared sources reuse the same derivative URL across hero/about. At desktop DPR2/3, some sources use an original in the hero and a derivative in the smaller mosaic, so both representations transfer. Chrome loaded the photo set during initial navigation in these 1000px-high cases despite the native lazy attributes; lazy policy does not guarantee deferred transfer when photos fall within Chrome's preload distance.

**Remaining delivery cost:** desktop DPR2/3 still transfers large original photos. The one-derivative policy does not solve every high-density viewport. A future intermediate candidate should be justified using these measured cases and implemented in a separate asset batch; no additional candidate was added in this base pass.

## Responsive, loading and motion evidence

- Widths **320, 390, 744, 1024, 1128, 1440**: hero photos remain visible, photo/container/page bounds stay within the viewport, 14px crop/clip and explicit dimensions are present. The customer canvas stays white while `html.dark` and stored dark mode remain active. Portfolio hero heading computes 28px after the consumer-specific polish.
- Delayed photo responses: after fonts settle, all three hero frame positions and dimensions are identical before/after image release. Loading frames are neutral.
- Failed and blocked photo responses: all three hero frames retain positive dimensions and stable geometry, and show the neutral error presentation. The disabled-image case also blocks brand images, as a browser with images disabled would.
- Reduced motion: `prefers-reduced-motion: reduce` is detected; the scroll-to-top action uses instant scrolling; hero descendants have no running CSS animation.
- Whole-page CLS samples were approximately **0.01375 at 390px** and **0.00019 at 1440px**, recorded from navigation and including text/header layout. These are not asserted to be image-only CLS. The controlled delayed-image check separately verifies stable frame geometry after fonts settle.

## Evidence artifacts

Artifacts are ignored workflow outputs in `.workflow-tools/customer-ui/portfolio-runtime/`:

- `all13-derivatives-contact-sheet.png`: visual inspection of all derivatives.
- `image-metadata-results.json`: original/baseline hashes, dimensions, bytes and mapped review groups.
- `network-results.json`: six width/DPR cases, actual currentSrc selections, CDP responses and ResourceTiming entries; desktop DPR3 uses the isolated repeat, with incomplete ResourceTiming explicitly identified.
- `network-raw-results.json`, `network-dpr3-results.json`: original trace and the isolated desktop repeat.
- `image-evidence-summary.json`: compact numerical results.
- `ui-results.json`: six post-polish Portfolio widths, aliases, Wizard widths and inline-feedback checks, including the compact form's five-star row at 320px.
- `ui-states-results.json`: successful slow/error/disabled-image and reduced-motion cases after the harness correction.
- `portfolio-dark-*.png`, `portfolio-images-{slow,error,disabled}-390.png`: browser visual evidence.

Reproduction scripts are `inspect-images.py`, `verify-image-network.cjs`, `finalize-network.cjs`, and `verify-portfolio.cjs` in the same artifact directory. The state-only command is `node verify-portfolio.cjs --images-only`; it filters image requests and does not intercept Vite's image import modules.
