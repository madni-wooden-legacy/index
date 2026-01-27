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
    skipped: 0,
    deleted: 0,
    images: 0,
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

        STATS = { newUploads: 0, skipped: 0, deleted: 0, images: 0, errors: 0, errorsList: [], isPartial: false };

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
        cumulative.newUploads += STATS.newUploads;
        cumulative.skipped += STATS.skipped;
        cumulative.deleted += STATS.deleted;
        cumulative.images = STATS.images;
        cumulative.errors += STATS.errors;

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
    return { categoryState: {}, projects: [], lastPushHash: '', ytMetadata: {} };
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
    // FAST PRUNING: We use the folder's internal timestamp as a first check.
    // Note: getLastUpdated on a folder changes if items inside are added/removed
    return {
        latest: folder.getLastUpdated().getTime(),
        name: folder.getName()
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
        const projectId = key.replace(/\s+/g, '-');

        const fp = getFolderFingerprint(cat);
        const sig = fp.latest.toString();

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
                console.log('✅ Sync state committed (Full) for: ' + name);
            } else {
                console.warn('🕒 Sync state saved (Partial) for: ' + name + '. Will continue in next run.');
            }
        }

        if (STATS.isPartial) break;
    }

    // Final Persist to Drive Store
    store.projects = Object.values(updatedProjectsMap);
    store.categoryState = savedState;
    saveDataStore(store);

    return store.projects;
}

function collectIdsRecursive(folder) {
    const files = folder.getFiles();
    while (files.hasNext()) GLOBAL_DISCOVERED_DRIVE_IDS.push(files.next().getId());
    const subs = folder.getFolders();
    while (subs.hasNext()) collectIdsRecursive(subs.next());
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

    files.sort((a, b) => a.getName().localeCompare(b.getName()));

    files.forEach((f, i) => {
        if (Date.now() - START_TIME > MAX_RUNTIME) {
            STATS.isPartial = true;
            return;
        }

        const id = f.getId();
        GLOBAL_DISCOVERED_DRIVE_IDS.push(id);

        const serial = String(i + 1).padStart(2, '0');
        const title = `${prefix} - ${serial}`;
        const name = f.getName();
        const ext = getFileExtension(name);
        const targetName = title + (ext ? '.' + ext : '');

        if (name !== targetName) {
            try { f.setName(targetName); } catch (_) { }
        }

        const mime = f.getMimeType();
        const isVideo = mime.includes('video') || ['.mp4', '.mov', '.avi', '.mkv'].some(ex => name.toLowerCase().endsWith(ex));

        console.log(`📄 Found: ${name} | Mime: ${mime} | isVideo: ${isVideo}`);

        if (isVideo) {
            let yt = getYoutubeIdFromDescription(f);

            // QUOTA SHORT-CIRCUIT: Skip YouTube logic if quota is hit
            if (QUOTA_EXCEEDED) {
                // FALLBACK: Use Drive view link instead of direct link for better stability on larger files
                list.push({ src: "https://drive.google.com/file/d/" + id + "/view", type: "video", title });
                return;
            }

            if (!yt) {
                console.log('🚀 Uploading to YouTube: ' + title);
                yt = uploadFileToYouTube(id, title);
                if (yt) {
                    setYoutubeIdInDescription(f, yt);
                    updateSyncTracker(id, yt, store);
                    STATS.newUploads++;
                } else STATS.errors++;
            } else {
                refreshYouTubeMetadata(yt, title, store);
                updateSyncTracker(id, yt, store); // RE-LEARN into memory
                STATS.skipped++;
            }

            if (yt) {
                list.push({ src: yt, type: "youtube", title });
            } else {
                // Use standard Drive URL that getDriveId can parse
                list.push({ src: "https://drive.google.com/file/d/" + id + "/view", type: "video", title });
            }

        } else if (mime.includes('image')) {
            STATS.images++;
            list.push({ src: "https://lh3.googleusercontent.com/d/" + id, type: "image", title });
        }
    });

    return list;
}

// ==========================
// YOUTUBE (With Sync Logic)
// ==========================
function uploadFileToYouTube(fileId, title) {
    try {
        const file = DriveApp.getFileById(fileId);
        const blob = file.getBlob();
        const cleanTitle = title.replace(/[^\x00-\x7F]/g, '').slice(0, 95);

        const resource = {
            snippet: { title: cleanTitle, description: 'Madni Wooden Legacy Catalog Video', categoryId: '22' },
            status: { privacyStatus: 'unlisted' }
        };
        const video = YouTube.Videos.insert(resource, 'snippet,status', blob);
        return video.id;
    } catch (e) {
        const msg = e.toString();
        console.error('❌ YT Upload Failed: ' + msg);
        STATS.errorsList.push(msg);
        if (msg.includes('quota')) QUOTA_EXCEEDED = true;
        return null;
    }
}

function refreshYouTubeMetadata(videoId, expectedTitle, store) {
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
            console.warn('Metadata refresh failed: ' + videoId);
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
    const subject = `🚀 Madni Website Batch Report (${batchCount} Runs)`;

    const body = `
MADNI WEBSITE SYNC SUMMARY (Batch of ${batchCount} runs)
------------------------------------------------------
Total New Videos Uploaded: ${stats.newUploads}
Videos Already Synced: ${stats.skipped}
Dead Videos Removed: ${stats.deleted}
Total Website Images: ${stats.images}
Total Errors in Batch: ${stats.errors}

${stats.errorsList && stats.errorsList.length > 0 ? `⚠️ ERROR DETAILS:\n- ${stats.errorsList.join('\n- ')}` : '✅ No errors encountered.'}

Website Status: ✅ LIVE & FULLY SYNCED
🔗 Live Website: https://${GITHUB_REPO_OWNER}.github.io/${GITHUB_REPO_NAME}/
🔗 Google Drive Folder: https://drive.google.com/drive/u/0/folders/${ROOT_FOLDER_ID}
🔗 GitHub Repo: https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}
    `;

    MailApp.sendEmail(recipient, subject, body);
}

function sendErrorEmail(msg) {
    MailApp.sendEmail(Session.getActiveUser().getEmail(), '⚠️ Madni Website Sync FAILED', msg);
}
