const ROOT_FOLDER_ID = '1u9USFGLYiBLIDQuHZpKOvj7O43hR_GG8';

function doGet() {
    try {
        const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
        const categories = root.getFolders();
        let projects = [];

        // Helper to get all images recursively
        function getAllImagesRecursive(folder) {
            let foundImages = [];
            let files = folder.getFiles();
            while (files.hasNext()) {
                let f = files.next();
                if (f.getMimeType().includes("image")) {
                    foundImages.push("https://lh3.googleusercontent.com/d/" + f.getId());
                }
            }
            let subFolders = folder.getFolders();
            while (subFolders.hasNext()) {
                foundImages = foundImages.concat(getAllImagesRecursive(subFolders.next()));
            }
            return foundImages;
        }

        while (categories.hasNext()) {
            let catFolder = categories.next();
            let catName = catFolder.getName().toLowerCase();

            // Get all images in this category (including subfolders)
            let allImages = getAllImagesRecursive(catFolder);

            // Only add if we found images
            if (allImages.length > 0) {
                projects.push({
                    id: catName.replace(/\s+/g, '-'),
                    title: catFolder.getName(),
                    category: catName,
                    description: "Exclusive collection of " + catFolder.getName(),
                    details: { "Type": "Premium Design Collection" },
                    images: allImages
                });
            }
        }

        return ContentService.createTextOutput(JSON.stringify(projects))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ "error": e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
