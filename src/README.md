# Chef Peter the Teacher & De'Chosen Events Consultants
> **Executive Hospitality Portfolio, Master Culinary & Baking Academy, & Consultation Platform**

Welcome to the official web repository for **Chef Peter the Teacher** (Yiga Edward Peter Kirigwajjo Zimwanguyizza Mulindwa) and **De'Chosen Events Consultants**.

---

## 📖 STEP-BY-STEP CUSTOMIZATION & SETUP GUIDELINES

Follow these clear, step-by-step instructions to personalize photos, customize gallery dishes, configure email forms, and publish the website on Google Search.

---

### 📷 STEP 1: How to Add / Change Chef Peter's Photos (Any Image Format)

You can use **ANY IMAGE FORMAT** (`.jpg`, `.png`, `.webp`, `.avif`, `.svg`, or direct web URL links).

#### Option A: Direct File Upload (Recommended)
1. Prepare your photo in any format (e.g. `chef-peter.jpg`, `chef-peter.png`, or `chef-peter.webp`).
2. Place the photo file inside the `/public/images/` folder in this project:
   - Example path: `/public/images/chef-peter-hero.jpg`
3. Open `src/data/chefProfile.ts` in your code editor.
4. Locate the `chefImages` section near the top:
   ```typescript
   chefImages: {
     heroPortrait: "/images/chef-peter-hero.jpg", 
     storyPortrait: "/images/chef-peter-story.jpg",
     authorPortrait: "/images/chef-peter-author.jpg"
   }
   ```
5. Save the file! The website will automatically display your uploaded photo.

#### Option B: Using a Direct Web Link
If your photo is hosted online (e.g. Google Drive public link, Imgur, Unsplash, or Cloudinary):
1. Open `src/data/chefProfile.ts`.
2. Replace the path with your full web link:
   ```typescript
   chefImages: {
     heroPortrait: "https://your-domain.com/photos/chef-peter.jpg"
   }
   ```

> 💡 **Smart Fallback Safety:** If an image link is missing or invalid, our built-in `ImageWithFallback` component will automatically render an elegant, gold-accented "📸 Image Placeholder" box with step-by-step instructions rather than breaking your layout.

---

### 🍲 STEP 2: How to Add & Edit Gallery Dishes (Ugandan, African & International Cuisines)

All gallery dishes are centrally managed in `src/data/galleryData.ts`.

#### Adding a New Dish to the Gallery:
1. Open `src/data/galleryData.ts`.
2. Scroll to the category where you want to add the dish (`Ugandan`, `African`, `International`, `Baking`, or `Fine Dining`).
3. Copy and paste an existing item block, then customize it:
   ```typescript
   {
     id: "ugandan-my-custom-dish",
     title: "Traditional Ugandan Dish Name",
     category: "Ugandan",
     secondaryCategories: ["African", "Fine Dining"],
     countryOrigin: "Uganda 🇺🇬",
     description: "Delicious description of ingredients, cooking style, and presentation.",
     imagePath: "/images/my-dish.jpg", // Or direct web link
     placeholderLabel: "UGANDAN DISH — Custom Dish Name",
     tags: ["Uganda", "Custom Dish", "Chef Special"],
     featured: true
   }
   ```
4. Save the file. The Gallery filter buttons will automatically update!

---

### ✉️ STEP 3: How to Receive Contact Form Inquiries at `info@dechosenevents.com`

To make the "Submit Inquiry" form send messages directly to your email inbox:

1. Visit [Formspree.io](https://formspree.io) (Free email routing service).
2. Create a free account using your email address (`info@dechosenevents.com` or `raymarinternational@gmail.com`).
3. Click **"Create New Form"** and set the target email to `info@dechosenevents.com`.
4. Formspree will provide you a endpoint URL like:
   `https://formspree.io/f/xyzyraabc`
5. Open `src/components/ContactCTASection.tsx` in your code editor.
6. Locate line 21 at the top of the file:
   ```typescript
   const FORMSPREE_ENDPOINT: string = "https://formspree.io/f/xyzyraabc";
   ```
7. Paste your endpoint URL between the quotes and save! Now every website inquiry will land straight in your email inbox with sender name, phone number, service requested, and message details.

---

### 📞 STEP 4: How to Update Phone, WhatsApp & Email Details

All contact information is stored in **ONE** place and automatically updates across the entire site (Navbar, Hero, Contact section, WhatsApp floating button, and Footer).

1. Open `src/data/chefProfile.ts`.
2. Update the `contactDetails` object:
   ```typescript
   contactDetails: {
     phoneDisplay: "+256 752345858",
     phoneRaw: "+256752345858",
     whatsappDisplay: "+256 752345858",
     whatsappNumber: "256752345858", // Numbers only with country code (no + or spaces)
     whatsappDefaultMessage: "Hello Chef Peter, I am interested in your Culinary & Baking Classes and Hospitality Advisory services through De'Chosen Events Consultants.",
     email: "info@dechosenevents.com",
     locationDisplay: "Kampala, Uganda",
     officeAddress: "De'Chosen Events Consultants Headquarters, Kampala, Uganda"
   }
   ```

---

### 🌐 STEP 5: Free 1-Click Website Hosting & Google Search Indexing

#### Free Hosting on Vercel or Netlify:
1. Export or push this project repository to GitHub or download as a ZIP file.
2. Go to [Vercel.com](https://vercel.com) or [Netlify.com](https://netlify.com) and create a free account.
3. Select **"Import Project"**, choose this project repository, and click **Deploy**.
4. Within 60 seconds, your site will be live with a free SSL certificate (`https://dechosen-events.vercel.app`).
5. To attach your custom domain (`dechosenevents.com`), go to **Settings > Domains** in Vercel/Netlify and add `dechosenevents.com`.

#### Indexing on Google Search Console:
1. Visit [Google Search Console](https://search.google.com/search-console).
2. Add property `https://dechosenevents.com`.
3. Verify ownership via DNS record from your domain registrar.
4. Submit your sitemap link: `https://dechosenevents.com/sitemap.xml`.
5. Google will automatically crawl and rank your portfolio for terms like *"Chef Peter the Teacher"*, *"De'Chosen Events Consultants"*, and *"Baking Classes Kampala Uganda"*.

---

## 🛠️ TECHNICAL ARCHITECTURE & STACK

- **Framework**: React 18 with TypeScript & Vite
- **Styling**: Tailwind CSS (Sophisticated Dark Luxury Canvas with Gold `#C5A059` Accents)
- **Icons**: Lucide React
- **Animations**: Framer Motion & CSS keyframe floats
- **Image Resilience**: Built-in `ImageWithFallback` wrapper supporting WebP/AVIF/JPG/PNG/SVG and graceful failure recovery.

---

## 📞 NEED ASSISTANCE?
For questions regarding **De'Chosen Events Consultants** services or technical inquiries:
- **Phone / WhatsApp**: +256 752345858
- **Email**: info@dechosenevents.com
- **Headquarters**: Kampala, Uganda
