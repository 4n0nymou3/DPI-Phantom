document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generateButton');
    const copyButton = document.getElementById('copyButton');
    const clearButton = document.getElementById('clearButton');
    const pasteButton = document.getElementById('pasteButton');
    const routeAllCheckbox = document.getElementById('routeAllCheckbox');
    const configCounter = document.getElementById('configCounter');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    
    const phantomConfigUrl = 'https://raw.githubusercontent.com/4n0nymou3/DPI-Phantom/refs/heads/main/serverless.json';
    const defaultForcedRouteIPs = [
        "91.105.192.0/23", "91.108.4.0/22", "91.108.8.0/22", "91.108.12.0/22",
        "91.108.16.0/22", "91.108.20.0/22", "91.108.56.0/23", "91.108.58.0/23",
        "95.161.64.0/20", "149.154.160.0/21", "149.154.168.0/22", "149.154.172.0/22",
        "185.76.151.0/24", "2001:67c:4e8::/48", "2001:b28:f23c::/48", "2001:b28:f23d::/48",
        "2001:b28:f23f::/48", "2a0a:f280:203::/48"
    ];

    function setDefaultIPs() {
        if (window.ipInputEditor) {
            window.ipInputEditor.setValue(defaultForcedRouteIPs.join('\n'), -1);
        }
    }

    function isDomain(str) {
        const domainRegex = new RegExp(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/);
        return domainRegex.test(str);
    }

    function parseJsonc(jsoncString) {
        const withoutComments = jsoncString.replace(/\/\*[\s\S]*?\*\/|(?<=[^:])\/\/.*|\s\/\/.*|^\/\/.*/g, '');
        return JSON.parse(withoutComments);
    }

    function showLoading(show) {
        if (show) {
            loadingDiv.style.display = 'flex';
            generateButton.disabled = true;
        } else {
            loadingDiv.style.display = 'none';
            generateButton.disabled = false;
        }
    }

    generateButton.addEventListener('click', async () => {
        const jsonInput = window.jsonConfigEditor.getValue().trim();
        const routeAll = routeAllCheckbox.checked;
        let userConfig;
        
        window.outputEditor.setValue('', -1);
        errorDiv.textContent = '';
        showLoading(true);
        configCounter.textContent = '';

        try {
            userConfig = parseJsonc(jsonInput);
        } catch (error) {
            showLoading(false);
            errorDiv.textContent = 'Error: Input is not a valid JSON or JSONC. Please check the config format.';
            return;
        }

        if (!userConfig.outbounds || !userConfig.routing) {
            showLoading(false);
            errorDiv.textContent = 'Error: Input config is incomplete. The `outbounds` and `routing` sections are required.';
            return;
        }

        let configCount = 0;
        const mainBalancerOriginalTag = 'proxy-round';
        const singleProxyOriginalTag = 'proxy';
        const isLoadBalanced = Array.isArray(userConfig.routing.balancers) && userConfig.routing.balancers.length > 0;
        const userBalancer = userConfig.routing.balancers?.find(b => b.tag === mainBalancerOriginalTag);

        if (userBalancer && userBalancer.selector && Array.isArray(userConfig.outbounds)) {
            const selectors = userBalancer.selector.filter(s => !s.startsWith('!'));
            userConfig.outbounds.forEach(outbound => {
                if (outbound.tag && selectors.some(s => outbound.tag.startsWith(s))) configCount++;
            });
        }
        if (configCount === 0 && userConfig.outbounds?.find(o => o.tag === singleProxyOriginalTag)) {
            configCount = 1;
        }
        if (configCount > 0) {
            configCounter.textContent = `(${configCount} config${configCount > 1 ? 's' : ''} detected)`;
        }

        if (isLoadBalanced && !userBalancer) {
            showLoading(false);
            errorDiv.textContent = `Error: Load-balanced config must contain a balancer with the tag "${mainBalancerOriginalTag}".`;
            return;
        } else if (!isLoadBalanced && !userConfig.outbounds.find(o => o.tag === singleProxyOriginalTag)) {
            showLoading(false);
            errorDiv.textContent = `Error: Single config must contain a primary outbound with the tag "${singleProxyOriginalTag}".`;
            return;
        }

        const routeItems = window.ipInputEditor.getValue().split('\n').map(item => item.trim()).filter(item => item);
        if (routeItems.length === 0 && !routeAll) {
            showLoading(false);
            errorDiv.textContent = 'Error: The IP/Domain list cannot be empty when "Route All Traffic" is unchecked.';
            return;
        }

        let baseConfig;
        try {
            const response = await fetch(phantomConfigUrl);
            if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
            const configText = await response.text();
            baseConfig = parseJsonc(configText);
        } catch (error) {
            showLoading(false);
            errorDiv.textContent = `Error fetching base config: ${error.message}`;
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
            if (!newConfig.fakedns) newConfig.fakedns = [];

            const prefix = 'user-';
            const tagMap = new Map();
            const allUserTags = new Set();
            userConfigCopy.outbounds.forEach(o => allUserTags.add(o.tag));
            if (isLoadBalanced) userConfigCopy.routing.balancers.forEach(b => allUserTags.add(b.tag));
            allUserTags.forEach(tag => { if (tag) tagMap.set(tag, prefix + tag); });

            if (isLoadBalanced) {
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
                    if (b.tag) b.tag = tagMap.get(b.tag) || o.tag;
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

            if (userConfigCopy.observatory?.subjectSelector) {
                userConfigCopy.observatory.subjectSelector = userConfigCopy.observatory.subjectSelector.map(s => prefix + s);
            }

            const ruleAction = isLoadBalanced ? { balancerTag: mainExitTag } : { outboundTag: mainExitTag };
            const insertionIndex = newConfig.routing.rules.findIndex(r => r.outboundTag === 'direct-out' && Array.isArray(r.ip) && r.ip.includes('geoip:ir'));
            
            if (routeAll) {
                const rules = [{ type: 'field', network: 'tcp', ...ruleAction }, { type: 'field', network: 'udp', ...ruleAction }];
                newConfig.routing.rules.splice(insertionIndex > -1 ? insertionIndex + 1 : 0, 0, ...rules);
            } else {
                const rulesToAdd = [];
                const ipList = routeItems.filter(item => !isDomain(item.split('/')[0].trim()));
                const domainList = routeItems.filter(item => isDomain(item.split('/')[0].trim()));
                if (domainList.length > 0) rulesToAdd.push({ type: 'field', domain: domainList, ...ruleAction });
                if (ipList.length > 0) rulesToAdd.push({ type: 'field', ip: ipList, ...ruleAction });
                if (rulesToAdd.length > 0) newConfig.routing.rules.splice(insertionIndex > -1 ? insertionIndex + 1 : 0, 0, ...rulesToAdd);
            }

            newConfig.outbounds.push(...userConfigCopy.outbounds);
            if (isLoadBalanced) newConfig.routing.balancers.push(...userConfigCopy.routing.balancers);
            
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
                if (userConfigCopy.policy.levels) newConfig.policy.levels = { ...newConfig.policy.levels, ...userConfigCopy.policy.levels };
                if (userConfigCopy.policy.system) newConfig.policy.system = { ...newConfig.policy.system, ...userConfigCopy.system };
            }

            if (userConfigCopy.fakedns) {
                newConfig.fakedns.push(...userConfigCopy.fakedns);
            }

            if (userConfigCopy.observatory) newConfig.observatory = { ...newConfig.observatory, ...userConfigCopy.observatory };
            
            newConfig.remarks = "👽 Anonymous Phantom + X Chain";
            const finalJsonString = JSON.stringify(newConfig, null, 2);
            window.outputEditor.setValue(finalJsonString, -1);

        } catch (error) {
            errorDiv.textContent = `Error processing config: ${error.message}`;
        } finally {
            showLoading(false);
        }
    });

    copyButton.addEventListener('click', () => {
        const textToCopy = window.outputEditor.getValue();
        if (navigator.clipboard && textToCopy && !textToCopy.startsWith('Your combined')) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyButton.textContent = 'Copied!';
                setTimeout(() => { copyButton.textContent = 'Copy to Clipboard'; }, 2000);
            });
        }
    });

    function clearAll() {
        window.jsonConfigEditor.setValue('', -1);
        window.outputEditor.setValue('Your combined JSON config will appear here...', -1);
        routeAllCheckbox.checked = false;
        errorDiv.textContent = '';
        configCounter.textContent = '';
        setDefaultIPs();
        clearButton.disabled = true;
    }

    clearButton.addEventListener('click', clearAll);

    pasteButton.addEventListener('click', () => {
        navigator.clipboard.readText().then(text => {
            window.jsonConfigEditor.setValue(text, -1);
            onInputChange();
        }).catch(err => {
            alert('Clipboard access denied. Please paste manually.');
        });
    });

    function onInputChange() {
        const hasInput = window.jsonConfigEditor.getValue().trim() !== '' || window.ipInputEditor.getValue().trim() !== defaultForcedRouteIPs.join('\n');
        clearButton.disabled = !hasInput;
    }

    window.addEventListener('load', () => {
        if (window.jsonConfigEditor && window.ipInputEditor) {
            setDefaultIPs();
            window.jsonConfigEditor.on('input', onInputChange);
            window.ipInputEditor.on('input', onInputChange);
        } else {
            console.error("ACE editors could not be initialized.");
        }
    });
});