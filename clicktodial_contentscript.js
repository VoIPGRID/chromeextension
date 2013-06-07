(function () {
    chrome.extension.sendRequest({method: "isC2DEnabled"}, function(response) {
        if (response == "false")
            return;

        const regex = /((\+31|00\s*31|0)\s*(\(0\))*)([-\s\.\(])*(([1-7]([-\s\.\)])*\d)|(8[58]))([-\s\.\)])*\d([-\s\.\)])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d/g;
        const dateregex = /\d{2}-\d{2}-\d{4} \d{2}/g;
        var allowedParents = [
            "a", "abbr", "acronym", "address", "applet", "b", "bdo", "big", "blockquote", "body", "caption", "center", 
            "cite", "code", "dd", "del", "div", "dfn", "dt", "em", "fieldset", "font", "form", "h1", "h2", "h3", "h4", 
            "h5", "h6", "i", "iframe", "ins", "kdb", "li", "nobr", "object", "pre", "p", "q", "samp", "small", "span", 
            "strike", "s", "strong", "sub", "sup", "td", "th", "tt", "u", "var", "article", "aside", "bdi", "command", 
            "datalist", "details", "embed", "figure", "figcaption", "footer", "header", "hgroup", "keygen", "mark", 
            "meter", "nav", "output", "progress", "rp", "ruby", "rt", "section", "summary", "time", "wbr"
        ];
        var xpath = "//text()[(parent::" + allowedParents.join(" or parent::") + ")]";
        var candidates = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

        for(var candidate=null, i=0; candidate=candidates.snapshotItem(i); i++) {
            var source = candidate.nodeValue;
            var texts = new Array();
            var matches = new Array();
            if(regex.test(source)) {
                // first, put all regex matches and chunks of texts from the source string into arrays
                var index = 0;
                regex.lastIndex = 0;
                for(var match=null; (match=regex.exec(source));) {
                    if(!dateregex.test(match[0])) {
                        var begin = regex.lastIndex - match[0].length;
                        var preceding_char = source.substring(begin-1, begin);
                        var following_char = source.substring(regex.lastIndex, regex.lastIndex+1);
                        // do not count matches which are preceded or followed by another number
                        if (isNaN(parseInt(preceding_char)) && isNaN(parseInt(following_char))) {
                            // also exclude matches preceded by 'fax'
                            if (source.substring(Math.max(begin-6, 0), begin).toLowerCase().indexOf('fax') == -1) {
                                texts.push(source.substring(index, regex.lastIndex));
                                matches.push(match[0].replace('(0)', '').replace(/[- \.\(\)]/g, ''));
                                index = regex.lastIndex;
                            }
                        }
                    }
                }
                texts.push(source.substring(index));
                // then, construct a span containing these chunks of texts and click-to-dial icons
                var span = document.createElement('span');
                for(var j=0; j<matches.length; j++) {
                    //alert(matches[j]);
                    span.appendChild(document.createTextNode(texts[j]));
                    var imgUrl = chrome.extension.getURL("assets/img/clicktodial.png")
                    var a = document.createElement('a');
                    a.setAttribute('href', '#');
                    a.setAttribute('rel', matches[j]);
                    a.setAttribute('style', 'background: url("' + imgUrl + '")' +
                        ' no-repeat scroll center center transparent !important; display: inline-block !important; -moz-border-radius:' +
                        ' 9px !important; border-radius: 9px !important; -moz-box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.2) !important;' +
                        ' box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.2) !important; width: 18px !important; height: 18px !important;' +
                        ' line-height: 18px !important; margin: 0 4px !important; position: relative !important;' +
                        ' bottom: -3px !important; padding: 0 !important;');
                    $(a).click(function() {
                        chrome.extension.sendMessage({type: 'click', number: $(this).attr('rel')});
                        return false;
                    });
                    span.appendChild(a);
                }
                span.appendChild(document.createTextNode(texts.pop()));
                // finally, replace the source element with this span
                $(candidate).replaceWith(span);
            }
        }
    });
})();

chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.type === "open") {
        var popup = $('<div class="voipgrid-status"><h2><i class="icon-phone-sign"></i> Gesprek naar <span id="voipgrid-status-number"></span><i class="icon-remove-sign" id="voipgrid-status-close" style="float:right;cursor:pointer;"></i></h2><p><strong>Status:</strong> <span id="voipgrid-status-status"></span></p></div>');
        $('body').append(popup);
        $('#voipgrid-status-close').on('click', function() {
           $('.voipgrid-status').remove();
           chrome.extension.sendMessage({type: 'status-closed'});
        });
        $('#voipgrid-status-number').html(request.number);
    }
    if (request.type === "updatestatus") {
        $('#voipgrid-status-status').html(request.status);
    }
  });
