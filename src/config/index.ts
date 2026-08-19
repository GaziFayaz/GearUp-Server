import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 4000,
  cors_origin: process.env.CORS_ORIGIN,
  database_url: process.env.DATABASE_URL,
  app_url: process.env.APP_URL || "http://localhost:3000",
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  jwt_access_secret:
    process.env.JWT_ACCESS_SECRET ||
    "1bd143aab2a3018312d7789845ff0c8a3ee0e84fe3ed995b97f49f75d675c91d",
  jwt_refresh_secret:
    process.env.JWT_REFRESH_SECRET ||
    "8d0c7342ba002fab3dd62b984715ce277c49dbd5f903bd989138195ec2be1bc3",
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  stripe_product_price_id: process.env.STRIPE_PRODUCT_PRICE_ID,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  stripe_webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
};

