(function () {
    var STORE_KEY = 'houhou-reading-marks-v1';
    var FILTER_KEY = 'houhou-reading-filter';
    var FILTERS = [
        { id: 'all', label: '全部' },
        { id: 'unread', label: '未读' },
        { id: 'read', label: '已读' },
        { id: 'like', label: '喜欢' }
    ];

    var style = document.createElement('style');
    style.textContent = [
        'article .card .card-image .card-title{color:#fff !important;}',
        'article .card-image img{color:transparent !important;font-size:0 !important;}',
        'article .card-image a,article .card-image a:hover{text-decoration:none !important;font-weight:500;}',
        'article .card .card-image .card-title{color:#fff !important;}',
        '.reading-filter{margin:18px auto 6px;}',
        '.reading-filter-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;}',
        '.reading-filter-row button,.reading-marks-btn,.reading-card-actions button{',
        'appearance:none;-webkit-appearance:none;border:0;margin:0;box-shadow:none;',
        'background:rgba(15,157,88,.08);color:#3d4f46;border-radius:999px;',
        'padding:5px 14px;font-size:13px;line-height:1.5;cursor:pointer;}',
        '.reading-filter-row button.is-active{background:linear-gradient(to right,#4cbf30 0%,#0f9d58 100%);color:#fff;}',
        '.reading-marks-bar{clear:both;display:flex;flex-wrap:wrap;align-items:center;gap:8px;width:100%;margin:10px 0 4px;}',
        '.reading-marks-btn.is-read,.reading-card-actions button.is-read{background:#0f9d58;color:#fff;}',
        '.reading-marks-btn.is-like,.reading-card-actions button.is-like{background:#e25b6a;color:#fff;}',
        '.reading-marks-note,.reading-filter-empty{color:#78909c;font-size:13px;}',
        '.reading-filter-empty{margin:8px 0 0;}',
        '.reading-card-actions{position:absolute;top:12px;right:12px;z-index:5;display:flex;gap:6px;padding:0;}',
        '.reading-card-actions button{padding:3px 10px;font-size:12px;background:rgba(0,0,0,.42);color:#fff;}',
        'article .card,.recommend .post-card{position:relative;}',
        '#articles .article.reading-filtered{display:none !important;}'
    ].join('');
    document.head.appendChild(style);

    function fixCovers() {
        var images = document.querySelectorAll('.card-image img');
        for (var i = 0; i < images.length; i++) {
            var img = images[i];
            img.alt = '';
            img.addEventListener('error', function () {
                this.style.visibility = 'hidden';
            });
            img.addEventListener('load', function () {
                if (this.naturalWidth > 0) {
                    this.style.visibility = '';
                }
            });
            var match = (img.getAttribute('src') || '').match(/\/medias\/featureimages\/(\d+)\.jpg(?:\?.*)?$/);
            if (match && Number(match[1]) >= 24) {
                img.style.visibility = 'hidden';
                img.src = '/medias/featureimages/' + (Number(match[1]) % 24) + '.jpg';
            } else if (img.complete && img.naturalWidth === 0) {
                img.style.visibility = 'hidden';
            }
        }
    }
    fixCovers();

    function readStore() {
        try {
            var raw = localStorage.getItem(STORE_KEY);
            var data = raw ? JSON.parse(raw) : {};
            return data && typeof data === 'object' ? data : {};
        } catch (err) {
            return {};
        }
    }

    function writeStore(data) {
        localStorage.setItem(STORE_KEY, JSON.stringify(data));
    }

    function postKeyFromHref(href) {
        if (!href) {
            return null;
        }
        var url;
        try {
            url = new URL(href, window.location.origin);
        } catch (err) {
            return null;
        }
        if (url.origin !== window.location.origin) {
            return null;
        }
        var path = url.pathname.replace(/\/index\.html$/, '/');
        if (path.length > 1 && path.charAt(path.length - 1) !== '/') {
            path += '/';
        }
        var matched = path.match(/^(.*\/posts\/[^/]+\/)$/);
        return matched ? matched[1] : null;
    }

    function formatTime(iso) {
        if (!iso) {
            return '';
        }
        var date = new Date(iso);
        if (isNaN(date.getTime())) {
            return '';
        }
        function pad(value) {
            return value < 10 ? '0' + value : String(value);
        }
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
            + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    }

    function markOf(store, key) {
        var mark = store[key];
        if (!mark || typeof mark !== 'object') {
            return { read: false, like: false };
        }
        return {
            read: !!mark.read,
            like: !!mark.like,
            readAt: mark.readAt || '',
            likeAt: mark.likeAt || ''
        };
    }

    function toggleMark(key, field) {
        var store = readStore();
        var mark = markOf(store, key);
        var next = !mark[field];
        mark[field] = next;
        mark[field + 'At'] = next ? new Date().toISOString() : '';
        if (!mark.read && !mark.like) {
            delete store[key];
        } else {
            store[key] = mark;
        }
        writeStore(store);
    }

    function currentFilter() {
        try {
            var value = localStorage.getItem(FILTER_KEY);
            if (value === 'unread' || value === 'read' || value === 'like') {
                return value;
            }
        } catch (err) {
            return 'all';
        }
        return 'all';
    }

    function setFilter(value) {
        try {
            localStorage.setItem(FILTER_KEY, value);
        } catch (err) {
            return;
        }
    }

    function matches(mark, filter) {
        if (filter === 'read') {
            return mark.read;
        }
        if (filter === 'unread') {
            return !mark.read;
        }
        if (filter === 'like') {
            return mark.like;
        }
        return true;
    }

    function postLink(card) {
        var anchors = card.querySelectorAll('a[href]');
        for (var i = 0; i < anchors.length; i++) {
            var key = postKeyFromHref(anchors[i].getAttribute('href'));
            if (key) {
                return key;
            }
        }
        return null;
    }

    function listCards() {
        return document.querySelectorAll('#articles .card, #cd-timeline .card, #prenext-posts .card, .post-card');
    }

    function filterTargets(card) {
        var article = card.closest('#articles .article');
        if (article) {
            return [article];
        }
        var block = card.closest('.cd-timeline-block');
        if (!block) {
            return [];
        }
        var targets = [];
        var day = block.querySelector('.cd-timeline-img.day');
        var content = block.querySelector('.cd-timeline-content');
        if (day) {
            targets.push(day);
        }
        if (content) {
            targets.push(content);
        }
        return targets;
    }

    function setTargetsVisible(targets, visible, masonryItems) {
        targets.forEach(function (el) {
            var hidden = el.classList.contains('reading-filtered');
            if (visible === !hidden) {
                return;
            }
            el.classList.toggle('reading-filtered', !visible);
            masonryItems.changed = true;
            if (!(el.closest && el.closest('#articles'))) {
                el.style.display = visible ? '' : 'none';
            }
        });
    }

    function relayout(masonryItems) {
        if (!masonryItems.changed) {
            return;
        }
        var grid = document.getElementById('articles');
        if (!grid || !window.jQuery || !jQuery(grid).data('masonry')) {
            return;
        }
        var $grid = jQuery(grid);
        $grid.masonry('destroy');
        if (!grid.querySelector('.article:not(.reading-filtered)')) {
            return;
        }
        $grid.masonry({
            itemSelector: '.article:not(.reading-filtered)',
            percentPosition: true
        });
    }

    function ensureCardActions(card, key, mark) {
        var box = card.querySelector(':scope > .reading-card-actions');
        if (!box) {
            box = document.createElement('div');
            box.className = 'reading-card-actions';
            card.appendChild(box);
            ['read', 'like'].forEach(function (field) {
                var button = document.createElement('button');
                button.type = 'button';
                button.dataset.act = field;
                button.addEventListener('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleMark(key, field);
                    paint();
                });
                box.appendChild(button);
            });
        }
        var readButton = box.querySelector('[data-act="read"]');
        var likeButton = box.querySelector('[data-act="like"]');
        readButton.textContent = '已读';
        readButton.classList.toggle('is-read', mark.read);
        readButton.setAttribute('aria-pressed', mark.read ? 'true' : 'false');
        readButton.title = mark.read ? '取消已读' : '标为已读';
        likeButton.textContent = '喜欢';
        likeButton.classList.toggle('is-like', mark.like);
        likeButton.setAttribute('aria-pressed', mark.like ? 'true' : 'false');
        likeButton.title = mark.like ? '取消喜欢' : '标为喜欢';
    }

    function ensurePostBar(store) {
        var detail = document.getElementById('artDetail');
        var key = postKeyFromHref(window.location.href);
        if (!detail || !key) {
            return;
        }
        var bar = document.getElementById('readingMarksBar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'readingMarksBar';
            bar.className = 'reading-marks-bar';
            var info = detail.querySelector('.post-info');
            if (info && info.parentNode) {
                info.parentNode.insertBefore(bar, info.nextSibling);
            } else {
                detail.insertBefore(bar, detail.firstChild);
            }
            ['read', 'like'].forEach(function (field) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'reading-marks-btn';
                button.dataset.act = field;
                button.addEventListener('click', function () {
                    toggleMark(key, field);
                    paint();
                });
                bar.appendChild(button);
            });
            var note = document.createElement('span');
            note.className = 'reading-marks-note';
            bar.appendChild(note);
        }
        var mark = markOf(store, key);
        var readButton = bar.querySelector('[data-act="read"]');
        var likeButton = bar.querySelector('[data-act="like"]');
        readButton.textContent = '已读';
        readButton.classList.toggle('is-read', mark.read);
        readButton.setAttribute('aria-pressed', mark.read ? 'true' : 'false');
        likeButton.textContent = '喜欢';
        likeButton.classList.toggle('is-like', mark.like);
        likeButton.setAttribute('aria-pressed', mark.like ? 'true' : 'false');
        var parts = [];
        if (mark.read && mark.readAt) {
            parts.push('已读于 ' + formatTime(mark.readAt));
        }
        if (mark.like && mark.likeAt) {
            parts.push('喜欢于 ' + formatTime(mark.likeAt));
        }
        bar.querySelector('.reading-marks-note').textContent = parts.join('，');
    }

    function countLabel(filter, pageStats) {
        if (filter === 'unread') {
            return pageStats.total - pageStats.read;
        }
        if (filter === 'read') {
            return pageStats.read;
        }
        if (filter === 'like') {
            return pageStats.like;
        }
        return pageStats.total;
    }

    function ensureFilter(pageStats) {
        var list = document.getElementById('articles') || document.getElementById('cd-timeline');
        if (!list || !list.querySelector('.card')) {
            return;
        }
        var bar = document.getElementById('readingFilter');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'readingFilter';
            bar.className = 'reading-filter container';
            var row = document.createElement('div');
            row.className = 'reading-filter-row';
            FILTERS.forEach(function (item) {
                var button = document.createElement('button');
                button.type = 'button';
                button.dataset.filter = item.id;
                button.addEventListener('click', function () {
                    setFilter(item.id);
                    paint();
                });
                row.appendChild(button);
            });
            var empty = document.createElement('p');
            empty.className = 'reading-filter-empty';
            empty.hidden = true;
            bar.appendChild(row);
            bar.appendChild(empty);
            list.parentNode.insertBefore(bar, list);
        }
        var filter = currentFilter();
        bar.querySelectorAll('[data-filter]').forEach(function (button) {
            var item = FILTERS.filter(function (entry) {
                return entry.id === button.dataset.filter;
            })[0];
            button.textContent = item.label + ' ' + countLabel(item.id, pageStats);
            button.classList.toggle('is-active', button.dataset.filter === filter);
        });
        var empty = bar.querySelector('.reading-filter-empty');
        empty.hidden = !(filter !== 'all' && pageStats.visible === 0);
        empty.textContent = '这一页没有符合条件的文章。';
    }

    function paint() {
        var store = readStore();
        var filter = currentFilter();
        var masonryItems = { show: [], hide: [] };
        var pageStats = { total: 0, read: 0, like: 0, visible: 0 };
        var seen = {};

        listCards().forEach(function (card) {
            var key = postLink(card);
            if (!key) {
                return;
            }
            var mark = markOf(store, key);
            var oldBadge = card.querySelector('.reading-badge');
            if (oldBadge) {
                oldBadge.remove();
            }
            ensureCardActions(card, key, mark);
            var scope = card.closest('#articles, #cd-timeline');
            var targets = scope ? filterTargets(card) : [];
            if (!scope || !targets.length || seen[key]) {
                return;
            }
            seen[key] = true;
            pageStats.total += 1;
            if (mark.read) {
                pageStats.read += 1;
            }
            if (mark.like) {
                pageStats.like += 1;
            }
            var visible = matches(mark, filter);
            if (visible) {
                pageStats.visible += 1;
            }
            setTargetsVisible(targets, visible, masonryItems);
        });

        relayout(masonryItems);
        ensurePostBar(store);
        ensureFilter(pageStats);
    }

    if (window.jQuery) {
        jQuery(paint);
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', paint);
    } else {
        paint();
    }

    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            paint();
        }
    });
})();
