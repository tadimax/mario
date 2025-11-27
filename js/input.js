// js/input.js
(function() {
    var pressedKeys = {};

    // Global flag for evolution mode (used by level code)
    if (typeof window.MARIO_EVOLVE === "undefined") {
        window.MARIO_EVOLVE = false;
    }

    function setKey(event, status) {
        var code = event.keyCode;
        var key;

        switch (code) {
            case 32:
                key = 'SPACE'; break;
            case 37:
                key = 'LEFT'; break;
            case 38:
                key = 'UP'; break;
            case 39:
                key = 'RIGHT'; break;
            case 40:
                key = 'DOWN'; break;
            case 88:
                key = 'JUMP'; break;
            case 90:
                key = 'RUN'; break;
            case 84:
                key = 'TOGGLE_EVOLVE'; break; // T key
            default:
                key = String.fromCharCode(code);
        }

        pressedKeys[key] = status;
    }

    document.addEventListener('keydown', function(e) {
        // Handle evolution toggle on key press (avoid auto-repeat)
        if (e.keyCode === 84 && !pressedKeys['TOGGLE_EVOLVE']) {
            window.MARIO_EVOLVE = !window.MARIO_EVOLVE;
            console.log('Evolution mode:', window.MARIO_EVOLVE ? 'ON' : 'OFF');

            // Reload World 1-1 using the new evolve flag, if available
            if (typeof Mario !== 'undefined' && typeof Mario.oneone === 'function') {
                // You can also pass a fixed seed here if you want determinism
                Mario.oneone({ evolve: window.MARIO_EVOLVE });
            }
        }

        setKey(e, true);
    });

    document.addEventListener('keyup', function(e) {
        setKey(e, false);
    });

    window.addEventListener('blur', function() {
        pressedKeys = {};
    });

    window.input = {
        isDown: function(key) {
            return !!pressedKeys[key.toUpperCase()];
        },
        reset: function() {
            pressedKeys['RUN']   = false;
            pressedKeys['LEFT']  = false;
            pressedKeys['RIGHT'] = false;
            pressedKeys['DOWN']  = false;
            pressedKeys['JUMP']  = false;
        }
    };
})();
