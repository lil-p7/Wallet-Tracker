//Global application state
const state = {
  wallet: "",
  isLoading: false,
  error: null,
  balances: [],
  transactions: [],
};

//Basic Etherem address validation
function isValidWallet(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

const statusText = document.getElementById("statusText");

function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = type;
}

const walletInput = document.getElementById("walletInput");

walletInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleWalletSubmit();
  }
});

async function handleWalletSubmit() {
  const value = walletInput.value.trim();

  if (!isValidWallet(value)) {
    setStatus("Invalid wallet address", "error");
    return;
  }

  state.wallet = value;
  state.error = null;

  state.balances = [];
  renderBalances();

  loadPortfolio();
}

function startLoading() {
  state.isLoading = true;
  setStatus("fetching wallet data...", "loading");
}

function stopLoading() {
  state.isLoading = false;
}

async function getEthBalance() {
  const response = await fetch(
    "https://rpc.ankr.com/eth/a9b71f80deb3fbd0104600380864f29e136687f5bbde1066d395f0d9688a407e",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [state.wallet, "latest"],
        id: 1,
      }),
    }
  );

  const data = await response.json();

  if (data.error) throw new Error(data.error.message);

  const wei = BigInt(data.result);
  return {
    symbol: "ETH",
    amount: (wei / 10n ** 18n).toString(),
  };
}


async function getTokenBalances() {
    const response = await fetch(
      "https://rpc.ankr.com/multichain/a9b71f80deb3fbd0104600380864f29e136687f5bbde1066d395f0d9688a407e",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "ankr_getAccountBalance",
          params: {
            walletAddress: state.wallet,
            blockchain: "eth",
          },
          id: 1,
        }),
      }
    );
  
    const data = await response.json();
  
    if (data.error) throw new Error(data.error.message);
  
    return data.result.assets.map((token) => ({
      symbol: token.tokenSymbol,
      amount: token.balance,
    }));
  }
  

async function loadPortfolio() {
    try {
      startLoading();
  
      const results = await Promise.allSettled([
        getEthBalance(),
        getTokenBalances(),
      ]);
  
      const balances = [];
  
      if (results[0].status === "fulfilled") {
        balances.push(results[0].value);
      }
  
      if (results[1].status === "fulfilled") {
        balances.push(...results[1].value);
      }
  
      state.balances = balances;
      renderBalances();
  
      setStatus("Portfolio loaded", "success");
    } catch {
      setStatus("Failed to load portfolio", "error");
    } finally {
      stopLoading();
    }
  }
  

const balanceList = document.getElementById("balanceList");

function renderBalances() {
  balanceList.innerHTML = "";

  if (state.balances.length === 0) return;

  state.balances.forEach((asset) => {
    const li = document.createElement("li");
    li.textContent = `${asset.symbol}: ${asset.amount}`;
    balanceList.appendChild(li);
  });
}
