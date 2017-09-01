module.exports = {
    "env": {
        "browser": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4,
            { "SwitchCase": 1 }
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-unused-vars": [
            "error",
            { "args": "none" }
        ]
    },
    "globals": {
        "$": true,
        "Players": true,
        "Game": true,
        "GameUI": true,
        "GameEvents": true,
        "DOTATeam_t": true,
        "DotaDefaultUIElement_t": true
    }
};