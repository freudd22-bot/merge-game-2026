const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "database.json";

// Environment Variables لحماية المعلومات الحساسة
const API_KEY = process.env.API_KEY;
const CCP_NUMBER = process.env.CCP_NUMBER;
const PHONE_NUMBER = process.env.PHONE_NUMBER;

function readDB() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: {} }));
    return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// تسجيل أو تحديث مستخدم
app.post("/api/login", (req,res)=>{
    const { email, guestId } = req.body;
    let db = readDB();
    let id = email ? email : guestId;

    if(!db.users[id]){
        db.users[id] = { gems:100, points:0, da:0 }; // 100 جوهرة مجانية عند التسجيل
        writeDB(db);
    }
    res.json({ id, ...db.users[id] });
});

// تنفيذ الدمج
app.post("/api/merge", (req,res)=>{
    const { id, el1, el2 } = req.body;
    let db = readDB();
    if(!db.users[id]) return res.status(400).json({ error:"User not found" });

    let user = db.users[id];
    if(user.gems<=0) return res.json({ message:"No gems left", gems:user.gems, points:user.points, da:user.da });

    user.gems--;

    let message="";
    if(el1===el2){
        message="سبحان الله - Subhan Allah";
        user.gems++;
    } else if((el1<4 && el2<4) || (el1>=4 && el2>=4)){
        message="الحمد لله - Alhamdulillah";
        user.points+=10;
    } else {
        message="الله أكبر - Allahu Akbar";
    }

    // تحويل النقاط إلى DA
    if(user.points >= 1000){
        let earnedDA = Math.floor(user.points / 1000) * 10;
        user.da += earnedDA;
        user.points = user.points % 1000;
        message += ` | You earned ${earnedDA} DA!`;
    }

    writeDB(db);
    res.json({ message, gems:user.gems, points:user.points, da:user.da });
});

// شراء الجواهر مقابل DA
app.post("/api/buy", (req,res)=>{
    const { id, gemsToBuy, paymentInfo } = req.body;
    if(!gemsToBuy || gemsToBuy <=0) return res.status(400).json({ error:"Specify number of gems" });

    let db = readDB();
    if(!db.users[id]) return res.status(400).json({ error:"User not found" });

    let user = db.users[id];

    // تحقق من الدفع (يمكن ربط بوابة الدفع الحقيقية لاحقًا)
    const paymentSuccess = verifyPayment(paymentInfo, gemsToBuy);
    if(!paymentSuccess) return res.status(400).json({ error:"Payment failed" });

    user.gems += Number(gemsToBuy);
    writeDB(db);
    res.json({ message:`Purchased ${gemsToBuy} gems`, gems:user.gems, da:user.da });
});

// دالة وهمية للتحقق من الدفع
function verifyPayment(paymentInfo, gemsToBuy){
    // ضع هنا كود التحقق الحقيقي من بوابة الدفع
    return true; // مؤقتًا لتجربة النظام
}

// استعراض الرصيد
app.get("/api/balance/:id",(req,res)=>{
    let db = readDB();
    const { id } = req.params;
    if(!db.users[id]) return res.json({ gems:0, points:0, da:0 });
    res.json(db.users[id]);
});

app.listen(process.env.PORT || 3000, ()=>console.log("Server running"));