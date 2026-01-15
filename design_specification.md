# Madni Wooden Legacy - Website Design Specification

## 1. Brand Identity & Style Guide

### Color Palette (Premium & Luxury)
**Primary (Dark Mode / Accents):**
- **Charcoal Black:** `#1A1A1A` (Backgrounds, Headers in light mode)
- **Deep Mahogany:** `#4A0404` (Primary Brand Color - Buttons, Highlights)
- **Gold/Brass:** `#D4AF37` (Borders, Icons, Thin lines - Luxury feel)

**Secondary (Light Mode / Text):**
- **Off-White/Cream:** `#F9F9F9` (Backgrounds in light mode)
- **Warm Grey:** `#E5E5E5` (Section separators)
- **Slate Grey:** `#333333` (Body text)

### Typography
- **Headings:** *Playfair Display* (Serif - Elegant, Craftsmanship feel)
- **Body Text:** *Inter* or *Montserrat* (Sans-Serif - Clean, Modern, Readable)
- **Language Support:** Ensure fonts support Urdu characters (e.g., *Noto Nastaliq Urdu* via plugin or custom CSS for Urdu sections).

### Visual Elements
- **Border Radius:** 4px (Slightly rounded, refined)
- **Shadows:** Soft, diffused shadows (`box-shadow: 0 10px 30px rgba(0,0,0,0.1)`)
- **Animations:** Fade-in Up, Slow Zoom on Hover (Subtle, not flashy)

---

## 2. Sitemap

1. **Home** (Landing & Highlights)
2. **About Us** (Story, Craftsmanship, Process)
3. **Our Work** (Main Categories Page)
    - *Child Pages (Dynamic)*: Doors, Kitchens, Wardrobes, Furniture
4. **Contact** (Inquiry Form, Map, Info)

---

## 3. Technical Stack & Plugin Recommendations
*Focus: Free, Editable, Lightweight.*

1.  **Core:** WordPress + Elementor (Free)
2.  **Theme:** Hello Elementor (Lightweight canvas)
3.  **Header/Footer:** Elementor Header & Footer Builder (Free)
4.  **Custom Fields & Post Types:** **ACF (Advanced Custom Fields)** + **CPT UI**
    *   *Why?* This allows creating a "Projects" post type so you can add new work easily without touching the design.
5.  **Gallery/Lightmark:** Elementor Basic Gallery or valid free alternative like *Envira Gallery Lite*.
6.  **Multilingual:** **TranslatePress** or **Polylang** (Free versions allow basic switching).
7.  **Dark/Light Toggle:** *WP Dark Mode* (Free) or simple JavaScript snippet if avoiding plugins.
8.  **Image Protection:** *WP Content Copy Protection & No Right Click* (Free).
9.  **WhatsApp:** *Click to Chat* or *Join.chat*.

---

## 4. Page-by-Page Layout & Elementor Widget Map

### A. Home Page

| Section Name | Columns | Widgets / Content | Style Notes |
| :--- | :--- | :--- | :--- |
| **Hero Section** | 1 (Full Width) | **Background:** High-res video or slider of best work.<br>**Heading:** "Crafting Wood into Legacy"<br>**Sub-heading:** "Premium woodwork for luxury interiors"<br>**Button:** "View Collections" -> Links to Categories | Overlay: Dark gradient (`#000` @ 50% opacity). Text: White. |
| **Introduction** | 2 (50/50) | **Col 1:** Image (Craftsman at work)<br>**Col 2:** Heading "Who We Are", Text Block, Icon List (Quality, Experience), Button "Read More" | Minimalist layout. |
| **Top Categories** | 3 or 4 | **Image Box Widget** (Custom CSS for hover overlay).<br>Link to Door, Kitchen, etc. categories. | Use high-quality thumbnails. |
| **Featured Projects** | 1 | **Portfolio Widget** (if Pro) or **Posts Widget** (Query: Featured). Show 4-6 items grid. | Masonry layout looks premium. |
| **Why Choose Us** | 3 | **Icon Box Widgets:** 1. Custom Design, 2. Premium Materials, 3. Timely Delivery. | Icons in Gold color. |
| **Urgency/CTA** | 1 | **Heading:** "Ready to Transform Your Space?"<br>**Inner Section (2 Col):** WhatsApp Button, Call Button. | Dark Background (`#1A1A1A`). |

### B. Categories / Work Showcase (Archive Page)

| Section Name | Columns | Widgets / Content | Style Notes |
| :--- | :--- | :--- | :--- |
| **Page Header** | 1 | **Heading:** "Our Collections"<br>**Breadcrumbs** | Minimal height pattern background. |
| **Category Grid** | 3 (Responsive) | **Archive Posts Widget** (or Loop Grid). displaying Custom Post Type "Projects" Categories.<br>Thumbnail + Title. | Clean grid, large images. |

### C. Single Category / Project Page (Dynamic Template)
*Designed once, applied to all projects.*

| Section Name | Columns | Widgets / Content | Style Notes |
| :--- | :--- | :--- | :--- |
| **Project Hero** | 2 (60/40) | **Col 1:** Project Title, Short Description, details (Material, Finish).<br>**Col 2:** Main Featured Image. | Sticky Col 1 usually helps UX. |
| **Gallery Grid** | 1 | **Basic Gallery** or **Masonry Gallery**. All images of this project. | Enable Lightbox = Yes. |
| **Related Projects** | 1 | **Posts Widget** (Exclude current, Same category). | "You might also like..." |
| **Inquiry CTA** | 1 | **Button:** "Inquire about this Design" (WhatsApp link with pre-filled message "Interested in [Post Title]"). | Floating or fixed at bottom. |

### D. Contact Page

| Section Name | Columns | Widgets / Content | Style Notes |
| :--- | :--- | :--- | :--- |
| **Info & Form** | 2 (40/60) | **Col 1:** Contact Info (Phone, Email, Address), Social Icons.<br>**Col 2:** Form (Name, Phone, Category Interest, Message). | Clean layout. |
| **Map** | 1 | **Google Maps Widget**. | Full width or boxed. |

---

## 5. UX Flow & Functionality

### Navigation
- **Sticky Header:** Logo (Left), Menu (Center), Language Switcher + Search (Right).
- **Mobile Menu:** Hamburger menu slides from side (Off-canvas).

### Dynamic & Scalable Content (Crucial)
Instead of manually editing pages to add new doors or cabinets, we will use **CPT UI + ACF**.
- **Admin Workflow:**
    1. Dashboard -> Projects -> Add New.
    2. Enter Title: "Teak Wood Main Door".
    3. Upload Featured Image & Gallery Images.
    4. Select Category: "Doors".
    5. Publish.
    *The Elementor Archive template automatically updates to show this new item.*

### Image Protection strategy
1.  **Right-Click Disable:** Plugin handles this.
2.  **Watermarking:** Use a plugin like *Image Watermark* to auto-add "Madni Legacy" logo on upload.
3.  **Optimization:** Use *Smush* or *EWWW Image Optimizer* to resize images on upload so original high-res files are never served.

### Multi-Language (Urdu)
- Use **TranslatePress** (Visual Translator). It adds a floater or menu item.
- You browse the site, click "Translate Site" in admin bar, click any text (e.g., "Home"), and type "گھر".
- Keeps layout intact.

## 6. Implementation Checklist

- [ ] Install Hello Theme & Elementor.
- [ ] Install CPT UI & ACF (Create 'Projects' post type & 'Project Type' taxonomy).
- [ ] Create Elementor Templates for Single Project & Archive.
- [ ] Configure WP Dark Mode (Floating switch bottom left).
- [ ] Set up Contact Form 7 or Elementor Form (Ensure email delivery).
- [ ] Add "Click to Chat" plugin for WhatsApp.
