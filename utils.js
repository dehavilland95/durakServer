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
    },
    generateId: () => {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    },
    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },
    getRandomInt: function(max) {
        return Math.floor(Math.random() * max);
    },
}

module.exports = utils;