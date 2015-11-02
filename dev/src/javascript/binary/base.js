// for IE (before 10) we use a jquery plugin called jQuery.XDomainRequest. Explained here,
//http://stackoverflow.com/questions/11487216/cors-with-jquery-and-xdomainrequest-in-ie8-9
//
$(function(){
    $(document).ajaxSuccess(function () {
        var contents = new Contents(page.client, page.user);
        contents.on_load();
    });
});

var onLoad = new PjaxExecQueue();
var onUnload = new PjaxExecQueue();

var SessionStore, LocalStore;
if (isStorageSupported(window.localStorage)) {
    LocalStore = new Store(window.localStorage);
}

if (isStorageSupported(window.sessionStorage)) {
    if (!LocalStore) {
        LocalStore = new Store(window.sessionStorage);
    }
    SessionStore = new Store(window.sessionStorage);
}

if (!SessionStore || !LocalStore) {
    if (!LocalStore) {
        LocalStore = new InScriptStore();
    }
    if (!SessionStore) {
        SessionStore = new InScriptStore();
    }
}

var Settings = new CookieStorage('settings');

var page = new Page(window.page_params);

onLoad.queue(function () {
    page.on_load();
});

onUnload.queue(function () {
    page.on_unload();
});

var bo_url;

//////////////////////////////////////////////////////////////
//Purpose: To solve cross domain logged out server problem.
//Return: Hostname for this page
//////////////////////////////////////////////////////////////
function changeUrlToSameDomain(url) {
    var re = new RegExp('^(http|https):\/\/[.a-zA-Z0-9-]+/');
    var server_name = window.location.protocol + '//' + window.location.hostname;
    var same_domain_url = url.replace(re, server_name + '/');
    return same_domain_url;
}

function formEffects() {
    var select_focus_event = function () {
        $(this)
            .addClass('focus')
            .siblings().addClass('focus')
            .parents('fieldset').addClass('focus');
    };
    var select_blur_event = function () {
        $(this)
            .removeClass('focus')
            .siblings().removeClass('focus')
            .parents('fieldset').removeClass('focus');
    };
    var input_focus_event = function () {
        $(this)
            .parent('div').addClass('focus')
            .parents('fieldset').addClass('focus');
    };
    var input_blur_event = function () {
        $(this)
            .parent('div').removeClass('focus')
            .parents('fieldset').removeClass('focus');
    };

    this.set = function (jqObject) {
        jqObject
            .delegate('select', 'focus', select_focus_event)
            .delegate('select', 'blur', select_blur_event);

        jqObject
            .delegate('input[type=text],input[type=password],textarea', 'focus', input_focus_event)
            .delegate('input[type=text],input[type=password],textarea', 'blur', input_blur_event);
    };
}

function add_click_effect_to_button() {
    var prefix = function (class_name) {
        var class_names = class_name.split(/\s+/);
        
        var _prefix = 'button';
        var cn = class_names.shift();

        while (cn) {
            if (cn && cn != _prefix && !cn.match(/-focus|-hover/)) {
                _prefix = cn;
                break;
            }
            cn = class_names.shift();
        }

        return _prefix;
    };

    var remove_button_class = function (button, class_name) {
        button.removeClass(class_name).children('.button').removeClass(class_name).end().parent('.button').removeClass(class_name);
    };
    var add_button_class = function (button, class_name) {
        button.addClass(class_name).children('.button').addClass(class_name).end().parent('.button').addClass(class_name);
    };

    $('#content,#popup')
        .delegate('.button', 'mousedown', function () {
            var class_name = prefix(this.className) + '-focus';
            add_button_class($(this), class_name);
        })
        .delegate('.button', 'mouseup', function () {
            var class_name = prefix(this.className) + '-focus';
            remove_button_class($(this), class_name);
        })
        .delegate('.button', 'mouseover', function () {
            var class_name = prefix(this.className) + '-hover';
            add_button_class($(this), class_name);
        })
        .delegate('.button', 'mouseout', function () {
            var class_name = prefix(this.className) + '-hover';
            remove_button_class($(this), class_name);
        });
}

var make_mobile_menu = function () {
    if ($('#mobile-menu-container').is(':visible')) {
        $('#mobile-menu').mmenu({
            position: 'right',
            zposition: 'front',
            slidingSubmenus: false,
            searchfield: true,
            onClick: {
                close: true
            },
        }, {
            selectedClass: 'active',
        });
    }
};

onLoad.queue(function () {
    $('.tm-ul > li').hover(
        function () {
            $(this).addClass('hover');
        },
        function () {
            $(this).removeClass('hover');
        }
    );

    MenuContent.init($('.content-tab-container').find('.tm-ul'));

    add_click_effect_to_button();
    make_mobile_menu();

    // attach the class to account form's div/fieldset for CSS visual effects
    var objFormEffect = new formEffects();
    objFormEffect.set($('form.formObject'));

    var i = window.location.href.split('#');
    if (i.length != 2) return;
    var o = document.getElementsByTagName('a');
    for (var t = 0; t < o.length; t++) {
        if (o[t].href.substr(o[t].href.length - i[1].length - 1) == '#' + i[1]) {
            o[t].click();
            break;
        }
    }

});

onLoad.queue(function () {
    attach_date_picker('.has-date-picker');
    attach_time_picker('.has-time-picker');
    attach_inpage_popup('.has-inpage-popup');
    attach_tabs('.has-tabs');
});

// LocalStorage can be used as a means of communication among
// different windows. The problem that is solved here is what
// happens if the user logs out or switches loginid in one
// window while keeping another window or tab open. This can
// lead to unintended trades. The solution is to load the
// account page in all windows after switching loginid or
// the home page after logout.

// onLoad.queue does not work on the home page.
// jQuery's ready function works always.
console.log('>>> '+document.URL);
if (!/backoffice/.test(document.URL)) { // exclude BO
    $(document).ready(function () {
        // $.cookie is not always available.
        // So, fall back to a more basic solution.
        var match = document.cookie.match(/\bloginid=(\w+)/);
        match = match ? match[1] : '';

        console.log('active_loginid='+match+', setting storage handler...');
        $(window).on('storage', function (jq_event) {
            if (jq_event.originalEvent.key !== 'active_loginid') return;
            if (jq_event.originalEvent.newValue === match) return;
            if (jq_event.originalEvent.newValue === '') {
                // logged out
                location.href = page.url.url_for('home');
            } else {
                // loginid switch
                location.href = page.url.url_for('user/my_account?loginid=' + jq_event.originalEvent.newValue);
            }
        });

        LocalStore.set('active_loginid', match);
    });
}
