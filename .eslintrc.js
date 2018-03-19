module.exports = {
    "env": {
        "browser": false,
        "commonjs": true,
        "es6": true
    },
    "plugins": [
        "es5"
    ],
    "extends": [
        "eslint:recommended",
        "eslint-config-es5"
    ],
    "parser": "babel-eslint",
    "parserOptions": {
        "sourceType": "module",
        "ecmaFeatures": {
          "experimentalObjectRestSpread" : true,
        }
    },
    "rules": {
        "no-console": 0,
        "prefer-const": ["error", {
            "destructuring": "any",
            "ignoreReadBeforeAssign": false
        }],
        "no-var": [
            "error"
        ],
        "indent": ["error", 2, {"SwitchCase": 1, "MemberExpression": 1 }],
        "linebreak-style": [
            0,
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ]
    }
};

