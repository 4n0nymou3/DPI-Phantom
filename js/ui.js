var PhantomChainer = PhantomChainer || {};

PhantomChainer.UI = (function() {
    function updateLineNumbers(textarea, lineNumbersDiv) {
        var lines = textarea.value.split('\n');
        var lineCount = lines.length;
        var lineNumbers = '';
        for (var i = 1; i <= lineCount; i++) {
            lineNumbers += i + '\n';
        }
        lineNumbersDiv.textContent = lineNumbers;
    }

    function syncScroll(textarea, lineNumbersDiv) {
        lineNumbersDiv.scrollTop = textarea.scrollTop;
    }

    function showLoading() {
        document.body.classList.add('loading');
        var existingLoader = document.body.querySelector('.loader-container');
        if (!existingLoader) {
            var loader = document.createElement('div');
            loader.className = 'loader-container';
            loader.innerHTML = '<div class="spinny-loader"><div class="spinny-circle"></div></div>';
            document.body.appendChild(loader);
        }
    }

    function hideLoading() {
        document.body.classList.remove('loading');
        var loaderElem = document.body.querySelector('.loader-container');
        if (loaderElem) loaderElem.parentNode.removeChild(loaderElem);
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

    return {
        updateLineNumbers: updateLineNumbers,
        syncScroll: syncScroll,
        showLoading: showLoading,
        hideLoading: hideLoading,
        initParticles: initParticles
    };
})();