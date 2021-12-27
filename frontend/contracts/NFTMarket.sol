//SPDX-License-Identifier: <SPDX-License>
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./NFT.sol";
import "hardhat/console.sol";

contract NFTMarket is ReentrancyGuard{
    using Counters for Counters.Counter;
    Counters.Counter private _itemIds;
    Counters.Counter private _itemsSold;

    address payable owner;

    address[] m_arrWhiteListAddress;
    mapping(address => bool) private m_mapAllowed; // this address is a address for whitelist, or not
    uint256 private m_nCollectionId;
    uint256 private m_nListingPrice = 100000 * 10**9; // ADMC Coin

    struct MarketItem {
        uint itemId;
        address nftContract;
        uint256 tokenId;
        uint256 collectionId;
        address payable seller;
        address payable owner;
        uint256 price; // ADMC Coin
        bool sold;
    }

    mapping(uint256 => MarketItem) private idToMarketItem; // item id --> market item
    mapping(uint256 => uint256) private m_mapTidToId; // token id --> item id
    mapping(address => mapping(uint256 => uint256)) private m_mapAddressToOwns; // address --> cid --> count
    mapping(uint256 => uint256) private m_mapCidToCount; // collection id --> item count

    event MarketItemCreated(
        uint256 indexed itemId,
        address indexed nftContract,
        uint256 indexed tokenId,
        uint256 collectionId,
        address seller,
        address owner,
        uint256 price,
        bool sold
    );

    event WhiteListAdded(
        address player
    );

    constructor() {
        owner = payable(msg.sender);
    }
    
	modifier onlyByOwner{
		require(msg.sender == owner, "Unauthorised Access");
		_;
	}

    function createMarketItem(
        address nftContract, 
        uint256 tokenId,
        uint256 collectionId,
        uint256 price
    ) public nonReentrant{
        uint256 totalMints = NFT(nftContract).getCollectionInfoByCid(collectionId).totalMints;
        uint256 _price = (m_mapTidToId[tokenId] > 0)?
                        NFT(nftContract).getCollectionInfoByCid(collectionId).price : price;
        require(
            m_mapCidToCount[collectionId] <= totalMints, 
            "The minting count overflows total count in the current collection id"
        );
        require(_price > 100, "Price must be at least 100 ADMC");
        payWithADMC(nftContract, owner, m_nListingPrice);
        _itemIds.increment();
        uint256 itemId = _itemIds.current();
        idToMarketItem[itemId] = MarketItem(
            itemId,
            nftContract,
            tokenId,
            collectionId,
            payable(msg.sender),
            payable(address(0)),
            _price * 10**9,
            false
        );
        m_mapTidToId[tokenId] = itemId;
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        NFT(nftContract).setStatusForToken(tokenId);
        emit MarketItemCreated(
            itemId,
            nftContract,
            tokenId,
            collectionId,
            msg.sender,
            address(0),
            _price * 10**9,
            false
        );
        m_mapCidToCount[collectionId] += 1;
    }

    function payWithADMC(address nftContract, address to, uint256 costs) public {
        address addressCoin = NFT(nftContract).getPayableCoin();
        IERC20 admc = IERC20(addressCoin);
        uint256 allowance = admc.allowance(msg.sender, address(this));
        require(allowance >= costs, "cost is the smaller than allowed amount");
        require(admc.balanceOf(msg.sender) >= costs, "balance is too small, you can't pay for minting.");
        admc.transferFrom(msg.sender, to, costs);
    }

    function isSettedCollectionId() public view returns(bool){
        return m_nCollectionId > 0;
    }

    function setCollectionForWhitelist(uint256 _collectionId) public {
        m_nCollectionId = _collectionId;
    }

    function addCollectionToWhitelist(
        address[] memory playerAddresses
    ) public onlyByOwner nonReentrant {
        for(uint256 i=0; i< playerAddresses.length; i++) {
            if(m_mapAllowed[playerAddresses[i]]) continue;
            m_mapAllowed[playerAddresses[i]] = true;
            m_arrWhiteListAddress.push(playerAddresses[i]);
            emit WhiteListAdded(playerAddresses[i]);
        }
    }

    function isAllowed(address player, uint256 collectionId) public view returns(bool){
        if(collectionId != m_nCollectionId) return true;
        return m_mapAllowed[player];
    }

    function isCreatedMarketItem(uint256 tokenId) public view returns(bool){
        bool res = false;
        if(m_mapTidToId[tokenId] > 0) res = true;
        return res;
    }
    
    function buyMarketSale (
        address nftContract,
        uint256 itemId
    ) public nonReentrant {
        uint256 price = idToMarketItem[itemId].price;
        uint256 collectionId = idToMarketItem[itemId].collectionId;
        uint256 tokenId = idToMarketItem[itemId].tokenId;
        uint256 limits = NFT(nftContract).getCollectionInfoByCid(collectionId).limits;
        require(isAllowed(msg.sender, collectionId), "sender is not allowed with this collection");
        require(
            m_mapAddressToOwns[msg.sender][collectionId] <= limits, 
            "item count owned by owner is overflow limited count"
        );
        payWithADMC(nftContract, idToMarketItem[itemId].seller, buyingPrice(itemId));// pay adamant coin to seller.
        IERC721(nftContract).transferFrom(address(this), msg.sender, tokenId);
        idToMarketItem[itemId].owner = payable(msg.sender);
        idToMarketItem[itemId].sold = true;
        m_mapAddressToOwns[msg.sender][collectionId] += 1;
        if(m_mapCidToCount[collectionId] > 0)
            m_mapCidToCount[collectionId] -= 1;
        _itemsSold.increment();
    }

    function buyingFee(uint256 itemId) public view returns(uint256) {
        uint256 price = idToMarketItem[itemId].price;
        uint256 fee = price / 100 / 2;
        return fee;
    }

    function buyingPrice(uint256 itemId) public view returns(uint256) {
        uint256 price = idToMarketItem[itemId].price;
        return price - buyingFee(itemId);
    }

    function payBuyingFeeToAdmin(
        address nftContract,
        uint256 itemId
    ) public nonReentrant {
        uint256 fee = buyingFee(itemId);
        payWithADMC(nftContract, owner, fee); // pay fee to owner with adamant coin.
    }

    function createMarketSale (
        address nftContract,
        uint256 itemId,
        uint256 price
    ) public nonReentrant {
        uint256 oldPrice = idToMarketItem[itemId].price;
        uint256 collectionId = idToMarketItem[itemId].collectionId;
        require(oldPrice != price, "updated price must be not same with old price");
        require(price > 100, "price must be set bigger than 100 ADMC");

        idToMarketItem[itemId].owner = payable(address(0));
        idToMarketItem[itemId].seller = payable(msg.sender);
        idToMarketItem[itemId].sold = false;
        idToMarketItem[itemId].price = price * 10**9;
        _itemsSold.decrement();
        m_mapAddressToOwns[msg.sender][collectionId] -= 1;
        m_mapCidToCount[collectionId] += 1;
    }

    function setListingPrice(uint256 price) public onlyByOwner nonReentrant{
        m_nListingPrice = price * 10**9;
    }

    function fetchMarketItems(uint collectionId) public view returns (MarketItem[] memory) {
        uint itemCount = _itemIds.current();
        uint currentIndex = 0;
        MarketItem[] memory items = new MarketItem[](m_mapCidToCount[collectionId]);
        for(uint i=0; i<itemCount; i++) {
            if(idToMarketItem[i+1].owner == address(0) && 
                idToMarketItem[i+1].collectionId == collectionId) {
                uint currentId = idToMarketItem[i+1].itemId;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] =currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchMyNFTS(uint collectionId) public view returns (MarketItem[] memory){
        uint totalItemCount = _itemIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        for(uint i=0; i<totalItemCount; i++){
            if(idToMarketItem[i+1].owner == msg.sender && 
                idToMarketItem[i+1].collectionId == collectionId) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for(uint i=0; i<totalItemCount; i++){
            if(idToMarketItem[i+1].owner == msg.sender &&
                idToMarketItem[i+1].collectionId == collectionId){
                uint currentId = idToMarketItem[i+1].itemId;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function fetchItemsCreated(uint collectionId) public view returns (MarketItem[] memory){
        uint totalItemCount = _itemIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;
        for(uint i=0; i<totalItemCount; i++) {
            if( idToMarketItem[i+1].seller == msg.sender &&
                idToMarketItem[i+1].collectionId == collectionId) {
                itemCount += 1;
            }
        }

        MarketItem[] memory items = new MarketItem[](itemCount);
        for(uint i=0; i<totalItemCount; i++){
            if(idToMarketItem[i+1].seller == msg.sender &&
                idToMarketItem[i+1].collectionId == collectionId){
                uint currentId = idToMarketItem[i+1].itemId;
                MarketItem storage currentItem = idToMarketItem[currentId];
                items[currentIndex] = currentItem;
                currentIndex += 1;
            }
        }
        return items;
    }

    function getItemCountOwnedByAccount(uint256 collectionId) public view returns(uint256){
        return m_mapAddressToOwns[msg.sender][collectionId];
    }

    function getCreatedItemCountForCollection(uint256 collectionId) public view returns(uint256){
        return m_mapCidToCount[collectionId];
    }

    function getListingPrice() public view returns (uint256) {
        return m_nListingPrice;
    }

    function getCurrentItemId() public view returns (uint256) {
        return _itemIds.current();
    }
}