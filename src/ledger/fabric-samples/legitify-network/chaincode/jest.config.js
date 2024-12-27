// jest.config.js
module.exports = {
    preset: 'ts-jest',
    transform: {
        '^.+\\.ts?$': 'ts-jest',
    },
    testEnvironment: 'node',
    testRegex: '/test/.*\\.(test|spec)?\\.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    roots: ['<rootDir>/test'],
    // Add custom cache directory
    cacheDirectory: './node_modules/.jest-cache',
    transformIgnorePatterns: [
        '/node_modules/(?!axios)', // Include axios for transformation
    ],
};
