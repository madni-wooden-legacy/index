/**
 * Madni Wooden Legacy - Main Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    initImageProtection();

    // Page specific initializers
    // Initialize immediately with static data (which is now auto-updated daily)
    if (window.location.pathname.includes('collections.html')) {
        initCollections();
    } else if (window.location.pathname.includes('project.html')) {
        initProjectDetails();
    } else if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        initHomePageFeatured();
    }
});

const DRIVE_API_URL = 'https://script.google.com/macros/s/AKfycbwcQa_-yKVsrCQyJRiur5DlC6QOo8szn2QzOHhsQFG29YCvTUd2RZD3gkbkXK5N62IHog/exec';

function fetchProjectsFromDrive(callback) {
    // 1. Visual Notification Container
    let notify = document.getElementById('drive-notify');
    if (!notify) {
        notify = document.createElement('div');
        notify.id = 'drive-notify';
        notify.style.cssText = 'position:fixed; bottom:20px; left:20px; background:#333; color:white; padding:10px 20px; border-radius:5px; z-index:9999; font-size:12px; transition:0.3s; opacity:0; pointer-events:none;';
        document.body.appendChild(notify);
    }

    function showMsg(msg, isError = false) {
        notify.textContent = msg;
        notify.style.opacity = '1';
        notify.style.background = isError ? '#cc0000' : '#333';
        setTimeout(() => notify.style.opacity = '0', 3000);
    }

    const bypassCacheUrl = DRIVE_API_URL + '?t=' + new Date().getTime();

    showMsg('Syncing with Drive...');

    fetch(bypassCacheUrl)
        .then(response => response.json())
        .then(data => {
            console.log('API RESPONSE RAW:', data); // Debugging

            if (Array.isArray(data) && data.length > 0) {
                console.log('Drive Data Loaded: ' + data.length + ' projects.');

                // Clear and Update
                projects.length = 0;
                data.forEach(p => projects.push(p));

                // Re-run the initializer to update UI
                if (callback) callback();
                showMsg('Website Updated (' + data.length + ' projects)');
            } else {
                console.warn('Drive returned empty list.');
                showMsg('Drive connected but found 0 projects.', true);
            }
        })
        .catch(error => {
            console.error('Drive Sync Error:', error);
            showMsg('Sync Failed: Check Console', true);
        });
}


// Custom cursor removed by user request


/* ================= THEME & UI ================= */

function initTheme() {
    // Check local storage for theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Setup toggle button if it exists
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }
}

function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const nav = document.querySelector('.main-nav');

    if (hamburger && nav) {
        hamburger.addEventListener('click', () => {
            nav.classList.toggle('active');
            hamburger.classList.toggle('is-active');
        });
    }
}

function initImageProtection() {
    document.addEventListener('contextmenu', e => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            // Optional: Show toast message
        }
    });
}

/* ================= COLLECTION PAGE LOGIC ================= */

function initCollections() {
    const grid = document.getElementById('collection-grid');
    const filtersContainer = document.querySelector('.filters'); // Make sure this class exists in collections.html

    if (!grid || !filtersContainer) return;

    // 1. Get unique categories from projects
    const categories = ['all', ...new Set(projects.map(p => p.category))];

    // 2. Clear existing static buttons and Generate Dynamic Buttons
    filtersContainer.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = cat === 'all' ? 'filter-btn active' : 'filter-btn';
        btn.setAttribute('data-filter', cat);
        btn.textContent = cat === 'all' ? 'All' : capitalize(cat);

        btn.addEventListener('click', () => {
            // Visual toggle
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Logic
            if (cat === 'all') {
                renderProjects(projects);
            } else {
                const filtered = projects.filter(p => p.category === cat);
                renderProjects(filtered);
            }
        });

        filtersContainer.appendChild(btn);
    });

    // 3. Render all projects initially
    renderProjects(projects);
}

function renderProjects(items) {
    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<p class="no-results">No projects found in this category.</p>';
        return;
    }

    items.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card animate-up';

        // Use MEDIA object if available, otherwise fallback to images array
        let mediaItem;
        if (project.media && project.media.length > 0) {
            mediaItem = project.media[0];
        } else {
            mediaItem = { src: project.images[0], type: 'image' };
        }

        let mediaHtml = '';
        if (mediaItem.type === 'video') {
            const videoUrl = convertToVideoUrl(mediaItem.src);
            mediaHtml = `<video src="${videoUrl}" autoplay muted loop playsinline style="pointer-events: none;"></video>`;
        } else {
            mediaHtml = `<img src="${mediaItem.src}" alt="${project.title}" loading="lazy" onerror="this.style.display='none'">`;
        }

        card.innerHTML = `
            <div class="card-img-container">
                <a href="project.html?id=${project.id}">
                    ${mediaHtml}
                </a>
            </div>
            <div class="card-info">
                <span>${capitalize(project.category)}</span>
                <h3><a href="project.html?id=${project.id}">${project.title}</a></h3>
            </div>
        `;
        grid.appendChild(card);
    });
}

/* ================= PROJECT DETAILS PAGE LOGIC ================= */

function initProjectDetails() {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');

    console.log('🔍 Looking for project ID:', projectId);
    console.log('📋 Available projects:', projects.map(p => ({ id: p.id, title: p.title })));

    const project = projects.find(p => p.id === projectId);

    if (!project) {
        document.querySelector('.project-content').innerHTML = '<h2>Project not found</h2><a href="collections.html" class="btn btn-gold">Back to Collections</a>';
        return;
    }

    // Populate Data
    document.title = `${project.title} | Madni Wooden Legacy`;
    document.getElementById('p-title').textContent = project.title;
    document.getElementById('p-category').textContent = capitalize(project.category);
    document.getElementById('p-desc').textContent = project.description;

    // Details List
    const detailsList = document.getElementById('p-details');
    detailsList.innerHTML = '';
    for (const [key, value] of Object.entries(project.details)) {
        detailsList.innerHTML += `<li><strong>${key}:</strong> ${value}</li>`;
    }

    // Gallery & Sections Logic
    const galleryContainer = document.getElementById('p-gallery');
    galleryContainer.innerHTML = '';

    // Check if we have sections
    if (project.sections && project.sections.length > 0) {

        // 1. Create Folder Containers (Navigation)
        if (project.sections.length > 1) {
            const tocContainer = document.createElement('div');
            tocContainer.className = 'folder-nav-container';
            tocContainer.innerHTML = '<h4>Select a Collection:</h4>';

            const toc = document.createElement('div');
            toc.className = 'folder-nav';

            project.sections.forEach((sec, idx) => {
                const btn = document.createElement('button');
                btn.className = 'folder-btn';
                if (idx === 0) btn.classList.add('active'); // Default active

                btn.innerHTML = `<i class="far fa-folder-open"></i> ${sec.title}`;

                btn.onclick = () => {
                    // 1. Button Styling
                    document.querySelectorAll('.folder-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // 2. Section Visibility (Tab Logic)
                    document.querySelectorAll('.section-wrapper').forEach(wrapper => {
                        wrapper.style.display = 'none';
                    });
                    const target = document.getElementById(`sec-${idx}`);
                    if (target) target.style.display = 'block';
                };
                toc.appendChild(btn);
            });
            tocContainer.appendChild(toc);
            galleryContainer.appendChild(tocContainer);
        }

        // 2. Render Sections
        project.sections.forEach((sec, idx) => {
            const secWrapper = document.createElement('div');
            secWrapper.id = `sec-${idx}`;
            secWrapper.className = 'section-wrapper';

            // HIDE ALL by default, except the first one
            if (idx !== 0) {
                secWrapper.style.display = 'none';
            } else {
                secWrapper.style.display = 'block';
            }

            secWrapper.style.marginBottom = '40px';

            // Title
            if (project.sections.length > 1 || sec.title !== 'Gallery') {
                const h3 = document.createElement('h3');
                h3.textContent = sec.title;
                h3.style.fontSize = '1.3rem';
                h3.style.marginBottom = '15px';
                h3.style.borderLeft = '3px solid var(--color-accent)';
                h3.style.paddingLeft = '10px';
                secWrapper.appendChild(h3);
            }

            const grid = document.createElement('div');
            grid.className = 'gallery-grid';

            // Create a playlist for this section
            const sectionMedia = sec.images;

            sec.images.forEach((src, mediaIdx) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';

                let content = '';
                if (isVideo(src)) {
                    const videoUrl = convertToVideoUrl(src);
                    content = `<video src="${videoUrl}" autoplay muted loop playsinline onclick="openLightbox('${src}', ${mediaIdx}, 'sec-${idx}')"></video>`;
                } else {
                    content = `<img src="${src}" alt="${sec.title}" loading="lazy" onclick="openLightbox('${src}', ${mediaIdx}, 'sec-${idx}')" onerror="this.parentElement.style.display='none'">`;
                }

                item.innerHTML = content;
                grid.appendChild(item);
            });

            // Store playlist in DOM for retrieval
            secWrapper.dataset.playlist = JSON.stringify(sectionMedia);

            secWrapper.appendChild(grid);
            galleryContainer.appendChild(secWrapper);
        });

    } else {
        // Fallback for old data or Fast Mode (No sections)
        const grid = document.createElement('div');
        grid.className = 'gallery-grid';

        // NORMALIZED PLAYLIST
        let playlist = [];
        if (project.media && project.media.length > 0) {
            playlist = project.media;
        } else {
            playlist = project.images.map(url => ({ src: url, type: isVideo(url) ? 'video' : 'image' }));
        }

        playlist.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'gallery-item';

            let content = '';
            if (item.type === 'video') {
                const videoUrl = convertToVideoUrl(item.src);
                content = `<video src="${videoUrl}" autoplay muted loop playsinline onclick="openLightbox(${index}, 'p-gallery')"></video>`;
            } else {
                content = `<img src="${item.src}" alt="${project.title} View ${index + 1}" loading="lazy" onclick="openLightbox(${index}, 'p-gallery')">`;
            }

            el.innerHTML = content;
            grid.appendChild(el);
        });

        // Store on p-gallery directly (DO NOT CHANGE ID)
        galleryContainer.dataset.playlist = JSON.stringify(playlist);

        galleryContainer.appendChild(grid);
    }

    // Update Inquiry Button
    const waMsg = `Hi, I am interested in the design: ${project.title}. Can you provide a quote?`;
    document.getElementById('wa-inquiry').href = `https://wa.me/923001234567?text=${encodeURIComponent(waMsg)}`;
}

/* ================= HOME PAGE LOGIC ================= */

function initHomePageFeatured() {
    const container = document.querySelector('.project-grid');
    if (!container) return;

    // Take first 3 projects
    const featured = projects.slice(0, 3);

    // Customize for the homepage grid layout existing in HTML
    // Or we can dynamically inject if we empty the existing static HTML
    // For now, let's leave the static HTML on home or replace it:

    // Better strategy: Let's replace the static items-1/2/3 with dynamic ones
    container.innerHTML = '';
    featured.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = `project-item item-${idx + 1}`;
        // Add style for background image dynamically since CSS usually handles it, but we want dynamic data
        // We will override the CSS background with inline style or img tag
        item.innerHTML = `
            <img src="${p.images[0]}" class="bg-img" alt="${p.title}" loading="lazy">
            <div class="overlay-text">
                <h4>${p.title}</h4>
                <a href="project.html?id=${p.id}" class="small-link">View Project</a>
            </div>
        `;
        container.appendChild(item);
    });
}

/* ================= UTILS ================= */

function convertToVideoUrl(url) {
    // Converts Drive lh3/thumbnail URL to streamable export URL
    if (!url) return '';
    if (url.includes('drive.google.com/uc?')) return url; // Already correct

    // Extract ID from lh3 url: https://lh3.googleusercontent.com/d/FILE_ID
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
    }
    return url;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function isVideo(url) {
    // Check extension or Drive mime type assumption
    // Drive video URLs often don't have extensions, so we might need metadata
    // BUT since we just added recursive support, let's look for common video extensions just in case
    // OR we can rely on the fact that we might process them differently if we had the type field.
    // For now, let's try a simple extension check + a basic mime type heuristic
    // Since Drive URLs are opaque: https://lh3.googleusercontent.com/d/ID
    // We heavily rely on the fact that Google returns an image for videos if used in <img> tags (thumbnail)
    // But for <video> tags we need the download URL or stream URL.
    // Actually lh3.googleusercontent... returns an IMAGE preview for videos too! 
    // Wait, for <video src="..."> to work, it needs the actual file content.
    // The previous script collected: "https://lh3.googleusercontent.com/d/" + f.getId()
    // This URL often redirects to content for images, but for videos it might be tricky.
    // It's safer to check if the user provided metadata has type 'video'.
    // Since our current data structure is just an array of strings strings project.images = [url, url],
    // we can't distinctively know unless we check the URL or use the new 'media' object from the V2 script.

    // NEW LOGIC: Check for new 'media' object structure or fallback to extension
    // Since we are modifying the JS to consume the new data structure, let's assume we handle mixed content.
    // However, data.js 'images' array is still just strings of URLs.

    // TEMPORARY HACK: If the URL contains an extension like .mp4, it's a video.
    // If it comes from Drive without extension, we might fail to detect it UNLESS
    // we update data.js to include type.

    // But for now, let's assume standard image checking.
    return url.match(/\.(mp4|webm|ogg|mov)$/i);
}

// Global Lightbox State
let currentPlaylist = [];
let currentIndex = 0;

function openLightbox(src, index, contextId) {
    // 1. Get playlist from context
    let container = document.getElementById(contextId);
    if (contextId === 'main') container = document.getElementById('p-gallery'); // Fallback logic

    if (container && container.dataset.playlist) {
        currentPlaylist = JSON.parse(container.dataset.playlist);
        currentIndex = index;
    } else {
        // Fallback single item
        currentPlaylist = [src];
        currentIndex = 0;
    }

    // 2. Create Lightbox if not exists
    let lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox active';
        document.body.appendChild(lightbox);
    }

    // 3. Render Content
    updateLightboxContent();

    // 4. Events
    lightbox.onclick = (e) => {
        if (e.target === lightbox || e.target.className === 'close-lightbox') {
            lightbox.remove();
            document.onkeydown = null; // Cleanup
        }
    };

    // 5. Keyboard Nav
    document.onkeydown = (e) => {
        if (e.key === 'ArrowLeft') changeSlide(-1);
        if (e.key === 'ArrowRight') changeSlide(1);
        if (e.key === 'Escape') {
            lightbox.remove();
            document.onkeydown = null;
        }
    };
}

function updateLightboxContent() {
    const lightbox = document.getElementById('lightbox');

    // Safety check
    if (!currentPlaylist || currentPlaylist.length === 0) return;
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= currentPlaylist.length) currentIndex = 0;

    const item = currentPlaylist[currentIndex];

    // Support both string items (legacy) and object items
    let src = item.src || item;
    let type = item.type || (isVideo(src) ? 'video' : 'image');

    let mediaContent = '';
    if (type === 'video') {
        const videoUrl = convertToVideoUrl(src);
        mediaContent = `<video src="${videoUrl}" controls autoplay playsinline style="max-width:90%; max-height:80vh; border-radius:4px; box-shadow:0 0 20px rgba(0,0,0,0.5);"></video>`;
    } else {
        mediaContent = `<img src="${src}" alt="Fullscreen View">`;
    }

    lightbox.innerHTML = `
        <span class="close-lightbox">&times;</span>
        <button class="nav-btn prev-btn" onclick="event.stopPropagation(); changeSlide(-1)">&#10094;</button>
        ${mediaContent}
        <button class="nav-btn next-btn" onclick="event.stopPropagation(); changeSlide(1)">&#10095;</button>
        <div class="lightbox-caption">${currentIndex + 1} / ${currentPlaylist.length}</div>
    `;
}

function changeSlide(direction) {
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = currentPlaylist.length - 1;
    if (currentIndex >= currentPlaylist.length) currentIndex = 0;
    updateLightboxContent();
}

// Make globally available
window.changeSlide = changeSlide;
window.openLightbox = openLightbox;

/* ================= CSS INJECTION FOR LIGHTBOX ================= */
// Inject styles for the new navigational elements
const style = document.createElement('style');
style.innerHTML = `
    .nav-btn {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0,0,0,0.5);
        color: white;
        border: none;
        padding: 15px;
        font-size: 24px;
        cursor: pointer;
        border-radius: 50%;
        transition: 0.3s;
        user-select: none;
    }
    .nav-btn:hover { background: rgba(212, 175, 55, 0.8); }
    .prev-btn { left: 20px; }
    .next-btn { right: 20px; }
    .lightbox-caption {
        position: absolute;
        bottom: 20px;
        color: #ddd;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        background: rgba(0,0,0,0.5);
        padding: 5px 10px;
        border-radius: 20px;
    }
    video { object-fit: contain; }
`;
document.head.appendChild(style);
