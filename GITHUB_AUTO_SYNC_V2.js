// PASTE THIS INTO GOOGLE APPS SCRIPT (script.google.com)
// This will automatically update your website data every day at 3 AM Pakistan time

const ROOT_FOLDER_ID = '1u9USFGLYiBLIDQuHZpKOvj7O43hR_GG8';
const GITHUB_REPO_OWNER = 'Mohid-Abbas';
const GITHUB_REPO_NAME = 'MadniWoodenLegacy';
const GITHUB_TOKEN = 'ghp_5xWnH113B5OosW5irzgSNzJ3CGdxOU1tQIUD';

// Stats for Email
let STATS = {
    newUploads: 0,
    skipped: 0,
    deleted: 0,
    images: 0,
    errors: 0,
    isPartial: false
};

const START_TIME = new Date().getTime();
const MAX_RUNTIME = 330000; // 5.5 minutes (Limit is 6)

// This function runs automatically every day
function updateWebsiteData() {
    try {
        // Reset Stats
        STATS = { newUploads: 0, skipped: 0, deleted: 0, images: 0, errors: 0 };

        // 1. Get data from Drive (This handles uploads and physical renaming)
        const projectsData = generateProjectsData();

        // 2. Synchronize Deletions (Remove from YT if deleted from Drive)
        syncYouTubeDeletions();

        // 3. Create the data.js file content
        const fileContent = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Last updated: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' })} (Pakistan Time)
 * Auto-synced from Google Drive
 */

let projects = ${JSON.stringify(projectsData, null, 2)};
`;

        // 4. Update the file on GitHub
        updateGitHubFile('js/data.js', fileContent);

        // 5. Send Status Email
        sendStatusEmail();

        console.log('✅ SUCCESS: Website data updated at ' + new Date());

    } catch (e) {
        console.error('❌ ERROR: ' + e.toString());
        sendErrorEmail(e.toString());
    }
}

function sendStatusEmail() {
    const recipient = Session.getActiveUser().getEmail();
    const subject = "🚀 Madni Website Sync Report: " + new Date().toLocaleDateString();

    const body = `
SYNC STATUS REPORT
------------------
Date: ${new Date().toLocaleString()} (Pakistan Time)

- Total New Videos Uploaded: ${STATS.newUploads}
- Videos Skipped (Already Sync): ${STATS.skipped}
- Dead Videos Deleted from YT: ${STATS.deleted}
- Total Images Processed: ${STATS.images}
- Encountered Errors: ${STATS.errors}

${STATS.isPartial ? '⚠️ NOTE: This was a PARTIAL sync because the script reached the 6-minute Google limit. The remaining files will be processed in the next run.' : '✅ Full Sync Complete.'}

Website Status: ✅ UPDATED & LIVE
🔗 Live Website: https://${GITHUB_REPO_OWNER}.github.io/${GITHUB_REPO_NAME}/
🔗 Google Drive Folder: https://drive.google.com/drive/u/0/folders/${ROOT_FOLDER_ID}
🔗 GitHub Repo: https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}
YouTube Channel: Your Channel (Unlisted)

The next sync is scheduled for tomorrow at 3:00 AM.
  `;

    MailApp.sendEmail(recipient, subject, body);
}

function sendErrorEmail(errMsg) {
    const recipient = Session.getActiveUser().getEmail();
    const subject = "⚠️ Madni Website Sync FAILED";
    const body = "The sync failed with the following error:\n\n" + errMsg;
    MailApp.sendEmail(recipient, subject, body);
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
let QUOTA_EXCEEDED = false;

function uploadFileToYouTube(fileId, title) {
    if (QUOTA_EXCEEDED) return null;

    try {
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();

        // CLEAN AND TRIM TITLE
        let cleanTitle = title.replace(/[^\x00-\x7F]/g, "").trim();
        if (cleanTitle.length > 95) cleanTitle = cleanTitle.substring(0, 95);

        // Check if we just need to update an existing video's title
        let existingId = getYoutubeIdFromDescription(file);
        if (existingId) {
            try {
                const videoData = {
                    id: existingId,
                    snippet: {
                        title: cleanTitle,
                        description: 'Updated automatically from Madni Wooden Legacy Gallery',
                        categoryId: '22'
                    }
                };
                YouTube.Videos.update(videoData, 'snippet');
                return existingId;
            } catch (e) {
                console.warn('Metadata update failed for ' + existingId);
            }
        }

        const resource = {
            snippet: {
                title: cleanTitle,
                description: 'Uploaded automatically from Madni Wooden Legacy Gallery',
                categoryId: '22'
            },
            status: { privacyStatus: 'unlisted' }
        };

        const video = YouTube.Videos.insert(resource, 'snippet,status', blob);
        return video.id;
    } catch (e) {
        console.error('❌ YouTube Upload Failed: ' + e.toString());
        if (e.toString().includes('exceeded') || e.toString().includes('quota')) {
            console.warn('⚠️ DAILY UPLOAD LIMIT REACHED.');
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
            STATS.deleted++;
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
            console.log(`📂 Processing Category: ${catRealName} (${collectedFiles.length} files)`);

            // 2. Process each file with a serial number
            collectedFiles.forEach((item, index) => {
                // TIMEOUT CHECK
                if (new Date().getTime() - START_TIME > MAX_RUNTIME) {
                    STATS.isPartial = true;
                    return;
                }

                const f = item.file;
                const driveId = f.getId();
                GLOBAL_DISCOVERED_DRIVE_IDS.push(driveId);

                // Generate Serial Name (e.g., Kitchen - 01)
                const serialNum = (index + 1).toString().padStart(2, '0');
                const serialTitle = `${catRealName} - ${serialNum}`;

                // PHYSICAL RENAMING IN DRIVE
                const extension = getFileExtension(f.getName());
                const driveName = serialTitle + (extension ? "." + extension : "");
                if (f.getName() !== driveName) {
                    try {
                        f.setName(driveName);
                        if (index % 5 === 0) console.log(`   📝 Renaming: ${serialTitle}...`);
                    } catch (err) { console.warn("Could not rename file in Drive: " + driveId); }
                }

                if (item.is_video) {
                    let youtubeId = getYoutubeIdFromDescription(f);

                    if (!youtubeId && !QUOTA_EXCEEDED) {
                        console.log('🚀 Uploading to YouTube with Serial Name: ' + serialTitle);
                        youtubeId = uploadFileToYouTube(driveId, serialTitle);
                        if (youtubeId) {
                            setYoutubeIdInDescription(f, youtubeId);
                            updateSyncTracker(driveId, youtubeId);
                            STATS.newUploads++;
                        } else { STATS.errors++; }
                    } else if (youtubeId) {
                        STATS.skipped++;
                    }

                    if (youtubeId) {
                        mediaList.push({ src: youtubeId, type: "youtube", title: serialTitle });
                    } else {
                        mediaList.push({ src: "https://lh3.googleusercontent.com/d/" + driveId, type: "video", title: serialTitle });
                    }
                } else {
                    // It's an image
                    STATS.images++;
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

function getFileExtension(filename) {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop() : "";
}
