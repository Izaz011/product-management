const express = require('express');
const router = express.Router();
const usercontroller= require('../controller/usercontroller')
const productController=require("../controller/productController")
const cartController=require("../controller/cartController")
const orderController=require("../controller/orderController")
const {authentication,authorization}=require("../middleware/auth")

// .................................................. Users Api ....................................................................
 router.post('/register', usercontroller.registerUser)
 router.post('/login', usercontroller.logIn)
 router.get('/user/:userId/profile', authentication,usercontroller.getUserParam)
 router.put("/user/:userId/profile",authentication,authorization,usercontroller.updateUser)


//  ..............................................Product API.........................................................
router.post("/products",productController.createProduct)
router.get("/products",productController.getAllProducts)
router.get("/products/:productId",productController.getDetailsFromParam)
router.put("/products/:productId",productController.updateProduct)
router.delete("/products/:productId",productController.deleteById)

//...........................................cart API.............................................................

 router.post("/users/:userId/cart",authentication,authorization,cartController.createCart)
 router.put("/users/:userId/cart",authentication,authorization,cartController.updateCart)
 router.get("/users/:userId/cart",authentication,authorization,cartController.getCartDetails)
router.delete("/users/:userId/cart",authentication,authorization,cartController.deleteCart)

// .....................................................order API .......................................................
 router.post("/users/:userId/orders",authentication,authorization, orderController.createOrder)
 router.put("/users/:userId/orders",authentication,authorization, orderController.updateOrder)


//===============================router validation(For path is valid or Not)===================================================//


router.all("/*", async function (req, res) {
    return res.status(400).send({ status: false, message: "Bad reqeust / invalid Path" });
    
  });




module.exports=router;
