# How to Connect Website to Google Drive

To make your website automatically sync with a Google Drive folder, we need to create a tiny "Bridge" script. This is because your website is public, but your Drive is private.

> [!WARNING]
> **Privacy & Security Notice**
> 1.  **Public Folder**: The specific folder you choose ("MadniWebsite") will essentially become public. Anyone with the link could view the photos inside it. **Do not put private documents (like receipts or contracts) in this folder.** Only put the photos you want on the website.
> 2.  **Safety**: This setup **ONLY** exposes that specific folder. The rest of your Google Drive (your emails, other files) remains 100% private and secure. The script cannot see anything outside the folder you give it.

## Step 1: Create the Drive Folder
1.  Create a folder in Google Drive named **"MadniWebsite"**.
2.  Inside it, create your category folders (e.g., "Doors", "Kitchens").
3.  Inside those, create project folders with images.
4.  **Important**: Right-click "MadniWebsite" -> Share -> **Anyone with the link** -> **Viewer**.
5.  **Copy the Folder ID** from the browser URL (it's the long random text after `folders/`).
    *   Example: `1a2b3c4d5e6f...`

## Step 2: Create the "Bridge" Script
1.  Go to **[script.google.com](https://script.google.com)**.
2.  Click **New Project**.
3.  Delete any code there and **PASTE** the code below:

```javascript
// REPLACE THIS WITH YOUR FOLDER ID
const ROOT_FOLDER_ID = 'PASTE_YOUR_FOLDER_ID_HERE';

function doGet() {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const categories = root.getFolders();
  let projects = [];
  
  while (categories.hasNext()) {
    let catFolder = categories.next();
    let catName = catFolder.getName().toLowerCase();
    let projectFolders = catFolder.getFolders();
    
    while (projectFolders.hasNext()) {
      let pFolder = projectFolders.next();
      let pName = pFolder.getName(); // "Royal Teak Door"
      let pId = pName.toLowerCase().replace(/\s+/g, '-');
      let images = [];
      let files = pFolder.getFiles();
      
      while (files.hasNext()) {
        let file = files.next();
        let imgUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); 
        images.push(imgUrl);
      }
      
      if (images.length > 0) {
        projects.push({
          id: pId,
          title: pName,
          category: catName,
          description: "Imported from Google Drive",
          details: { "Source": "Google Drive" },
          images: images
        });
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify(projects))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Step 3: Publish the Bridge
1.  In the script editor, click **Deploy** (blue button top right) -> **New deployment**.
2.  Click the "Select type" gear icon -> **Web app**.
3.  Description: "Website API".
4.  Execute as: **Me**.
5.  Who has access: **Anyone** (This is important! so your website can read it).
6.  Click **Deploy**.
7.  **COPY the "Web app URL"**. It looks like `https://script.googleusercontent.com/...`

## Step 4: Link to Your Website
1.  Open the file `js/main.js` on your computer.
2.  Find the line `const DRIVE_API_URL = '';` at the top.
3.  Paste your copied URL inside the quotes.
    *   `const DRIVE_API_URL = 'https://script.google...';`
4.  Save.

**DONE!** Now your website loads projects directly from your Drive.
