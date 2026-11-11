(function () {
    const NAV_ITEMS = [
        { label: 'Home', href: '/', match: ['/'] },
        { label: 'Features', href: '/learn-more', match: ['/learn-more'] },
        { label: 'Cards', href: '/activate-card', match: ['/activate-card', '/cards'] },
        { label: 'About LAFP', href: '/about', match: ['/about'] },
        { label: 'Careers', href: '/work-here', match: ['/work-here', '/careers'] },
        { label: 'Announcements', href: '/announcements', match: ['/announcements'] }
    ];

    const ABOUT_CARDS = [
        {
            title: 'About LAFP',
            desc: 'Our mission, FDIC partner custody & digital banking leadership',
            href: '/about',
            img: '/images/about_hq.jpg',
            match: ['/about']
        },
        {
            title: 'Careers',
            desc: 'Build next-generation treasury, card & core banking rails',
            href: '/work-here',
            img: '/images/careers_team.jpg',
            match: ['/work-here', '/careers']
        },
        {
            title: 'Announcements',
            desc: 'Product launches, 4.85% APY rate updates & bank newsroom',
            href: '/announcements',
            img: '/images/announcements_news.jpg',
            match: ['/announcements']
        }
    ];

    function normalizePath(pathname) {
        if (!pathname || pathname === '/') return '/';
        return pathname.replace(/\/+$/, '');
    }

    function isItemActive(matches, current) {
        return matches.includes(current);
    }

    function renderSiteNav() {
        const root = document.getElementById('site-nav-root');
        if (!root) return;

        const currentPath = normalizePath(window.location.pathname);

        const desktopLinksHtml = NAV_ITEMS.map(item => {
            const activeClass = isItemActive(item.match, currentPath) ? ' active' : '';
            return `<a href="${item.href}" class="site-nav-link${activeClass}">${item.label}</a>`;
        }).join('');

        const bankingDrawerLinksHtml = [
            { label: 'Home', href: '/', match: ['/'] },
            { label: 'Features & Overview', href: '/learn-more', match: ['/learn-more'] },
            { label: 'Cards & Packages', href: '/activate-card', match: ['/activate-card', '/cards'] }
        ].map(item => {
            const activeClass = isItemActive(item.match, currentPath) ? ' active' : '';
            return `
                <a href="${item.href}" class="site-drawer-link${activeClass}">
                    <span>${item.label}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </a>
            `;
        }).join('');

        const aboutCardsHtml = ABOUT_CARDS.map(card => {
            const activeClass = isItemActive(card.match, currentPath) ? ' active' : '';
            return `
                <a href="${card.href}" class="site-drawer-card${activeClass}">
                    <img src="${card.img}" alt="${card.title}" class="site-drawer-thumb">
                    <div class="site-drawer-card-text">
                        <span class="site-drawer-card-title">${card.title}</span>
                        <span class="site-drawer-card-desc">${card.desc}</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </a>
            `;
        }).join('');

        root.innerHTML = `
            <header class="site-header">
                <div class="site-header-inner">
                    <a href="/" class="site-nav-logo">LAFP</a>

                    <nav class="site-nav-links" aria-label="Main Navigation">
                        ${desktopLinksHtml}
                    </nav>

                    <div class="site-nav-right">
                        <a href="/login" class="site-nav-login">Log In</a>
                        <a href="/signup" class="site-nav-cta">Open Account</a>
                        <button type="button" class="site-nav-hamburger" id="site-nav-hamburger" aria-label="Toggle Menu" aria-expanded="false">
                            <span></span><span></span><span></span>
                        </button>
                    </div>
                </div>
            </header>

            <div class="site-drawer" id="site-drawer" aria-hidden="true">
                <div class="site-drawer-inner">
                    <div>
                        <div class="site-drawer-group-title">Banking</div>
                        <div class="site-drawer-list">
                            ${bankingDrawerLinksHtml}
                        </div>
                    </div>

                    <div>
                        <div class="site-drawer-group-title">About LAFP</div>
                        <div class="site-drawer-list">
                            ${aboutCardsHtml}
                        </div>
                    </div>

                    <div class="site-drawer-actions">
                        <a href="/login" class="site-drawer-btn-login">Log In</a>
                        <a href="/signup" class="site-drawer-btn-cta">Open Account</a>
                    </div>
                </div>
            </div>
        `;

        const btn = document.getElementById('site-nav-hamburger');
        const drawer = document.getElementById('site-drawer');
        if (btn && drawer) {
            btn.addEventListener('click', () => {
                const open = drawer.classList.toggle('is-open');
                btn.classList.toggle('is-active', open);
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
                drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
            });

            drawer.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    drawer.classList.remove('is-open');
                    btn.classList.remove('is-active');
                    btn.setAttribute('aria-expanded', 'false');
                    drawer.setAttribute('aria-hidden', 'true');
                });
            });
        }
    }

    renderSiteNav();
})();

