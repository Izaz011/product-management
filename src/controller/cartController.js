const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const usermodel = require("../models/usermodel");
const { isValidObjectId } = require("../validator/validation");

//............................................................. POST API .............................................................................

const createCart = async function (req, res) {
  try {
      if (Object.keys(req.body).length == 0) {
          return res.status(400).send({ status: false, message: "Please add product to the cart" });
       }
  
      
      let {productId, quantity, totalPrice, totalItems} = req.body;
      let {userId}= req.params
      if(req.body.userId){
          if(req.decodedToken.id!=req.body.userId){
              return res.status(403).send({status:false, message:"not authorized user"})
          }
      }
     
      if(userId){
          if (!isValidObjectId(userId)) {
              return res.status(400).send({ status: false, message: "userId is not valid id" });
              
          }
      }
      
      if(!quantity){
       quantity=1}
  
      if(isNaN(quantity)){
          return res.status(400).send({status:false, message:"please provide valid quantity"})
      }
      if (quantity <= 0) {
         return res.status(400).send({ status: false, message: "Please enter the quantity of the product atleast 1" });
      
      }
      quantity= Number(quantity)

      if(!productId){
        return res.status(400).send({status:false, message:"Please enter productId inside body"})
      }

      if (!isValidObjectId(productId)) {
          return res.status(400).send({ status: false, message: "Please enter valid productId" });
          
      }
      let findProduct= await productModel.findOne({_id:productId, isDeleted:false})
      if(!findProduct){
          return res.status(404).send({status:false, message: "this product does not exist ."})
      }
      
      let carted= await cartModel.findOne({userId:userId})
      if(req.body.cartId){
          if(req.body.cartId!=carted._id){
              return res.status(400).send({status:false, message:"cartId is not correct"})
          }
      }
      
      if(carted){
      if(carted.items.find((ele)=>ele.productId==productId)){
              
               
              totalItems= carted.items.length
              totalPrice= carted.totalPrice+(findProduct.price)*quantity

         
      for(let i=0; i<carted.items.length; i++){
      if(carted.items[i].productId==productId){
      carted.items[i]={
          productId:productId,
          quantity:carted.items[i].quantity+quantity
      }

      let updates= await cartModel.findOneAndUpdate({_id:carted._id},{ items:carted.items, totalPrice:totalPrice, totalItems:totalItems},{new:true})
      return res.status(200).send({status:true, message:"Success", data:updates})
          }}}

      let obj={
          productId:productId,
          quantity:quantity
      }
      totalPrice= carted.totalPrice+(findProduct.price)*quantity
      totalItems= carted.totalItems+1
      let updatedCart= await cartModel.findOneAndUpdate({_id:carted._id},{$push:{items:obj},totalPrice:totalPrice, totalItems:totalItems},{new:true})
      return res.status(200).send({status:true, message:"Success", data:updatedCart})
      }
      else{
      let store= {
      userId:userId,
      items:[{
          productId:productId,
          quantity:quantity
      }],
      totalPrice:findProduct.price*quantity,
      totalItems: 1
      }
      
      let newcart= await cartModel.create(store)
      return res.status(201).send({status:true, message:"Success", data:newcart})
      }}
  catch (err) {
      res.status(500).send({ status: false, message: err.message })
  }
}

//............................................................. UPDATE API .............................................................................


const updateCart=async function(req,res){
  try{
   const data=req.body
   const {cartId,productId,removeProduct}=data 
   const userId=req.params.userId

   if(Object.keys(data).length==0){
    return res.status(400).send({status:false,message:" body is empty,please provide valid body"})
   }

   if(!cartId){
    return res.status(400).send({status:false,message:"please provide cart ID"})
   }

   if(!isValidObjectId(cartId)){
    return res.status(400).send({status:false,message:"please provide valid cart ID"})
   }

   const cart=await cartModel.findById(cartId)

   if(!cart){
    return res.status(404).send({status:false,message:"cart does not exist"})
   }
   if(cart.userId.toString()!==userId){
    return res.status(400).send({status:false,message:"user invalid"})
   }

   if(!productId){
    return res.status(400).send({status:false,message:"please provide product ID"})
   }

   if(!isValidObjectId(productId)){
    return res.status(400).send({status:false,message:"please provide valid product ID"})
   }

   const product=await productModel.findOne({_id:productId,isDeleted:false})

   if(!product){
    return res.status(404).send({status:false,message:"product does not exist"})
   }
   if(!removeProduct && removeProduct!==0){
    return res.status(400).send({status:false,message:"please provide remove product"})
   }

  if(!([1,0]).includes(removeProduct)){
    return res.status(400).send({status:false,message:"please provide valid remove product"})
  }

  if(removeProduct==1){
    if(cart.items.length==0){
      return res.status(404).send({status:false,message:"you can not update an empty cart"}) 
    }
    for(let i=0;i<cart.items.length;i++){
      if(cart.items[i].productId==productId){
        if(cart.items[i].quantity==1){
          const updatedCart=await cartModel.findByIdAndUpdate(
            cartId,
           {$pull:{"items":{productId:productId}},$inc:{totalPrice:-product.price,totalItems:-1}},
            {new:true}
        )
      return res.status(200).send({status:true,message:"updated Successfully",data:updatedCart})
      }
      else if(cart.items[i].quantity>1){
        const updatedCart=await cartModel.findOneAndUpdate(
          {_id:cartId,"items.productId":productId},
          {$inc:{"items.$.quantity":-1,totalPrice:-product.price}},
          {new:true}
        )
        return res.status(200).send({status:true,message:"updated Successfully",data:updatedCart})
       }
    }
    else if(i==cart.items.length-1){
      return res.status(404).send({status:false,message:"this product does not exist in this cart"})
    }
  }
    }

  if(removeProduct==0){
    if(cart.items.length==0){
      return res.status(404).send({status:false,message:"you can not update an empty cart"}) 
    }
    for(let i=0;i<cart.items.length;i++)
    if(cart.items[i].productId==productId){
        const updatedCart=await cartModel.findByIdAndUpdate(
          cartId,
         {$pull:{"items":{productId:productId}},$inc:{totalPrice:(-cart.items[i].quantity)*(product.price),totalItems:-1}},
          {new:true}
          )
          return res.status(200).send({status:true,message:"updated Successfully",data:updatedCart})
    }
    else if(i==cart.items.length-1){
      return res.status(404).send({status:false,message:"this product does not exist in this cart"})
    }
  }}
 catch(err){
return res.status(500).send({status:false, message:err.message})
}}


//............................................................. GET API .............................................................................


const getCartDetails = async function (req, res) {
  try {
      let userId = req.params.userId;

      //checking if the cart exist with this userId or not
      let findCart = await cartModel.findOne({ userId: userId }).populate({ path: "items.productId", select: { price: 1, title: 1, productImage: 1, _id: 0 } })
      if (!findCart)return res.status(404).send({ status: false, message: `No cart found with given userId` });

      res.status(200).send({ status: true, message: "Success", data: findCart });
  } catch (err) {
      res.status(500).send({ status: false, message: err.message});
    }
};


//............................................................. DELETE API .............................................................................

const deleteCart = async function(req,res){
  try{
      let userId = req.params.userId
    
      const cardExist = await cartModel.findOneAndUpdate({userId:userId},{$set:{totalItems:0,totalPrice:0,items:[],deletedAt:new Date()}});
      console.log(cardExist)
      if(cardExist)return res.status(204).send({status:true,message:"Success",data:cardExist})
      else{ return res.status(404).send({status:true,message:"not found"})}

  }catch(err){
      return res.status(500).send({ status: false, message: err.message })
    }
}

module.exports= {createCart,updateCart,getCartDetails, deleteCart}