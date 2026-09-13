# OG Image Preview Design Specification

## 1. Design Direction

The design is locked to a minimal editorial interface inspired by print
magazines, modern portfolio sites, and quiet luxury typography.

The product should feel:

-   Calm
-   Premium
-   Simple
-   Useful
-   Editorial
-   Focused on one action

This is not a marketing landing page. It is a single-purpose tool with a
carefully designed preview experience.

## 2. Core Product Idea

The user pastes a URL and receives a beautiful preview of the website's
Open Graph metadata.

The main result is a social-preview card containing:

-   Open Graph image, when available
-   Website favicon or fallback mark
-   Domain name
-   Open Graph title or a graceful fallback
-   Open Graph description or a graceful fallback
-   Link to open the original website
-   Export preview as an image

The interface should make the preview feel like a finished editorial
card rather than a raw metadata inspector.

## 3. Page Structure

Use one centered page with generous whitespace.

### Top Header

Left side:

-   Brand mark: `OG`
-   Thin horizontal divider
-   Small label: `IMAGE PREVIEW`

Right side:

-   Small uppercase text: `SIMPLE TOOLS` `FOR A BETTER WEB.`

The header is understated and should not compete with the main
interaction.

### Main Hero

Centered vertically near the upper-middle portion of the page.

Headline:

> Paste a link.\
> See the bigger picture.

The word `bigger` may use an italic editorial serif treatment.

Supporting text:

> Fetch Open Graph metadata and generate a beautiful preview.

Below the copy is one large URL input.

### URL Input

The input should be a single horizontal pill-like field with:

-   Thin neutral border
-   White or warm off-white background
-   Link icon on the left
-   URL placeholder or current URL
-   Dark rounded Fetch button on the right
-   Right-arrow icon inside the button

The input and button should feel like one composed control.

### Preview Card

The preview card appears directly below the input with a comfortable
gap.

The card is the visual centerpiece of the app.

Card structure:

1.  Large OG image area
2.  Metadata area
3.  Bottom action row

The card should have:

-   Soft rounded corners
-   Thin border
-   No heavy shadow
-   Warm off-white surface
-   Strong but restrained spacing
-   A maximum width that feels like a social card, not a dashboard

## 4. Preview Card Details

### Image Area

-   Use the fetched `og:image` as the hero image.
-   Preserve the image's visual character.
-   Use `object-fit: cover` where appropriate.
-   Keep the image area visually dominant.
-   If no image exists, show a refined neutral fallback rather than a
    broken image state.

### Metadata Area

Left side:

-   Circular favicon or fallback domain mark
-   Domain name in small muted text
-   Title in a readable editorial serif or refined sans-serif
-   Description in muted body text

Right side:

-   Minimal external-link arrow

The title should never look like a browser error or debug output.

Use graceful copy such as:

-   `Title not provided`
-   `This website did not provide a description for social previews.`

These fallback labels should be visually muted and slightly italicized.

### Action Row

Bottom row contains:

-   `View original`
-   Divider
-   Download icon
-   `Export as image`

Keep this row quiet and functional.

Do not add multiple competing actions.

## 5. Visual System

### Colors

Primary palette:

-   Page background: warm ivory / soft off-white
-   Main text: near-black
-   Muted text: warm gray
-   Borders: light neutral gray
-   Button: near-black
-   Button text: white
-   Preview surface: slightly warmer off-white

Avoid:

-   Bright gradients
-   Neon purple
-   Excessive glassmorphism
-   Large colorful decorative blobs
-   Multiple accent colors
-   Heavy shadows

The design should feel almost monochrome, with the fetched OG image
providing the color.

### Typography

Use a combination of:

-   Editorial serif for the main headline and important preview title
-   Clean sans-serif for labels, metadata, controls, and supporting copy

Recommended style:

-   Large headline with tight line-height
-   Slightly generous letter spacing for uppercase labels
-   Small uppercase utility text
-   Strong hierarchy without excessive font weights

The brand mark `OG` should be typographic, not an icon inside a rounded
square.

### Spacing

Prioritize whitespace.

Use:

-   Wide page margins
-   Comfortable header padding
-   Large gap between header and headline
-   Moderate gap between headline and input
-   Moderate gap between input and preview
-   Generous internal card padding
-   Clear separation between metadata and actions

Do not fill empty space with extra features.

## 6. Layout Measurements

These are starting values, not rigid requirements.

### Desktop

-   Page max width: approximately `1440px`
-   Main content max width: approximately `760px`
-   Header horizontal padding: `56px`
-   Main top spacing: `64px` to `96px`
-   Headline max width: `900px`
-   Preview card width: `760px`
-   Card image height: approximately `360px` to `430px`
-   Card radius: `18px` to `24px`

### Mobile

-   Page padding: `20px`
-   Header stacks or simplifies gracefully
-   Headline scales down without awkward wrapping
-   Input becomes a vertical or compact stacked control
-   Preview card uses the full available width
-   Action row wraps if necessary
-   No horizontal scrolling

## 7. Interaction States

### Initial State

Show:

-   Header
-   Main headline
-   Supporting text
-   URL input
-   No preview card yet

Keep the page visually balanced without adding sample cards unless
needed for product explanation.

### Loading State

Use a simple shimmer skeleton for:

-   Image area
-   Domain line
-   Title line
-   Description lines

Do not use a spinner-heavy or animated dashboard treatment.

### Success State

Show the preview card with:

-   OG image
-   Domain
-   Title
-   Description
-   Original link action
-   Export action

### Missing Metadata

Do not show harsh error-looking text.

Use a polished fallback card with:

-   Favicon or domain fallback
-   Domain name
-   Muted placeholder title
-   Muted placeholder description

### Error State

Errors should be short, readable, and user-facing.

Examples:

-   `Please enter a valid URL.`
-   `This website could not be reached.`
-   `This page did not return HTML content.`
-   `For security reasons, fetching this internal or private URL is not allowed.`

Never expose stack traces, raw Node.js errors, or implementation
details.

## 8. Export Feature

The export action should produce an image of the preview card.

The exported result should:

-   Match the on-screen card
-   Include the fetched OG image
-   Include the metadata layout
-   Preserve typography and spacing
-   Have a clean background
-   Be suitable for sharing on social media or messaging apps

Export should be one clear action, not a settings panel.

If export is not yet implemented, keep the button visually present only
when the functionality is ready.

## 9. What Not to Add

Do not add:

-   A large navigation menu
-   A multi-section marketing landing page
-   Pricing cards
-   Testimonials
-   Feature grids
-   User accounts
-   Complex dashboards
-   Multiple preview platforms in the first version
-   Advanced customization panels
-   Color pickers
-   Theme builders
-   Excessive animations
-   Decorative illustrations unrelated to the task
-   A large metadata table by default

The first version should do one thing exceptionally well.

## 10. Product Personality

The app should feel like:

> A small, beautifully made utility for the web.

It should be useful in a few seconds:

1.  Paste a URL.
2.  Fetch the metadata.
3.  See the social preview.
4.  Export it if desired.

The visual identity comes from typography, spacing, restraint, and the
content of the fetched image.

## 11. Implementation Priorities

Follow this order:

1.  Preserve and verify the existing backend security and reliability.
2.  Preserve the existing URL fetching behavior.
3.  Improve the frontend layout to match this specification.
4.  Add the polished preview card.
5.  Add loading and fallback states.
6.  Implement export as image.
7.  Test desktop and mobile layouts.
8.  Run the complete regression suite.
9.  Review accessibility and keyboard behavior.
10. Deploy only after all previous steps pass.

## 12. Definition of Done

The design is complete when:

-   The page feels minimal and editorial.
-   The user immediately understands what to do.
-   The URL input is the primary interaction.
-   The preview card looks shareable and intentional.
-   Missing metadata looks graceful.
-   The interface does not feel like a dashboard.
-   There are no unnecessary sections or controls.
-   The layout works on mobile.
-   Export produces a useful image.
-   Existing security and backend tests still pass.
-   The application is deployed only after final verification.
