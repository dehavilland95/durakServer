const utils = {
    extractJsonData: (dataString) =>{
        try{
            const data = JSON.parse(dataString);
            return data;
        }catch(e){
            console.log(e);
            return null;
        }
    }
}

module.exports = utils;