/**
 * Madni Wooden Legacy - Main Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initImageProtection();

    // Page specific initializers
    const path = window.location.pathname.toLowerCase();

    if (path.includes('collections.html')) {
        initCollections();
    } else if (path.includes('project.html')) {
        initProjectDetails();
    } else if (path.includes('contact.html') || path.includes('about.html')) {
        // Basic pages just get theme/nav (already handled above)
    } else {
        // Default or Home
        initHomePageFeatured();
    }

    init3DTiltEffect();      // 3D tilt on hover
    initParallaxEffect();     // 3D parallax on scroll (optional)

});


/* ================= 3D TILT EFFECT ================= */

function init3DTiltEffect() {
    // Select all cards that should have 3D effect
    const tiltCards = document.querySelectorAll('.cat-card, .project-card, .feature-box, .project-item');

    // Check if device supports hover (desktop)
    const hasHover = window.matchMedia('(hover: hover)').matches;

    if (!hasHover) {
        console.log('Touch device detected - 3D tilt disabled');
        return;
    }

    tiltCards.forEach(card => {
        // Mouse enter - add tilt class
        card.addEventListener('mouseenter', function () {
            this.classList.add('tilt-active');
        });

        // Mouse move - calculate tilt
        card.addEventListener('mousemove', function (e) {
            const rect = this.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            // Mouse position relative to card
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Center of card
            const centerX = width / 2;
            const centerY = height / 2;

            // Calculate rotation (max 15 degrees)
            const maxRotation = 12;
            const rotateX = ((mouseY - centerY) / centerY) * -maxRotation;
            const rotateY = ((mouseX - centerX) / centerX) * maxRotation;

            // Calculate translateZ (lift effect)
            const translateZ = 20;

            // Calculate shine position
            const percentX = (mouseX / width) * 100;
            const percentY = (mouseY / height) * 100;

            // Apply transforms using requestAnimationFrame for performance
            requestAnimationFrame(() => {
                this.style.setProperty('--rotateX', `${rotateX}deg`);
                this.style.setProperty('--rotateY', `${rotateY}deg`);
                this.style.setProperty('--translateZ', `${translateZ}px`);
                this.style.setProperty('--mouse-x', `${percentX}%`);
                this.style.setProperty('--mouse-y', `${percentY}%`);

                this.style.transform = `
                    perspective(1000px) 
                    rotateX(${rotateX}deg) 
                    rotateY(${rotateY}deg) 
                    translateZ(${translateZ}px)
                    scale3d(1.02, 1.02, 1.02)
                `;

                // Dynamic shadow based on tilt
                const shadowX = -rotateY * 2;
                const shadowY = rotateX * 2;
                const shadowBlur = 30 + Math.abs(rotateX) + Math.abs(rotateY);
                const shadowOpacity = 0.15 + (Math.abs(rotateX) + Math.abs(rotateY)) / 200;

                this.style.boxShadow = `
                    ${shadowX}px ${shadowY}px ${shadowBlur}px rgba(26, 58, 46, ${shadowOpacity}),
                    0 0 0 1px rgba(212, 165, 116, 0.1)
                `;
            });
        });

        // Mouse leave - reset tilt
        card.addEventListener('mouseleave', function () {
            this.classList.remove('tilt-active');

            requestAnimationFrame(() => {
                this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0) scale3d(1, 1, 1)';
                this.style.boxShadow = '';
            });
        });

        // Optional: Click effect
        card.addEventListener('click', function () {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0) scale3d(0.98, 0.98, 0.98)';
            setTimeout(() => {
                this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0) scale3d(1, 1, 1)';
            }, 150);
        });
    });

    console.log('✅ 3D Tilt Effect initialized on ' + tiltCards.length + ' cards');
}

/* ================= PARALLAX SCROLL EFFECT ================= */

function initParallaxEffect() {
    const projectItems = document.querySelectorAll('.project-item');

    if (projectItems.length === 0) return;

    let ticking = false;

    window.addEventListener('scroll', function () {
        if (!ticking) {
            requestAnimationFrame(() => {
                projectItems.forEach((item, index) => {
                    const rect = item.getBoundingClientRect();
                    const windowHeight = window.innerHeight;

                    // Check if item is visible
                    if (rect.top < windowHeight && rect.bottom > 0) {
                        const scrollPercent = (windowHeight - rect.top) / (windowHeight + rect.height);
                        const translateY = scrollPercent * 20 - 10;
                        const rotateX = scrollPercent * 10 - 5;

                        item.style.transform = `translateY(${translateY}px) rotateX(${rotateX}deg)`;
                    }
                });
                ticking = false;
            });
            ticking = true;
        }
    });
}

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

/* ================= COLLECTION PAGE LOGIC ================= */

function initCollections() {
    const grid = document.getElementById('collection-grid');
    // ✅ FIX: Target the correct container ID from the new HTML
    const filtersContainer = document.getElementById('filters-container');

    if (!grid || !filtersContainer) return;

    // 1. Get unique categories from projects
    const categories = ['all', ...new Set(projects.map(p => p.category))];

    // 2. Clear existing buttons and Generate Dynamic Buttons
    filtersContainer.innerHTML = '';

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = cat === 'all' ? 'filter-btn active' : 'filter-btn';
        btn.setAttribute('data-filter', cat);
        btn.textContent = cat === 'all' ? 'All' : capitalize(cat);

        btn.addEventListener('click', () => {
            // Visual toggle
            filtersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
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
    const emptyState = document.getElementById('empty-state');

    grid.innerHTML = '';

    if (items.length === 0) {
        emptyState.style.display = 'block';
        grid.style.display = 'none';
        return;
    } else {
        emptyState.style.display = 'none';
        grid.style.display = 'grid';
    }

    items.forEach((project, index) => {
        const card = document.createElement('div');
        // Add animation delay classes
        card.className = `project-card animate-up`;
        card.style.animationDelay = `${index * 0.1}s`;

        // Use MEDIA object if available, otherwise fallback to images array
        let mediaItem;
        if (project.media && project.media.length > 0) {
            mediaItem = project.media[0];
        } else {
            mediaItem = { src: project.images[0], type: 'image' };
        }

        let mediaHtml = '';
        if (mediaItem.type === 'youtube') {
            const ytId = mediaItem.src;
            mediaHtml = `<div class="video-container">
                <img src="https://img.youtube.com/vi/${ytId}/maxresdefault.jpg" alt="${project.title}" onerror="this.src='https://img.youtube.com/vi/${ytId}/hqdefault.jpg'">
                <div class="play-icon"><i class="fas fa-play"></i></div>
            </div>`;
        } else if (mediaItem.type === 'video') {
            const videoUrl = mediaItem.src.includes('preview') ? mediaItem.src : `https://drive.google.com/file/d/${getDriveId(mediaItem.src)}/preview`;
            mediaHtml = `<div class="video-container">
                <iframe src="${videoUrl}" frameborder="0" allow="autoplay" loading="lazy"></iframe>
            </div>`;
        } else {
            mediaHtml = `<img src="${mediaItem.src}" alt="${project.title}" loading="lazy">`;
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

            // Create a playlist for this section and scatter videos
            const sectionMedia = sec.media || sec.images;

            // Define the grid for THIS section
            const grid = document.createElement('div');
            grid.className = 'gallery-grid';

            sectionMedia.forEach((src, mediaIdx) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';

                // PRIORITY: Check if src is an object (media item) or string
                let itemSrc = typeof src === 'string' ? src : src.src;
                let itemType = typeof src === 'string' ? (isVideo(src) ? 'video' : 'image') : (src.type || 'image');

                let content = '';
                if (itemType === 'youtube') {
                    const ytId = itemSrc;
                    content = `<div class="video-container" style="position:relative; width:100%; aspect-ratio:9/16; background:#111; overflow:hidden;">
                        <iframe src="${convertToVideoUrl(ytId, true)}" style="position:absolute; top:-10%; left:0; width:100%; height:120%; border:none; pointer-events:none;" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" frameborder="0"></iframe>
                        <div class="media-trigger" style="position:absolute; inset:0; z-index:100; cursor:pointer;" onclick="openLightbox(${mediaIdx}, 'sec-${idx}')"></div>
                        <div class="video-gradient-overlay"></div>
                    </div>`;
                } else if (itemType === 'video') {
                    const videoId = getDriveId(itemSrc);
                    const streamUrl = `https://drive.google.com/uc?id=${videoId}&export=download`;
                    content = `<div class="video-container" style="position:relative; width:100%; aspect-ratio:9/16; background:#111; overflow:hidden;">
                        <video src="${streamUrl}" autoplay muted loop playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; pointer-events:none;"></video>
                        <div class="media-trigger" style="position:absolute; inset:0; z-index:100; cursor:pointer;" onclick="openLightbox(${mediaIdx}, 'sec-${idx}')"></div>
                    </div>`;
                } else {
                    content = `<img src="${itemSrc}" alt="${sec.title}" loading="lazy" onclick="openLightbox(${mediaIdx}, 'sec-${idx}')" onerror="this.parentElement.style.display='none'">`;
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
            if (itemType === 'youtube') {
                const ytId = itemSrc;
                content = `<div class="video-container" style="position:relative; width:100%; aspect-ratio:9/16; background:#111; overflow:hidden;">
                        <iframe src="${convertToVideoUrl(ytId, true)}" style="position:absolute; top:-10%; left:0; width:100%; height:120%; border:none; pointer-events:none;" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" frameborder="0"></iframe>
                        <div class="media-trigger" style="position:absolute; inset:0; z-index:100; cursor:pointer;" onclick="openLightbox(${index}, 'p-gallery')"></div>
                        <div class="video-gradient-overlay"></div>
                    </div>`;
            } else if (itemType === 'video') {
                const videoUrl = itemSrc.includes('preview') ? itemSrc : `https://drive.google.com/file/d/${getDriveId(itemSrc)}/preview`;
                content = `<div class="video-container" style="position:relative; width:100%; aspect-ratio:9/16; background:#111; overflow:hidden;">
                        <iframe src="${videoUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; pointer-events:none;" allow="autoplay" frameborder="0"></iframe>
                        <div class="media-trigger" style="position:absolute; inset:0; z-index:100; cursor:pointer;" onclick="openLightbox(${index}, 'p-gallery')"></div>
                    </div>`;
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
    document.getElementById('wa-inquiry').href = `https://wa.me/923004339143?text=${encodeURIComponent(waMsg)}`;
}

/* ================= HOME PAGE LOGIC ================= */

function initHomePageFeatured() {
    const container = document.querySelector('.project-grid');
    if (!container) return;

    // Shuffle and pick 3 projects for variety
    const featured = shuffleArray([...projects]).slice(0, 3);

    // Customize for the homepage grid layout existing in HTML
    // Or we can dynamically inject if we empty the existing static HTML
    // For now, let's leave the static HTML on home or replace it:

    // Better strategy: Let's replace the static items-1/2/3 with dynamic ones
    container.innerHTML = '';
    featured.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = `project-item item-${idx + 1} animate-up`;

        // Use first media item (prioritize video)
        let mediaItem = (p.media && p.media.length > 0) ? p.media[0] : { src: p.images[0], type: 'image' };

        let backgroundContent = '';
        if (mediaItem.type === 'youtube') {
            const ytId = mediaItem.src;
            backgroundContent = `<iframe src="${convertToVideoUrl(ytId, true)}" class="bg-video" style="position:absolute; top:-10%; left:0; width:100%; height:120%; border:none; pointer-events:none;" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" frameborder="0"></iframe>`;
        } else if (mediaItem.type === 'video') {
            const videoId = getDriveId(mediaItem.src);
            backgroundContent = `<iframe src="https://drive.google.com/file/d/${videoId}/preview" class="bg-video" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; pointer-events:none;" allow="autoplay" frameborder="0"></iframe>`;
        } else {
            backgroundContent = `<img src="${mediaItem.src}" class="bg-img" alt="${p.title}" loading="lazy">`;
        }

        item.innerHTML = `
            ${backgroundContent}
            <div class="overlay-text">
                <span>Featured Design</span>
                <h4>${p.title}</h4>
                <a href="project.html?id=${p.id}" class="small-link">View Project <i class="fas fa-arrow-right"></i></a>
            </div>
        `;
        container.appendChild(item);
    });
}

/* ================= UTILS ================= */


function convertToVideoUrl(url, autoplay = true) {
    if (!url) return '';
    // Handle YouTube IDs vs full URLs
    if (!url.includes('http')) {
        const baseUrl = `https://www.youtube.com/embed/${url}`;
        const params = [`autoplay=${autoplay ? 1 : 0}`, 'mute=1', 'loop=1', `playlist=${url}`, 'modestbranding=1', 'rel=0', 'controls=0', 'iv_load_policy=3'];
        return `${baseUrl}?${params.join('&')}`;
    }
    const id = getDriveId(url);
    if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
    }
    return url;
}

function getDriveId(url) {
    if (!url) return '';
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
}

function getYoutubeIdFromUrl(url) {
    return url; // In our system 'src' for youtube is the ID itself
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
    if (!url) return false;
    return !!url.match(/\.(mp4|webm|ogg|mov)$/i);
}

// Global Lightbox State
let currentPlaylist = [];
let currentIndex = 0;

function openLightbox(index, contextId) {
    // 1. Get playlist from context
    let container = document.getElementById(contextId);

    if (container && container.dataset.playlist) {
        currentPlaylist = JSON.parse(container.dataset.playlist);
        currentIndex = index;
    } else {
        console.error("No playlist found for context: " + contextId);
        return;
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

    // Standardize item as object { src, type }
    let src = typeof item === 'string' ? item : item.src;
    let type = typeof item === 'string' ? (isVideo(src) ? 'video' : 'image') : (item.type || (isVideo(src) ? 'video' : 'image'));

    let mediaHtmlContent = '';
    if (type === 'youtube') {
        const ytId = src.includes('http') ? getYoutubeIdFromUrl(src) : src;
        const videoUrl = convertToVideoUrl(ytId, true);
        mediaHtmlContent = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding: 20px;">
            <div style="width:100%; max-width:1000px; aspect-ratio:9/16; max-height:85vh; position:relative;">
                <iframe src="${videoUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:8px;" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" frameborder="0"></iframe>
            </div>
        </div>`;
    } else if (type === 'video') {
        const videoId = getDriveId(src);
        const streamUrl = `https://drive.google.com/uc?id=${videoId}&export=download`;
        mediaHtmlContent = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding: 20px;">
             <div style="width:100%; max-width:1000px; aspect-ratio:9/16; max-height:85vh; position:relative;">
                <video src="${streamUrl}" controls muted autoplay loop playsinline style="position:absolute; top:0; left:0; width:100%; height:100%; border-radius:8px; border:none; background:#000;"></video>
            </div>
        </div>`;
    } else {
        mediaHtmlContent = `<img src="${src}" alt="Fullscreen View" style="max-height:85vh; max-width:90vw; object-fit:contain; border-radius:8px;">`;
    }

    lightbox.innerHTML = `
        <span class="close-lightbox">&times;</span>
        <button class="nav-btn prev-btn" onclick="event.stopPropagation(); changeSlide(-1)">&#10094;</button>
        ${mediaHtmlContent}
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
