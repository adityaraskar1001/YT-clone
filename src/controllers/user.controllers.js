import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessTokenAndgenerateRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new apiError(500,"Something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler(async(req, res) => {
    //1: get user details from frontend.
    const {username, email, fullname, password} = req.body

    //2: validation.
    if([fullname, email, username, password].some((field) => field?.trim() === ""))
    {
        throw new apiError(400, "All fields are required")
    }

    //3: check if user already exists by its username or email.
    const existedUser =  await User.findOne({
        $or:[{username}, {email}]
    })
    if(existedUser){
        throw new apiError(401, "User with this email or username already exists")
    }
    
    //4: check for images and avatar.
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverLocalPath = req.files?.coverImage[0]?.path;
    let coverLocalPath;
    if(req.file && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverLocalPath = req.files.coverImage[0].path
    }
    if(!avatarLocalPath){
        throw new apiError(402, "Avatar image is required")
    }

    //5: upload them to cloudinary.
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverLocalPath);
    
    if(!avatar){
        console.log(avatarLocalPath);
        throw new apiError(402, "Problem during uploading avatar")
    }
    if(!coverImage){
        console.log(coverLocalPath);
        throw new apiError(402, "Problem during uploading cover image")
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

const loginUser = asyncHandler(async(req, res) => {
    //1: get data from request body or database
    const {email, username, password} = req.body
    if (!username && !email) {
        throw new apiError(400, "username or email is required")
    }

    //2: login by username or email
    const findUser = await User.findOne({
        $or: [{username}, {email}]
    })
    
    //3: find the user
    if(!findUser){
        throw new apiError(404,"User does not exists")
    }

    //4: check the password
    const passCheck = await findUser.isPasswordCorrect(password)
    if(!passCheck){
        throw new apiError(404,"Invalid user credentials")
    }

    //5: generate access token and refresh token for user
    const {accessToken, refreshToken} = await generateAccessTokenAndgenerateRefreshToken(findUser._id)
    const loggedInUser = await User.findById(findUser._id).select("-password -refreshToken")

    //6: send token to user through cookies
    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken,option)
    .json(
        new apiResponse(200,{user:loggedInUser, accessToken, refreshToken},
        "User logged In Successfully")
    )
})

const logoutUser = asyncHandler(async(req, res) => {
     await User.findByIdAndUpdate(
        req.user._id,{
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new apiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async(req, res) =>{
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new apiError(401, "unauthorized request")
    }

   try {
     const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new apiError(401, "Invalid Refresh Token")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new apiError(401, "Refrsh Token is expired or used")
     }
 
     const option = {
         httpOnly: true,
         secure: true
     }
     const {accessToken, newrefreshToken} = await generateAccessTokenAndgenerateRefreshToken(user._id)
 
     return res.status(200)
     .cookie("accessToken", accessToken, option)
     .cookie("refreshToken", newrefreshToken, option)
     .json(new apiResponse(200, {accessToken, refreshToken: newrefreshToken},"Access Token Refreshed"))
   } catch (error) {
        throw new apiError(401, error?.message || "Invalid refresh token")
   }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new apiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200)
    .json(
        new apiResponse(200,req.user,
        "current user fetched successfully")
)
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body

    if(!fullname || !email){
        throw new apiError(400, "All fields are required")
    }

    const user = User.findByIdAndDelete(req.user?._id, 
    {
        $set: {
            fullname,
            email
        }
    }, {new: true}
    ).select("-password")

    return res.status(200)
    .json(new apiResponse(200, user, "Account details updated successfully")) 
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new apiError(400, "Error while uploading avatar")
    }

    const user = await User.findByIdAndDelete(
        req.user?._id,{
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new apiResponse(200, user, "Avatar updated successfully"))
})

const updateCoverImage = asyncHandler(async(req, res) =>{
    const coverLocalPath = req.file?.path

    const coverImage = await uploadOnCloudinary(coverLocalPath)
    
    if(!coverImage.url){
        throw new apiError(400, "Error while uploading cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,{
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new apiResponse(200, user, "Cover Image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new apiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: subscripition,
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: subscripition,
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
             $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelSubscribersCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: true
                    }
                }
             }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribersCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new apiError(401, "channel does not exists")
    }

    return res.status(200)
    .json(new apiResponse(200, channel[0], "User channel fectched successfully"))
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res.status(200)
    .json(new apiResponse(200, user[0].WatchHistory, "Watch History fetched successfully"))
})

export {
        registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateCoverImage,
        getUserChannelProfile,
        getWatchHistory
    }




// const registerUser = asyncHandler(async (req, res) => {
//     res.status(200).json({
//         message: "Hello from user controller side"
//     })
// })
