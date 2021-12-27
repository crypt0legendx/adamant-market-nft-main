import React, { Component } from 'react';
import eventBus from "../../EventBus";
import {getContract} from '../../export/export';
import CircularProgress from '@mui/material/CircularProgress';
import Selector from '../Selector/Select';

import {nftmarketaddress, nftaddress, coinaddress} from '../../config';
import admcabi from "../../artifacts/contracts/Adamant.sol/Adamant.json";
import nftabi from "../../artifacts/contracts/NFT.sol/NFT.json";
import marketabi from "../../artifacts/contracts/NFTMarket.sol/NFTMarket.json";

class Create extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedFile: null,
            selectedName: "Choose file",
            fileURL: null,
            count: 0,
            startProgress: false,
            checkState: 1,
            status:'Please create NFT Items',
            items: [],
            metadata:{
                collectionId: 0,
                auctionInterval: 0
            }
        };
    }
    
    async componentDidMount() {
        let items = await this.getCollectionTypes();
        this.setState({items: items});
    }

    componentWillUnmount() {
    }

    onTextChange = (evt) => {
        if(evt.target.name == "auction_interval")
            this.setState(ps => ({...ps, metadata:{...ps.metadata, auctionInterval: parseInt(evt.target.value)}}));
    }

    onRadioClick = (evt) => {
        this.setState({checkState: evt.target.value});
    }

    onHandleChange = (evt) => {
        this.setState(ps => ({...ps, metadata:{...ps.metadata, collectionId: parseInt(evt.target.value)}}));
    }

    getLastItemId = async() => {
        let contract = await getContract(nftaddress, nftabi.abi);
        let lastId = await contract.getTokenCount();
        return lastId;
    }

    sleep = async(milliseconds) => {
        return new Promise(resolve => setTimeout(resolve, milliseconds))
    }

    getCollectionTypes = async () => {
        let contract = await getContract(nftaddress, nftabi.abi);
        let collectionItems = await contract.fetchCollections();
        let items = collectionItems.map((item)=>{
            return item.name
        });
        return items;
    }

    onMintNFT = async() => {
        if(this.state.metadata.collectionId < 1){
            alert("Please choose a collection type"); return;
        }        
        let contractNft = await getContract(nftaddress, nftabi.abi);
        let contractCoin = await getContract(coinaddress, admcabi.abi);

        let cid = this.state.metadata.collectionId;
        let cinfo = await contractNft.getCollectionInfoByCid(cid);
        let currentMints = await contractNft.getCurrentCountForCollection(cid);
        let currentCount = await contractNft.getCurrentTokenId();
        if(cinfo.limits.toNumber() <= currentMints.toNumber()) {
            alert("Current Owned Count exceeds the limited number of minting."); return;
        }
        if(cinfo.totalMints.toNumber() <= currentCount.toNumber()) {
            alert("Current minting count overflows total supply for this collection."); return;
        }

        let owner = await contractNft.getOwner();
        owner = String(owner).toString().toLowerCase();
        let selected = localStorage.getItem('select-address').toLowerCase();
        if( selected === owner ){
            alert('admin cant mint a nft item and create a market item.'); return;
        }

        this.setState({
            startProgress:true,
            status: 'Approving from nft contract ... ...'
        });
        cinfo = await contractNft.getCollectionInfoByCid(cid);

        let transaction = await contractCoin.approve(nftaddress, cinfo.price.toNumber());
        let tx = await transaction.wait();
        console.log("transaction for approving:", tx);

        this.setState({
            status: 'Minting a NFT Item ... ...'
        });
        transaction = await contractNft.mintToken(cid);
        tx = await transaction.wait();
        console.log("transaction for minting a nft:", tx);

        eventBus.dispatch("balance-changed", {account: localStorage.getItem('select-address')});

        this.setState({
            startProgress:false,
            status: 'Successfully completed.'
        });

        // let listingPrice = await contractMarket.getListingPrice();
        // transaction = await contractCoin.approve(nftmarketaddress, listingPrice.toNumber());
        // tx = await transaction.wait();
        // console.log("transaction for approving:", tx);

        // this.setState({
        //     status: 'Creating a market item ... ...'
        // });
        // let currentId = await contractNft.getCurrentTokenId();
        // transaction = await contractMarket.createMarketItem(nftaddress, currentId, cid);
        // tx = await transaction.wait();
        // console.log("transaction for creating a market item:", tx);
        // eventBus.dispatch("balance-changed", {account: localStorage.getItem('select-address')});
        // this.setState({
        //     startProgress: false,
        //     status: 'Successfully created a NFT as market item'
        // });
    }
    render() {
        return (
            <section className="author-area create_body">
                <div className="container">
                    <div className="row" style={{display:"flex", justifyContent:"center"}}>
                        <div className="col-12 col-md-6">
                            <div className="intro mt-5 mt-lg-0 mb-4 mb-lg-5">
                                <div className="intro-content">
                                    <span>Get Started</span>
                                    <h3 className="mt-3 mb-0">Create NFT</h3>
                                </div>
                            </div>
                            <div className="item-form card no-hover create_item_body">
                                <div className="row">
                                    <div className="col-12">
                                        <div className="form-group mt-3" style={{display:"flex", justifyContent:"center"}}>
                                            <span>{this.state.status}</span>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-12">
                                        <div className="form-group">
                                            <Selector  name="collection_type" selectorName="Collection Type" items={this.state.items} handleChange={this.onHandleChange}/>
                                        </div>
                                    </div>
                                    {/* <div className="col-12 col-md-12">
                                        <div className="form-group">
                                            <input type="text" className="form-control" name="price" placeholder="Sale Price" required="required"  onChange={this.onTextChange}/>
                                        </div>
                                    </div> */}
                                    { this.state.checkState === "2" ?
                                        <div className="col-12">
                                            <div className="form-group">
                                                <input type="text" className="form-control" name="auction_interval" placeholder="Auction Interval" required="required"  onChange={this.onTextChange}/>
                                            </div>
                                        </div> : null
                                    }
                                    {/* <div className="col-12">
                                        <div className="form-group mt-3">
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio1" value="1" onChange={(e) => this.setState({checkState: e.target.value})} defaultValue="option1" defaultChecked/>
                                                <label className="form-check-label" htmlFor="inlineRadio1">Instant Sale</label>
                                            </div>
                                            <div className="form-check form-check-inline">
                                                <input className="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio2" value="2" onChange={(e) => this.setState({checkState: e.target.value})} defaultValue="option2"/>
                                                <label className="form-check-label" htmlFor="inlineRadio2">Auction Price</label>
                                            </div>
                                        </div>
                                    </div> */}
                                    { (this.state.startProgress)?
                                        <div className="col-12" style={{display:'flex', justifyContent:"center"}}>
                                            <CircularProgress />
                                        </div>:null
                                    }
                                    <div className="col-12">
                                        <button className="btn w-100 mt-3 mt-sm-4" onClick={this.onMintNFT}>Create NFT</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}
export default Create;