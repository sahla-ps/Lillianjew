const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { log } = require("console");

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    res.render("product-add", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Error fetching product add page:", error);
    res.redirect("/admin/pageerror");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;

    const productExists = await Product.findOne({
      productName: products.productName,
    });

    if (productExists) {
      // TODO: adjust the view name / re-fetch whatever data your
      // add-product page needs (brand list, category list, etc.)
      return res.status(400).render("admin/add-product", {
        error: "A product with this name already exists.",
      });
    }

    const images = [];

    // Raw uploads land here (set by your multer storage config)
    // Resized copies are written to a SEPARATE folder/filename so we never
    // read and write the same file at the same time with sharp.
    const outputDir = path.join(__dirname, "../../public/uploads/re-image");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const originalImagePath = file.path;
        const resizedFilename = `resized-${file.filename}`;
        const resizedImagePath = path.join(outputDir, resizedFilename);

        await sharp(originalImagePath)
          .resize({ width: 450, height: 450 })
          .toFile(resizedImagePath);

        images.push(resizedFilename);

        // Clean up the raw upload now that we have the resized copy.
        // Remove this if you actually want to keep the originals.
        fs.unlink(originalImagePath, (err) => {
          if (err) {
            console.error(
              "Failed to delete original upload:",
              originalImagePath,
              err,
            );
          }
        });
      }
    }

    if (images.length === 0) {
      return res.status(400).render("admin/add-product", {
        error: "Please upload at least one image.",
      });
    }

    // TODO: match these field names to your actual Mongoose schema
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      brand: products.brand,
      category: products.category,
      regularPrice: parseFloat(products.regularPrice),
      salePrice: parseFloat(products.salePrice),
      quantity: parseInt(products.quantity, 10),
      color: products.color,
      productImage: images,
    });

    await newProduct.save();

    return res.redirect("/admin/products");
  } catch (error) {
    console.error("Error adding product:", error);
    return res.status(500).render("admin/add-product", {
      error: "Something went wrong while adding the product. Please try again.",
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    // escape regex special chars so a search like "nike (shoes)" doesn't throw
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const safeSearch = escapeRegex(search);

    const matchingBrands = await Brand.find({
      brandName: { $regex: safeSearch, $options: "i" }, // match your Brand schema's actual field name
    }).select("_id");
    const brandIds = matchingBrands.map((b) => b._id);

    const filter = {
      $or: [
        { productName: { $regex: safeSearch, $options: "i" } },
        { brand: { $in: brandIds } },
      ],
    };

    const productData = await Product.find(filter)
      .limit(limit)
      .skip((page - 1) * limit)
      .populate("category")
      .populate("brand")
      .exec();

    const count = await Product.countDocuments(filter);

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
        search: search,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.redirect("/admin/pageerror");
  }
};

const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const offerPercentage = parseInt(percentage, 10);

    if (isNaN(offerPercentage) || offerPercentage < 0 || offerPercentage > 100) {
      return res.status(400).json({ success: false, message: "Please provide a valid percentage." });
    }

    const findProduct = await Product.findById(productId);
    if (!findProduct) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }

    const findCategory = await Category.findOne({ _id: findProduct.category });
    if (!findCategory) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }

    if (findCategory.categoryOffer > offerPercentage) {
      return res.json({
        success: false,
        message: "This category already has a higher offer than the one you're trying to set.",
      });
    }

    // Recalculate off regularPrice (not the current salePrice) so re-applying
    // or changing an offer later doesn't compound on an already-discounted number.
    findProduct.salePrice =
      findProduct.regularPrice - Math.floor((findProduct.regularPrice * offerPercentage) / 100);
    findProduct.productOffer = offerPercentage;
    await findProduct.save();

    return res.json({ success: true, message: "Product offer added successfully." });
  } catch (error) {
    console.error("Error adding product offer:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const removeProductOffer = async (req, res) => {
  try {

const { productId } = req.body;
const findProduct = await Product.findOne({ _id: productId });
const percentage = findProduct.productOffer;
findProduct.salePrice = findProduct.salePrice + Math.floor((findProduct.salePrice * percentage) / 100);
findProduct.productOffer = 0;
await findProduct.save();
res.json({ status: true, message: "Product offer removed successfully" });

  }catch (error) {
    res.redirect("/admin/pageerror");
  }
}

const blockProduct = async (req, res) => {
  try {

    const id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");

  }catch (error) {
    res.redirect("/admin/pageerror");
  }
}

const unblockProduct = async (req, res) => {
  try {

    const id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");

  }catch (error) {
    res.redirect("/admin/pageerror");
  }
}

const getEditProduct = async (req, res) => {
  try {

    const id = req.query.id;
    const product = await Product.findOne({ _id: id })
    const category = await Category.find({});
    const brand = await Brand.find({});

    res.render("edit-product", {
      product: product,
      cat: category,
      brand: brand
    });

  }catch (error) {
    res.redirect("/admin/pageerror");
  }
}

const editProduct = async (req, res) => {
  try {
    
    const id = req.params.id;
    const product = await Product.findOne({_id:id})
    const data = req.body;
    const existingProduct = await Product.findOne({
      productName:data.productName,
      _id: {$ne:id}
    })

    if(existingProduct){
      return res.status(400).json({error:"Product with this already exists. Please try with another name."})
    }

    const images = [];

    if(req.files && req.files.length > 0){
      for(let i = 0; i<req.files.length; i++){
        images.push(req.files[i].filename)
      }
    }

    const updateFields = {
      productName:data.productName,
      description:data.descriptionData,
      brand:data.brand,
      category:data.category,
      regularPrice:data.regularPrice,
      salePrice:data.salePrice,
      quantity:data.quantity,
      size:data.size,
      color:data.color
    }

    if(req.files && req.files.length>0){
      updateFields.$push = {productImage:{$each:images}};
    }

    await Product.findByIdAndUpdate(id,updateFields,{ returnDocument: 'after' })
    res.redirect("/admin/products")

  } catch (error) {
    console.error(error)
    res.redirect('/admin/pageerror')
  }
}

const deleteSingleImage = async (req,res) => {
  try {
    
    const {imageNameToServer,productIdToServer} = req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}},{ returnDocument: 'after' })
    const imagePath = path.join("public","uploads","re-image",imageNameToServer)
    if(fs.existsSync(imagePath)){
      await fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`)
    }else{
      console.log(`Image ${imageNameToServer} not found`)
    }
    res.send({status : true})

  } catch (error) {
    res.redirect("/admin/pageerror")
  }
}



module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage
};
