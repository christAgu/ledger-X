// Stand-in for libsodium-wrappers-sumo. The wallet only uses secp256k1 signing
// from @cosmjs, so none of the libsodium-backed primitives are ever called.
function unavailable() {
  throw new Error('libsodium is not available in the Ledger X wallet');
}

const sodium = new Proxy(
  { ready: Promise.resolve() },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === '__esModule') return false;
      if (prop === 'default') return sodium;
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      return unavailable;
    },
  },
);

module.exports = sodium;
