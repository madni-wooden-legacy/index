// REPLACE THIS WITH YOUR FOLDER ID (Same one as before: 1u9...)
const ROOT_FOLDER_ID = '1u9USFGLYiBLIDQuHZpKOvj7O43hR_GG8';

function debugDrive() {
    try {
        const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
        console.log("SUCCESS: Found Root Folder: " + root.getName());

        const categories = root.getFolders();
        let catCount = 0;

        while (categories.hasNext()) {
            let cat = categories.next();
            catCount++;
            console.log("  📂 Found Category Folder: " + cat.getName());

            let projects = cat.getFolders();
            let pCount = 0;

            while (projects.hasNext()) {
                let p = projects.next();
                pCount++;

                let files = p.getFiles();
                let imgCount = 0;
                while (files.hasNext()) {
                    files.next();
                    imgCount++;
                }

                console.log("    🔨 Found Project Folder: " + p.getName() + " (Contains " + imgCount + " files)");

                if (imgCount === 0) {
                    console.log("       ⚠️ WARNING: Project " + p.getName() + " has NO files directly inside it!");
                }
            }

            if (pCount === 0) {
                console.log("     ⚠️ WARNING: Category " + cat.getName() + " has NO Project folders inside it!");
            }
        }

        if (catCount === 0) {
            console.log("⚠️ CRITICAL ERROR: Found 0 Category folders inside Root!");
        } else {
            console.log("✅ FINISHED. Found " + catCount + " categories.");
        }

    } catch (e) {
        console.log("❌ ERROR: Could not find folder with ID: " + ROOT_FOLDER_ID);
        console.log("Error details: " + e.toString());
    }
}
