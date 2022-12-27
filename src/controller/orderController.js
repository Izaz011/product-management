const userModel = require("../models/usermodel");
const cartModel = require("../models/cartModel");
const orderModel = require("../models/orderModel");
const { isValidObjectId, isValidName } = require("../validator/validation");

//............................................................. POST API .............................................................................

const createOrder = async (req, res) => {
  try {
    let data = req.body;
    let UserId = req.params.userId;

    if (!data.cartId||!isValidName(data.cartId)) return res.status(400).send({ staus: false, message: "Please Provide CardId" });
    if (!UserId) return res.status(400).send({ staus: false, message: "Please Provide UserId" });

    
    if (!isValidObjectId(data.cartId)) return res.status(400).send({ status: false, message: "CartID is not valid" });
    if (!isValidObjectId(UserId)) return res.status(400).send({ status: false, message: "userID is not valid" });
    
    const checkUser = await userModel.findOne({ _id: UserId });
    if (!checkUser) return res.satus(404).send({ status: false, message: "User doesn't exist" });
      
    let cartDetail = await cartModel.findOne({ _id: data.cartId });
    if (!cartDetail) return res.status(404).send({ status: false, message: "Cart does not exist" });
    
    if (cartDetail.userId != UserId) return res.status(400).send({ status: false, message: "user Id does not match with cart's user id" });
    
    let obj = {};
    obj.userId = UserId;
    obj.items = cartDetail.items;

    obj.totalPrice = cartDetail.totalPrice;
    obj.totalItems = cartDetail.totalItems;
    

    var totalQuantity = 0;
    for (let product of cartDetail.items) {
      totalQuantity += product.quantity;
    }

    obj.totalQuantity = totalQuantity;

    let createdata = await orderModel.create(obj);
    return res.status(201).send({ status: true, message:"Success", data: createdata });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
};

//............................................................. UPDATE API .............................................................................

const updateOrder = async function (req, res) {
    try {
  
      let data = req.body;
      let { status, orderId } = data;
  
      if (!isValidObjectId(orderId))return res.status(400).send({ status: false, message: "Invalid orderId" });
  
      let orderDetails = await orderModel.findOne({_id: orderId,isDeleted: false,});
  
      if (!["pending", "completed", "cancelled"].includes(status)) {
        return res.status(400).send({status: false,message: "status should be from [pending, completed, cancelled]"});
      }

      if(status==="pending"){
        return res.status(400).send({status:false,message:"order is already in pending status"})
      }
  
      if (orderDetails.status === "completed") {
      return res.status(400).send({status: false,message: "Order completed, now its status can not be updated",});
      }
  
      if (orderDetails.cancellable === false ) {
        return res.status(400).send({ status: false, message: "Order is not cancellable" });
      } 
      if(status==="cancelled"){
       orderDetails.isDeleted=true
      }

      let orderStatus = await orderModel.findOneAndUpdate(
          { _id: orderId },
          { $set: { status: status,cancellable:false,isDeleted:orderDetails.isDeleted} },
          { new: true }
        );
        return res.status(200).send({status: true,message: "Success",data: orderStatus,});
      }
       catch (error) {
      res.status(500).send({ status: false, message: error.message });
    }
  };
  

module.exports.createOrder=createOrder
module.exports.updateOrder=updateOrder
