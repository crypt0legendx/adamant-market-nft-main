//SPDX-License-Identifier: <SPDX-License>
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Master is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    uint256 m_nMintPrice = 10000 * 10**9;
    uint256 m_nTotalSupply = 10000;
    address m_addrPayCoin;
    address m_addrOwner;
    mapping(address => uint256[]) m_mapAddressToTokens;
    string m_strUri = "https://gateway.pinata.cloud/ipfs/QmQnfAqgwzCUbj9s6Djm1HWGvxRD8Avh84Nu5b1qbrX8QG";
    
    uint256 m_nBurnId;
    
    constructor(address addrPayCoin) ERC721("Master", "MASTER"){
        m_addrOwner = msg.sender;
        m_addrPayCoin = addrPayCoin;
    }

    function payWithCustomCoin(uint256 costs) public {
        IERC20 erc20 = IERC20(m_addrPayCoin);
        uint256 allowance = erc20.allowance(msg.sender, address(this));
        require(allowance >= costs, "cost is the smaller than allowed amount");
        require(erc20.balanceOf(msg.sender) >= costs, "balance is too small, you can't pay for minting.");
        erc20.transferFrom(msg.sender, m_addrOwner, costs);
    }

    function mintToken() public returns(uint256) {
        require(_tokenIds.current() < m_nTotalSupply, "The number of this NFT tokens overflows total supply.");
        _tokenIds.increment();
        uint256 currentTokenId = _tokenIds.current();
        _mint(msg.sender, currentTokenId);
        _setTokenURI(currentTokenId, m_strUri);
        m_mapAddressToTokens[msg.sender].push(currentTokenId);
        payWithCustomCoin(m_nMintPrice);
        return currentTokenId;
    }

    function pop() public {
        uint256[] memory data = m_mapAddressToTokens[msg.sender];
        if(data.length > 0) {
            m_nBurnId = data[data.length-1];
        }
        uint256[] memory newTokens = new uint256[](data.length-1);
        for(uint256 i=0; i<data.length-1; i++)
            newTokens[i] = data[i];
        m_mapAddressToTokens[msg.sender] = newTokens;
    }
    
    function getTokens(address _account) public view returns(uint256[] memory){
        return m_mapAddressToTokens[_account];
    }

    function burnToken() public {
        require(m_mapAddressToTokens[msg.sender].length > 0, "balance is zero.");
        pop();
        _burn(m_nBurnId);
    }

    function getPayableCoin() public view returns(address) {
        return m_addrPayCoin;
    }

    function getMintingPrice() public view returns(uint256) {
        return m_nMintPrice;
    }

    function getCurrentTokenId() public view returns(uint256) {
        return _tokenIds.current();
    }
    
    function getURI(uint256 tokenId) public view returns (string memory) {
        return super.tokenURI(tokenId);
    }
}