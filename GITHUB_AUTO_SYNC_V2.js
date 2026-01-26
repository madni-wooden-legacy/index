// PASTE THIS INTO GOOGLE APPS SCRIPT (script.google.com)
// This will automatically update your website data every day at 3 AM Pakistan time

const ROOT_FOLDER_ID = '1u9USFGLYiBLIDQuHZpKOvj7O43hR_GG8';
const GITHUB_REPO_OWNER = 'Mohid-Abbas';
const GITHUB_REPO_NAME = 'MadniWoodenLegacy';
const GITHUB_TOKEN = 'ghp_5xWnH113B5OosW5irzgSNzJ3CGdxOU1tQIUD';

// This function runs automatically every day
function updateWebsiteData() {
    try {
        // 1. Get data from Drive (This handles uploads)
        const projectsData = generateProjectsData();

        // 2. Synchronize Deletions (Remove from YT if deleted from Drive)
        syncYouTubeDeletions(projectsData);

        // 3. Create the data.js file content
        const fileContent = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Last updated: ${new Date().toISOString()}
 * Auto-synced from Google Drive
 */

let projects = ${JSON.stringify(projectsData, null, 2)};
`;

        // 4. Update the file on GitHub
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
                    // Add to tracker
                    updateSyncTracker(f.getId(), youtubeId);
                }
            }

            if (youtubeId) {
                foundFiles.push({
                    url: youtubeId,
                    type: "youtube",
                    mime: mime,
                    driveId: f.getId() // Add for sync tracking
                });
            } else {
                foundFiles.push({
                    url: "https://lh3.googleusercontent.com/d/" + f.getId(),
                    type: "video",
                    mime: mime,
                    driveId: f.getId()
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

function updateSyncTracker(driveId, youtubeId) {
    const props = PropertiesService.getScriptProperties();
    const tracking = JSON.parse(props.getProperty('YT_SYNC_MAP') || '{}');
    tracking[driveId] = youtubeId;
    props.setProperty('YT_SYNC_MAP', JSON.stringify(tracking));
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

/**
 * Ensures YouTube channel stays in sync with Drive.
 * Deletes videos from YouTube that were removed from Drive.
 */
function syncYouTubeDeletions(projectsData) {
    const props = PropertiesService.getScriptProperties();
    const tracking = JSON.parse(props.getProperty('YT_SYNC_MAP') || '{}');

    // 1. Get all Drive File IDs currently in the website data
    const currentDriveIds = new Set();
    projectsData.forEach(p => {
        if (p.media) {
            p.media.forEach(m => {
                // If it's a youtube type, we need to know WHICH drive file it came from
                // We'll update the data generation to include driveId for this reason
            });
        }
    });

    // REVISED APPROACH: We scan all Drive IDs discovered during this run.
    // Let's pass the discovered IDs to this function.
    const discoveredDriveIds = GLOBAL_DISCOVERED_DRIVE_IDS || [];

    // 2. Find IDs in our tracker that are NOT in Drive anymore
    const deadDriveIds = Object.keys(tracking).filter(id => !discoveredDriveIds.includes(id));

    deadDriveIds.forEach(driveId => {
        const ytId = tracking[driveId];
        console.log('🗑️ Deleting orphan video from YouTube: ' + ytId);
        try {
            YouTube.Videos.remove(ytId);
            delete tracking[driveId];
        } catch (e) {
            console.error('❌ Failed to delete video ' + ytId + ': ' + e.toString());
            // If it's already deleted or 404, remove from tracker anyway
            if (e.toString().includes('404')) delete tracking[driveId];
        }
    });

    props.setProperty('YT_SYNC_MAP', JSON.stringify(tracking));
}

let GLOBAL_DISCOVERED_DRIVE_IDS = []; // Track files found in current run

// Generate projects data from Drive
function generateProjectsData() {
    GLOBAL_DISCOVERED_DRIVE_IDS = []; // Reset
    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const categories = root.getFolders();
    let projects = [];

    while (categories.hasNext()) {
        let catFolder = categories.next();
        let catName = catFolder.getName().toLowerCase();

        let allFiles = getAllFilesRecursive(catFolder);

        if (allFiles.length > 0) {
            let mediaList = allFiles.map(f => {
                if (f.driveId) GLOBAL_DISCOVERED_DRIVE_IDS.push(f.driveId);
                return {
                    src: f.url,
                    type: f.type
                };
            });

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
