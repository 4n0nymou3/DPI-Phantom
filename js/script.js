const ssUriInput = document.getElementById('ssUriInput');
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

generateButton.addEventListener('click', async () => {
    const uri = ssUriInput.value.trim();
    if (!uri.startsWith('ss://')) {
        outputJson.textContent = 'Error: Invalid Shadowsocks URI. It must start with "ss://".';
        return;
    }

    let baseConfig;
    try {
        outputJson.textContent = 'Fetching latest Phantom config from GitHub...';
        const response = await fetch(phantomConfigUrl);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        baseConfig = await response.json();
    } catch (error) {
        outputJson.textContent = `Error fetching base config: ${error.message}\nPlease check your internet connection or the GitHub URL.`;
        return;
    }

    try {
        const uriBody = uri.substring(5);
        const atIndex = uriBody.indexOf('@');
        if (atIndex === -1) throw new Error('Invalid URI format: Missing "@" symbol.');

        const userInfoB64 = uriBody.substring(0, atIndex);
        const serverInfo = uriBody.substring(atIndex + 1);

        const decodedUserInfo = atob(userInfoB64);
        const colonIndex = decodedUserInfo.indexOf(':');
        if (colonIndex === -1) throw new Error('Invalid user info: Missing ":" in decoded part.');

        const method = decodedUserInfo.substring(0, colonIndex);
        const password = decodedUserInfo.substring(colonIndex + 1);

        let serverPart = serverInfo;
        if(serverInfo.includes('#')){
            serverPart = serverInfo.split('#')[0].trim();
        }
        if(serverInfo.includes('/?')){
           serverPart = serverPart.split('/?')[0].trim();
        }
        
        const lastColonIndex = serverPart.lastIndexOf(':');
        if (lastColonIndex === -1) throw new Error('Invalid server info: Missing port.');
        
        const address = serverPart.substring(0, lastColonIndex);
        const port = parseInt(serverPart.substring(lastColonIndex + 1), 10);
        if (isNaN(port)) throw new Error('Invalid port number.');
        
        const ssOutbound = {
            "tag": "custom-ss-out", "protocol": "shadowsocks", "settings": { "servers": [{ "address": address, "method": method, "password": password, "port": port }] }
        };

        let newConfig = JSON.parse(JSON.stringify(baseConfig));
        
        newConfig.remarks = "👽 Anonymous Phantom + X Chain";

        const finalLink = newConfig.outbounds.find(o => o.tag === 'ultra-fragment-10');
        if (finalLink) {
            finalLink.streamSettings = { "sockopt": { "dialerProxy": "custom-ss-out" } };
        } else {
            throw new Error('Base config is missing the "ultra-fragment-10" outbound.');
        }
        
        const finalLinkIndex = newConfig.outbounds.findIndex(o => o.tag === 'ultra-fragment-10');
        if(finalLinkIndex === -1) throw new Error('Could not find insertion point.');
        
        newConfig.outbounds.splice(finalLinkIndex + 1, 0, ssOutbound);
        
        const formattedJson = JSON.stringify(newConfig, null, 2);
        let highlightedHtml = syntaxHighlight(formattedJson);
        
        highlightedHtml = highlightedHtml.replace(/\\uD83D\\uDC7D/g, '👽');

        outputJson.innerHTML = highlightedHtml;

    } catch (error) {
        outputJson.textContent = 'Error: Could not parse the URI. Please check the format.\n\n' + error.message;
    }
});

copyButton.addEventListener('click', () => {
    const textToCopy = outputJson.textContent;
    if (navigator.clipboard && !textToCopy.includes('...')) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => {
                copyButton.textContent = 'Copy to Clipboard';
            }, 2000);
        }).catch(err => {
            alert('Failed to copy!');
        });
    }
});

clearButton.addEventListener('click', () => {
    ssUriInput.value = '';
    outputJson.innerHTML = 'Your combined JSON config will appear here...';
});