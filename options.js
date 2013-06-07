
// Saves options to localStorage.
function save_options() {
  var input_url = document.getElementById("url");
  var value_url = input_url.value;
  localStorage["url"] = value_url;

  var input_c2d = document.getElementById("clicktodial");
  var value_c2d = input_c2d.checked;
  localStorage["c2d"] = value_c2d;

  // Update status to let user know options were saved.
  var status = document.getElementById("status");
  status.innerHTML = "Options Saved.";
  setTimeout(function() {
    status.innerHTML = "";
  }, 750);
}

// Restores select box state to saved value from localStorage.
function restore_options() {
  var url = localStorage["url"];
  if (url) {
    var input_url = document.getElementById("url");
    input_url.value = url;
  }

  var c2d = localStorage["c2d"];
  if (c2d == "true") {
    var input_c2d = document.getElementById("clicktodial");
    input_c2d.checked = "checked";
  }
}
document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#save').addEventListener('click', save_options);
