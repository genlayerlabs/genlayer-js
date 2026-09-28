import {describe, expect, it, vi} from "vitest";
import {chainActions} from "../src/chains/actions";
import {localnet, studionet} from "../src/chains";

type TestAbiParameter = {
  type: string;
  components?: readonly TestAbiParameter[];
};

type TestAbiEntry = {
  type: string;
  name?: string;
  inputs?: readonly TestAbiParameter[];
};

const makeClient = (chainId: number) =>
  ({
    chain: {
      id: chainId,
      rpcUrls: {
        default: {
          http: ["http://localhost:4000"],
        },
      },
      consensusMainContract: {
        address: "0x0000000000000000000000000000000000000001",
        abi: [{type: "function", name: "addTransaction", inputs: [], outputs: []}],
        bytecode: "0x",
      },
    },
  }) as any;

describe("chainActions.initializeConsensusSmartContract", () => {
  it("emits a deprecation warning and makes no network calls", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const client = makeClient(1);
    const actions = chainActions(client);

    await actions.initializeConsensusSmartContract();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("deprecated"),
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });
});

describe.each([
  ["localnet", localnet],
  ["studionet", studionet],
])("%s Studio consensus ABI", (_name, chain) => {
  it("exports Studio's fee-aware, decision-bound transaction signatures", () => {
    const functions = new Map(
      (chain.consensusMainContract!.abi as readonly TestAbiEntry[])
        .filter((entry) => entry.type === "function" && entry.name)
        .map((entry) => [entry.name!, entry]),
    );
    const inputTypes = (name: string) =>
      functions.get(name)!.inputs!.map((input) => input.type);

    expect(inputTypes("addTransaction")).toEqual(["tuple"]);
    expect(inputTypes("deploySalted")).toEqual(["tuple"]);
    expect(inputTypes("topUpFees")).toEqual(["bytes32", "tuple"]);
    expect(inputTypes("topUpAndSubmitAppeal")).toEqual(["bytes32", "uint256", "tuple"]);
    expect(inputTypes("submitAppeal")).toEqual(["bytes32", "uint256"]);
    expect(inputTypes("finalizeTransaction")).toEqual(["bytes32", "uint256"]);

    const addParams = functions.get("addTransaction")!.inputs![0].components!;
    expect(addParams.map((component) => component.type)).toEqual([
      "address",
      "address",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "tuple",
      "bytes",
      "tuple[]",
    ]);
    expect(addParams[7].components!.map((component) => component.type)).toEqual([
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256[]",
      "uint256",
      "uint256",
      "uint256",
    ]);
    expect(addParams[9].components!.map((component) => component.type)).toEqual([
      "uint8",
      "bool",
      "uint256",
      "address",
      "bytes32",
      "uint256",
      "bytes",
    ]);
  });
});
