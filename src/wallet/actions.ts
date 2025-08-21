import {connect} from "./connect";
import {GenLayerChain, Network, SnapSource, BaseActionsClient} from "@/types";
import {metamaskClient} from "@/wallet/metamaskClient";

export function walletActions<TChain extends GenLayerChain>(client: BaseActionsClient<TChain>) {
  return {
    connect: (network: Network, snapSource: SnapSource) => connect(client, network, snapSource),
    metamaskClient: (snapSource: SnapSource = "npm") => metamaskClient(snapSource),
  };
}
