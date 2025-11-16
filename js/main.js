document.addEventListener('DOMContentLoaded', function() {
    var Config = PhantomChainer.Config;
    var Utils = PhantomChainer.Utils;
    var UI = PhantomChainer.UI;
    var ConfigProcessor = PhantomChainer.ConfigProcessor;

    var elements = {
        jsonConfigInput: document.getElementById('jsonConfigInput'),
        ipInput: document.getElementById('ipInput'),
        generateButton: document.getElementById('generateButton'),
        outputJson: document.getElementById('outputJson'),
        copyButton: document.getElementById('copyButton'),
        clearButton: document.getElementById('clearButton'),
        pasteButton: document.getElementById('pasteButton'),
        routeAllCheckbox: document.getElementById('routeAllCheckbox'),
        dualConfigToggle: document.getElementById('dualConfigToggle'),
        customNameCheckbox: document.getElementById('customNameCheckbox'),
        customNameInput: document.getElementById('customNameInput'),
        customNameInputContainer: document.getElementById('customNameInputContainer'),
        configCounter: document.getElementById('configCounter'),
        usePublicConfigToggle: document.getElementById('usePublicConfigToggle'),
        jsonInputLineNumbers: document.getElementById('jsonInputLineNumbers'),
        ipInputLineNumbers: document.getElementById('ipInputLineNumbers'),
        outputLineNumbers: document.getElementById('outputLineNumbers')
    };

    function setDefaultIPs() {
        elements.ipInput.value = Config.defaultForcedRouteIPs.join('\n');
        UI.updateLineNumbers(elements.ipInput, elements.ipInputLineNumbers);
    }

    elements.usePublicConfigToggle.addEventListener('change', function() {
        if (elements.usePublicConfigToggle.checked) {
            elements.pasteButton.disabled = true;
            elements.jsonConfigInput.disabled = true;
            elements.jsonConfigInput.style.opacity = '0.5';
            elements.jsonConfigInput.style.cursor = 'not-allowed';
            
            Utils.fetchConfig(Config.publicConfigUrl, function(err, config) {
                if (err) {
                    alert('Error loading public config: ' + err.message);
                    elements.usePublicConfigToggle.checked = false;
                    elements.pasteButton.disabled = false;
                    elements.jsonConfigInput.disabled = false;
                    elements.jsonConfigInput.style.opacity = '1';
                    elements.jsonConfigInput.style.cursor = 'text';
                } else {
                    elements.jsonConfigInput.value = JSON.stringify(config, null, 2);
                    UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
                }
            });
        } else {
            elements.pasteButton.disabled = false;
            elements.jsonConfigInput.disabled = false;
            elements.jsonConfigInput.style.opacity = '1';
            elements.jsonConfigInput.style.cursor = 'text';
        }
    });

    elements.dualConfigToggle.addEventListener('change', function() {
        elements.routeAllCheckbox.disabled = elements.dualConfigToggle.checked;
    });

    elements.customNameCheckbox.addEventListener('change', function() {
        if (elements.customNameCheckbox.checked) {
            elements.customNameInput.disabled = false;
            elements.customNameInputContainer.classList.add('active');
        } else {
            elements.customNameInput.disabled = true;
            elements.customNameInputContainer.classList.remove('active');
        }
    });

    elements.jsonConfigInput.addEventListener('input', function() {
        UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
    });

    elements.jsonConfigInput.addEventListener('scroll', function() {
        UI.syncScroll(elements.jsonConfigInput, elements.jsonInputLineNumbers);
    });

    elements.ipInput.addEventListener('input', function() {
        UI.updateLineNumbers(elements.ipInput, elements.ipInputLineNumbers);
    });

    elements.ipInput.addEventListener('scroll', function() {
        UI.syncScroll(elements.ipInput, elements.ipInputLineNumbers);
    });

    elements.outputJson.addEventListener('scroll', function() {
        UI.syncScroll(elements.outputJson, elements.outputLineNumbers);
    });

    elements.pasteButton.addEventListener('click', function() {
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function(clipText) {
                elements.jsonConfigInput.value = clipText;
                UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
            }).catch(function() {
                alert('Failed to paste from clipboard.');
            });
        } else {
            alert('Clipboard not supported. Please paste manually.');
        }
    });

    elements.generateButton.addEventListener('click', function() {
        var jsonInput = elements.jsonConfigInput.value.trim();
        var routeAll = elements.routeAllCheckbox.checked;
        var generateDual = elements.dualConfigToggle.checked;
        var useCustomName = elements.customNameCheckbox.checked;
        var customName = elements.customNameInput.value.trim();
        var userConfig;

        elements.outputJson.value = '';
        UI.showLoading();
        elements.outputLineNumbers.textContent = '1';
        elements.configCounter.textContent = '';

        if (useCustomName && customName === '') {
            UI.hideLoading();
            var errorMessage = 'Error: Please enter a custom config name or uncheck the option.';
            elements.outputJson.value = errorMessage;
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        try {
            userConfig = Utils.parseJsonc(jsonInput);
        } catch (error) {
            try {
                userConfig = JSON.parse(jsonInput);
            } catch (error2) {
                UI.hideLoading();
                var errorMessage = 'Error: Input is not valid JSON. Please check format.';
                elements.outputJson.value = errorMessage;
                UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
                return;
            }
        }

        if (!userConfig.outbounds || !userConfig.routing) {
            UI.hideLoading();
            var errorMessage = 'Error: Config incomplete. Need outbounds and routing sections.';
            elements.outputJson.value = errorMessage;
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        var detectionResult = ConfigProcessor.detectConfigType(userConfig);

        if (detectionResult.configCount > 0) {
            elements.configCounter.textContent = '(' + detectionResult.configCount + ' config' + (detectionResult.configCount > 1 ? 's' : '') + ' detected)';
        }

        var validationError = ConfigProcessor.validateConfig(userConfig, detectionResult);
        if (validationError) {
            UI.hideLoading();
            elements.outputJson.value = validationError;
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        var routeItems = [];
        var lines = elements.ipInput.value.split('\n');
        for (var i = 0; i < lines.length; i++) {
            var item = lines[i].trim();
            if (item) routeItems.push(item);
        }

        if (routeItems.length === 0 && !routeAll && !generateDual) {
            UI.hideLoading();
            var errorMessage = 'Error: IP/Domain list cannot be empty when Route All is unchecked.';
            elements.outputJson.value = errorMessage;
            UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
            return;
        }

        Utils.fetchConfig(Config.phantomConfigUrl, function(err, baseConfig) {
            if (err) {
                UI.hideLoading();
                var errorMessage = 'Error fetching base config: ' + err.message;
                elements.outputJson.value = errorMessage;
                UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
                return;
            }

            try {
                var finalOutput;

                if (generateDual) {
                    var configAll = ConfigProcessor.createCombinedConfig(baseConfig, userConfig, routeItems, {
                        routeAllTraffic: true,
                        useCustomName: useCustomName,
                        customName: customName
                    });
                    var configCustom = ConfigProcessor.createCombinedConfig(baseConfig, userConfig, routeItems, {
                        routeAllTraffic: false,
                        useCustomName: useCustomName,
                        customName: customName
                    });
                    finalOutput = JSON.stringify([configAll, configCustom], null, 2);
                } else {
                    var singleConfig = ConfigProcessor.createCombinedConfig(baseConfig, userConfig, routeItems, {
                        routeAllTraffic: routeAll,
                        useCustomName: useCustomName,
                        customName: customName
                    });
                    finalOutput = JSON.stringify(singleConfig, null, 2);
                }

                elements.outputJson.setAttribute('data-rawjson', finalOutput);

                setTimeout(function() {
                    UI.hideLoading();
                    elements.outputJson.value = finalOutput;
                    UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
                }, 1000);

            } catch (error) {
                setTimeout(function() {
                    UI.hideLoading();
                    var errorMessage = 'Error processing config: ' + error.message;
                    elements.outputJson.value = errorMessage;
                    UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
                }, 1000);
            }
        });
    });

    elements.copyButton.addEventListener('click', function() {
        var textToCopy = elements.outputJson.getAttribute('data-rawjson') || elements.outputJson.value;
        if (textToCopy) {
            Utils.copyToClipboard(textToCopy, elements.copyButton);
        }
    });

    elements.clearButton.addEventListener('click', function() {
        elements.jsonConfigInput.value = '';
        UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
        setDefaultIPs();
        elements.routeAllCheckbox.checked = false;
        elements.routeAllCheckbox.disabled = false;
        elements.dualConfigToggle.checked = false;
        elements.customNameCheckbox.checked = false;
        elements.customNameInput.value = '';
        elements.customNameInput.disabled = true;
        elements.customNameInputContainer.classList.remove('active');
        elements.outputJson.value = 'Your combined JSON config will appear here...';
        elements.outputJson.setAttribute('data-rawjson', '');
        UI.updateLineNumbers(elements.outputJson, elements.outputLineNumbers);
        elements.configCounter.textContent = '';
        elements.usePublicConfigToggle.checked = false;
        elements.pasteButton.disabled = false;
        elements.jsonConfigInput.disabled = false;
        elements.jsonConfigInput.style.opacity = '1';
        elements.jsonConfigInput.style.cursor = 'text';
    });

    setDefaultIPs();
    UI.updateLineNumbers(elements.jsonConfigInput, elements.jsonInputLineNumbers);
    
    setTimeout(function() {
        UI.initParticles();
    }, 500);
});