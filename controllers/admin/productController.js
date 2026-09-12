const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

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
    const page = req.query.page || 1;
    const limit = 10;

    const productData = await Product.find({
      $or: [
        { productName: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ],
    }).limit(limit*1).skip((page - 1) * limit).populate("category").exec();

    const count = await Product.find({
      $or: [
        { productName: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ],
    }).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if(category && brand){
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
        search: search,
      });
    }else {
      res.render("page-404")
    }

  }catch (error) {
    res.redirect("/admin/pageerror");
  }
}

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
};
