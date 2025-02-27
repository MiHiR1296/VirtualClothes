export const environment = {
    development: {
        assetPath: '/',
        useGoogleDrive: false
    },
    production: {
        assetPath: '/',
        useGoogleDrive: false
    },
    current: () => environment.development
};