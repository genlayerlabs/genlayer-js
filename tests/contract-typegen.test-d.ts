import {expectTypeOf, test} from "vitest";
import {getContract} from "../src/contracts/getContract";
import {CalldataAddress} from "../src/types/calldata";
import type {GenLayerChain, GenLayerClient} from "../src/types";
import type {StorageConstructorArgs, StorageMethods} from "./fixtures/storage-contract.types";

test("generated contract types drive getContract", () => {
  const client = {} as GenLayerClient<GenLayerChain>;
  const storage = getContract<StorageMethods>({client, address: "0x0000000000000000000000000000000000000001"});
  const user = new CalldataAddress(new Uint8Array(20));

  expectTypeOf(storage.read.get_storage).returns.resolves.toEqualTypeOf<string>();
  expectTypeOf(storage.read.get_balance).returns.resolves.toEqualTypeOf<number | string>();
  expectTypeOf(storage.read.get_owner).returns.resolves.toEqualTypeOf<`0x${string}`>();
  expectTypeOf(storage.read.get_profile).returns.resolves.toEqualTypeOf<{
    name: string;
    score: number | string;
    tags: string[];
    avatar: `0x${string}` | null;
  }>();
  expectTypeOf(storage.read.get_pair).returns.resolves.toEqualTypeOf<[string, number | string, ...boolean[]]>();
  expectTypeOf<StorageConstructorArgs>().toEqualTypeOf<[initial_storage: string]>();

  void storage.read.get_profile([user], {kwargs: {include_history: true}});
  void storage.writeMethod("send")([], {kwargs: {recipient: user, note: "hi"}});
  void storage.write.update_storage(["new value"]);
  void storage.write.deposit([[1, 2n], null], {value: 1n});

  // @ts-expect-error get_balance takes an address argument
  void storage.read.get_balance();
  // @ts-expect-error get_balance expects a CalldataAddress, not a number
  void storage.read.get_balance([1]);
  // @ts-expect-error unknown keyword argument
  void storage.read.get_profile([user], {kwargs: {nope: true}});
  // @ts-expect-error write methods are not exposed on read
  void storage.read.update_storage(["x"]);
  // @ts-expect-error read methods are not exposed on write
  void storage.write.get_storage();
  // @ts-expect-error methods missing from the schema do not exist
  void storage.read.missing();

  // Required keyword-only arguments.
  void storage.write.send([], {kwargs: {recipient: user, note: null}, leaderOnly: true});
  // @ts-expect-error send has required keyword arguments
  void storage.write.send();
  // @ts-expect-error send has required keyword arguments
  void storage.write.send([]);
  // @ts-expect-error the options object must carry kwargs
  void storage.write.send([], {leaderOnly: true});
  // @ts-expect-error send is not payable, so it does not accept value
  void storage.write.send([], {kwargs: {recipient: user, note: null}, value: 1n});

  // `value` is only accepted by payable methods.
  // @ts-expect-error update_storage is not payable
  void storage.write.update_storage(["x"], {value: 1n});
  // @ts-expect-error configure is not payable
  void storage.writeMethod("configure")([1, "x", true], {value: 1n});
  void storage.writeMethod("valueOf")([1], {value: 1n});

  // Probe names (toJSON, valueOf, ...) are never exposed on the proxies, only through the accessors.
  expectTypeOf(storage.readMethod("toJSON")).returns.resolves.toEqualTypeOf<Record<string, string>>();
  // @ts-expect-error `toJSON` is not exposed on the read proxy
  void storage.read.toJSON;
  // @ts-expect-error the write proxy does not map the contract method `valueOf` (only Object#valueOf is typed)
  void storage.write.valueOf([1], {value: 1n});
  // @ts-expect-error every keyword argument is required
  void storage.write.send([], {kwargs: {recipient: user}});
  // @ts-expect-error get_profile's include_history keyword argument is required
  void storage.read.get_profile([user]);

  // Reserved-word parameter names.
  void storage.write.configure([1, "x", true]);

  // A method named `then` is reachable through readMethod, but never through the proxy.
  expectTypeOf(storage.readMethod("then")).returns.resolves.toEqualTypeOf<string>();
  void storage.readMethod("then")([1]);
  // @ts-expect-error `then` is not exposed on the read proxy
  void storage.read.then;
  // @ts-expect-error readMethod only accepts read-only methods
  void storage.readMethod("update_storage");
  // @ts-expect-error writeMethod only accepts state-changing methods
  void storage.writeMethod("get_storage");
});
