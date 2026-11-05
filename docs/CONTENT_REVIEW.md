# Content review — information for Chef Peter to confirm

The Phase 2 redesign presents Chef Peter's **existing** professional information in a clearer, warmer way. No employers, countries, qualifications, awards, figures or quotations were invented.

Where information is missing or needs approval, the site shows a dashed **"For Chef Peter to confirm"** note. These notes are **hidden from visitors**. They appear only in *content review mode*.

## How to review the site

1. Open any page with `?review=content` added to the address, for example:
   - Homepage: `https://<preview-or-live-url>/?review=content`
   - About page: `https://<preview-or-live-url>/about-chef-peter?review=content`
2. A yellow banner confirms review mode. It stays on while you move between pages in the same browser tab.
3. Read each dashed note and send corrections or approval.
4. To leave review mode, click **Exit review mode** or add `?review=off` to the address.

## Where the content lives

| Content | File |
|---|---|
| Biography (first person), career timeline, service descriptions, book subject areas | `src/data/siteContent.ts` |
| Original profile record: contact details, experience, countries, competencies, education, services | `src/data/chefProfile.ts` (unchanged) |
| Books | `src/data/booksData.ts` (unchanged) |
| Gallery | `src/data/galleryData.ts` (unchanged) |
| SEO landing pages and About-page evidence | `src/data/seoPages.ts` (unchanged) |

---

## 1. Biography and identity

| # | Item | Shown on |
|---|---|---|
| 1.1 | Approve the first-person biography ("Meet Chef Peter"), which was written from the existing profile | Homepage › About |
| 1.2 | How and where the culinary journey began (first kitchen, training or mentor) and the starting year | Homepage › About |
| 1.3 | One or two sentences, in Chef Peter's own words, on why teaching matters to him | Homepage › About |
| 1.4 | **Total years of experience.** The old homepage said "15+"; the About page says "over 20". Not shown on the new homepage until confirmed | Homepage, About page |
| 1.5 | Preferred full name and short form. Variants in use: "Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa", "Chef Peter Kirigwajjo Mulindwa", "Chef Peter Zimwanguyizza Mulindwa" | Hero caption, About page |
| 1.6 | Official spelling of the company: "De'Chosen Events Consultants" (used site-wide) vs "D'E-Chosen" (one paragraph on the About page) | About page |
| 1.7 | Year De'Chosen Events Consultants was founded | Experience |
| 1.8 | Quotation: "Cooking is an exact discipline. True culinary art lives where tradition meets scientific precision." Confirm it is his own words | Homepage › About |
| 1.9 | Quotation: "True culinary and baking excellence is a discipline worth passing on.", plus the De'Chosen statement beneath it | Homepage › Teaching |
| 1.10 | Social media profiles to list. The teaching photograph carries a TikTok handle, **@chefpira**; confirm whether this is his account | Footer |
| 1.11 | Caption for the teaching photograph (`chef-peter-2.jpeg`, taken at Bloven Baking): where and when | Homepage › About |

## 2. Professional experience (no dates are currently shown)

| # | Item |
|---|---|
| 2.1 | Start and end years for every role |
| 2.2 | Calm Waters Eco Lodge: dates and whether the role is current |
| 2.3 | Imperial Group and Speke Group of Hotels: job title and years at each |
| 2.4 | Newrest Uganda In-Flights, UN base catering (South Sudan), Visit Africa Uganda (Watoto Ltd): title at each, years, and the correct way to name the UN operation (mission or contractor) |
| 2.5 | Green Castle International and DP World (Bosaso): job title, years and permission to name DP World |
| 2.6 | International assignments (DR Congo, Kenya, South Sudan, UAE, Cameroon): countries, years and the approximate number of chefs trained. The previous site said "50+ across 5 countries"; not shown until confirmed |
| 2.7 | Role titles listed per country in "Experience by country", e.g. "Senior Aviation Specialist", "Head of Dining Operations" |
| 2.8 | "Shabati cuisine" (UAE): confirm the correct name of this cuisine |

**Previous claims not repeated in the new homepage wording until confirmed.** They remain in `chefProfile.ts`.
- "Hundreds of students" / "100s Students & Chefs Trained"
- "Established … as a trusted benchmark"
- "Resulting in elevated guest satisfaction ratings"
- "Zero-tolerance food safety standards", "flawless food safety"

## 3. Education and credentials

| # | Item |
|---|---|
| 3.1 | Full degree title, field of study and graduation year (Makerere University Business School) |
| 3.2 | Which "focus areas" were part of the MUBS degree and which come from professional practice |
| 3.3 | MUBS professional certificates: titles and years |
| 3.4 | Any HACCP or food-safety certificate: official title, issuer, year |
| 3.5 | "Featured in Ugandan culinary publications": titles, publishers, editions |
| 3.6 | Bloven Baking Academy recognition: name of the award and year |
| 3.7 | Whether learners receive a certificate from his classes, and from whom |

> On the About page, items were labelled "Profile verified" even though the supporting documents have not been supplied. That label is now shown **only in review mode**, until the documents are available.

## 4. Books

| # | Item |
|---|---|
| 4.1 | For each book: publisher (or self-published), year, ISBN, format (print / PDF), price and how readers obtain a copy |
| 4.2 | Confirm that the listed "Topics covered" match the real chapters |
| 4.3 | **Title check:** the website says "Secrets of a Successful Baker" (plural), but the cover artwork reads "SECRET OF A SUCCESSFUL BAKER" (singular). Confirm the correct title |
| 4.4 | Confirm that the cover images are the final published covers |

No purchase or download links are shown. Visitors use **Request information**, which opens the enquiry form.

## 5. Gallery

| # | Item |
|---|---|
| 5.1 | Confirm which photographs show dishes Chef Peter prepared, and that he has permission to publish them |
| 5.2 | Five items use stock photographs and are labelled **"Illustrative image"** on the site: Nigerian Smoky Jollof Rice, Gulf Shabati Flatbread, Italian Truffle Tagliatelle, Dark Chocolate Drip Cake, Commercial Sourdough Boule. Replace them with his own photos, or approve their removal |
| 5.3 | Confirm that dish names and descriptions match each photograph |

## 6. Services and classes

| # | Item |
|---|---|
| 6.1 | Approve the six service descriptions (`SERVICE_PATHWAYS` in `src/data/siteContent.ts`) |
| 6.2 | Class practicalities: levels, duration, group sizes, location, fees (or "from" prices), schedule |
| 6.3 | Genuine testimonials (with permission) from students and clients, if available |

## 7. Contact

| # | Item |
|---|---|
| 7.1 | Phone / WhatsApp +256 752 345858; emails dechosenevents@gmail.com (primary) and chefpetertheteacher@gmail.com: confirm both are current and which is primary |
| 7.2 | The enquiry form needs `VITE_WEB3FORMS_ACCESS_KEY` set in Vercel; otherwise visitors are asked to use WhatsApp, phone or email |
