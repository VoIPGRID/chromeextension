// Main script for the VoIPGRID Chrome extension

var storage = localStorage;

const userdestinationresource = "userdestination";
const queueresource = 'queuecallgroup';
const selecteduserdestinationresource = 'selecteduserdestination';
const userdestinationresource = 'userdestination';
const clicktodialresource = 'clicktodial';

const base_platform_url = "https://partner.voipgrid.nl/";

// set the url if missing
if (!storage.url) {
  storage.url = base_platform_url;
}

if (!storage.c2d) {
  storage.c2d = "true";
}

var platform_url = storage.url;

var selected_fixed = null;
var selected_phone = null;
var selecteduserdestination_id = '';
var fixeddestinations = [];
var phoneaccounts = [];
var queues = [];
var queue_sizes = {};
var current_panel = null;

var callgroup_ids = new Array();
var client_id = '';

var user_id = '';

var queue_timer = '';
var status_timer = '';

var dialed_number = '';

// Titlo for the notification messages
var notification_title = '';

// State of the panel widgets
var widgets_state = {availability: false, queues:false};

var doLogin = function(user, pass, panel) {
  storage.username = user;
  storage.password = pass;
  current_panel = panel;
  loadpaneldata();
};

var openHelp = function() {
  chrome.tabs.create({url: 'http://wiki.voipgrid.nl/index.php/Firefox_plugin'});
};

var openSettings = function() {
  var url = platform_url + 'client/' + client_id + '/user/' + user_id + '/change/#tabs-3';
  chrome.tabs.create({url: url});
};

var loggedOut = function(panel) {
  delete storage.username;
  delete storage.password;
  delete storage.logged;
  client_id = '';
  user_id = '';
  selecteduserdestination_id = '';
  fixeddestinations = [];
  phoneaccounts = [];
  queues = [];
  clearInterval(queue_timer);
  chrome.browserAction.setIcon({path: 'assets/img/call-gray.png'});
  queue_size = {};
  if (panel) {
    panel.errorcallback()
    panel.showLogin()
    panel.updatehead('Uitgelogd');
  }
};

var buildPanel = function(panel) {
  if (storage.logged) {
    current_panel = panel;
    buildLoggedInPanel(panel);
    buildQueuesInPanel(panel);
  } else {
    loggedOut(panel);
  }
}

var buildLoggedInPanel = function(panel) {
  if(selected_fixed == null && selected_phone == null) {
      // set 'no' as selected radio input and disable statusupdate select input
      panel.noselecteduserdestination();
  }
  var html = '';
  if (fixeddestinations.length == 0 && phoneaccounts.length == 0) {
      html = '<option>Je hebt momenteel geen bestemmingen.</option>'; // 'You have no destinations at the moment.'
      panel.nouserdestinations();
  } else {
      for (var i in fixeddestinations) {
          f = fixeddestinations[i];
          var selected = '';
          if (f.id == selected_fixed) {
              selected = ' selected="selected"';
          }
          html += '<option id="fixed-' + f['id'] + '" value="fixed-' + f['id'] + '"' + selected + 
                  '>+' + f['phonenumber'] + '/' + f['description'] +  '</option>';
      }
      for (var i in phoneaccounts) {
          p = phoneaccounts[i];
          var selected = '';
          if (p.id == selected_phone) {
              selected = ' selected="selected"';
          }
          html += '<option id="phone-' + p['id'] + '" value="phone-' + p['id'] + '"' + selected + 
                  '>' + p['internal_number'] + '/' + p['description'] +  '</option>';
      }
      // make sure the radio inputs are enabled
      panel.enableuserdestinations();
  }
  if (selected_fixed == null && selected_phone == null) {
    chrome.browserAction.setIcon({path: 'assets/img/call-red.png'});
  } else {
    setIcon();
  }
  panel.updatehead(html);
  // the user destinations have been loaded succesfully. we may fetch the queue list now.
//  loadqueuedata(panel, base64auth);
  panel.updatehead(storage.username);
  panel.updatestatus(html);
  // Show the new popup
  panel.donecallback();
};

var buildQueuesInPanel = function(panel) {
  // no queues, no list
  if (queues.length == 0) {
      callgroup_ids = new Array();
      html = '<ul><li>Je hebt momenteel geen wachtrijen.</li></ul>'; // 'You have no queues at the moment.'
  }
  // build html list for queue info
  else {
      callgroup_ids = new Array();
      html = '<ul>'
      for (var i in queues) {
          q = queues[i];
          var selected = '';
          if (q.id == storage.primary) {
              selected = ' class="selected"';
          }
          html += '<li attr_title="' + q['id'] + '"' + selected + '><span class="indicator" id="size' + 
                  q['id'] + '" attr_title="' + q['id'] + '">?</span> ' + q['description'] + 
                  ' <span class="code">(' + q['internal_number'] + ')</span></li>';
          callgroup_ids.push(q.id);
      }
      html += '<ul>'
  }
  panel.updatelist(html);
  for (var id in queue_sizes) {
    panel.updatequeuesize(queue_sizes[id], id);
  }
};

/* constructs select input of userdestinations and sets up queue list with a list of callgroups */
var loadpaneldata = function() {
  var username = storage.username;
  var password = storage.password;

  if (username && password) {
    var base64auth = 'Basic ' + btoa(username + ':' + password);
    // fetch userdestination info
    var request = $.ajax({
      url: platform_url + 'api/' + userdestinationresource + '/',
      dataType: 'json',
      contentType: 'application/json',
      settings: {
        accepts: 'application/json',
        contentType: 'application/json'
      },
      headers: {
        Authorization: base64auth
      }
    });
    request.done(function(response) {
      storage.logged = true;

      var userdestinations = response.objects;
      if (userdestinations == null || userdestinations.length == 0) {
        //loggedOut(panel);
        delete storage.logged;
      } else {
        var ud = userdestinations[0];
        // construct select input of userdestinations
        client_id = ud.client;
        user_id = ud.user;
        selecteduserdestination_id = ud.selecteduserdestination.id;
        selected_fixed = ud.selecteduserdestination.fixeddestination;
        selected_phone = ud.selecteduserdestination.phoneaccount;
        fixeddestinations = ud.fixeddestinations;
        phoneaccounts = ud.phoneaccounts;
        loadqueuedata(base64auth);
      }
      if (current_panel) {
        buildPanel(current_panel);
      }
    });
    request.fail(function(jqXHR, textStatus) {
      if (jqXHR.status == 401) {
        delete storage.logged;
        if (current_panel) {
          buildPanel(current_panel);
          current_panel.updatehead('Je gebruikersnaam en/of wachtwoord is onjuist.');
        }
      }
    });
  }
};

var setPrimaryIcon = function(number) {
  var filename = 'assets/img/queue10.png';
  if (isNaN(number)) {
      filename = 'assets/img/queue.png';
  }
  else if (number < 10) {
      filename = 'assets/img/queue' + number + '.png';
  }
  chrome.browserAction.setIcon({path: filename})
}

/* fills the queue list with queue sizes */
function getqueuesizes() {
    var username = storage.username;
    var password = storage.password;
    if (username && password) {
      var base64auth = 'Basic ' + btoa(username + ':' + password);
      for (var i in callgroup_ids) {
        var request = $.ajax({
          url: platform_url + 'api/' + queueresource + '/' + callgroup_ids[i] + '/',
          dataType: 'json',
          contentType: 'application/json',
          settings: {
            accepts: 'application/json',
            contentType: 'application/json'
          },
          headers: {
            Authorization: base64auth
          }
        });

        // do a request for each callgroup
        request.done(function(response) {
          // update list item for this specific callgroup
          var queue_id = response.id;
          queue_sizes[queue_id] = response.queue_size;
          var number = parseInt(queue_sizes[queue_id]);
          if (isNaN(number)) {
              queue_sizes[queue_id] = '?'; // queue size is not available
          }
          if (response.id == storage.primary) {
              setPrimaryIcon(number);
           }
          if (current_panel != null) {
            buildQueuesInPanel(current_panel)
          }
        });
        request.fail(function(jqXHR, textStatus) {
          console.log('queuesize call fail ' + textStatus);
        });
      }
    } else {
      chrome.browserAction.setIcon({path: 'assets/img/call-gray.png'})
    }
};

/* fetches queue info and loads them into the list on the main panel */
function loadqueuedata(base64auth) {
  var request = $.ajax({
    url: platform_url + 'api/' + queueresource + '/',
    dataType: 'json',
    contentType: 'application/json',
    settings: {
      accepts: 'application/json',
      contentType: 'application/json'
    },
    headers: {
      Authorization: base64auth
    }
  });

  request.done(function(response) {
    queues = response.objects;
    // no queues, no list
    if (queues.length == 0) {
        callgroup_ids = new Array();
    }
    // build html list for queue info
    else {
        callgroup_ids = new Array();
        for (var i in queues) {
            q = queues[i];
            callgroup_ids.push(q.id);
        }
    }
    getqueuesizes();
    queue_timer = setInterval(getqueuesizes, 5000);
  });
  request.fail(function(jqXHR, textStatus) {
    if (jqXHR.status == 401) {
      delete storage.logged;
    }
  });
};

var setprimary = function(panel, id) {
  current_panel = panel;
  storage.primary = id;
  getqueuesizes();
  clearInterval(queue_timer);
  queue_timer = setInterval(getqueuesizes, 5000);
  if (id == '') {
    if (selected_fixed == null && selected_phone == null) {
      chrome.browserAction.setIcon({path: 'assets/img/call-red.png'})
    } else {
      chrome.browserAction.setIcon({path: 'assets/img/call-green.png'})
    }
  }
};

var setuserdestination = function(value) {
  // on selecting the 'no' radio button, set the selected userdestination to None.
  if(value == null) {
      selectuserdestination_internal(null, null);
  }
  // on selecting 'yes', set the userdestination to the value of the userdestination select input.
  else {
      selectuserdestination_internal(value.split('-')[0], value.split('-')[1]);
  }
};

var selectuserdestination = function(value) {
  selectuserdestination_internal(value.split('-')[0], value.split('-')[1]);
};

/* sets the selected userdestination to the provided type and id */
var selectuserdestination_internal = function(type, id) {
    var username = storage.username;
    var password = storage.password;
    if (username && password) {
        var base64auth = 'Basic ' + btoa(username + ':' + password);
        selected_fixed = null;
        selected_phone = null;
        if (type == 'fixed') {
            selected_fixed = id;
        } else if(type == 'phone') {
            selected_phone = id;
        }
         var request = $.ajax({
          url: platform_url + 'api/' + selecteduserdestinationresource + '/' + selecteduserdestination_id + '/',  
          dataType: 'json',
          contentType: 'application/json',
          data: '{\"fixeddestination\": ' + selected_fixed + ', \"phoneaccount\": ' + selected_phone + '}',
          settings: {
            accepts: 'application/json',
            contentType: 'application/json'
          },
          headers: {
            Authorization: base64auth
          },
          type: 'PUT'
        });
        clearInterval(queue_timer);
        queue_timer = setInterval(getqueuesizes, 5000);
        if (id == null) {
          chrome.browserAction.setIcon({path: 'assets/img/call-red.png'})
        }
        else {
          chrome.browserAction.setIcon({path: 'assets/img/call-green.png'})
        }
    }
};

var setIcon = function() {
  // Set the icon if we are logged
  if (storage.logged) {
    if (storage.primary) {
      setPrimaryIcon(storage.primary);
    } else {
      chrome.browserAction.setIcon({path: 'assets/img/call-green.png'})
    }
  } else {
    chrome.browserAction.setIcon({path: 'assets/img/call-gray.png'})
  }
};

// bind changes to the local storage
$(window).bind('storage', function (e) {
  // logout
  if (e.originalEvent.key == "url") {
    platform_url = e.originalEvent.newValue;
    loggedOut();
    setIcon();
  }
});

/* handles clicktodial: initiates a call and shows the clicktodial panel. */
var clicktodial = function(b_number, tab) {
    dialed_number = b_number;
    var username = storage.username;
    var password = storage.password;
    if (username && password) {
        var base64auth = 'Basic ' + btoa(username + ':' + password);
        var content = '{\"b_number\": \"' + b_number.replace(/[^0-9+]/g, '') + '\"}';
        var request = $.ajax({
          url: platform_url + 'api/' + clicktodialresource + '/',
          dataType: 'json',
          contentType: 'application/json',
          data: content,
          settings: {
            accepts: 'application/json',
            contentType: 'application/json'
          },
          headers: {
            Authorization: base64auth
          },
          type: 'POST'
        });
        request.done(function (response) {
            if (response.callid != null) {
                // display the clicktodialpanel only if we have a callid
                callid = response.callid;
                // closure for the timer
                var updatestatusFunction = function() {updatestatus(tab);};
                status_timer = setInterval(updatestatusFunction, 500);
                var fontUrl = chrome.extension.getURL('assets/font');
                var font = "@font-face {" +
                  "font-family: 'FontAwesome';" +
                  "src: url('" + fontUrl + "/fontawesome-webfont.eot');" +
                  "src: url('" + fontUrl + "/fontawesome-webfont.eot?#iefix') format('embedded-opentype'), url('" + fontUrl + "/fontawesome-webfont.woff') format('woff'), url('" + fontUrl + "/fontawesome-webfont.ttf') format('truetype'), url('" + fontUrl + "/fontawesome-webfont.svg#FontAwesome') format('svg');" +
                  "font-weight: normal;" +
                  "font-style: normal;";
                // The insertCSS does not accept an url, the code below comes from:
                // http://fonts.googleapis.com/css?family=Open+Sans:400italic,600italic,400,600
                var googleFonts = "@font-face { " +
                  "  font-family: 'Open Sans'; " +
                  "  font-style: normal; " +
                  "  font-weight: 400; " +
                  "  src: local('Open Sans'), local('OpenSans'), url(http://themes.googleusercontent.com/static/fonts/opensans/v6/cJZKeOuBrn4kERxqtaUH3bO3LdcAZYWl9Si6vvxL-qU.woff) format('woff'); " +
                  "} " +
                  "@font-face { " +
                  "  font-family: 'Open Sans'; " +
                  "  font-style: normal; " +
                  "  font-weight: 600; " +
                  "  src: local('Open Sans Semibold'), local('OpenSans-Semibold'), url(http://themes.googleusercontent.com/static/fonts/opensans/v6/MTP_ySUJH_bn48VBG8sNSqRDOzjiPcYnFooOUGCOsRk.woff) format('woff'); " +
                  "} " +
                  "@font-face { " +
                  "  font-family: 'Open Sans'; " +
                  " font-style: italic; " +
                  "  font-weight: 400; " +
                  "  src: local('Open Sans Italic'), local('OpenSans-Italic'), url(http://themes.googleusercontent.com/static/fonts/opensans/v6/xjAJXh38I15wypJXxuGMBrrIa-7acMAeDBVuclsi6Gc.woff) format('woff'); " +
                  "} " +
                  "@font-face { " +
                  "  font-family: 'Open Sans'; " +
                  " font-style: italic; " +
                  " font-weight: 600; " +
                  "  src: local('Open Sans Semibold Italic'), local('OpenSans-SemiboldItalic'), url(http://themes.googleusercontent.com/static/fonts/opensans/v6/PRmiXeptR36kaC0GEAetxuw_rQOTGi-AJs5XCWaKIhU.woff) format('woff');" +
                  "}";
                chrome.tabs.insertCSS(tab.id, {code: font}, function() {
                  chrome.tabs.insertCSS(tab.id, {code: googleFonts}, function() {
                    chrome.tabs.insertCSS(tab.id, {file: 'assets/css/clicktodial.css'}, function() {
                        chrome.tabs.sendMessage(tab.id, {type: "open", number: b_number});
                    });
                  });
                });
            }
        });
        request.error(function() {
            callid = '0';
            var notification = webkitNotifications.createNotification(
              'assets/img/clicktodial.png',
              notification_title,
              'Het is niet gelukt om het gesprek op te zetten.');
            notification.show();
        });
    }
    else {
      var notification = webkitNotifications.createNotification(
        'assets/img/clicktodial.png',
        notification_title,
        'Om gebruik te kunnen maken van Klik en Bel moet eerst ingelogd worden, door op het icoontje op de ' +
                    'toolbar te klikken en je gegevens in te vullen.');
      notification.show();
    }
};

/* updates the clicktodial panel with the call status */
var updatestatus = function(tab) {
    var request = $.ajax({
      url: platform_url + 'api/' + clicktodialresource + '/' + callid + "/",
      dataType: 'json',
      contentType: 'application/json',
      settings: {
        accepts: 'application/json',
        contentType: 'application/json'
      }
    });

    request.done(function (response) {
        var callstatus = response.status;
        var showstatus = callstatus;
        switch(callstatus) {
          case 'dialing_a':
              showstatus = 'Je toestel wordt gebeld'; // 'Your phone is being called'
              break;
          case 'confirm':
              showstatus = 'Toets een 1 om het gesprek aan te nemen'; // 'Press 1 to accept the call'
              break;
          case 'dialing_b':
              showstatus = dialed_number + ' wordt gebeld'; // '() is being called'
              break;
          case 'connected':
              showstatus = 'Verbonden'; // 'Connected'
              break;
          case 'disconnected':
              showstatus = 'Verbinding verbroken'; // 'Connection lost'
              break;
          case 'failed_a':
              showstatus = 'We konden je toestel niet bereiken'; // 'We could not reach your phone'
              break;
          case 'blacklisted':
              showstatus = 'Het nummer staat op de blacklist'; // 'The number is on the blacklist'
              break;
          case 'failed_b':
              showstatus = dialed_number + ' kon niet worden bereikt'; // '() could not be reached'
              break;
        }
        chrome.tabs.sendMessage(tab.id, {type: "updatestatus", status: showstatus});
    });
};

// Listen for content script messages
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.type === "click") {
      clicktodial(request.number, sender.tab);
    }
    if (request.type === "status-closed") {
      clearInterval(status_timer);
    }
  }
);

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.method == "isC2DEnabled") {
      sendResponse(storage.c2d);
    }
});

var clickOnMenu = function(info, tab) {
  var number = info.selectionText.replace('(0)', '').replace(/[- \.\(\)]/g, '');
  clicktodial(number, tab);
};

chrome.contextMenus.create({title: 'Bel geselecteerde nummer', contexts: ["selection"], onclick: clickOnMenu});

var setWidgetsState = function  (item, state) {
  widgets_state[$(item).attr('id')] = $(item).data('opened');
};

// Exported values
window.doLogin = doLogin;
window.loggedOut = loggedOut;
window.openHelp = openHelp;
window.openSettings = openSettings;
window.loadpaneldata = loadpaneldata;
window.setprimary = setprimary;
window.setuserdestination = setuserdestination;
window.selectuserdestination = selectuserdestination;
window.setWidgetsState = setWidgetsState;

window.logged = storage.logged;
window.widgets_state = widgets_state;

// To start select the icon
setIcon();
// do a login right away
loadpaneldata();