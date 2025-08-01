// tests/client.test.ts
import {describe, it, expect} from "vitest";
import {createClient} from "../src/client/client";
import {localnet} from "../src/chains";

describe("GenLayer Client", () => {
  it("should create a client without type errors", () => {
    const client = createClient({chain: localnet});
    
    // Verify the client has the expected methods
    expect(client).toBeDefined();
    expect(typeof client.fundAccount).toBe("function");
    expect(typeof client.getCurrentNonce).toBe("function");
    expect(typeof client.readContract).toBe("function");
    expect(typeof client.writeContract).toBe("function");
    expect(typeof client.deployContract).toBe("function");
    expect(typeof client.getTransaction).toBe("function");
    expect(typeof client.waitForTransactionReceipt).toBe("function");
    expect(typeof client.getContractSchema).toBe("function");
    expect(typeof client.getContractSchemaForCode).toBe("function");
    expect(typeof client.initializeConsensusSmartContract).toBe("function");
    expect(typeof client.connect).toBe("function");
    expect(typeof client.metamaskClient).toBe("function");
    expect(typeof client.appealTransaction).toBe("function");
  });

  it("should create a client with default configuration", () => {
    const client = createClient();
    
    expect(client).toBeDefined();
    expect(client.chain.id).toBe(localnet.id);
  });
});
