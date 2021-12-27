let express = require('express');
let myfunc = require('../export/export.js');
let router = express.Router();
const fs = require('fs');

router.route('/create').post(async(req, res)=>{

    const file = req.files.image;
    const newpath = __dirname + "\\files\\";
    const filename = file.name;
    let imagePath = newpath+"\\"+filename;

    try {
        if (!fs.existsSync(imagePath)) {
            file.mv(`${newpath}${filename}`, (err) => {
                if (err) {
                    console.log("error");
                    res.status(500).send({ message: "File upload failed", code: 200 });
                }
            });        
        }
    } catch(err) {
        console.error(err)
    }

    console.log("********** Hash Image ***********");
    let hashForImage = await myfunc.pinImageToIPFS(imagePath);
    console.log(hashForImage);
    let data = {
        url: hashForImage,
        fn: filename
    }
    console.log(data);
    res.json(data);
})

router.route('/whitelist').post(async(req, res) => {
    const file = req.files.selectedFile;
    const newpath = __dirname + "\\files\\";
    const filename = file.name;
    let imagePath = newpath+"\\"+filename;
    try {
        file.mv(`${newpath}${filename}`, (err) => {
            if (err) {
                console.log("error");
                res.status(500).send({ message: "File upload failed", code: 200 });
            }
            fs.readFile(imagePath, 'utf8', function (err, data) {
                if (err) return console.log(err);
                let arr = data.split('\r\n');
                for(let i=0;i<arr.length;i++)
                    arr[i] = arr[i].trim();
                res.json(arr);
            });
        });
    } catch(err) {
        console.error(err);
    }
})

module.exports = router;