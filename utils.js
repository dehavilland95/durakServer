const utils = {
    extractJsonData: (dataString) =>{
        try{
            const data = JSON.parse(dataString);
            return data;
        }catch(e){
            console.log(e);
            return null;
        }
    },
    getRandomeFiveDigitNumber: () =>{
        return Math.floor(10000 + Math.random() * 90000);
    }
}

module.exports = utils;