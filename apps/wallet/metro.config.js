const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Hermes has no WebAssembly, and libsodium (pulled in by @cosmjs/crypto for
// Argon2/Ed25519, which the wallet never calls) aborts at startup without it.
const libsodiumStub = path.resolve(__dirname, 'shims/libsodium-wrappers-sumo.js');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'libsodium-wrappers-sumo' || moduleName === 'libsodium-sumo') {
    return { type: 'sourceFile', filePath: libsodiumStub };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
