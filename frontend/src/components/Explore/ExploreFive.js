import React, { Component } from 'react';
import { nftmarketaddress, nftaddress, coinaddress } from '../../config';
import admcabi from "../../artifacts/contracts/Adamant.sol/Adamant.json";
import Button from '@mui/material/Button';
import nftabi from "../../artifacts/contracts/NFT.sol/NFT.json";
import marketabi from "../../artifacts/contracts/NFTMarket.sol/NFTMarket.json";
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { ethers } from 'ethers';
import { getContract } from '../../export/export';

// const initData = {
//     pre_heading: "Explore",
//     heading: "Exclusive Digital Assets",
//     content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Laborum obcaecati dignissimos quae quo ad iste ipsum officiis deleniti asperiores sit."
// }

class ExploreFive extends Component {
    state = {
        initData: {},
        data: [],
        collectionItems: [],
        boughtItems: [],
        mintedItems: [],
        inputValue: 0,
        selectItemId: 0,
        startProgress: false,
        clicked: false
    }

    componentDidMount = async () => {
        this.setState({
            // initData: initData
        });
        this.onCreateNFT = this.onCreateNFT.bind(this);
        await this.loadCollections();
    }

    loadCollections = async () => {
        let contractMarket = await getContract(nftmarketaddress, marketabi.abi);
        let contractToken = await getContract(nftaddress, nftabi.abi);
        let collections = await contractToken.fetchCollections();
        let items = await Promise.all(collections.map(async (collection) => {
            let curCount = await contractMarket.getCreatedItemCountForCollection(collection.id);
            let owns = await contractMarket.getItemCountOwnedByAccount(collection.id);
            let mints = await contractToken.fetchMyNFTS(collection.id);
            // console.log(collection.id, ": mint length:", mints.length);
            let citem = {
                id: collection.id,
                name: collection.name,
                uri: collection.collectionUri,
                currentMints: curCount.toNumber(),
                totalMints: collection.totalMints.toNumber(),
                limits: collection.limits.toNumber(),
                ownedCount: owns.toNumber() + mints.length
            }
            return citem;
        }));
        console.log("collections:", items);
        this.setState({ collectionItems: items });
    }

    loadNFTs = async (collectionId) => {
        let contractMarket = await getContract(nftmarketaddress, marketabi.abi);
        let contractToken = await getContract(nftaddress, nftabi.abi);
        let data = await contractMarket.fetchMyNFTS(collectionId);
        let items = await Promise.all(data.map(async i => {
            let cinfo = await contractToken.getCollectionInfoByCid(i.collectionId);
            let item = {
                collectionId: i.collectionId.toNumber(),
                name: cinfo.name,
                itemId: i.itemId.toNumber(),
                tokenId: i.tokenId.toNumber(),
                uri: cinfo.collectionUri,
                seller: i.seller,
                owner: i.owner,
                price: i.price
            }
            return item;
        }));
        this.setState({
            boughtItems: items,
            clicked: true
        });

        data = await contractToken.fetchMyNFTS(collectionId);
        console.log("my nfts:", data);
        items = await Promise.all(data.map(async i => {
            let cinfo = await contractToken.getCollectionInfoByCid(i.collectionId);
            let item = {
                collectionId: i.collectionId.toNumber(),
                name: cinfo.name,
                tokenId: i.tokenId.toNumber(),
                uri: cinfo.collectionUri,
                owner: i.owner
            }
            return item;
        }));
        this.setState({
            mintedItems: items
        });
        // console.log("minted items:", items);
    }

    onCreateNFT = async (itemInfo, idx) => {
        let contractMarket = await getContract(nftmarketaddress, marketabi.abi);
        this.setState({
            selectItemId: idx,
            startProgress: true
        });
        let transaction = await contractMarket.createMarketSale(nftaddress, itemInfo.itemId, this.state.inputValue);
        let tx = await transaction.wait();
        console.log("transaction:", tx);
        this.setState({ startProgress: false });
        await this.sleep(1000);
        this.loadNFTs(itemInfo.collectionId);
    }

    onCreateMarketItem = async (itemInfo, idx) => {
        let contractMarket = await getContract(nftmarketaddress, marketabi.abi);
        let contractCoin = await getContract(coinaddress, admcabi.abi);
        this.setState({
            selectItemId: idx,
            startProgress: true
        });

        let listingPrice = await contractMarket.getListingPrice();
        let transaction = await contractCoin.approve(nftmarketaddress, listingPrice.toNumber());
        await transaction.wait();

        console.log("item info:", itemInfo);
        console.log("input value:", this.state.inputValue);
        transaction = await contractMarket.createMarketItem(nftaddress, itemInfo.tokenId, 
                                                            itemInfo.collectionId, this.state.inputValue);
        let contractNft = await getContract(nftaddress, nftabi.abi);
        let test = await contractNft.statusForToken(itemInfo.tokenId);
        console.log("exist:", test);
        await transaction.wait();
        this.setState({ startProgress: false });
        await this.sleep(1000);
        this.loadNFTs(itemInfo.collectionId);
    }

    sleep = async (milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }
    onTextChange = async (evt) => {
        this.setState({ inputValue: parseInt(evt.target.value) });
    }
    onCollectionItemClick = async (item) => {
        this.loadNFTs(item.id);
    }
    render() {
        return (
            <section className="explore-area">
                <div className="container">
                    <div className="row">
                        <div className="col-12">
                            {/* Intro */}
                            <div className="intro d-flex justify-content-between align-items-end m-0">
                                {/* <div className="intro-content">
                                    <span>{this.state.data.preHeading}</span>
                                    <h3 className="mt-3 mb-0">{this.state.data.heading}</h3>
                                </div> */}
                                <div className="intro-btn">
                                    <a className="btn content-btn" href="/sell-assets">{this.state.data.btnText}</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row items">
                        {
                            this.state.clicked === false ?
                                this.state.collectionItems.map((item, idx) => {
                                    return (
                                        <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                            <div className="card border-effect ap_anim">
                                                <div className="image-over" onClick={() => this.onCollectionItemClick(item)}>
                                                    <img className="card-img-top" src={item.uri} alt="" />
                                                </div>
                                                {/* Card Caption */}
                                                <div className="card-caption col-12 p-0">
                                                    {/* Card Body */}
                                                    <div className="card-body">
                                                        <a href="/item-details" style={{ display: "flex", justifyContent: "center" }}>
                                                            <h5 className="mb-0">{item.name}</h5>
                                                        </a>
                                                        <div className="seller align-items-center my-3" style={{ display: "flex", justifyContent: "center" }}>
                                                            <h3>{item.ownedCount}</h3>
                                                        </div>
                                                        {/* { item.auctionInterval===0?
                                                        <div style={{display:"flex", justifyContent:"center"}}>
                                                            <button className="btn btn-bordered-white btn-smaller mt-3" onClick={() => this.onBuyNFT(item.tokenId, item.price)}>Buy</button>
                                                        </div>:
                                                        <div>
                                                            <input type="text" className="form-control" name="name" required="required" style={{backgroundColor:"#13172b"}} onChange={this.onTextChange}/>
                                                            <a className="btn btn-bordered-white btn-smaller mt-3" href="/wallet-connect"><i className="icon-handbag mr-2" />Place bid</a>
                                                        </div>
                                                    } */}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) :
                                <>
                                    {
                                        this.state.boughtItems.map((item, idx) => {
                                            return (
                                                <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                                    <div className="card border-effect ap_anim">
                                                        <div style={{ padding: "0px" }}>
                                                            <span><h5>{item.name} #{item.tokenId}</h5></span>
                                                        </div>
                                                        <div className="image-over">
                                                            <img className="card-img-top" src={item.uri} alt="" />
                                                        </div>
                                                        {/* Card Caption */}
                                                        <div className="card-caption col-12 p-0">
                                                            {/* Card Body */}
                                                            <div className="card-body" style={{ padding: "7px" }}>
                                                                {(this.state.startProgress && this.state.selectItemId === idx) ?
                                                                    <div className="col-12" style={{ display: 'flex', justifyContent: "center" }}>
                                                                        <CircularProgress />
                                                                    </div> : null
                                                                }
                                                                <div style={{ display: "flex", justifyContent: "center" }}>
                                                                    <span style={{ marginLeft: "20px" }}>{item.price.div(ethers.BigNumber.from(Math.pow(10, 9))).toNumber()} ADMC</span>
                                                                </div>
                                                                <div style={{ display: "flex", justifyContent: "center" }}>
                                                                    <input type="text" className="form-control" name="input" placeholder="Unit: ADMC" required="required" onChange={(e) => this.onTextChange(e)} />
                                                                </div>
                                                                <div style={{ display: "flex", justifyContent: "center" }}>
                                                                    <Button variant="contained" name="listing-price" style={{ marginTop: "5px", width: "100px" }} onClick={() => this.onCreateNFT(item, idx)}>Create</Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                    {
                                        this.state.mintedItems.map((item, idx) => {
                                            return (
                                                <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                                    <div className="card border-effect ap_anim">
                                                        <Stack spacing={1} alignItems="center">
                                                            <Stack direction="row" spacing={1}>
                                                                <Chip label="New" color="primary" />
                                                            </Stack>
                                                        </Stack>
                                                        <div style={{ padding: "0px" }}>
                                                            <span><h5>{item.name} #{item.tokenId}</h5></span>
                                                        </div>
                                                        <div className="image-over">
                                                            <img className="card-img-top" src={item.uri} alt="" />
                                                        </div>
                                                        {/* Card Caption */}
                                                        <div className="card-caption col-12 p-0">
                                                            {/* Card Body */}
                                                            <div className="card-body" style={{ padding: "7px" }}>
                                                                {(this.state.startProgress && this.state.selectItemId === idx) ?
                                                                    <div className="col-12" style={{ display: 'flex', justifyContent: "center" }}>
                                                                        <CircularProgress />
                                                                    </div> : null
                                                                }
                                                                <div style={{ display: "flex", justifyContent: "center" }}>
                                                                    <input type="text" className="form-control" name="input" placeholder="Unit: ADMC" required="required" onChange={(e) => this.onTextChange(e)} />
                                                                </div>
                                                                <div style={{ display: "flex", justifyContent: "center" }}>
                                                                    <Button variant="contained" name="listing-price" style={{ marginTop: "5px", width: "100px" }} onClick={() => this.onCreateMarketItem(item, idx)}>Create</Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </>
                        }
                    </div>
                </div>
            </section>
        );
    }
}

export default ExploreFive;