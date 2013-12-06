$(function () {
    chrome.extension.sendRequest({method: "isC2DEnabled"}, function(response) {
        if (response == "false")
            return;

        const regex = /((\+31|00\s*31|0)\s*(\(0\))*)([-\s\.\(])*(([1-7]([-\s\.\)])*\d)|(8[58]))([-\s\.\)])*\d([-\s\.\)])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d([-\s\.])*\d/g;
        const dateregex = /\d{2}-\d{2}-\d{4} \d{2}/g;

        const allowedParents = [
            "a", "abbr", "acronym", "address", "applet", "b", "bdo", "big", "blockquote", "body", "caption", "center", 
            "cite", "code", "dd", "del", "div", "dfn", "dt", "em", "fieldset", "font", "form", "h1", "h2", "h3", "h4", 
            "h5", "h6", "i", "iframe", "ins", "kdb", "li", "nobr", "object", "pre", "p", "q", "samp", "small", "span", 
            "strike", "s", "strong", "sub", "sup", "td", "th", "tt", "u", "var", "article", "aside", "bdi", "command", 
            "datalist", "details", "embed", "figure", "figcaption", "footer", "header", "hgroup", "keygen", "mark", 
            "meter", "nav", "outpuFt", "progress", "rp", "ruby", "rt", "section", "summary", "time", "wbr"
        ];


        const elementClassName = 'voipgrid-phone';

        // create allowed elements selector
        var elementsSelector = allowedParents.join();
        var target = document.querySelector('body');

        var link = $('<a>', { 
            href: '#', 
            style: 'background: url("' + chrome.extension.getURL("assets/img/clicktodial.png") + '")' +
                ' no-repeat scroll center center transparent !important; display: inline-block !important; -moz-border-radius:' +
                ' 9px !important; border-radius: 9px !important; -moz-box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.2) !important;' +
                ' box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.2) !important; width: 18px !important; height: 18px !important;' +
                ' line-height: 18px !important; margin: 0 4px !important; position: relative !important;' +
                ' bottom: -3px !important; padding: 0 !important;'
        });

        var processElements = function(elements){

            for(var i in elements){
                var splits = [elements[i]];
                
                for(var match = null; (match = regex.exec(splits[splits.length - 1].nodeValue));)
                {
                    if(!dateregex.test(match[0]))
                    {
                        var element = splits.pop();
                    
                        var before = element.nodeValue.slice(0, match.index);
                        var phone = element.nodeValue.slice(match.index, match.index + match[0].length);
                        var after = element.nodeValue.slice(match.index + match[0].length);
                        
                        var phoneElement = $('<span>', {
                            'class': elementClassName,
                            'text': phone
                        })
                        .append(link.clone()
                            .attr('rel', match[0])
                            .click(function(){
                                chrome.extension.sendMessage({type: 'click', number: $(this).attr('rel')});
                                return false;
                            })
                        );
                        
                        splits.push(document.createTextNode(before));
                        splits.push(phoneElement);
                        splits.push(document.createTextNode(after));
                    }
                }
                
                if (splits.length > 1)
                    $(elements[i]).replaceWith($('<span>').append(splits));
            }

        };

        var getElements = function(element){
            var elements = [];

            $(element).find(elementsSelector).each(function(){
                var jqElement = $(this);

                var jqParents = jqElement.parents('span');

                if(!jqElement.hasClass(elementClassName)){
                    if(!jqParents.hasClass(elementClassName)){
                        for(var i in this.childNodes){
                            var child = this.childNodes[i]; 
                        
                            if(child.nodeType == 3){
                                if(regex.test(child.nodeValue)){
                                    elements.push(child);
                                }
                            }
                        }
                    }
                }
            });

            return elements;
        };

        // callback function
        var observerCallback = function(mutations){

            // array for text elements with phones
            var elements = [];

            // for each mutations we need to detect text elements with phones
            mutations.forEach(function(mutation) {
                var array = getElements(mutation.target);
                elements = elements.concat(array);
            }); 

            processElements(elements);
        };

        // start observing
        var target = document.querySelector('body');
        var observer = new MutationObserver(observerCallback);

        var config = { 
            childList: true,
            subtree: true,
            characterData: true
        };

        if(target != null && typeof(target) != 'undefined'){
            var elements = getElements(target);
            processElements(elements);

            observer.observe(target, config);
        }
    });
});

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
