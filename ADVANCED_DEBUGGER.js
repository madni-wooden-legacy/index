// PASTE THIS INTO GOOGLE APPS SCRIPT EDITOR
// Run the function "deepDebug" to see EVERYTHING

const ROOT_FOLDER_ID = '1u9USFGLYiBLIDQuHZpKOvj7O43hR_GG8';

function deepDebug() {
    try {
        const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
        console.log("✅ ROOT FOLDER: " + root.getName());
        console.log("---");

        const categories = root.getFolders();

        while (categories.hasNext()) {
            let cat = categories.next();
            console.log("📂 CATEGORY: " + cat.getName());

            let projects = cat.getFolders();

            while (projects.hasNext()) {
                let proj = projects.next();
                console.log("  🔨 PROJECT: " + proj.getName());

                // Check direct files
                let directFiles = proj.getFiles();
                let directCount = 0;
                while (directFiles.hasNext()) {
                    let f = directFiles.next();
                    directCount++;
                    console.log("    📄 DIRECT FILE: " + f.getName() + " (Type: " + f.getMimeType() + ")");
                }

                if (directCount === 0) {
                    console.log("    ⚠️ NO direct files found");
                }

                // Check subfolders
                let subFolders = proj.getFolders();
                let subCount = 0;
                while (subFolders.hasNext()) {
                    let sub = subFolders.next();
                    subCount++;
                    console.log("    📁 SUBFOLDER: " + sub.getName());

                    // Check files inside subfolder
                    let subFiles = sub.getFiles();
                    let subFileCount = 0;
                    while (subFiles.hasNext()) {
                        let sf = subFiles.next();
                        subFileCount++;
                        console.log("      📄 FILE: " + sf.getName() + " (Type: " + sf.getMimeType() + ")");
                    }

                    if (subFileCount === 0) {
                        console.log("      ⚠️ This subfolder is EMPTY");
                    }
                }

                if (subCount === 0) {
                    console.log("    ℹ️ No subfolders");
                }

                console.log("  ---");
            }

            console.log("===");
        }

        console.log("🏁 DEBUG COMPLETE");

    } catch (e) {
        console.log("❌ ERROR: " + e.toString());
    }
}
