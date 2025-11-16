var PhantomChainer = PhantomChainer || {};

PhantomChainer.Utils = (function() {
    function isDomain(str) {
        var domainRegex = new RegExp(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/);
        return domainRegex.test(str);
    }

    function parseJsonc(jsoncString) {
        var lines = jsoncString.split('\n');
        var result = [];
        var inBlockComment = false;
        
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var cleanLine = '';
            
            for (var j = 0; j < line.length; j++) {
                if (inBlockComment) {
                    if (line[j] === '*' && line[j + 1] === '/') {
                        inBlockComment = false;
                        j++;
                    }
                    continue;
                }
                
                if (line[j] === '/' && line[j + 1] === '*') {
                    inBlockComment = true;
                    j++;
                    continue;
                }
                
                if (line[j] === '/' && line[j + 1] === '/') {
                    break;
                }
                
                cleanLine += line[j];
            }
            
            if (cleanLine.trim()) {
                result.push(cleanLine);
            }
        }
        
        return JSON.parse(result.join('\n'));
    }

    function fetchConfig(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    var config = JSON.parse(xhr.responseText);
                    callback(null, config);
                } catch (e) {
                    try {
                        var config = parseJsonc(xhr.responseText);
                        callback(null, config);
                    } catch (e2) {
                        callback(new Error('Failed to parse config'));
                    }
                }
            } else {
                callback(new Error('Failed to fetch: ' + xhr.statusText));
            }
        };
        xhr.onerror = function() {
            callback(new Error('Network error'));
        };
        xhr.send();
    }

    function copyToClipboard(text, button) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                var originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(function() {
                    button.innerHTML = originalText;
                }, 2000);
            }).catch(function() {
                fallbackCopy(text, button);
            });
        } else {
            fallbackCopy(text, button);
        }
    }

    function fallbackCopy(text, button) {
        var textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            var originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(function() {
                button.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            alert('Failed to copy!');
        }
        document.body.removeChild(textArea);
    }

    return {
        isDomain: isDomain,
        parseJsonc: parseJsonc,
        fetchConfig: fetchConfig,
        copyToClipboard: copyToClipboard
    };
})();