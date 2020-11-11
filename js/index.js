let Web3 = require('web3');
let request = require('superagent');

const approvalHash = "0x095ea7b3";
const unlimitedAllowance = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const approvalABI = [
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokens",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// -- Web3Modal
const Web3Modal = window.Web3Modal.default;
const WalletConnectProvider = window.WalletConnectProvider.default;

let web3Modal
let provider;

const providerOptions = {
  walletconnect: {
    package: WalletConnectProvider,
    options: {
      rpc: {
        1: 'https://bsc-dataseed.binance.org/',
        56: 'https://bsc-dataseed.binance.org/',
        97: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      },
    },
  },
};

const inject = async () => {
  if (window.ethereum) {    
    window.web3 = new Web3(window.ethereum);   
    window.ethereum.enable();    
    return true;
  
  } else {  
    try {
      web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions,
        disableInjectedProvider: false, // optional. For MetaMask / Brave / Opera.
      });
    
      provider = await web3Modal.connect();
      window.web3 = new Web3(provider);
      
      return true;
    } catch (err) {
      console.error(err);
    }
  }

  return false;
}

const spawnCows = () => {
  const cows = $('.cows');
  let n = Math.ceil(Math.random() * 3 ) + 3;

  const arr = [];
  for(let i = 0; i < n; i++) {
    const r = 100 / n;
    const x = (i + Math.random() * 0.5) * r;
    const y = Math.ceil(Math.random() * 30) / 10 + 0.5;
    const w = Math.round(Math.random() * 5) + 3;
    const d = Math.random() < 0.5 ? -1 : 1;
    arr.push(`<img class='cow' src='/img/beefy.svg' style='left: ${x}vw; bottom: ${y}rem; width: ${w}rem; transform: scaleX(${d}); z-index: ${Math.ceil(y)}' />`);
  }
  cows.html(arr.join(''));
}

function onReady() {
  (async () => {
    spawnCows();
    
    const injected = await inject();
    if (!injected) {
      alert("web3 object not found");
      return;
    }

    web3.eth.requestAccounts().then((accounts) => {
      init(accounts[0]);

    }).catch((err) => {
      console.log(err);
      // some web3 objects don't have requestAccounts
      ethereum.enable().then((accounts) => {
        init(accounts[0]);
      }).catch((err) => {
        alert(e + err);
      });
    });
    
    function init(account) {
      web3.eth.getChainId().then((chainId) => {
        return chainId;
        
      }).then((chainId) => {
        let query = getQuery(chainId, account);
        if(query === "") {
          alert(`No allowances found in chain(${chainId}) for ${account}`);

        } else {
          getApproveTransactions(query, (txs) => {
            // display the logic
            // console.log(txs);
            buildResults(chainId, txs, account);
          });
        }
      }).catch((err) => {
        throw err;
      });
    }
    
    function getQuery(chainId, address) {
      return "https://api.bscscan.com/api?module=account&action=txlist&address=" + address;
    }
    
    function getExplorerPage(chainId) {
      return "https://bscscan.com/address/"; 
    }
    
    function getApproveTransactions(query, cb) {
      request.get(query, (err, data) => {
        if(err) { throw err; }
      
        let approveTransactions = [];
        let dataObj = JSON.parse(data.text).result;
        
        for(let tx of dataObj) {
        
          if(tx.input.includes(approvalHash)) {
            let approveObj = {};
            approveObj.contract = web3.utils.toChecksumAddress(tx.to);
            approveObj.approved = web3.utils.toChecksumAddress("0x" + tx.input.substring(34, 74));
            
            let allowance = tx.input.substring(74);
            if(allowance.includes(unlimitedAllowance)) {
              approveObj.allowance = "unlimited";
            } else {
              approveObj.allowance = "limited";
            }

            if(parseInt(allowance, 16) !== 0) {
              approveTransactions.push(approveObj);
            } else {
              // TODO clean up
              // Remove all previous additions of this approval transaction as it is now cleared up
              approveTransactions = approveTransactions.filter((val) => {
                return !(val.approved === approveObj.approved && val.contract === val.contract);
              });
            }
            
          }
        }
        cb(approveTransactions);
      });
    }
    
    function buildResults(chainId, txs, account) {
      let explorerURL = getExplorerPage(chainId);
      let parentElement = $('#results');
      for(let index in txs) {
        parentElement.append(`
        <div class="grid-container">
        <div class="grid-address"><a href=${explorerURL + txs[index].contract} target="_blank" rel="noopener noreferrer">${txs[index].contract}</a></div>
        <div class="grid-address"><a href=${explorerURL + txs[index].approved} target="_blank" rel="noopener noreferrer">${txs[index].approved}</a></div>
        <div class="grid-action"><span class="${txs[index].allowance}">${txs[index].allowance}</span><button class="${txs[index].allowance}" id="revoke${index}"> Revoke</button></div>
        </div>
        `);
        setRevokeButtonClick(txs[index], "#revoke" + index, account);
      }
    }
    
    function setRevokeButtonClick(tx, id, account) {
      $(id).click(() => {
        let contract = new web3.eth.Contract(approvalABI, tx.contract);
        contract.methods.approve(tx.approved, 0).send({ from: account }).then((receipt) => {
          console.log("revoked: " + JSON.stringify(receipt));
          $(id).parents('.grid-container').remove();
        }).catch((err) => {
          console.log("failed: " + JSON.stringify(err));
        });
      });
    }
    
  })();
}

$(onReady);