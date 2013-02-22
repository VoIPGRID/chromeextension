// Script for the login page

$(function() {
  var background = chrome.extension.getBackgroundPage();

  // close all widgets with data-opened="false"
  $('.widget[data-opened="false"] .widget-content').hide();

  // a widget header click will minimize/maximize the widget's panel
  $('.widget .widget-header').on('click', function() {
      // check if it's closed or opened
      if($(this).parent().data('opened') === true) {
          $(this).parent()
                  .data('opened', false)
                  .attr('data-opened', 'false')
                  .find('.widget-content').hide(200);
      }
      else {
          // hide the scrollbar while resizing
          $('html').addClass('scrollbarhide');
          $(this).parent()
                  .data('opened', true)            
                  .attr('data-opened', 'true')
                  .find('.widget-content').show(200, function() {
                      // get back the scrollbar after resizing
                      $('body').removeClass('scrollbarhide');
                  });
      }
  });

  var updatehead = function(html) {
    $('#head').html(html);
  };

  var resetloginform = function() {
    $('#username').val('');
    $('#password').val('');
  };

  var errorcallback = function(response) {
    updatehead('Je gebruikersnaam en/of wachtwoord is onjuist.'); // 'Your username and/or password is incorrect.'
    resetloginform();
  };

  var donecallback = function(username) {
    $("#loginform").hide();
    $("#body").show();
    // TBD find a good size
    $('body').css('height', '200');
    $('body').css('width', '360');

    // Setup help button
    $("#help").on("click", function() {
      background.openHelp();
    })

    // Setup settings button
    $("#settings").on("click", function() {
      background.openSettings();
    })

    updatehead(username);
  };

  $("#body").hide();

  // Handler for the login button
  $("#login").on("click", function() {
    background.doLogin($('#username').val(), $('#password').val(), donecallback, errorcallback);
  });

  $("#close").on("click", function() {
    window.close();
  });

});