// src/server/config/fabric-config.js

module.exports = {
  // Development environment (local)
  development: {
    networkUrl: "localhost",
    networkPort: "7051",
    caUrl: "localhost",
    caPort: "7054",
    // Other fabric configuration
  },

  // Production environment (AWS)
  production: {
    networkUrl: process.env.FABRIC_NETWORK_URL || "18.202.198.84",
    networkPort: process.env.FABRIC_NETWORK_PORT || "7051",
    caUrl: process.env.FABRIC_CA_URL || "18.202.198.84",
    caPort: process.env.FABRIC_CA_PORT || "7054",
    // Other fabric configuration
  },
};
