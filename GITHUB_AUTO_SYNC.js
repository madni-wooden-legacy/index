// PASTE THIS INTO GOOGLE APPS SCRIPT (script.google.com)
// This will automatically update your website data every day at 3 AM Pakistan time

const ROOT_FOLDER_ID = '1u9USFGLYiBLIDQuHZpKOvj7O43hR_GG8';
const GITHUB_REPO_OWNER = 'YOUR_GITHUB_USERNAME'; // e.g., 'mohid123'
const GITHUB_REPO_NAME = 'madni-website'; // Your repository name
const GITHUB_TOKEN = 'YOUR_GITHUB_PERSONAL_ACCESS_TOKEN'; // Create at github.com/settings/tokens

// This function runs automatically every day
function updateWebsiteData() {
    try {
        // 1. Get data from Drive
        const projectsData = generateProjectsData();

        // 2. Create the data.js file content
        const fileContent = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Last updated: ${new Date().toISOString()}
 * Auto-synced from Google Drive
 */

let projects = ${JSON.stringify(projectsData, null, 2)};
`;

        // 3. Update the file on GitHub
        updateGitHubFile('js/data.js', fileContent);

        console.log('✅ SUCCESS: Website data updated at ' + new Date());

    } catch (e) {
        console.error('❌ ERROR: ' + e.toString());
        // Optional: Send yourself an email notification
        MailApp.sendEmail({
            to: 'your-email@example.com',
            subject: 'Website Sync Failed',
            body: 'Error: ' + e.toString()
        });
    }
}

// Helper function to get all images recursively
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

// Generate projects data from Drive
function generateProjectsData() {
    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const categories = root.getFolders();
    let projects = [];

    while (categories.hasNext()) {
        let catFolder = categories.next();
        let catName = catFolder.getName().toLowerCase();

        let allImages = getAllImagesRecursive(catFolder);

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

    return projects;
}

// Update file on GitHub
function updateGitHubFile(filePath, content) {
    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${filePath}`;

    // Get current file SHA (required for update)
    const getOptions = {
        method: 'get',
        headers: {
            'Authorization': 'token ' + GITHUB_TOKEN,
            'Accept': 'application/vnd.github.v3+json'
        },
        muteHttpExceptions: true
    };

    const getResponse = UrlFetchApp.fetch(url, getOptions);
    const currentFile = JSON.parse(getResponse.getContentText());

    // Update the file
    const updatePayload = {
        message: 'Auto-update from Drive: ' + new Date().toISOString(),
        content: Utilities.base64Encode(content),
        sha: currentFile.sha
    };

    const updateOptions = {
        method: 'put',
        headers: {
            'Authorization': 'token ' + GITHUB_TOKEN,
            'Accept': 'application/vnd.github.v3+json'
        },
        contentType: 'application/json',
        payload: JSON.stringify(updatePayload)
    };

    UrlFetchApp.fetch(url, updateOptions);
}

// SETUP INSTRUCTIONS:
// 1. Paste this code into script.google.com
// 2. Fill in YOUR_GITHUB_USERNAME, madni-website, and YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
// 3. Click the clock icon (Triggers) on the left
// 4. Click "+ Add Trigger"
// 5. Choose:
//    - Function: updateWebsiteData
//    - Event source: Time-driven
//    - Type: Day timer
//    - Time: 3am to 4am
//    - Timezone: (GMT+05:00) Pakistan Standard Time
// 6. Save
