module.exports = {
  extends: "airbnb-base",
  env: {
    jest: true
  },
  rules: {
    semi: ["error", "never"],
    "comma-dangle": ["warn", "always-multiline"],
    "import/no-extraneous-dependencies": ["error", {"devDependencies": true}],
    "no-use-before-define": ["error", { "variables": false }],
  }
};