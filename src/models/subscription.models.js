import mongoose, {Schema} from "mongoose";

const subscripitionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // user subscribing to a channel
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId, // channel to which user is subscribed
        ref: "User"
    }
}, {timestamps: true})

export const Subscripition = mongoose.model("Subscripition", subscripitionSchema)