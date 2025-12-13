var PhantomChainer = PhantomChainer || {};

PhantomChainer.ConfigProcessor = (function() {
    var Utils = PhantomChainer.Utils;
    var Config = PhantomChainer.Config;

    function detectConfigType(userConfig) {
        var isLoadBalanced = Array.isArray(userConfig.routing.balancers) && userConfig.routing.balancers.length > 0;
        var userBalancer = null;
        var configCount = 0;

        if (isLoadBalanced && userConfig.routing.balancers) {
            for (var i = 0; i < userConfig.routing.balancers.length; i++) {
                if (Config.mainBalancerOriginalTags.indexOf(userConfig.routing.balancers[i].tag) !== -1) {
                    userBalancer = userConfig.routing.balancers[i];
                    break;
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
        }

        if (configCount === 0 && userConfig.outbounds) {
            for (var i = 0; i < userConfig.outbounds.length; i++) {
                if (userConfig.outbounds[i].tag === Config.singleProxyOriginalTag) {
                    configCount = 1;
                    break;
                }
            }
        }

        return {
            isLoadBalanced: isLoadBalanced,
            userBalancer: userBalancer,
            configCount: configCount
        };
    }

    function validateConfig(userConfig, detectionResult) {
        if (detectionResult.isLoadBalanced && !detectionResult.userBalancer) {
            return 'Error: Load-balanced config needs balancer tag: ' + Config.mainBalancerOriginalTags.join(', ');
        }

        if (!detectionResult.isLoadBalanced) {
            var foundProxy = false;
            for (var i = 0; i < userConfig.outbounds.length; i++) {
                if (userConfig.outbounds[i].tag === Config.singleProxyOriginalTag) {
                    foundProxy = true;
                    break;
                }
            }
            if (!foundProxy) {
                return 'Error: Single config needs outbound with tag: ' + Config.singleProxyOriginalTag;
            }
        }

        return null;
    }

    function findFragmentOutboundTag(config) {
        if (!config.outbounds || !Array.isArray(config.outbounds)) return null;
        for (var i = 0; i < config.outbounds.length; i++) {
            var o = config.outbounds[i];
            if (o.settings && o.settings.fragment) return o.tag;
            if (o.streamSettings && o.streamSettings.sockopt && o.streamSettings.sockopt.dialerProxy) return o.tag;
        }
        return null;
    }

    function createTagMap(userConfig, isLoadBalanced) {
        var tagMap = {};
        var allUserTags = [];

        for (var i = 0; i < userConfig.outbounds.length; i++) {
            if (userConfig.outbounds[i].tag) {
                allUserTags.push(userConfig.outbounds[i].tag);
            }
        }
        if (isLoadBalanced) {
            for (var i = 0; i < userConfig.routing.balancers.length; i++) {
                if (userConfig.routing.balancers[i].tag) {
                    allUserTags.push(userConfig.routing.balancers[i].tag);
                }
            }
        }

        for (var i = 0; i < allUserTags.length; i++) {
            if (allUserTags[i]) {
                tagMap[allUserTags[i]] = Config.tagPrefix + allUserTags[i];
            }
        }

        return tagMap;
    }

    function applyFragmentToOutbounds(userConfigCopy, tagMap, fragmentTag, isLoadBalanced, userBalancer) {
        if (isLoadBalanced) {
            var userProxySelector = userBalancer.selector[0];
            for (var i = 0; i < userConfigCopy.outbounds.length; i++) {
                var o = userConfigCopy.outbounds[i];
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
            var mainExitTag = tagMap[Config.singleProxyOriginalTag];
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
    }

    function updateBalancerTags(userConfigCopy, tagMap) {
        for (var i = 0; i < userConfigCopy.routing.balancers.length; i++) {
            var b = userConfigCopy.routing.balancers[i];
            if (b.tag) b.tag = tagMap[b.tag] || b.tag;
            if (b.selector) {
                for (var j = 0; j < b.selector.length; j++) {
                    var s = b.selector[j];
                    b.selector[j] = s.charAt(0) === '!' ? '!' + Config.tagPrefix + s.substring(1) : Config.tagPrefix + s;
                }
            }
        }
    }

    function updateObservatory(userConfigCopy) {
        if (userConfigCopy.observatory && userConfigCopy.observatory.subjectSelector) {
            for (var i = 0; i < userConfigCopy.observatory.subjectSelector.length; i++) {
                userConfigCopy.observatory.subjectSelector[i] = Config.tagPrefix + userConfigCopy.observatory.subjectSelector[i];
            }
        }
    }

    function findInsertionIndex(routingRules) {
        for (var i = 0; i < routingRules.length; i++) {
            var rule = routingRules[i];
            if (rule.port === "0-65535" && rule.enabled === true) {
                return i;
            }
        }

        for (var i = 0; i < routingRules.length; i++) {
            var r = routingRules[i];
            if (r.outboundTag === 'direct-out' && Array.isArray(r.ip)) {
                for (var j = 0; j < r.ip.length; j++) {
                    if (r.ip[j] === 'geoip:ir') {
                        return i;
                    }
                }
            }
        }

        for (var i = 0; i < routingRules.length; i++) {
            var rule = routingRules[i];
            if (rule.outboundTag === 'tcp-direct-out' || rule.outboundTag === 'udp-direct-out') {
                if (Array.isArray(rule.ip)) {
                    for (var j = 0; j < rule.ip.length; j++) {
                        if (rule.ip[j] === '0.0.0.0/0' || rule.ip[j] === '::/0') {
                            return i;
                        }
                    }
                }
            }
        }

        return -1;
    }

    function addRoutingRules(newConfig, routeItems, ruleAction, routeAllTraffic) {
        var insertionIndex = findInsertionIndex(newConfig.routing.rules);

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
                if (Utils.isDomain(firstPart)) {
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
    }

    function mergeDNS(newConfig, userConfigCopy) {
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
    }

    function mergePolicy(newConfig, userConfigCopy) {
        if (userConfigCopy.policy) {
            if (!newConfig.policy) {
                newConfig.policy = {};
            }
            if (userConfigCopy.policy.levels) {
                if (!newConfig.policy.levels) {
                    newConfig.policy.levels = {};
                }
                for (var key in userConfigCopy.policy.levels) {
                    newConfig.policy.levels[key] = userConfigCopy.policy.levels[key];
                }
            }
            if (userConfigCopy.policy.system) {
                if (!newConfig.policy.system) {
                    newConfig.policy.system = {};
                }
                for (var key in userConfigCopy.policy.system) {
                    newConfig.policy.system[key] = userConfigCopy.policy.system[key];
                }
            }
        }
    }

    function mergeOther(newConfig, userConfigCopy) {
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
    }

    function createCombinedConfig(baseConfig, userConfig, routeItems, options) {
        var newConfig = JSON.parse(JSON.stringify(baseConfig));
        var userConfigCopy = JSON.parse(JSON.stringify(userConfig));
        var detectionResult = detectConfigType(userConfig);

        if (!newConfig.routing) newConfig.routing = {};
        if (!newConfig.routing.rules) newConfig.routing.rules = [];
        if (!newConfig.routing.balancers) newConfig.routing.balancers = [];
        if (!newConfig.dns) newConfig.dns = {};
        if (!newConfig.dns.hosts) newConfig.dns.hosts = {};
        if (!newConfig.dns.servers) newConfig.dns.servers = [];
        if (!newConfig.outbounds) newConfig.outbounds = [];
        if (!newConfig.policy) newConfig.policy = {};

        var tagMap = createTagMap(userConfigCopy, detectionResult.isLoadBalanced);
        var fragmentTag = findFragmentOutboundTag(newConfig);

        applyFragmentToOutbounds(userConfigCopy, tagMap, fragmentTag, detectionResult.isLoadBalanced, detectionResult.userBalancer);

        if (detectionResult.isLoadBalanced) {
            updateBalancerTags(userConfigCopy, tagMap);
        }

        updateObservatory(userConfigCopy);

        var mainExitTag = detectionResult.isLoadBalanced ? tagMap[detectionResult.userBalancer.tag] : tagMap[Config.singleProxyOriginalTag];
        var ruleAction = detectionResult.isLoadBalanced ? { balancerTag: mainExitTag } : { outboundTag: mainExitTag };

        addRoutingRules(newConfig, routeItems, ruleAction, options.routeAllTraffic);

        for (var i = 0; i < userConfigCopy.outbounds.length; i++) {
            newConfig.outbounds.push(userConfigCopy.outbounds[i]);
        }
        if (detectionResult.isLoadBalanced) {
            for (var i = 0; i < userConfigCopy.routing.balancers.length; i++) {
                newConfig.routing.balancers.push(userConfigCopy.routing.balancers[i]);
            }
        }

        mergeDNS(newConfig, userConfigCopy);
        mergePolicy(newConfig, userConfigCopy);
        mergeOther(newConfig, userConfigCopy);

        var finalRemarks;
        if (options.useCustomName) {
            finalRemarks = options.customName + (options.routeAllTraffic ? ' (All)' : ' (Custom)');
        } else {
            finalRemarks = options.routeAllTraffic ? 'Anonymous Phantom + X Chain (All)' : 'Anonymous Phantom + X Chain (Custom)';
        }
        newConfig.remarks = finalRemarks;

        return newConfig;
    }

    return {
        detectConfigType: detectConfigType,
        validateConfig: validateConfig,
        createCombinedConfig: createCombinedConfig
    };
})();