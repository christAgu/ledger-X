import { config } from "./config.js";
import { CosmosRelayer } from "./cosmos.js";
import { createRelayerServer } from "./server.js";

const server = await createRelayerServer(config, new CosmosRelayer(config));
server.listen(config.port, "0.0.0.0", () => {
  console.log(`Ledger X relayer listening on 0.0.0.0:${config.port}`);
});
