"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var puppeteer_1 = __importDefault(require("puppeteer"));
var main = function () { return __awaiter(void 0, void 0, void 0, function () {
    var browser, page, itemsInCartAtStart;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, puppeteer_1.default.launch({
                    headless: false,
                    slowMo: 100
                })];
            case 1:
                browser = _a.sent();
                return [4 /*yield*/, browser.newPage()];
            case 2:
                page = _a.sent();
                return [4 /*yield*/, getCartQuantity(page)];
            case 3:
                itemsInCartAtStart = _a.sent();
                console.log("Number of items in cart: " + itemsInCartAtStart);
                return [4 /*yield*/, addItemToCart(page, 'https://www.hannaford.com/product/blue-moon-belgian-white-ale/754820')];
            case 4:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
var getCartQuantity = function (page) { return __awaiter(void 0, void 0, void 0, function () {
    var cart, count;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, page.goto('https://www.hannaford.com/')];
            case 1:
                _b.sent();
                return [4 /*yield*/, page.$('#cartCountNumber')];
            case 2:
                cart = _b.sent();
                return [4 /*yield*/, (cart === null || cart === void 0 ? void 0 : cart.getProperty('innerHTML'))];
            case 3:
                count = (_a = (_b.sent())) === null || _a === void 0 ? void 0 : _a._remoteObject.value;
                return [2 /*return*/, count];
        }
    });
}); };
var addItemToCart = function (page, itemUrl) { return __awaiter(void 0, void 0, void 0, function () {
    var addToCartButton;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, page.goto(itemUrl)];
            case 1:
                _a.sent();
                return [4 /*yield*/, page.$x('//*[@id="productForm"]/div[1]/div[2]/div[7]/div/div[1]/table/tbody/tr/td/div/button')];
            case 2:
                addToCartButton = _a.sent();
                return [4 /*yield*/, addToCartButton[0].click()];
            case 3:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
main();
