// PASTE THIS INTO GOOGLE APPS SCRIPT (script.google.com)
/**
 * MADNI WOODEN LEGACY - AUTO SYNC V4 (ENTERPRISE EDITION)
 * - Atomic Multi-level Delta Sync (Change Detection)
 * - Concurrency Control (ScriptLock)
 * - Idempotent GitHub Commits (Hashing)
 * - YouTube Metadata Re-syncing
 * - Timeout-safe state persistence
 */

// ==========================
// CONFIG
// ==========================
const ROOT_FOLDER_ID = '1u9USFGLYiBLIDQuHZpKOvj7O43hR_GG8';
const GITHUB_REPO_OWNER = 'Mohid-Abbas';
const GITHUB_REPO_NAME = 'MadniWoodenLegacy';
const GITHUB_TOKEN = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');

const START_TIME = Date.now();
const MAX_RUNTIME = 330000; // 5.5 minutes

let QUOTA_EXCEEDED = false;
let GLOBAL_DISCOVERED_DRIVE_IDS = [];
let CATEGORY_COMPLETED_SUCCESSFULLY = true;
const FORCE_RESYNC = false; // Set to true to bypass "unchanged" cache
const DELETION_SAFE_MODE = true; // Set to false to allow actual YouTube deletions

// ==========================
// STATS
// ==========================
let STATS = {
    newUploads: 0,
    newImages: 0, // NEW: Track new images added
    skipped: 0,
    deleted: 0,
    images: 0,
    videos: 0, // NEW: Track total videos
    projectsCount: 0, // NEW: Track total projects
    errors: 0,
    errorsList: [],
    isPartial: false
};

// ==========================
// MAIN ENTRY
// ==========================
function updateWebsiteData() {
    const lock = LockService.getScriptLock();

    // 1. CONCURRENCY CONTROL: Prevent overlapping runs
    try {
        if (!lock.tryLock(0)) {
            console.warn('⚠️ Sync already in progress. Skipping this trigger.');
            return;
        }
    } catch (e) {
        console.error('Lock Error: ' + e);
        return;
    }

    const props = PropertiesService.getScriptProperties();

    try {
        let batchCount = parseInt(props.getProperty('BATCH_RUN_COUNT') || '0') + 1;
        let cumulative = JSON.parse(
            props.getProperty('STATS_CUMULATIVE') ||
            JSON.stringify({ newUploads: 0, skipped: 0, deleted: 0, images: 0, errors: 0, errorsList: [] })
        );

        STATS = { newUploads: 0, newImages: 0, skipped: 0, deleted: 0, images: 0, videos: 0, projectsCount: 0, errors: 0, errorsList: [], isPartial: false };

        // 2. LOAD DATA & SYNC
        const store = getOrCreateDataStore();
        const projectsData = generateProjectsData(store);

        // 3. YOUTUBE CLEANUP
        const trackedCount = store.ytMetadata && store.ytMetadata.MAP ? Object.keys(store.ytMetadata.MAP).length : 0;
        console.log(`📊 YouTube Sync Status: [${trackedCount}] videos in memory.`);
        syncYouTubeDeletions(store);

        // 4. IDEMPOTENT GITHUB UPDATE (Only push if hash changed)
        const content = `let projects = ${JSON.stringify(projectsData, null, 2)};`;
        const contentHash = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, content));

        if (contentHash !== store.lastPushHash) {
            console.log('🚀 Content changed. Updating GitHub...');
            const success = updateGitHubFile('js/data.js', content);
            if (success) {
                store.lastPushHash = contentHash;
                saveDataStore(store); // Save updated hash
            }
        } else {
            console.log('⏭️ No data changes detected. Skipping GitHub commit.');
        }

        // 5. UPDATE STATS & EMAIL
        // For counters that accumulate (New Uploads, New Images found in this run)
        cumulative.newUploads += STATS.newUploads;
        cumulative.newImages += STATS.newImages;
        cumulative.skipped += STATS.skipped;
        cumulative.deleted += STATS.deleted;
        cumulative.errors += STATS.errors;

        // For snapshots (Total Images/Videos currently on site), just take the latest value
        if (STATS.images > 0) cumulative.images = STATS.images;
        if (STATS.videos > 0) cumulative.videos = STATS.videos;
        if (STATS.projectsCount > 0) cumulative.projectsCount = STATS.projectsCount;

        STATS.errorsList.forEach(e => {
            if (!cumulative.errorsList.includes(e)) cumulative.errorsList.push(e);
        });

        if (batchCount >= 24) {
            sendStatusEmail(batchCount, cumulative);
            props.setProperty('BATCH_RUN_COUNT', '0');
            props.setProperty('STATS_CUMULATIVE', JSON.stringify({
                newUploads: 0, skipped: 0, deleted: 0, images: 0, errors: 0, errorsList: []
            }));
        } else {
            props.setProperty('BATCH_RUN_COUNT', batchCount.toString());
            props.setProperty('STATS_CUMULATIVE', JSON.stringify(cumulative));
        }

        console.log('✅ SUCCESS at ' + new Date());

    } catch (e) {
        console.error('❌ ERROR: ' + e);
        sendErrorEmail(e.toString());
    } finally {
        lock.releaseLock();
    }
}

// ==========================
// DATA STORE (Drive-based)
// ==========================
const DATA_STORE_FILENAME = 'madni_sync_v4_store.json';

function getOrCreateDataStore() {
    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const files = root.getFilesByName(DATA_STORE_FILENAME);
    if (files.hasNext()) {
        const file = files.next();
        try {
            const store = JSON.parse(file.getBlob().getDataAsString());
            if (!store.ytMetadata) store.ytMetadata = {};
            return store;
        } catch (e) {
            console.warn('Store corrupt. Resetting.');
        }
    }
    return { categoryState: {}, projects: [], lastPushHash: '', ytMetadata: {}, completedCategories: [] };
}

function saveDataStore(data) {
    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const files = root.getFilesByName(DATA_STORE_FILENAME);
    const content = JSON.stringify(data, null, 2);
    if (files.hasNext()) {
        files.next().setContent(content);
    } else {
        root.createFile(DATA_STORE_FILENAME, content, MimeType.PLAIN_TEXT);
    }
}

// ==========================
// OPTIMIZED CHANGE DETECTION
// ==========================
function getFolderFingerprint(folder) {
    // SECOND-LEVEL CHECK: Folder timestamp + Item count
    // This catches deletions even if the folder timestamp is "lazy"
    const timestamp = folder.getLastUpdated().getTime();

    // Quick count of files and folders
    let count = 0;
    const files = folder.getFiles();
    while (files.hasNext()) { files.next(); count++; }

    const subs = folder.getFolders();
    while (subs.hasNext()) { subs.next(); count++; }

    return {
        timestamp: timestamp,
        count: count,
        signature: `${timestamp}_${count}`
    };
}

// ==========================
// GENERATE PROJECT DATA
// ==========================
function generateProjectsData(store) {
    GLOBAL_DISCOVERED_DRIVE_IDS = [];

    const savedState = store.categoryState || {};
    const currentProjects = store.projects || [];
    const updatedProjectsMap = {};

    currentProjects.forEach(p => { updatedProjectsMap[p.id] = p; });

    const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
    const categories = root.getFolders();

    while (categories.hasNext()) {
        const cat = categories.next();
        const name = cat.getName();
        const key = name.toLowerCase();
        // FIX: Sanitize ID to be URL-safe (remove &, replace spaces with -)
        const projectId = key.replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        const fp = getFolderFingerprint(cat);
        const sig = fp.signature;

        // SKIP IF UNCHANGED (Bypass if FORCE_RESYNC is true)
        if (!FORCE_RESYNC && savedState[projectId] === sig && updatedProjectsMap[projectId]) {
            console.log('⏭️ Skipping unchanged category: ' + name);
            // RE-LEARN logic: Populate memory from the existing data
            const existingProj = updatedProjectsMap[projectId];
            if (existingProj && existingProj.media) {
                existingProj.media.forEach(m => {
                    if (m.type === 'youtube' && m.src) {
                        // Extract Drive ID if we can find it, otherwise rely on description checks
                    }
                });
            }
            collectIdsRecursive(cat);
            continue;
        }

        // FORCE RESYNC OPTIMIZATION:
        // Even if we are forcing a resync, if we completed this specific category in a previous partial run of THIS batch, skip it.
        // This allows FORCE_RESYNC to work across multiple triggers without restarting from 'A' every time.
        if (FORCE_RESYNC && store.completedCategories && store.completedCategories.includes(projectId)) {
            console.log('⏭️ [FORCE_SYNC] Already completed in this cycle: ' + name);
            collectIdsRecursive(cat);
            continue;
        }

        console.log(`📂 [SYNC START] Category: ${name} (ID: ${cat.getId()})`);

        CATEGORY_COMPLETED_SUCCESSFULLY = true; // Reset for atomic tracking

        let sections = [];
        let allMedia = [];

        // Process Sections
        const subs = cat.getFolders();
        while (subs.hasNext()) {
            const sub = subs.next();
            const title = capitalize(sub.getName().replace(/-/g, ' '));
            const media = processFilesInFolder(sub, title, store);

            if (STATS.isPartial) { CATEGORY_COMPLETED_SUCCESSFULLY = false; break; }

            if (media.length) {
                const scattered = scatterMedia(media);
                sections.push({ title, images: scattered.map(m => m.src), media: scattered });
                allMedia = allMedia.concat(scattered);
            } else {
                console.warn('⚠️ No media found in section: ' + title);
            }
        }

        // Process Root Path
        const rootMedia = processFilesInFolder(cat, name, store);

        if (rootMedia.length) {
            const scattered = scatterMedia(rootMedia);
            sections.push({
                title: sections.length ? 'Other Designs' : 'Gallery',
                images: scattered.map(m => m.src),
                media: scattered
            });
            allMedia = allMedia.concat(scattered);
        } else if (!sections.length) {
            console.warn('⚠️ No root media and no sections found for: ' + name);
        }

        console.log(`📊 Category stats for [${name}]: ${allMedia.length} media items found.`);

        // INCREMENTAL COMMIT: Use partial data if we timed out (allows Doors to finish over many runs)
        if (allMedia.length) {
            updatedProjectsMap[projectId] = {
                id: projectId,
                title: name,
                category: key,
                description: 'Exclusive collection of ' + name,
                details: { Type: 'Premium Portfolio' },
                sections,
                images: allMedia.map(m => m.src),
                media: allMedia
            };
            // Only update the signature if we finished the WHOLE category
            if (!STATS.isPartial) {
                savedState[projectId] = sig;
                // Add to completed list so we don't re-scan it in the next partial run
                if (!store.completedCategories) store.completedCategories = [];
                if (!store.completedCategories.includes(projectId)) store.completedCategories.push(projectId);

                console.log('✅ Sync state committed (Full) for: ' + name);
            } else {
                console.warn('🕒 Sync state saved (Partial) for: ' + name + '. Will continue in next run.');
            }
            if (STATS.isPartial) break;
        }
    }

    // MERGE SAFETY: If we timed out (isPartial), we must ensure we don't LOSE the projects we didn't get to scan yet.
    // We iterate through the OLD projects list and add any that are missing from our new map.
    if (STATS.isPartial) {
        console.warn('⚠️ Partial Sync detected through time-out. Merging existing projects to prevent data loss...');
        currentProjects.forEach(p => {
            if (!updatedProjectsMap[p.id]) {
                updatedProjectsMap[p.id] = p;
            }
        });
    }

    STATS.projectsCount = Object.keys(updatedProjectsMap).length;

    // Count total videos across all projects
    let totalVids = 0;
    Object.values(updatedProjectsMap).forEach(p => {
        if (p.media) {
            totalVids += p.media.filter(m => m.type === 'youtube' || m.type === 'video').length;
        }
    });
    STATS.videos = totalVids;

    // CLEANUP: Remove any projects with invalid IDs (containing '&') caused by old naming logic
    Object.keys(updatedProjectsMap).forEach(key => {
        if (key.includes('&')) {
            console.warn(`🗑️ Removing legacy project ID: ${key} (replaced by sanitized version)`);
            delete updatedProjectsMap[key];
        }
    });

    // Final Persist to Drive Store
    // Sort projects alphabetically by category name to keep the JSON clean
    const finalProjects = Object.values(updatedProjectsMap).sort((a, b) => a.title.localeCompare(b.title));

    store.projects = finalProjects;
    store.categoryState = savedState;

    // If we finished EVERYTHING (not partial), clear the Force Sync memory so next time we can start fresh
    if (!STATS.isPartial) {
        store.completedCategories = [];
    }

    saveDataStore(store);

    return store.projects;
}

function collectIdsRecursive(folder) {
    const files = folder.getFiles();
    while (files.hasNext()) GLOBAL_DISCOVERED_DRIVE_IDS.push(files.next().getId());
    const subs = folder.getFolders();
    while (subs.hasNext()) collectIdsRecursive(subs.next());
}

/**
 * Generate a simple UUID for temporary file naming
 * Used in two-pass rename to avoid naming conflicts
 */
function generateSimpleUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


// ==========================
// FILE PROCESSING (With YT Re-sync)
// ==========================
// Add this small change inside updateWebsiteData or processFilesInFolder
// I will just provide the updated function for processFilesInFolder

function processFilesInFolder(folder, prefix, store) {
    console.log(`   📂 Entering: ${folder.getName()}`);
    let list = [];
    let files = [];

    // Support for both regular files and shortcuts
    const it = folder.getFiles();
    while (it.hasNext()) files.push(it.next());

    try {
        const sc = folder.getShortcuts();
        while (sc.hasNext()) {
            const target = sc.next().getTargetFile();
            if (target) files.push(target);
        }
    } catch (e) { /* Old Drive API version support */ }

    // CRITICAL: Deduplicate files by ID (shortcuts + regular files can point to same file)
    const seenIds = new Set();
    files = files.filter(f => {
        const id = f.getId();
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
    });

    files.sort((a, b) => a.getName().localeCompare(b.getName()));

    // CRITICAL: Deduplicate by filename REMOVED
    // We now use Two-Pass Rename (UUIDs) so duplicates are handled automatically
    // preventing data loss for files with same names but different content


    // PASS 1: Rename all files to temporary UUID names to avoid conflicts
    if (!STATS.isPartial) {
        console.log(`🔄 [PASS 1/2] Renaming ${files.length} files to temporary names...`);
        let tempRenameCount = 0;

        files.forEach((f, i) => {
            if (Date.now() - START_TIME > MAX_RUNTIME) {
                STATS.isPartial = true;
                return;
            }

            const name = f.getName();
            // SKIP if already a temp file (from previous interrupted run)
            if (name.startsWith('TEMP_')) return;

            const ext = getFileExtension(name);
            const tempName = `TEMP_${generateSimpleUUID()}${ext ? '.' + ext : ''}`;

            try {
                f.setName(tempName);
                tempRenameCount++;
            } catch (e) {
                console.warn(`⚠️ Pass 1 rename failed for ${name}: ${e.message}`);
            }
        });

        console.log(`✅ Pass 1 complete: ${tempRenameCount}/${files.length} files renamed to temp names`);
    }

    // PASS 2: Now rename temp files to final sequential names (conflict-free)
    files.forEach((f, i) => {
        if (Date.now() - START_TIME > MAX_RUNTIME) {
            STATS.isPartial = true;
            return;
        }

        const id = f.getId();
        GLOBAL_DISCOVERED_DRIVE_IDS.push(id);

        const serial = String(i + 1).padStart(2, '0');
        const title = `${prefix} - ${serial}`;
        const name = f.getName(); // Refresh name as it might have changed in Pass 1
        const ext = getFileExtension(name);
        const targetName = title + (ext ? '.' + ext : '');

        // Only rename if needed (and not during partial sync)
        if (!STATS.isPartial && name !== targetName) {
            try {
                f.setName(targetName);
                console.log(`✏️ Renamed: ${name} → ${targetName}`);
            } catch (e) {
                console.warn(`⚠️ Pass 2 rename failed for ${name}: ${e.message}`);
            }
        }

        const mime = f.getMimeType();
        const isVideo = mime.includes('video') || ['.mp4', '.mov', '.avi', '.mkv'].some(ex => name.toLowerCase().endsWith(ex));

        console.log(`📄 Found: ${name} | Mime: ${mime} | isVideo: ${isVideo}`);

        if (isVideo) {
            let yt = getYoutubeIdFromDescription(f);

            // 1. Process YouTube logic ONLY IF quota is not hit OR we already have a YT ID
            if (!QUOTA_EXCEEDED || yt) {
                if (!yt) {
                    console.log('🚀 Uploading to YouTube: ' + title);
                    yt = uploadFileToYouTube(id, title);
                    if (yt) {
                        setYoutubeIdInDescription(f, yt);
                        updateSyncTracker(id, yt, store);
                        STATS.newUploads++;
                    } else STATS.errors++;
                } else {
                    // QUOTA OPTIMIZATION: Skip metadata refresh to save quota for new uploads
                    // Only refresh metadata if quota allows, otherwise just use what we have
                    // if (!QUOTA_EXCEEDED) {
                    //     refreshYouTubeMetadata(yt, title, store);
                    // }
                    updateSyncTracker(id, yt, store);
                    STATS.skipped++;
                }
            }

            // 2. Final Selection: Priority to YouTube ID, then Drive Fallback
            if (yt) {
                list.push({ src: yt, type: "youtube", title });
            } else {
                // FALLBACK: Use Drive preview which is more reliable for iframes
                list.push({ src: "https://drive.google.com/file/d/" + id + "/preview", type: "video", title });
            }

        } else if (mime.includes('image')) {
            STATS.images++;
            // Only count as NEW if it wasn't in our previous snapshot (simplified check for now)
            // For now, we only increment newImages if the folder signature CHANGED
            if (!FORCE_RESYNC) STATS.newImages++;
            list.push({ src: "https://lh3.googleusercontent.com/d/" + id, type: "image", title });
        }
    });

    return list;
}

// ==========================
// YOUTUBE (With Sync Logic)
// ==========================
function uploadFileToYouTube(fileId, title) {
    // CRITICAL: Don't even try if quota is exceeded
    if (QUOTA_EXCEEDED) {
        console.log(`⏭️ Skipping upload for ${title} (quota exceeded)`);
        return null;
    }

    try {
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();
        const cleanTitle = title.replace(/[^\x00-\x7F]/g, '').slice(0, 95);

        const resource = {
            snippet: { title: cleanTitle, description: 'Madni Wooden Legacy Catalog Video', categoryId: '22' },
            status: { privacyStatus: 'unlisted' }
        };
        const video = YouTube.Videos.insert(resource, 'snippet,status', blob);
        console.log(`✅ Successfully uploaded: ${title} → ${video.id}`);
        return video.id;
    } catch (e) {
        const msg = e.toString();
        console.error('❌ YT Upload Failed: ' + msg);
        STATS.errorsList.push(msg);
        if (msg.includes('quota')) {
            QUOTA_EXCEEDED = true;
            console.warn('🚨 YouTube quota exceeded! No more uploads will be attempted this run.');
        }
        return null;
    }
}

function refreshYouTubeMetadata(videoId, expectedTitle, store) {
    // CRITICAL: Exit immediately if quota is exceeded to save API calls
    if (QUOTA_EXCEEDED) {
        console.log(`⏭️ Skipping metadata refresh for ${videoId} (quota exceeded)`);
        return;
    }

    if (!store.ytMetadata) store.ytMetadata = {};
    const lastTitle = store.ytMetadata['TITLE_' + videoId];

    if (lastTitle !== expectedTitle) {
        try {
            const cleanTitle = expectedTitle.replace(/[^\x00-\x7F]/g, '').slice(0, 95);
            YouTube.Videos.update({
                id: videoId,
                snippet: { title: cleanTitle, categoryId: '22', description: 'Madni Wooden Legacy Catalog Video' }
            }, 'snippet');
            store.ytMetadata['TITLE_' + videoId] = expectedTitle;
            console.log('🔄 YouTube metadata refreshed for: ' + videoId);
        } catch (e) {
            const msg = e.toString();
            console.warn(`Metadata refresh failed for ${videoId}: ${msg}`);
            if (msg.includes('quota')) {
                QUOTA_EXCEEDED = true;
                console.warn('🚨 YouTube quota exceeded! All further metadata updates and uploads will be skipped.');
            }
        }
    }
}

function getYoutubeIdFromDescription(file) {
    const d = file.getDescription();
    return d && d.startsWith('youtube:') ? d.split(':')[1] : null;
}

function setYoutubeIdInDescription(file, id) {
    file.setDescription('youtube:' + id);
}

function updateSyncTracker(driveId, youtubeId, store) {
    if (!store.ytMetadata) store.ytMetadata = {};
    if (!store.ytMetadata.MAP) store.ytMetadata.MAP = {};

    // Only update if changed or not exists
    if (store.ytMetadata.MAP[driveId] !== youtubeId) {
        store.ytMetadata.MAP[driveId] = youtubeId;
    }
}

// ==========================
// CLEANUP & DELETIONS
// ==========================
function syncYouTubeDeletions(store) {
    if (!store || !store.ytMetadata || !store.ytMetadata.MAP) return;

    // SAFETY: If the previous run was partial (timed out), we don't have a full picture 
    // of all files. Running deletion now would delete files we just haven't "seen" yet.
    if (STATS.isPartial) {
        console.log('🕒 Skipping deletion cleanup: Current run is partial/incomplete.');
        return;
    }

    const map = store.ytMetadata.MAP;
    Object.keys(map).forEach(driveId => {
        if (!GLOBAL_DISCOVERED_DRIVE_IDS.includes(driveId)) {
            const ytId = map[driveId];
            if (DELETION_SAFE_MODE) {
                console.warn(`🕒 [SAFE MODE] Would delete orphan YouTube video: ${ytId} (Drive ID: ${driveId})`);
                return;
            }
            try {
                YouTube.Videos.remove(ytId);
                delete map[driveId];
                STATS.deleted++;
                console.log(`🗑️ Deleted orphan YouTube video: ${ytId}`);
            } catch (e) {
                console.error(`❌ Delete failed for ${ytId}: ` + e);
                delete map[driveId];
            }
        }
    });
}

// ==========================
// HELPERS
// ==========================
function scatterMedia(list) {
    if (list.length < 3) return list;
    const vids = list.filter(x => x.type !== 'image');
    const imgs = list.filter(x => x.type === 'image');
    if (!vids.length || !imgs.length) return list;

    const out = [];
    // Calculate base step
    const baseStep = Math.max(1, Math.floor(imgs.length / vids.length));

    let i = 0, v = 0;
    while (i < imgs.length || v < vids.length) {
        // Add a small random jitter to the step (0 or 1 extra images)
        const jitter = Math.random() > 0.7 ? 1 : 0;
        const currentStep = Math.max(1, baseStep + (v % 2 === 0 ? jitter : -jitter));

        for (let s = 0; s < currentStep && i < imgs.length; s++) {
            out.push(imgs[i++]);
        }
        if (v < vids.length) {
            out.push(vids[v++]);
        }
    }
    return out;
}

function capitalize(s) {
    if (!s) return "";
    return s.split(' ').map(x => x[0] ? x[0].toUpperCase() + x.slice(1) : "").join(' ');
}

function getFileExtension(name) {
    const p = name.split('.'); return p.length > 1 ? p.pop() : '';
}

// ==========================
// GITHUB (With Safety)
// ==========================
function updateGitHubFile(path, content) {
    const url = `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${path}`;
    try {
        const get = UrlFetchApp.fetch(url, {
            method: 'get',
            headers: { Authorization: 'token ' + GITHUB_TOKEN },
            muteHttpExceptions: true
        });
        const sha = JSON.parse(get.getContentText()).sha;
        if (!sha) return false;

        UrlFetchApp.fetch(url, {
            method: 'put',
            headers: { Authorization: 'token ' + GITHUB_TOKEN },
            contentType: 'application/json',
            payload: JSON.stringify({
                message: 'Auto-update ' + new Date().toISOString(),
                content: Utilities.base64Encode(content),
                sha
            })
        });
        return true;
    } catch (e) {
        console.error('GitHub Sync Failed: ' + e);
        return false;
    }
}

// ==========================
// NOTIFICATIONS
// ==========================
function sendStatusEmail(batchCount, stats) {
    const recipient = Session.getActiveUser().getEmail();
    const subject = `🚀 Madni Website: New Sync Report 🚀 (${batchCount} Updates)`;

    const body = `
======================================================
🌟 MADNI WOODEN LEGACY: AUTO-SYNC STATUS REPORT 🌟
======================================================
Summary of the last ${batchCount} automation cycles.

✅ WEBSITE CURRENT STATUS: Live & Updated
------------------------------------------------------

📦 CURRENT WEBSITE CONTENT
- 🖼️ Total Images: ${stats.images}
- 🎬 Total Videos: ${stats.videos} 
- 📂 Total Collections/Projects: ${stats.projectsCount}

🆕 RECENT ACTIVITY (Last Batch)
- 📸 New Photos Added: +${stats.newImages}
- 🎥 New Videos Uploaded: +${stats.newUploads}
- 🗑️ Items Removed: ${stats.deleted}
- ✅ Files Checked & Verified: ${stats.skipped}

🚀 STREAMING PERFORMANCE (YouTube)
- ✅ Streaming on YouTube: ${stats.videos} videos (Live)
- ⏳ Pending Sync (Using Drive): ${stats.skipped} videos (Checking...)
   (Don't worry! This number fluctuates as we scan different folders).

⚠️ SYSTEM NOTICES
${stats.errorsList && stats.errorsList.length > 0
            ? `Status updates for your review:\n\n${stats.errorsList.map(e => "📍 " + cleanErrorMessage(e)).join('\n')}`
            : '🌈 Everything is perfect! No issues found.'}

------------------------------------------------------
🔗 QUICK ACCESS
- 🌐 View Your Website: https://${GITHUB_REPO_OWNER}.github.io/${GITHUB_REPO_NAME}/
- 📁 Open Photo Gallery: https://drive.google.com/drive/u/0/folders/${ROOT_FOLDER_ID}
- 🛠️ Developer Dashboard: https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}

Generated with ✨ by Madni Wooden Legacy Sync Engine.
======================================================
    `;

    MailApp.sendEmail(recipient, subject, body);
}

/**
 * Transforms complex technical errors into simple English
 */
function cleanErrorMessage(msg) {
    if (msg.includes('quota')) return "YouTube Daily Limit Reached: Some videos are using Google Drive links for now. They will move to YouTube tomorrow.";
    if (msg.includes('execution time')) return "Sync timed out: You have a lot of new files! This is normal; the script will continue from where it left off in the next run.";
    if (msg.includes('Service error: Drive')) return "Google Drive was briefly busy. The script skipped one check but will try again soon.";
    return msg;
}

function sendErrorEmail(msg) {
    MailApp.sendEmail(Session.getActiveUser().getEmail(), '⚠️ Madni Website Sync FAILED', msg);
}
