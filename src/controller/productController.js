const productModel = require("../models/productModel")

const { isValidName, isValidNumber,isValidAvailableSizes } = require("../validator/validation")

const aws = require("aws-sdk")

aws.config.update({
    accessKeyId: "AKIAY3L35MCRZNIRGT6N",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile = async (file) => {
    return new Promise(function (resolve, reject) {

        let s3 = new aws.S3({ apiVersion: '2006-03-01' }); // we will be using the s3 service of aws

        var uploadParams = {
            ACL: "public-read",
            Bucket: "classroom-training-bucket",
            Key: "abc/" + file.originalname,
            Body: file.buffer
        }


        s3.upload(uploadParams, function (err, data) {
            if (err) {
                return reject({ "error": err })
            }
            console.log(data)
            console.log("file uploaded succesfully")
            return resolve(data.Location)
        })
    })
}

const createProduct = async function (req, res) {
    try {
        const data = req.body
        const { title, description, price, currencyId, currencyFormat, availableSizes, installments } = data

        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: false, msg: "no data provided" })
        }

        if (!title) {
            return res.status(400).send({ status: false, msg: "please provide title" })
        }
        if (!isValidName(title)) {
            return res.status(400).send({ status: false, msg: "please provide valid title" })
        }

        const duplicateTitle = await productModel.findOne({ title: title })

        if (duplicateTitle) {
            return res.status(409).send({ status: false, msg: "title is already exist" })
        }

        if (!description) {
            return res.status(400).send({ status: false, msg: "please provide description" })
        }

        if (!isValidName(description)) {
            return res.status(400).send({ status: false, msg: "please provide valid description" })
        }


        if (!price) {
            return res.status(400).send({ status: false, msg: "please provide price" })
        }

        data.price = Number(price)
        if (isNaN(price)) {
            return res.status(400).send({ status: false, msg: "please provide  valid price" })
        }

        if (!currencyId) {
            return res.status(400).send({ status: false, msg: "please provide currency Id" })
        }

        if (currencyId !== "INR") {
            return res.status(400).send({ status: false, msg: "invalid currency id" })
        }

        if (!currencyFormat) {
            return res.status(400).send({ status: false, msg: "please provide currency format" })
        }

        if (currencyFormat !== "₹") {
            return res.status(400).send({ status: false, msg: "please provide valid currency format" })
        }

        let files = req.files
        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0])
            data.productImage = uploadedFileURL
        }
        else {
            res.status(400).send({ msg: "No file found" })
        }

        if (!data.productImage) {
            return res.status(400).send({ status: false, msg: "please provide product image" })
        }



        if (availableSizes) {
            data.availableSizes = JSON.parse(availableSizes)
            if (!Array.isArray(data.availableSizes) || data.availableSizes.length == 0) {
                return res.status(400).send({ status: false, msg: "please provide valid sizes" })
            }
            const arrayEnum = ["S", "XS", "M", "X", "L", "XXL", "XL"]

            for (let i = 0; i < data.availableSizes.length; i++) {
                if (!arrayEnum.includes(data.availableSizes[i])) {
                    return res.status(400).send({ status: false, msg: "please provide valid sizes" })
                }
            }
        }

        if (installments) {
            data.installments = Number(installments)
            if (isNaN(installments)) {
                return res.status(400).send({ status: false, msg: "please provide valid installment number" })
            }
        }
        const product = await productModel.create(data)
        return res.status(201).send({ status: true, msg: "success", data: product })

    }
    catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
}


const getAllProducts = async function (req, res) {
    try {
        if (Object.keys(req.query).length > 0) {
            if (Object.keys(req.query).includes("size")|| Object.keys(req.query).includes("name")||Object.keys(req.query).includes("priceLessThan")||Object.keys(req.query).includes("priceGreaterThan")||Object.keys(req.query).includes("priceSort") ) {

            if (Object.keys(req.query).includes("size")) {
                if (!isValidName(req.query.size)) { return res.status(400).send({ status: false, message: "you selected the size field but value is not valid or empty." }) }
            }
            if (Object.keys(req.query).includes("name")) {
                if (!isValidName(req.query.name)) { return res.status(400).send({ status: false, message: "you selected the name field but value is not valid or empty." }) }

            }

            if (Object.keys(req.query).includes("priceLessThan")) {
                if (!isValidName(req.query.priceLessThan)) { return res.status(400).send({ status: false, message: "you selected the priceLessThan field but value is not valid or empty." }) }
                else { req.query.priceLessThan = Number(req.query.priceLessThan) }
            }

            if (Object.keys(req.query).includes("priceGreaterThan")) {
                if (!isValidName(req.query.priceGreaterThan)) { return res.status(400).send({ status: false, message: "you selected the priceGreaterThan field but value is not valid or empty." }) }
                else { req.query.priceGreaterThan = Number(req.query.priceGreaterThan) }
            }

            if (Object.keys(req.query).includes("priceSort")) {
                if (!(['1', '-1'].includes(req.query.priceSort))) {
                    return res.status(400).send({ status: false, message: "sortPrice filter should contain 1 for ascending order and -1 for descending order." })
                } else { req.query.priceSort = Number(req.query.priceSort) }
            }

            const fetchProducts = await productModel.find({ $or: [{ $or: [{ price: { $gt: req.query.priceGreaterThan } }, { price: { $lt: req.query.priceLessThan } }] }, { title: { $regex: req.query.name, $options: "i" } }, { availableSizes: req.query.size }] },{isDeleted:false}).sort({ price: req.query.priceSort })

            if (fetchProducts.length > 0) { 
                return res.status(200).send({ status: true, data: fetchProducts }) 
            }
            return res.status(404).send({ status: false, message: "No data found with this query" })
    
        }else{
            return res.status(400).send({status:false, message:"query name should be name, size, priceGreaterThan, priceLessThan, priceSort"})
        }}
       else {
    const fetchedAllProducts = await productModel.find({ isDeleted: false, deletedAt: null })
    if (fetchedAllProducts.length > 0) { return res.status(200).send({ status: true, data: fetchedAllProducts }) }
    return res.status(404).send({ status: false, message: "No data found" })
}}

            catch (err) {
    return res.status(500).send({ status: false, message: "Internal Server Error" })
}
}



const getDetailsFromParam = async function (req, res) {

    try {
        let productId = req.params.productId

        if (!productId) return res.status(400).send({ status: false, message: "No parameter found" })
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Invalid ProductID" })

        const ProductByProductId = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!ProductByProductId) return res.status(404).send({ staus: false, message: "No such product exist with this Id" })

        return res.status(200).send({ status: true, message: "success", data: ProductByProductId })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

const getFilteredProducts=async function(req,res){
    const data=req.query
    const {size,name,priceGreaterThan,priceLessThan,priceSort}=data

    let filterObject={isDeleted:false}
    let sortObject={}

    if(size){
        if( !(["S", "XS", "M", "X", "L", "XXL", "XL"]).includes(size)){
         return res.status(400).send({status:false,msg:"provide valid size"})   
        }
        filterObject.availableSizes=size
    }

    if(name){
        if(!isValidName(name)){
            return res.status(400).send({status:false,msg:"provide valid name"})    
        }
        filterObject.title={$regex:name,$options:"i"}

    }
    if(priceGreaterThan){
        if(isNaN(Number(priceGreaterThan))){
            return res.status(400).send({status:false,msg:"provide valid price"})   
        }
        filterObject.price={$gt:Number(priceGreaterThan)}
    }
    if(priceLessThan){
        if(isNaN(Number(priceLessThan))){
            return res.status(400).send({status:false,msg:"provide valid price"})   
        }
        filterObject.price={$lt:Number(priceLessThan)}
    }

    if(priceSort){
        if(!(["1","-1"]).includes(priceSort)){
            return res.status(400).send({status:false,msg:"provide valid syntax for sorting"})     
        }
        sortObject.price=Number(priceSort)
    }

    const products=await productModel.find(filterObject).sort(sortObject)

    if(products.length==0){
        return res.status(404).send({status:false,msg:"no product found"})
    }
    return res.status(200).send({status:true,msg:"data fetched successfully",data:products})
}


//_______________________________________update product____________________________________________//

const updateProduct = async function(req,res){
    try{
        const productId = req.params.productId
        const data = req.body;
        const files = req.files
        if(Object.keys(data).length ==0 && !files){
            return res.status(400).send({status:false,message:"Please provide data in the request body"})
        }

        const{title,description,price,currencyId,currencyFormat,isFreeShipping,style,availableSizes,installments,isDeleted} = data

        if(isDeleted == true) return  res.status(404).send({status:false,message:"data not found"})

        if(title){
            if(!isValidName(title)){return res.status(400).send({status:false,message:"inValid title"})}

            const duplicateTitle=await productModel.findOne({title:title})
            if(duplicateTitle){
                return res.status(409).send({status:false,msg:"title is already exist"})
            }
        }

        if(description){
            if(!isValidName(description)){return res.status(400).send({status:false,message:"inValid description"})}
        }
        if(price){
            data.price=Number(price)
            if(isNaN(price)){return res.status(400).send({status:false,message:"inValid price"})}
        }
        if(currencyId){
            if(currencyId !== "INR"){return res.status(400).send({status:false,message:'currencyId must be "INR"'})}
        }
        if(currencyFormat){
            if(currencyFormat!=="₹"){return res.status(400).send({status:false,msg:"currency format must be '₹'"}) }
        }
        if (isFreeShipping) {
            if (["true", "false"].includes(isFreeShipping) === false) {
              return res
                .status(400)
                .send({ status: false, message: "isFreeShipping should be boolean" });}}
        if(files && files.length>0){
            let uploadedFileURL= await uploadFile( files[0] )
            data.productImage=uploadedFileURL
        }
        if(style){
            if(!isValidName(style)){return res.status(400).send({status:false,message:"inValid size"})}
        }
  
        if (availableSizes) {
                if (typeof (availableSizes == "string")) {
                  if (!isValidAvailableSizes(availableSizes)) {
                    return res
                      .status(400)
                      .send({
                        status: false,
                        message: "Invalid format of availableSizes",
                      });
                  }
                  let availableSize = ["S", "XS", "M", "X", "L", "XXL", "XL"];
                  for (let i = 0; i < availableSize.length; i++) {
                    if (availableSizes == availableSize[i]) {
                      continue;
                    }
                  }
                } else {
                  return res
                    .status(400)
                    .send({
                      status: false,
                      message: `avilablesize is ["S", "XS", "M", "X", "L", "XXL", "XL"] select size from avilablesize`,
                    });
                }

        }
        if(installments){
            if(isNaN(installments)){return res.status(400).send({status:false,message:"inValid installments"})}
        }

        const updateUser = await productModel.findOneAndUpdate({_id:productId,isDeleted:false},{$set:{title:title,description:description,price:data.price,currencyFormat:currencyFormat,isFreeShipping:isFreeShipping,productImage:data.productImage,style:style,availableSizes:availableSizes,installments:installments}},{new:true})
        return res.status(200).send({status:true,message:"product profile updated sucessfully",data:updateUser})
    
    }catch(err){
        return res.status(500).send({ status: false, error: err.message })        
    }
}


const deleteById = async function (req, res) {

    try {
        let productId = req.params.productId
        if (!productId) { return res.status(400).send({ status: false, message: "plz provide productId" }) }

        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Invalid ProductId " })
        
        let productDel = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false, }, { $set: { isDeleted: true, deletedAt: Date.now() } }, { new: true })
        if (!productDel) return res.status(404).send({ status: false, message: "No product found by given ProductId" })
        
        return res.status(200).send({ status: true, message: "Product Deleted Succesfully" })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

module.exports = {createProduct, getAllProducts, getDetailsFromParam,getFilteredProducts,updateProduct,deleteById}
