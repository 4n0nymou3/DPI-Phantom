const uriInput = document.getElementById('uriInput');
const generateButton = document.getElementById('generateButton');
const outputJson = document.getElementById('outputJson');
const copyButton = document.getElementById('copyButton');
const clearButton = document.getElementById('clearButton');

const phantomConfigUrl = 'https://raw.githubusercontent.com/4n0nymou3/DPI-Phantom/refs/heads/main/phantom.json';

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

function parseProxyUri(uri) {
    if (uri.startsWith('vmess://')) {
        const b64 = uri.substring(8);
        const decoded = JSON.parse(atob(b64));
        return {
            tag: 'proxy-out',
            protocol: 'vmess',
            settings: {
                vnext: [{
                    address: decoded.add,
                    port: parseInt(decoded.port, 10),
                    users: [{ id: decoded.id, alterId: decoded.aid, security: decoded.scy || 'auto' }]
                }]
            },
            streamSettings: {
                network: decoded.net,
                security: decoded.tls,
                wsSettings: decoded.net === 'ws' ? { path: decoded.path, headers: { Host: decoded.host } } : undefined,
                httpSettings: decoded.net === 'h2' ? { path: decoded.path, host: [decoded.host] } : undefined,
                tlsSettings: decoded.tls === 'tls' ? { serverName: decoded.sni || decoded.host, alpn: decoded.alpn ? decoded.alpn.split(',') : undefined } : undefined
            }
        };
    }

    const url = new URL(uri.replace(/^hy2:\/\//, 'hysteria2://'));
    const protocol = url.protocol.slice(0, -1);
    const params = url.searchParams;
    let outbound = { tag: 'proxy-out', protocol };

    switch (protocol) {
        case 'vless':
        case 'trojan':
            outbound.settings = {
                vnext: [{
                    address: url.hostname,
                    port: parseInt(url.port, 10),
                    users: [{
                        id: url.username,
                        password: url.username,
                        encryption: params.get('encryption') || (protocol === 'vless' ? 'none' : undefined),
                        flow: params.get('flow')
                    }]
                }]
            };
            outbound.streamSettings = {
                network: params.get('type') || 'tcp',
                security: params.get('security') || 'none',
                tlsSettings: params.get('security') === 'tls' ? { serverName: params.get('sni') || url.hostname, alpn: params.get('alpn') ? params.get('alpn').split(',') : undefined } : undefined,
                wsSettings: params.get('type') === 'ws' ? { path: params.get('path'), headers: { Host: params.get('host') || url.hostname } } : undefined,
                grpcSettings: params.get('type') === 'grpc' ? { serviceName: params.get('serviceName') } : undefined
            };
            if(protocol === 'trojan') delete outbound.settings.vnext[0].users[0].flow;
            if(protocol === 'vless') delete outbound.settings.vnext[0].users[0].password;
            break;

        case 'ss':
            const [method, password] = atob(url.username).split(':');
            outbound.settings = {
                servers: [{
                    address: url.hostname,
                    port: parseInt(url.port, 10),
                    method,
                    password
                }]
            };
            break;

        case 'hysteria2':
            outbound.settings = {
                servers: [{
                    address: url.hostname,
                    port: parseInt(url.port, 10),
                    password: url.username,
                }]
            };
            outbound.streamSettings = {
                network: 'udp',
                security: 'tls',
                tlsSettings: {
                    serverName: params.get('sni') || url.hostname,
                    alpn: ["h3"]
                }
            };
            break;

        default:
            throw new Error(`Unsupported protocol: ${protocol}`);
    }
    return outbound;
}

generateButton.addEventListener('click', async () => {
    const uri = uriInput.value.trim();
    if (!uri) {
        outputJson.textContent = 'Error: Input URI cannot be empty.';
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
        const proxyOutbound = parseProxyUri(uri);
        
        let newConfig = JSON.parse(JSON.stringify(baseConfig));
        newConfig.remarks = "👽 Anonymous Phantom + X Chain";

        const finalLink = newConfig.outbounds.find(o => o.tag === 'ultra-fragment-10');
        if (!finalLink) throw new Error('Base config is missing the "ultra-fragment-10" outbound.');
        finalLink.streamSettings = { sockopt: { dialerProxy: "proxy-out" } };
        
        const finalLinkIndex = newConfig.outbounds.findIndex(o => o.tag === 'ultra-fragment-10');
        if(finalLinkIndex === -1) throw new Error('Could not find insertion point.');
        
        newConfig.outbounds.splice(finalLinkIndex + 1, 0, proxyOutbound);
        
        const formattedJson = JSON.stringify(newConfig, null, 2);
        let highlightedHtml = syntaxHighlight(formattedJson);
        
        highlightedHtml = highlightedHtml.replace(/\\uD83D\\uDC7D/g, '👽');

        outputJson.innerHTML = highlightedHtml;

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
    outputJson.innerHTML = 'Your combined JSON config will appear here...';
});