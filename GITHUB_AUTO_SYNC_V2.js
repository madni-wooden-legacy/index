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
        syncYouTubeDeletions();

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

// Helper function to simply COLLECT all image and video file objects
function getAllFilesRecursive(folder) {
    let foundFiles = [];
    let files = folder.getFiles();
    while (files.hasNext()) {
        let f = files.next();
        let mime = f.getMimeType();

        if (mime.includes("image") || mime.includes("video")) {
            foundFiles.push({
                file: f,
                mime: mime,
                is_video: mime.includes("video")
            });
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
/**
 * Uploads a video from Google Drive to YouTube (Unlisted)
 * Requires YouTube Data API v3 Service to be enabled
 */
let QUOTA_EXCEEDED = false;

function uploadFileToYouTube(fileId, title) {
    if (QUOTA_EXCEEDED) return null;

    try {
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();

        // CLEAN AND TRIM TITLE (YouTube limit is 100)
        let cleanTitle = (title || file.getName())
            .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII for safety
            .replace(/\.mp4|\.mov|\.avi/gi, "") // Remove extension
            .trim();

        if (cleanTitle.length > 95) cleanTitle = cleanTitle.substring(0, 95) + "...";
        if (cleanTitle.length === 0) cleanTitle = "Madni Wooden Legacy Video";

        const resource = {
            snippet: {
                title: cleanTitle,
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
        if (e.toString().includes('exceeded') || e.toString().includes('quota')) {
            console.warn('⚠️ DAILY UPLOAD LIMIT REACHED. Script will skip further uploads today.');
            QUOTA_EXCEEDED = true;
        }
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
/**
 * Ensures YouTube channel stays in sync with Drive.
 * Deletes videos from YouTube that were removed from Drive.
 */
function syncYouTubeDeletions() {
    const props = PropertiesService.getScriptProperties();
    const tracking = JSON.parse(props.getProperty('YT_SYNC_MAP') || '{}');

    // 1. We scan all Drive IDs discovered during the generation run.
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
        let catRealName = catFolder.getName();
        let catName = catRealName.toLowerCase();

        // 1. Collect all files in this category
        let collectedFiles = getAllFilesRecursive(catFolder);

        if (collectedFiles.length > 0) {
            let mediaList = [];

            // 2. Process each file with a serial number
            collectedFiles.forEach((item, index) => {
                const f = item.file;
                const driveId = f.getId();
                GLOBAL_DISCOVERED_DRIVE_IDS.push(driveId);

                // Generate Serial Name (e.g., Kitchen - 01)
                const serialNum = (index + 1).toString().padStart(2, '0');
                const serialTitle = `${catRealName} - ${serialNum}`;

                if (item.is_video) {
                    let youtubeId = getYoutubeIdFromDescription(f);

                    if (!youtubeId && !QUOTA_EXCEEDED) {
                        console.log('🚀 Uploading to YouTube with Serial Name: ' + serialTitle);
                        youtubeId = uploadFileToYouTube(driveId, serialTitle);
                        if (youtubeId) {
                            setYoutubeIdInDescription(f, youtubeId);
                            updateSyncTracker(driveId, youtubeId);
                        }
                    }

                    if (youtubeId) {
                        mediaList.push({ src: youtubeId, type: "youtube" });
                    } else {
                        mediaList.push({ src: "https://lh3.googleusercontent.com/d/" + driveId, type: "video" });
                    }
                } else {
                    // It's an image
                    mediaList.push({ src: "https://lh3.googleusercontent.com/d/" + driveId, type: "image", title: serialTitle });
                }
            });

            projects.push({
                id: catName.replace(/\s+/g, '-'),
                title: catRealName,
                category: catName,
                description: "Exclusive collection of " + catRealName,
                details: { "Type": "Premium Design Collection" },
                images: mediaList.map(m => m.src),
                media: mediaList
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
