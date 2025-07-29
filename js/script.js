const uriInput = document.getElementById('uriInput');
const ipInput = document.getElementById('ipInput');
const generateButton = document.getElementById('generateButton');
const outputJson = document.getElementById('outputJson');
const copyButton = document.getElementById('copyButton');
const clearButton = document.getElementById('clearButton');

const phantomConfigUrl = 'https://raw.githubusercontent.com/4n0nymou3/DPI-Phantom/refs/heads/main/phantom.json';

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
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

function parseShadowsocksUri(uri) {
    const url = new URL(uri);
    const b64UserInfo = url.username.replace(/%3D/g, '=');
    const decodedUserInfo = atob(b64UserInfo);
    const [method, password] = decodedUserInfo.split(':');
    return {
        address: url.hostname,
        port: parseInt(url.port, 10),
        method: method,
        password: password
    };
}

function isDomain(str) {
    const domainRegex = new RegExp(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/);
    return domainRegex.test(str);
}

generateButton.addEventListener('click', async () => {
    const uri = uriInput.value.trim();
    if (!uri.startsWith('ss://')) {
        outputJson.textContent = 'Error: Invalid Shadowsocks URI. It must start with "ss://".';
        return;
    }

    const routeItems = ipInput.value.split('\n').map(item => item.trim()).filter(item => item);
    if (routeItems.length === 0) {
        outputJson.textContent = 'Error: The IP/Domain list for forced routing cannot be empty.';
        return;
    }

    let baseConfig;
    try {
        outputJson.textContent = 'Fetching latest Phantom config from GitHub...';
        const response = await fetch(phantomConfigUrl);
        if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
        baseConfig = await response.json();
    } catch (error) {
        outputJson.textContent = `Error fetching base config: ${error.message}\nPlease check your internet connection or the GitHub URL.`;
        return;
    }

    try {
        const ssDetails = parseShadowsocksUri(uri);
        let newConfig = JSON.parse(JSON.stringify(baseConfig));

        const finalRemarks = "&#128125; Anonymous Phantom + X Chain";
        newConfig.remarks = finalRemarks;

        const ssOutbound = {
            tag: 'x-chain-exit',
            protocol: 'shadowsocks',
            settings: { servers: [ssDetails] }
        };

        const originalChainTags = [
            "phantom-tlshello", "ultra-fragment-1", "ultra-fragment-2", "ultra-fragment-3",
            "ultra-fragment-4", "ultra-fragment-5", "ultra-fragment-6", "ultra-fragment-7",
            "ultra-fragment-8", "ultra-fragment-9", "ultra-fragment-10"
        ];
        
        const newChainOutbounds = originalChainTags.map((tag, index) => {
            const originalOutbound = newConfig.outbounds.find(o => o.tag === tag);
            let newOutbound = JSON.parse(JSON.stringify(originalOutbound));
            newOutbound.tag = tag + "-x";

            if (index < originalChainTags.length - 1) {
                newOutbound.streamSettings.sockopt.dialerProxy = originalChainTags[index + 1] + "-x";
            } else {
                newOutbound.streamSettings = { sockopt: { dialerProxy: "x-chain-exit" } };
            }
            return newOutbound;
        });

        const ipList = [];
        const domainList = [];
        routeItems.forEach(item => {
            let cleanedItem = item.trim().replace(/^https?:\/\//, '');
            cleanedItem = cleanedItem.split('/')[0];
            if (isDomain(cleanedItem)) {
                domainList.push(cleanedItem);
            } else {
                ipList.push(item.trim());
            }
        });

        const routingRulesToAdd = [];
        if (domainList.length > 0) {
            routingRulesToAdd.push({
                type: 'field',
                outboundTag: 'phantom-tlshello-x',
                domain: domainList
            });
        }
        if (ipList.length > 0) {
            routingRulesToAdd.push({
                type: 'field',
                outboundTag: 'phantom-tlshello-x',
                ip: ipList
            });
        }
        
        const outboundsToAdd = [ssOutbound, ...newChainOutbounds];
        const dnsOutIndex = newConfig.outbounds.findIndex(o => o.tag === 'dns-out');
        if (dnsOutIndex !== -1) {
            newConfig.outbounds.splice(dnsOutIndex + 1, 0, ...outboundsToAdd);
        } else {
            newConfig.outbounds.push(...outboundsToAdd);
        }

        if (routingRulesToAdd.length > 0) {
            newConfig.routing.rules.unshift(...routingRulesToAdd);
        }
        
        delete newConfig.remarks;
        const restOfConfigJson = JSON.stringify(newConfig, null, 2);
        const highlightedRestOfConfig = syntaxHighlight(restOfConfigJson);
        
        const remarksLineHtml = `  <span class="json-key">"remarks":</span> <span class="json-string">"${finalRemarks}"</span>,`;
        const finalHtml = highlightedRestOfConfig.replace(/^\{/, `{\n${remarksLineHtml}`);

        outputJson.innerHTML = finalHtml;

    } catch (error) {
        outputJson.textContent = `Error processing config: ${error.message}\nPlease check the URI format.`;
    }
});

copyButton.addEventListener('click', () => {
    const textToCopy = outputJson.textContent;
    if (navigator.clipboard && !textToCopy.includes('...')) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => { copyButton.textContent = 'Copy to Clipboard'; }, 2000);
        }).catch(err => {
            alert('Failed to copy!');
        });
    }
});

clearButton.addEventListener('click', () => {
    uriInput.value = '';
    setDefaultIPs();
    outputJson.innerHTML = 'Your combined JSON config will appear here...';
});

document.addEventListener('DOMContentLoaded', setDefaultIPs);