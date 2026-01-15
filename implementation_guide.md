# WordPress Implementation Guide: Madni Wooden Legacy

This guide allows you to build the "Madni Wooden Legacy" site without writing code, while ensuring it is secure and easy to update.

## 1. Content Management Setup (The "Easy Edit" System)

To make the site editable without code, we will not hard-code projects. We will create a structured system.

**Required Free Plugins:**
*   **CPT UI (Custom Post Type UI):** Allows you to create a "Projects" section in the dashboard (separate from Blog Posts).
*   **ACF (Advanced Custom Fields):** Allows you to add specific fields like "Material", "Finish", "Dimensions" to your projects.

### Step 1: Create "Projects" Post Type
1.  Go to **CPT UI > Add/Edit Post Types**.
2.  **Slug:** `project`
3.  **Plural Label:** `Projects`
4.  **Singular Label:** `Project`
5.  **Settings:** Enable "Has Archive" (True). Supports: Title, Editor, Thumbnail, Excerpt.

### Step 2: Create Categories
1.  Go to **CPT UI > Add/Edit Taxonomies**.
2.  **Slug:** `project_category`
3.  **Attach to:** `Projects`
4.  Add categories: Doors, Kitchens, Wardrobes.

**Result:** You (or your client) can now go to "Projects > Add New", type a title, upload a photo, check "Doors", and hit Publish. No Elementor editing needed for new content.

---

## 2. Security & Image Protection Implementation

You requested to **disable right-click**. While no method is 100% full-proof against hackers, this prevents 99% of casual theft.

### Method A: Plugin (Recommended for No-Code)
Install: **"WP Content Copy Protection & No Right Click"**
*   **Settings:**
    *   Protect Post/Home Page: [Yes]
    *   Show Alert Message: "Content is protected."

### Method B: Custom Code Snippet (Lightweight)
If you prefer not to use a heavy plugin, add this small code snippet to **Elementor > Custom Code** (if Pro) or install the free **"WPCode"** plugin and add a "Footer Script".

**Snippet (JavaScript):**
```javascript
<script>
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  alert('Sorry, right-click is disabled to protect our designs.');
});

document.onkeydown = function(e) {
  if((e.ctrlKey || e.metaKey) && (e.key == 'p' || e.key == 's')) {
     e.preventDefault();
     alert('Printing and saving is disabled.');
  }
}
</script>
```

**Snippet (CSS - Prevent Dragging):**
Add this to **Appearance > Customize > Additional CSS**:
```css
/* Disable image dragging and selection */
img {
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    -webkit-touch-callout: none; /* iOS Safari */
    user-select: none; /* No text selection */
    pointer-events: auto; /* Allow clicking but not context menu if JS fails */
}
```

---

## 3. Elementor Design Implementation (The "Look")

### Global Colors (Set this first in Elementor Site Settings)
*   **Primary:** `#4A0404` (Deep Mahogany)
*   **Secondary:** `#D4AF37` (Gold Accent)
*   **Text:** `#333333` (Dark Grey)
*   **Accent:** `#1A1A1A` (Charcoal Black)

### Recommended Widget Structure (Home Page)

**Section 1: Hero**
*   **Widget:** Slides (Pro) or Inner Section with Background Video.
*   **Overlay:** Black [Op: 0.5]
*   **Content:** Heading "Madni Wooden Legacy", Button "Explore Collection" (Link: `/projects`).

**Section 2: Categories**
*   **Widget:** Image Box
*   **Settings:** Image Position: Top. Title: "Doors". Description: "Solid Teak & Carved".
*   **Link:** Custom URL to `/project_category/doors/`.

**Section 3: Featured Work (Dynamic)**
*   **Widget:** Posts (or Loop Grid).
*   **Query Source:** "Projects".
*   **Filter:** " Featured".
*   *Note: Using the Posts widget connects your design to the CPT setup. You never have to edit the Home Page to add new work. Just mark a project as 'Featured' in the dashboard.*

---

## 4. WhatsApp Button
Install **"Join.chat"** (Free).
*   **Settings:**
    *   Telephone: `[Your Number]`
    *   Message: `Hi, I saw your website and want to discuss a project.`
    *   Position: Right.
    *   Delay: 3 seconds (Grab attention after load).

