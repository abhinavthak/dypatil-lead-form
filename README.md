# DY Patil — Configurable Lead Form (prototype)

📄 **[Product requirements (PRD)](https://abhinavthak.github.io/dypatil-lead-form/prd/)** ([Markdown version](docs/PRD.md)): placements, form behaviour, configuration and tracking events.

React + TypeScript prototype built from the `D. Y Patil.zip` Figma exports. Copy, colours, spacing and imagery
come straight from the screens (the hero, poster images, icons, success badge and hourglass are cropped from the PNGs
into `public/assets/`).

```bash
npm install
npm run dev        # playground at http://localhost:5173
```

Live: https://abhinavthak.github.io/dypatil-lead-form/ (deployed by `.github/workflows/deploy.yml` on every push to `main`)

```bash
npm run build      # static build in dist/
```

## Playground

- **Desktop / Mobile** toggle renders the real landing page in a 1430px desktop frame or a 375px phone frame.
- Left panel configures every option live (saved in localStorage); **Copy config JSON** exports it.
- **Images**: upload your own banner-form image, popup side image, top banner image and page hero images (desktop / mobile).
- **Open form** and **Restart** drive the flows; close an open form to see the exit-intent screen. The page's *Download Brochure* and
  *Apply Now* buttons also open the form.

Mock backend (`src/lead-form/mockApi.ts`):
- OTP `1111` is rejected (the "Wrong OTP" screen); any other 4 digits pass.
- A phone number ending in `2168` (e.g. `8275612168`) is an existing user, so name, email and qualification pre-fill.

## What's configurable (`LeadFormConfig`)

| Area | Options |
| --- | --- |
| Placement | Banner (inline hero form) on/off · Desktop overlay: none, popup, popup + side image, popup + top image, sidebar, sidebar + top image · Mobile overlay: none, bottom drawer, bottom drawer + top image, popup |
| Trigger | On load · after N seconds · after N% scroll · CTA click only |
| Urgency | Social-proof pill (count) · countdown to a deadline · seats-filled bar (% and batch) |
| Trust | UGC / NAAC / No-cost EMI strip (badges are data) |
| Flow | Inline OTP verification on/off · success screen: "Proceed with application" or "Wait for a callback" |
| Exit intent | Shown when the visitor closes the form overlay before submitting · show "n of 5 done" progress |
| Brand | Title, subtitle, primary colour |

The banner and overlay share one lead state, so anything typed in one carries over to the other.

## Using it on a page

```tsx
import { LeadExperience, BannerForm, defaultConfig } from './lead-form';

<LeadExperience config={defaultConfig} device={isMobile ? 'mobile' : 'desktop'} api={realApi}>
  <Hero>
    <BannerForm />
  </Hero>
  …rest of page
</LeadExperience>;
```

`api` implements `LeadApi` (`sendOtp`, `verifyOtp`, `lookupLead`, `submitLead`). Swap `mockApi` for your endpoints.

## Structure

```
src/lead-form/      reusable component (LeadExperience, BannerForm, panels, styles, mock API)
src/playground/     demo landing page + config panel
public/assets/      images cropped from the design exports
```
