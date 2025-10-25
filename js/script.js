document.addEventListener('DOMContentLoaded', () => {
    const jsonConfigInput = document.getElementById('jsonConfigInput');
    const ipInput = document.getElementById('ipInput');
    const generateButton = document.getElementById('generateButton');
    const outputJson = document.getElementById('outputJson');
    const copyButton = document.getElementById('copyButton');
    const clearButton = document.getElementById('clearButton');
    const pasteButton = document.getElementById('pasteButton');
    const routeAllCheckbox = document.getElementById('routeAllCheckbox');
    const customNameCheckbox = document.getElementById('customNameCheckbox');
    const customNameInput = document.getElementById('customNameInput');
    const customNameInputContainer = document.getElementById('customNameInputContainer');
    const configCounter = document.getElementById('configCounter');
    
    const jsonInputLineNumbers = document.getElementById('jsonInputLineNumbers');
    const ipInputLineNumbers = document.getElementById('ipInputLineNumbers');
    const outputLineNumbers = document.getElementById('outputLineNumbers');

    const phantomConfigUrl = 'https://raw.githubusercontent.com/4n0nymou3/DPI-Phantom/refs/heads/main/serverless.json';
    const defaultForcedRouteIPs = [
        "91.105.192.0/23", "91.108.4.0/22", "91.108.8.0/22", "91.108.12.0/22",
        "91.108.16.0/22", "91.108.20.0/22", "91.108.56.0/23", "91.108.58.0/23",
        "95.161.64.0/20", "149.154.160.0/21", "149.154.168.0/22", "149.154.172.0/22",
        "185.76.151.0/24", "2001:67c:4e8::/48", "2001:b28:f23c::/48", "2001:b28:f23d::/48",
        "2001:b28:f23f::/48", "2a0a:f280:203::/48"
    ];

    function updateLineNumbers(textarea, lineNumbersDiv) {
        const lines = textarea.value.split('\n');
        const lineCount = lines.length;
        let lineNumbers = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbers += i + '\n';
        }
        lineNumbersDiv.textContent = lineNumbers;
    }

    function updateOutputLineNumbers(text) {
        const lines = text.split('\n');
        const lineCount = lines.length;
        let lineNumbers = '';
        for (let i = 1; i <= lineCount; i++) {
            lineNumbers += i + '\n';
        }
        outputLineNumbers.textContent = lineNumbers;
    }

    function syncScroll(textarea, lineNumbersDiv) {
        lineNumbersDiv.scrollTop = textarea.scrollTop;
    }

    function initParticles() {
        if (typeof particlesJS !== 'undefined') {
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
        }
    }

    function setDefaultIPs() {
        ipInput.value = defaultForcedRouteIPs.join('\n');
        updateLineNumbers(ipInput, ipInputLineNumbers);
    }

    function isDomain(str) {
        const domainRegex = new RegExp(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/);
        return domainRegex.test(str);
    }

    function parseJsonc(jsoncString) {
        const withoutComments = jsoncString.replace(/\/\*[\s\S]*?\*\/|(?<=[^:])\/\/.*|\s\/\/.*|^\/\/.*/g, '');
        return JSON.parse(withoutComments);
    }

    customNameCheckbox.addEventListener('change', () => {
        if (customNameCheckbox.checked) {
            customNameInput.disabled = false;
            customNameInputContainer.classList.add('active');
        } else {
            customNameInput.disabled = true;
            customNameInputContainer.classList.remove('active');
        }
    });

    jsonConfigInput.addEventListener('input', () => {
        updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
    });

    jsonConfigInput.addEventListener('scroll', () => {
        syncScroll(jsonConfigInput, jsonInputLineNumbers);
    });

    ipInput.addEventListener('input', () => {
        updateLineNumbers(ipInput, ipInputLineNumbers);
    });

    ipInput.addEventListener('scroll', () => {
        syncScroll(ipInput, ipInputLineNumbers);
    });

    outputJson.addEventListener('scroll', () => {
        syncScroll(outputJson, outputLineNumbers);
    });

    pasteButton.addEventListener('click', () => {
        if (navigator.clipboard) {
            navigator.clipboard.readText().then(clipText => {
                jsonConfigInput.value = clipText;
                updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
            }).catch(err => {
                alert('Failed to paste from clipboard.');
            });
        }
    });

    generateButton.addEventListener('click', async () => {
        const jsonInput = jsonConfigInput.value.trim();
        const routeAll = routeAllCheckbox.checked;
        const useCustomName = customNameCheckbox.checked;
        const customName = customNameInput.value.trim();
        let userConfig;
        outputJson.value = '';
        const loadingContainer = document.body;
        loadingContainer.classList.add('loading');
        
        let existingLoader = loadingContainer.querySelector('.loader-container');
        if (!existingLoader) {
            const loader = document.createElement('div');
            loader.className = 'loader-container';
            loader.innerHTML = '<div class="spinny-loader"><div class="spinny-circle"></div></div>';
            loadingContainer.appendChild(loader);
        }
        outputLineNumbers.textContent = '1';
        configCounter.textContent = '';

        if (useCustomName && customName === '') {
            loadingContainer.classList.remove('loading');
            loadingContainer.querySelector('.loader-container')?.remove();
            const errorMessage = 'Error: Please enter a custom config name or uncheck the "Use Custom Config Name" option.';
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        try {
            userConfig = parseJsonc(jsonInput);
        } catch (error) {
            loadingContainer.classList.remove('loading');
            loadingContainer.querySelector('.loader-container')?.remove();
            const errorMessage = 'Error: Input is not a valid JSON or JSONC. Please check the config format.';
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        if (!userConfig.outbounds || !userConfig.routing) {
            loadingContainer.classList.remove('loading');
            loadingContainer.querySelector('.loader-container')?.remove();
            const errorMessage = 'Error: Input config is incomplete. The `outbounds` and `routing` sections are required.';
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        let configCount = 0;
        const singleProxyOriginalTag = 'proxy';
        const mainBalancerOriginalTags = ['proxy-round', 'all'];
        const isLoadBalanced = Array.isArray(userConfig.routing.balancers) && userConfig.routing.balancers.length > 0;
        
        let userBalancer = null;
        if (isLoadBalanced) {
            userBalancer = userConfig.routing.balancers?.find(b => mainBalancerOriginalTags.includes(b.tag));
        }

        if (userBalancer && userBalancer.selector && Array.isArray(userConfig.outbounds)) {
            const selectors = userBalancer.selector.filter(s => !s.startsWith('!'));
            userConfig.outbounds.forEach(outbound => {
                if (outbound.tag && selectors.some(s => outbound.tag.startsWith(s))) {
                    configCount++;
                }
            });
        }
        
        if (configCount === 0) {
            const singleProxy = userConfig.outbounds?.find(o => o.tag === singleProxyOriginalTag);
            if (singleProxy) {
                configCount = 1;
            }
        }

        if (configCount > 0) {
            configCounter.textContent = `(${configCount} config${configCount > 1 ? 's' : ''} detected)`;
        }

        if (isLoadBalanced) {
            if (!userBalancer) {
                loadingContainer.classList.remove('loading');
                loadingContainer.querySelector('.loader-container')?.remove();
                const errorMessage = `Error: Load-balanced config must contain a balancer with one of the following tags: "${mainBalancerOriginalTags.join(', ')}".`;
                outputJson.value = errorMessage;
                updateOutputLineNumbers(errorMessage);
                return;
            }
        } else {
            const singleProxy = userConfig.outbounds.find(o => o.tag === singleProxyOriginalTag);
            if (!singleProxy) {
                loadingContainer.classList.remove('loading');
                loadingContainer.querySelector('.loader-container')?.remove();
                const errorMessage = `Error: Single config must contain a primary outbound with the tag "${singleProxyOriginalTag}".`;
                outputJson.value = errorMessage;
                updateOutputLineNumbers(errorMessage);
                return;
            }
        }

        const routeItems = ipInput.value.split('\n').map(item => item.trim()).filter(item => item);
        if (routeItems.length === 0 && !routeAll) {
            loadingContainer.classList.remove('loading');
            loadingContainer.querySelector('.loader-container')?.remove();
            const errorMessage = 'Error: The IP/Domain list cannot be empty when "Route All Traffic" is unchecked.';
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        let baseConfig;
        try {
            const response = await fetch(phantomConfigUrl);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const configText = await response.text();
            try {
                baseConfig = JSON.parse(configText);
            } catch (jsonError) {
                try {
                    baseConfig = parseJsonc(configText);
                } catch (jsoncError) {
                    throw new Error('Failed to parse the fetched config as JSON or JSONC.');
                }
            }
        } catch (error) {
            loadingContainer.classList.remove('loading');
            loadingContainer.querySelector('.loader-container')?.remove();
            const errorMessage = `Error fetching base config: ${error.message}\nPlease check your internet connection or the config URL.`;
            outputJson.value = errorMessage;
            updateOutputLineNumbers(errorMessage);
            return;
        }

        try {
            let newConfig = JSON.parse(JSON.stringify(baseConfig));
            const userConfigCopy = JSON.parse(JSON.stringify(userConfig));
            let mainExitTag = '';

            if (!newConfig.routing) newConfig.routing = {};
            if (!newConfig.routing.rules) newConfig.routing.rules = [];
            if (!newConfig.routing.balancers) newConfig.routing.balancers = [];
            if (!newConfig.dns) newConfig.dns = {};
            if (!newConfig.dns.hosts) newConfig.dns.hosts = {};
            if (!newConfig.dns.servers) newConfig.dns.servers = [];
            if (!newConfig.outbounds) newConfig.outbounds = [];
            if (!newConfig.policy) newConfig.policy = {};

            const prefix = 'user-';
            const tagMap = new Map();

            const allUserTags = new Set();
            userConfigCopy.outbounds.forEach(o => allUserTags.add(o.tag));
            if (isLoadBalanced) {
                userConfigCopy.routing.balancers.forEach(b => allUserTags.add(b.tag));
            }

            allUserTags.forEach(tag => {
                if (tag) tagMap.set(tag, prefix + tag);
            });

            if (isLoadBalanced) {
                const mainBalancerOriginalTag = userBalancer.tag;
                const userProxySelector = userBalancer.selector[0];
                mainExitTag = tagMap.get(mainBalancerOriginalTag);

                userConfigCopy.outbounds.forEach(o => {
                    if (o.tag) o.tag = tagMap.get(o.tag) || o.tag;
                    if (o.tag && o.tag.startsWith(prefix + userProxySelector)) {
                        if (!o.streamSettings) o.streamSettings = {};
                        if (!o.streamSettings.sockopt) o.streamSettings.sockopt = {};
                        o.streamSettings.sockopt.dialerProxy = 'full-fragment';
                    }
                });
                userConfigCopy.routing.balancers.forEach(b => {
                    if (b.tag) b.tag = tagMap.get(b.tag) || b.tag;
                    if (b.selector) b.selector = b.selector.map(s => s.startsWith('!') ? '!' + prefix + s.substring(1) : prefix + s);
                });
            } else {
                mainExitTag = tagMap.get(singleProxyOriginalTag);
                userConfigCopy.outbounds.forEach(o => {
                    if (o.tag) o.tag = tagMap.get(o.tag) || o.tag;
                    if (o.tag === mainExitTag) {
                        if (!o.streamSettings) o.streamSettings = {};
                        if (!o.streamSettings.sockopt) o.streamSettings.sockopt = {};
                        o.streamSettings.sockopt.dialerProxy = 'full-fragment';
                    }
                });
            }

            if (userConfigCopy.observatory && userConfigCopy.observatory.subjectSelector) {
                userConfigCopy.observatory.subjectSelector = userConfigCopy.observatory.subjectSelector.map(s => prefix + s);
            }

            const ruleAction = isLoadBalanced ? { balancerTag: mainExitTag } : { outboundTag: mainExitTag };
            const insertionIndex = newConfig.routing.rules.findIndex(r =>
                r.outboundTag === 'direct-out' && Array.isArray(r.ip) && r.ip.includes('geoip:ir')
            );

            if (routeAll) {
                const tcpCatchAll = { type: 'field', network: 'tcp', ...ruleAction };
                const udpCatchAll = { type: 'field', network: 'udp', ...ruleAction };
                if (insertionIndex > -1) {
                    newConfig.routing.rules.splice(insertionIndex + 1, 0, tcpCatchAll, udpCatchAll);
                } else {
                    newConfig.routing.rules.push(tcpCatchAll, udpCatchAll);
                }
            } else {
                const rulesToAdd = [];
                const ipList = routeItems.filter(item => !isDomain(item.split('/')[0].trim()));
                const domainList = routeItems.filter(item => isDomain(item.split('/')[0].trim()));

                if (domainList.length > 0) rulesToAdd.push({ type: 'field', domain: domainList, ...ruleAction });
                if (ipList.length > 0) rulesToAdd.push({ type: 'field', ip: ipList, ...ruleAction });

                if (rulesToAdd.length > 0) {
                    if (insertionIndex > -1) {
                         newConfig.routing.rules.splice(insertionIndex + 1, 0, ...rulesToAdd);
                    } else {
                        const lastDirectRuleIndex = newConfig.routing.rules.map(r => r.outboundTag).lastIndexOf('direct-out');
                        newConfig.routing.rules.splice(lastDirectRuleIndex > -1 ? lastDirectRuleIndex + 1 : 0, 0, ...rulesToAdd);
                    }
                }
            }

            newConfig.outbounds.push(...userConfigCopy.outbounds);
            if (isLoadBalanced) {
                newConfig.routing.balancers.push(...userConfigCopy.routing.balancers);
            }

            if (userConfigCopy.dns) {
                if (userConfigCopy.dns.hosts) newConfig.dns.hosts = { ...newConfig.dns.hosts,
                    ...userConfigCopy.dns.hosts
                };
                if (userConfigCopy.dns.servers) {
                    const existingServers = new Set(newConfig.dns.servers.map(s => typeof s === 'string' ? s : s.address));
                    userConfigCopy.dns.servers.forEach(server => {
                        const serverAddress = typeof server === 'string' ? server : server.address;
                        if (!existingServers.has(serverAddress)) newConfig.dns.servers.push(server);
                    });
                }
            }

            if (userConfigCopy.policy) {
                if (userConfigCopy.policy.levels) newConfig.policy.levels = { ...newConfig.policy.levels,
                    ...userConfigCopy.policy.levels
                };
                if (userConfigCopy.policy.system) newConfig.policy.system = { ...newConfig.policy.system,
                    ...userConfigCopy.policy.system
                };
            }

            if (userConfigCopy.fakedns) {
                if (!newConfig.fakedns) newConfig.fakedns = [];
                newConfig.fakedns.push(...userConfigCopy.fakedns);
            }

            if (userConfigCopy.observatory) {
                newConfig.observatory = { ...newConfig.observatory,
                    ...userConfigCopy.observatory
                };
            }
            
            let finalRemarks;
            if (useCustomName) {
                finalRemarks = customName;
            } else {
                finalRemarks = routeAll ? 'Anonymous Phantom + X Chain (All)' : 'Anonymous Phantom + X Chain (Custom)';
            }
            
            if (newConfig.remarks) {
                newConfig.remarks = finalRemarks;
            }

            const finalConfigObjectForCopy = { ...newConfig };
             if (!newConfig.remarks) {
                finalConfigObjectForCopy.remarks = finalRemarks;
                const { remarks, ...rest } = finalConfigObjectForCopy;
                const reorderedObject = { remarks, ...rest };
                const finalJsonStringToCopy = JSON.stringify(reorderedObject, null, 2);
                outputJson.dataset.rawjson = finalJsonStringToCopy;
             } else {
                const finalJsonStringToCopy = JSON.stringify(finalConfigObjectForCopy, null, 2);
                outputJson.dataset.rawjson = finalJsonStringToCopy;
             }

            setTimeout(() => {
                loadingContainer.classList.remove('loading');
                loadingContainer.querySelector('.loader-container')?.remove();
                outputJson.value = outputJson.dataset.rawjson;
                updateOutputLineNumbers(outputJson.dataset.rawjson);
            }, 1000);

        } catch (error) {
            setTimeout(() => {
                loadingContainer.classList.remove('loading');
                loadingContainer.querySelector('.loader-container')?.remove();
                const errorMessage = `Error processing config: ${error.message}\nPlease check the input format.`;
                outputJson.value = errorMessage;
                updateOutputLineNumbers(errorMessage);
            }, 1000);
        }
    });

    copyButton.addEventListener('click', () => {
        const textToCopy = outputJson.dataset.rawjson || outputJson.value;
        if (navigator.clipboard && textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = copyButton.innerHTML;
                copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyButton.innerHTML = originalText;
                }, 2000);
            }).catch(err => {
                alert('Failed to copy!');
            });
        }
    });

    clearButton.addEventListener('click', () => {
        jsonConfigInput.value = '';
        updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
        setDefaultIPs();
        routeAllCheckbox.checked = false;
        customNameCheckbox.checked = false;
        customNameInput.value = '';
        customNameInput.disabled = true;
        customNameInputContainer.classList.remove('active');
        outputJson.value = 'Your combined JSON config will appear here...';
        outputJson.dataset.rawjson = '';
        updateOutputLineNumbers('Your combined JSON config will appear here...');
        configCounter.textContent = '';
    });

    setDefaultIPs();
    updateLineNumbers(jsonConfigInput, jsonInputLineNumbers);
    
    setTimeout(() => {
        initParticles();
    }, 500);
});