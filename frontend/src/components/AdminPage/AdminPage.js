import React, { Component } from 'react';
import Button from '@mui/material/Button';
import {getContract} from '../../export/export';
import {nftmarketaddress, nftaddress} from '../../config';
import nftabi from "../../artifacts/contracts/NFT.sol/NFT.json";
import marketabi from "../../artifacts/contracts/NFTMarket.sol/NFTMarket.json";
import Selector from '../Selector/Select';
import axios from 'axios';

const initData = {
    pre_heading: "Administrator",
    heading: "Only admin can set up specific items",
    content: "Please set price with ADMC coin."
}

class AdminPage extends Component {
    state = {
        initData: {},
        mintingPrice: 0,
        listingPrice: 0,
        buyingFee: 0.0,
        accountAddress:'',
        items: [],
        selectedItem:[],
        selectedFile: null,
        selectedName:'',
        fileURL: null,
        disable: false
    }

    componentDidMount = async() => {
        let contract = await getContract(nftaddress, nftabi.abi);
        let contractMarket = await getContract(nftmarketaddress, marketabi.abi);
        let collectionItems = await contract.fetchCollections();
        let citems = collectionItems.map((item)=>{
            return item.name
        });
        // console.log(contractMarket);
        let disableForSelect = await contractMarket.isSettedCollectionId();
        this.setState({
            initData: initData,
            items: citems,
            disable: disableForSelect
        });
    }

    onTextChange = (evt) => {
        let name = evt.target.name;
        if(name === "minting-price"){
            this.setState({mintingPrice:parseInt(evt.target.value)});
        }else if(name === "listing-price"){
            this.setState({listingPrice:parseInt(evt.target.value)});
        }else if(name === "account-address"){
            this.setState({accountAddress:evt.target.value});
        }
    }

    onSet = async(evt) => {
        let name = evt.target.name;
        if(name === "minting-price"){
            let contract = await getContract(nftaddress, nftabi.abi);
            if(this.state.mintingPrice >= 100 && this.state.mintingPrice <= 1000000){
                let transaction = await contract.setMintingPrice(this.state.mintingPrice);
                await transaction.wait();
            }else {
                alert('Please set minting price again.'); return;
            }
        }else if(name === "listing-price"){
            let contract = await getContract(nftmarketaddress, marketabi.abi);
            if(this.state.listingPrice >= 100 && this.state.listingPrice <= 5000000){
                let transaction = await contract.setListingPrice(this.state.listingPrice);
                await transaction.wait();
            }else {
                alert('Please set listing price again.'); return;
            }
        }else if(name === "whitelist"){
        }
    }

    handleChange = (event) => {
        this.setState({
          selectedItem: event.target.value
        });
    }

    addWhiteList = async() => {
        var formData = new FormData();
        formData.append('selectedFile', this.state.selectedFile);
        formData.append('selectedName', this.state.selectedName);
        formData.append('fileURL', this.state.fileURL);

        let wallets = await axios.post("http://localhost:5000/whitelist", formData);
        if(wallets.data !== null && wallets.data.length > 0){
            console.log(wallets.data);
            let contract = await getContract(nftmarketaddress, marketabi.abi);
            let disableForSelect = await contract.isSettedCollectionId();
            if(!disableForSelect && this.state.selectedItem > 0){
                let transaction = await contract.setCollectionForWhitelist(this.state.selectedItem);
                await transaction.wait();
            }
            let transaction = await contract.addCollectionToWhitelist(wallets.data);
            await transaction.wait();
            console.log("disable:", disableForSelect);
            this.setState({
                disable: disableForSelect
            });    
        }
    }

    onFileChange = (evt) => {
        let file = evt.target.files[0];
        if(file) {
            let path = URL.createObjectURL(file);
            this.setState({ 
                selectedFile: file,
                selectedName: file.name,
                fileURL : path
            });
        }
    }

    render() {
        return (
            <section className="author-area create_body">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-12 col-md-8 col-lg-7">
                            {/* Intro */}
                            <div className="intro text-center">
                                <span>{this.state.initData.pre_heading}</span>
                                <h3 className="mt-3 mb-0">{this.state.initData.heading}</h3>
                                <p>{this.state.initData.content}</p>
                            </div>
                            {/* Item Form */}
                            <div id="contact-form" className="item-form card no-hover" method="POST" style={{backgroundColor:"#171d38"}}>
                                <div className="row">
                                    <div className="col-10">
                                        <div className="form-group mt-3">
                                            <input  type="text" className="form-control" name="listing-price" placeholder="Listing Price(100 ~ 5M ADMC)" onChange={this.onTextChange}/>
                                        </div>
                                    </div>
                                    <div className="col-2">
                                        <Button variant="contained" name="listing-price" style={{marginTop:"21px"}} onClick={this.onSet}>Set</Button>
                                    </div>
                                </div>
                            </div>
                            <div id="contact-form" className="item-form card no-hover mt-5" method="POST" style={{backgroundColor:"#171d38"}}>
                                <div className="row">
                                    <div className="col-12">
                                        <div className="input-group form-group">
                                            <div className="custom-file">
                                                <input type="file" className="custom-file-input" placeholder="Please select a file" onChange={(e)=>this.onFileChange(e)}/>
                                                <label className="custom-file-label" htmlFor="inputGroupFile01">{this.state.selectedName}</label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="form-group mt-3">
                                            <Selector  name="collection_type" selectorName="Collection Type" items={this.state.items} disable={this.state.disable} handleChange={this.handleChange}/>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <button className="btn w-100 mt-3 mt-sm-4" onClick={this.addWhiteList}>Add WhiteList</button>
                                    </div>
                                </div>
                            </div>
                            <p className="form-message" />
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}

export default AdminPage;