document.addEventListener('DOMContentLoaded', () => {
    const jsonConfigInput = document.getElementById('jsonConfigInput');
    const ipInput = document.getElementById('ipInput');
    const generateButton = document.getElementById('generateButton');
    const outputJson = document.getElementById('outputJson');
    const copyButton = document.getElementById('copyButton');
    const clearButton = document.getElementById('clearButton');
    const routeAllCheckbox = document.getElementById('routeAllCheckbox');

    const phantomConfigUrl = 'https://raw.githubusercontent.com/XTLS/Xray-examples/refs/heads/main/Serverless-for-Iran/serverless_for_Iran.jsonc';

    const defaultForcedRouteIPs = [
        "91.105.192.0/23", "91.108.4.0/22", "91.108.8.0/22", "91.108.12.0/22",
        "91.108.16.0/22", "91.108.20.0/22", "91.108.56.0/23", "91.108.58.0/23",
        "95.161.64.0/20", "149.154.160.0/21", "149.154.168.0/22", "149.154.172.0/22",
        "185.76.151.0/24", "2001:67c:4e8::/48", "2001:b28:f23c::/48", "2001:b28:f23d::/48",
        "2001:b28:f23f::/48", "2a0a:f280:203::/48"
    ];

    function setDefaultIPs() {
        ipInput.value = defaultForcedRouteIPs.join('\n');
    }

    function syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
                cls = /:$/.test(match) ? 'json-key' : 'json-string';
            } else if (/true|false/.test(match)) {
                cls = 'json-boolean';
            } else if (/null/.test(match)) {
                cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
        });
    }

    function isDomain(str) {
        const domainRegex = new RegExp(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/);
        return domainRegex.test(str);
    }
    
    function parseJsonc(jsoncString) {
        const withoutComments = jsoncString.replace(/\/\*[\s\S]*?\*\/|(?<=[^:])\/\/.*|\s\/\/.*|^\/\/.*/g, '');
        return JSON.parse(withoutComments);
    }

    generateButton.addEventListener('click', async () => {
        const jsonInput = jsonConfigInput.value.trim();
        const routeAll = routeAllCheckbox.checked;
        let userConfig;
        outputJson.dataset.rawjson = '';
        outputJson.innerHTML = '<div class="loader"></div>';

        try {
            userConfig = parseJsonc(jsonInput);
        } catch (error) {
            outputJson.innerHTML = 'Error: Input is not a valid JSON or JSONC. Please check the config format.';
            return;
        }

        if (!userConfig.outbounds || !userConfig.routing || !userConfig.routing.balancers) {
            outputJson.innerHTML = 'Error: Input config is incomplete. The `outbounds` and `routing.balancers` sections are required.';
            return;
        }

        const routeItems = ipInput.value.split('\n').map(item => item.trim()).filter(item => item);
        if (routeItems.length === 0 && !routeAll) {
            outputJson.innerHTML = 'Error: The IP/Domain list for forced routing cannot be empty when "Route All Traffic" is unchecked.';
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
            outputJson.innerHTML = `Error fetching base config: ${error.message}\nPlease check your internet connection or the config URL.`;
            return;
        }

        try {
            let newConfig = JSON.parse(JSON.stringify(baseConfig));
            const userConfigCopy = JSON.parse(JSON.stringify(userConfig));
            
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
            const mainBalancerOriginalTag = 'proxy-round';

            const allUserTags = new Set();
            userConfigCopy.outbounds.forEach(o => allUserTags.add(o.tag));
            if (userConfigCopy.routing.balancers) {
                userConfigCopy.routing.balancers.forEach(b => allUserTags.add(b.tag));
            }

            allUserTags.forEach(tag => {
                if (tag) tagMap.set(tag, prefix + tag);
            });

            const userBalancer = userConfigCopy.routing.balancers.find(b => b.tag === mainBalancerOriginalTag);
            if (!userBalancer) {
                 outputJson.innerHTML = `Error: Main load balancer tag '${mainBalancerOriginalTag}' not found in the input config.`;
                return;
            }
            const userProxySelector = userBalancer.selector[0];

            userConfigCopy.outbounds.forEach(o => {
                if (o.tag) o.tag = tagMap.get(o.tag) || o.tag;
                if (o.tag && o.tag.startsWith(prefix + userProxySelector)) {
                    if (!o.streamSettings) o.streamSettings = {};
                    if (!o.streamSettings.sockopt) o.streamSettings.sockopt = {};
                    o.streamSettings.sockopt.dialerProxy = 'chain1-fragment';
                }
            });

            if (userConfigCopy.routing.balancers) {
                userConfigCopy.routing.balancers.forEach(b => {
                    if (b.tag) b.tag = tagMap.get(b.tag) || b.tag;
                    if (b.selector) b.selector = b.selector.map(s => s.startsWith('!') ? '!' + prefix + s.substring(1) : prefix + s);
                });
            }
            
            if (userConfigCopy.observatory && userConfigCopy.observatory.subjectSelector) {
                userConfigCopy.observatory.subjectSelector = userConfigCopy.observatory.subjectSelector.map(s => prefix + s);
            }

            if (routeAll) {
                newConfig.routing.rules.forEach(rule => {
                    const isFinalTcpCatchAll = rule.outboundTag === 'chain1-fragment' && rule.network === 'tcp';
                    const isFinalUdpCatchAll = rule.outboundTag === 'direct' && rule.network === 'udp';
                    
                    if (isFinalTcpCatchAll || isFinalUdpCatchAll) {
                         const isGenericRule = !rule.port && !rule.domain && !rule.ip;
                         if (isGenericRule) {
                            delete rule.outboundTag;
                            rule.balancerTag = tagMap.get(mainBalancerOriginalTag);
                         }
                    }
                });
            } else {
                const rulesToAdd = [];
                const ipList = routeItems.filter(item => !isDomain(item.split('/')[0].trim()));
                const domainList = routeItems.filter(item => isDomain(item.split('/')[0].trim()));

                if(domainList.length > 0) {
                    rulesToAdd.push({
                        type: 'field',
                        balancerTag: tagMap.get(mainBalancerOriginalTag),
                        domain: domainList
                    });
                }
                if(ipList.length > 0) {
                     rulesToAdd.push({
                        type: 'field',
                        balancerTag: tagMap.get(mainBalancerOriginalTag),
                        ip: ipList
                    });
                }

                if (rulesToAdd.length > 0) {
                    const defaultRuleIndex = newConfig.routing.rules.findIndex(
                        r => r.outboundTag === 'chain1-fragment' && !r.port && !r.domain && !r.ip
                    );
                    if (defaultRuleIndex > -1) {
                        newConfig.routing.rules.splice(defaultRuleIndex, 0, ...rulesToAdd);
                    } else {
                        newConfig.routing.rules.unshift(...rulesToAdd);
                    }
                }
            }
            
            newConfig.outbounds.push(...userConfigCopy.outbounds);
            if (userConfigCopy.routing.balancers) {
                newConfig.routing.balancers.push(...userConfigCopy.routing.balancers);
            }
            
            if (userConfigCopy.dns) {
                if (userConfigCopy.dns.hosts) newConfig.dns.hosts = { ...newConfig.dns.hosts, ...userConfigCopy.dns.hosts };
                if (userConfigCopy.dns.servers) {
                    const existingServers = new Set(newConfig.dns.servers.map(s => typeof s === 'string' ? s : s.address));
                    userConfigCopy.dns.servers.forEach(server => {
                        const serverAddress = typeof server === 'string' ? server : server.address;
                        if (!existingServers.has(serverAddress)) newConfig.dns.servers.push(server);
                    });
                }
            }
            
            if (userConfigCopy.policy) {
                if (userConfigCopy.policy.levels) {
                    if (!newConfig.policy.levels) newConfig.policy.levels = {};
                    newConfig.policy.levels = { ...newConfig.policy.levels, ...userConfigCopy.policy.levels };
                }
                if (userConfigCopy.policy.system) {
                    if (!newConfig.policy.system) newConfig.policy.system = {};
                    newConfig.policy.system = { ...newConfig.policy.system, ...userConfigCopy.policy.system };
                }
            }
            
            if (userConfigCopy.fakedns) {
                if (!newConfig.fakedns) newConfig.fakedns = [];
                newConfig.fakedns.push(...userConfigCopy.fakedns);
            }

            if (userConfigCopy.observatory) {
                newConfig.observatory = { ...newConfig.observatory, ...userConfigCopy.observatory };
            }
            
            const finalRemarks = "👽 Anonymous Phantom + X Chain";
            
            delete newConfig.remarks;
            const finalConfigObjectForCopy = { "remarks": finalRemarks, ...newConfig };
            const finalJsonStringToCopy = JSON.stringify(finalConfigObjectForCopy, null, 2);
            outputJson.dataset.rawjson = finalJsonStringToCopy;

            const restOfConfigJson = JSON.stringify(newConfig, null, 2);
            const highlightedRestOfConfig = syntaxHighlight(restOfConfigJson);
            
            const remarksLineHtml = `  <span class="json-key">"remarks":</span> <span class="json-string">"${finalRemarks}"</span>,`;
            const finalHtml = highlightedRestOfConfig.replace(/^\{/, `{\n${remarksLineHtml}`);

            setTimeout(() => {
                outputJson.innerHTML = finalHtml;
            }, 3000);

        } catch (error) {
            setTimeout(() => {
                outputJson.innerHTML = `Error processing config: ${error.message}\nPlease check the input format.`;
            }, 3000);
        }
    });

    copyButton.addEventListener('click', () => {
        const textToCopy = outputJson.dataset.rawjson;
        if (navigator.clipboard && textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => { copyButton.textContent = 'Copy to Clipboard'; }, 2000);
            }).catch(err => {
                alert('Failed to copy!');
            });
        }
    });

    clearButton.addEventListener('click', () => {
        jsonConfigInput.value = '';
        setDefaultIPs();
        routeAllCheckbox.checked = false;
        outputJson.innerHTML = 'Your combined JSON config will appear here...';
        outputJson.dataset.rawjson = '';
    });

    setDefaultIPs();

    particlesJS('particles-js', {
        particles: {
            number: { value: 100, density: { enable: true, value_area: 800 } },
            color: { value: '#ffffff' },
            shape: { type: 'circle', stroke: { width: 0, color: '#000000' }, polygon: { nb_sides: 5 } },
            opacity: { value: 0.5, random: false, anim: { enable: false, speed: 1, opacity_min: 0.1, sync: false } },
            size: { value: 3, random: true, anim: { enable: false, speed: 40, size_min: 0.1, sync: false } },
            line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.4, width: 1 },
            move: { enable: true, speed: 6, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false, attract: { enable: false, rotateX: 600, rotateY: 1200 } }
        },
        interactivity: {
            detect_on: 'canvas',
            events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' }, resize: true },
            modes: { grab: { distance: 400, line_linked: { opacity: 1 } }, bubble: { distance: 400, size: 40, duration: 2, opacity: 8 }, repulse: { distance: 200, duration: 0.4 }, push: { particles_nb: 4 }, remove: { particles_nb: 2 } }
        },
        retina_detect: true
    });
});