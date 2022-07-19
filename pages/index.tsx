import type { NextPage } from "next";
import { useEffect, useState } from "react";
import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import abi from "../change_with_your_own_metadata.json";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

const Home: NextPage = () => {
  const [blockchainUrl, setBlockchainUrl] = useState("ws://127.0.0.1:9944");
  const [api, setApi] = useState<any>();
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [block, setBlock] = useState(0);
  const [lastBlockHash, setLastBlockHash] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [actingAddress, setActingAddress] = useState("");
  const [result, setResult] = useState("");
  const [gasConsumed, setGasConsumed] = useState("");
  const [outcome, setOutcome] = useState("");

  const extensionSetup = async () => {
    const { web3Accounts, web3Enable } = await import(
      "@polkadot/extension-dapp"
    );
    const extensions = await web3Enable("Polk4NET");
    if (extensions.length === 0) {
      return;
    }
    const account = await web3Accounts();
    setAccounts(account);
  };

  const setup = async () => {
    const wsProvider = new WsProvider(blockchainUrl);
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.rpc.chain.subscribeNewHeads((lastHeader) => {
      setBlock(lastHeader.number.toNumber());
      setLastBlockHash(lastHeader.hash.toString());
    });
    setApi(api);
    await extensionSetup();
  };

  const getFlipValue = async () => {
    const contract = new ContractPromise(api, abi, contractAddress);
    const { gasConsumed, result, output } = await contract.query.get(
      actingAddress,
      { value: 0, gasLimit: -1 }
    );
    setGasConsumed(gasConsumed.toHuman());
    setResult(JSON.stringify(result.toHuman()));
    if (output !== undefined && output !== null) {
      setOutcome(output.toHuman()?.toString() ?? "");
    }
  };

  const changeFlipValue = async () => {
    const { web3FromSource } = await import("@polkadot/extension-dapp");
    const contract = new ContractPromise(api, abi, contractAddress);
    const performingAccount = accounts[0];
    const injector = await web3FromSource(performingAccount.meta.source);
    const flip = await contract.tx.flip({ value: 0, gasLimit: -1 });
    if (injector !== undefined) {
      flip.signAndSend(
        performingAccount.address,
        { signer: injector.signer },
        (result) => {
          if (result.status.isInBlock) {
            setResult("in a block");
          } else if (result.status.isFinalized) {
            setResult("finalized");
          }
        }
      );
    }
  };

  useEffect(() => {
    setup();
  });

  return (
    <>
      <div className="text-center">
        <div className="p-3 m-3 text-3xl">flipper test</div>
        <div className="p-3 m-3">Block: {block}</div>
        <div className="p-3 m-3">Blockchain URL: {blockchainUrl}</div>
        <div className="">Custom Blockchain URL</div>
        <button
          className="bg-green-900 hover:bg-green-800 text-white rounded px-4 py-2"
          onClick={setup}
        >
          Change Blockchain URL
        </button>
        <input
          className="p-2 m-2 border-2"
          onChange={(event) => setBlockchainUrl(event.target.value)}
        />
        <div className="p-3 m-3">Last block hash: {lastBlockHash}</div>
        <div className="p-3 m-3">
          Input contract address (from your canvas UI after you instantiate it):{" "}
          {contractAddress}
        </div>
        <input
          className="p-2 m-2 border-2"
          onChange={(event) => setContractAddress(event.target.value)}
        />
        <br />
        <div className="p-5"></div>
        <div className="">
          Acting account (select from dropdown):{" "}
          {actingAddress ? actingAddress : "..."}
        </div>
        <br />
        <select
          className="p-3 m-3 border-2 border-green-500"
          onChange={(event) => {
            console.log(event);
            setActingAddress(event.target.value);
          }}
        >
          {accounts.map((a) => (
            <option key={a.address} value={a.address}>
              {a.address} [{a.meta.name}]
            </option>
          ))}
        </select>
        <br />
        <br />
        <button
          className="bg-green-900 hover:bg-green-800 text-white rounded px-4 py-2"
          disabled={!api || !contractAddress}
          onClick={getFlipValue}
        >
          {api && contractAddress
            ? "Get flip value!"
            : "Couldn't load API or contract address is invalid, please see logs in console."}
        </button>
        <br />
        <br />
        <button
          className="bg-green-900 hover:bg-green-800 text-white rounded px-4 py-2"
          disabled={!api || !contractAddress}
          onClick={changeFlipValue}
        >
          {api && contractAddress
            ? "Change flip value!"
            : "Couldn't load API or contract address is invalid, please see logs in console."}
        </button>
        <div>Result: {result}</div>
        <div>Outcome: {outcome}</div>
        <div>Gas consumed: {gasConsumed}</div>
      </div>
    </>
  );
};

export default Home;
