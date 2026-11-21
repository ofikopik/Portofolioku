/* =========================================================
   Taufik's Portfolio - script.js
   Every feature is in its own small block, so it is easy to read.
   ========================================================= */

(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- 1. Dark / light theme ---------- */
    var root = document.documentElement;
    var themeToggle = document.getElementById("themeToggle");

    themeToggle.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) { /* storage not available */ }
        document.querySelector('meta[name="theme-color"]').setAttribute("content", next === "dark" ? "#0b1409" : "#f5f9ee");
    });

    /* ---------- 2. Quick menu (search panel, like the tab search in Chrome) ---------- */
    var qmTrigger = document.getElementById("qmTrigger");
    var qm = document.getElementById("quickMenu");
    var qmBackdrop = document.getElementById("qmBackdrop");
    var qmInput = document.getElementById("qmInput");
    var qmBody = document.getElementById("qmBody");
    var qmKbd = document.getElementById("qmKbd");
    var phoneQuery = window.matchMedia("(max-width: 760px)");
    var canHover = window.matchMedia("(hover: hover)").matches;

    var qmOpen = false;
    var qmTimer;
    var recentOpen = true;            // is the "Recently Visited" group expanded?
    var currentSection = "home";
    var itemsById = {};

    function svg(paths) {
        return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
    }

    var SECTION_ICONS = {
        home: svg('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>'),
        about: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
        skills: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
        projects: svg('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
        contact: svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 8 9 6 9-6"/>')
    };

    var KIND_LABEL = { section: "Section", project: "Project", skill: "Skill", link: "Link" };
    var CHEVRON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';

    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) qmKbd.textContent = "⌘K";

    /* -- recently visited (remembered on this device) -- */
    var visits = [];
    try {
        var saved = JSON.parse(localStorage.getItem("visits") || "[]");
        if (Array.isArray(saved)) visits = saved.filter(function (v) { return v && typeof v.id === "string" && typeof v.ts === "number"; });
    } catch (e) { /* storage not available: keep it in memory only */ }

    function addVisit(id) {
        visits = visits.filter(function (v) { return v.id !== id; });
        visits.unshift({ id: id, ts: Date.now() });
        visits = visits.slice(0, 12);
        try { localStorage.setItem("visits", JSON.stringify(visits)); } catch (e) { /* ignore */ }
    }

    function timeAgo(ts) {
        var sec = Math.max(1, Math.round((Date.now() - ts) / 1000));
        if (sec < 60) return sec + (sec === 1 ? " sec ago" : " secs ago");
        var min = Math.round(sec / 60);
        if (min < 60) return min + (min === 1 ? " min ago" : " mins ago");
        var hr = Math.round(min / 60);
        if (hr < 24) return hr + (hr === 1 ? " hour ago" : " hours ago");
        var day = Math.round(hr / 24);
        return day + (day === 1 ? " day ago" : " days ago");
    }

    function esc(text) {
        return String(text).replace(/[&<>"]/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
    }

    /* -- the list is built from the page itself, so new projects show up automatically -- */
    function categoryLabel(value) {
        return (value || "").split(" ").map(function (c) {
            var btn = document.querySelector('.filter[data-filter="' + c + '"]');
            return btn ? btn.textContent.trim() : c;
        }).join(" / ");
    }

    function buildItems() {
        var items = [];

        document.querySelectorAll(".nav-links .nav-link").forEach(function (a) {
            var id = a.getAttribute("href").slice(1);
            var target = document.getElementById(id);
            if (!target) return;
            items.push({ id: "section:" + id, kind: "section", section: id, title: a.textContent.trim(),
                         icon: SECTION_ICONS[id] || "", target: target, keywords: id });
        });

        document.querySelectorAll(".project-card").forEach(function (card) {
            var title = card.querySelector("h3").textContent.trim();
            var glyph = card.querySelector(".thumb-label");
            var body = card.querySelector(".project-body");
            items.push({ id: "project:" + title, kind: "project", title: title, glyph: true,
                         icon: glyph ? glyph.textContent : "▢", target: card,
                         sub: "Project • " + categoryLabel(card.getAttribute("data-category")),
                         keywords: (body ? body.textContent : "") + " " + (card.getAttribute("data-category") || "") });
        });

        document.querySelectorAll(".skill-card").forEach(function (card) {
            var title = card.querySelector("h3").textContent.trim();
            var level = card.querySelector(".level");
            var found = level ? level.getAttribute("aria-label").match(/Level (\d)/) : null;
            items.push({ id: "skill:" + title, kind: "skill", title: title, glyph: true,
                         icon: card.querySelector(".skill-icon").textContent, target: card,
                         sub: "Skill" + (found ? " • Level " + found[1] + "/5" : ""),
                         keywords: card.textContent });
        });

        document.querySelectorAll(".contact-card").forEach(function (a) {
            var name = a.querySelector("small").textContent.trim();
            var handle = a.querySelector("strong").textContent.trim();
            items.push({ id: "link:" + name, kind: "link", title: name, icon: a.querySelector(".contact-ico").innerHTML,
                         href: a.href, sub: "Link • " + handle, keywords: handle });
        });

        itemsById = {};
        items.forEach(function (it) { itemsById[it.id] = it; });
        return items;
    }

    function isCurrent(it) { return it.kind === "section" && it.section === currentSection; }

    function subFor(it) {
        if (it.kind === "section") return "Section • " + (isCurrent(it) ? "viewing now" : "#" + it.section);
        return it.sub;
    }

    function itemHTML(it, sub) {
        var link = !!it.href;
        var tag = link ? "a" : "button";
        var attrs = link ? ' href="' + esc(it.href) + '" target="_blank" rel="noopener"' : ' type="button"';
        return "<" + tag + ' class="qm-item' + (isCurrent(it) ? " current" : "") + '" data-id="' + esc(it.id) + '"' + attrs + ">" +
            '<span class="qm-ico" aria-hidden="true">' + (it.glyph ? esc(it.icon) : it.icon) + "</span>" +
            '<span class="qm-text"><span class="qm-title">' + esc(it.title) + '</span><span class="qm-sub">' + esc(sub) + "</span></span>" +
            "</" + tag + ">";
    }

    function renderMenu() {
        var items = buildItems();
        var query = qmInput.value.trim().toLowerCase();
        var html = "";

        if (query) {
            var words = query.split(/\s+/);
            var results = items.filter(function (it) {
                var hay = (it.title + " " + KIND_LABEL[it.kind] + " " + (it.sub || "") + " " + it.keywords).toLowerCase();
                return words.every(function (w) { return hay.indexOf(w) > -1; });
            });
            html += '<div class="qm-group-head"><span>Results</span><span class="qm-count">' + results.length + "</span></div>";
            if (!results.length) {
                html += '<p class="qm-empty">No results for “' + esc(qmInput.value.trim()) + '”. Try “animation” or “css”.</p>';
            }
            results.forEach(function (it) { html += itemHTML(it, subFor(it)); });
        } else {
            html += '<div class="qm-group-head"><span>Sections</span></div>';
            items.filter(function (it) { return it.kind === "section"; })
                 .forEach(function (it) { html += itemHTML(it, subFor(it)); });

            html += '<button class="qm-group-head qm-toggle" type="button" aria-expanded="' + recentOpen + '"><span>Recently Visited</span>' + CHEVRON + "</button>";
            if (recentOpen) {
                var shown = 0;
                visits.forEach(function (v) {
                    var it = itemsById[v.id];
                    if (!it || isCurrent(it) || shown >= 8) return;
                    shown++;
                    html += itemHTML(it, KIND_LABEL[it.kind] + " • " + timeAgo(v.ts));
                });
                if (!shown) html += '<p class="qm-empty">Nothing here yet. Move around the page and your last stops will show up here.</p>';
            }
        }
        qmBody.innerHTML = html;
    }

    function openMenu() {
        if (qmOpen) return;
        qmOpen = true;
        clearTimeout(qmTimer);
        qmInput.value = "";
        renderMenu();
        qm.hidden = false;
        qmBackdrop.hidden = false;
        requestAnimationFrame(function () {
            qm.classList.add("open");
            qmBackdrop.classList.add("open");
        });
        qmTrigger.setAttribute("aria-expanded", "true");
        if (phoneQuery.matches) root.classList.add("lock");
        // On a phone, do not pop the keyboard up right away
        if (canHover) qmInput.focus({ preventScroll: true }); else qm.focus({ preventScroll: true });
    }

    function closeMenu(returnFocus) {
        if (!qmOpen) return;
        qmOpen = false;
        qm.classList.remove("open");
        qmBackdrop.classList.remove("open");
        qmTrigger.setAttribute("aria-expanded", "false");
        root.classList.remove("lock");
        qmTimer = setTimeout(function () {
            qm.hidden = true;
            qmBackdrop.hidden = true;
        }, reduceMotion ? 0 : 200);
        if (returnFocus) qmTrigger.focus({ preventScroll: true });   // do not let the page jump
    }

    function goTo(item) {
        addVisit(item.id);
        closeMenu(false);

        // A project hidden by the filter buttons: show everything first
        if (item.kind === "project" && item.target.hidden) {
            var all = document.querySelector('.filter[data-filter="all"]');
            if (all) all.click();
        }

        setTimeout(function () {
            item.target.scrollIntoView({
                behavior: reduceMotion ? "auto" : "smooth",
                block: item.kind === "section" ? "start" : "center",
                inline: "center"
            });
            if (item.kind !== "section") {
                item.target.classList.remove("flash");
                void item.target.offsetWidth;          // restart the animation
                item.target.classList.add("flash");
                setTimeout(function () { item.target.classList.remove("flash"); }, 1500);
            }
        }, 80);
    }

    qmTrigger.addEventListener("click", function () {
        if (qmOpen) closeMenu(true); else openMenu();
    });

    qmBackdrop.addEventListener("click", function () { closeMenu(true); });

    qmInput.addEventListener("input", renderMenu);

    qmBody.addEventListener("click", function (e) {
        var toggle = e.target.closest(".qm-toggle");
        if (toggle) {
            recentOpen = !recentOpen;
            renderMenu();
            var again = qmBody.querySelector(".qm-toggle");
            if (again) again.focus();
            return;
        }

        var el = e.target.closest(".qm-item");
        if (!el) return;
        var item = itemsById[el.getAttribute("data-id")];
        if (!item) return;

        if (item.href) {                    // external link: it opens in a new tab by itself
            addVisit(item.id);
            closeMenu(false);
            return;
        }
        e.preventDefault();
        goTo(item);
    });

    qm.addEventListener("keydown", function (e) {
        if (e.key === "Tab") {                           // keep the focus inside the panel
            var focusable = [].slice.call(qm.querySelectorAll("input, button, a[href]"));
            var first = focusable[0];
            var last = focusable[focusable.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            var list = [].slice.call(qm.querySelectorAll(".qm-item, .qm-toggle"));
            if (!list.length) return;
            e.preventDefault();
            var i = list.indexOf(document.activeElement);
            if (e.key === "ArrowDown") list[Math.min(list.length - 1, i + 1)].focus();
            else if (i <= 0) qmInput.focus();
            else list[i - 1].focus();
        }
    });

    qmInput.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        var first = qmBody.querySelector(".qm-item");
        if (first) { e.preventDefault(); first.click(); }
    });

    document.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            if (qmOpen) closeMenu(true); else openMenu();
        } else if (e.key === "Escape" && qmOpen) {
            closeMenu(true);
        }
    });

    /* ---------- 3. Typing effect ---------- */
    var typedEl = document.getElementById("typed");
    var roles = ["Student", "Web Learner", "2D Animator", "3D Animator", "Future Developer"];
    var roleIndex = 0;
    var charIndex = 0;
    var deleting = false;

    function type() {
        var word = roles[roleIndex];
        charIndex += deleting ? -1 : 1;
        typedEl.textContent = word.substring(0, charIndex);

        var delay = deleting ? 45 : 95;

        if (!deleting && charIndex === word.length) {
            deleting = true;
            delay = 1500;                       // pause when the word is complete
        } else if (deleting && charIndex === 0) {
            deleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            delay = 350;
        }
        setTimeout(type, delay);
    }

    if (reduceMotion) {
        typedEl.textContent = roles[0];
    } else {
        type();
    }

    /* ---------- 4. Navbar shadow, scroll progress, back-to-top ---------- */
    var navbar = document.getElementById("navbar");
    var progress = document.getElementById("progress");
    var toTop = document.getElementById("toTop");

    function onScroll() {
        var scrollTop = window.scrollY || document.documentElement.scrollTop;
        var height = document.documentElement.scrollHeight - window.innerHeight;

        progress.style.width = (height > 0 ? (scrollTop / height) * 100 : 0) + "%";
        navbar.classList.toggle("scrolled", scrollTop > 10);
        toTop.classList.toggle("show", scrollTop > 600);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    toTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });

    /* ---------- 5. Highlight the menu link of the section you are viewing ---------- */
    var sections = document.querySelectorAll("main section[id]");
    var links = document.querySelectorAll(".nav-link, .bn-link");

    function setActive(id) {
        if (id !== currentSection) {
            addVisit("section:" + currentSection);       // the section you just left
            currentSection = id;
        }
        links.forEach(function (link) {
            link.classList.toggle("active", link.getAttribute("href") === "#" + id);
        });
    }

    if ("IntersectionObserver" in window) {
        var sectionObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { rootMargin: "-45% 0px -50% 0px" });

        sections.forEach(function (section) { sectionObserver.observe(section); });
    }

    /* ---------- 6. Reveal on scroll + number counters ---------- */
    var revealEls = document.querySelectorAll(".reveal");

    function animateCount(el) {
        var target = parseInt(el.getAttribute("data-count"), 10);
        if (reduceMotion || isNaN(target)) { el.textContent = target; return; }

        var start = null;
        var duration = 1200;

        function step(ts) {
            if (start === null) start = ts;
            var p = Math.min((ts - start) / duration, 1);
            el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    if ("IntersectionObserver" in window) {
        var revealObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("visible");
                entry.target.querySelectorAll("[data-count]").forEach(animateCount);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.15 });

        revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
        // Very old browsers: just show everything
        revealEls.forEach(function (el) { el.classList.add("visible"); });
        document.querySelectorAll("[data-count]").forEach(animateCount);
    }

    /* ---------- 7. Profile photo fallback ---------- */
    // If images/taufik.jpeg is missing, show a big "T" instead of a broken image.
    var photo = document.getElementById("profilePhoto");
    var frame = photo.closest(".photo-frame");

    function showFallback() { frame.classList.add("no-photo"); }

    photo.addEventListener("error", showFallback);
    if (photo.complete && photo.naturalWidth === 0) showFallback();

    var heroAvatar = document.querySelector(".hero-avatar");
    if (heroAvatar) {
        var avatarImg = heroAvatar.querySelector("img");
        var avatarMissing = function () { heroAvatar.classList.add("no-photo"); };
        avatarImg.addEventListener("error", avatarMissing);
        if (avatarImg.complete && avatarImg.naturalWidth === 0) avatarMissing();
    }

    /* ---------- 8. Copy Instagram handle + toast ---------- */
    var copyBtn = document.getElementById("copyBtn");
    var toast = document.getElementById("toast");
    var toastTimer;

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
    }

    function fallbackCopy(text) {
        var area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try { document.execCommand("copy"); } catch (e) { /* ignore */ }
        document.body.removeChild(area);
    }

    copyBtn.addEventListener("click", function () {
        var text = copyBtn.getAttribute("data-copy");

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
        } else {
            fallbackCopy(text);
        }
        showToast("Copied " + text + " ✓");
    });

    /* ---------- 9. Projects: filter buttons ---------- */
    var filterBtns = document.querySelectorAll(".filter");
    var projectCards = document.querySelectorAll(".project-card");
    var projectsGrid = document.getElementById("projectsGrid");
    var dotsBox = document.getElementById("projectDots");

    // Small dots under the cards (phone version): one dot per visible card
    function visibleCards() {
        return [].filter.call(projectsGrid.children, function (c) { return !c.hidden; });
    }

    function updateDots() {
        var cards = visibleCards();
        var gridLeft = projectsGrid.getBoundingClientRect().left;
        var best = 0;
        var bestGap = Infinity;
        cards.forEach(function (card, i) {
            var gap = Math.abs(card.getBoundingClientRect().left - gridLeft - 20);
            if (gap < bestGap) { bestGap = gap; best = i; }
        });
        [].forEach.call(dotsBox.children, function (dot, i) { dot.classList.toggle("on", i === best); });
    }

    function buildDots() {
        dotsBox.innerHTML = visibleCards().map(function () { return "<i></i>"; }).join("");
        updateDots();
    }

    projectsGrid.addEventListener("scroll", updateDots, { passive: true });
    window.addEventListener("resize", updateDots);

    filterBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var wanted = btn.getAttribute("data-filter");

            filterBtns.forEach(function (b) {
                var on = b === btn;
                b.classList.toggle("active", on);
                b.setAttribute("aria-pressed", String(on));
            });

            projectCards.forEach(function (card) {
                var categories = " " + card.getAttribute("data-category") + " ";
                var show = wanted === "all" || categories.indexOf(" " + wanted + " ") > -1;
                card.hidden = !show;
                if (show) card.classList.add("visible");
            });

            projectsGrid.scrollLeft = 0;
            buildDots();
        });
    });

    buildDots();

    /* ---------- 10. Project pictures: fallback + viewer (lightbox) ---------- */
    var thumbs = document.querySelectorAll(".project-thumb");

    // If a picture file is missing, show the colored box instead of a broken image.
    thumbs.forEach(function (thumb) {
        var img = thumb.querySelector("img");
        function missing() { thumb.classList.add("no-img"); }

        if (!img) { missing(); return; }
        img.addEventListener("error", missing);
        if (img.complete && img.naturalWidth === 0) missing();
    });

    var lightbox = document.getElementById("lightbox");
    var lbMedia = document.getElementById("lightboxMedia");
    var lbCaption = document.getElementById("lightboxCaption");
    var lbClose = document.getElementById("lightboxClose");
    var lbReturnFocus = null;
    var lbTimer;

    function openLightbox(thumb) {
        var video = thumb.getAttribute("data-video");
        var img = thumb.querySelector("img");
        var missing = thumb.classList.contains("no-img");
        if (missing && !video) return;                 // nothing to show yet

        var title = thumb.getAttribute("data-title") || "";
        var media;

        if (video) {
            media = document.createElement("video");
            media.src = video;
            media.controls = true;
            media.autoplay = true;
            media.playsInline = true;
            if (img && !missing) media.poster = img.currentSrc || img.src;
        } else {
            media = document.createElement("img");
            media.src = img.currentSrc || img.src;
            media.alt = title;
        }

        clearTimeout(lbTimer);
        lbMedia.textContent = "";
        lbMedia.appendChild(media);
        lbCaption.textContent = title;

        lbReturnFocus = document.activeElement;
        lightbox.hidden = false;
        root.classList.add("lock");
        requestAnimationFrame(function () { lightbox.classList.add("show"); });
        lbClose.focus();
    }

    function closeLightbox() {
        if (lightbox.hidden) return;

        var playing = lbMedia.querySelector("video");
        if (playing) playing.pause();

        lightbox.classList.remove("show");
        root.classList.remove("lock");
        lbTimer = setTimeout(function () {
            lightbox.hidden = true;
            lbMedia.textContent = "";
        }, reduceMotion ? 0 : 250);

        if (lbReturnFocus) lbReturnFocus.focus();
    }

    thumbs.forEach(function (thumb) {
        thumb.addEventListener("click", function () { openLightbox(thumb); });
    });

    lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox || e.target === lbClose) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeLightbox();
    });

    /* ---------- 11. Footer year ---------- */
    document.getElementById("year").textContent = new Date().getFullYear();
})();
