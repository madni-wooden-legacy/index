// PASTE THIS INTO GOOGLE APPS SCRIPT (script.google.com)
// This will automatically update your website data every day at 3 AM Pakistan time

const ROOT_FOLDER_ID = '1u9USFGLYiBLIDQuHZpKOvj7O43hR_GG8';
const GITHUB_REPO_OWNER = 'Mohid-Abbas';
const GITHUB_REPO_NAME = 'MadniWoodenLegacy';
const GITHUB_TOKEN = 'ghp_5xWnH113B5OosW5irzgSNzJ3CGdxOU1tQIUD';

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
    }
}

// Helper function to get all images AND VIDEOS recursively
function getAllFilesRecursive(folder) {
    let foundFiles = [];
    let files = folder.getFiles();
    while (files.hasNext()) {
        let f = files.next();
        let mime = f.getMimeType();

        // Check for IMAGE or VIDEO
        if (mime.includes("image")) {
            foundFiles.push({
                url: "https://lh3.googleusercontent.com/d/" + f.getId(),
                type: "image",
                mime: mime
            });
        } else if (mime.includes("video")) {
            // Check if already uploaded to YouTube
            let youtubeId = getYoutubeIdFromDescription(f);

            if (!youtubeId) {
                console.log('🚀 Uploading new video to YouTube: ' + f.getName());
                youtubeId = uploadFileToYouTube(f.getId(), f.getName());
                if (youtubeId) {
                    setYoutubeIdInDescription(f, youtubeId);
                }
            }

            if (youtubeId) {
                foundFiles.push({
                    url: youtubeId, // We'll store the ID here
                    type: "youtube", // Clarify it's a youtube ID
                    mime: mime
                });
            } else {
                // Fallback to Drive URL if YouTube failed
                foundFiles.push({
                    url: "https://lh3.googleusercontent.com/d/" + f.getId(),
                    type: "video",
                    mime: mime
                });
            }
        }
    }
    let subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
        foundFiles = foundFiles.concat(getAllFilesRecursive(subFolders.next()));
    }
    return foundFiles;
}

/**
 * Uploads a video from Google Drive to YouTube (Unlisted)
 * Requires YouTube Data API v3 Service to be enabled
 */
function uploadFileToYouTube(fileId, title) {
    try {
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();

        const resource = {
            snippet: {
                title: title || file.getName(),
                description: 'Uploaded automatically from Madni Wooden Legacy Gallery',
                categoryId: '22' // People & Blogs
            },
            status: {
                privacyStatus: 'unlisted' // As requested
            }
        };

        // This is the call that requires the YouTube Service
        const video = YouTube.Videos.insert(resource, 'snippet,status', blob);
        return video.id;
    } catch (e) {
        console.error('❌ YouTube Upload Failed: ' + e.toString());
        return null;
    }
}

function getYoutubeIdFromDescription(file) {
    const desc = file.getDescription();
    if (desc && desc.startsWith('youtube:')) {
        return desc.split(':')[1];
    }
    return null;
}

function setYoutubeIdInDescription(file, youtubeId) {
    file.setDescription('youtube:' + youtubeId);
}

// Generate projects data from Drive
function generateProjectsData() {
    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const categories = root.getFolders();
    let projects = [];

    while (categories.hasNext()) {
        let catFolder = categories.next();
        let catName = catFolder.getName().toLowerCase();

        // Now gets objects {url, type} instead of just strings
        let allFiles = getAllFilesRecursive(catFolder);

        if (allFiles.length > 0) {
            // Split for backward compatibility or use mixed array
            // Let's use a mixed array but map it for the frontend
            // The frontend expects "images" to be an array of strings usually
            // We will change the front end to handle objects, OR we can cheat:
            // We will keep 'images' as just URLs for backward compatibility (if needed)
            // BUT we'll add a 'media' field which is better

            let mediaList = allFiles.map(f => ({
                src: f.url,
                type: f.type
            }));

            // For backward compatibility with old code that expects strings in 'images'
            // We'll just put the URLs there. Frontend will need to detect video extensions or use the new 'media' property.
            // Since Google Drive URLs don't have extensions, we MUST use the 'media' property or metadata.
            // Let's update frontend to use 'media' property.

            projects.push({
                id: catName.replace(/\s+/g, '-'),
                title: catFolder.getName(),
                category: catName,
                description: "Exclusive collection of " + catFolder.getName(),
                details: { "Type": "Premium Design Collection" },
                images: mediaList.map(m => m.src), // Fallback array of strings
                media: mediaList // NEW: Array of {src, type} objects
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
        message: 'Auto-update (Images + Videos) from Drive: ' + new Date().toISOString(),
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
