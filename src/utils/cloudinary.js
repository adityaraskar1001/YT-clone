import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
          
cloudinary.config({ 
  cloud_name: 'dz4ucbfvo', 
  api_key: '163373822728743', 
  api_secret: 'QAVHKdMu7o190_7sOWvHXxnDiMw' 
});

// cloudinary.config({ 
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
//   api_key: process.env.CLOUDINARY_API_KEY, 
//   api_secret: process.env.CLOUDINARY_API_SECRET 
// });

// Same code from user view
const uploadOnCloudinary = async(localFilePath) =>{
    try {
        if(!localFilePath) return null
         const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //console.log("file is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)// remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

// Code from cloudinary documents
// cloudinary.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });

export {uploadOnCloudinary}