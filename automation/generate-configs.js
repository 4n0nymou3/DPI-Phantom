import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const Config = {
    publicConfigUrl: 'https://raw.githubusercontent.com/4n0nymou3/multi-proxy-config-fetcher/refs/heads/main/configs/xray_secure_loadbalanced_config.json',
    advancedServerlessUrl: 'https://raw.githubusercontent.com/4n0nymou3/DPI-Phantom/refs/heads/main/serverless2.json',
    defaultForcedRouteIPs: [
        "91.105.192.0/23",
        "91.108.4.0/22",
        "91.108.8.0/22",
        "91.108.12.0/22",
        "91.108.16.0/22",
        "91.108.20.0/22",
        "91.108.56.0/22",
        "95.161.64.0/20",
        "149.154.160.0/20",
        "185.76.151.0/24",
        "2001:67c:4e8::/48",
        "2001:b28:f23c::/48",
        "2001:b28:f23d::/48",
        "2001:b28:f23f::/48",
        "2a0a:f280::/32"
    ],
    singleProxyOriginalTag: 'proxy',
    mainBalancerOriginalTags: ['proxy-round', 'all', 'all-proxies'],
    tagPrefix: 'user-'
};

const Utils = {
    isDomain: function(str) {
        const domainRegex = /^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/;
        return domainRegex.test(str);
    },
    isValidRouteItem: function(str) {
        const firstPart = str.split('/')[0].trim();
        if (str.indexOf('geoip:') === 0 || str.indexOf('geosite:') === 0) return true;
        if (str.indexOf('ext:') === 0 || str.indexOf('ext-ip:') === 0 || str.indexOf('ext-domain:') === 0) return true;
        if (str.indexOf('domain:') === 0 || str.indexOf('full:') === 0 || str.indexOf('regexp:') === 0 || str.indexOf('keyword:') === 0) return true;
        if (this.isDomain(firstPart)) return true;
        return false;
    }
};

const ConfigProcessor = {
    detectConfigType: function(userConfig) {
        const isLoadBalanced = Array.isArray(userConfig.routing.balancers) && userConfig.routing.balancers.length > 0;
        let userBalancer = null;
        let configCount = 0;

        if (isLoadBalanced && userConfig.routing.balancers) {
            for (let i = 0; i < userConfig.routing.balancers.length; i++) {
                if (Config.mainBalancerOriginalTags.indexOf(userConfig.routing.balancers[i].tag) !== -1) {
                    userBalancer = userConfig.routing.balancers[i];
                    break;
                }
            }

            if (userBalancer && userBalancer.selector && Array.isArray(userConfig.outbounds)) {
                const selectors = [];
                for (let i = 0; i < userBalancer.selector.length; i++) {
                    if (userBalancer.selector[i].charAt(0) !== '!') {
                        selectors.push(userBalancer.selector[i]);
                    }
                }
                for (let i = 0; i < userConfig.outbounds.length; i++) {
                    const outbound = userConfig.outbounds[i];
                    if (outbound.tag) {
                        for (let j = 0; j < selectors.length; j++) {
                            if (outbound.tag.indexOf(selectors[j]) === 0) {
                                configCount++;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (configCount === 0 && userConfig.outbounds) {
            for (let i = 0; i < userConfig.outbounds.length; i++) {
                if (userConfig.outbounds[i].tag === Config.singleProxyOriginalTag) {
                    configCount = 1;
                    break;
                }
            }
        }

        return { isLoadBalanced, userBalancer, configCount };
    },

    findFragmentOutboundTag: function(config) {
        if (!config.outbounds || !Array.isArray(config.outbounds)) return null;
        for (let i = 0; i < config.outbounds.length; i++) {
            const o = config.outbounds[i];
            if (o.settings && o.settings.fragment) return o.tag;
            if (o.streamSettings && o.streamSettings.sockopt && o.streamSettings.sockopt.dialerProxy) return o.tag;
        }
        return null;
    },

    createTagMap: function(userConfig, isLoadBalanced) {
        const tagMap = {};
        const allUserTags = [];

        for (let i = 0; i < userConfig.outbounds.length; i++) {
            if (userConfig.outbounds[i].tag) {
                allUserTags.push(userConfig.outbounds[i].tag);
            }
        }
        if (isLoadBalanced) {
            for (let i = 0; i < userConfig.routing.balancers.length; i++) {
                if (userConfig.routing.balancers[i].tag) {
                    allUserTags.push(userConfig.routing.balancers[i].tag);
                }
            }
        }

        for (let i = 0; i < allUserTags.length; i++) {
            if (allUserTags[i]) {
                tagMap[allUserTags[i]] = Config.tagPrefix + allUserTags[i];
            }
        }

        return tagMap;
    },

    applyFragmentToOutbounds: function(userConfigCopy, tagMap, fragmentTag, isLoadBalanced, userBalancer) {
        if (isLoadBalanced) {
            const userProxySelector = userBalancer.selector[0];
            for (let i = 0; i < userConfigCopy.outbounds.length; i++) {
                const o = userConfigCopy.outbounds[i];
                if (o.tag) {
                    o.tag = tagMap[o.tag] || o.tag;
                    if (o.tag.indexOf(Config.tagPrefix + userProxySelector) === 0 && fragmentTag) {
                        if (!o.streamSettings) o.streamSettings = {};
                        if (!o.streamSettings.sockopt) o.streamSettings.sockopt = {};
                        o.streamSettings.sockopt.dialerProxy = fragmentTag;
                    }
                }
            }
        } else {
            const mainExitTag = tagMap[Config.singleProxyOriginalTag];
            for (let i = 0; i < userConfigCopy.outbounds.length; i++) {
                const o = userConfigCopy.outbounds[i];
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
    },

    updateBalancerTags: function(userConfigCopy, tagMap) {
        for (let i = 0; i < userConfigCopy.routing.balancers.length; i++) {
            const b = userConfigCopy.routing.balancers[i];
            if (b.tag) b.tag = tagMap[b.tag] || b.tag;
            if (b.selector) {
                for (let j = 0; j < b.selector.length; j++) {
                    const s = b.selector[j];
                    b.selector[j] = s.charAt(0) === '!' ? '!' + Config.tagPrefix + s.substring(1) : Config.tagPrefix + s;
                }
            }
        }
    },

    updateObservatory: function(userConfigCopy) {
        if (userConfigCopy.observatory && userConfigCopy.observatory.subjectSelector) {
            for (let i = 0; i < userConfigCopy.observatory.subjectSelector.length; i++) {
                userConfigCopy.observatory.subjectSelector[i] = Config.tagPrefix + userConfigCopy.observatory.subjectSelector[i];
            }
        }
    },

    findInsertionIndex: function(routingRules) {
        // Priority 1: Insert before geoip:ir rules (domestic traffic)
        for (let i = 0; i < routingRules.length; i++) {
            const rule = routingRules[i];
            if (rule.outboundTag === 'block-out') continue;
            
            if (Array.isArray(rule.ip)) {
                for (let j = 0; j < rule.ip.length; j++) {
                    if (rule.ip[j] === 'geoip:ir') {
                        return i;
                    }
                }
            }
        }

        // Priority 2: Insert before any catch-all IP rule (0.0.0.0/0 or ::/0) regardless of tag
        for (let i = 0; i < routingRules.length; i++) {
            const rule = routingRules[i];
            if (rule.outboundTag === 'block-out') continue;

            if (Array.isArray(rule.ip)) {
                for (let j = 0; j < rule.ip.length; j++) {
                    if (rule.ip[j] === '0.0.0.0/0' || rule.ip[j] === '::/0') {
                        return i;
                    }
                }
            }
        }

        // Priority 3: Insert before port catch-all
        for (let i = 0; i < routingRules.length; i++) {
            const rule = routingRules[i];
            if (rule.outboundTag === 'block-out') continue;
            if (rule.port === "0-65535") {
                return i;
            }
        }

        return -1;
    },

    addRoutingRules: function(newConfig, routeItems, ruleAction, routeAllTraffic) {
        const insertionIndex = this.findInsertionIndex(newConfig.routing.rules);
        if (routeAllTraffic) {
            const tcpCatchAll = { type: 'field', network: 'tcp' };
            const udpCatchAll = { type: 'field', network: 'udp' };
            for (const key in ruleAction) {
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
            const rulesToAdd = [];
            const ipList = [];
            const domainList = [];

            for (let i = 0; i < routeItems.length; i++) {
                const item = routeItems[i];
                const firstPart = item.split('/')[0].trim();
                if (Utils.isDomain(firstPart)) {
                    domainList.push(item);
                } else {
                    ipList.push(item);
                }
            }

            if (domainList.length > 0) {
                const domainRule = { type: 'field', domain: domainList };
                for (const key in ruleAction) domainRule[key] = ruleAction[key];
                rulesToAdd.push(domainRule);
            }
            if (ipList.length > 0) {
                const ipRule = { type: 'field', ip: ipList };
                for (const key in ruleAction) ipRule[key] = ruleAction[key];
                rulesToAdd.push(ipRule);
            }

            if (rulesToAdd.length > 0) {
                if (insertionIndex > -1) {
                    for (let i = rulesToAdd.length - 1; i >= 0; i--) {
                        newConfig.routing.rules.splice(insertionIndex, 0, rulesToAdd[i]);
                    }
                } else {
                    // Fallback logic if no index found, try to find the last direct rule or append
                    let lastDirectRuleIndex = -1;
                    for (let i = newConfig.routing.rules.length - 1; i >= 0; i--) {
                        const r = newConfig.routing.rules[i];
                        if (r.outboundTag && (r.outboundTag.indexOf('direct') !== -1 || r.outboundTag === 'full-fragment')) {
                            lastDirectRuleIndex = i;
                            break;
                        }
                    }
                    const spliceIndex = lastDirectRuleIndex > -1 ? lastDirectRuleIndex + 1 : 0;
                    for (let i = 0; i < rulesToAdd.length; i++) {
                        newConfig.routing.rules.splice(spliceIndex + i, 0, rulesToAdd[i]);
                    }
                }
            }
        }
    },

    mergeDNS: function(newConfig, userConfigCopy) {
        if (userConfigCopy.dns) {
            if (userConfigCopy.dns.hosts) {
                for (const key in userConfigCopy.dns.hosts) {
                    newConfig.dns.hosts[key] = userConfigCopy.dns.hosts[key];
                }
            }
            if (userConfigCopy.dns.servers) {
                const existingServers = {};
                for (let i = 0; i < newConfig.dns.servers.length; i++) {
                    const s = newConfig.dns.servers[i];
                    const addr = typeof s === 'string' ? s : s.address;
                    existingServers[addr] = true;
                }
                for (let i = 0; i < userConfigCopy.dns.servers.length; i++) {
                    const server = userConfigCopy.dns.servers[i];
                    const serverAddress = typeof server === 'string' ? server : server.address;
                    if (!existingServers[serverAddress]) {
                        newConfig.dns.servers.push(server);
                    }
                }
            }
        }
    },

    mergePolicy: function(newConfig, userConfigCopy) {
        if (userConfigCopy.policy) {
            if (!newConfig.policy) {
                newConfig.policy = {};
            }
            if (userConfigCopy.policy.levels) {
                if (!newConfig.policy.levels) {
                    newConfig.policy.levels = {};
                }
                for (const key in userConfigCopy.policy.levels) {
                    newConfig.policy.levels[key] = userConfigCopy.policy.levels[key];
                }
            }
            if (userConfigCopy.policy.system) {
                if (!newConfig.policy.system) {
                    newConfig.policy.system = {};
                }
                for (const key in userConfigCopy.policy.system) {
                    newConfig.policy.system[key] = userConfigCopy.policy.system[key];
                }
            }
        }
    },

    mergeOther: function(newConfig, userConfigCopy) {
        if (userConfigCopy.fakedns) {
            if (!newConfig.fakedns) newConfig.fakedns = [];
            for (let i = 0; i < userConfigCopy.fakedns.length; i++) {
                newConfig.fakedns.push(userConfigCopy.fakedns[i]);
            }
        }

        if (userConfigCopy.observatory) {
            if (!newConfig.observatory) newConfig.observatory = {};
            for (const key in userConfigCopy.observatory) {
                newConfig.observatory[key] = userConfigCopy.observatory[key];
            }
        }
    },

    createCombinedConfig: function(baseConfig, userConfig, routeItems, options) {
        const newConfig = JSON.parse(JSON.stringify(baseConfig));
        const userConfigCopy = JSON.parse(JSON.stringify(userConfig));
        const detectionResult = this.detectConfigType(userConfig);

        if (!newConfig.routing) newConfig.routing = {};
        if (!newConfig.routing.rules) newConfig.routing.rules = [];
        if (!newConfig.routing.balancers) newConfig.routing.balancers = [];
        if (!newConfig.dns) newConfig.dns = {};
        if (!newConfig.dns.hosts) newConfig.dns.hosts = {};
        if (!newConfig.dns.servers) newConfig.dns.servers = [];
        if (!newConfig.outbounds) newConfig.outbounds = [];
        if (!newConfig.policy) newConfig.policy = {};

        const tagMap = this.createTagMap(userConfigCopy, detectionResult.isLoadBalanced);
        const fragmentTag = this.findFragmentOutboundTag(newConfig);
        this.applyFragmentToOutbounds(userConfigCopy, tagMap, fragmentTag, detectionResult.isLoadBalanced, detectionResult.userBalancer);

        if (detectionResult.isLoadBalanced) {
            this.updateBalancerTags(userConfigCopy, tagMap);
        }

        this.updateObservatory(userConfigCopy);

        const mainExitTag = detectionResult.isLoadBalanced ? tagMap[detectionResult.userBalancer.tag] : tagMap[Config.singleProxyOriginalTag];
        const ruleAction = detectionResult.isLoadBalanced ? { balancerTag: mainExitTag } : { outboundTag: mainExitTag };

        this.addRoutingRules(newConfig, routeItems, ruleAction, options.routeAllTraffic);
        for (let i = 0; i < userConfigCopy.outbounds.length; i++) {
            newConfig.outbounds.push(userConfigCopy.outbounds[i]);
        }
        if (detectionResult.isLoadBalanced) {
            for (let i = 0; i < userConfigCopy.routing.balancers.length; i++) {
                newConfig.routing.balancers.push(userConfigCopy.routing.balancers[i]);
            }
        }

        this.mergeDNS(newConfig, userConfigCopy);
        this.mergePolicy(newConfig, userConfigCopy);
        this.mergeOther(newConfig, userConfigCopy);

        const finalRemarks = options.routeAllTraffic ? 'Anonymous Phantom + X Chain (All)' : 'Anonymous Phantom + X Chain (Custom)';
        newConfig.remarks = finalRemarks;

        return newConfig;
    }
};

async function fetchConfig(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return await response.json();
}

async function main() {
    try {
        console.log('Starting automatic config generation...');
        console.log('Fetching public config...');
        const userConfig = await fetchConfig(Config.publicConfigUrl);
        
        console.log('Fetching advanced serverless config...');
        const baseConfig = await fetchConfig(Config.advancedServerlessUrl);
        const routeItems = Config.defaultForcedRouteIPs;
        
        console.log('Generating All config...');
        const configAll = ConfigProcessor.createCombinedConfig(baseConfig, userConfig, routeItems, {
            routeAllTraffic: true,
            useCustomName: false,
            customName: '',
            customDohUrl: null
        });
        console.log('Generating Custom config...');
        const configCustom = ConfigProcessor.createCombinedConfig(baseConfig, userConfig, routeItems, {
            routeAllTraffic: false,
            useCustomName: false,
            customName: '',
            customDohUrl: null
        });
        const dualConfigs = [configAll, configCustom];
        
        const configDir = path.join(__dirname, '..', 'config');
        if (!fs.existsSync(configDir)) {
            console.log('Creating config directory...');
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        const configPath = path.join(configDir, 'Anonymous.json');
        console.log('Writing Anonymous.json...');
        fs.writeFileSync(configPath, JSON.stringify(dualConfigs, null, 2));
        
        console.log('Config generation completed successfully!');
        console.log(`- ${configPath}`);
    } catch (error) {
        console.error('Error during config generation:', error.message);
        process.exit(1);
    }
}

main();