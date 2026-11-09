(function () {
    var STORE_KEY = 'houhou-reading-marks-v1';
    var FILTER_KEY = 'houhou-reading-filter';
    var FILTERS = [
        { id: 'all', label: '全部' },
        { id: 'unread', label: '未读' },
        { id: 'read', label: '已读' },
        { id: 'like', label: '喜欢' }
    ];

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
        return mark;
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

    function counts(store) {
        var keys = Object.keys(store);
        var read = 0;
        var like = 0;
        keys.forEach(function (key) {
            if (store[key] && store[key].read) {
                read += 1;
            }
            if (store[key] && store[key].like) {
                like += 1;
            }
        });
        return { read: read, like: like };
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
            var inGrid = el.closest && el.closest('#articles');
            if (inGrid) {
                if (visible) {
                    masonryItems.show.push(el);
                } else {
                    masonryItems.hide.push(el);
                }
                return;
            }
            el.style.display = visible ? '' : 'none';
        });
    }

    function relayout(masonryItems) {
        if (!window.jQuery) {
            masonryItems.hide.forEach(function (el) {
                el.style.display = 'none';
            });
            masonryItems.show.forEach(function (el) {
                el.style.display = '';
            });
            return;
        }
        var grid = document.getElementById('articles');
        var msnry = grid ? jQuery(grid).data('masonry') : null;
        if (!msnry) {
            masonryItems.hide.forEach(function (el) {
                el.style.display = 'none';
            });
            masonryItems.show.forEach(function (el) {
                el.style.display = '';
            });
            return;
        }
        masonryItems.show.forEach(function (el) {
            el.style.display = '';
            if (typeof msnry.unignore === 'function') {
                msnry.unignore(el);
            }
        });
        masonryItems.hide.forEach(function (el) {
            el.style.display = 'none';
            if (typeof msnry.ignore === 'function') {
                msnry.ignore(el);
            }
        });
        if (typeof msnry.layout === 'function') {
            msnry.layout();
        }
    }

    function ensureBadge(card, mark) {
        var host = card.querySelector('.card-image') || card;
        var badge = host.querySelector(':scope > .reading-badge');
        if (!mark.read && !mark.like) {
            if (badge) {
                badge.remove();
            }
            return;
        }
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'reading-badge';
            host.appendChild(badge);
        }
        badge.textContent = '';
        if (mark.read) {
            badge.appendChild(pill('已读', 'is-read'));
        }
        if (mark.like) {
            badge.appendChild(pill('喜欢', 'is-like'));
        }
    }

    function pill(text, className) {
        var span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        return span;
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
        readButton.textContent = mark.read ? '已读' : '未读';
        readButton.classList.toggle('is-read', mark.read);
        readButton.setAttribute('aria-pressed', mark.read ? 'true' : 'false');
        readButton.title = mark.read ? '取消已读' : '标为已读';
        likeButton.textContent = mark.like ? '已喜欢' : '喜欢';
        likeButton.classList.toggle('is-like', mark.like);
        likeButton.setAttribute('aria-pressed', mark.like ? 'true' : 'false');
        likeButton.title = mark.like ? '取消喜欢' : '标为喜欢';
    }

    function statusText(mark) {
        var parts = [];
        if (mark.read && mark.readAt) {
            parts.push('已读于 ' + formatTime(mark.readAt));
        }
        if (mark.like && mark.likeAt) {
            parts.push('喜欢于 ' + formatTime(mark.likeAt));
        }
        if (!parts.length) {
            return '还没标记。点一下，下次打开列表就能看到。';
        }
        return parts.join('，');
    }

    function backupBox() {
        var wrap = document.createElement('div');
        wrap.className = 'reading-marks-backup';
        var exportButton = document.createElement('button');
        exportButton.type = 'button';
        exportButton.textContent = '导出标记';
        exportButton.addEventListener('click', exportMarks);
        var importLabel = document.createElement('label');
        importLabel.className = 'reading-marks-import';
        importLabel.textContent = '导入标记';
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            input.value = '';
            if (file) {
                importMarks(file);
            }
        });
        importLabel.appendChild(input);
        wrap.appendChild(exportButton);
        wrap.appendChild(importLabel);
        return wrap;
    }

    function exportMarks() {
        var payload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            marks: readStore()
        };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'reading-marks.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    }

    function importMarks(file) {
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var payload = JSON.parse(String(reader.result || ''));
                var incoming = payload.marks || payload;
                if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
                    throw new Error('格式不对');
                }
                var store = readStore();
                Object.keys(incoming).forEach(function (key) {
                    var item = incoming[key];
                    if (!item || typeof item !== 'object') {
                        return;
                    }
                    var current = markOf(store, key);
                    if (item.read) {
                        current.read = true;
                        current.readAt = item.readAt || current.readAt || new Date().toISOString();
                    }
                    if (item.like) {
                        current.like = true;
                        current.likeAt = item.likeAt || current.likeAt || new Date().toISOString();
                    }
                    if (current.read || current.like) {
                        store[key] = current;
                    }
                });
                writeStore(store);
                paint();
            } catch (err) {
                window.alert('这个文件读不了，请选择之前导出的 reading-marks.json。');
            }
        };
        reader.readAsText(file);
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
        }
        var mark = markOf(store, key);
        bar.innerHTML = '';
        var readButton = document.createElement('button');
        readButton.type = 'button';
        readButton.className = 'reading-marks-btn' + (mark.read ? ' is-read' : '');
        readButton.textContent = mark.read ? '已读' : '标为已读';
        readButton.setAttribute('aria-pressed', mark.read ? 'true' : 'false');
        readButton.addEventListener('click', function () {
            toggleMark(key, 'read');
            paint();
        });
        var likeButton = document.createElement('button');
        likeButton.type = 'button';
        likeButton.className = 'reading-marks-btn' + (mark.like ? ' is-like' : '');
        likeButton.textContent = mark.like ? '已喜欢' : '喜欢';
        likeButton.setAttribute('aria-pressed', mark.like ? 'true' : 'false');
        likeButton.addEventListener('click', function () {
            toggleMark(key, 'like');
            paint();
        });
        var note = document.createElement('span');
        note.className = 'reading-marks-note';
        note.textContent = statusText(mark);
        bar.appendChild(readButton);
        bar.appendChild(likeButton);
        bar.appendChild(note);
        bar.appendChild(backupBox());
    }

    function ensureFilter(store, pageStats) {
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
                button.textContent = item.label;
                button.addEventListener('click', function () {
                    setFilter(item.id);
                    paint();
                });
                row.appendChild(button);
            });
            var hint = document.createElement('p');
            hint.className = 'reading-filter-note';
            var empty = document.createElement('p');
            empty.className = 'reading-filter-empty';
            empty.hidden = true;
            bar.appendChild(row);
            bar.appendChild(hint);
            bar.appendChild(backupBox());
            bar.appendChild(empty);
            list.parentNode.insertBefore(bar, list);
        }
        var filter = currentFilter();
        bar.querySelectorAll('[data-filter]').forEach(function (button) {
            button.classList.toggle('is-active', button.dataset.filter === filter);
        });
        var total = counts(store);
        bar.querySelector('.reading-filter-note').textContent =
            '本页 ' + pageStats.total + ' 篇，已读 ' + pageStats.read + '，喜欢 ' + pageStats.like
            + '。这台浏览器累计已读 ' + total.read + ' 篇，喜欢 ' + total.like + ' 篇。换电脑前先导出。';
        bar.querySelector('.reading-filter-empty').hidden = !(filter !== 'all' && pageStats.visible === 0);
        bar.querySelector('.reading-filter-empty').textContent = '这一页没有符合条件的文章。';
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
            ensureBadge(card, mark);
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
        ensureFilter(store, pageStats);
    }

    function boot() {
        paint();
    }

    if (window.jQuery) {
        jQuery(boot);
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            paint();
        }
    });
})();
