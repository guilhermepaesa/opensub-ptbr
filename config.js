var env = process.env.NODE_ENV ? 'beamup':'local';

var config = { 
    BaseURL: "https://www.opensubtitles.org"
}

switch (env) {
    case 'beamup':
        config.port = process.env.PORT
        config.local = "https://2ecbbd610840-opensubtitles.baby-beamup.club"
        break;

    case 'local':
        config.port = 7700
        config.local = "https://stremio-streams.aimixtech.com:8443";
        break;
}

module.exports = config;
