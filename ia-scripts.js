var runScript = function() {
  // If editing is off, turn it on
  var editButton = document.querySelector('input[type="submit"][value="Turn editing on"]');
  if(editButton)
    editButton.click();

  // Find and save some important values we'll need for POSTing later
  window.sesskey = M.cfg.sesskey;
  window.courseId = document.querySelector('body').className.match(/course-(\d+)/)[1];

  // Double click an item to show/hide it. Double click a day to show/hide the entire day.
  document.querySelectorAll('ul.section li.activity').forEach(function(el) {
    if(checkIfDay(el)) {
      var link = el.querySelector('a.editing_duplicate');
      var img = link.querySelector('img').outerHTML;
      var sectionId = findAncestor(link, 'li.section').id.match(/section-(\d+)/)[1];

      var parent = findAncestor(link, 'ul');
      parent.innerHTML = parent.innerHTML.replace(/(<li[^>]+>[^<]*<a[^>]+>.*?Duplicate.*?<\/a>[^<]*<\/li>)/, '$1<li role="presentation"><a class="menu-action duplicate-day" href="#">'+img+'<span class="menu-action-text">Duplicate Day</span></a></li>');
    }
  });

  document.addEventListener('dblclick', function(e) {
    el = e.target;
    if (!el.matches('ul.section li.activity'))
      el = findAncestor(el, 'ul.section li.activity');
    if (!el)
      return;

    // Clear text selection
    var selection = window.getSelection ? window.getSelection() : document.selection ? document.selection : null;
    if(!!selection) { if (selection.empty) { selection.empty(); } else { selection.removeAllRanges(); } }

    var hideButton = el.querySelector('a.editing_hide, a.editing_show');
    if(!hideButton)
      return false;

    var link = 'a.' + hideButton.className.match(/editing_(?:hide|show)/)[0] + ' span';
    var module = el;

    do {
      module.querySelector(link).click();
      if (!checkIfDay(el))
        break;

      module = module.nextSibling;
      if (!module || !module.matches('li.activity'))
        break;
    } while(!checkIfDay(module));
  });

  // Duplicate day button copies the whole day and moves it to the bottom of the section, preserving order
  document.querySelectorAll('a.duplicate-day').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();

      var modules = [];
      var module = findAncestor(this, 'ul.section li.activity');
      var sectionId = findAncestor(this, 'li.section').id.match(/section-(\d+)/)[1];

      do {
        modules.push(module);
        module = module.nextSibling;
        if (!module || !module.matches('li.activity'))
          break;
      } while(!checkIfDay(module));

      duplicate(modules, sectionId, 0);
    });
  });
};

// Days are designated by headers that start with the word "Day" e.g. <h1>Day 1</h1>
var checkIfDay = function(obj) {
  var text = Array.prototype.map.call(obj.querySelectorAll('h1,h2,h3,h4,h5,h6'), function(el) { return el.textContent; }).join('').trim();
  return /^Day/.test(text);
};

var moduleId = function(obj) {
  var id = obj.id.match(/module-(\d+)/);
  return id && id[1];
};

// POST that duplicates one section of a day, starting with the last
var duplicate = function(modules, sectionId, beforeId) {
  if(modules.length > 0) {
    var module = modules.pop();
    var currentSibling = module.nextSibling;
    module.querySelector('a.editing_duplicate span').click();

    var wait = function() {
      setTimeout(function() {
        var mod = document.getElementById('module-'+moduleId(module));
        if (!mod.nextSibling || mod.nextSibling === currentSibling)
          wait();
        else
          move(modules, moduleId(mod.nextSibling), sectionId, beforeId);
      }, 100);
    };

    wait();
  }
  else {
    window.location.reload();
  }
};

// POST that moves a section to the bottom, then calls duplicate to process the next section
var move = function(modules, id, sectionId, beforeId) {
  var request = new XMLHttpRequest();
  request.open('POST', 'https://my.imperial-academy.org/course/rest.php');
  request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
  request.onload = function() {
    duplicate(modules, sectionId, id);
  };
  request.send('class=resource&field=move&id='+id+'&sectionId='+sectionId+'&sesskey='+window.sesskey+'&courseId='+window.courseId+'&beforeId='+beforeId);
};

var findAncestor = function(el, match) {
  while ((el = el.parentNode) && !el.matches(match));
  return el;
};
