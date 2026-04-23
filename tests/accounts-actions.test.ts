import {describe, expect, it, vi} from "vitest";
import {accountActions} from "../src/accounts/actions";

function makeClient() {
  const request = vi.fn().mockResolvedValue(42);
  return {
    client: {
      request,
      account: undefined,
      chain: {id: 1},
    } as any,
    request,
  };
}

describe("accountActions.getCurrentNonce", () => {
  it("defaults to block=\"pending\" so concurrent submissions do not collide", async () => {
    const {client, request} = makeClient();
    const actions = accountActions(client);

    await actions.getCurrentNonce({
      address: "0x0000000000000000000000000000000000000001",
    });

    expect(request).toHaveBeenCalledWith({
      method: "eth_getTransactionCount",
      params: ["0x0000000000000000000000000000000000000001", "pending"],
    });
  });

  it("honors an explicit block override", async () => {
    const {client, request} = makeClient();
    const actions = accountActions(client);

    await actions.getCurrentNonce({
      address: "0x0000000000000000000000000000000000000001",
      block: "latest",
    });

    expect(request).toHaveBeenCalledWith({
      method: "eth_getTransactionCount",
      params: ["0x0000000000000000000000000000000000000001", "latest"],
    });
  });

  it("falls back to client.account.address when address is omitted-like", async () => {
    const request = vi.fn().mockResolvedValue(7);
    const client = {
      request,
      account: {address: "0x0000000000000000000000000000000000000abc"},
      chain: {id: 1},
    } as any;
    const actions = accountActions(client);

    // Pass empty string, which is falsy per the implementation's fallback chain.
    await actions.getCurrentNonce({address: "" as any});

    expect(request).toHaveBeenCalledWith({
      method: "eth_getTransactionCount",
      params: ["0x0000000000000000000000000000000000000abc", "pending"],
    });
  });

  it("throws when neither address nor client.account is available", async () => {
    const {client} = makeClient();
    const actions = accountActions(client);

    await expect(actions.getCurrentNonce({address: "" as any})).rejects.toThrow(
      /No address provided/,
    );
  });
});
