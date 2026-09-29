import {connect} from "./connect";
import {ChainSwitcher, Network, SnapSource} from "@/types";
import {metamaskClient} from "@/wallet/metamaskClient";

export function walletActions(client: ChainSwitcher) {
  return {
    connect: (network: Network, snapSource: SnapSource) => connect(client, network, snapSource),
    metamaskClient: (snapSource: SnapSource = "npm") => metamaskClient(snapSource),
  };
}
