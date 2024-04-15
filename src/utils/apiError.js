class apiError extends Error{
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stackh = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null,
        this.message = message,
        this.success = false;
        this.errors = errors
  
        if(stackh){
            this.stackh = stackh
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {apiError}