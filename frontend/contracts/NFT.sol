//SPDX-License-Identifier: <SPDX-License>
// pragma solidity ^0.8.4;
pragma solidity >=0.7.0 <0.9.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract NFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    Counters.Counter private _collectionIds;

    struct CollectionInfo{
        uint256 id;
        string name;
        string collectionUri;
        uint256 totalMints;
        uint256 limits;
        uint256 price;
    }

    struct TokenInfo {
        uint256 collectionId;
        uint256 tokenId;
        address tokenOwner;
        bool sold;
    }

    uint256 m_nMintPrice = 100000 * 10**9;
    address public m_addressPayCoin = address(0xaedE035C3c14eC50Ddf8EAF9007a4699d261b5Ae);
    address contractAddress; // market address
    address m_addrOwner;  // developers
    mapping(uint256 => CollectionInfo) private m_mapCollection; // collection id --> CollectionInfo
    mapping(uint256 => uint256) private m_mapTidToCid; // token id --> collection id
    mapping(uint256 => TokenInfo) private m_mapTidToToken; // token id --> token info 
    mapping(address => mapping(uint256 => uint256)) private m_mapAddressToCount; // address --> collection id --> count

    event CollectionCreated(
        uint256 indexed id,
        string name,
        string collectionUri,
        uint256 totalMints,
        uint256 limits,
        uint256 price
    );

    event MintingPriceChanged(uint256 _mintingPrice);

    constructor(
        address marketplaceAddress
    ) ERC721("Adamant Character", "ADMCC"){
        m_addrOwner = msg.sender;
        contractAddress = marketplaceAddress;
    }

	modifier onlyByOwner{
		require(msg.sender == m_addrOwner, "Unauthorised Access");
		_;
	}

    function addCollection(
        string memory collectionName,
        string memory uri,
        uint256 totalMints,
        uint256 limits,
        uint256 price
    ) public onlyByOwner {
        _collectionIds.increment();
        uint256 currentId = _collectionIds.current();
        m_mapCollection[currentId] = CollectionInfo(currentId, collectionName, uri, totalMints, limits, price * 10**9);
        emit CollectionCreated(currentId, collectionName, uri, totalMints, limits, price * 10**9);
    }
    
    function mintToken(
        uint256 collectionId
    ) public returns(uint) {
        IERC20 admc = IERC20(m_addressPayCoin);
        uint256 mintingPrice = m_mapCollection[collectionId].price;
        uint256 allowance = admc.allowance(msg.sender, address(this));
        require(allowance >= mintingPrice, "minting price is the smaller than allowed amount");
        require(admc.balanceOf(msg.sender) >= mintingPrice, "balance is too small, you can't pay for minting.");
        require(collectionId <= _collectionIds.current(), "The collection id no exists.");
        require(
            _tokenIds.current() < m_mapCollection[collectionId].totalMints,
            "current minting count overflows total minting count."
        );
        require(
            m_mapAddressToCount[msg.sender][collectionId] <= m_mapCollection[collectionId].limits,
            "Exceeded the limited number of minting."
        );

        _tokenIds.increment();
        uint256 currentTokenId = _tokenIds.current();

        _mint(msg.sender, currentTokenId);
        _setTokenURI(currentTokenId, m_mapCollection[collectionId].collectionUri);
        setApprovalForAll(contractAddress, true);

        m_mapTidToToken[currentTokenId] = TokenInfo(collectionId, currentTokenId, msg.sender, false);
        m_mapTidToCid[currentTokenId] = collectionId;
        m_mapAddressToCount[msg.sender][collectionId] += 1;

        admc.transferFrom(msg.sender, m_addrOwner, mintingPrice);

        return currentTokenId;
    }

    function fetchCollections() public view returns(CollectionInfo[] memory){
        uint256 count = _collectionIds.current();
        CollectionInfo[] memory info = new CollectionInfo[](count);
        for(uint256 i = 1; i <= count; i++)
            info[i-1] = m_mapCollection[i];
        return info;
    }

    function fetchMyNFTS(uint256 _collectionId) public view returns(TokenInfo[] memory) {
        uint256 counter = 0;
        for(uint256 i=1; i <= _tokenIds.current(); i++)
            if(!m_mapTidToToken[i].sold && m_mapTidToToken[i].collectionId == _collectionId) counter++;

        uint256 index = 0;
        TokenInfo[] memory items = new TokenInfo[](counter);
        for(uint256 i=1; i <= _tokenIds.current(); i++){
            if(!m_mapTidToToken[i].sold && m_mapTidToToken[i].collectionId == _collectionId) {
                items[index] = m_mapTidToToken[i];
                index++;
            }
        }
        return items;
    }

    function setStatusForToken(uint256 tokenId) public {
        for(uint256 i=1; i <= _tokenIds.current(); i++){
            if(i == tokenId){
                m_mapTidToToken[i].sold = true;
                break;
            }
        }
    }

    function statusForToken(uint256 tokenId) public view returns(bool){
        bool ok = false;
        for(uint256 i=1; i <= _tokenIds.current(); i++){
            if(i == tokenId){
                ok = true; break;
            }
        }
        return ok;
    }

    function setMintingPrice(uint256 mintingPrice) public onlyByOwner{
        m_nMintPrice = mintingPrice * 10**9;
        emit MintingPriceChanged(mintingPrice);
    }

    function getOwner() public view returns(address) {
        return m_addrOwner;
    }

    function getMintingPrice() public view returns(uint256) {
        return m_nMintPrice;
    }

    function getCurrentTokenId() public view returns(uint256) {
        return _tokenIds.current();
    }

    function getCurrentCollectionId() public view returns(uint256) {
        return _collectionIds.current();
    }

    function getCollectionInfoByCid(uint256 collectionId) public view returns(CollectionInfo memory) {
        return m_mapCollection[collectionId];
    }

    function getCurrentCountForCollection(uint256 collectionId) public view returns(uint256) {
        return m_mapAddressToCount[msg.sender][collectionId];
    }

    function getCollectionInfoByTid(uint256 tokenId) public view returns(CollectionInfo memory){
        uint256 cid = m_mapTidToCid[tokenId];
        return m_mapCollection[cid];
    }

    function getPayableCoin() public view returns(address) {
        return m_addressPayCoin;
    }
    
    function getURI(uint256 tokenId) public view returns (string memory) {
        return super.tokenURI(tokenId);
    }
}