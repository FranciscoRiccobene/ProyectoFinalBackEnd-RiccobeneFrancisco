import express from "express";
import ProductsDAO from "../dao/Products.dao.js";
import CartsDAO from "../dao/Carts.dao.js";
import UserDAO from "../dao/User.dao.js";
import ProductsRepository from "../repositories/Products.repository.js";
import CartsRepository from "../repositories/Carts.repository.js";
import UserRepository from "../repositories/User.repository.js";
import {
  passportCall,
  updateLastConnectionMiddleware,
  adminAuthMiddleware,
} from "../utils.js";
import { logger } from "../logger/factory.js";

const router = express.Router();

const productsDAO = new ProductsDAO();
const cartsDAO = new CartsDAO();
const userDAO = new UserDAO();

const productsRepository = new ProductsRepository(productsDAO);
const cartsRepository = new CartsRepository(cartsDAO);
const userRepository = new UserRepository(userDAO);

router.get("/", (req, res) => {
  res.render("index", {});
});

router.get("/register", (req, res) => {
  res.render("index", { layout: "register" });
});

router.get("/login", (req, res) => {
  res.render("index", { layout: "login" });
});

router.get(
  "/current",
  passportCall("jwt"),
  updateLastConnectionMiddleware,
  (req, res) => {
    const userDTO = {
      first_name: req.user.user.first_name,
      last_name: req.user.user.last_name,
      email: req.user.user.email,
      age: req.user.user.age,
      role: req.user.user.role,
    };

    res.render("index", { layout: "current", user: userDTO });
  }
);

router.get(
  "/admin",
  passportCall("jwt"),
  adminAuthMiddleware(),
  async (req, res) => {
    const users = await userRepository.findUsersWithLean();

    res.render("index", { layout: "adminPanel", users });
  }
);

router.get("/send-reset-mail", (req, res) => {
  res.render("index", { layout: "sendResetMail" });
});

router.get("/products", passportCall("jwt"), async (req, res) => {
  try {
    const { limit = 10, page = 1, sort, query } = req.query;
    const user = req.user;

    const options = {
      limit: parseInt(limit),
      page: parseInt(page),
      sort:
        sort === "desc"
          ? { price: -1 }
          : sort === "asc"
          ? { price: 1 }
          : undefined,
      lean: true,
    };

    const filter = query
      ? query === "stock"
        ? { stock: { $gt: 0 } }
        : {
            $or: [
              { title: new RegExp(query, "i") },
              { category: new RegExp(query, "i") },
            ],
          }
      : {};

    const result = await productsRepository.productsPaginate(filter, options);

    res.render("index", { layout: "products", products: result, user });
  } catch (err) {
    logger.error(`Error reading products file: ${err}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/products/:pid", async (req, res) => {
  try {
    const productId = req.params.pid;

    const product = await productsRepository.findProductWithLean(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.render("index", { layout: "productsDetail", product: product });
  } catch (error) {
    logger.error(`Error reading products file: ${error}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/carts/:cid", async (req, res) => {
  try {
    const cartId = req.params.cid;

    const cart = await cartsRepository.findCartWithPopulateAndLean(
      cartId,
      "products.product"
    );

    if (!cart) {
      logger.error("Cart not found");
      return res.status(404).json({ message: "Cart not found" });
    }

    const cartTotal = cart.products.reduce((total, product) => {
      return total + product.quantity * product.product.price;
    }, 0);

    res.render("index", { layout: "cartDetail", cart, cartTotal });
  } catch (error) {
    logger.error(`Error fetching the cart: ${error.message}`);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
