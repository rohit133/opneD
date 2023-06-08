import logo from "../../assets/logo.png";
import { Principal } from "@dfinity/principal";
import { Actor, HttpAgent } from "@dfinity/agent";
import React, { useEffect, useState } from "react";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";

import Button from "./Buttons";
import { opend } from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";


function Item(props) {


  const[name, setName] = useState();
  const[owner, setOwnerId] = useState();
  const[image, setImage] = useState();
  const[button, setButton] = useState();  
  const[priceInput, setPriceInput] = useState();
  const[loaderHidden, setLoader] = useState(true);
  const[blur, setBlur] = useState(); 
  const[isListedText, setIsListedText] = useState("");
  const[priceLabel, setPriceLabel] = useState();
  const[shouldDisplay, setDisplay] = useState(true);


  const id = props.id;
  let NFTActor;

  // Setting up the HTTP agent.
  const localhost = "http://localhost:8080/";
  const agent = new HttpAgent({ host: localhost });

  // TODO remove this line when depoying to the Live Internet computer. 
  agent.fetchRootKey();


  async function loadNFT(){
      NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId : id, 
    });

    // Setting up the username
    const name = await NFTActor.getName();
    setName(name);

    // Setting up the Owner ID
    const owner = await NFTActor.getOwner();
    setOwnerId(owner.toText());
    
    // Setting up the Image Data
    const imageData = await NFTActor.getAsset();
    const imageContent =new Uint8Array(imageData);
    const image = URL.createObjectURL(
      new Blob([imageContent.buffer], { type : "image/png" })
    );
    setImage(image)
    if(props.role == "collection"){
      const nftIsListed = await opend.isListed(props.id);
      if(nftIsListed){
        setOwnerId("OpenD"); 
        setBlur({filter:"blur(4px)"});
        setIsListedText("Listed");

      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"}/>)
      }
    } else if(props.role == "discover"){
      const originalOwner = await opend.getOriginalOwner(props.id);
      
      if(originalOwner.toText() != CURRENT_USER_ID.toText()){
        setButton(<Button handleClick={handleBuy} text={"Buy"}/>)
      }

      const price = await opend.getListedNFTPrice(props.id);
      setPriceLabel(<PriceLabel sellPrice={price.toString()}/>);
    }
    

  }   
  
  useEffect(() => {
    loadNFT();
  }, []);
  

  let price;
  function handleSell() {
    setPriceInput()
    console.log("sell Clicked");
    setPriceInput(<input
      placeholder="Price in RDC"
      type="number"
      className="price-input"
      value={price}
      onChange={(e) => price=e.target.value}
      />
      );

    setButton(<Button handleClick={sellItem} text={"Confirm"}/>)


    async function sellItem(){
      setBlur({filter:"blur(4px)"});
      setLoader(false)
      console.log("Confirm Clicked");
      const lisitngResult = await opend.listItem(props.id, Number(price)) 
      console.log(`Listing Price : ${lisitngResult}`);
      if(lisitngResult == "Success"){
        const openDId = await opend.getOpenDCanisterID();
        const transferResult = await NFTActor.transferOwnership(openDId)
        console.log(`Transfer : ${transferResult}`);
        if(transferResult == 'Success'){
          setLoader(true);
          setButton(); 
          setPriceInput();
          setOwnerId("OpenD");
          setIsListedText("Listed");
        }
      }
    }
  };

  async function handleBuy(){
    setLoader(false)
    console.log("Buy Clicked");
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText("renrk-eyaaa-aaaaa-aaada-cai")
    })
    const sellerId = await opend.getOriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);
    const result = await tokenActor.transfer(sellerId, itemPrice)
    if(result == "Success"){
      const transferResult = await opend.completePurchase(
        props.id, 
        sellerId, 
        CURRENT_USER_ID
      );
      console.log(`Purchase : ${transferResult}`);
      setLoader(true)
      setDisplay(false)
    } 

  } 

  
  return (
    <div style={{display : shouldDisplay ? "inline" : "none" }} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}
            <span className="purple-text"> {isListedText}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner : {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
