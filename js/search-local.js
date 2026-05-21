(function($) {
  // 本地全站搜索 — 加载 search.xml，实时匹配文章标题+正文
  if (!$ || !window.XMLHttpRequest) return;

  var searchData = null;
  var searchLoaded = false;

  function loadSearchData(callback) {
    if (searchLoaded) {
      callback && callback(searchData);
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/search.xml', true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        searchData = xhr.responseXML;
        searchLoaded = true;
        callback && callback(searchData);
      }
    };
    xhr.send();
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  function buildResultHtml(items) {
    if (!items || items.length === 0) {
      return '<div class="search-local-empty">无匹配结果</div>';
    }
    var html = '<div class="search-local-results">';
    for (var i = 0; i < items.length; i++) {
      html += '<a class="search-local-item" href="' + items[i].url + '">' +
        '<div class="search-local-title">' + items[i].title + '</div>' +
        '<div class="search-local-excerpt">' + items[i].excerpt + '</div>' +
        '</a>';
    }
    html += '</div>';
    return html;
  }

  function search(query) {
    if (!searchData || !query) return [];
    var entries = searchData.querySelectorAll('entry');
    var results = [];
    var q = query.toLowerCase();
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var title = entry.querySelector('title');
      var content = entry.querySelector('content');
      var url = entry.querySelector('url');
      var t = title ? title.textContent : '';
      var c = content ? stripHtml(content.textContent) : '';
      if (t.toLowerCase().indexOf(q) !== -1 || c.toLowerCase().indexOf(q) !== -1) {
        results.push({
          title: t,
          url: url ? url.textContent : '#',
          excerpt: c.length > 120 ? c.substring(0, 120) + '…' : c
        });
        if (results.length >= 20) break;
      }
    }
    return results;
  }

  var $overlay = $('<div id="search-local-overlay"><div class="search-local-panel"><input type="text" id="search-local-input" placeholder="搜索文章标题或内容…" autofocus><div id="search-local-output"></div><div class="search-local-footer">按 Esc 关闭</div></div></div>').appendTo('body');

  function openOverlay() {
    $overlay.fadeIn(150);
    setTimeout(function() {
      document.getElementById('search-local-input').focus();
    }, 100);
    loadSearchData(function() {
      if ($('#search-local-input').val()) {
        performSearch();
      }
    });
  }

  function closeOverlay() {
    $overlay.fadeOut(100);
    $('#search-local-input').val('');
    $('#search-local-output').html('');
  }

  function performSearch() {
    var q = $('#search-local-input').val().trim();
    if (!q) {
      $('#search-local-output').html('');
      return;
    }
    var results = search(q);
    $('#search-local-output').html(buildResultHtml(results));
  }

  $('#nav-search-btn').on('click', function(e) {
    e.preventDefault();
    $('#search-form-wrap').removeClass('on');
    openOverlay();
  });

  $('#search-local-overlay').on('click', function(e) {
    if (e.target === this || $(e.target).hasClass('search-local-close')) {
      closeOverlay();
    }
  });

  $(document).on('keydown', function(e) {
    if (e.key === 'Escape' && $overlay.is(':visible')) {
      closeOverlay();
    }
  });

  var searchTimer = null;
  $('#search-local-input').on('input', function() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(performSearch, 250);
  });

  $('#search-local-input').on('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });

})(window.jQuery || window.$);
