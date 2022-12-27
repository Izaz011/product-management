const productModel = require("../models/productModel")
const { isValidName, isValidNumber,isValidAvailableSizes,isValidObjectId } = require("../validator/validation")
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

//............................................................. POST API .............................................................................

const createProduct = async function (req, res) {
    try {
        const data = req.body
        const { title, description, price, currencyId, currencyFormat, availableSizes, installments } = data

        if (Object.keys(data).length == 0) {
            return res.status(400).send({ status: false, message: "no data provided" })
        }

        if (!title) {
            return res.status(400).send({ status: false, message: "please provide title" })
        }
        if (!isValidName(title)) {
            return res.status(400).send({ status: false, message: "please provide valid title" })
        }

        const duplicateTitle = await productModel.findOne({ title: title })

        if (duplicateTitle) {
            return res.status(409).send({ status: false, message: "title is already exist" })
        }

        if (!description) {
            return res.status(400).send({ status: false, message: "please provide description" })
        }

        if (!isValidName(description)) {
            return res.status(400).send({ status: false, message: "please provide valid description" })
        }


        if (!price) {
            return res.status(400).send({ status: false, message: "please provide price" })
        }

        data.price = Number(price)
        if (isNaN(price)) {
            return res.status(400).send({ status: false, message: "please provide  valid price" })
        }

        if (!currencyId) {
            return res.status(400).send({ status: false, message: "please provide currency Id" })
        }

        if (currencyId !== "INR") {
            return res.status(400).send({ status: false, message: "invalid currency id" })
        }

        if (!currencyFormat) {
            return res.status(400).send({ status: false, message: "please provide currency format" })
        }

        if (currencyFormat !== "₹") {
            return res.status(400).send({ status: false, message: "please provide valid currency format" })
        }

        let files = req.files
        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0])
            data.productImage = uploadedFileURL
        }
        else {
            return res.status(400).send({ status:false, message: "No file found" })
        }

        if (!data.productImage) {
            return res.status(400).send({ status: false, message: "please provide product image" })
        }



        if (availableSizes) {
            data.availableSizes = JSON.parse(availableSizes)
            if (!Array.isArray(data.availableSizes) || data.availableSizes.length == 0) {
                return res.status(400).send({ status: false, message: "please provide valid sizes" })
            }
            const arrayEnum = ["S", "XS", "M", "X", "L", "XXL", "XL"]

            for (let i = 0; i < data.availableSizes.length; i++) {
                if (!arrayEnum.includes(data.availableSizes[i])) {
                    return res.status(400).send({ status: false, message: "please provide valid sizes" })
                }
            }
        }

        if (installments) {
            data.installments = Number(installments)
            if (isNaN(installments)) {
                return res.status(400).send({ status: false, message: "please provide valid installment number" })
            }
        }
        const product = await productModel.create(data)
        return res.status(201).send({ status: true, message: "Success", data: product })

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//............................................................. GET API .............................................................................
//............................................................. GET FILTERED PRODUCTS .............................................................................

const getAllProducts = async function (req, res) {
    try {
        let obj= {isDeleted:false}
        if (Object.keys(req.query).length > 0) {
            if (Object.keys(req.query).includes("size")|| Object.keys(req.query).includes("name")||Object.keys(req.query).includes("priceLessThan")||Object.keys(req.query).includes("priceGreaterThan")||Object.keys(req.query).includes("priceSort") ) {

            if (Object.keys(req.query).includes("size")) {
                if (!isValidName(req.query.size)) { return res.status(400).send({ status: false, message: "you selected the size field but value is not valid or empty." }) }
            else{obj.availableSizes=req.query.size
            }
            }
            if (Object.keys(req.query).includes("name")) {
                if (!isValidName(req.query.name)) { return res.status(400).send({ status: false, message: "you selected the name field but value is not valid or empty." }) }
           else{obj.title={$regex:req.query.name, $options:"i"}}
            }

            if (Object.keys(req.query).includes("priceLessThan")) {
                if (!isValidName(req.query.priceLessThan)) { return res.status(400).send({ status: false, message: "you selected the priceLessThan field but value is not valid or empty." }) }
                else { req.query.priceLessThan = Number(req.query.priceLessThan) 
                obj.price= {$lt: req.query.priceLessThan}}
            }

            if (Object.keys(req.query).includes("priceGreaterThan")) {
                if (!isValidName(req.query.priceGreaterThan)) { return res.status(400).send({ status: false, message: "you selected the priceGreaterThan field but value is not valid or empty." }) }
                else { 
                    req.query.priceGreaterThan = Number(req.query.priceGreaterThan)
                    obj.price = {$gt: req.query.priceGreaterThan} }
            }
            if (Object.keys(req.query).includes("priceGreaterThan") && Object.keys(req.query).includes("priceLessThan")) {
                if (!isValidName(req.query.priceGreaterThan)) { return res.status(400).send({ status: false, message: "you selected the priceGreaterThan field but value is not valid or empty." }) }
                else { 
                    req.query.priceGreaterThan = Number(req.query.priceGreaterThan)
                    req.query.priceLessThan = Number(req.query.priceLessThan) 
                    obj.price= {$gt:req.query.priceGreaterThan, $lt: req.query.priceLessThan} }
            }


            if (Object.keys(req.query).includes("priceSort")) {
                if (!(['1', '-1'].includes(req.query.priceSort))) {
                    return res.status(400).send({ status: false, message: "sortPrice filter should contain 1 for ascending order and -1 for descending order." })
                } else { req.query.priceSort = Number(req.query.priceSort) }
            }
            

            const fetchProducts = await productModel.find({...obj}).sort({ price: req.query.priceSort })

            if (fetchProducts.length > 0) { return res.status(200).send({ status: true, message:"Success", data: fetchProducts }) }
            return res.status(404).send({ status: false, message: "No data found with this query" })
    
            }else{
            return res.status(400).send({status:false, message:"query name should be name, size, priceGreaterThan, priceLessThan, priceSort"})
        }}
       else {
        const fetchedAllProducts = await productModel.find({ isDeleted: false, deletedAt: null })
        if (fetchedAllProducts.length > 0) { return res.status(200).send({ status: true, message:"Success", data: fetchedAllProducts }) }
        return res.status(404).send({ status: false, message: "No data found" })
}}

            catch (err) {
    return res.status(500).send({ status: false, message: "Internal Server Error" })
}}

//............................................................. GET API .............................................................................
//............................................................. GET PRODUCT BY ID .............................................................................

const getDetailsFromParam = async function (req, res) {

    try {
        let productId = req.params.productId

        if (!productId) return res.status(400).send({ status: false, message: "No parameter found" })
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Invalid ProductID" })

        const ProductByProductId = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!ProductByProductId) return res.status(404).send({ staus: false, message: "No such product exist with this Id" })

        return res.status(200).send({ status: true, message: "Success", data: ProductByProductId })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}



//............................................................. UPDATE API .............................................................................

const updateProduct = async function(req,res){
    try{
        const productId = req.params.productId
        const data = req.body;
        const files = req.files
        if(Object.keys(data).length ==0 && !files){
            return res.status(400).send({status:false,message:"Please provide data to change"})
        }

        const{title,description,price,currencyId,currencyFormat,isFreeShipping,style,availableSizes,installments} = data

        if(!isValidObjectId(productId)){
            return res.status(400).send({status:false,message:"provide valid product id"})
        }

        const product=await productModel.findOne({_id:productId,isDeleted:false})

        if(!product) return  res.status(404).send({status:false,message:"product not found"})

        let update={}
 
        if(title){
            if(!isValidName(title)){return res.status(400).send({status:false,message:"inValid title"})}

            const duplicateTitle=await productModel.findOne({title:title})
            if(duplicateTitle){
                return res.status(409).send({status:false,message:"title is already exist"})
            }
            update.title=title
        }

        if(description){
            if(!isValidName(description)){return res.status(400).send({status:false,message:"inValid description"})}
            update.description=description
        }
        if(price){
            data.price=Number(price)
            if(isNaN(price)){return res.status(400).send({status:false,message:"inValid price"})}
            update.price=price
        }
        if(currencyId){
            if(currencyId !== "INR"){return res.status(400).send({status:false,message:'currencyId must be "INR"'})}

            update.currencyId=currencyId
        }
        if(currencyFormat){
            if(currencyFormat!=="₹"){return res.status(400).send({status:false,message:"currency format must be '₹'"}) }
            update.currencyFormat=currencyFormat
        }
        if (isFreeShipping) {
            if (["true", "false"].includes(isFreeShipping) === false) {
              return res
                .status(400)
                .send({ status: false, message: "isFreeShipping should be boolean" });}
                update.isFreeShipping=isFreeShipping
            }
        if(files && files.length>0){
            let uploadedFileURL= await uploadFile( files[0] )
            update.productImage=uploadedFileURL
        }
        if(style){
            if(!isValidName(style)){return res.status(400).send({status:false,message:"inValid size"})}
            update.style=style
        }
  
        if (availableSizes) {
            data.availableSizes = JSON.parse(availableSizes)
            if (!Array.isArray(data.availableSizes) || data.availableSizes.length == 0) {
                return res.status(400).send({ status: false, message: "please provide valid sizes" })
            }
            const arrayEnum = ["S", "XS", "M", "X", "L", "XXL", "XL"]

            for (let i = 0; i < data.availableSizes.length; i++) {
                if (!arrayEnum.includes(data.availableSizes[i])) {
                    return res.status(400).send({ status: false, message: "please provide valid sizes" })
                }
            }

            update.availableSizes=availableSizes
        }
        if(installments){
            if(isNaN(installments)){return res.status(400).send({status:false,message:"inValid installments"})}
            update.installments=installments
        }

        const updateUser = await productModel.findByIdAndUpdate(
            productId,
            update,
            {new:true})
        return res.status(200).send({status:true,message:"product profile updated sucessfully",data:updateUser})
    
    }catch(err){
        return res.status(500).send({ status: false, error: err.message })
    }
}

//............................................................. DELETE API .............................................................................

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

module.exports = {createProduct, getAllProducts, getDetailsFromParam,updateProduct,deleteById}
