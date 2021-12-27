import React, { Component } from 'react';
import axios from 'axios';
import {nftmarketaddress, nftaddress, coinaddress} from '../../config';
import nftabi from "../../artifacts/contracts/NFT.sol/NFT.json";
import marketabi from "../../artifacts/contracts/NFTMarket.sol/NFTMarket.json";
import admcabi from "../../artifacts/contracts/Adamant.sol/Adamant.json";
import { ethers } from 'ethers';
import {getContract} from '../../export/export';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
const BASE_URL = "https://my-json-server.typicode.com/themeland/netstorm-json/explore";

class SellAssetCmp extends Component {
    state = {
        data: {},
        exploreData: [],
        collectionItems: [],
        nftItems: [],
        selectItemId: 0,
        startProgress: false,
        clicked: false
    }
    componentDidMount = async() => {
        this.onBuyNFT = this.onBuyNFT.bind(this);
        axios.get(`${BASE_URL}`)
            .then(res => {
                this.setState({
                    data: {},
                    exploreData: []
                })
            })
        .catch(err => console.log(err))
        await this.loadCollections();
    }
    loadCollections = async() => {
        let contractMarket = await getContract(nftmarketaddress, marketabi.abi);
        let contractToken = await getContract(nftaddress, nftabi.abi);
        let collections = await contractToken.fetchCollections();
        let items = await Promise.all(collections.map( async(collection) => {
            let curCount = await contractMarket.getCreatedItemCountForCollection(collection.id);
            let citem = {
                id: collection.id,
                name: collection.name,
                uri: collection.collectionUri,
                currentMints: curCount.toNumber(),
                totalMints: collection.totalMints.toNumber(),
                limits: collection.limits.toNumber()
            }
            return citem;
        }));
        console.log("collections:", items);
        this.setState({collectionItems: items});
    }
    loadNFTs = async(collectionId) => {
        let contractMarket = await getContract(nftmarketaddress, marketabi.abi);
        let contractToken = await getContract(nftaddress, nftabi.abi);
        let data = await contractMarket.fetchMarketItems(collectionId);
        console.log("my data:", data);
        const items = await Promise.all(data.map(async i => {
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
            nftItems: items,
            clicked: true
        });
    }
    onBuyNFT = async(itemInfo, idx) => {
        let currentWallet = localStorage.getItem('select-address').toLowerCase();
        let select = String(itemInfo.seller).toLowerCase();
        if(currentWallet == select){
            alert("you are a seller, so you cant buy your nft by yourself.");
            return;
        }
        let contractMarket = await getContract(nftmarketaddress, marketabi.abi);
        let contractCoin = await getContract(coinaddress, admcabi.abi);
        let buyingFee = await contractMarket.buyingFee(itemInfo.itemId);
        let buyingPrice = await contractMarket.buyingPrice(itemInfo.itemId);

        console.log("seller:", itemInfo.seller);
        console.log("buyingFee:", buyingFee.toNumber());
        console.log("buyingPrice:", buyingPrice.toNumber());

        this.setState({
            selectItemId: idx,
            startProgress: true
        });

        console.log(buyingPrice.toNumber()+","+buyingFee.toNumber());
        let transaction = await contractCoin.approve(nftmarketaddress, buyingPrice.toNumber());
        let tx = await transaction.wait();
        console.log("transaction for approving:", tx);

        transaction = await contractMarket.buyMarketSale(nftaddress, itemInfo.itemId);
        tx = await transaction.wait();
        console.log("transaction:", tx);

        transaction = await contractCoin.approve(nftmarketaddress, buyingFee.toNumber());
        tx = await transaction.wait();
        console.log("transaction for approving:", tx);

        transaction = await contractMarket.payBuyingFeeToAdmin(nftaddress, itemInfo.itemId);
        tx = await transaction.wait();
        console.log("transaction:", tx);

        this.setState({startProgress:false});
        await this.sleep(1000);
        this.loadNFTs(itemInfo.collectionId);
    }
    sleep = async(milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }
    onCollectionItemClick = async(item) => {
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
                        { this.state.clicked == false? 
                            this.state.collectionItems.map((item, idx) => {
                                return (
                                    <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                        <div className="card border-effect ap_anim">
                                            <div className="image-over" onClick={()=>this.onCollectionItemClick(item)}>
                                                <img className="card-img-top" src={item.uri} alt="" />
                                            </div>
                                            {/* Card Caption */}
                                            <div className="card-caption col-12 p-0">
                                                {/* Card Body */}
                                                <div className="card-body">
                                                    <a href="/item-details"  style={{display:"flex", justifyContent:"center"}}>
                                                        <h5 className="mb-0">{item.name}</h5>
                                                    </a>
                                                    <div className="seller align-items-center my-3" style={{display:"flex", justifyContent:"center"}}>
                                                        <span>{item.currentMints} / {item.totalMints}</span>
                                                        <span style={{marginLeft:"20px"}}> limits: {item.limits}</span>
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
                            }): this.state.nftItems.map((item, idx) => {
                                return (
                                    <div key={idx} className="col-12 col-sm-6 col-lg-3 item">
                                        <div className="card border-effect ap_anim">
                                            <div style={{padding:"0px"}}>
                                                <span><h5>{item.name} #{item.tokenId}</h5></span>
                                            </div>
                                            <div className="image-over">
                                                <img className="card-img-top" src={item.uri} alt="" />
                                            </div>
                                            {/* Card Caption */}
                                            <div className="card-caption col-12 p-0">
                                                {/* Card Body */}
                                                <div className="card-body" style={{padding:"7px"}}>
                                                { (this.state.startProgress && this.state.selectItemId == idx)?
                                                    <div className="col-12" style={{display:'flex', justifyContent:"center"}}>
                                                        <CircularProgress />
                                                    </div>:null
                                                }
                                                    <div style={{display:"flex", justifyContent:"center"}}>
                                                        <span style={{marginLeft:"20px"}}>{item.price.div(ethers.BigNumber.from(Math.pow(10,9))).toNumber()} ADMC</span>
                                                    </div>
                                                    <div style={{display:"flex", justifyContent:"center"}}> 
                                                        <Button variant="contained" name="listing-price" style={{marginTop:"5px", width:"100px"}} onClick={()=>this.onBuyNFT(item, idx)}>Buy</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })                            
                        }
                    </div>
                </div>
            </section>
        );
    }
}

export default SellAssetCmp;