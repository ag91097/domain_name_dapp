import React, { useEffect, useState } from "react";
import "./styles/App.css";
import { ethers } from "ethers";
import contractAbi from "./utils/Domains.json";
import polygonLogo from "./assets/polygonlogo.png";
import ethLogo from "./assets/ethlogo.png";
import { networks } from "./utils/networks";

// Constants

const CONTRACT_ADDRESS = "0x02A8154d4b14f44b4c30789758Af198E9A68F978";
const tld = ".kuchbhi";
const App = () => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [domain, setDomain] = useState("");
  const [record, setRecord] = useState("");
  const [network, setNetwork] = useState("");
  const [editing, setEditing] = useState(false);
  const [mints, setMints] = useState([]);
  const [loading, setLoading] = useState(false);

  const isWalletConnected = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      console.log("Please get metamask");
      return;
    } else {
      console.log("Got ethereum object", ethereum);
    }

    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Got an authorised account: ", account);
      setCurrentAccount(account);
    } else {
      console.log("No authorised account found");
    }

    // checking user network chain id
    const chainId = await ethereum.request({ method: "eth_chainId" });
    setNetwork(networks[chainId]);

    ethereum.on("chainChanged", handleChainChanged);

    // reloading page if chain changed
    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  };

  const connectWallet = async () => {
    try {
      const { ethereum } = window;
      if (!ethereum) {
        alert("Get metamask: https://metamask.io/");
        return;
      }

      // request for account access
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("Connected account: ", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x13881" }],
        });
      } catch (error) {
        // this error come if chain we want to add is not on metamask
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x13881",
                  chainName: "Polygon Mumbai Testnet",
                  rpcUrls: ["https://rpc-mumbai.maticvigil.com/"],
                  nativeCurrency: {
                    name: "Mumbai Matic",
                    symbol: "MATIC",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
                },
              ],
            });
          } catch (error) {
            console.log(error);
          }
        }
      }
    } else {
      alert("Get Metamask.");
    }
  };

  const mintDomain = async () => {
    if (!domain) {
      alert("Please enter domain");
      return;
    }

    const price = domain.length < 5 ? "0.5" : domain.length < 8 ? "0.3" : "0.1";
    console.log("Minting Domain", domain, "with price", price);
    setLoading(true);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        console.log("Metamask popped to pay gas.");
        let txn = await contract.register(domain, {
          value: ethers.utils.parseEther(price),
        });
        const receipt = await txn.wait(); //wait for domain minting

        if (receipt.status === 1) {
          console.log(
            "Domain minted https://mumbai.polygonscan.com/tx/" + txn.hash
          );

          txn = await contract.setRecord(domain, record);
          await txn.wait();

          console.log(
            "Record set! https://mumbai.polygonscan.com/tx/" + txn.hash
          );

          setTimeout(() => {
            fetchMints();
          }, 2000);

          setRecord("");
          setDomain("");
        } else {
          alert("Transaction Failed | Try Again.");
        }
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const updateDomain = async () => {
    if (!domain || !record) {
      return;
    }
    setLoading(true);
    console.log("Updating Domain", domain, "with record", record);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        let txn = await contract.setRecord(domain, record);
        await txn.wait();
        console.log("Record set https://mumbai.polygonscan.com/tx/" + txn.hash);

        fetchMints();
        setDomain("");
        setRecord("");
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const fetchMints = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        const names = await contract.getAllNames();

        const mintRecords = await Promise.all(
          names.map(async (name) => {
            const record = await contract.records(name);
            const owner = await contract.domains(name);
            return {
              id: names.indexOf(name),
              name: name,
              record: record,
              owner: owner,
            };
          })
        );

        console.log("Minted domains data fetched: ", mintRecords);
        setMints(mintRecords);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const renderIfWalletNotConnected = () => (
    <div className="connect-wallet-container">
      <button
        className="cta-button connect-wallet-button"
        onClick={connectWallet}
      >
        Connect Wallet
      </button>
    </div>
  );

  const renderInputForm = () => {
    if (network !== "Polygon Mumbai Testnet") {
      return (
        <div className="connect-wallet-container">
          <h2> Please Connect to Polygon Testnet</h2>
          <button className="cta-button mint-button" onClick={switchNetwork}>
            Switch Network
          </button>
        </div>
      );
    }

    return (
      <div className="form-container">
        <div className="first-row">
          <input
            type="text"
            value={domain}
            placeholder="domain"
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="tld"> {tld} </p>
        </div>

        <input
          type="text"
          value={record}
          placeholder="record"
          onChange={(e) => setRecord(e.target.value)}
        />

        {editing ? (
          <div className="button-container">
            <button
              className="cta-button mint-button"
              disabled={loading}
              onClick={updateDomain}
            >
              Update Record
            </button>
            <button
              className="cta-button mint-button"
              onClick={() => {
                setEditing(false);
                setDomain("");
                setRecord("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="cta-button mint-button"
            disabled={loading}
            onClick={mintDomain}
          >
            Mint Domain
          </button>
        )}
      </div>
    );
  };

  const renderMints = () => {
    if (currentAccount && mints.length > 0) {
      return (
        <div className="mint-container">
          <p className="subtitle"> All Minted Domains!</p>
          <div className="mint-list">
            {mints.map((mint, index) => {
              return (
                <div className="mint-item" key={index}>
                  <div className="mint-row">
                    <a
                      className="link"
                      href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <p className="underlined">
                        {" "}
                        {mint.name}
                        {tld}{" "}
                      </p>
                    </a>
                    {/* If mint.owner is currentAccount, add an "edit" button*/}
                    {mint.owner.toLowerCase() ===
                    currentAccount.toLowerCase() ? (
                      <button
                        className="edit-button"
                        onClick={() => editRecord(mint.name)}
                      >
                        <img
                          className="edit-icon"
                          src="https://img.icons8.com/metro/26/000000/pencil.png"
                          alt="Edit button"
                        />
                      </button>
                    ) : null}
                  </div>
                  <p>{mint.record}</p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  const editRecord = (name) => {
    console.log("Editing record for", name);
    setEditing(true);
    setDomain(name);
  };

  // run whenever page load
  useEffect(() => {
    isWalletConnected();
  }, []);

  useEffect(() => {
    if (network === "Polygon Mumbai Testnet") {
      fetchMints();
    }
  }, [currentAccount, network]);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header>
            <div className="left">
              <p className="title">😎 Kuchbhi Name Service</p>
              <p className="subtitle">
                Get your .kuchbhi domain on the blockchain!
              </p>
            </div>
            <div className="right">
              <img
                alt="Network logo"
                className="logo"
                src={network.includes("Polygon") ? polygonLogo : ethLogo}
              />
              {currentAccount ? (
                <p>
                  {" "}
                  Wallet: {currentAccount.slice(0, 6)}...
                  {currentAccount.slice(-4)}{" "}
                </p>
              ) : (
                <p> Not connected </p>
              )}
            </div>
          </header>
        </div>

        {!currentAccount && renderIfWalletNotConnected()}
        {currentAccount && renderInputForm()}
        {mints && renderMints()}

        <div className="footer-container"></div>
      </div>
    </div>
  );
};

export default App;
