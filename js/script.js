document.addEventListener('DOMContentLoaded', function() {
    var jsonConfigInput = document.getElementById('jsonConfigInput');
    var ipInput = document.getElementById('ipInput');
    var generateButton = document.getElementById('generateButton');
    var outputJson = document.getElementById('outputJson');
    var copyButton = document.getElementById('copyButton');
    var clearButton = document.getElementById('clearButton');
    var pasteButton = document.getElementById('pasteButton');
    var routeAllCheckbox = document.getElementById('routeAllCheckbox');
    var dualConfigToggle = document.getElementById('dualConfigToggle');
    var customNameCheckbox = document.getElementById('customNameCheckbox');
    var customNameInput = document.getElementById('customNameInput');
    var customNameInputContainer = document.getElementById('customNameInputContainer');
    var configCounter = document.getElementById('configCounter');
    var usePublicConfigToggle = document.getElementById('usePublicConfigToggle');
    
    var jsonInputLineNumbers = document.getElementById('jsonInputLineNumbers');
    var ipInputLineNumbers = document.getElementById('ipInputLineNumbers');
    var outputLineNumbers = document.getElementById('outputLineNumbers');

    var phantomConfigUrl = 'https://raw.githubusercontent.com/4n0nymou3/DPI-Phantom/refs/heads/main/serverless.json';
    var publicConfigUrl = 'https://raw.githubusercontent.com/4n0nymou3/multi-proxy-config-fetcher/refs/heads/main/configs/xray_secure_loadbalanced_config.json';
    var defaultForcedRouteIPs = [
        "91.105.192.0/23", "91.108.4.0/22", "91.108.8.0/22", "91.108.12.0/22",
        "91.108.16.0/22", "91.108.20.0/22", "91.108.56.0/23", "91.108.58.0/23",
        "95.161.64.0/20", "149.154.160.0/21", "149.154.168.0/22", "149.154.172.0/22",
        "185.76.151.0/24", "2001:67c:4e8::/48", "2001:b28:f23c::/48", "2001:b28:f23d::/48",
        "2001:b28:f23f::/48", "2a0a:f280:203::/48"
    ];

    function updateLineNumbers(textarea, lineNumbersDiv) {
        var lines = textarea.value.split('\n');
        var lineCount = lines.length;
        var lineNumbers = '';
        for (var i = 1; i <= lineCount; i++) {
            lineNumbers += i + '\n';
        }
        lineNumbersDiv.textContent = lineNumbers;
    }

    function updateOutputLineNumbers(text) {
        var lines = text.split('\n');
        var lineCount = lines.length;
        var lineNumbers = '';
        for (var i = 1; i <= lineCount; i++) {
            lineNumbers += i + '\n';
        }
        outputLineNumbers.textContent = lineNumbers;
    }

    function syncScroll(textarea, lineNumbersDiv) {
        lineNumbersDiv.scrollTop = textarea.scrollTop;
    }

    function initParticles() {
        if (typeof particlesJS !== 'undefined') {
            try {
                particlesJS('particles-js', {
                    "particles": {
                        "number": {
                            "value": 100,
                            "density": {
                                "enable": true,
                                "value_area": 800
                            }
                        },
                        "color": {
                            "value": "#ffffff"
                        },
                        "shape": {
                            "type": "circle",
                            "stroke": {
                                "width": 0,
                                "color": "#000000"
                            },
                            "polygon": {
                                "nb_sides": 5
                            }
                        },
                        "opacity": {
                            "value": 0.5,
                            "random": false,
                            "anim": {
                                "enable": false,
                                "speed": 1,
                                "opacity_min": 0.1,
                                "sync": false
                            }
                        },
                        "size": {
                            "value": 3,
                            "random": true,
                            "anim": {
                                "enable": false,
                                "speed": 40,
                                "size_min": 0.1,
                                "sync": false
                            }
                        },
                        "line_linked": {
                            "enable": true,
                            "distance": 150,
                            "color": "#ffffff",
                            "opacity": 0.4,
                            "width": 1
                        },
                        "move": {
                            "enable": true,
                            "speed": 6,
                            "direction": "none",
                            "random": false,
                            "straight": false,
                            "out_mode": "out",
                            "bounce": false,
                            "attract": {
                                "enable": false,
                                "rotateX": 600,
                                "rotateY": 1200
                            }
                        }
                    },
                    "interactivity": {
                        "detect_on": "canvas",
                        "events": {
                            "onhover": {
                                "enable": true,
                                "mode": "repulse"
                            },
                            "onclick": {
                                "enable": true,
                                "mode": "push"
                            },
                            "resize": true
                        },
                        "modes": {
                            "grab": {
                                "distance": 400,
                                "line_linked": {
                                    "opacity": 1
                                }
                            },
                            "bubble": {
                                "distance": 400,
                                "size": 40,
                                "duration": 2,
                                "opacity": 8
                            },
                            "repulse": {
                                "distance": 200,
                                "duration": 0.4
                            },
                            "push": {
                                "particles_nb": 4
                            },
                            "remove": {
                                "particles_nb": 2
                            }
                        }
                    },
                    "retina_detect": true
                });
            } catch (e) {
                console.log('Particles.js not available');
            }
        }
    }

    function setDefaultIPs() {
        ipInput.value = defaultForcedRouteIPs.join('\n');
        updateLineNumbers(ipInput, ipInputLineNumbers);
    }

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

    function fetchPublicConfig(callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', publicConfigUrl, true);
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
                        callback(new Error('Failed to parse public config'));
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

    usePublicConfigToggle.addEventListener('change', function() {
        if (usePublicConfigToggle.checked) {
            pasteButton.disabled = true;
            jsonConfigInput.disabled = true;
            jsonConfigInput.style.opacity = '0.5';
            jsonConfigInput.style.cursor = 'not-allowed';
            
            fetchPublicConfig(function(err, config) {
                if (err) {
                    alert('Error loading public config: ' + err.message);
                    usePublicConfigToggle.checked = false;
                    pasteButton.disabled = false;
                    jsonConfigInput.disabled = false;
                    jsonConfigInput.style.opacity = '1';
                    jsonConfigInput.style.cursor = 'text';
                } else {
                    jsonConfigInput.value = JSON.stringify(config, null, 2);
                    updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
                }
            });
        } else {
            pasteButton.disabled = false;
            jsonConfigInput.disabled = false;
            jsonConfigInput.style.opacity = '1';
            jsonConfigInput.style.cursor = 'text';
        }
    });

    dualConfigToggle.addEventListener('change', function() {
        routeAllCheckbox.disabled = dualConfigToggle.checked;
    });

    customNameCheckbox.addEventListener('change', function() {
        if (customNameCheckbox.checked) {
            customNameInput.disabled = false;
            customNameInputContainer.classList.add('active');
        } else {
            customNameInput.disabled = true;
            customNameInputContainer.classList.remove('active');
        }
    });

    jsonConfigInput.addEventListener('input', function() {
        updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
    });

    jsonConfigInput.addEventListener('scroll', function() {
        syncScroll(jsonConfigInput, jsonInputLineNumbers);
    });

    ipInput.addEventListener('input', function() {
        updateLineNumbers(ipInput, ipInputLineNumbers);
    });

    ipInput.addEventListener('scroll', function() {
        syncScroll(ipInput, ipInputLineNumbers);
    });

    outputJson.addEventListener('scroll', function() {
        syncScroll(outputJson, outputLineNumbers);
    });

    pasteButton.addEventListener('click', function() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function(clipText) {
                jsonConfigInput.value = clipText;
                updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
            }).catch(function() {
                alert('Failed to paste from clipboard.');
            });
        } else {
            alert('Clipboard not supported. Please paste manually.');
        }
    });

    generateButton.addEventListener('click', function() {
        var jsonInput = jsonConfigInput.value.trim();
        var routeAll = routeAllCheckbox.checked;
        var generateDual = dualConfigToggle.checked;
        var useCustomName = customNameCheckbox.checked;
        var customName = customNameInput.value.trim();
        var userConfig;
        outputJson.value = '';
        var loadingContainer = document.body;
        loadingContainer.classList.add('loading');
        
        var existingLoader = loadingContainer.querySelector('.loader-container');
        if (!existingLoader) {
            var loader = document.createElement('div');
            loader.className = 'loader-container';
            loader.innerHTML = '<div class="spinny-loader"><div class="spinny-circle"></div></div>';
            loadingContainer.appendChild(loader);
        }
        outputLineNumbers.textContent = '1';
        configCounter.textContent = '';

        if (useCustomName && customName === '') {
            loadingContainer.classList.remove('loading');
            var loaderElem = loadingContainer.querySelector('.loader-container');
            if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
            var errorMessage = 'Error: Please enter a custom config name or uncheck the option.';
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        try {
            userConfig = parseJsonc(jsonInput);
        } catch (error) {
            try {
                userConfig = JSON.parse(jsonInput);
            } catch (error2) {
                loadingContainer.classList.remove('loading');
                var loaderElem = loadingContainer.querySelector('.loader-container');
                if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
                var errorMessage = 'Error: Input is not valid JSON. Please check format.';
                outputJson.value = errorMessage;
                updateOutputLineNumbers(errorMessage);
                return;
            }
        }

        if (!userConfig.outbounds || !userConfig.routing) {
            loadingContainer.classList.remove('loading');
            var loaderElem = loadingContainer.querySelector('.loader-container');
            if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
            var errorMessage = 'Error: Config incomplete. Need outbounds and routing sections.';
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        var configCount = 0;
        var singleProxyOriginalTag = 'proxy';
        var mainBalancerOriginalTags = ['proxy-round', 'all'];
        var isLoadBalanced = Array.isArray(userConfig.routing.balancers) && userConfig.routing.balancers.length > 0;
        
        var userBalancer = null;
        if (isLoadBalanced && userConfig.routing.balancers) {
            for (var i = 0; i < userConfig.routing.balancers.length; i++) {
                if (mainBalancerOriginalTags.indexOf(userConfig.routing.balancers[i].tag) !== -1) {
                    userBalancer = userConfig.routing.balancers[i];
                    break;
                }
            }
        }

        if (userBalancer && userBalancer.selector && Array.isArray(userConfig.outbounds)) {
            var selectors = [];
            for (var i = 0; i < userBalancer.selector.length; i++) {
                if (userBalancer.selector[i].charAt(0) !== '!') {
                    selectors.push(userBalancer.selector[i]);
                }
            }
            for (var i = 0; i < userConfig.outbounds.length; i++) {
                var outbound = userConfig.outbounds[i];
                if (outbound.tag) {
                    for (var j = 0; j < selectors.length; j++) {
                        if (outbound.tag.indexOf(selectors[j]) === 0) {
                            configCount++;
                            break;
                        }
                    }
                }
            }
        }
        
        if (configCount === 0 && userConfig.outbounds) {
            for (var i = 0; i < userConfig.outbounds.length; i++) {
                if (userConfig.outbounds[i].tag === singleProxyOriginalTag) {
                    configCount = 1;
                    break;
                }
            }
        }

        if (configCount > 0) {
            configCounter.textContent = '(' + configCount + ' config' + (configCount > 1 ? 's' : '') + ' detected)';
        }

        if (isLoadBalanced && !userBalancer) {
            loadingContainer.classList.remove('loading');
            var loaderElem = loadingContainer.querySelector('.loader-container');
            if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
            var errorMessage = 'Error: Load-balanced config needs balancer tag: ' + mainBalancerOriginalTags.join(', ');
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        if (!isLoadBalanced) {
            var foundProxy = false;
            for (var i = 0; i < userConfig.outbounds.length; i++) {
                if (userConfig.outbounds[i].tag === singleProxyOriginalTag) {
                    foundProxy = true;
                    break;
                }
            }
            if (!foundProxy) {
                loadingContainer.classList.remove('loading');
                var loaderElem = loadingContainer.querySelector('.loader-container');
                if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
                var errorMessage = 'Error: Single config needs outbound with tag: ' + singleProxyOriginalTag;
                outputJson.value = errorMessage;
                updateOutputLineNumbers(errorMessage);
                return;
            }
        }

        var routeItems = [];
        var lines = ipInput.value.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var item = lines[i].trim();
            if (item) routeItems.push(item);
        }

        if (routeItems.length === 0 && !routeAll && !generateDual) {
            loadingContainer.classList.remove('loading');
            var loaderElem = loadingContainer.querySelector('.loader-container');
            if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
            var errorMessage = 'Error: IP/Domain list cannot be empty when Route All is unchecked.';
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', phantomConfigUrl, true);
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                var baseConfig;
                try {
                    baseConfig = JSON.parse(xhr.responseText);
                } catch (e) {
                    try {
                        baseConfig = parseJsonc(xhr.responseText);
                    } catch (e2) {
                        loadingContainer.classList.remove('loading');
                        var loaderElem = loadingContainer.querySelector('.loader-container');
                        if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
                        outputJson.value = 'Error: Failed to parse base config.';
                        updateOutputLineNumbers('Error: Failed to parse base config.');
                        return;
                    }
                }

                try {
                    function findFragmentOutboundTag(config) {
                        if (!config.outbounds || !Array.isArray(config.outbounds)) return null;
                        for (var i = 0; i < config.outbounds.length; i++) {
                            var o = config.outbounds[i];
                            if (o.settings && o.settings.fragment) return o.tag;
                            if (o.streamSettings && o.streamSettings.sockopt && o.streamSettings.sockopt.dialerProxy) return o.tag;
                        }
                        return null;
                    }

                    function createSingleConfig(routeAllTraffic) {
                        var newConfig = JSON.parse(JSON.stringify(baseConfig));
                        var userConfigCopy = JSON.parse(JSON.stringify(userConfig));
                        var mainExitTag = '';

                        if (!newConfig.routing) newConfig.routing = {};
                        if (!newConfig.routing.rules) newConfig.routing.rules = [];
                        if (!newConfig.routing.balancers) newConfig.routing.balancers = [];
                        if (!newConfig.dns) newConfig.dns = {};
                        if (!newConfig.dns.hosts) newConfig.dns.hosts = {};
                        if (!newConfig.dns.servers) newConfig.dns.servers = [];
                        if (!newConfig.outbounds) newConfig.outbounds = [];
                        if (!newConfig.policy) newConfig.policy = {};

                        var prefix = 'user-';
                        var tagMap = {};
                        var allUserTags = [];

                        for (var i = 0; i < userConfigCopy.outbounds.length; i++) {
                            if (userConfigCopy.outbounds[i].tag) {
                                allUserTags.push(userConfigCopy.outbounds[i].tag);
                            }
                        }
                        if (isLoadBalanced) {
                            for (var i = 0; i < userConfigCopy.routing.balancers.length; i++) {
                                if (userConfigCopy.routing.balancers[i].tag) {
                                    allUserTags.push(userConfigCopy.routing.balancers[i].tag);
                                }
                            }
                        }

                        for (var i = 0; i < allUserTags.length; i++) {
                            if (allUserTags[i]) {
                                tagMap[allUserTags[i]] = prefix + allUserTags[i];
                            }
                        }

                        var fragmentTag = findFragmentOutboundTag(newConfig);

                        if (isLoadBalanced) {
                            var mainBalancerOriginalTag = userBalancer.tag;
                            var userProxySelector = userBalancer.selector[0];
                            mainExitTag = tagMap[mainBalancerOriginalTag];

                            for (var i = 0; i < userConfigCopy.outbounds.length; i++) {
                                var o = userConfigCopy.outbounds[i];
                                if (o.tag) {
                                    o.tag = tagMap[o.tag] || o.tag;
                                    if (o.tag.indexOf(prefix + userProxySelector) === 0 && fragmentTag) {
                                        if (!o.streamSettings) o.streamSettings = {};
                                        if (!o.streamSettings.sockopt) o.streamSettings.sockopt = {};
                                        o.streamSettings.sockopt.dialerProxy = fragmentTag;
                                    }
                                }
                            }

                            for (var i = 0; i < userConfigCopy.routing.balancers.length; i++) {
                                var b = userConfigCopy.routing.balancers[i];
                                if (b.tag) b.tag = tagMap[b.tag] || b.tag;
                                if (b.selector) {
                                    for (var j = 0; j < b.selector.length; j++) {
                                        var s = b.selector[j];
                                        b.selector[j] = s.charAt(0) === '!' ? '!' + prefix + s.substring(1) : prefix + s;
                                    }
                                }
                            }
                        } else {
                            mainExitTag = tagMap[singleProxyOriginalTag];
                            for (var i = 0; i < userConfigCopy.outbounds.length; i++) {
                                var o = userConfigCopy.outbounds[i];
                                if (o.tag) {
                                    o.tag = tagMap[o.tag] || o.tag;
                                    if (o.tag === mainExitTag && fragmentTag) {
                                        if (!o.streamSettings) o.streamSettings = {};
                                        if (!o.streamSettings.sockopt) o.streamSettings.sockopt = {};
                                        o.streamSettings.sockopt.dialerProxy = fragmentTag;
                                    }
                                }
                            }
                        }

                        if (userConfigCopy.observatory && userConfigCopy.observatory.subjectSelector) {
                            for (var i = 0; i < userConfigCopy.observatory.subjectSelector.length; i++) {
                                userConfigCopy.observatory.subjectSelector[i] = prefix + userConfigCopy.observatory.subjectSelector[i];
                            }
                        }

                        var ruleAction = isLoadBalanced ? { balancerTag: mainExitTag } : { outboundTag: mainExitTag };
                        var insertionIndex = -1;

                        for (var i = 0; i < newConfig.routing.rules.length; i++) {
                            var rule = newConfig.routing.rules[i];
                            if (rule.port === "0-65535" && rule.enabled === true) {
                                insertionIndex = i;
                                break;
                            }
                        }

                        if (insertionIndex === -1) {
                            for (var i = 0; i < newConfig.routing.rules.length; i++) {
                                var r = newConfig.routing.rules[i];
                                if (r.outboundTag === 'direct-out' && Array.isArray(r.ip)) {
                                    for (var j = 0; j < r.ip.length; j++) {
                                        if (r.ip[j] === 'geoip:ir') {
                                            insertionIndex = i;
                                            break;
                                        }
                                    }
                                    if (insertionIndex !== -1) break;
                                }
                            }
                        }

                        if (routeAllTraffic) {
                            var tcpCatchAll = { type: 'field', network: 'tcp' };
                            var udpCatchAll = { type: 'field', network: 'udp' };
                            for (var key in ruleAction) {
                                tcpCatchAll[key] = ruleAction[key];
                                udpCatchAll[key] = ruleAction[key];
                            }
                            if (insertionIndex > -1) {
                                newConfig.routing.rules.splice(insertionIndex, 0, tcpCatchAll, udpCatchAll);
                            } else {
                                newConfig.routing.rules.push(tcpCatchAll);
                                newConfig.routing.rules.push(udpCatchAll);
                            }
                        } else {
                            var rulesToAdd = [];
                            var ipList = [];
                            var domainList = [];

                            for (var i = 0; i < routeItems.length; i++) {
                                var item = routeItems[i];
                                var firstPart = item.split('/')[0].trim();
                                if (isDomain(firstPart)) {
                                    domainList.push(item);
                                } else {
                                    ipList.push(item);
                                }
                            }

                            if (domainList.length > 0) {
                                var domainRule = { type: 'field', domain: domainList };
                                for (var key in ruleAction) domainRule[key] = ruleAction[key];
                                rulesToAdd.push(domainRule);
                            }
                            if (ipList.length > 0) {
                                var ipRule = { type: 'field', ip: ipList };
                                for (var key in ruleAction) ipRule[key] = ruleAction[key];
                                rulesToAdd.push(ipRule);
                            }

                            if (rulesToAdd.length > 0) {
                                if (insertionIndex > -1) {
                                    for (var i = rulesToAdd.length - 1; i >= 0; i--) {
                                        newConfig.routing.rules.splice(insertionIndex, 0, rulesToAdd[i]);
                                    }
                                } else {
                                    var lastDirectRuleIndex = -1;
                                    for (var i = newConfig.routing.rules.length - 1; i >= 0; i--) {
                                        if (newConfig.routing.rules[i].outboundTag === 'direct-out') {
                                            lastDirectRuleIndex = i;
                                            break;
                                        }
                                    }
                                    var spliceIndex = lastDirectRuleIndex > -1 ? lastDirectRuleIndex + 1 : 0;
                                    for (var i = 0; i < rulesToAdd.length; i++) {
                                        newConfig.routing.rules.splice(spliceIndex + i, 0, rulesToAdd[i]);
                                    }
                                }
                            }
                        }

                        for (var i = 0; i < userConfigCopy.outbounds.length; i++) {
                            newConfig.outbounds.push(userConfigCopy.outbounds[i]);
                        }
                        if (isLoadBalanced) {
                            for (var i = 0; i < userConfigCopy.routing.balancers.length; i++) {
                                newConfig.routing.balancers.push(userConfigCopy.routing.balancers[i]);
                            }
                        }

                        if (userConfigCopy.dns) {
                            if (userConfigCopy.dns.hosts) {
                                for (var key in userConfigCopy.dns.hosts) {
                                    newConfig.dns.hosts[key] = userConfigCopy.dns.hosts[key];
                                }
                            }
                            if (userConfigCopy.dns.servers) {
                                var existingServers = {};
                                for (var i = 0; i < newConfig.dns.servers.length; i++) {
                                    var s = newConfig.dns.servers[i];
                                    var addr = typeof s === 'string' ? s : s.address;
                                    existingServers[addr] = true;
                                }
                                for (var i = 0; i < userConfigCopy.dns.servers.length; i++) {
                                    var server = userConfigCopy.dns.servers[i];
                                    var serverAddress = typeof server === 'string' ? server : server.address;
                                    if (!existingServers[serverAddress]) {
                                        newConfig.dns.servers.push(server);
                                    }
                                }
                            }
                        }

                        if (userConfigCopy.policy) {
                            if (userConfigCopy.policy.levels) {
                                for (var key in userConfigCopy.policy.levels) {
                                    newConfig.policy.levels[key] = userConfigCopy.policy.levels[key];
                                }
                            }
                            if (userConfigCopy.policy.system) {
                                for (var key in userConfigCopy.policy.system) {
                                    newConfig.policy.system[key] = userConfigCopy.policy.system[key];
                                }
                            }
                        }

                        if (userConfigCopy.fakedns) {
                            if (!newConfig.fakedns) newConfig.fakedns = [];
                            for (var i = 0; i < userConfigCopy.fakedns.length; i++) {
                                newConfig.fakedns.push(userConfigCopy.fakedns[i]);
                            }
                        }

                        if (userConfigCopy.observatory) {
                            if (!newConfig.observatory) newConfig.observatory = {};
                            for (var key in userConfigCopy.observatory) {
                                newConfig.observatory[key] = userConfigCopy.observatory[key];
                            }
                        }
                        
                        var finalRemarks;
                        if (useCustomName) {
                            finalRemarks = customName + (routeAllTraffic ? ' (All)' : ' (Custom)');
                        } else {
                            finalRemarks = routeAllTraffic ? 'Anonymous Phantom + X Chain (All)' : 'Anonymous Phantom + X Chain (Custom)';
                        }
                        newConfig.remarks = finalRemarks;
                        return newConfig;
                    }

                    var finalOutput;
                    if (generateDual) {
                        var configAll = createSingleConfig(true);
                        var configCustom = createSingleConfig(false);
                        finalOutput = JSON.stringify([configAll, configCustom], null, 2);
                    } else {
                        var singleConfig = createSingleConfig(routeAll);
                        finalOutput = JSON.stringify(singleConfig, null, 2);
                    }

                    outputJson.setAttribute('data-rawjson', finalOutput);

                    setTimeout(function() {
                        loadingContainer.classList.remove('loading');
                        var loaderElem = loadingContainer.querySelector('.loader-container');
                        if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
                        outputJson.value = finalOutput;
                        updateOutputLineNumbers(finalOutput);
                    }, 1000);

                } catch (error) {
                    setTimeout(function() {
                        loadingContainer.classList.remove('loading');
                        var loaderElem = loadingContainer.querySelector('.loader-container');
                        if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
                        var errorMessage = 'Error processing config: ' + error.message;
                        outputJson.value = errorMessage;
                        updateOutputLineNumbers(errorMessage);
                    }, 1000);
                }
            } else {
                loadingContainer.classList.remove('loading');
                var loaderElem = loadingContainer.querySelector('.loader-container');
                if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
                var errorMessage = 'Error fetching base config: ' + xhr.statusText;
                outputJson.value = errorMessage;
                updateOutputLineNumbers(errorMessage);
            }
        };
        xhr.onerror = function() {
            loadingContainer.classList.remove('loading');
            var loaderElem = loadingContainer.querySelector('.loader-container');
            if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
            var errorMessage = 'Network error while fetching base config';
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
        };
        xhr.send();
    });

    copyButton.addEventListener('click', function() {
        var textToCopy = outputJson.getAttribute('data-rawjson') || outputJson.value;
        if (textToCopy) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(function() {
                    var originalText = copyButton.innerHTML;
                    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(function() {
                        copyButton.innerHTML = originalText;
                    }, 2000);
                }).catch(function() {
                    var textArea = document.createElement('textarea');
                    textArea.value = textToCopy;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-9999px';
                    document.body.appendChild(textArea);
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        var originalText = copyButton.innerHTML;
                        copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        setTimeout(function() {
                            copyButton.innerHTML = originalText;
                        }, 2000);
                    } catch (err) {
                        alert('Failed to copy!');
                    }
                    document.body.removeChild(textArea);
                });
            } else {
                var textArea = document.createElement('textarea');
                textArea.value = textToCopy;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    var originalText = copyButton.innerHTML;
                    copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(function() {
                        copyButton.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    alert('Failed to copy!');
                }
                document.body.removeChild(textArea);
            }
        }
    });

    clearButton.addEventListener('click', function() {
        jsonConfigInput.value = '';
        updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
        setDefaultIPs();
        routeAllCheckbox.checked = false;
        routeAllCheckbox.disabled = false;
        dualConfigToggle.checked = false;
        customNameCheckbox.checked = false;
        customNameInput.value = '';
        customNameInput.disabled = true;
        customNameInputContainer.classList.remove('active');
        outputJson.value = 'Your combined JSON config will appear here...';
        outputJson.setAttribute('data-rawjson', '');
        updateOutputLineNumbers('Your combined JSON config will appear here...');
        configCounter.textContent = '';
        usePublicConfigToggle.checked = false;
        pasteButton.disabled = false;
        jsonConfigInput.disabled = false;
        jsonConfigInput.style.opacity = '1';
        jsonConfigInput.style.cursor = 'text';
    });

    setDefaultIPs();
    updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
    
    setTimeout(function() {
        initParticles();
    }, 500);
});