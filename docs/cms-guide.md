# Chef Peter CMS: guide for administrators

This guide explains how to manage the Culinary Library. No technical knowledge is needed.

Sign in at **`/admin/login`** with your administrator email address and password.

---

## Dashboard

The first page after signing in shows:

- **Numbers:** total articles, published, drafts and scheduled. Click a number to see those articles.
- **Recently updated** and **Recently published** articles.
- **Scheduled to go live:** what will be published next, shown in Kampala time.
- **Needs attention:** published articles missing a category, a featured image or an introduction.
- **Categories:** how many articles each subject has.

---

## Articles

**Articles** in the menu lists every article.

- **Search** by a word from the title or web address, then press Enter.
- Use the **status tabs** to show articles by status: All, Published, Drafts, Scheduled or Archived.
- **Filters:**
  - Category.
  - Format.
  - Date range: last updated, published or created.
- Each row shows the article's **status** and what it means for visitors, for example "Live since 20 Oct 2026" or "Goes live 15 Jan, 09:00 (Kampala)". A ★ **Featured** label marks the featured article.

### Actions on each row

| Icon | Action | What happens |
|---|---|---|
| ✏️ | Edit | Opens the editor. |
| 👁 | Preview | Opens the article as visitors will see it, in a new tab. |
| ↗ | View on website | Published articles only. |
| 🚫 | Unpublish | Removes it from the website and returns it to draft. Asks first. |
| 🗄 | Archive | Hides it from the website and keeps it safely. Asks first. |
| ↺ | Restore | Archived articles: returns them to draft. Asks first. |
| 🗑 | Delete | Drafts and archived articles only. **Permanent.** Asks first. Archive instead if you might need the article again. |

---

## Writing an article

1. Click **New article**.
2. Fill in:
   - **Title**;
   - **URL slug**, which is created from the title;
   - **Excerpt**: the short introduction shown on cards and in Google.
3. Write the **article body**:
   - Use **H2** for main sections. Three or more H2 headings automatically create a table of contents.
   - Use the **numbered list** button for steps.
   - Use **Insert box…** for a highlighted *Chef's tip*, *Chef's note*, *Safety note* or *In the Ugandan kitchen* box.
   - Use the **image** button to insert a picture from the media library.
4. Choose a **featured image**, then check its **alt text** (a short description for blind readers) and **caption**. Both are saved in the media library.
5. In the right-hand column:
   - choose the **Article format** (recipe, tutorial, guide and so on) and, if useful, insert a **starter outline**;
   - tick **Featured** or **Editor's selection** if the article should be promoted;
   - for recipes and tutorials, fill in the **recipe details**: times, ingredients, equipment, steps, notes, storage and allergens. Add **extra sections** such as "Troubleshooting". Use ↑ ↓ to reorder steps and sections. None of these fields are required;
   - choose **categories** (mark one as *Primary*) and **tags**. Type a new tag and press Enter to create it.
6. Open **SEO settings** for a custom search title, description or social-sharing image.

The coloured banner at the top always says where the article stands:

| Banner | Meaning |
|---|---|
| **Draft:** not visible on the website | Changes save automatically. |
| **Scheduled:** goes live on … (Kampala) | It will publish itself at that time. |
| **Live on the website** (green) | Saved changes appear to visitors straight away. The main button reads **Update published article**. |
| **Archived** | Hidden from the website. |

### Preview, publish and schedule
- **Preview** shows the article exactly as visitors will see it, **including changes you have not saved yet**. Previewing never publishes anything.
- **Publish now** asks for confirmation before anything appears on the website.
- To **schedule**, choose a date and time in **Kampala time** and click **Schedule publication**. You can cancel the schedule at any time.
- **Unpublish** takes a live article off the website and keeps it as a draft.
- **Revision history** (below the editor) lets you restore an earlier version.

---

## Categories and tags

- **Categories** are the main subjects of the library. Add, rename or describe them under **Categories**.
- **Changing a slug** changes the category's web address. Links to the old address will stop working.
- **Ordering and hiding** (after the database upgrade): use ↑ ↓ to set the order visitors see. Use the eye icon to **hide** a category from the library without touching its articles.
- **Deleting a category:**
  - an empty category is deleted after you confirm;
  - a category that **contains articles cannot be deleted directly**. You must first choose another category to move its articles to, so no article is left without a subject.
- **Tags** are specific topics, such as an ingredient or technique. You can rename and delete them. Deleting a tag removes it from the articles listed in the warning; the articles themselves are kept.

---

## Media library

- Drag images onto the upload area. A progress bar shows each upload, and clear messages explain any problem (file too large, wrong type, permission).
- **Search** by file name, alt text or caption.
- Under **Filters**, tick **Only images missing alt text** to find images that still need a description.
- Click an image to edit its **alt text**, **caption** and **credit**, see its size and dimensions, and see which articles use it before deleting it.

---

## Author profile

**Author profile** holds the biography and photo shown under every article and on the library page.

- Edit it once and every article updates.
- **Fill in the approved Chef Peter profile** loads the approved wording.
- Choose the photo from the media library.
- Until the author-profile database upgrade is applied, the website shows the approved profile automatically. The page explains this.

---

## Good practice
- Write an excerpt for every article, and give every image alt text.
- Give every published article a primary category. The dashboard lists any that are missing one.
- Never state a fact, date, origin or food-safety rule you cannot support, and name the source for safety guidance.
