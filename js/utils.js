var PhantomChainer = PhantomChainer || {};

PhantomChainer.Utils = (function() {
    function isDomain(str) {
        var domainRegex = new RegExp(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/);
        return domainRegex.test(str);
    }

    function isValidIP(str) {
        var ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
        
        if (ipv4Regex.test(str)) {
            var parts = str.split('.');
            for (var i = 0; i < parts.length; i++) {
                var num = parseInt(parts[i], 10);
                if (num < 0 || num > 255) return false;
            }
            return true;
        }
        
        return ipv6Regex.test(str);
    }

    function isValidCIDR(str) {
        var parts = str.split('/');
        if (parts.length !== 2) return false;
        
        var ip = parts[0];
        var prefix = parseInt(parts[1], 10);
        
        if (!isValidIP(ip)) return false;
        
        if (ip.indexOf(':') !== -1) {
            return prefix >= 0 && prefix <= 128;
        } else {
            return prefix >= 0 && prefix <= 32;
        }
    }

    function isValidRouteItem(str) {
        var firstPart = str.split('/')[0].trim();
        
        if (str.indexOf('geoip:') === 0 || str.indexOf('geosite:') === 0) {
            return true;
        }
        
        if (str.indexOf('ext:') === 0 || str.indexOf('ext-ip:') === 0 || str.indexOf('ext-domain:') === 0) {
            return true;
        }
        
        if (str.indexOf('domain:') === 0 || str.indexOf('full:') === 0 || str.indexOf('regexp:') === 0 || str.indexOf('keyword:') === 0) {
            return true;
        }
        
        if (isDomain(firstPart)) {
            return true;
        }
        
        if (isValidIP(firstPart)) {
            return true;
        }
        
        if (isValidCIDR(str)) {
            return true;
        }
        
        return false;
    }

    function isValidConfigName(name) {
        var validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
        return validNameRegex.test(name);
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
        xhr.timeout = 15000;
        
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
                callback(new Error('Server returned status ' + xhr.status));
            }
        };
        
        xhr.onerror = function() {
            callback(new Error('Network error occurred'));
        };
        
        xhr.ontimeout = function() {
            callback(new Error('Request timed out'));
        };
        
        xhr.send();
    }

    function copyToClipboard(text, button) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                var originalText = button.innerHTML;
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                button.disabled = true;
                setTimeout(function() {
                    button.innerHTML = originalText;
                    button.disabled = false;
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
            button.disabled = true;
            setTimeout(function() {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 2000);
        } catch (err) {
            alert('Failed to copy!');
        }
        document.body.removeChild(textArea);
    }

    function downloadJSON(jsonString, filename) {
        var blob = new Blob([jsonString], { type: 'application/json' });
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    return {
        isDomain: isDomain,
        isValidIP: isValidIP,
        isValidCIDR: isValidCIDR,
        isValidRouteItem: isValidRouteItem,
        isValidConfigName: isValidConfigName,
        parseJsonc: parseJsonc,
        fetchConfig: fetchConfig,
        copyToClipboard: copyToClipboard,
        downloadJSON: downloadJSON
    };
})();