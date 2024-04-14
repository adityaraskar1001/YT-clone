import dotenv from "dotenv"
import connectDB from "./db/index.js";

dotenv.config({
    path: './.env'
})

connectDB()







// import express from "express";
// const app = express()
// (async() => {
//     try {
//         await mongoose.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`)
//         app.on("error", (error) => {
//             console.error("ERROR: ",error);
//             throw error
//         })
//     } catch (error) {
//         console.error("ERROR: ", error);
//         throw err
//     }
// })()