import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import mongoose from "mongoose";

const uploadvideo = asyncHandler(async(req, res) =>{
    //1: check if user is loged in or not.
        const user = await User.findById(req.user?._id)
        console.log(user);
        if(!user){
            throw new apiError(400,"You are not loged in")
        }
   

    //2: get video deatils from user.
    const{title, description} = req.body

    //3: validation.
    if([title, description].some((field) => field?.trim() === ""))
        {
            throw new apiError(400, "All fields are required")
        }

    //4: check for thumbnail and video file.
    const thumbLocalPath = req.files?.thumbnail?.[0]?.path;
    const videoLocalPath = req.files?.videoFile?.[0]?.path;

    if(!thumbLocalPath || !videoLocalPath){
        throw new apiError(400, "Thumbnail and Video file is required")
    }

    //5: upload them to database. 
    const thumbnail = await uploadOnCloudinary(thumbLocalPath);
    const videoFile = await uploadOnCloudinary(videoLocalPath);

    if(!thumbnail){
        console.log(thumbLocalPath);
        throw new apiError(402, "Problem during uploading thumbnail");
    }

    if(!videoFile){
        console.log(videoLocalPath);
        throw new apiError(402, "Problem during uploading video");
    }

    //6: create video object and entry data in DB.
    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        owner: req.user?._id,
        duration: videoFile.duration
    })

    //7: check for video upload.
    const uploadedVideo = await Video.findById(video.id);
    if(!uploadedVideo){
        throw new apiError(500, "Something went wrong")
    }

    //8: return response.
    return res.status(200)
    .json(new apiResponse (200, uploadedVideo, "Video uploaded successfully"))
})


const changevideo = asyncHandler(async(req, res) => {
    const videoLocalPath = req.file?.path

    if(!videoLocalPath){
        throw new apiError(400, "Video file is missing")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)

    if(!videoFile.url){
        throw new apiError(400, "Error while uploading video")
    }

    const video = await Video.findByIdAndUpdate(
        req.video?._id,{
            $set: {
                videoFile: videoFile.url
            }
        },
        {new: true}
    )
    return res.status(200)
    .json(new apiResponse(200, video, "Video changed successfully"))
})

const changethumbnail = asyncHandler(async(req, res) => {
    const thumbLocalPath = req.file?.path

    if(!thumbLocalPath){
        throw new apiError(400, "Thumbnail file is missing")
    }

    const thumbnail = await uploadOnCloudinary(thumbLocalPath)

    if(!thumbnail.url){
        throw new apiError(400, "Error while uploading thumbnail")
    }

    const video = await Video.findByIdAndDelete(
        req.video?._id,{
            $set: {
                thumbnailFile: thumbnail.url
            }
        },
        {new: true}
    )
    return res.status(200)
    .json(new apiResponse(200, video, "Thumbnail changed successfully"))
})

const deletevideo = asyncHandler(async(req, res) => {
    const { title } = req.body;
    const findVideo = await Video.findOne({title: title})
    if(!findVideo){
        return res.status(404).json(new apiResponse(404, {}, "Video not found"));
    }
    await Video.findByIdAndDelete(findVideo._id);

    return res.status(200)
    .json(new apiResponse(200, {}, "Video deleted successfully"))
})

const getallvideo = asyncHandler(async(req, res) => {
    const {page = 1, limit = 10, query, sortBy, sortType, userId} = req.query;

    let filter = {};
    if(query){
        //searching video by title
        filter.title = {$regex: query, $option: 'i'};
    }

    if(userId){
        filter.userId = userId;
    }

    let sort = [];
    if(sortBy){
        sort[sortBy] = sortType === 'desc' ? -1 : 1;
    }

    const skip = (page - 1) * limit;

    try{
        const videos = await Video.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

        const totalVideos = await Video.countDocuments(filter);
        const totalPages = Math.ceil(totalVideos / limit);

        return res.status(200)
        .json(new apiResponse(200, {totalVideos, totalPages, current: page, videos}, "All videos fetched"))
    }catch (error) {
        throw new apiError(401, error?.message || "Errror fetching all the videos")
    }
})

const getvideobytitle = asyncHandler(async(req, res) => {
    const { title } = req.body;
    if(!title) throw new apiError(400,"Title required");
    
    const findVideo = await Video.findOne({ title: title });
    if(!findVideo) throw new apiError(400,"No video found" );

    return res.status(200)
    .json(new apiResponse(200, findVideo, "Video fetched successfully"))
})

export {
        uploadvideo,
        changevideo,
        changethumbnail,
        deletevideo,
        getallvideo,
        getvideobytitle
}