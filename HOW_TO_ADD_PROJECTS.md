# How to Add New Projects

This website uses a simple **Data File** to store your project information. You do NOT need to edit difficult HTML code to add new work.

## Step 1: Prepare Your Images
1.  Take photos of your new work.
2.  Rename them to something simple, e.g., `kitchen-dha-1.jpg`, `kitchen-dha-2.jpg`.
3.  Copy these image files into the website folder: `assets/images/`.
    *(If there is no `images` folder inside `assets`, you can create one).*

## Step 2: Update the Data File
1.  Open the file `js/data.js` in a text editor (Notepad is fine, or VS Code).
2.  You will see a list of projects starting with `const projects = [`.
3.  **Copy** one of the existing blocks (everything between `{` and `},`).
4.  **Paste** it at the top of the list (just after `[`).
5.  **Edit** the details:

```javascript
    {
        id: "my-new-project-name",   // Must be unique! Use dashes, no spaces.
        title: "New Luxury Kitchen", // The title shown to users
        category: "kitchens",        // see Category Tip below
        description: "Write your description here...",
        details: {
            // You can change these labels to anything you want
            "Material": "Ash Wood",
            "Finish": "Matt Black",
        },
        images: [
            // List your image filenames here
            "assets/images/kitchen-dha-1.jpg",
            "assets/images/kitchen-dha-2.jpg"
        ]
    },
```

### PRO TIP: Adding New Categories (Like "Beds")
If you want to add a new type of work that isn't on the website yet (e.g. "beds" or "stairs"):

1.  Simply type the new name in the category field: `category: "beds"`.
    ```javascript
    category: "beds",
    ```
2.  **That's it!** The website will automatically create a new button called "Beds" on the Collections page. You don't need to change any other code.

## Step 3: Save and Refresh
1.  Save the file.
2.  Open `index.html` or `collections.html` in your browser.
3.  Your new project will automatically appear!
