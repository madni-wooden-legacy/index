# The "Magic Script" Manual: Managing Your Website via Folders

This guide explains how to use the **`update_website.ps1`** script. This system allows you to manage your entire portfolio by simply organizing folders on your computer, without writing a single line of code.

## 1. The Golden Rule of Folders
To make the script work, you must follow this **3-Level Hierarchy** inside the `assets/projects` folder:

### Level 1: Category
*   Examples: `Doors`, `Kitchens`, `Beds`, `Stairs`.
*   **What it does**: This automatically creates the **Filter Buttons** on your website.

### Level 2: Project Name (Standard Mode)
*   **Create a Folder**, e.g. `Luxury-Villa-DHA`.
*   **Inside this folder**:
    *   **Option A**: Paste all images directly. (Simple Gallery)
    *   **Option B (Organized)**: create **Sub-folders**.
        *   `Entrance/img1.jpg`
        *   `LivingRoom/img2.jpg`
        *   `Kitchen/img3.jpg`
    *   **Result**: The website will create a **List at the top** (Entrance | LivingRoom | Kitchen) and group the photos automatically!

### Level 2 (ALTERNATIVE): Fast Mode (No Project Name)
If you **don't want to create folders** for every single item:
*   **Just paste the images directly** into the Category Folder (`assets/projects/Doors`).
*   The script will automatically turn **each image into its own Project**.

---

## 2. A Real Example
If you want to add a new **Bed** to the website:

1.  Open your computer folder: `Madni Wooden Legacy Website` -> `assets` -> `projects`.
2.  Create a folder named **`Beds`** (If it doesn't exist yet).
3.  Go inside `Beds`. Create a folder named **`King-Size-Mughal`**.
4.  Go inside `King-Size-Mughal`. Paste your 5 photos.

## 3. Running the Magic Script
1.  Go back to the main website folder.
2.  **Right-Click** `update_website.ps1` -> **"Run with PowerShell"**.

## 4. Troubleshooting
*   **"I see no images!"**: Check that your images are `.jpg` or `.png`.
*   **"The layout looks weird"**: The site now uses a **Smart Masonry Layout**, so tall and wide images fit perfectly together like a puzzle.

---

## 5. Advanced: "Super Portfolio" Mode
If you want a Category (like **Kitchens**) to show up as just **ONE BIG CARD** on the home page, but still have different sections inside it (Modern, Simple, Classic):

1.  Open the category folder (e.g., `assets/projects/kitchens`).
2.  Create a NEW text file named: **`combine.txt`** (It can be empty).
3.  Run the script.

**What happens?**
*   The system will ignore your individual folders as "Projects".
*   It will create ONE project called **"Kitchens Portfolio"**.
*   It will take your sub-folders (Modern, Simple) and turn them into **Sections** inside that one portfolio.

