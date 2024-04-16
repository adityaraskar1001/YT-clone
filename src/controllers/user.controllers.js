import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async(req, res) => {
    //1: get user details from frontend.
    const {username, email, fullname, password} = req.body
    console.log("email:", email);

    //2: validation.
    if([fullname, email, username, password].some((field) => field?.trim() === ""))
    {
        throw new apiError(400, "All fields are required")
    }

    //3: check if user already exists by its username or email.
    const existedUser = User.findOne({
        $or:[{username}, {email}]
    })
    if(existedUser){
        throw new apiError(401, "User with this email or username already exists")
    }
    
    //4: check for images and avatar.
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new apiError(402, "Avatar image is required")
    }

    //5: upload them to cloudinary.
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverLocalPath);
    if(!avatar){
        throw new apiError(402, "Avatar image is required")
    }

    //6: create user object and entry user data in DB.
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullname,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    //7: remove password and refresh token field from response field.
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    //8: check for user creation.
    if(!createdUser){
        throw new apiError(500, "Something went wrong")
    }

    //9: return response.
    return res.status(201).json( 
        new apiResponse (200, createdUser, "User registered successfully"))
})







export {registerUser}




// const registerUser = asyncHandler(async (req, res) => {
//     res.status(200).json({
//         message: "Hello from user controller side"
//     })
// })
