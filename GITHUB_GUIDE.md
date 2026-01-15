# How to Maintain Your Website on GitHub

Yes! You can absolutely upload this project to GitHub and manage everything from there for free.

## Phase 1: Uploading to GitHub
1.  **Create an Account** on [github.com](https://github.com).
2.  Click the **+** icon (top right) -> **New repository**.
3.  Name it (e.g., `madni-legacy`).
4.  Make sure it is **Public**.
5.  Click **Create repository**.
6.  Click **"uploading an existing file"** link.
7.  Drag and drop **ALL** your website files and folders (`index.html`, `style.css`, `js` folder, `assets` folder, etc.) into the box.
8.  Click **Commit changes**.

## Phase 2: Going Live (GitHub Pages)
1.  In your repository, go to **Settings** (top tabs).
2.  On the left, scroll down to **Pages**.
3.  Under **Branch**, select `main` (or `master`) and folder `/ (root)`.
4.  Click **Save**.
5.  Wait about 1-2 minutes. Refresh the page. You will see a link like `https://yourname.github.io/madni-legacy/`. **This is your live website!**

---

## Phase 3: Updating Your Live Site (The Easy Way)

Since you are using the **Magic Script** to manage folders on your computer, here is how you update the live website:

1.  **Do your work on your computer**: Add new folders/images and run the `update_website.ps1` script as usual. Check that it looks good on your local computer.
2.  **Go to GitHub.com**: Open your repository.
3.  **Upload Changes**:
    *   Click **Add file** -> **Upload files**.
    *   Drag and drop the **`js/data.js`** file (this is the one the script updated!).
    *   Drag and drop your **New Image Folders** (from `assets/projects/...`).
    *   Click **Commit changes**.

**Pro Tip (Desktop App):**
If you want this to be even easier, download **GitHub Desktop**.
1.  It connects your computer folder to GitHub.
2.  When you run the script and make changes, GitHub Desktop will show you a button "Push to Origin".
3.  You click that one button, and your live site updates instantly. No dragging and dropping needed!
