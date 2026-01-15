/**
 * Madni Wooden Legacy - Main Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    initImageProtection();

    // Page specific initializers
    // Start by trying to fetch new data, but initialize with static data first for speed
    if (window.location.pathname.includes('collections.html')) {
        initCollections();
        fetchProjectsFromDrive(initCollections);
    } else if (window.location.pathname.includes('project.html')) {
        // Show loading without destroying HTML
        const titleEl = document.getElementById('p-title');
        if (titleEl) titleEl.textContent = 'Loading...';
        fetchProjectsFromDrive(initProjectDetails);
    } else if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        initHomePageFeatured();
        fetchProjectsFromDrive(initHomePageFeatured);
    }
    initCustomCursor();
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


/* ================= CUSTOM CURSOR Animation ================= */
function initCustomCursor() {
    // 1. Create Cursor Element
    const cursor = document.createElement('div');
    cursor.id = 'custom-cursor';
    document.body.appendChild(cursor);

    // 2. State Tracking
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    const speed = 0.08; // Slower speed for more smooth lag

    // 3. Track Mouse
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // 4. Animation Loop
    function animate() {
        // Linear Interpolation (Lerp) for smooth trailing
        cursorX += (mouseX - cursorX) * speed;
        cursorY += (mouseY - cursorY) * speed;

        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;

        requestAnimationFrame(animate);
    }
    animate();

    // 5. Hover Effects (Expand on links/images)
    const hoverTargets = document.querySelectorAll('a, button, .project-card, .gallery-item, .cat-card');

    hoverTargets.forEach(target => {
        target.addEventListener('mouseenter', () => {
            cursor.classList.add('cursor-hover');
        });
        target.addEventListener('mouseleave', () => {
            cursor.classList.remove('cursor-hover');
        });
    });

    // Safety check for dynamic elements (adding a global listener fallback)
    document.body.addEventListener('mouseover', (e) => {
        if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.gallery-item') || e.target.closest('.project-card')) {
            cursor.classList.add('cursor-hover');
        } else {
            cursor.classList.remove('cursor-hover');
        }
    });
}


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
        card.innerHTML = `
            <div class="card-img-container">
                <a href="project.html?id=${project.id}">
                    <img src="${project.images[0]}" alt="${project.title}" onerror="this.style.display='none'">
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

            // Title (Only if meaningful, avoid 'Gallery' if it's the only one, or always show if multiple)
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

            sec.images.forEach((imgSrc) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `<img src="${imgSrc}" alt="${sec.title}" onclick="openLightbox('${imgSrc}')" onerror="this.parentElement.style.display='none'">`;
                grid.appendChild(item);
            });

            secWrapper.appendChild(grid);
            galleryContainer.appendChild(secWrapper);
        });

    } else {
        // Fallback for old data or Fast Mode (No sections)
        const grid = document.createElement('div');
        grid.className = 'gallery-grid';
        project.images.forEach((imgSrc, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `<img src="${imgSrc}" alt="${project.title} View ${index + 1}" onclick="openLightbox('${imgSrc}')">`;
            grid.appendChild(item);
        });
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
            <img src="${p.images[0]}" class="bg-img" alt="${p.title}">
            <div class="overlay-text">
                <h4>${p.title}</h4>
                <a href="project.html?id=${p.id}" class="small-link">View Project</a>
            </div>
        `;
        container.appendChild(item);
    });
}

/* ================= UTILS ================= */

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function openLightbox(src) {
    // Simple lightbox implementation
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.className = 'lightbox active';
    lightbox.innerHTML = `
        <span class="close-lightbox">&times;</span>
        <img src="${src}" alt="Fullscreen View">
    `;
    document.body.appendChild(lightbox);

    lightbox.querySelector('.close-lightbox').addEventListener('click', () => {
        lightbox.remove();
    });
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.remove();
    });
}
